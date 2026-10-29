import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

// Read what this browser saved before logging in, for the one-time import.
function readLocal() {
  const read = (key, fallback) => {
    try {
      const v = localStorage.getItem(key)
      return v === null ? fallback : JSON.parse(v)
    } catch {
      return fallback
    }
  }
  const byDay = read('studycat:studyMsByDay', {})
  const minutes = Math.floor(Object.values(byDay).reduce((sum, ms) => sum + (Number(ms) || 0), 0) / 60000)
  const look = read('studycat:cat', {})
  return { minutes, breed: look.breed ?? null, outfit: look.outfit ?? null }
}

// The logged-in user's profile row (coins, streak, cat…), or null.
// The first time someone logs in, this browser's study history and cat
// choice are copied into their profile (the server makes sure it's once).
export function useProfile(user) {
  const userId = user?.id ?? null // a token refresh gives a new user object; only the id matters
  // remember whose profile this is, so after logging out (or switching
  // accounts) an old profile never shows for the wrong person
  const [loaded, setLoaded] = useState({ id: null, data: null })
  const profile = loaded.id === userId ? loaded.data : null
  const [settings, setSettings] = useState(null) // the game_settings row (coin rules)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!userId) return
    let cancelled = false
    ;(async () => {
      let { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single()
      if (!error && data && !data.imported_local_at) {
        const local = readLocal()
        ;({ data, error } = await supabase.rpc('import_local_progress', {
          p_minutes: local.minutes,
          p_breed: local.breed,
          p_outfit: local.outfit,
        }))
      }
      const rules = await supabase.from('game_settings').select('*').single()
      if (cancelled) return
      if (error) setError(error.message)
      else setLoaded({ id: userId, data })
      if (!rules.error) setSettings(rules.data)
    })()
    return () => {
      cancelled = true
    }
  }, [userId])

  // Change the fields a user is allowed to change (name, breed, outfit).
  // The screen updates right away; the database follows.
  const update = useCallback(
    async (fields) => {
      setLoaded((l) => (l.data ? { ...l, data: { ...l.data, ...fields } } : l))
      const { error } = await supabase.from('profiles').update(fields).eq('id', userId)
      if (error) setError(error.message)
    },
    [userId],
  )

  // merge a server result (e.g. from end_session) into the profile
  const merge = useCallback((fields) => setLoaded((l) => (l.data ? { ...l, data: { ...l.data, ...fields } } : l)), [])

  return { profile, settings, error, update, merge }
}
