import { useRef } from 'react'
import { Room } from '../scene/Room'
import { Cat, Mug } from './Cat'
import { STAGE } from './poses'
import { usePuppet } from './usePuppet'
import './stage.css'

const hidden = { opacity: 0 }

const BUBBLES = [
  [200, 450, 9], [232, 428, 7], [300, 440, 10], [330, 418, 7],
  [186, 418, 6], [272, 410, 8], [250, 456, 6], [350, 452, 8],
]

// What App.jsx renders: the room in the back, then one SVG "stage" where
// the desk, stool, props and the cat share the same coordinates (800 × 520),
// so a paw can land exactly on the book's corner.
// (Same name and `animation` prop as before, so App.jsx didn't change.)
export function CatScene({ animation }) {
  const svgRef = useRef(null)
  usePuppet(svgRef, animation)

  return (
    <>
      <Room />
      <svg ref={svgRef} className="stage" viewBox="0 0 800 520" role="img" aria-label={`Study Cat: ${animation}`}>
        <defs>
          <radialGradient id="stage-glow-warm">
            <stop offset="0" stopColor="#ffd08a" stopOpacity="0.75" />
            <stop offset="0.4" stopColor="#ffb870" stopOpacity="0.28" />
            <stop offset="1" stopColor="#ffb870" stopOpacity="0" />
          </radialGradient>
        </defs>
        <circle className="stage-glow" cx="614" cy="212" r="240" fill="url(#stage-glow-warm)" />

        <g className="stage-furniture">
          {/* framed paw print on the wall */}
          <g transform="translate(640 70) rotate(-3)">
            <rect className="wood" x="0" y="0" width="96" height="78" rx="9" />
            <rect className="cream" x="11" y="11" width="74" height="56" rx="5" />
            <g className="paw-print">
              <ellipse cx="48" cy="46" rx="12" ry="10" />
              <circle cx="33" cy="31" r="5" />
              <circle cx="43" cy="25" r="5" />
              <circle cx="54" cy="25" r="5" />
              <circle cx="63" cy="31" r="5" />
            </g>
          </g>

          {/* desk */}
          <rect className="wood-dark" x="386" y="274" width="16" height="196" rx="5" />
          <rect className="wood" x="660" y="274" width="116" height="196" rx="8" />
          <rect className="wood-light" x="672" y="290" width="92" height="74" rx="7" />
          <rect className="wood-light" x="672" y="376" width="92" height="78" rx="7" />
          <circle className="knob" cx="718" cy="327" r="6" />
          <circle className="knob" cx="718" cy="415" r="6" />
          <rect className="wood" x="372" y="260" width="414" height="18" rx="7" />

          {/* lamp */}
          <ellipse className="purple" cx="610" cy="258" rx="26" ry="7" />
          <path className="lamp-arm" d="M610 256 Q588 220 614 170" />
          <ellipse className="lamp-bulb" cx="614" cy="212" rx="18" ry="7" />
          <path className="lamp-shade" d="M572 210 Q576 166 614 162 Q652 166 656 210 Z" />

          {/* book stack */}
          <rect className="purple" x="690" y="242" width="84" height="18" rx="4" />
          <rect className="sage" x="698" y="225" width="70" height="17" rx="4" />
          <rect className="orange" x="686" y="208" width="88" height="17" rx="4" />

          {/* the open book */}
          <path className="purple" d="M376 262 L384 240 Q405 233 426 241 Q447 233 468 240 L476 262 Z" />
          <path className="page" d="M426 244 Q406 236 388 241 L382 259 Q404 255 426 260 Z" />
          <path className="page" d="M426 244 Q446 236 464 241 L470 259 Q448 255 426 260 Z" />
          <path className="text-lines" d="M394 246 H418 M392 251 H418 M391 256 H416 M434 246 H458 M434 251 H460 M434 256 H462" />
          <path data-part="pageFlip" className="page" style={hidden} d="M426 244 Q446 236 464 241 L470 259 Q448 255 426 260 Z" />

          <g data-part="deskMug" transform={`translate(${STAGE.deskMug})`}>
            <Mug steam />
          </g>
          <g data-part="deskPencil" transform={`translate(${STAGE.deskPencil}) rotate(-4)`}>
            <rect className="pencil-body" x="-20" y="-3" width="36" height="6" rx="2" />
            <path className="pencil-tip" d="M16 -3 L24 0 L16 3 Z" />
            <rect className="pencil-eraser" x="-25" y="-3" width="6" height="6" rx="2" />
          </g>

          {/* stool */}
          <path className="wood-dark" d="M296 336 L282 470 M364 336 L378 470" />
          <path className="wood-dark thin-leg" d="M330 340 V466" />
          <path className="wood-dark rung" d="M290 420 H370" />
          <rect className="wood" x="284" y="326" width="92" height="14" rx="6" />
          <ellipse className="wood-light" cx="330" cy="326" rx="46" ry="9" />

          {/* rug */}
          <ellipse className="rug" cx="282" cy="500" rx="168" ry="21" />
          <ellipse className="rug-stitch" cx="282" cy="500" rx="146" ry="14" />

          <g data-part="tubBack" style={hidden}>
            <ellipse className="tub-water" cx="282" cy="468" rx="94" ry="15" />
          </g>
        </g>

        <Cat />

        {/* in front of the cat */}
        <g data-part="tubFront" style={hidden}>
          <path className="tub" d="M188 468 Q190 514 282 516 Q374 514 376 468 Q282 486 188 468 Z" />
          <path className="tub-band" d="M196 492 Q282 506 368 492" />
          <circle className="purple" cx="210" cy="514" r="7" />
          <circle className="purple" cx="354" cy="514" r="7" />
          <circle className="foam" cx="214" cy="472" r="9" />
          <circle className="foam" cx="236" cy="478" r="7" />
          <circle className="foam" cx="348" cy="472" r="8" />
        </g>

        <g data-part="bowl" style={hidden}>
          <circle className="kibble" cx="342" cy="476" r="6" />
          <circle className="kibble" cx="356" cy="472" r="6" />
          <circle className="kibble" cx="370" cy="476" r="6" />
          <path className="sage" d="M326 478 L386 478 Q384 500 356 500 Q328 500 326 478 Z" />
        </g>

        <g data-part="yarn" style={hidden}>
          <circle className="purple" r="14" />
          <path className="yarn-lines" d="M-10 -5 Q0 -13 11 -4 M-12 4 Q0 -6 12 6 M-6 11 Q3 4 9 11" />
        </g>

        <g data-part="bubbles" style={hidden}>
          {BUBBLES.map(([x, y, r], i) => (
            <g key={i} transform={`translate(${x} ${y})`}>
              <circle className="bub" r={r} style={{ animationDelay: `${-i * 0.37}s` }} />
            </g>
          ))}
        </g>

        <g data-part="hearts" style={hidden}>
          <g transform="translate(372 380) scale(1.6)">
            <path className="heart" d="M0 8 C-14 -2 -12 -16 0 -9 C12 -16 14 -2 0 8 Z" />
          </g>
          <g transform="translate(332 360) scale(1.1)">
            <path className="heart heart-2" d="M0 8 C-14 -2 -12 -16 0 -9 C12 -16 14 -2 0 8 Z" />
          </g>
        </g>
      </svg>
    </>
  )
}
