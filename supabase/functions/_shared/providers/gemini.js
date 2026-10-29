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
    models,
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

      // Try the models in order:
      //   • busy ("high demand"), too slow, or its free quota used up → the next model
      //   • a 429 that says to wait only a few seconds (the per-minute limit) →
      //     wait that long and try the same model once more
      //   • a model that refuses the request itself (e.g. it was renamed) → the next model
      // All busy → "the cat is tired"; all refusing → ai_down.
      let busy = false
      const refused = []
      for (const [m, model] of models.entries()) {
        const next = m + 1 < models.length ? 'trying the next model' : 'giving up'
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
          if (BUSY.has(res.status) || res.status === TIMED_OUT) {
            // Google's own words: "high demand", or "You exceeded your current
            // quota" with a retryDelay (seconds for the per-minute limit, much
            // longer when the day's free allowance is gone)
            const why = res.status === TIMED_OUT ? `no answer within ${timeoutMs / 1000} s` : (await res.text().catch(() => '')).replace(/\s+/g, ' ')
            const delay = Number(why.match(/"retryDelay":\s*"(\d+(?:\.\d+)?)s"/)?.[1])
            const quick = res.status === 429 && attempt === 0 && (Number.isNaN(delay) ? !/quota/i.test(why) : delay <= 5)
            if (quick) {
              await wait(Number.isNaN(delay) ? AI.retryAfterMs : delay * 1000 + 200)
              continue
            }
            busy = true
            const what = res.status === 429 && /quota/i.test(why) ? 'is out of free quota' : 'is busy'
            console.warn(`[ai] ${model} ${what} (${res.status}): ${why.slice(0, 400)} → ${next}`)
            break
          }
          if (!res.ok) {
            const detail = `${model} ${res.status}: ${(await res.text().catch(() => '')).replace(/\s+/g, ' ').slice(0, 300)}`
            refused.push(detail)
            console.warn(`[ai] ${detail} → ${next}`)
            break
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
      if (busy) throw new AiError('tired', `Gemini is busy (${models.join(', ')})`)
      throw new AiError('ai_down', `Gemini refused the request: ${refused.join(' | ')}`)
    },
  }
}
