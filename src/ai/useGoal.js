import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export const GOAL_KINDS = { neet: 'NEET UG', jee_main: 'JEE Main', boards: 'Board exams', custom: 'Something else' }

// Your active goal (table goals). There's at most one; setting a new goal
// retires the old one.
export function useGoal(userId) {
  const [state, setState] = useState({ userId: null, goal: null, loaded: false })
  const [error, setError] = useState(null)
  const mine = state.userId === userId
  const goal = mine ? state.goal : null

  useEffect(() => {
    if (!userId || !supabase) return
    let cancelled = false
    supabase
      .from('goals')
      .select('*')
      .eq('active', true)
      .maybeSingle()
      .then(({ data, error }) => {
        if (cancelled) return
        if (error) setError(error.message)
        setState({ userId, goal: data ?? null, loaded: true })
      })
    return () => {
      cancelled = true
    }
  }, [userId])

  // fields = { kind, title, deadline, hours_per_day, subjects, … }
  const saveGoal = useCallback(
    async (fields) => {
      setError(null)
      if (goal) {
        const { error } = await supabase.from('goals').update({ active: false }).eq('id', goal.id)
        if (error) throw error
      }
      const { data, error } = await supabase.from('goals').insert({ ...fields, active: true }).select('*').single()
      if (error) throw error
      setState({ userId, goal: data, loaded: true })
      return data
    },
    [goal, userId],
  )

  return { goal, loaded: mine && state.loaded, error, saveGoal }
}
