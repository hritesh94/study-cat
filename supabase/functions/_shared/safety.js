// ───────── Safety: above everything else ─────────
// If a message suggests real distress (hopelessness, self-harm, wanting to
// die), the cat drops its playful voice, answers warmly and seriously, and
// the app shows crisis helplines. Code checks for it BEFORE the AI (so it
// works even when the AI is down or the daily limit is used up), and the AI
// is told to flag what the words below miss.
//
// "I'm dumb", "I'll fail" are not on this list: that's feeling down about
// studying, and the cat cheers them up instead (see the chat rules).

const PATTERNS = [
  /\bsuicid/,
  /\bkill(ing)?\s+my\s*self\b/, // ("this chapter is killing me" is just an idiom: the AI's own flag judges those)
  /\b(hurt|harm|cut)(ing)?\s+(my\s*self)\b/,
  /\bself[\s-]?harm/,
  /\b(want|wanna|going|ready)\s+to\s+die\b/,
  /\bwish\s+i\s+(was|were)\s+(dead|never\s+born)\b/,
  /\bend\s+(my\s+life|it\s+all|everything)\b/,
  /\b(no|not\s+any)\s+(reason|point)\s+(to|in)\s+(live|living|go\s+on|being\s+alive)\b/,
  /\b(don'?t|do\s+not)\s+want\s+to\s+(live|be\s+alive|exist|wake\s+up)\b/,
  /\bbetter\s+off\s+(dead|without\s+me)\b/,
  /\b(feel|feeling|i'?m|am)\s+(so\s+|totally\s+|completely\s+)?hopeless\b/,
  /\bcan'?t\s+(go\s+on|take\s+(it|this)\s+any\s*more)\b/,
  // Hindi / Hinglish
  /\bkhud\s*kushi\b/,
  /\baatm?a?\s*hatya\b/,
  /\bmar(na)?\s+(jaana|jana|jaun|jaaun)?\s*chaht[aie]\b/,
  /\bjeena\s+nahi\s+chaht[aie]\b/,
  /\bzind[a-z]*\s+(se\s+)?(thak|khatam)/,
]

export function detectDistress(text) {
  if (typeof text !== 'string') return false
  const t = text.toLowerCase().replace(/[’‘`]/g, "'")
  return PATTERNS.some((p) => p.test(t))
}

// When the AI can't answer (down, or the limit is used up), this is said instead.
export const CRISIS_REPLY =
  "I'm really glad you told me. You matter, and you don't have to carry this alone. Please talk to someone you trust, or call one of the free helplines below right now. They're there to listen."
