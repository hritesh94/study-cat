// ───────── The sprite pack's rules, written down as data ─────────
// The chains come from the sprite pack's README (the HD pack keeps "the same
// 22 animations as before"), and were checked frame by frame on all 5 HD
// breeds: each animation's last frame matches the next one's first frame.
// every animation starts in one POSTURE and ends in one. The brain may only
// play an animation if the cat is already in its starting posture, so the cat
// never snaps from one pose to another.
//
//   stand ──sit_down──▶ sit ──read_start──▶ read
//   stand ◀──stand_up── sit ◀──read_end──── read
//                       sit ──sleep_down──▶ sleep ──wake_up──▶ sit
//                       sit ──turn_front──▶ front ──turn_back──▶ sit
// ──────────────────────────────────────────────────────────────────

export const ANIMS = {
  // standing
  idle: { from: 'stand', to: 'stand', loop: true },
  walk: { from: 'stand', to: 'stand', loop: true },
  turn_around: { from: 'stand', to: 'stand', flips: true },
  eat: { from: 'stand', to: 'stand', loop: true },
  play: { from: 'stand', to: 'stand', loop: true },
  jump: { from: 'stand', to: 'stand' },
  // stand ↔ sit
  sit_down: { from: 'stand', to: 'sit' },
  stand_up: { from: 'sit', to: 'stand' },
  // sitting
  sit_idle: { from: 'sit', to: 'sit', loop: true },
  look_at_you: { from: 'sit', to: 'sit' },
  sad: { from: 'sit', to: 'sit', loop: true },
  // facing you
  turn_front: { from: 'sit', to: 'front' },
  sit_front: { from: 'front', to: 'front', loop: true },
  meow: { from: 'front', to: 'front' },
  turn_back: { from: 'front', to: 'sit' },
  // studying
  read_start: { from: 'sit', to: 'read' },
  read: { from: 'read', to: 'read', loop: true },
  page_turn: { from: 'read', to: 'read' },
  read_end: { from: 'read', to: 'sit' },
  // sleeping
  sleep_down: { from: 'sit', to: 'sleep' },
  sleep: { from: 'sleep', to: 'sleep', loop: true },
  wake_up: { from: 'sleep', to: 'sit' },
}

// These three have no transition art in the pack: their first and last
// frames are already head-in-bowl / crouched at the yarn / slumped, so a
// straight cut into or out of them visibly jumps (measured: 19–41 % of the
// cat's outline changes in one frame, vs ~3.5 % for a normal frame). The
// brain softens those joins with a short crossfade instead.
export const SOFT_JOIN = new Set(['eat', 'play', 'sad'])

// Phaser animation keys are "<breed>:<name>", e.g. "tuxedo:walk".
export const animKey = (breed, name) => `${breed}:${name}`
export const baseName = (key) => key.slice(key.indexOf(':') + 1)

// What the cat does while it's simply "in" a posture.
export const RESTING = { stand: 'idle', sit: 'sit_idle', front: 'sit_front', read: 'read', sleep: 'sleep' }

// The only ways to change posture.
const EDGES = Object.entries(ANIMS)
  .filter(([, a]) => a.from !== a.to)
  .map(([name, a]) => ({ name, from: a.from, to: a.to }))

// Shortest chain of animations from one posture to another (breadth-first search).
// e.g. path('read', 'stand') → ['read_end', 'stand_up']
export function path(from, to) {
  if (from === to) return []
  const seen = new Set([from])
  const queue = [[from, []]]
  while (queue.length) {
    const [posture, steps] = queue.shift()
    for (const edge of EDGES) {
      if (edge.from !== posture || seen.has(edge.to)) continue
      const next = [...steps, edge.name]
      if (edge.to === to) return next
      seen.add(edge.to)
      queue.push([edge.to, next])
    }
  }
  throw new Error(`No chain from ${from} to ${to}`)
}
