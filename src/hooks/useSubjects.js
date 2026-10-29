import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useLocalStorage } from './useLocalStorage'

// Cozy colours to pick from for a new subject.
export const SUBJECT_COLORS = ['#f2a66a', '#e5867a', '#e9c46a', '#9cb59a', '#7fb3c9', '#9a86b0', '#d98ab3', '#a98467']

// Your subjects (Maths, History…), each { id, name, color }.
// Logged in: saved in Supabase (the subjects table). Logged out: in this
// browser's localStorage. `lastId` = the one to preselect next time.
export function useSubjects(userId) {
  const [local, setLocal] = useLocalStorage('studycat:subjects', [])
  const [lastId, setLastId] = useLocalStorage('studycat:lastSubject', null)
  const [loaded, setLoaded] = useState({ id: null, list: [] })
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!userId) return
    let cancelled = false
    supabase
      .from('subjects')
      .select('id, name, color, last_used_at')
      .order('last_used_at', { ascending: false, nullsFirst: false })
      .order('created_at')
      .then(({ data, error }) => {
        if (cancelled) return
        if (error) setError(error.message)
        else setLoaded({ id: userId, list: data })
      })
    return () => {
      cancelled = true
    }
  }, [userId])

  const subjects = useMemo(() => (userId ? (loaded.id === userId ? loaded.list : []) : local), [userId, loaded, local])
  // preselect: the last one picked on this browser ('none' = No subject),
  // else the most recently used one
  const preselected = lastId === 'none' ? null : subjects.some((s) => s.id === lastId) ? lastId : (subjects[0]?.id ?? null)

  // returns the new subject, or throws (e.g. the name already exists)
  const add = useCallback(
    async (name, color) => {
      const clean = name.trim().slice(0, 40)
      if (!clean) throw new Error('Give it a name first.')
      const exists = subjects.some((s) => s.name.toLowerCase() === clean.toLowerCase())
      if (exists) throw new Error('You already have a subject with that name.')
      if (!userId) {
        const subject = { id: `local-${Date.now().toString(36)}`, name: clean, color }
        setLocal((list) => [...list, subject])
        return subject
      }
      const { data, error } = await supabase.from('subjects').insert({ name: clean, color }).select('id, name, color, last_used_at').single()
      if (error) throw new Error(/at most/.test(error.message) ? error.message : 'Could not save that subject. Try again?')
      setLoaded((l) => ({ ...l, list: [...l.list, data] }))
      return data
    },
    [userId, subjects, setLocal],
  )

  const remember = useCallback((id) => setLastId(id ?? 'none'), [setLastId])

  return { subjects, preselected, remember, add, error }
}
