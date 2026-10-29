import { useCallback } from 'react'
import { useLocalStorage } from './useLocalStorage'

// Today's date as "YYYY-MM-DD" in the user's own timezone.
function todayKey() {
  const d = new Date()
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

// Keeps a record like { "2026-10-29": 1830000 } (milliseconds studied per day).
// Storing every day now means a history/streak screen is easy to add later.
export function useStudyStats() {
  const [byDay, setByDay] = useLocalStorage('studycat:studyMsByDay', {})

  const addStudyMs = useCallback(
    (ms) => {
      if (ms <= 0) return
      const key = todayKey()
      setByDay((prev) => ({ ...prev, [key]: (prev[key] ?? 0) + ms }))
    },
    [setByDay],
  )

  const todayMinutes = Math.floor((byDay[todayKey()] ?? 0) / 60000)

  return { todayMinutes, addStudyMs }
}
