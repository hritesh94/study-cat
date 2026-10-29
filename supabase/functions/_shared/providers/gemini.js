// Google Gemini, through the generateContent REST API (stateless: Google
// doesn't keep the conversation; we send what's needed each time).
// Docs: https://ai.google.dev/api/generate-content
import { AI } from '../config.js'
import { AiError } from '../errors.js'

const BASE = 'https://generativelanguage.googleapis.com/v1beta/models'
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

// messages: [{ role: 'user' | 'model', text, images?: [{ mimeType, data (base64) }] }]
// schema:   a JSON Schema → the answer is JSON in that shape
export function geminiProvider({ apiKey, model, fetchImpl = fetch, wait = sleep }) {
  return {
    name: 'gemini',
    model,
    async generate({ system, messages, schema, maxTokens, temperature = 0.8 }) {
      const body = {
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
      }
      for (let attempt = 0; ; attempt++) {
        let res
        try {
          res = await fetchImpl(`${BASE}/${model}:generateContent`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
            body: JSON.stringify(body),
          })
        } catch (error) {
          throw new AiError('ai_down', `Gemini unreachable: ${error.message}`)
        }
        // rate-limited (the free tier is shared by everyone): wait, try once more
        if (res.status === 429) {
          if (attempt === 0) {
            await wait(AI.retryAfterMs)
            continue
          }
          throw new AiError('tired', 'Gemini rate limit')
        }
        if (res.status === 503 && attempt === 0) {
          await wait(AI.retryAfterMs) // "overloaded" is worth one more try too
          continue
        }
        if (!res.ok) throw new AiError('ai_down', `Gemini ${res.status}: ${(await res.text()).slice(0, 300)}`)

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
        return { text, finishReason: candidate.finishReason }
      }
    },
  }
}
