import { useCallback } from 'react'
import { localDay } from '../lib/supabase'
import { useLocalStorage } from './useLocalStorage'

// This browser's own study history (used when logged out, and for the
// one-time import when you first log in):
//   byDay        { "2026-10-29": 1830000 }                 ms studied per day
//   bySubjectDay { "2026-10-29": { "local-abc": 1200000 } } ms per subject per day
// ("" = no subject)
export function useStudyStats() {
  const [byDay, setByDay] = useLocalStorage('studycat:studyMsByDay', {})
  const [bySubjectDay, setBySubjectDay] = useLocalStorage('studycat:studyMsBySubject', {})

  const addStudyMs = useCallback(
    (ms, subjectId = null) => {
      if (ms <= 0) return
      const key = localDay()
      setByDay((prev) => ({ ...prev, [key]: (prev[key] ?? 0) + ms }))
      const s = subjectId ?? ''
      setBySubjectDay((prev) => ({ ...prev, [key]: { ...prev[key], [s]: (prev[key]?.[s] ?? 0) + ms } }))
    },
    [setByDay, setBySubjectDay],
  )

  const todayMinutes = Math.floor((byDay[localDay()] ?? 0) / 60000)

  return { todayMinutes, addStudyMs, byDay, bySubjectDay }
}
