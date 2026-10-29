// ─────────────────────────── Pose library ───────────────────────────
// Everything about HOW the cat moves lives in this one file.
//
//  RIG      where each joint sits on its parent part, and bone lengths
//  SPOTS    where the cat's hips are for each place it can sit
//  STAGE    where things on the desk / floor are (stage is 800 × 520)
//  POSES    one still pose = a set of joint angles (in degrees)
//  ACTIONS  an action = a list of poses to move through, in order
//
// Angles: 0 = the limb hangs straight down. Negative swings it forward
// (toward the desk, the cat faces right), positive swings it back.
// For torso/head, positive leans forward / looks down.
//
// Legs and arms can also be given a TARGET instead of angles
// (`reach: [x, y]` for a front paw, `foot: [x, y]` for a back paw).
// rig.js turns those targets into joint angles for you (that's called
// inverse kinematics), so poses stay easy to write.
//
// To add a new action: write its poses below, add an entry to ACTIONS,
// and put its name in catConfig.js.
// ─────────────────────────────────────────────────────────────────────

export const RIG = {
  // on the torso (origin = hips)
  neck: [8, -102],
  shoulderN: [22, -80], // N = near side (closer to you), F = far side
  shoulderF: [2, -84],
  // on the hips
  hipN: [14, -12],
  hipF: [-2, -16],
  tailBase: [-38, -8],
  // on the head (origin = neck)
  earN: [24, -84],
  earF: [-16, -78],
  eyeN: [34, -46],
  eyeF: [4, -48],
  mouth: [56, -20],
  chin: [46, -6],
  // bone lengths
  arm: [50, 46], // upper arm, forearm
  leg: [36, 34], // thigh, shin
  tail: [30, 28, 26],
}

export const SPOTS = {
  stool: [330, 318],
  floor: [270, 490],
  tub: [270, 500],
}

export const STAGE = {
  spine: 426, // the book's spine (x)
  deskMug: [494, 244],
  deskPencil: [440, 268],
  yarn: [372, 486],
}

// Shared pieces, so poses only list what's different.
const DESK_PAWS = { armN: { reach: [402, 257] }, armF: { reach: [388, 255] } }
const STOOL_LEGS = { legN: { foot: [376, 352] }, legF: { foot: [366, 348] } }
const FLOOR_LEGS = { legN: { foot: [308, 498] }, legF: { foot: [294, 496] } }

// 0 → 1 slowly, then snaps back: like eyes reading a line, then jumping to the next.
const sweep = (t, period) => {
  const p = (t % period) / period
  return p < 0.85 ? p / 0.85 : (1 - p) / 0.15
}
const clamp1 = (v) => Math.max(-1, Math.min(1, v))

const readStill = {
  spot: 'stool',
  torso: 8,
  head: 14,
  ...DESK_PAWS,
  ...STOOL_LEGS,
  tail: [40, 25, 30],
  look: [0.4, 0.8],
}

const reachPage = {
  ...readStill,
  torso: 22,
  head: 10,
  armN: { reach: [466, 250], paw: -10 },
  look: [1, 0.6],
}

const sipReach = {
  ...readStill,
  torso: 28,
  head: 6,
  armN: { reach: [486, 252] },
  armF: { reach: [478, 248] },
  look: [1, 0.5],
}

const sipLift = {
  ...readStill,
  torso: 2,
  head: -8,
  mugHeld: 1,
  mugAtMouth: true,
  armN: { reach: 'mugN', paw: -60 },
  armF: { reach: 'mugF', paw: -60 },
  eyes: 'happy',
}

const sitFloor = {
  spot: 'floor',
  torso: 0,
  head: -6,
  armN: { reach: [312, 497] },
  armF: { reach: [300, 495] },
  ...FLOOR_LEGS,
  tail: [95, 30, 35],
  look: [0.3, 0],
}

