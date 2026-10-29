import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

// Who's logged in (or null). Login is a "magic link": we email a link, and
// opening it signs you in; supabase-js picks the login up from the URL.
export function useAuth() {
  const [user, setUser] = useState(null)
  const [ready, setReady] = useState(!supabase)

  useEffect(() => {
    if (!supabase) return
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null)
      setReady(true)
    })
    const { data } = supabase.auth.onAuthStateChange((_event, session) => setUser(session?.user ?? null))
    return () => data.subscription.unsubscribe()
  }, [])

  const sendMagicLink = useCallback(async (email) => {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin + window.location.pathname },
    })
    if (error) throw error
  }, [])

  const signOut = useCallback(() => supabase.auth.signOut(), [])

  return { enabled: !!supabase, ready, user, sendMagicLink, signOut }
}
