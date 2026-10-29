// Which AI the cat uses. To add another provider, write a module with the
// same generate({ system, messages, schema, maxTokens }) → { text } and
// add it below; then set the AI_PROVIDER secret to its name.
import { AI } from '../config.js'
import { AiError } from '../errors.js'
import { geminiProvider } from './gemini.js'

export function getProvider(env) {
  const name = (env('AI_PROVIDER') || AI.provider).trim().toLowerCase()
  if (name === 'gemini') {
    const apiKey = env('GEMINI_API_KEY')
    if (!apiKey) throw new AiError('ai_down', 'The GEMINI_API_KEY secret is not set')
    return geminiProvider({ apiKey, model: AI.models.gemini })
  }
  throw new AiError('ai_down', `Unknown AI_PROVIDER "${name}"`)
}

// ask for JSON and parse it; a broken answer is a 'bad_output'
export async function generateJson(ai, request) {
  const { text } = await ai.generate(request)
  try {
    return JSON.parse(text.replace(/^```(?:json)?\s*|\s*```$/g, ''))
  } catch {
    throw new AiError('bad_output', `Not JSON: ${text.slice(0, 200)}`)
  }
}
