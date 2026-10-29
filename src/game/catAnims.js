// ───────── The sprite pack's rules, written down as data ─────────
// The chains come from the sprite pack's README (version 2: 32 animations),
// and were checked frame by frame on all 5 HD breeds: each animation's last
// frame matches the next one's first frame. Every animation starts in one
// POSTURE and ends in one. The brain may only play an animation if the cat
// is already in its starting posture, so the cat never snaps from one pose
// to another.
//
//   stand ──sit_down──▶ sit ──read_start──▶ read
//   stand ◀──stand_up── sit ◀──read_end──── read
//                       sit ──sleep_down──▶ sleep ──wake_up──▶ sit
//                       sit ──turn_front──▶ front ──turn_back──▶ sit
//                       sit ──sad_start───▶ sad   ──sad_end──▶ sit
//   stand ──eat_start──▶ eat  ──eat_end──▶ stand
//   stand ──play_start─▶ play ──play_end─▶ stand
//
// The bath: jump (cut off while still in the air) ─▶ air ──bath_in──▶ tub
//           tub ──bath_out──▶ crouch ──jump──▶ stand
// ──────────────────────────────────────────────────────────────────

export const ANIMS = {
  // standing
  idle: { from: 'stand', to: 'stand', loop: true },
  walk: { from: 'stand', to: 'stand', loop: true },
  turn_around: { from: 'stand', to: 'stand', flips: true },
  jump: { from: ['stand', 'crouch'], to: 'stand' }, // crouch: getting out of the tub
  // stand ↔ sit
  sit_down: { from: 'stand', to: 'sit' },
  stand_up: { from: 'sit', to: 'stand' },
  // sitting
  sit_idle: { from: 'sit', to: 'sit', loop: true },
  look_at_you: { from: 'sit', to: 'sit' },
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
  // eating (the bowl is drawn in all three)
  eat_start: { from: 'stand', to: 'eat' },
  eat: { from: 'eat', to: 'eat', loop: true },
  eat_end: { from: 'eat', to: 'stand' },
  // playing (the yarn is drawn in all three)
  play_start: { from: 'stand', to: 'play' },
  play: { from: 'play', to: 'play', loop: true },
  play_end: { from: 'play', to: 'stand' },
  // sad
  sad_start: { from: 'sit', to: 'sad' },
  sad: { from: 'sad', to: 'sad', loop: true },
  sad_end: { from: 'sad', to: 'sit' },
  // the bath (the tub is drawn in all four)
  bath_in: { from: 'air', to: 'tub' },
  bath: { from: 'tub', to: 'tub', loop: true },
  bath_shake: { from: 'tub', to: 'tub' },
  bath_out: { from: 'tub', to: 'crouch' },
}

// Props that are drawn inside some animations. While one of these plays,
// the room hides its own copy (it's in exactly the same place in the frames).
export const PROP_ANIMS = {
  bowl: ['eat_start', 'eat', 'eat_end'],
  yarn: ['play_start', 'play', 'play_end'],
  tub: ['bath_in', 'bath', 'bath_shake', 'bath_out'],
}

// The jump's frames: crouch, leap, tuck, landing, crouch, stand. Jumping INTO
// the tub stops after the tuck (still in the air), and bath_in does the landing.
export const JUMP_AIR_FRAME = 2

// Phaser animation keys are "<breed>:<name>", e.g. "tuxedo:walk".
export const animKey = (breed, name) => `${breed}:${name}`
export const baseName = (key) => key.slice(key.indexOf(':') + 1)

// the postures an animation may start from (most have one, jump has two)
export const startsFrom = (name) => [].concat(ANIMS[name].from)

// What the cat does while it's simply "in" a posture. 'air' and 'crouch'
// have none: they only last until the next animation starts.
export const RESTING = { stand: 'idle', sit: 'sit_idle', front: 'sit_front', read: 'read', sleep: 'sleep', eat: 'eat', play: 'play', sad: 'sad', tub: 'bath' }

// The only ways to change posture.
const EDGES = Object.entries(ANIMS).flatMap(([name, a]) =>
  [].concat(a.from).filter((from) => from !== a.to).map((from) => ({ name, from, to: a.to })),
)

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
