// POST /functions/v1/chat   { message, timeZone?, situation? }
//   → { reply, crisis, suggest, goal, usage: { used, limit } }
//
// The cat replies in 1–3 short sentences. With each message the AI gets a
// little context calculated by code: the last 14 days of study, the goal
// and roadmap progress, and the last 10 chat messages.
// No goal yet → onboarding: the cat asks, one question at a time, what
// you're studying for, the deadline, hours per day and weak/strong subjects,
// then returns the goal as JSON for you to confirm.
import { CHAT, OUTPUT } from '../config.js'
import { AiError } from '../errors.js'
import { systemPrompt } from '../prompts.js'
import { generateJson } from '../providers/index.js'
import { CRISIS_REPLY, detectDistress } from '../safety.js'
import { WEEKDAYS, addDays, describeGoal, describeStats, localDayIn, studyStats, weekday } from '../stats.js'
import { clip, isDay, num, oneOf, text, timeZone as validTimeZone } from '../validate.js'

// The first thing the cat says when there's no goal yet (the app shows the same line).
export const ONBOARDING_HELLO = "Mrrp, hi! I'm your study cat. What are you studying for?"

const KINDS = ['neet', 'neet_pg', 'jee_main', 'boards', 'custom']
const LEVELS = ['weak', 'okay', 'strong']
const SUGGESTIONS = ['none', 'roadmap', 'quiz', 'goal']
const SITUATIONS = {
  idle: 'The timer is not running.',
  studying: 'They are in the middle of a study session right now.',
  break: 'They are on a break between study sessions.',
  after_session: 'They just finished a study session.',
}
const TITLES = { neet: 'NEET UG', neet_pg: 'NEET PG', jee_main: 'JEE Main', boards: 'Board exams', custom: 'My goal' }

export const CHAT_SCHEMA = {
  type: 'object',
  properties: {
    reply: { type: 'string', description: 'What the cat says: 1 to 3 short sentences, plain text.' },
    distress: { type: 'boolean', description: 'true if the student may be in real distress (hopelessness, self-harm, wanting to die).' },
    suggest: { type: 'string', enum: SUGGESTIONS },
    goal: {
      type: ['object', 'null'],
      properties: {
        kind: { type: 'string', enum: KINDS },
        title: { type: 'string' },
        deadline: { type: 'string', format: 'date' },
        hours_per_day: { type: 'number' },
        subjects: {
          type: 'array',
          items: {
            type: 'object',
            properties: { name: { type: 'string' }, level: { type: 'string', enum: LEVELS } },
            required: ['name', 'level'],
          },
        },
      },
      required: ['kind', 'title', 'deadline', 'hours_per_day', 'subjects'],
    },
  },
  required: ['reply', 'distress', 'suggest', 'goal'],
}

const CHAT_TASK = (alreadySuggested) => `TASK: Chat with the student. Reply in 1 to 3 short sentences.
- Answer what they said first. You may help with a study question briefly, like a friend who knows things, never a lecture.
- If they're down on themselves ("I'm dumb", "I'll fail", "I can't do this"), comfort them warmly, remind them of something real they've already done (use the numbers you know), and give one small next step.
- You may mention ONE app feature when it really fits: "roadmap" (they talk about an exam or planning and have no roadmap yet), "quiz" (they just studied, or want to test themselves), "goal" (they have no goal yet). Otherwise suggest "none". ${alreadySuggested ? 'You already suggested a feature in this conversation, so suggest MUST be "none".' : 'Do this at most once per conversation.'}
- "goal" is always null here.`

const ONBOARDING_TASK = `TASK: The student has no study goal yet. Help them set one, chatting like a friend. Ask ONE short question at a time, in this order, skipping anything they already told you:
1. what they're studying for (NEET UG after class 12, NEET PG after MBBS, JEE Main, board exams, or something else). If they just say "NEET", ask whether it's NEET UG or NEET PG.
2. the deadline or exam date
3. how many hours a day they can study
4. which subjects feel weak and which feel strong
If they want to talk about something else, answer kindly, then gently come back to the next question. Reply in 1 to 3 short sentences.
When you know all four, fill in "goal": kind is neet (NEET UG), neet_pg, jee_main, boards or custom; title is short (e.g. "NEET UG 2027"); deadline is YYYY-MM-DD (use today's date to work out the year); hours_per_day is a number; subjects lists each subject with level weak, okay or strong (NEET UG: Physics, Chemistry, Biology. NEET PG: the MBBS subjects they mention, e.g. Anatomy, Pathology, Medicine, Surgery. JEE Main: Physics, Chemistry, Maths). Then "reply" sums it up in one sentence and asks them to check it. Until then "goal" is null. suggest is "none".`

