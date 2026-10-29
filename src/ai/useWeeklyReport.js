import { useCallback, useState } from 'react'
import { localDay } from '../lib/supabase'
import { askCat } from './client'
import { addDays } from './schedule'

const weekday = (day) => new Date(`${day}T00:00:00Z`).getUTCDay()
// the Monday of last week (the last full week)
export const lastWeekStart = (today = localDay()) => addDays(today, -((weekday(today) + 6) % 7) - 7)

// Last week's report: { report, loading, error, load() }. Each week is
// written once by the server and kept; asking again just reads it.
export function useWeeklyReport() {
  const [state, setState] = useState({ report: null, loading: false, error: null })
  const load = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: null }))
    const { data, error } = await askCat('report', { weekStart: lastWeekStart(), timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone })
    setState({ report: data?.report ?? null, loading: false, error: error?.text ?? null })
    return data?.report ?? null
  }, [])
  return { ...state, load }
}
