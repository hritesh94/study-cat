// Google Gemini, through the generateContent REST API (stateless: Google
// doesn't keep the conversation; we send what's needed each time).
// Docs: https://ai.google.dev/api/generate-content
import { AI } from '../config.js'
import { AiError } from '../errors.js'

const BASE = 'https://generativelanguage.googleapis.com/v1beta/models'
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

// "Too busy" from Google: 429 (the free tier's rate limit) or 503 ("this
// model is currently experiencing high demand"). A model that takes longer
// than timeoutMs counts as busy too.
const BUSY = new Set([429, 503])
const TIMED_OUT = 'timeout'

// models: the main model first, then the fallback (see config.js)
// messages: [{ role: 'user' | 'model', text, images?: [{ mimeType, data (base64) }] }]
// schema:   a JSON Schema → the answer is JSON in that shape
export function geminiProvider({ apiKey, models, fetchImpl = fetch, wait = sleep }) {
  return {
    name: 'gemini',
    model: models[0],
    async generate({ system, messages, schema, maxTokens, temperature = 0.8, timeoutMs = 30000 }) {
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

      // Busy or too slow? Go straight to the next model. Only a 429 (the
      // rate limit, which passes quickly) is first tried once more on the
      // same model, after a short wait. When every model is busy, the cat
      // says it's tired.
      for (const [m, model] of models.entries()) {
        for (let attempt = 0; attempt < 2; attempt++) {
          let res
          try {
            res = await fetchImpl(`${BASE}/${model}:generateContent`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
              body,
              signal: AbortSignal.timeout(timeoutMs),
            })
          } catch (error) {
            if (error?.name === 'TimeoutError' || error?.name === 'AbortError') res = { status: TIMED_OUT }
            else throw new AiError('ai_down', `Gemini unreachable: ${error.message}`)
          }
          if (res.status === 429 && attempt === 0) {
            await wait(AI.retryAfterMs)
            continue
          }
          if (BUSY.has(res.status) || res.status === TIMED_OUT) {
            // Google's own words (e.g. "high demand", or a quota with "limit: 0",
            // which means this key gets no free use of that model at all)
            const why = res.status === TIMED_OUT ? `no answer within ${timeoutMs / 1000} s` : (await res.text().catch(() => '')).replace(/\s+/g, ' ').slice(0, 400)
            console.warn(`[ai] ${model} is busy (${res.status}): ${why} → ${m + 1 < models.length ? 'trying the backup model' : 'giving up'}`)
            break
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
