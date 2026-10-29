// POST /functions/v1/pack   { timeZone? }
//   → { pack: { day, personality, language, spicy, lines }, cached } or { skipped: why }
//
// Once a day (on the first open, if learning is on) the AI writes about 40
// fresh lines for the cat's situations, in the user's personality,
// language and spicy setting, adapted to what it learned (cat_memory).
// Every line is checked here (max 120 characters, a real situation, no
// banned words, no swearing unless spicy, roasting the habit and never the
// person). The app uses today's pack first, then its fixed lines.
import { CHAT, OUTPUT } from '../config.js'
import { AiError } from '../errors.js'
import { withAllowance } from '../http.js'
import { MAX_LINE_CHARS, MOODS, validPackLines } from '../lineRules.js'
import { SITUATIONS } from '../personalities.js'
import { systemPrompt } from '../prompts.js'
import { generateJson } from '../providers/index.js'
import { addDays, describeStats, localDayIn, studyStats } from '../stats.js'
import { timeZone as validTimeZone } from '../validate.js'

const MIN_LINES = 12

export const PACK_SCHEMA = {
  type: 'object',
  properties: {
    lines: {
      type: 'array',
      maxItems: 60,
      items: {
        type: 'object',
        properties: {
          situation: { type: 'string', enum: SITUATIONS },
          mood: { type: 'string', enum: MOODS },
          text: { type: 'string', description: `At most ${MAX_LINE_CHARS - 20} characters.` },
        },
        required: ['situation', 'mood', 'text'],
      },
    },
  },
  required: ['lines'],
}

const TASK = `TASK: Write about 40 fresh, short lines (at most ${MAX_LINE_CHARS - 20} characters each) that you'll say during today's study sessions, 3 or 4 for each situation, in your personality and language, fitted to what you know about this student. Plain text: no quotes, no hashtags, no names.
Situations:
- greet: they open the app
- session_start: a study session starts
- mid_session: encouragement while they study
- leave: they left the app in the middle of a session (call out the habit)
- come_back: they came back to the session
- forgive: it turned out the screen just went off, not them leaving
- finish_full: they finished a whole session
- quit_early: they stopped a session early
- break_start: their break begins
- streak_milestone: a streak milestone; write {n} where the number of days goes
- coin_cap: they earned all of today's coins
- streak_broken: their streak broke (encourage them to start again)
mood is happy, neutral, sad or annoyed (how the line sounds).`

export async function pack(body, { store, ai, now }) {
  const tz = validTimeZone(body.timeZone)
  const today = localDayIn(tz, now())
  const profile = await store.profile()
  if (profile?.learning !== true) return { skipped: 'learning_off' } // fixed lines only

  const style = { personality: profile.personality ?? 'sweet', language: profile.language ?? 'en', spicy: profile.spicy === true }
  const existing = await store.pack(today)
  if (existing && existing.personality === style.personality && existing.language === style.language && existing.spicy === style.spicy) {
    return { pack: existing, cached: true }
  }

  return withAllowance(store, 'pack', async (usage) => {
    const [memory, sessions] = await Promise.all([store.memory().catch(() => null), store.sessionsSince(addDays(today, -CHAT.statsDays))])
    const stats = describeStats(studyStats(sessions ?? [], { profile, timeZone: tz, today, days: CHAT.statsDays }))
    const out = await generateJson(ai(), {
      system: systemPrompt({ profile: { ...profile, memory, stats }, task: TASK }),
      messages: [{ role: 'user', text: "Please write today's lines." }],
      schema: PACK_SCHEMA,
      maxTokens: OUTPUT.pack.maxTokens,
      timeoutMs: OUTPUT.pack.timeoutMs,
      temperature: 0.9,
    })
    const lines = validPackLines(out?.lines, { spicy: style.spicy })
    if (lines.length < MIN_LINES) throw new AiError('bad_output', `Only ${lines.length} usable lines`)
    const saved = await store.savePack({ day: today, ...style, lines })
    return { pack: saved, cached: false, usage: { used: usage.used, limit: usage.limit } }
  })
}
