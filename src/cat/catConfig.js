// ─── The cat "contract" ────────────────────────────────────────────────
// The rest of the app only ever says "play the <name> animation".
// Cat.jsx turns that name into a CSS class (e.g. `cat--reading`), and
// cat.css decides what each body part does for that class.
// To swap in different art later (another SVG, a sprite sheet, Lottie...),
// keep accepting these same names and App.jsx won't need to change.
export const CAT_ANIMATIONS = [
  'idle', // break time, waiting for you to play
  'reading', // study idle #1
  'eating', // study idle #2
  'watching', // study idle #3 — follows your mouse
  'sad', // you switched tabs during study
  'play', // break button reactions ↓
  'feed',
  'bathe',
]

// The study-mode idle animations the cat cycles between.
export const STUDY_IDLES = ['reading', 'eating', 'watching']