export const POSES = {
  // ── study, at the desk ──
  readStill,
  read: {
    ...readStill,
    // a pose can have a `motion` function for small living loops
    motion: ({ t }) => {
      const s = sweep(t, 3.4)
      return { head: 11 + s * 7, look: [-0.6 + s * 1.4, 0.8] }
    },
  },

  reachPage,
  grabPage: { ...reachPage, armN: { reach: [466, 255], paw: -10 } },
  flipMid: { ...reachPage, torso: 16, head: 6, armN: { reach: [430, 220], paw: -50 }, page: 0.5, look: [0, 0] },
  flipEnd: { ...reachPage, torso: 12, head: 12, armN: { reach: [388, 252], paw: 0 }, page: 1, look: [-0.5, 0.8] },

  pickPencil: { ...readStill, torso: 16, head: 20, armN: { reach: [436, 264], paw: -10 }, look: [0.6, 1] },
  write: {
    ...readStill,
    torso: 12,
    head: 18,
    pencil: 1,
    motion: ({ t }) => {
      const line = (t * 0.5) % 1 // write across the line, then start the next
      return {
        armN: { reach: [394 + line * 26 + Math.sin(t * 9) * 3, 254 + Math.sin(t * 15) * 1.5], paw: -25 },
        look: [-0.6 + line * 1.2, 1],
      }
    },
  },
  think: {
    ...readStill,
    torso: 4,
    head: -8,
    pencil: 1,
    armN: { reach: 'chin', paw: -70 },
    look: [0.6, -0.9],
    motion: ({ t }) => ({ head: -8 + Math.sin(t * 2) * 3 }),
  },

  sipReach,
  sipLift,
  sipSip: { ...sipLift, head: -16, torso: -2 },
  sipPutDown: { ...sipReach, mugHeld: 1 },

  chin: {
    ...readStill,
    torso: 20,
    head: 6,
    eyes: 'half',
    armN: { reach: 'chin', paw: -80 },
    tail: [50, 20, 20],
    look: [0.5, 0.3],
    motion: ({ t }) => ({ head: 6 + Math.sin(t * 0.9) * 2 }),
  },
  yawn: {
    ...readStill,
    torso: 2,
    head: -20,
    ears: [-14, -14],
    eyes: 'closed',
    mouth: 'yawn',
  },
  stretch: {
    ...readStill,
    torso: 30,
    head: -4,
    eyes: 'happy',
    armN: { reach: [500, 236], paw: -10 },
    armF: { reach: [488, 232], paw: -10 },
    tail: [120, 15, 10],
    ears: [-8, -8],
  },

  watch: {
    ...readStill,
    // turn toward the mouse: lean, tilt the head, slide the face, move the eyes
    motion: ({ mouse }) => {
      const lx = clamp1((mouse[0] - 372) / 260)
      const ly = clamp1((mouse[1] - 170) / 200)
      return { torso: 2 + lx * 4, head: -2 + ly * 14, face: [lx * 9, ly * 4], look: [lx, ly] }
    },
  },

  sad: {
    ...readStill,
    torso: 24,
    head: 28,
    ears: [-45, -45],
    eyes: 'sad',
    mouth: 'frown',
    armN: { reach: [370, 310] },
    armF: { reach: [360, 306] },
    // tail drops below the body and curls forward around the dangling feet
    tail: [-10, -70, -20],
    tailInFront: true,
    tailAmp: 1.5,
    tailSpeed: 0.8,
    tear: 1,
    look: [0, 0.6],
  },

  // ── break, on the rug ──
  sitFloor: {
    ...sitFloor,
    motion: ({ t }) => ({ torso: Math.sin(t * 1.2) * 2.5, head: -6 + Math.sin(t * 1.2 + 1) * 3 }),
  },

  play: {
    ...sitFloor,
    torso: 26,
    head: 4,
    ears: [6, 6],
    mouth: 'open',
    yarn: 1,
    tail: [140, 20, 15],
    tailAmp: 14,
    tailSpeed: 6,
    motion: ({ t }) => {
      const x = STAGE.yarn[0] + Math.sin(t * 4.5) * 12
      const y = STAGE.yarn[1] - Math.abs(Math.sin(t * 9)) * 5
      const bat = Math.sin(t * 9) // paws take turns
      return {
        yarnPos: [x, y, t * 240],
        armN: { reach: [x - 12, y - 8 - 24 * Math.max(0, bat)], paw: -15 },
        armF: { reach: [x - 22, y - 6 - 24 * Math.max(0, -bat)], paw: -15 },
        look: [1, 1],
      }
    },
  },

  feed: {
    ...sitFloor,
    torso: 40,
    head: 38,
    eyes: 'happy',
    mouth: 'chew',
    bowl: 1,
    hearts: 1,
    armN: { reach: [324, 498] },
    armF: { reach: [312, 496] },
    tail: [100, 30, 30],
    tailAmp: 16,
    tailSpeed: 4,
    motion: ({ t }) => ({ head: 38 + Math.sin(t * 10) * 3 }),
  },

  bathe: {
    ...sitFloor,
    spot: 'tub',
    torso: 4,
    head: -4,
    ears: [-22, -22],
    eyes: 'squeeze',
    mouth: 'open',
    tub: 1,
    bubbles: 1,
    foam: 1,
    armN: { reach: [340, 470] },
    armF: { reach: [328, 468] },
    legN: { foot: [310, 506] },
    legF: { foot: [296, 504] },
    tail: [100, 20, 20],
    tailAmp: 10,
    tailSpeed: 7,
    // a big shake that settles down
    motion: ({ at }) => {
      const k = Math.max(0, 1 - at / 2.6)
      return { torso: 4 + Math.sin(at * 28) * 7 * k, head: -4 + Math.sin(at * 28 + 1) * 10 * k }
    },
  },
}

