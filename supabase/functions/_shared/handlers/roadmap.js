// POST /functions/v1/roadmap   { goalId, syllabusText?, image?: { mimeType, data }, timeZone? }
//   → { roadmap: { id, goal_id, plan, created_at }, usage }
//
// The AI plans only the big picture: the chapter order, hours per chapter,
// phases (learn, revise, mock tests), weekly milestones and an honest
// feasibility check. The app (src/ai/schedule.js) spreads it over the days.
// Each call (also "Regenerate") counts toward the daily roadmap limit.
import { OUTPUT } from '../config.js'
import { AiError } from '../errors.js'
import { withAllowance } from '../http.js'
import { systemPrompt } from '../prompts.js'
import { generateJson } from '../providers/index.js'
import { addDays, daysBetween, localDayIn, weekday } from '../stats.js'
import { clip, image as validImage, isUuid, num, oneOf, text, timeZone as validTimeZone } from '../validate.js'

const PRIORITIES = ['high', 'medium', 'low']
const PHASES = ['learn', 'revise', 'mock']
const DEFAULT_HOURS = { high: 12, medium: 8, low: 4 }
const MAX_CHAPTERS = 150

export const ROADMAP_SCHEMA = {
  type: 'object',
  properties: {
    chapters: {
      type: 'array',
      description: 'Every chapter still to study, in study order.',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string', description: 'The id given (syllabus goals). For other goals, any short id.' },
          name: { type: 'string' },
          subject: { type: 'string' },
          hours: { type: 'number', description: 'Hours to learn and practise it, for this student.' },
          priority: { type: 'string', enum: PRIORITIES },
        },
        required: ['id', 'name', 'subject', 'hours', 'priority'],
      },
    },
    phases: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          kind: { type: 'string', enum: PHASES },
          share: { type: 'number', description: 'Share of the remaining time, 0 to 1.' },
          note: { type: 'string' },
        },
        required: ['kind', 'share', 'note'],
      },
    },
    milestones: {
      type: 'array',
      items: {
        type: 'object',
        properties: { week: { type: 'integer', minimum: 1 }, text: { type: 'string' } },
        required: ['week', 'text'],
      },
    },
    feasibility: {
      type: 'object',
      properties: {
        verdict: { type: 'string', enum: ['comfortable', 'tight', 'not_enough_time'] },
        message: { type: 'string', description: 'One or two honest, kind sentences.' },
      },
      required: ['verdict', 'message'],
    },
  },
  required: ['chapters', 'phases', 'milestones', 'feasibility'],
}

const TASK = `TASK: Plan the big picture of this student's study roadmap. Answer only with JSON in the given format.
- chapters: every chapter still to study, in the order to study them. Estimate realistic hours for each (learning plus practice questions) for THIS student: more for weak subjects and high-weightage chapters, less for strong ones. Mix subjects sensibly rather than doing one subject at a time. priority is high, medium or low.
- If all the hours don't fit in the time available for learning, say so honestly in feasibility and put high-weightage and weak-subject chapters first, low-priority ones last.
- phases: shares of the remaining time for "learn" (new chapters), "revise" and "mock" (mock tests), adding up to 1. Leave real time for revision and mocks before the exam.
- milestones: short lines like "Finish Kinematics and Laws of Motion", for week 1 (the week starting today), and then every week or two up to the deadline.
- feasibility: comfortable, tight or not_enough_time, and a message in the cat's voice: honest, kind, one or two sentences.`

// how many study hours there are from today until the day before the deadline
export function availableHours(goal, today, lightPct) {
  let hours = 0
  const days = daysBetween(today, goal.deadline)
  for (let i = 0; i < days; i++) {
    const day = addDays(today, i)
    hours += Number(goal.hours_per_day) * (weekday(day) === goal.light_weekday ? lightPct / 100 : 1)
  }
  return Math.round(hours)
}

