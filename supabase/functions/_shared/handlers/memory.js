// POST /functions/v1/memory   {}
//   → { updated: true, memory, usage } or { skipped: why }
//
// After a chat conversation ends (no message for 10 minutes), the cat
// updates its notes about the student (cat_memory) from that conversation:
// short, factual, study-related only. One AI call. The app calls this
// after a chat goes quiet (and when it opens); the server decides whether
// there's anything to do, so calling it too often costs nothing.
import { OUTPUT } from '../config.js'
import { withAllowance } from '../http.js'
import { cleanMemoryNote, MEMORY_FIELDS } from '../lineRules.js'
import { systemPrompt } from '../prompts.js'
import { generateJson } from '../providers/index.js'

export const CONVERSATION_GAP_MS = 10 * 60 * 1000
const MAX_TRANSCRIPT = 8000

export const MEMORY_SCHEMA = {
  type: 'object',
  properties: Object.fromEntries(MEMORY_FIELDS.map((k) => [k, { type: 'string' }])),
  required: MEMORY_FIELDS,
}

const TASK = `TASK: Update your private study notes about this student from the conversation they send. This is note-taking, not talking: write short, neutral, factual notes in English (talk_style may quote their slang).
For each field, return the full updated note: combine your old note (above, under "What you've learned") with anything new, keep the old note if nothing changed, and return an empty string if nothing is known. At most 2 short sentences per field.
- goals: their study goals, in their own words
- motivates: what motivates them to study
- demotivates: what puts them off studying
- talk_style: how they write (slang, language mix such as Hinglish, emoji use)
- habits: study habits (when, how long, what distracts them)
ONLY study-related things. NEVER write down anything about health or mental health, family, relationships, where they live, their school's name, contact details, religion or any other personal detail, even if they mentioned it.`

const pick = (row) => row && Object.fromEntries(MEMORY_FIELDS.map((k) => [k, row[k] ?? null]))

export async function memory(body, { store, ai, now }) {
  const profile = await store.profile()
  if (profile?.learning !== true) return { skipped: 'learning_off' } // off means off: no AI, nothing saved

  const old = await store.memory()
  const messages = await store.chatSince(old?.processed_until ?? null)
  if (!messages.length) return { skipped: 'nothing_new' }
  const last = messages.at(-1).created_at
  const wait = Date.parse(last) + CONVERSATION_GAP_MS - now().getTime()
  if (wait > 0) return { skipped: 'conversation_not_over', retryInMs: wait }

  // Nothing is ever learned from a conversation where someone was in distress.
  const crisis = messages.some((m) => m.meta?.crisis)
  const said = messages.filter((m) => !m.meta?.error)
  if (crisis || !said.some((m) => m.role === 'user')) {
    await store.saveMemory({ processed_until: last })
    return { skipped: crisis ? 'not_from_this_conversation' : 'nothing_to_learn' }
  }

  let transcript = ''
  for (const m of said) {
    const lineText = `${m.role === 'user' ? 'Student' : 'Cat'}: ${m.text.replace(/\s+/g, ' ').slice(0, 500)}\n`
    if (transcript.length + lineText.length > MAX_TRANSCRIPT) break
    transcript += lineText
  }

  return withAllowance(store, 'memory', async (usage) => {
    const out = await generateJson(ai(), {
      system: systemPrompt({ profile: { ...profile, memory: old }, task: TASK }),
      messages: [{ role: 'user', text: `The conversation (oldest first):\n${transcript}` }],
      schema: MEMORY_SCHEMA,
      maxTokens: OUTPUT.memory.maxTokens,
      timeoutMs: OUTPUT.memory.timeoutMs,
      temperature: 0.2,
    })
    const fields = {}
    for (const key of MEMORY_FIELDS) {
      if (typeof out?.[key] !== 'string') continue // nothing said: keep the old note
      fields[key] = cleanMemoryNote(out[key]) || null
    }
    const saved = await store.saveMemory({ ...fields, processed_until: last })
    return { updated: true, memory: pick(saved), usage: { used: usage.used, limit: usage.limit } }
  })
}
