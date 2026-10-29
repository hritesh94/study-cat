import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

// Who's logged in (or null). We email you a link AND a 6-digit code:
//  • the link signs you in in whichever browser opens it (supabase-js
//    picks the login up from the URL); on phones that's often the wrong one,
//    e.g. Gmail opens Chrome while you were using Safari
//  • the code signs you in right here, in the browser you typed it into
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

  const verifyCode = useCallback(async (email, code) => {
    const { error } = await supabase.auth.verifyOtp({ email, token: code, type: 'email' })
    if (error) throw error
  }, [])

  const signOut = useCallback(() => supabase.auth.signOut(), [])

  return { enabled: !!supabase, ready, user, sendMagicLink, verifyCode, signOut }
}
