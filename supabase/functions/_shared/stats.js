// Study numbers for the AI, calculated by code (the AI never counts).
// sessions: ended sessions [{ started_at, counted_minutes, leave_count, study_day }]

const DAY_MS = 86400000
export const addDays = (day, n) => new Date(Date.parse(`${day}T00:00:00Z`) + n * DAY_MS).toISOString().slice(0, 10)
export const daysBetween = (from, to) => Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / DAY_MS)
export const weekday = (day) => new Date(`${day}T00:00:00Z`).getUTCDay() // 0 = Sunday
export const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

// the user's own date ("2026-10-30") in their time zone
export function localDayIn(timeZone, date = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(date)
}

const hourIn = (iso, timeZone) =>
  Number(new Intl.DateTimeFormat('en-US', { timeZone, hour: 'numeric', hourCycle: 'h23' }).format(new Date(iso))) % 24
const partOfDay = (hour) => (hour >= 5 && hour < 12 ? 'morning' : hour < 17 && hour >= 12 ? 'afternoon' : hour >= 17 && hour < 21 ? 'evening' : 'night')

// the streak shown in the app: alive only if the last streak day was today or yesterday
export const liveStreak = (profile, today) =>
  profile?.last_study_day && profile.last_study_day >= addDays(today, -1) ? profile.current_streak : 0

export function studyStats(sessions, { profile, timeZone = 'UTC', today, days = 14 }) {
  const from = addDays(today, -(days - 1))
  const recent = sessions.filter((s) => s.counted_minutes > 0 && s.study_day >= from && s.study_day <= today)
  const totalMinutes = recent.reduce((sum, s) => sum + s.counted_minutes, 0)
  const byPart = {}
  for (const s of recent) {
    const part = partOfDay(hourIn(s.started_at, timeZone))
    byPart[part] = (byPart[part] ?? 0) + s.counted_minutes
  }
  const usual = Object.entries(byPart).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null
  return {
    days,
    totalMinutes,
    sessions: recent.length,
    daysStudied: new Set(recent.map((s) => s.study_day)).size,
    avgSessionMinutes: recent.length ? Math.round(totalMinutes / recent.length) : 0,
    usualTime: usual,
    leavesPerSession: recent.length ? Math.round((recent.reduce((sum, s) => sum + (s.leave_count ?? 0), 0) / recent.length) * 10) / 10 : 0,
    currentStreak: liveStreak(profile, today),
    bestStreak: profile?.best_streak ?? 0,
  }
}

export function describeStats(st) {
  if (!st.sessions) return `Last ${st.days} days: no study sessions yet. Current streak: ${st.currentStreak} days.`
  return [
    `Last ${st.days} days: studied on ${st.daysStudied} of ${st.days} days, ${st.totalMinutes} minutes in total (${st.sessions} sessions, ${st.avgSessionMinutes} min on average).`,
    `Usually studies in the ${st.usualTime}. Leaves the app ${st.leavesPerSession} times per session on average.`,
    `Current streak: ${st.currentStreak} days (best ever: ${st.bestStreak}).`,
  ].join(' ')
}

// Roadmap progress: which chapters are done, and what's next.
// plan.chapters is in study order; goal.done_chapters lists the done ids.
export function roadmapProgress(goal, roadmap) {
  const chapters = roadmap?.plan?.chapters ?? goal?.chapters ?? []
  const done = new Set(goal?.done_chapters ?? [])
  const doneCount = chapters.filter((c) => done.has(c.id)).length
  const next = chapters.find((c) => !done.has(c.id)) ?? null
  return { total: chapters.length, done: doneCount, pct: chapters.length ? Math.round((doneCount / chapters.length) * 100) : 0, next }
}

export function describeGoal(goal, roadmap, today) {
  if (!goal) return 'Goal: none set yet.'
  const left = daysBetween(today, goal.deadline)
  const lines = [`Goal: ${goal.title} (${goal.kind}), deadline ${goal.deadline} (${left} days left), ${Number(goal.hours_per_day)} hours a day.`]
  const levels = (goal.subjects ?? []).map((s) => `${s.name}: ${s.level}`).join(', ')
  if (levels) lines.push(`Subject levels: ${levels}.`)
  if (!roadmap) lines.push('No roadmap yet.')
  else {
    const p = roadmapProgress(goal, roadmap)
    lines.push(`Roadmap: ${p.done} of ${p.total} chapters done (${p.pct}%).${p.next ? ` Next chapter: ${p.next.name} (${p.next.subject}).` : ''}`)
  }
  return lines.join(' ')
}
