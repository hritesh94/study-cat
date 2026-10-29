import { createClient } from '@supabase/supabase-js'

// The connection to our Supabase project. Both values come from .env.local
// (and from Vercel's environment variables when deployed).
//
// The publishable key is meant to be public: it's in every visitor's
// browser. What keeps data safe is Row Level Security in the database (see
// supabase/migrations/). Never put a *secret* key in the app.
const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

// If the keys are missing (e.g. someone cloned the repo without .env.local),
// the app still works, just without accounts.
export const supabase = url && key ? createClient(url, key) : null

// handy while developing: try things from the browser console
if (import.meta.env.DEV && supabase) window.supabase = supabase

// The user's own calendar day, as "2026-10-29" (sent to the server so a
// late-night session counts for the right day where you live).
export function localDay(date = new Date()) {
  const pad = (n) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

// The streak only stays alive if the last streak day was today or yesterday.
export function liveStreak(profile, today = localDay()) {
  if (!profile?.last_study_day) return 0
  const yesterday = new Date(`${today}T12:00:00`)
  yesterday.setDate(yesterday.getDate() - 1)
  return profile.last_study_day >= localDay(yesterday) ? profile.current_streak : 0
}
