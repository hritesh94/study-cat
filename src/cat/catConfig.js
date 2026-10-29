// ─── The cat "contract" ────────────────────────────────────────────────
// The rest of the app only ever says "play the <name> animation".
// Each name is an *action* in poses.js (a short sequence of poses).
// App.jsx uses: idle, sad, play, feed, bathe, plus whatever useStudyCycle
// picks from STUDY_IDLES. Old names keep working through ALIASES in poses.js.
export const CAT_ANIMATIONS = [
  'idle', // break time, sitting on the rug
  'reading', // study: head follows the lines
  'pageTurn', // study: paw flips a page
  'writing', // study: pencil in paw
  'sipping', // study: drinks from the mug with both paws
  'chinRest', // study: chin on paw, then a yawn and a stretch
  'watching', // study: turns toward your mouse
  'eating', // (older name, now plays "sipping")
  'sad', // you switched tabs during study
  'play', // break button reactions ↓
  'feed',
  'bathe',
]

// The study actions the cat cycles between while you focus.
export const STUDY_IDLES = ['reading', 'pageTurn', 'writing', 'sipping', 'chinRest', 'watching']
