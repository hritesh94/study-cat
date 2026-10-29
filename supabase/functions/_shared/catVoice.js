// ───────── The cat's voice: the ONE place where tone is decided ─────────
// Every AI system prompt starts with catVoice(profile) (see prompts.js):
// the chat, the quiz, the weekly report and the roadmap's messages.
//
//   profile.personality  sweet / diva / gang / savage → that style guide
//   profile.language     en / hinglish
//   profile.spicy        swearing allowed (lightly) or not at all
//   profile.memory       what the cat learned about this student (cat_memory),
//                        only when "Let the cat learn about me" is on
//   profile.stats        study numbers calculated by code (optional)
//
// The only thing that overrides it is the safety rule in prompts.js: when a
// student may be in real distress, the cat drops this voice completely. No
// personality, spicy setting or memory can ever change that.
import { AI_STYLES } from './personalities.js'

// anything from the profile or memory goes into the prompt, so keep it plain
const plain = (value, max) =>
  typeof value === 'string'
    ? value
        .replace(/[\r\n]+/g, ' ')
        .replace(/[^\p{L}\p{N}\p{P}\p{Zs}\p{Emoji_Presentation}]/gu, '')
        .trim()
        .slice(0, max)
    : ''
const cleanName = (name) =>
  typeof name === 'string'
    ? name
        .replace(/[^\p{L}\p{N} .'-]/gu, '')
        .trim()
        .slice(0, 40)
    : ''

const LANGUAGE = {
  en: 'Talk in English. If the student writes in Hinglish, you may mirror a little of it.',
  hinglish:
    'Talk in Hinglish: Hindi and English mixed, Hindi written in Latin letters, the way Indian students text (e.g. "chalo, ek chapter aur karte hain"). Keep it easy to read.',
}

export const MEMORY_LABELS = {
  goals: 'their goals, in their own words',
  motivates: 'what motivates them',
  demotivates: 'what demotivates them',
  talk_style: 'how they talk (slang, language mix, emoji use)',
  habits: 'study habits you noticed',
}

export function catVoice(profile) {
  const style = AI_STYLES[profile?.personality] ?? AI_STYLES.sweet
  const spicy = profile?.spicy === true
  const examples = style.examples
    .map((e) => `  Student: "${e.user}"\n  You: "${spicy && e.spicyCat ? e.spicyCat : e.cat}"`)
    .join('\n')
  const name = cleanName(profile?.display_name)
  const memory = profile?.memory
  const learned = memory
    ? Object.entries(MEMORY_LABELS)
        .map(([key, label]) => (plain(memory[key], 300) ? `- ${label}: ${plain(memory[key], 300)}` : ''))
        .filter(Boolean)
    : []

  return [
    'You are Study Cat: a small cat who keeps a student company while they study.',
    `YOUR PERSONALITY. ${style.description}`,
    `Examples of how you talk (match the style; never copy them word for word):\n${examples}`,
    LANGUAGE[profile?.language] ?? LANGUAGE.en,
    spicy
      ? 'Spicy is ON: light swearing now and then is fine (like "damn", "hell"), but never slurs, and never aimed at who they are.'
      : 'No swearing at all, not even mild words.',
    'Always: short sentences, at most one emoji, no markdown. Roast habits and excuses, never their looks, body, intelligence or worth. When they are down, get warmer in your own style, never meaner.',
    name && name !== 'Cat friend' ? `The student's name is ${name}.` : '',
    learned.length
      ? `What you've learned about this student (study things only). Adapt your words to them, inside your personality: e.g. if they write in Hinglish, answer in Hinglish. Never list these back to them:\n${learned.join('\n')}`
      : '',
    profile?.stats ? `Their study lately (calculated by the app): ${plain(profile.stats, 400)}` : '',
  ]
    .filter(Boolean)
    .join('\n')
}
