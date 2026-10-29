// ───────────── Every AI setting, in one place ─────────────
// The Edge Functions (and only they) talk to the AI. The key never leaves
// Supabase: it's the GEMINI_API_KEY secret, read on the server.

export const AI = {
  // which provider module to use (providers/index.js); the AI_PROVIDER
  // secret can override it without a code change
  provider: 'gemini',
  // Gemini Flash on Google's free tier. Checked on 2026-10-30 against
  // https://ai.google.dev/gemini-api/docs/models (stable) and
  // https://ai.google.dev/gemini-api/docs/pricing ("Free of charge").
  // 3.6 first: on 2026-10-30 the newest one (3.8) answered "this model is
  // currently experiencing high demand" to free-tier calls.
  models: { gemini: 'gemini-3.6-flash' },
  // when that one is too busy (or too slow), the cat asks this one
  fallbackModels: { gemini: 'gemini-3.8-flash' },
  // Flash can't switch thinking off; "low" keeps it quick. Thinking tokens
  // count toward maxTokens below, so those leave room for it.
  thinkingLevel: 'low',
  // the free tier says "429 Too Many Requests" when everyone together asked
  // too much: wait this long, try once more, then the backup model
  retryAfterMs: 2500,
}

// What a user may send in one request.
export const INPUT = {
  maxChars: 8000, // any one text field
  maxImageBytes: 5 * 1024 * 1024, // a photo of a syllabus (after the browser shrinks it)
  imageTypes: ['image/jpeg', 'image/png', 'image/webp'],
  maxBodyBytes: 7.5 * 1024 * 1024, // the whole request (a 5 MB image is ~6.7 MB as base64)
}

// How much the AI may write back (tokens include its thinking), and how
// long one model may take before the cat gives up on it and asks the backup.
// An overloaded model can hang for 10-20 s before it says it's busy.
export const OUTPUT = {
  chat: { maxTokens: 1500, maxChars: 600, timeoutMs: 12000 },
  roadmap: { maxTokens: 12000, timeoutMs: 55000 },
  quiz: { maxTokens: 3000, timeoutMs: 25000 },
  report: { maxTokens: 2000, maxChars: 700, timeoutMs: 20000 },
}

export const CHAT = {
  historyMessages: 10, // the last N chat messages go with each new one
  statsDays: 14, // study stats from the last N days
  conversationGapHours: 6, // a pause this long starts a new "conversation"
}
