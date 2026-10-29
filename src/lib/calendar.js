// Little date helpers for the streak calendar. Days are "YYYY-MM-DD"
// strings in the user's own timezone (the same as the server's study_day).
import { localDay } from './supabase'

// How green a day gets: minutes studied → level 0 (nothing) … 4 (lots).
export const DAY_LEVELS = [
  { level: 1, from: 1 },
  { level: 2, from: 25 },
  { level: 3, from: 60 },
  { level: 4, from: 120 },
]
export const levelFor = (minutes) => DAY_LEVELS.reduce((lv, l) => (minutes >= l.from ? l.level : lv), 0)

const atNoon = (day) => new Date(`${day}T12:00:00`) // noon: never trips over daylight saving
export const addDays = (day, n) => {
  const d = atNoon(day)
  d.setDate(d.getDate() + n)
  return localDay(d)
}

// "2026-10" → its first and last day
export function monthRange(month) {
  const [y, m] = month.split('-').map(Number)
  return { from: localDay(new Date(y, m - 1, 1, 12)), to: localDay(new Date(y, m, 0, 12)) }
}
export const monthOf = (day) => day.slice(0, 7)
export function shiftMonth(month, n) {
  const [y, m] = month.split('-').map(Number)
  return localDay(new Date(y, m - 1 + n, 1, 12)).slice(0, 7)
}
export const monthName = (month) => atNoon(`${month}-01`).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
export const dayName = (day) => atNoon(day).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })

// The month as weeks of 7 cells (Monday first); null = a blank cell.
export function monthGrid(month) {
  const { from, to } = monthRange(month)
  const blanks = (atNoon(from).getDay() + 6) % 7 // Monday = 0
  const cells = Array(blanks).fill(null)
  for (let d = from; d <= to; d = addDays(d, 1)) cells.push(d)
  while (cells.length % 7) cells.push(null)
  const weeks = []
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7))
  return weeks
}

// Streaks from a { day: minutes } map (used when logged out; logged in,
// the server keeps them on the profile).
export function streaksFrom(minutesByDay, minMinutes, today = localDay()) {
  const days = Object.keys(minutesByDay).filter((d) => minutesByDay[d] >= minMinutes).sort()
  let best = 0
  let run = 0
  let prev = null
  for (const d of days) {
    run = prev && addDays(prev, 1) === d ? run + 1 : 1
    best = Math.max(best, run)
    prev = d
  }
  // the current streak is alive if its last day is today or yesterday
  const current = prev && prev >= addDays(today, -1) ? run : 0
  return { current, best }
}
