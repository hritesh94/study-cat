import { supabase } from '../lib/supabase'

// Talks to the cat's AI, which lives in Supabase Edge Functions
// (supabase/functions/). The browser never sees the AI key: it sends your
// login token, and the function checks it.
//
// askCat(name, body) → { data } or { error: { code, text } }. It never
// throws, so a broken AI can't break the app: `text` is something cute the
// cat can say instead.

const SAYS = {
  unauthorized: 'Log in first, and then we can talk. Mrrp!',
  limit: {
    chat: "I've done all my talking for today. Let's chat again tomorrow!",
    roadmap: "I've drawn enough maps for today. I can make a new one tomorrow.",
    quiz: "That's all my quizzes for today. Your brain deserves a rest too!",
    report: 'One report a day is my limit. Come back tomorrow!',
    default: "I've used up my thinking for today. Back tomorrow!",
  },
  tired: 'The cat is tired, try again in a minute.',
  too_big: "That's a lot for a small cat! Can you make it shorter?",
  offline: "I can't reach my thinking cloud. Are you online?",
  bad_output: 'Mrrp? My thoughts got tangled. Can you try again?',
  ai_down: 'My thinking cloud is napping right now. Try again in a bit?',
}

export function catSays(code, kind) {
  const say = SAYS[code] ?? SAYS.ai_down
  return typeof say === 'string' ? say : (say[kind] ?? say.default)
}

export async function askCat(name, body) {
  if (!supabase) return { error: { code: 'unauthorized', text: catSays('unauthorized') } }
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return { error: { code: 'offline', text: catSays('offline') } }
  try {
    const { data, error } = await supabase.functions.invoke(name, { body })
    if (!error) return { data }
    // the function answered with an error: read its { error: { code } }
    let code = 'ai_down'
    let extra = {}
    if (error.context && typeof error.context.json === 'function') {
      const payload = await error.context.json().catch(() => null)
      if (payload?.error?.code) ({ code, ...extra } = payload.error)
      else if (error.context.status === 401) code = 'unauthorized'
    } else if (error.name === 'FunctionsFetchError') code = 'offline'
    return { error: { code, ...extra, text: catSays(code, extra.kind ?? name) } }
  } catch {
    return { error: { code: 'offline', text: catSays('offline') } }
  }
}

// Shown in every AI panel.
export const PRIVACY_NOTE = "Don't paste private or personal information."
