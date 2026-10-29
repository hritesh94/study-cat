// Google Gemini, through the generateContent REST API (stateless: Google
// doesn't keep the conversation; we send what's needed each time).
// Docs: https://ai.google.dev/api/generate-content
import { AI } from '../config.js'
import { AiError } from '../errors.js'

const BASE = 'https://generativelanguage.googleapis.com/v1beta/models'
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

// "Too busy" from Google: 429 (the free tier's rate limit) or 503 ("this
// model is currently experiencing high demand").
const BUSY = new Set([429, 503])

// models: the main model first, then the fallback (see config.js)
// messages: [{ role: 'user' | 'model', text, images?: [{ mimeType, data (base64) }] }]
// schema:   a JSON Schema → the answer is JSON in that shape
export function geminiProvider({ apiKey, models, fetchImpl = fetch, wait = sleep }) {
  return {
    name: 'gemini',
    model: models[0],
    async generate({ system, messages, schema, maxTokens, temperature = 0.8 }) {
      const body = JSON.stringify({
        systemInstruction: { parts: [{ text: system }] },
        contents: messages.map((m) => ({
          role: m.role === 'model' ? 'model' : 'user',
          parts: [...(m.images ?? []).map((img) => ({ inlineData: { mimeType: img.mimeType, data: img.data } })), { text: m.text }],
        })),
        generationConfig: {
          maxOutputTokens: maxTokens,
          temperature,
          thinkingConfig: { thinkingLevel: AI.thinkingLevel },
          ...(schema ? { responseMimeType: 'application/json', responseJsonSchema: schema } : {}),
        },
      })

      // Each model gets two tries (with a short wait between) when it's busy.
      // If it's still busy, the next model gets its turn. Only when they're
      // all busy does the cat say it's tired.
      for (const [m, model] of models.entries()) {
        for (let attempt = 0; attempt < 2; attempt++) {
          let res
          try {
            res = await fetchImpl(`${BASE}/${model}:generateContent`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
              body,
            })
          } catch (error) {
            throw new AiError('ai_down', `Gemini unreachable: ${error.message}`)
          }
          if (BUSY.has(res.status)) {
            if (attempt === 0) await wait(AI.retryAfterMs)
            continue
          }
          // the fallback model can't be used (e.g. renamed): that's not "busy"
          if (!res.ok) {
            const detail = `Gemini ${res.status} (${model}): ${(await res.text()).slice(0, 300)}`
            if (m > 0) throw new AiError('tired', detail)
            throw new AiError('ai_down', detail)
          }

          const data = await res.json()
          const candidate = data.candidates?.[0]
          // its thinking comes back as parts marked `thought`: never show those
          const text = (candidate?.content?.parts ?? [])
            .filter((p) => !p.thought && typeof p.text === 'string')
            .map((p) => p.text)
            .join('')
            .trim()
          if (!text) {
            const why = data.promptFeedback?.blockReason ?? candidate?.finishReason ?? 'empty'
            throw new AiError('bad_output', `Gemini gave no text (${why})`)
          }
          return { text, finishReason: candidate.finishReason, model }
        }
      }
      throw new AiError('tired', `Gemini is busy (${models.join(', ')})`)
    },
  }
}
