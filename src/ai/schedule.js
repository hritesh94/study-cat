// ───────── Spreading a roadmap over the days (plain code, no AI) ─────────
// The AI's plan says WHAT to study and roughly how long each chapter takes.
// This decides WHEN, from today until the day before the deadline:
//
//   • every day's target = your hours per day (in minutes); one lighter day
//     a week (goal.light_weekday) gets goal_light_day_pct of it
//   • first the "learn" days: chapters in the plan's order, filled into
//     each day's minutes (a big chapter carries on the next day)
//   • then a few BUFFER days: empty unless something didn't fit, so a bad
//     week doesn't wreck the plan
//   • then revision and mock-test days (the plan's phase shares)
//
// It's worked out again from TODAY every time, with the chapters you haven't
// ticked off. So a missed day simply moves its chapters forward: nothing to
// catch up by hand. The daily target is the same one the server checks for
// the +15 coins (public._goal_target in migration 9).

const DAY_MS = 86400000
export const addDays = (day, n) => new Date(Date.parse(`${day}T00:00:00Z`) + n * DAY_MS).toISOString().slice(0, 10)
export const daysBetween = (from, to) => Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / DAY_MS)
const weekday = (day) => new Date(`${day}T00:00:00Z`).getUTCDay()

export function dayTarget(goal, day, rules) {
  const lightPct = rules?.goal_light_day_pct ?? 50
  const minimum = rules?.streak_min_minutes ?? 25
  const factor = weekday(day) === goal.light_weekday ? lightPct / 100 : 1
  return Math.max(minimum, Math.round(Number(goal.hours_per_day) * 60 * factor))
}

const share = (plan, kind, fallback) => plan?.phases?.find((p) => p.kind === kind)?.share ?? fallback

export function buildSchedule({ goal, plan, today, rules }) {
  const daysLeft = daysBetween(today, goal.deadline) // the exam day itself isn't planned
  const done = new Set(goal.done_chapters ?? [])
  const chapters = plan?.chapters ?? goal.chapters ?? []
  const todo = chapters.filter((c) => !done.has(c.id))
  const progress = {
    done: chapters.length - todo.length,
    total: chapters.length,
    pct: chapters.length ? Math.round(((chapters.length - todo.length) / chapters.length) * 100) : 0,
  }
  if (daysLeft <= 0) return { days: [], daysLeft, progress, unscheduled: todo, behind: todo.length > 0, next: todo[0] ?? null }

  // how the days are used
  const learnShare = share(plan, 'learn', 0.7)
  const reviseShare = share(plan, 'revise', 0.2)
  const mockShare = share(plan, 'mock', 0.1)
  const endShare = reviseShare + mockShare
  const endDays = Math.min(daysLeft - 1, Math.round((daysLeft * endShare) / (learnShare + endShare || 1)))
  const reviseDays = endShare > 0 ? Math.round((endDays * reviseShare) / endShare) : 0
  const learnDays = daysLeft - endDays
  const bufferDays = learnDays >= 7 ? Math.min(7, Math.max(1, Math.round(learnDays * 0.08))) : 0

  const days = []
  for (let i = 0; i < daysLeft; i++) {
    const day = addDays(today, i)
    const phase = i < learnDays - bufferDays ? 'learn' : i < learnDays ? 'buffer' : i < learnDays + reviseDays ? 'revise' : 'mock'
    days.push({ day, phase, light: weekday(day) === goal.light_weekday, target: dayTarget(goal, day, rules), chapters: [] })
  }

  // fill the learn days with chapters, in order; overflow goes to the buffer
  const queue = todo.map((c) => ({ chapter: c, left: Math.round((c.hours ?? 0) * 60) })).filter((q) => q.left > 0)
  const fill = (phase) => {
    for (const d of days) {
      if (d.phase !== phase) continue
      let room = d.target
      while (room > 0 && queue.length) {
        const q = queue[0]
        const minutes = Math.min(room, q.left)
        d.chapters.push({ id: q.chapter.id, name: q.chapter.name, subject: q.chapter.subject, minutes })
        q.left -= minutes
        room -= minutes
        if (q.left <= 0) queue.shift()
      }
    }
  }
  fill('learn')
  fill('buffer')

  const unscheduled = queue.map((q) => q.chapter)
  return {
    days,
    daysLeft,
    progress,
    unscheduled, // what doesn't fit before revision starts
    behind: unscheduled.length > 0,
    next: todo[0] ?? null,
    today: days[0],
  }
}

// which week of the roadmap today is (week 1 = the week it was made)
export const roadmapWeek = (roadmap, today) => Math.floor(daysBetween(roadmap.created_at.slice(0, 10), today) / 7) + 1

// "3h 20m"
export function hoursText(minutes) {
  const h = Math.floor(minutes / 60)
  const m = Math.round(minutes % 60)
  return h && m ? `${h}h ${m}m` : h ? `${h}h` : `${m}m`
}
