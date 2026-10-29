// ───────────────────────── The cat's voice ─────────────────────────
// "Cat babble": while a line types into the speech bubble, every letter
// makes a tiny, high, soft blip (like the villagers in Animal Crossing).
// Everything is made live with the Web Audio API, no sound files needed.
//
// If public/voice/<line-id>.mp3 exists, that recording plays instead.
// Meows (clicks and greetings) are short WAV files in public/sounds/.
// ────────────────────────────────────────────────────────────────────
import voiceFiles from 'virtual:voice-files'

// How each mood sounds. pitch = Hz of the blips, step = ms per letter,
// blip = how long one blip rings (s), bounce = how much the pitch hops up
// and down along the line, slide = pitch change from start to end of a line.
const MOODS = {
  happy: { pitch: 640, step: 52, blip: 0.06, jitter: 0.1, bounce: 0.16, slide: 0.08, wave: 'triangle', bright: 2600 },
  neutral: { pitch: 540, step: 58, blip: 0.065, jitter: 0.08, bounce: 0.06, slide: 0, wave: 'triangle', bright: 2200 },
  sad: { pitch: 400, step: 84, blip: 0.11, jitter: 0.05, bounce: 0.03, slide: -0.18, wave: 'sine', bright: 1500 },
  annoyed: { pitch: 500, step: 42, blip: 0.035, jitter: 0.07, bounce: 0.04, slide: -0.05, wave: 'square', bright: 1800 },
}

// Each vowel "colours" the blip a little differently, so words sound like words.
const VOWEL = { a: 1.0, e: 1.12, i: 1.25, o: 0.9, u: 0.82, y: 1.18 }

const MEOWS = ['meow-1', 'meow-2', 'mrrp', 'mew']
const VOICE_FILES = new Set(voiceFiles)

let ctx = null
let master = null
let volume = 0.7
let muted = false
const meowBuffers = {}

function audio() {
  if (ctx) return ctx
  const AudioCtx = window.AudioContext ?? window.webkitAudioContext
  if (!AudioCtx) return null
  ctx = new AudioCtx()
  master = ctx.createGain()
  master.gain.value = muted ? 0 : volume
  master.connect(ctx.destination)
  return ctx
}

export const canMakeSound = () => typeof window !== 'undefined' && !!(window.AudioContext ?? window.webkitAudioContext)

// Browsers only allow sound after the user has clicked or tapped something,
// so the app calls this on the first pointer/key press.
export function unlockAudio() {
  const c = audio()
  if (c && c.state === 'suspended') c.resume().catch(() => {})
  loadMeows()
}

function applyGain() {
  if (master && ctx) master.gain.setTargetAtTime(muted ? 0 : volume, ctx.currentTime, 0.02)
}
export function setVolume(v) {
  volume = Math.min(1, Math.max(0, v))
  applyGain()
}
export function setMuted(m) {
  muted = m
  applyGain()
}

// One soft blip at `time` (AudioContext seconds).
function blip(time, freq, m, colour) {
  const osc = ctx.createOscillator()
  const filter = ctx.createBiquadFilter()
  const gain = ctx.createGain()
  osc.type = m.wave
  // a quick little "boop": the pitch starts a bit high and settles
  osc.frequency.setValueAtTime(freq * 1.12, time)
  osc.frequency.exponentialRampToValueAtTime(freq, time + m.blip * 0.5)
  filter.type = 'lowpass'
  filter.frequency.value = m.bright * colour
  filter.Q.value = 2
  const peak = m.wave === 'square' ? 0.07 : 0.16 // squares are louder, so softer
  gain.gain.setValueAtTime(0.0001, time)
  gain.gain.exponentialRampToValueAtTime(peak, time + 0.006)
  gain.gain.exponentialRampToValueAtTime(0.0001, time + m.blip)
  osc.connect(filter).connect(gain).connect(master)
  osc.start(time)
  osc.stop(time + m.blip + 0.02)
}

