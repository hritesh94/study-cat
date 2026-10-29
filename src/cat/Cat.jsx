import { useEffect, useRef } from 'react'
import { CAT_ANIMATIONS } from './catConfig'
import './cat.css'

// Little helpers so the drawing below stays readable.
const Paw = ({ cx, className }) => (
  <g className={`paw ${className}`}>
    <ellipse className="cream-fill" cx={cx} cy="378" rx="25" ry="16" />
    <path className="line thin" d={`M${cx - 7} 370 v8 M${cx + 7} 370 v8`} />
  </g>
)

const Ear = ({ className }) => (
  <g className={`ear ${className}`}>
    <path className="fur" d="M120 112 C104 76 100 44 112 32 C128 34 156 52 178 72 Z" />
    <path className="ear-inner" d="M126 98 C118 76 116 58 121 49 C133 53 148 63 160 75 Z" />
  </g>
)

const Eye = ({ cx }) => (
  <g className="eye-look">
    <g className="eye-blink">
      <ellipse className="ink-fill" cx={cx} cy="150" rx="12" ry="15" />
      <circle className="shine" cx={cx - 4} cy="144" r="4.5" />
      <circle className="shine" cx={cx + 4} cy="157" r="2" />
    </g>
  </g>
)

const BUBBLES = [
  [90, 300, 10], [322, 280, 14], [70, 200, 8], [340, 180, 11],
  [112, 118, 9], [300, 108, 7], [58, 345, 12], [348, 340, 9],
]