// Each step: move to `pose` over `dur` seconds (eased), then stay for `hold`.
// `snap` lists values that jump instantly instead of blending.
// Steps loop forever; `loopFrom` skips intro steps on later loops.
const FOREVER = Infinity

export const ACTIONS = {
  idle: { steps: [{ pose: 'sitFloor', hold: FOREVER }] },
  reading: { steps: [{ pose: 'read', hold: FOREVER }] },
  pageTurn: {
    steps: [
      { pose: 'read', hold: 2.5 },
      { pose: 'reachPage', dur: 0.7, hold: 0.15 },
      { pose: 'grabPage', dur: 0.2 },
      { pose: 'flipMid', dur: 0.45 },
      { pose: 'flipEnd', dur: 0.45, hold: 0.3 },
      { pose: 'read', dur: 0.6, snap: ['page'], hold: 0 },
    ],
  },
  writing: {
    steps: [
      { pose: 'pickPencil', dur: 0.7, hold: 0.15 },
      { pose: 'write', dur: 0.5, snap: ['pencil'], hold: 5 },
      { pose: 'think', dur: 0.6, hold: 1.4 },
    ],
    loopFrom: 1,
  },
  sipping: {
    steps: [
      { pose: 'sipReach', dur: 0.8, hold: 0.2 },
      { pose: 'sipLift', dur: 0.8, snap: ['mugHeld'] },
      { pose: 'sipSip', dur: 0.5, hold: 1.4 },
      { pose: 'sipLift', dur: 0.4 },
      { pose: 'sipPutDown', dur: 0.8 },
      { pose: 'readStill', dur: 0.7, snap: ['mugHeld'], hold: 2.5 },
    ],
  },
  chinRest: {
    steps: [
      { pose: 'chin', dur: 0.8, hold: 3.5 },
      { pose: 'yawn', dur: 0.6, hold: 1.3 },
      { pose: 'stretch', dur: 0.9, hold: 1.2 },
      { pose: 'readStill', dur: 0.9, hold: 2 },
    ],
  },
  watching: { steps: [{ pose: 'watch', hold: FOREVER }] },
  sad: { steps: [{ pose: 'sad', dur: 0.8, hold: FOREVER }] },
  play: { steps: [{ pose: 'play', dur: 0.4, hold: FOREVER }] },
  feed: { steps: [{ pose: 'feed', dur: 0.6, hold: FOREVER }] },
  bathe: { steps: [{ pose: 'bathe', dur: 0.5, hold: FOREVER }] },
}

// Older animation names → current actions.
export const ALIASES = { eating: 'sipping' }
