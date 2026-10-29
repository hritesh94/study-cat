import { useEffect, useRef } from 'react'
import { ACTIONS, ALIASES, POSES, RIG, STAGE } from './poses'
import { blend, clamp, easeInOut, resolve, rotate } from './rig'

// Moving between the stool and the floor is a hop, not a slide.
const onGround = (spot) => spot !== 'stool'
const HOP_TIME = 0.9
const HOP_HEIGHT = 80
const DEFAULT_DUR = 0.7

// The animator. Every frame (~60 per second) it:
//  1. works out the target pose for the current step of the action,
//  2. blends from where the cat was toward it (smooth easing),
//  3. adds "idle life" on top (breathing, blinking, ear twitches, tail swish),
//  4. writes the result straight onto the SVG parts (no React re-render).
function createPuppet(svg) {
  const parts = {}
  svg.querySelectorAll('[data-part]').forEach((el) => {
    parts[el.dataset.part] = el
  })

  // mouse position, in stage coordinates (0–800 × 0–520)
  const mouse = [600, 150]
  const onMove = (e) => {
    const box = svg.getBoundingClientRect()
    mouse[0] = ((e.clientX - box.left) / box.width) * 800
    mouse[1] = ((e.clientY - box.top) / box.height) * 520
  }
  window.addEventListener('pointermove', onMove)

  let name = null
  let action = ACTIONS.idle
  let stepIndex = 0
  let restart = true
  let actionStart = 0
  let stepStart = 0
  let from = null // where the cat was when this step began
  let current = null // where the cat is now (before idle life)
  let snap = null
  let hop = false
  let checkHop = false

  const life = { last: null, tailPhase: 0, blinkAt: 2, blinkUntil: 0, twitchAt: 5, twitchStart: -9, twitchEar: 'N' }
  const shown = {} // last data-* values written, to avoid needless DOM writes

  function beginStep(t) {
    stepStart = t
    from = current
    snap = new Set(action.steps[stepIndex].snap ?? [])
    checkHop = true
  }

  function play(next) {
    const key = ALIASES[next] ?? next
    if (key === name) return
    name = key
    // a single pose name also works (handy for designing poses)
    action = ACTIONS[key] ?? (POSES[key] ? { steps: [{ pose: key, hold: Infinity }] } : ACTIONS.idle)
    stepIndex = 0
    restart = true
  }

  function frame(ms) {
    const t = ms / 1000
    const dt = life.last === null ? 0 : Math.min(0.1, t - life.last)
    life.last = t
    if (restart) {
      actionStart = t
      beginStep(t)
      restart = false
    }

    const step = action.steps[stepIndex]
    const target = resolve(POSES[step.pose], { t, at: t - actionStart, mouse })
    if (checkHop) {
      hop = !!from && onGround(from.spot) !== onGround(target.spot)
      checkHop = false
    }
    const dur = hop ? Math.max(step.dur ?? DEFAULT_DUR, HOP_TIME) : (step.dur ?? DEFAULT_DUR)
    const p = clamp((t - stepStart) / dur, 0, 1)
    current = from ? blend(from, target, easeInOut(p), snap) : target
    if (hop && p < 1) current.y -= HOP_HEIGHT * Math.sin(Math.PI * p)

    if (t - stepStart >= dur + (step.hold ?? 0)) {
      stepIndex = stepIndex + 1 < action.steps.length ? stepIndex + 1 : (action.loopFrom ?? 0)
      beginStep(t)
    }

    life.tailPhase += dt * current.tailSpeed
    render(addLife(current, t))
    raf = requestAnimationFrame(frame)
  }

  function addLife(c, t) {
    const r = { ...c }
    // slow breathing (slower when sad)
    r.breath = Math.sin(t * (c.tear > 0.5 ? 1.1 : 1.8))
    r.torso += r.breath * 0.7
    // blink every few seconds
    if (t > life.blinkAt) {
      life.blinkUntil = t + 0.14
      life.blinkAt = t + 2.5 + Math.random() * 3
    }
    r.blink = t < life.blinkUntil ? 0.1 : 1
    // an ear flicks now and then
    if (t > life.twitchAt) {
      life.twitchEar = Math.random() < 0.5 ? 'N' : 'F'
      life.twitchStart = t
      life.twitchAt = t + 4 + Math.random() * 5
    }
    const tw = (t - life.twitchStart) / 0.35
    if (tw >= 0 && tw < 1) r[`ear${life.twitchEar}`] -= 16 * Math.sin(tw * Math.PI)
    // tail swish: a wave that travels down the three segments
    for (let i = 1; i <= 3; i++) {
      r[`tail${i}`] += Math.sin(life.tailPhase - i * 0.7) * c.tailAmp * (0.5 + i * 0.35)
    }
    return r
  }

  const setT = (key, value) => parts[key]?.setAttribute('transform', value)
  const setO = (key, value) => {
    const el = parts[key]
    if (el) el.style.opacity = value.toFixed(3)
  }
  const setData = (key, value) => {
    if (shown[key] === value) return
    shown[key] = value
    parts.head?.setAttribute(`data-${key}`, value)
  }
  const blinkAt = ([x, y], s) => `translate(${x} ${y}) scale(1 ${s}) translate(${-x} ${-y})`

  function render(r) {
    setT('root', `translate(${r.x} ${r.y})`)
    setT('torso', `rotate(${r.torso})`)
    setT('body', `scale(${1 + r.breath * 0.006} ${1 + r.breath * 0.012})`)
    setT('head', `translate(${RIG.neck}) rotate(${r.head})`)
    setT('earN', `translate(${RIG.earN}) rotate(${r.earN})`)
    setT('earF', `translate(${RIG.earF}) rotate(${r.earF})`)
    setT('face', `translate(${r.faceX} ${r.faceY})`)
    setT('pupilN', `translate(${r.lookX * 3} ${r.lookY * 2.5})`)
    setT('pupilF', `translate(${r.lookX * 2.4} ${r.lookY * 2.2})`)
    setT('eyeN', blinkAt(RIG.eyeN, r.blink))
    setT('eyeF', blinkAt(RIG.eyeF, r.blink))
    setData('eyes', r.eyes)
    setData('mouth', r.mouth)
    // the tail normally hides behind the body; some poses bring it in front of the legs
    if (shown.tailLayer !== r.tailLayer) {
      shown.tailLayer = r.tailLayer
      const anchor = r.tailLayer === 'front' ? parts.legN1 : parts.root.firstChild
      parts.root.insertBefore(parts.tail1, anchor)
    }

    for (const side of ['N', 'F']) {
      // arms hang from the torso, so they turn with it
      const shoulder = rotate(RIG[`shoulder${side}`], r.torso)
      setT(`arm${side}1`, `translate(${shoulder}) rotate(${r.torso + r[`arm${side}1`]})`)
      setT(`arm${side}2`, `translate(0 ${RIG.arm[0]}) rotate(${r[`arm${side}2`]})`)
      setT(`arm${side}3`, `translate(0 ${RIG.arm[1]}) rotate(${r[`arm${side}3`]})`)
      setT(`leg${side}1`, `translate(${RIG[`hip${side}`]}) rotate(${r[`leg${side}1`]})`)
      setT(`leg${side}2`, `translate(0 ${RIG.leg[0]}) rotate(${r[`leg${side}2`]})`)
      setT(`leg${side}3`, `translate(0 ${RIG.leg[1]}) rotate(${r[`leg${side}3`]})`)
    }
    setT('tail1', `translate(${RIG.tailBase}) rotate(${r.tail1})`)
    setT('tail2', `translate(0 ${RIG.tail[0]}) rotate(${r.tail2})`)
    setT('tail3', `translate(0 ${RIG.tail[1]}) rotate(${r.tail3})`)

    // props
    setO('pencil', r.pencil)
    setO('deskPencil', 1 - r.pencil)
    setO('heldMug', r.mugHeld)
    setO('deskMug', 1 - r.mugHeld)
    setT('heldMug', `translate(${r.mugX - r.x} ${r.mugY - r.y})`)
    const lift = -Math.sin(r.page * Math.PI) * 14
    setT('pageFlip', `translate(${STAGE.spine} ${lift}) scale(${1 - 2 * r.page} 1) translate(${-STAGE.spine} 0)`)
    setO('pageFlip', r.page > 0.01 && r.page < 0.99 ? 1 : 0)
    setT('yarn', `translate(${r.yarnX} ${r.yarnY}) rotate(${r.yarnR})`)
    setO('yarn', r.yarn)
    setO('bowl', r.bowl)
    setO('hearts', r.hearts)
    setO('tubBack', r.tub)
    setO('tubFront', r.tub)
    setO('bubbles', r.bubbles)
    setO('foam', r.foam)
    setO('tear', r.tear)
  }

  let raf = requestAnimationFrame(frame)
  return {
    play,
    stop() {
      cancelAnimationFrame(raf)
      window.removeEventListener('pointermove', onMove)
    },
  }
}

// React glue: start the puppet once, then tell it whenever `animation` changes.
export function usePuppet(svgRef, animation) {
  const puppet = useRef(null)

  useEffect(() => {
    const p = createPuppet(svgRef.current)
    puppet.current = p
    // Handy while developing: try any action from the browser console,
    // e.g.  studyCat.play('pageTurn')
    if (import.meta.env.DEV) window.studyCat = p
    return () => p.stop()
  }, [svgRef])

  useEffect(() => {
    puppet.current?.play(animation)
  }, [animation])
}
