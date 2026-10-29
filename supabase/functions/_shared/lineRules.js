// Checks for what the AI writes about and for the student: the daily line
// packs and cat_memory. Everything here runs on the server before anything
// is saved; a line or note that fails is dropped, never "fixed".
import { SITUATIONS } from './personalities.js'

export const MAX_LINE_CHARS = 120
export const MOODS = ['happy', 'neutral', 'sad', 'annoyed']

const words = (list) => new RegExp(`(^|[^\\p{L}])(${list.join('|')})(?=$|[^\\p{L}])`, 'iu')

// Never, not even with spicy on: slurs, and abuse aimed at someone's family.
const NEVER = words([
  'n[i1]gg(?:a|er|ah)s?',
  'f[a@]gg?(?:ot)?s?',
  'retard(?:ed|s)?',
  'tranny',
  'chink',
  'paki',
  'kike',
  'spic',
  'dyke',
  'chamar',
  'bhangi',
  'chakk?a',
  'hijra',
  'randi',
  'r[a@]ndi',
  'kutt?iya',
  'ma+dar\\s*ch[o0]+d',
  'b(?:e|ha?e?)n\\s*ch[o0]+d',
  'bh?osdi?k?e?',
  'ma+ ?ki ?aankh',
  'mc',
  'bc',
  'chutiya',
  'gaa?ndu?',
  'harami',
  'cunt',
  'whore',
  'slut',
])

// Swearing: only allowed when the user switched spicy on.
const SWEARS = words(['damn(?:ed|it)?', 'hell', 'shit(?:ty|s)?', 'bullshit', 'ass(?:es)?', 'arse', 'bitch(?:es|y)?', 'bastard', 'crap', 'f+u+c+k\\w*', 'wtf', 'piss(?:ed)?', 'saal[ae]', 'kamin[ae]'])

// Roast the behaviour, never the person: insults about who they are.
const ABOUT_THE_PERSON = [
  words(['stupid', 'dumb', 'idiot', 'moron', 'loser', 'ugly', 'fat', 'worthless', 'useless', 'pathetic', 'brainless', 'dimwit', 'gadha', 'gadhe', 'ullu', 'pagal', 'bewakoof', 'nalayak', 'nikamm[ae]', 'kaamchor']),
  /\byou(?:'re| are)\s+(?:a\s+)?(?:failure|nothing|disappointment|disgrace|joke)\b/i,
  /\b(?:no|zero)\s+(?:brain|brains|talent)\b/i,
]

export function lineProblem(text, { spicy }) {
  if (typeof text !== 'string' || !text.trim()) return 'empty'
  if (text.length > MAX_LINE_CHARS) return 'too long'
  if (NEVER.test(text)) return 'banned word'
  if (!spicy && SWEARS.test(text)) return 'swearing without spicy'
  if (ABOUT_THE_PERSON.some((r) => r.test(text))) return 'about the person'
  return null
}

// The AI's daily pack: keep only good lines. → [{ situation, mood, text }]
export function validPackLines(lines, { spicy, max = 60 }) {
  const seen = new Set()
  const out = []
  for (const l of Array.isArray(lines) ? lines : []) {
    const situation = SITUATIONS.includes(l?.situation) ? l.situation : null
    const text = typeof l?.text === 'string' ? l.text.replace(/\s+/g, ' ').trim() : ''
    if (!situation || lineProblem(text, { spicy })) continue
    if (text.includes('{n}') && situation !== 'streak_milestone') continue // {n} = streak days only
    if (/[{}]/.test(text.replace('{n}', ''))) continue
    const key = text.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    out.push({ situation, mood: MOODS.includes(l?.mood) ? l.mood : 'neutral', text })
    if (out.length >= max) break
  }
  return out
}

// ── cat_memory: study things only ──
export const MEMORY_FIELDS = ['goals', 'motivates', 'demotivates', 'talk_style', 'habits']
export const MAX_MEMORY_CHARS = 300

// Topics the cat must never remember, even if the student mentioned them.
const PERSONAL = [
  // their own health (medical words alone are fine: a NEET PG student
  // studies Medicine and diseases)
  /\b(?:depress\w*|anxiety|panic attacks?|adhd|autis\w*|therap(?:y|ist)|medication|on (?:pills|meds)|pregnan\w*|self[- ]?harm|suicid\w*|diagnosed|mental health|eating disorder)\b/i,
  // family and relationships ("bhai" as slang is how they talk, so it's allowed)
  /\b(?:mom|mum|mother|dad|father|parents?|brother|sister|sibling|family|grandma|grandpa|grandparents?|uncle|aunt|cousin|wife|husband|boyfriend|girlfriend|bf|gf|partner|crush|dating|relationship|break ?up|divorce|married|mummy|papa)\b/i,
  // location and identity
  /\b(?:lives? in|living in|moved to|hometown|address|neighbou?rhood|school name|college name|phone number|email|instagram|snapchat|religion|caste|religious)\b/i,
  // contact details
  /@|\d{6,}|https?:\/\//i,
]

// one note: personal sentences dropped, banned words dropped, kept short
export function cleanMemoryNote(text) {
  if (typeof text !== 'string') return ''
  const sentences = text
    .replace(/\s+/g, ' ')
    .split(/(?<=[.!?;])\s+/)
    .map((s) => s.trim())
    .filter((s) => s && !PERSONAL.some((r) => r.test(s)) && !NEVER.test(s))
  let note = ''
  for (const s of sentences) {
    if ((note ? note.length + 1 : 0) + s.length > MAX_MEMORY_CHARS) break
    note = note ? `${note} ${s}` : s
  }
  return note
}
