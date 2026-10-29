// ─── The cat "contract" ────────────────────────────────────────────────
// The rest of the app only ever says "play the <name> animation".
// It doesn't care whether the cat is the placeholder or a real 3D model.
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

// ─── Swapping in a real model later ───────────────────────────────────
// 1. Put your file at  public/models/cat.glb
// 2. Set modelUrl to '/models/cat.glb'
// 3. Fill in clipNames: app animation name → the clip name inside your .glb
//    (open the file at https://gltf-viewer.donmccurdy.com to see clip names).
//    Any animation without a matching clip just keeps the previous one playing.
export const CAT_CONFIG = {
  modelUrl: null,
  scale: 1,
  position: [0, 0, 0],
  clipNames: {
    idle: 'Idle',
    reading: 'Reading',
    eating: 'Eating',
    watching: 'Idle',
    sad: 'Sad',
    play: 'Jump',
    feed: 'Eating',
    bathe: 'Shake',
  },
}
