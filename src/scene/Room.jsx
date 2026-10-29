import './room.css'

// The cozy room behind the cat. Each piece is its own small SVG, placed with
// CSS (room.css) so it lines up with the floor at any screen size.
// The room reacts to study/break mode purely through CSS: App.jsx already
// puts `focus` or `break` on the .app element, and room.css listens for that.

const LEAVES = [
  { x: 60, color: '#f2a66a', duration: 11, delay: -2 },
  { x: 112, color: '#d98a52', duration: 9, delay: -6 },
  { x: 168, color: '#9cb59a', duration: 13, delay: -1 },
  { x: 206, color: '#f2a66a', duration: 10, delay: -8 },
  { x: 244, color: '#d98a52', duration: 12, delay: -4 },
  { x: 88, color: '#9cb59a', duration: 14, delay: -11 },
]

function Window() {
  return (
    <svg className="room-window" viewBox="0 0 300 360">
      <defs>
        <linearGradient id="room-sky-day" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fbe3c4" />
          <stop offset="1" stopColor="#e4ecd6" />
        </linearGradient>
        <linearGradient id="room-sky-dusk" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#a993c2" />
          <stop offset="1" stopColor="#f2c4a2" />
        </linearGradient>
        <clipPath id="room-glass">
          <rect x="32" y="42" width="236" height="248" rx="16" />
        </clipPath>
      </defs>

      <rect className="wood-light" x="20" y="30" width="260" height="272" rx="24" />
      <g clipPath="url(#room-glass)">
        <rect x="0" y="0" width="300" height="300" fill="url(#room-sky-day)" />
        <rect className="sky-dusk" x="0" y="0" width="300" height="300" fill="url(#room-sky-dusk)" />
        <circle className="sun" cx="96" cy="96" r="24" />
        <path className="hill-back" d="M30 236 Q90 196 160 226 T280 210 V300 H30 Z" />
        <path className="hill-front" d="M30 262 Q110 228 190 258 T290 250 V300 H30 Z" />
        {/* an autumn tree outside */}
        <path className="trunk" d="M226 300 L230 210 M229 236 L246 218" />
        <circle className="canopy" cx="228" cy="176" r="38" />
        <circle className="canopy dark" cx="252" cy="200" r="24" />
        <circle className="canopy" cx="204" cy="200" r="22" />
        {LEAVES.map((leaf, i) => (
          <g key={i} transform={`translate(${leaf.x} 0)`}>
            <g className="leaf-fall" style={{ animationDuration: `${leaf.duration}s`, animationDelay: `${leaf.delay}s` }}>
              <g className="leaf-sway" style={{ animationDelay: `${leaf.delay / 3}s` }}>
                <path className="leaf" fill={leaf.color} d="M0 -9 C7 -6 8 3 0 9 C-8 3 -7 -6 0 -9 Z M0 -6 V7" />
              </g>
            </g>
          </g>
        ))}
        <path className="glass-shine" d="M60 120 L110 70 M70 150 L140 80" />
      </g>
      {/* window bars + sill */}
      <rect className="wood-light thin" x="145" y="42" width="10" height="248" />
      <rect className="wood-light thin" x="32" y="160" width="236" height="10" />
      <rect className="outline" x="32" y="42" width="236" height="248" rx="16" />
      <rect className="wood" x="6" y="294" width="288" height="20" rx="8" />
      {/* curtains */}
      <path className="rod" d="M4 22 H296" />
      <g className="curtain">
        <path d="M0 20 L56 20 C50 90 30 150 46 206 C30 250 26 300 32 356 L0 356 Z" />
        <path className="fold" d="M16 40 C14 120 22 200 14 340 M32 34 C30 100 26 150 34 200" />
        <ellipse className="tie" cx="42" cy="206" rx="14" ry="7" />
      </g>
      <g className="curtain" transform="translate(300 0) scale(-1 1)">
        <path d="M0 20 L56 20 C50 90 30 150 46 206 C30 250 26 300 32 356 L0 356 Z" />
        <path className="fold" d="M16 40 C14 120 22 200 14 340 M32 34 C30 100 26 150 34 200" />
        <ellipse className="tie" cx="42" cy="206" rx="14" ry="7" />
      </g>
    </svg>
  )
}

function Plant() {
  return (
    <svg className="room-plant" viewBox="0 0 200 280">
      <g className="plant-leaves">
        <path className="stem" d="M100 186 C96 150 80 120 58 96 M100 186 C104 140 112 90 110 40 M100 186 C110 150 128 124 150 108" />
        <path className="leaf-big" d="M100 184 C70 152 40 122 28 70 C70 78 96 120 100 184 Z" />
        <path className="leaf-big" d="M100 184 C130 150 160 126 176 82 C132 86 106 124 100 184 Z" />
        <path className="leaf-big dark" d="M100 184 C84 120 88 60 110 18 C128 70 120 130 100 184 Z" />
        <path className="leaf-big" d="M100 184 C80 168 58 160 34 164 C54 140 86 150 100 184 Z" />
        <path className="vein" d="M96 176 C78 140 56 112 38 82 M104 176 C122 146 146 122 166 92 M102 176 C100 120 102 70 110 30" />
      </g>
      <rect className="pot-rim" x="42" y="178" width="116" height="24" rx="9" />
      <path className="pot" d="M52 200 L148 200 L138 268 Q100 278 62 268 Z" />
      <path className="pot-band" d="M57 226 H143" />
    </svg>
  )
}