// How long to wait after a character before the next one (ms).
function pauseAfter(ch, step) {
  if (ch === ' ') return step * 1.4
  if (',;:'.includes(ch)) return step * 4
  if ('.!?…'.includes(ch)) return step * 6
  return step
}

let current = null // the line playing right now: { stop() }

export function stopTalking() {
  current?.stop()
  current = null
}

// Say a line: type it with onType(count) and make the sound.
// line = { id, text, mood }; silent = just type (e.g. when a meow plays).
// Returns a promise that resolves when typing ends.
export function speak(line, onType, { silent = false } = {}) {
  stopTalking()
  const m = MOODS[line.mood] ?? MOODS.neutral
  const text = line.text
  const c = audio()
  const recording = line.id && VOICE_FILES.has(line.id) ? new Audio(`/voice/${line.id}.mp3`) : null

  let timer = null
  let stopped = false
  let finish
  const done = new Promise((resolve) => (finish = resolve))
  const stop = () => {
    stopped = true
    clearTimeout(timer)
    recording?.pause()
    finish()
  }
  current = { stop }

  if (recording) {
    // the recording does the talking; type along with it
    recording.volume = muted ? 0 : volume
    const playing = recording.play().catch(() => {})
    let start = performance.now()
    const typeAlong = () => {
      if (stopped) return
      const length = Number.isFinite(recording.duration) && recording.duration > 0 ? recording.duration * 1000 : text.length * 55
      const count = Math.min(text.length, Math.ceil(((performance.now() - start) / length) * text.length))
      onType(count)
      if (count >= text.length) return finish()
      timer = setTimeout(typeAlong, 30)
    }
    playing.then(() => {
      start = performance.now()
      typeAlong()
    })
    return done
  }

  // babble: one blip per letter, quieter blips skipped on long words
  const total = text.length
  let i = 0
  const next = () => {
    if (stopped) return
    const ch = text[i]
    i += 1
    onType(i)
    if (!silent && c && c.state === 'running' && !muted && volume > 0 && /\p{L}|\d/u.test(ch)) {
      const along = i / total
      const hop = Math.sin(i * 1.7) * m.bounce
      const wobble = (Math.random() * 2 - 1) * m.jitter
      // questions go up at the end
      const lift = text.trimEnd().endsWith('?') && along > 0.75 ? 0.18 : 0
      const freq = m.pitch * (1 + m.slide * along + hop + wobble + lift) * (VOWEL[ch.toLowerCase()] ?? 1)
      blip(c.currentTime + 0.005, freq, m, VOWEL[ch.toLowerCase()] ? 1.2 : 0.9)
    }
    if (i >= total) return finish()
    timer = setTimeout(next, pauseAfter(ch, m.step) * (0.9 + Math.random() * 0.2))
  }
  next()
  return done
}

// ── meows ──
let meowsLoading = null
function loadMeows() {
  if (meowsLoading || !ctx) return
  meowsLoading = Promise.all(
    MEOWS.map((name) =>
      fetch(`/sounds/${name}.wav`)
        .then((r) => (r.ok ? r.arrayBuffer() : Promise.reject(new Error(r.statusText))))
        .then((data) => ctx.decodeAudioData(data))
        .then((buffer) => (meowBuffers[name] = buffer))
        .catch(() => {}),
    ),
  )
}

// A short meow. `kind` picks one ('mrrp', 'mew', …); otherwise a random one.
export function meow(kind) {
  const c = audio()
  if (!c || c.state !== 'running' || muted) return
  const names = Object.keys(meowBuffers)
  if (!names.length) return void meowsLoading?.then(() => Object.keys(meowBuffers).length && meow(kind)) // still loading
  const name = meowBuffers[kind] ? kind : names[Math.floor(Math.random() * names.length)]
  if (!name) return
  const source = c.createBufferSource()
  source.buffer = meowBuffers[name]
  source.playbackRate.value = 0.94 + Math.random() * 0.12 // never quite the same meow twice
  source.connect(master)
  source.start()
}
