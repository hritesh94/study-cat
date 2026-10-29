import { useEffect, useMemo, useState } from 'react'
import { addDays } from '../lib/calendar'
import { supabase } from '../lib/supabase'

// Study totals per day, from `from` to `to` ("YYYY-MM-DD"):
//   { "2026-10-29": { minutes, coins, sessions, subjects: [{ name, color, minutes }] } }
//
// Logged in (userId): from the server's daily_totals. Change `version` to
// fetch again (e.g. after a session ends). Logged out: built from this
// browser's own history (`local`), which has no coins.
// `ready` is false until the server answered (or when it couldn't).
export function useDailyTotals({ userId, from, to, version = 0, enabled = true, local }) {
  const range = `${userId}|${from}|${to}`
  const key = `${range}|${version}`
  const [loaded, setLoaded] = useState({ key: null, range: null, days: {}, error: null })

  useEffect(() => {
    if (!userId || !enabled || !supabase) return
    let cancelled = false
    supabase.rpc('daily_totals', { p_from: from, p_to: to }).then(({ data, error }) => {
      if (cancelled) return
      const days = {}
      for (const row of data ?? []) days[row.day] = { ...row, subjects: row.subjects ?? [] }
      setLoaded({ key, range, days, error: error?.message ?? null })
    })
    return () => {
      cancelled = true
    }
  }, [userId, from, to, enabled, key, range])

  const localDays = useMemo(() => {
    if (userId || !local) return {}
    const names = Object.fromEntries(local.subjects.map((s) => [s.id, s]))
    const days = {}
    for (let d = from; d <= to; d = addDays(d, 1)) {
      const minutes = Math.floor((local.byDay[d] ?? 0) / 60000)
      if (!minutes) continue
      const subjects = Object.entries(local.bySubjectDay[d] ?? {})
        .map(([id, ms]) => ({ name: names[id]?.name ?? null, color: names[id]?.color ?? null, minutes: Math.floor(ms / 60000) }))
        .filter((s) => s.minutes > 0)
        .sort((a, b) => b.minutes - a.minutes)
      days[d] = { minutes, subjects }
    }
    return days
  }, [userId, local, from, to])

  if (!userId) return { days: localDays, ready: true, error: null }
  // while a refresh loads, keep showing the last answer for the same days
  const same = loaded.range === range
  return { days: same ? loaded.days : {}, ready: same && !loaded.error, error: same ? loaded.error : null }
}
