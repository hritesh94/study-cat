// What every AI Edge Function does around its own work: CORS, "are you
// logged in?", reading the request, and turning errors into { error: { code } }.
import { INPUT } from './config.js'
import { AiError, STATUS } from './errors.js'

// Any site may call these: the login token (not cookies) decides who you are.
export const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
export const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } })

// handle(body, deps) does the work; makeDeps(token) checks the login token
// with Supabase Auth and returns { user, store, ai, now } (or throws).
export function makeHandler(handle, makeDeps, log = console) {
  return async (req) => {
    if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
    if (req.method !== 'POST') return json({ error: { code: 'bad_input' } }, 405)
    try {
      const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '').trim()
      if (!token) throw new AiError('unauthorized')
      const raw = await req.text()
      if (raw.length > INPUT.maxBodyBytes) throw new AiError('too_big', 'Request too large')
      let body
      try {
        body = raw ? JSON.parse(raw) : {}
      } catch {
        throw new AiError('bad_input', 'Not JSON')
      }
      if (!body || typeof body !== 'object' || Array.isArray(body)) throw new AiError('bad_input', 'Not an object')
      const deps = await makeDeps(token) // only logged-in users get past here
      return json(await handle(body, deps))
    } catch (error) {
      const code = error instanceof AiError ? error.code : 'ai_down'
      const status = STATUS[code] ?? 500
      if (status >= 500) log.error(`[ai] ${code}: ${error.message}`) // shows in Supabase → Edge Functions → Logs
      return json({ error: { code, ...(error.extra ?? {}) } }, status)
    }
  }
}

// Take one AI call from today's allowance, give it back if the work fails.
export async function withAllowance(store, kind, work) {
  const r = await store.reserve(kind)
  if (!r.allowed) throw new AiError('limit', `Daily ${kind} limit reached`, { kind, used: r.used, limit: r.limit })
  try {
    return await work(r)
  } catch (error) {
    await store.release(kind).catch(() => {})
    throw error
  }
}
