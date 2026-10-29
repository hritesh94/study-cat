// The math behind the puppet. You shouldn't need to edit this to add poses.
import { RIG, SPOTS, STAGE } from './poses'

const RAD = Math.PI / 180

export const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v))
// keep an angle between -180 and 180, so blends take the short way round
export const wrap = (deg) => ((((deg + 180) % 360) + 360) % 360) - 180

// Rotate a point around (0, 0). Positive = clockwise on screen.
export const rotate = ([x, y], deg) => {
  const c = Math.cos(deg * RAD)
  const s = Math.sin(deg * RAD)
  return [x * c - y * s, x * s + y * c]
}
const add = (a, b) => [a[0] + b[0], a[1] + b[1]]
// a bone of `len` pointing at `deg` (0 = straight down)
const along = (deg, len) => [-Math.sin(deg * RAD) * len, Math.cos(deg * RAD) * len]
const directionOf = (dx, dy) => Math.atan2(-dx, dy) / RAD

// Two-bone inverse kinematics: given where a limb starts and where its end
// should be, find the world angle of both bones. `bend` picks which way
// the middle joint (elbow/knee) points.
function twoBone(start, target, [l1, l2], bend) {
  const dx = target[0] - start[0]
  const dy = target[1] - start[1]
  const d = clamp(Math.hypot(dx, dy), Math.abs(l1 - l2) + 0.01, l1 + l2 - 0.01)
  const cosA = (l1 * l1 + d * d - l2 * l2) / (2 * l1 * d)
  const upper = directionOf(dx, dy) + bend * (Math.acos(clamp(cosA, -1, 1)) / RAD)
  const joint = add(start, along(upper, l1))
  const lower = directionOf(target[0] - joint[0], target[1] - joint[1])
  return [upper, lower]
}

// Every value the animator blends. Angles blend the short way round.
export const ANGLE_KEYS = new Set([
  'torso', 'head', 'earN', 'earF', 'tail1', 'tail2', 'tail3',
  'armN1', 'armN2', 'armN3', 'armF1', 'armF2', 'armF3',
  'legN1', 'legN2', 'legN3', 'legF1', 'legF2', 'legF3',
])

// Turn a pose (angles + targets + motion) into a flat list of numbers.
export function resolve(pose, ctx) {
  const p = pose.motion ? { ...pose, ...pose.motion(ctx) } : pose
  const root = SPOTS[p.spot]
  const torso = p.torso ?? 0
  const head = p.head ?? 0

  // Forward kinematics: where is a point on the head, in stage coordinates?
  const neck = add(root, rotate(RIG.neck, torso))
  const onHead = (local) => add(neck, rotate(local, torso + head))
  const mug = p.mugAtMouth ? add(onHead(RIG.mouth), [16, 4]) : STAGE.deskMug
  const named = {
    chin: add(onHead(RIG.chin), [-2, 12]),
    mugN: add(mug, [-10, 12]),
    mugF: add(mug, [-16, 2]),
  }
  const at = (target) => (typeof target === 'string' ? named[target] : target)

  const [tail1, tail2, tail3] = p.tail ?? [60, 20, 20]
  const out = {
    spot: p.spot,
    x: root[0],
    y: root[1],
    torso,
    head,
    earN: p.ears?.[0] ?? 0,
    earF: p.ears?.[1] ?? 0,
    tail1,
    tail2,
    tail3,
    faceX: p.face?.[0] ?? 0,
    faceY: p.face?.[1] ?? 0,
    lookX: p.look?.[0] ?? 0,
    lookY: p.look?.[1] ?? 0,
    tailLayer: p.tailInFront ? 'front' : 'back',
    eyes: p.eyes ?? 'open',
    mouth: p.mouth ?? 'smile',
    tailAmp: p.tailAmp ?? 6,
    tailSpeed: p.tailSpeed ?? 1.8,
    mugX: mug[0],
    mugY: mug[1],
    yarnX: p.yarnPos?.[0] ?? STAGE.yarn[0],
    yarnY: p.yarnPos?.[1] ?? STAGE.yarn[1],
    yarnR: p.yarnPos?.[2] ?? 0,
  }
  for (const prop of ['page', 'pencil', 'mugHeld', 'yarn', 'bowl', 'hearts', 'tub', 'bubbles', 'foam', 'tear']) {
    out[prop] = p[prop] ?? 0
  }

  for (const side of ['N', 'F']) {
    const arm = p[`arm${side}`]
    const shoulder = add(root, rotate(RIG[`shoulder${side}`], torso))
    const [a1, a2] = twoBone(shoulder, at(arm.reach), RIG.arm, arm.bend ?? 1)
    out[`arm${side}1`] = wrap(a1 - torso) // upper arm, relative to the torso
    out[`arm${side}2`] = wrap(a2 - a1) // forearm, relative to the upper arm
    out[`arm${side}3`] = wrap((arm.paw ?? 0) - a2) // paw: `paw` is its angle on screen

    const leg = p[`leg${side}`]
    const [l1, l2] = twoBone(add(root, RIG[`hip${side}`]), leg.foot, RIG.leg, leg.bend ?? -1)
    out[`leg${side}1`] = wrap(l1)
    out[`leg${side}2`] = wrap(l2 - l1)
    out[`leg${side}3`] = wrap((leg.paw ?? 0) - l2)
  }
  return out
}

// Blend two resolved poses. e = 0 → a, e = 1 → b.
export function blend(a, b, e, snap) {
  const out = {}
  for (const key in b) {
    const to = b[key]
    const from = a[key]
    if (snap?.has(key) || from === undefined) out[key] = to
    else if (typeof to !== 'number') out[key] = e < 0.5 ? from : to
    else if (ANGLE_KEYS.has(key)) out[key] = from + wrap(to - from) * e
    else out[key] = from + (to - from) * e
  }
  return out
}

export const easeInOut = (p) => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2)
