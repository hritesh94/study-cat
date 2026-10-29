import { useCallback, useEffect, useState } from 'react'
import { syllabusFor } from '../data/syllabus'
import { localDay, supabase } from '../lib/supabase'
import { askCat } from './client'

export const GOAL_KINDS = { neet: 'NEET UG', jee_main: 'JEE Main', boards: 'Board exams', custom: 'Something else' }

// Your active goal (table goals) and its latest roadmap (table roadmaps).
// There's at most one active goal; setting a new one retires the old one.
//
//   saveGoal(fields)        a new goal (NEET / JEE get their syllabus chapters)
//   updateGoal(fields)      change hours, deadline… (the schedule just re-runs)
//   setDone(id, done)       tick a chapter off
//   buildRoadmap(extra)     ask the AI for the big picture (counts toward the limit)
//   claimDailyGoal()        the server checks today's minutes and gives the bonus
export function useGoal(userId) {
  const [state, setState] = useState({ userId: null, goal: null, roadmap: null, loaded: false })
  const [error, setError] = useState(null)
  const [building, setBuilding] = useState(false)
  const [buildError, setBuildError] = useState(null) // what the cat says when it couldn't
  const mine = state.userId === userId
  const goal = mine ? state.goal : null
  const roadmap = mine ? state.roadmap : null

  useEffect(() => {
    if (!userId || !supabase) return
    let cancelled = false
    ;(async () => {
      const g = await supabase.from('goals').select('*').eq('active', true).maybeSingle()
      const r = g.data
        ? await supabase.from('roadmaps').select('*').eq('goal_id', g.data.id).order('created_at', { ascending: false }).limit(1).maybeSingle()
        : { data: null }
      if (cancelled) return
      if (g.error) setError(g.error.message)
      setState({ userId, goal: g.data ?? null, roadmap: r.data ?? null, loaded: true })
    })()
    return () => {
      cancelled = true
    }
  }, [userId])

  const saveGoal = useCallback(
    async (fields) => {
      setError(null)
      if (goal) {
        const { error } = await supabase.from('goals').update({ active: false }).eq('id', goal.id)
        if (error) throw error
      }
      const syllabus = syllabusFor(fields.kind)
      const row = {
        ...fields,
        chapters: syllabus ? syllabus.chapters : null,
        done_chapters: fields.done_chapters ?? [],
        active: true,
      }
      const { data, error } = await supabase.from('goals').insert(row).select('*').single()
      if (error) throw error
      setState({ userId, goal: data, roadmap: null, loaded: true })
      return data
    },
    [goal, userId],
  )

  const updateGoal = useCallback(
    async (fields) => {
      if (!goal) return
      const before = goal
      setState((s) => ({ ...s, goal: { ...s.goal, ...fields } })) // the screen first, the database follows
      const { error } = await supabase.from('goals').update(fields).eq('id', before.id)
      if (error) {
        setError(error.message)
        setState((s) => ({ ...s, goal: before }))
        throw error
      }
    },
    [goal],
  )

  const setDone = useCallback(
    (chapterId, done) => {
      if (!goal) return
      const set = new Set(goal.done_chapters ?? [])
      if (done) set.add(chapterId)
      else set.delete(chapterId)
      return updateGoal({ done_chapters: [...set] }).catch(() => {})
    },
    [goal, updateGoal],
  )

  // extra = { syllabusText?, image? } (custom goals); returns { error } like askCat
  const buildRoadmap = useCallback(
    async (extra = {}, forGoal = goal) => {
      if (!forGoal) return { error: { text: 'Set a goal first!' } }
      setBuilding(true)
      setBuildError(null)
      const { data, error } = await askCat('roadmap', {
        goalId: forGoal.id,
        ...extra,
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      })
      setBuilding(false)
      if (error) {
        setBuildError(error.text)
        return { error }
      }
      setState((s) => ({ ...s, roadmap: data.roadmap }))
      return { data }
    },
    [goal],
  )

  const claimDailyGoal = useCallback(async () => {
    const { data, error } = await supabase.rpc('claim_daily_goal', { p_local_day: localDay() })
    if (error) return null
    return data
  }, [])

  return { goal, roadmap, loaded: mine && state.loaded, error, building, buildError, saveGoal, updateGoal, setDone, buildRoadmap, claimDailyGoal }
}
