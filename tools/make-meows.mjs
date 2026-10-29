// Makes the cat's meow sounds: public/sounds/*.wav  (npm run meows)
//
// Nothing is recorded or downloaded: each meow is built from sine waves
// (additive synthesis). A meow is a voice whose pitch rises then falls,
// while the "mouth" opens from "m/i" to "a" and closes to "ow". We fake the
// mouth with formants (the bands of frequencies a vowel makes louder).
// These files are our own work, released as CC0 (see CREDITS.md).
import fs from 'node:fs'

const RATE = 22050

// [time 0..1, value] points → smooth value at t
function curve(points, t) {
  for (let i = 1; i < points.length; i++) {
    const [t1, v1] = points[i]
    const [t0, v0] = points[i - 1]
    if (t <= t1) {
      const k = (t - t0) / (t1 - t0)
      const s = k * k * (3 - 2 * k)
      return v0 + (v1 - v0) * s
    }
  }
  return points.at(-1)[1]
}

// vowel formants (Hz), a cat-sized mouth is small so they sit high
const VOWELS = {
  m: [500, 1600, 3600],
  i: [700, 2900, 4200],
  a: [1100, 2000, 3800],
  o: [800, 1300, 3400],
  u: [600, 1100, 3300],
}

function meow({ length, pitch, mouth, loud, trill = 0, seed = 1 }) {
  const n = Math.floor(length * RATE)
  const out = new Float32Array(n)
  const phases = new Float64Array(40)
  let rnd = seed
  const noise = () => ((rnd = (rnd * 16807) % 2147483647) / 2147483647) * 2 - 1
  for (let i = 0; i < n; i++) {
    const t = i / n
    const vib = 1 + 0.012 * Math.sin((2 * Math.PI * 6 * i) / RATE) // a little vibrato
    const f0 = curve(pitch, t) * vib
    // blend between the vowels the mouth is moving through
    const at = curve(mouth.map(([tt], k) => [tt, k]), t)
    const k0 = Math.floor(at)
    const k1 = Math.min(mouth.length - 1, k0 + 1)
    const mix = at - k0
    const formants = VOWELS[mouth[k0][1]].map((f, j) => f + (VOWELS[mouth[k1][1]][j] - f) * mix)
    let sample = 0
    for (let h = 1; h <= phases.length; h++) {
      const f = f0 * h
      if (f > RATE / 2 - 500) break
      // how loud this harmonic is = how close it is to a formant
      let amp = 0
      formants.forEach((F, j) => {
        const width = 120 + F * 0.12
        amp += Math.exp(-(((f - F) / width) ** 2)) * [1, 0.6, 0.25][j]
      })
      amp += 0.15 / h // the voice's own buzz
      phases[h - 1] += (2 * Math.PI * f) / RATE
      sample += Math.sin(phases[h - 1]) * amp
    }
    sample += noise() * 0.04 // a breath of air
    const env = curve(loud, t) * (trill ? 0.6 + 0.4 * Math.sin((2 * Math.PI * trill * i) / RATE) : 1)
    out[i] = sample * env
  }
  // normalise to a gentle peak
  let peak = 0
  for (const s of out) peak = Math.max(peak, Math.abs(s))
  for (let i = 0; i < n; i++) out[i] = (out[i] / peak) * 0.6
  return out
}

function wav(samples) {
  const data = Buffer.alloc(samples.length * 2)
  samples.forEach((s, i) => data.writeInt16LE(Math.round(Math.max(-1, Math.min(1, s)) * 32767), i * 2))
  const head = Buffer.alloc(44)
  head.write('RIFF', 0)
  head.writeUInt32LE(36 + data.length, 4)
  head.write('WAVEfmt ', 8)
  head.writeUInt32LE(16, 16)
  head.writeUInt16LE(1, 20) // PCM
  head.writeUInt16LE(1, 22) // mono
  head.writeUInt32LE(RATE, 24)
  head.writeUInt32LE(RATE * 2, 28)
  head.writeUInt16LE(2, 32)
  head.writeUInt16LE(16, 34)
  head.write('data', 36)
  head.writeUInt32LE(data.length, 40)
  return Buffer.concat([head, data])
}

const FADE = [[0, 0], [0.08, 1], [0.7, 0.85], [1, 0]]
const SOUNDS = {
  'meow-1': { length: 0.55, pitch: [[0, 520], [0.35, 760], [1, 480]], mouth: [[0, 'm'], [0.25, 'i'], [0.55, 'a'], [1, 'u']], loud: FADE, seed: 3 },
  'meow-2': { length: 0.7, pitch: [[0, 600], [0.3, 860], [0.6, 700], [1, 520]], mouth: [[0, 'm'], [0.2, 'i'], [0.5, 'a'], [1, 'o']], loud: FADE, seed: 7 },
  mrrp: { length: 0.32, pitch: [[0, 480], [0.7, 640], [1, 700]], mouth: [[0, 'm'], [0.5, 'u'], [1, 'o']], loud: [[0, 0], [0.1, 1], [0.85, 0.9], [1, 0]], trill: 28, seed: 11 },
  mew: { length: 0.26, pitch: [[0, 900], [0.4, 1050], [1, 820]], mouth: [[0, 'm'], [0.4, 'i'], [1, 'u']], loud: [[0, 0], [0.12, 1], [0.6, 0.8], [1, 0]], seed: 5 },
}

fs.mkdirSync('public/sounds', { recursive: true })
for (const [name, spec] of Object.entries(SOUNDS)) {
  fs.writeFileSync(`public/sounds/${name}.wav`, wav(meow(spec)))
  console.log(`public/sounds/${name}.wav`)
}