function Desk() {
  return (
    <svg className="room-desk" viewBox="0 0 400 300">
      {/* lamp (left end of the desk, so it glows near the cat) */}
      <ellipse className="purple" cx="84" cy="148" rx="32" ry="9" />
      <path className="lamp-arm" d="M84 146 Q62 112 86 58" />
      <ellipse className="lamp-bulb" cx="86" cy="96" rx="20" ry="8" />
      <path className="lamp-shade" d="M42 94 Q46 50 86 46 Q126 50 130 94 Z" />

      {/* steaming mug */}
      <g className="steam">
        <path d="M186 102 C178 92 194 84 186 72" />
        <path d="M198 100 C190 88 206 80 198 66" />
        <path d="M210 102 C202 92 218 84 210 72" />
      </g>
      <path className="mug-handle" d="M216 122 C234 122 234 144 216 144" />
      <rect className="cream" x="176" y="110" width="42" height="42" rx="9" />
      <rect className="mug-stripe" x="178" y="124" width="38" height="8" />

      {/* book stack */}
      <rect className="purple" x="284" y="132" width="90" height="18" rx="4" />
      <rect className="sage" x="292" y="115" width="76" height="17" rx="4" />
      <rect className="orange" x="280" y="98" width="94" height="17" rx="4" />
      <path className="spine" d="M296 132 V150 M304 115 V132 M292 98 V115" />

      {/* the desk itself */}
      <rect className="wood" x="10" y="150" width="380" height="22" rx="8" />
      <rect className="wood-dark" x="30" y="170" width="20" height="126" rx="6" />
      <rect className="wood" x="252" y="170" width="126" height="126" rx="8" />
      <rect className="wood-light" x="264" y="184" width="102" height="44" rx="7" />
      <rect className="wood-light" x="264" y="238" width="102" height="44" rx="7" />
      <circle className="knob" cx="315" cy="206" r="6" />
      <circle className="knob" cx="315" cy="260" r="6" />
    </svg>
  )
}

function Picture() {
  return (
    <svg className="room-picture" viewBox="0 0 120 100">
      <rect className="wood" x="4" y="4" width="112" height="92" rx="10" />
      <rect className="cream" x="16" y="16" width="88" height="68" rx="5" />
      {/* a little paw print */}
      <g className="paw-print">
        <ellipse cx="60" cy="58" rx="15" ry="12" />
        <circle cx="42" cy="40" r="6" />
        <circle cx="54" cy="33" r="6" />
        <circle cx="67" cy="33" r="6" />
        <circle cx="78" cy="40" r="6" />
      </g>
    </svg>
  )
}

function Floor() {
  // Planks get taller toward the bottom, which fakes a bit of depth.
  const rows = [0, 14, 31, 51, 74, 100]
  const seams = [[22, 58, 86], [10, 40, 71], [30, 63, 92], [16, 49, 80], [6, 38, 70]]
  return (
    <svg className="room-floor" viewBox="0 0 100 100" preserveAspectRatio="none">
      {rows.slice(1, -1).map((y) => (
        <path key={y} className="plank-line" d={`M0 ${y} H100`} vectorEffect="non-scaling-stroke" />
      ))}
      {seams.map((row, r) =>
        row.map((x) => (
          <path
            key={`${r}-${x}`}
            className="plank-line"
            d={`M${x} ${rows[r]} V${rows[r + 1]}`}
            vectorEffect="non-scaling-stroke"
          />
        )),
      )}
    </svg>
  )
}

export function Room() {
  return (
    <div className="room" aria-hidden="true">
      <div className="room-wall" />
      <div className="room-wainscot" />
      <Window />
      <Picture />
      <Floor />
      <div className="room-baseboard" />
      <svg className="room-rug" viewBox="0 0 400 80" preserveAspectRatio="none">
        <ellipse className="rug" cx="200" cy="40" rx="196" ry="36" vectorEffect="non-scaling-stroke" />
        <ellipse className="rug-stitch" cx="200" cy="40" rx="172" ry="26" vectorEffect="non-scaling-stroke" />
      </svg>
      <Plant />
      <Desk />
      {/* lighting layers, faded in/out by mode */}
      <div className="room-dim" />
      <div className="room-bright" />
      <div className="room-glow" />
    </div>
  )
}
