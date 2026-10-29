// POST /functions/v1/report   { weekStart?: 'YYYY-MM-DD' (a Monday), timeZone? }
//   → { report: { week_start, stats, summary, tip, created_at }, cached }
//
// The cat sums up a finished week (last week by default): hours, subjects,
// best day, streak, roadmap progress, and one tip. The numbers come from
// the database (week_stats, migration 11); the AI only writes the words.
// Each week is written once and then kept, so asking again is free.
import { OUTPUT } from '../config.js'
import { AiError } from '../errors.js'
import { withAllowance } from '../http.js'
import { systemPrompt } from '../prompts.js'
import { generateJson } from '../providers/index.js'
import { WEEKDAYS, addDays, liveStreak, localDayIn, roadmapProgress, weekday } from '../stats.js'
import { clip, isDay, timeZone as validTimeZone } from '../validate.js'

export const REPORT_SCHEMA = {
  type: 'object',
  properties: {
    summary: { type: 'string', description: '2 to 4 short sentences about their week, using the numbers given.' },
    tip: { type: 'string', description: 'One short, practical tip for next week.' },
  },
  required: ['summary', 'tip'],
}

const TASK = `TASK: Write the student's weekly report: a short, warm summary of last week (2 to 4 short sentences) and ONE practical tip for next week. Use only the numbers given below, exactly as they are: never invent or change a number. Celebrate what went well, be gentle about what didn't, and make the tip fit their week (e.g. their best day, a subject that got little time, or leaving the app often).`

export const mondayOf = (day) => addDays(day, -((weekday(day) + 6) % 7))

const hours = (minutes) => `${Math.floor(minutes / 60)} h ${minutes % 60} min`

export function describeWeek(stats, extra) {
  const lines = [
    `Week: ${stats.week_start} to ${stats.week_end}.`,
    `Studied ${hours(stats.minutes)} in ${stats.sessions} sessions, on ${stats.days_studied} of 7 days.`,
    stats.best_day ? `Best day: ${WEEKDAYS[weekday(stats.best_day.day)]} (${hours(stats.best_day.minutes)}).` : 'No best day.',
    stats.subjects.length ? `By subject: ${stats.subjects.map((s) => `${s.name} ${hours(s.minutes)}`).join(', ')}.` : '',
    `Coins earned: ${stats.coins}. Days the daily goal was reached: ${stats.goal_days}.`,
    `Current streak: ${extra.streak} days (best ever: ${extra.bestStreak}).`,
    extra.roadmap ? `Roadmap (${extra.goalTitle}): ${extra.roadmap.done} of ${extra.roadmap.total} chapters done (${extra.roadmap.pct}%).` : 'No roadmap yet.',
  ]
  return lines.filter(Boolean).join('\n')
}

export async function report(body, { store, ai, now }) {
  const tz = validTimeZone(body.timeZone)
  const today = localDayIn(tz, now())
  const weekStart = body.weekStart ?? addDays(mondayOf(today), -7)
  if (!isDay(weekStart) || weekday(weekStart) !== 1) throw new AiError('bad_input', 'A week starts on a Monday')
  if (addDays(weekStart, 7) > today) throw new AiError('bad_input', "That week isn't over yet")

  const existing = await store.weeklyReport(weekStart)
  if (existing) return { report: existing, cached: true }

  const [stats, profile, goal] = await Promise.all([store.weekStats(weekStart), store.profile(), store.activeGoal()])
  const roadmap = goal ? await store.latestRoadmap(goal.id).catch(() => null) : null
  const extra = {
    streak: liveStreak(profile, today),
    bestStreak: profile?.best_streak ?? 0,
    goalTitle: goal?.title ?? null,
    roadmap: roadmap ? roadmapProgress(goal, roadmap) : null,
  }
  const numbers = { ...stats, streak: extra.streak, best_streak: extra.bestStreak, goal: extra.goalTitle, roadmap: extra.roadmap && { done: extra.roadmap.done, total: extra.roadmap.total, pct: extra.roadmap.pct } }

  // nothing studied: no need to ask the AI
  if (!stats.minutes) {
    const saved = await store.saveWeeklyReport(weekStart, numbers, {
      summary: 'Last week was a quiet one: no study sessions. That happens, and every week is a fresh start.',
      tip: 'Try one short session tomorrow, even 15 minutes. Starting is the hardest part!',
    })
    return { report: saved, cached: false }
  }

  return withAllowance(store, 'report', async (usage) => {
    const out = await generateJson(ai(), {
      system: systemPrompt({ profile, task: TASK, context: describeWeek(stats, extra) }),
      messages: [{ role: 'user', text: 'Please write my weekly report.' }],
      schema: REPORT_SCHEMA,
      maxTokens: OUTPUT.report.maxTokens,
      timeoutMs: OUTPUT.report.timeoutMs,
      temperature: 0.7,
    })
    const summary = clip(out?.summary, OUTPUT.report.maxChars)
    const tip = clip(out?.tip, 300)
    if (!summary || !tip) throw new AiError('bad_output', 'Empty report')
    const saved = await store.saveWeeklyReport(weekStart, numbers, { summary, tip })
    return { report: saved, cached: false, usage: { used: usage.used, limit: usage.limit } }
  })
}
