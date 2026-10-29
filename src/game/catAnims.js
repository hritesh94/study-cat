// ───────── The sprite pack's rules, written down as data ─────────
// From tools/cat-generator/README.md ("How the transitions chain"):
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
