import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'

// All-time study minutes per subject, for the bookshelf:
//   [{ id, name, color, minutes }]
// Logged in: the server's subject_totals (fetched again when `version`
// changes). Logged out: added up from this browser's history (`local`).
export function useSubjectTotals({ userId, version = 0, local }) {
  const [loaded, setLoaded] = useState({ id: null, list: [] })

  useEffect(() => {
    if (!userId || !supabase) return
    let cancelled = false
    supabase.rpc('subject_totals').then(({ data, error }) => {
      if (cancelled || error) return
      setLoaded({ id: userId, list: data.map((s) => ({ id: s.subject_id, name: s.name, color: s.color, minutes: s.minutes })) })
    })
    return () => {
      cancelled = true
    }
  }, [userId, version])

  const localList = useMemo(() => {
    if (userId || !local) return []
    const ms = {}
    for (const day of Object.values(local.bySubjectDay)) for (const [id, v] of Object.entries(day)) ms[id] = (ms[id] ?? 0) + v
    return local.subjects.map((s) => ({ ...s, minutes: Math.floor((ms[s.id] ?? 0) / 60000) }))
  }, [userId, local])

  const serverList = loaded.id === userId ? loaded.list : null
  return useMemo(() => (userId ? (serverList ?? []) : localList), [userId, serverList, localList])
}
