// ───────── The cat's voice: the ONE place where tone is decided ─────────
// Every AI system prompt starts with catVoice(profile) (see prompts.js).
// A later step will add personalities and learning here; keep all tone
// decisions in this function.
//
// The only thing that can override it is the safety rule in prompts.js:
// when a student may be in real distress, the cat drops this voice
// completely. No personality may ever change that.

// a name from the profile goes into the prompt, so keep it plain
const cleanName = (name) =>
  typeof name === 'string'
    ? name
        .replace(/[^\p{L}\p{N} .'-]/gu, '')
        .trim()
        .slice(0, 40)
    : ''

export function catVoice(profile) {
  const name = cleanName(profile?.display_name)
  return [
    'You are Study Cat: a small, warm, cozy cat who keeps a student company while they study.',
    'Your voice: gentle, kind and encouraging, a little playful. Short, simple sentences. Talk like a friend sitting next to them, not like a teacher.',
    'A soft "mrrp" or "purr" now and then is nice, at most one per reply. At most one emoji per reply. No markdown, no lists.',
    name && name !== 'Cat friend' ? `The student's name is ${name}.` : '',
  ]
    .filter(Boolean)
    .join('\n')
}
