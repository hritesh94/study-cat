// The Deno-only part: real Supabase clients, the real AI provider, and the
// server. Everything else in _shared/ is plain JavaScript, tested in Node
// (npm run test:ai) without any of this.
import { createClient } from 'npm:@supabase/supabase-js@2'
import { AiError } from './errors.js'
import { makeHandler } from './http.js'
import { getProvider } from './providers/index.js'
import { makeStore } from './store.js'

const env = (name) => Deno.env.get(name)

// Supabase gives every function its keys: the new JSON lists, or the legacy ones
function supabaseKey(list, legacy) {
  try {
    const keys = JSON.parse(env(list) ?? '{}')
    if (keys.default) return keys.default
  } catch {
    // fall back to the legacy key
  }
  return env(legacy)
}

export function serveAi(handle) {
  Deno.serve(
    makeHandler(handle, async (token) => {
      const url = env('SUPABASE_URL')
      const options = { auth: { persistSession: false, autoRefreshToken: false } }
      // acts AS the user: Row Level Security applies to everything it reads
      const db = createClient(url, supabaseKey('SUPABASE_PUBLISHABLE_KEYS', 'SUPABASE_ANON_KEY'), {
        ...options,
        global: { headers: { Authorization: `Bearer ${token}` } },
      })
      // is this a real, current login? (asks Supabase Auth, so a logged-out
      // or forged token is refused here)
      const { data, error } = await db.auth.getUser(token)
      if (error || !data?.user) throw new AiError('unauthorized')
      // the server's own key: only for the limits and saving AI results
      const admin = createClient(url, supabaseKey('SUPABASE_SECRET_KEYS', 'SUPABASE_SERVICE_ROLE_KEY'), options)
      return {
        user: data.user,
        store: makeStore({ db, admin, userId: data.user.id }),
        ai: () => getProvider(env), // made only when it's really needed
        now: () => new Date(),
      }
    }),
  )
}