// A 2D storybook cat drawn in SVG. Every animation is a CSS class on the
// <svg>, so switching animations is just React changing one class name.
export function Cat({ animation = 'idle' }) {
  const svgRef = useRef(null)
  const mode = CAT_ANIMATIONS.includes(animation) ? animation : 'idle'

  // Track the mouse so the "watching" cat can look at you. We write CSS
  // variables (--lx, --ly between -1 and 1) straight onto the <svg> instead
  // of using React state, so moving the mouse never re-renders anything.
  useEffect(() => {
    let frame = 0
    const onMove = (e) => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        const svg = svgRef.current
        if (!svg) return
        const box = svg.getBoundingClientRect()
        const clamp = (v) => Math.max(-1, Math.min(1, v))
        const lx = clamp((e.clientX - (box.left + box.width / 2)) / (window.innerWidth / 2))
        const ly = clamp((e.clientY - (box.top + box.height * 0.4)) / (window.innerHeight / 2))
        svg.style.setProperty('--lx', lx.toFixed(3))
        svg.style.setProperty('--ly', ly.toFixed(3))
      })
    }
    window.addEventListener('pointermove', onMove)
    return () => {
      window.removeEventListener('pointermove', onMove)
      cancelAnimationFrame(frame)
    }
  }, [])

  return (
    <svg
      ref={svgRef}
      className={`cat cat--${mode}`}
      viewBox="0 0 400 400"
      role="img"
      aria-label={`Study Cat is ${mode}`}
    >
      {/* Two nested groups per moving part: the outer one holds a pose
          (smoothly transitioned), the inner one plays a looping animation. */}
      <g className="root">
        <g className="root-loop">
          {/* tail sits behind the body */}
          <g className="tail-pose">
            <g className="tail">
              <path className="tail-outline" d="M290 362 C350 372 384 318 360 262 C352 244 338 240 330 250" />
              <path className="tail-fur" d="M290 362 C350 372 384 318 360 262 C352 244 338 240 330 250" />
              <path className="tail-tip" d="M357 256 C350 244 338 242 330 250" />
            </g>
          </g>

          <g className="breathe">
            {/* ears are drawn first so the head covers their base */}
            <Ear className="ear-l" />
            <g transform="translate(400 0) scale(-1 1)">
              <Ear className="ear-r" />
            </g>

            {/* head + body: ONE connected outline */}
            <path
              className="fur"
              d="M200 62 C262 62 298 100 298 150 C298 190 276 214 272 236 C268 258 316 282 314 330
                 C312 378 262 388 200 388 C138 388 88 378 86 330 C84 282 132 258 128 236
                 C124 214 102 190 102 150 C102 100 138 62 200 62 Z"
            />
            <ellipse className="cream-fill no-line" cx="200" cy="322" rx="64" ry="56" />
            <path className="stripes" d="M184 70 Q189 80 186 92 M200 66 V90 M216 70 Q211 80 214 92" />

            {/* bath foam on the head */}
            <g className="prop foam">
              <circle cx="146" cy="94" r="13" />
              <circle cx="166" cy="74" r="19" />
              <circle cx="198" cy="60" r="23" />
              <circle cx="230" cy="70" r="19" />
              <circle cx="252" cy="90" r="13" />
            </g>

            <g className="face-pose">
              <g className="face-loop">
                <ellipse className="cream-fill no-line" cx="200" cy="188" rx="38" ry="24" />
                <ellipse className="blush" cx="138" cy="182" rx="16" ry="9" />
                <ellipse className="blush" cx="262" cy="182" rx="16" ry="9" />

                <g className="eyes-open">
                  <Eye cx={160} />
                  <Eye cx={240} />
                </g>
                <path className="line eyes-happy" d="M147 154 Q160 138 173 154 M227 154 Q240 138 253 154" />
                <path className="line eyes-squeeze" d="M150 140 L170 150 L150 160 M250 140 L230 150 L250 160" />
                <path className="line brows" d="M144 128 L172 120 M256 128 L228 120" />

                <path className="nose" d="M192 175 Q200 170 208 175 Q205 183 200 184 Q195 183 192 175 Z" />
                <path className="line thin mouth-w" d="M186 187 Q193 196 200 188 Q207 196 214 187" />
                <path className="mouth-open" d="M187 187 Q200 210 213 187 Q200 193 187 187 Z" />
                <path className="line thin mouth-frown" d="M188 198 Q200 188 212 198" />
                <path className="line whiskers" d="M128 182 L94 175 M128 191 L96 196 M272 182 L306 175 M272 191 L304 196" />

                <g className="prop tear-g">
                  <path className="tear" d="M248 166 C254 176 256 182 248 187 C240 182 242 176 248 166 Z" />
                </g>
              </g>
            </g>
          </g>

          {/* open book, held between the paws while reading */}
          <g className="prop book">
            <path className="purple-fill" d="M200 272 Q162 260 126 268 L126 338 Q162 330 200 340 Q238 330 274 338 L274 268 Q238 260 200 272 Z" />
            <path className="page" d="M200 268 Q166 256 136 262 L136 328 Q166 322 200 332 Z" />
            <path className="page" d="M200 268 Q234 256 264 262 L264 328 Q234 322 200 332 Z" />
            <path className="line text-lines" d="M148 280 H186 M148 292 H182 M148 304 H188 M214 280 H252 M218 292 H252 M212 304 H248" />
            <path className="page page-flip" d="M200 268 Q234 256 264 262 L264 328 Q234 322 200 332 Z" />
          </g>

          <g className="paws-pose">
            <Paw cx={165} className="paw-l" />
            <Paw cx={235} className="paw-r" />
          </g>

          {/* food bowl on the floor in front */}
          <g className="prop bowl">
            <g className="kibble">
              <circle cx="178" cy="356" r="7" />
              <circle cx="194" cy="351" r="7" />
              <circle cx="210" cy="354" r="7" />
              <circle cx="224" cy="357" r="6" />
              <circle cx="200" cy="360" r="6" />
            </g>
            <path className="sage-fill" d="M144 360 L256 360 Q252 398 200 398 Q148 398 144 360 Z" />
            <path className="line thin" d="M176 378 Q200 384 224 378" />
          </g>
        </g>
      </g>

      {/* props that shouldn't shake/hop along with the cat */}
      <g className="prop yarn">
        <g className="yarn-roll">
          <g className="yarn-spin">
            <circle className="purple-fill" cx="322" cy="372" r="22" />
            <path className="line thin yarn-lines" d="M304 364 Q322 352 340 366 M302 376 Q322 362 342 380 M310 388 Q326 376 336 390" />
          </g>
        </g>
        <path className="line thin yarn-string" d="M300 378 Q270 396 240 392" />
      </g>

      <g className="prop hearts">
        <g transform="translate(305 92) scale(1.7)">
          <path className="heart" d="M0 8 C-14 -2 -12 -16 0 -9 C12 -16 14 -2 0 8 Z" />
        </g>
        <g transform="translate(98 120) scale(1.2)">
          <path className="heart heart-2" d="M0 8 C-14 -2 -12 -16 0 -9 C12 -16 14 -2 0 8 Z" />
        </g>
      </g>

      <g className="prop bubbles">
        {BUBBLES.map(([x, y, r], i) => (
          <g key={i} transform={`translate(${x} ${y})`}>
            <circle className="bub" r={r} style={{ animationDelay: `${-i * 0.37}s` }} />
          </g>
        ))}
      </g>
    </svg>
  )
}