// Check everything the AI sent; for syllabus goals, chapters must be the
// syllabus's own (names come from it, not from the AI).
export function validPlan(out, goal, { available, weeks }) {
  const done = new Set(goal.done_chapters ?? [])
  const known = goal.chapters ? new Map(goal.chapters.map((c) => [c.id, c])) : null
  const seen = new Set()
  let chapters = []
  for (const c of Array.isArray(out?.chapters) ? out.chapters : []) {
    if (chapters.length >= MAX_CHAPTERS) break
    const priority = oneOf(c?.priority, PRIORITIES, 'medium')
    const hours = Math.round(num(c?.hours, 0.5, 80, DEFAULT_HOURS[priority]) * 2) / 2
    if (known) {
      const real = known.get(c?.id)
      if (!real || done.has(real.id) || seen.has(real.id)) continue
      seen.add(real.id)
      chapters.push({ id: real.id, subject: real.subject, name: real.name, hours, priority })
    } else {
      const name = clip(c?.name, 80)
      if (!name) continue
      chapters.push({ id: `c${chapters.length + 1}`, subject: clip(c?.subject, 40) || 'General', name, hours, priority })
    }
  }
  if (known) {
    // anything the AI left out still belongs in the plan: at the end
    for (const c of goal.chapters) {
      if (done.has(c.id) || seen.has(c.id)) continue
      const priority = oneOf(c.weight, PRIORITIES, 'medium')
      chapters.push({ id: c.id, subject: c.subject, name: c.name, hours: DEFAULT_HOURS[priority], priority, added: true })
    }
    // done chapters stay in the checklist (ticked), before the rest
    chapters = [...goal.chapters.filter((c) => done.has(c.id)).map((c) => ({ id: c.id, subject: c.subject, name: c.name, hours: 0, priority: oneOf(c.weight, PRIORITIES, 'medium') })), ...chapters]
  }
  if (!chapters.length) throw new AiError('bad_output', 'The plan has no chapters')

  const shares = Object.fromEntries(PHASES.map((k) => [k, 0]))
  const notes = {}
  for (const p of Array.isArray(out?.phases) ? out.phases : []) {
    const kind = oneOf(p?.kind, PHASES, null)
    if (!kind) continue
    shares[kind] += num(p?.share, 0, 100, 0) // 0.7 or 70 or 7: they're normalized below
    notes[kind] = clip(p?.note, 160)
  }
  const sum = shares.learn + shares.revise + shares.mock
  const phases = PHASES.map((kind) => ({
    kind,
    share: sum > 0 ? Math.round((shares[kind] / sum) * 100) / 100 : { learn: 0.7, revise: 0.2, mock: 0.1 }[kind],
    note: notes[kind] ?? '',
  }))

  const milestones = (Array.isArray(out?.milestones) ? out.milestones : [])
    .map((m) => ({ week: Math.round(num(m?.week, 1, Math.max(1, weeks), 1)), text: clip(m?.text, 120) }))
    .filter((m) => m.text)
    .sort((a, b) => a.week - b.week)
    .slice(0, 60)

  // the honest numbers come from code, not the AI
  const needed = Math.round(chapters.filter((c) => !done.has(c.id)).reduce((s, c) => s + c.hours, 0))
  const learnHours = Math.round(available * phases[0].share)
  const fits = needed <= learnHours
  const said = oneOf(out?.feasibility?.verdict, ['comfortable', 'tight', 'not_enough_time'], null)
  let verdict = said ?? (fits ? 'tight' : 'not_enough_time')
  if (!fits && verdict === 'comfortable') verdict = needed > available ? 'not_enough_time' : 'tight'
  if (fits && verdict === 'not_enough_time') verdict = 'tight'
  let message = clip(out?.feasibility?.message, 300)
  // the AI's words only if they match the real numbers
  if (!message || verdict !== said) {
    message = fits
      ? 'This fits, if you keep at it most days. You can do it!'
      : `This needs about ${needed} hours of learning, and there are about ${learnHours}. I put the high-weightage and weak chapters first.`
  }
  return { chapters, phases, milestones, feasibility: { verdict, message, needed_hours: needed, available_hours: available, learn_hours: learnHours } }
}

export async function roadmap(body, { store, ai, now }) {
  if (!isUuid(body.goalId)) throw new AiError('bad_input', 'goalId is missing')
  const syllabusText = text(body.syllabusText, { required: false, name: 'syllabus' })
  const photo = validImage(body.image)
  const tz = validTimeZone(body.timeZone)
  const today = localDayIn(tz, now())

  const goal = await store.goal(body.goalId) // Row Level Security: only your own goal
  if (!goal) throw new AiError('not_found', 'No such goal')
  if (goal.deadline <= today) throw new AiError('bad_input', 'The deadline has passed')
  if (!goal.chapters && !syllabusText && !photo && !goal.notes) throw new AiError('bad_input', 'Describe the goal or add its syllabus')

  return withAllowance(store, 'roadmap', async (usage) => {
    const [profile, settings] = await Promise.all([store.profile(), store.settings()])
    const days = daysBetween(today, goal.deadline)
    const available = availableHours(goal, today, settings.goal_light_day_pct)
    const done = new Set(goal.done_chapters ?? [])
    const levels = (goal.subjects ?? []).map((s) => `${s.name}: ${s.level}`).join(', ') || 'not given'
    const context = [
      `Today is ${today}. Goal: ${goal.title} (${goal.kind}), deadline ${goal.deadline}: ${days} days, about ${Math.ceil(days / 7)} weeks.`,
      `Study time: ${Number(goal.hours_per_day)} hours a day, one lighter day a week: about ${available} hours in total until the deadline.`,
      `Subject levels: ${levels}.`,
      goal.chapters
        ? `Syllabus chapters still to study (id | subject | name | weightage):\n${goal.chapters
            .filter((c) => !done.has(c.id))
            .map((c) => `${c.id} | ${c.subject} | ${c.name} | ${c.weight}`)
            .join('\n')}`
        : 'This goal has no built-in syllabus: work out the chapters or topics from what the student wrote (and the photo, if any).',
    ].join('\n')

    const parts = []
    if (goal.notes) parts.push(`About the goal: ${goal.notes}`)
    if (syllabusText) parts.push(`Syllabus or task list:\n${syllabusText}`)
    if (!parts.length) parts.push('Please plan my roadmap.')
    const out = await generateJson(ai(), {
      system: systemPrompt({ profile, task: TASK, context }),
      messages: [{ role: 'user', text: parts.join('\n\n'), images: photo ? [photo] : [] }],
      schema: ROADMAP_SCHEMA,
      maxTokens: OUTPUT.roadmap.maxTokens,
      temperature: 0.4,
    })
    const plan = validPlan(out, goal, { available, weeks: Math.ceil(days / 7) })
    const saved = await store.saveRoadmap(goal.id, plan)
    return { roadmap: saved, usage: { used: usage.used, limit: usage.limit } }
  })
}