// the goal from onboarding: checked field by field, or null
export function validGoal(goal, today) {
  if (!goal || typeof goal !== 'object') return null
  const kind = oneOf(goal.kind, KINDS, null)
  if (!kind || !isDay(goal.deadline) || goal.deadline <= today || goal.deadline > addDays(today, 3 * 366)) return null
  if (typeof goal.hours_per_day !== 'number' || !Number.isFinite(goal.hours_per_day)) return null
  const subjects = (Array.isArray(goal.subjects) ? goal.subjects : [])
    .slice(0, 12)
    .map((s) => ({ name: clip(s?.name, 40), level: oneOf(s?.level, LEVELS, 'okay') }))
    .filter((s) => s.name)
  return {
    kind,
    title: clip(goal.title, 80) || TITLES[kind],
    deadline: goal.deadline,
    hours_per_day: Math.round(num(goal.hours_per_day, 0.5, 16, 2) * 2) / 2, // in half hours
    subjects,
  }
}

// messages since the last long pause count as one conversation
function currentConversation(history, now) {
  const gap = CHAT.conversationGapHours * 3600000
  let start = history.length
  let last = now.getTime()
  for (let i = history.length - 1; i >= 0; i--) {
    const t = Date.parse(history[i].created_at)
    if (last - t > gap) break
    start = i
    last = t
  }
  return history.slice(start)
}

export async function chat(body, { store, ai, now }) {
  const message = text(body.message, { name: 'message' })
  const tz = validTimeZone(body.timeZone)
  const situation = SITUATIONS[body.situation] ?? SITUATIONS.idle
  const nowDate = now()
  const today = localDayIn(tz, nowDate)
  const distress = detectDistress(message)

  const crisis = async (reply, usage) => {
    await store.saveChat([
      { role: 'user', text: message, meta: { crisis: true } },
      { role: 'cat', text: reply, meta: { crisis: true } },
    ])
    return { reply, crisis: true, suggest: 'none', goal: null, usage }
  }

  const usage = await store.reserve('chat')
  if (!usage.allowed) {
    // the limit never stops the cat from answering someone in distress
    if (distress) return crisis(CRISIS_REPLY, usage)
    throw new AiError('limit', 'Daily chat limit reached', { kind: 'chat', used: usage.used, limit: usage.limit })
  }

  let result
  try {
    const [profile, goal, history, sessions] = await Promise.all([
      store.profile(),
      store.activeGoal(),
      store.chatHistory(CHAT.historyMessages),
      store.sessionsSince(addDays(today, -CHAT.statsDays)),
    ])
    const roadmap = goal ? await store.latestRoadmap(goal.id).catch(() => null) : null
    const onboarding = !goal
    const alreadySuggested = currentConversation(history, nowDate).some((m) => m.meta?.suggest && m.meta.suggest !== 'none')

    const context = [
      `Today is ${WEEKDAYS[weekday(today)]}, ${today}. ${situation}`,
      describeStats(studyStats(sessions ?? [], { profile, timeZone: tz, today, days: CHAT.statsDays })),
      describeGoal(goal, roadmap, today),
    ].join('\n')

    const messages = history.map((m) => ({ role: m.role === 'cat' ? 'model' : 'user', text: m.text }))
    if (onboarding && !messages.length) messages.push({ role: 'model', text: ONBOARDING_HELLO })
    messages.push({ role: 'user', text: message })

    const out = await generateJson(ai(), {
      system: systemPrompt({ profile, task: onboarding ? ONBOARDING_TASK : CHAT_TASK(alreadySuggested), context, distress }),
      messages,
      schema: CHAT_SCHEMA,
      maxTokens: OUTPUT.chat.maxTokens,
      timeoutMs: OUTPUT.chat.timeoutMs,
      temperature: distress ? 0.4 : 0.9,
    })
    const reply = clip(out.reply, OUTPUT.chat.maxChars)
    if (!reply) throw new AiError('bad_output', 'Empty reply')
    const isCrisis = distress || out.distress === true
    result = {
      reply,
      crisis: isCrisis,
      suggest: isCrisis || alreadySuggested || onboarding ? 'none' : oneOf(out.suggest, SUGGESTIONS, 'none'),
      goal: isCrisis || !onboarding ? null : validGoal(out.goal, today),
    }
  } catch (error) {
    await store.release('chat').catch(() => {})
    if (distress) return crisis(CRISIS_REPLY, usage) // the AI failed: still answer, seriously
    throw error
  }

  const meta = {}
  if (result.crisis) meta.crisis = true
  if (result.suggest !== 'none') meta.suggest = result.suggest
  if (result.goal) meta.goal = result.goal
  await store.saveChat([
    { role: 'user', text: message, meta: result.crisis ? { crisis: true } : {} },
    { role: 'cat', text: result.reply, meta },
  ])
  return { ...result, usage: { used: usage.used, limit: usage.limit } }
}
