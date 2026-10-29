import './cat.css'

// The cat puppet, in a 3/4 side view facing right.
//
// Every moving part is its own <g data-part="...">, drawn with its JOINT at
// (0, 0). The animator (usePuppet.js) gives each group a transform like
// "translate(to the joint) rotate(angle)", so parts spin around their joints
// and, because children live inside their parent group, never come apart:
//
//   root (hips)
//   ├─ tail1 → tail2 → tail3
//   ├─ legF1 (thigh) → legF2 (shin) → legF3 (paw)        far back leg
//   ├─ armF1 (upper) → armF2 (forearm) → armF3 (paw)     far front leg
//   ├─ torso → body, head → ears, face (eyes, mouth…)
//   ├─ heldMug
//   ├─ legN1 → legN2 → legN3                             near back leg
//   └─ armN1 → armN2 → armN3 → pencil                    near front leg
//
// Draw order = what's in front: far limbs first, near limbs last.

function Arm({ side }) {
  const far = side === 'F'
  return (
    <g data-part={`arm${side}1`} className={far ? 'far' : undefined}>
      <rect className="fur" x="-12" y="-8" width="24" height="64" rx="12" />
      <g data-part={`arm${side}2`}>
        <rect className="fur" x="-10" y="-6" width="20" height="57" rx="10" />
        <g data-part={`arm${side}3`}>
          <ellipse className="sock" cx="5" cy="3" rx="13" ry="10" />
          <path className="line thin" d="M4 -2 v8 M11 -1 v7" />
          {!far && (
            <g data-part="pencil" style={{ opacity: 0 }}>
              <g transform="rotate(-30)">
                <rect className="pencil-body" x="-4" y="-38" width="8" height="40" rx="2" />
                <path className="pencil-tip" d="M-4 2 L0 12 L4 2 Z" />
                <rect className="pencil-eraser" x="-4" y="-44" width="8" height="7" rx="2" />
              </g>
            </g>
          )}
        </g>
      </g>
    </g>
  )
}

function Leg({ side }) {
  return (
    <g data-part={`leg${side}1`} className={side === 'F' ? 'far' : undefined}>
      <ellipse className="fur" cx="0" cy="16" rx="19" ry="25" />
      <g data-part={`leg${side}2`}>
        <rect className="fur" x="-10" y="-6" width="20" height="44" rx="10" />
        <g data-part={`leg${side}3`}>
          <ellipse className="sock" cx="9" cy="3" rx="15" ry="9" />
        </g>
      </g>
    </g>
  )
}

function Ear({ side }) {
  // far ear leans back, near ear stands up
  const shape =
    side === 'F' ? 'M-14 4 C-18 -18 -16 -32 -10 -40 C2 -34 12 -22 16 -6 Z' : 'M-16 6 C-12 -16 -2 -32 8 -40 C16 -26 20 -12 18 6 Z'
  const inner = side === 'F' ? 'M-8 0 C-11 -14 -10 -24 -8 -30 C0 -25 6 -16 9 -6 Z' : 'M-9 2 C-6 -14 0 -25 6 -31 C11 -21 13 -10 12 2 Z'
  return (
    <g data-part={`ear${side}`}>
      <path className={side === 'F' ? 'fur far-fill' : 'fur'} d={shape} />
      <path className="ear-inner" d={inner} />
    </g>
  )
}

export function Mug({ steam }) {
  return (
    <>
      {steam && (
        <g className="steam">
          <path d="M-8 -26 C-14 -34 -2 -40 -8 -50" />
          <path d="M2 -26 C-4 -36 8 -42 2 -54" />
          <path d="M12 -26 C6 -34 18 -40 12 -50" />
        </g>
      )}
      <path className="mug-handle" d="M13 -8 C28 -8 28 10 13 10" />
      <rect className="cream" x="-15" y="-18" width="30" height="36" rx="7" />
      <rect className="mug-stripe" x="-13" y="-6" width="26" height="7" />
    </>
  )
}

export function Cat() {
  return (
    <g className="cat" data-part="root">
      {/* tail: three segments, each rotating at the end of the last */}
      <g data-part="tail1">
        <rect className="fur" x="-10" y="-6" width="20" height="42" rx="10" />
        <g data-part="tail2">
          <rect className="fur" x="-9" y="-5" width="18" height="38" rx="9" />
          <g data-part="tail3">
            <rect className="fur" x="-8" y="-5" width="16" height="35" rx="8" />
            <path className="sock" d="M-8 16 H8 V22 A8 8 0 0 1 -8 22 Z" />
          </g>
        </g>
      </g>

      <Leg side="F" />
      <Arm side="F" />

      <g data-part="torso">
        <g data-part="body">
          <path
            className="fur"
            d="M-42 2 C-50 -30 -46 -78 -24 -100 C-6 -116 26 -114 36 -96 C48 -76 46 -36 40 -12 C36 4 18 10 0 10 C-20 10 -36 8 -42 2 Z"
          />
          <ellipse className="cream" cx="22" cy="-46" rx="15" ry="36" />
          <path className="stripes" d="M-42 -54 Q-32 -52 -26 -58 M-44 -34 Q-34 -32 -28 -38 M-30 -80 Q-20 -76 -16 -82" />
        </g>

        <g data-part="head" className="cat-head" data-eyes="open" data-mouth="smile">
          <Ear side="F" />
          <Ear side="N" />
          <path
            className="fur"
            d="M-38 -40 C-40 -70 -14 -90 12 -90 C42 -90 62 -70 62 -44 C62 -22 52 -4 30 2 C14 6 -6 6 -20 0 C-34 -8 -38 -24 -38 -40 Z"
          />
          <path className="stripes" d="M4 -84 Q8 -76 6 -68 M16 -88 V-72 M28 -86 Q26 -78 28 -70" />

          <g data-part="foam" style={{ opacity: 0 }}>
            <circle className="foam" cx="-12" cy="-84" r="12" />
            <circle className="foam" cx="8" cy="-94" r="16" />
            <circle className="foam" cx="30" cy="-92" r="14" />
            <circle className="foam" cx="48" cy="-80" r="10" />
          </g>

          {/* the face slides a little when the cat turns toward you */}
          <g data-part="face">
            <ellipse className="blush" cx="-8" cy="-30" rx="6" ry="4" />
            <ellipse className="blush" cx="24" cy="-27" rx="10" ry="6" />

            <g data-part="eyeF">
              <g className="v eyes-open">
                <ellipse className="ink-fill" cx="4" cy="-48" rx="7" ry="11" />
                <g data-part="pupilF">
                  <circle className="shine" cx="2" cy="-52" r="3" />
                </g>
              </g>
              <path className="v lid fur" d="M-4 -48 Q4 -62 12 -48 Q4 -52 -4 -48 Z" />
              <path className="v line eyes-happy" d="M-2 -46 Q4 -54 10 -46" />
              <path className="v line eyes-closed" d="M-2 -48 Q4 -42 10 -48" />
              <path className="v line eyes-squeeze" d="M10 -54 L0 -47 L10 -40" />
            </g>
            <g data-part="eyeN">
              <g className="v eyes-open">
                <ellipse className="ink-fill" cx="34" cy="-46" rx="9.5" ry="12.5" />
                <g data-part="pupilN">
                  <circle className="shine" cx="31" cy="-51" r="3.8" />
                  <circle className="shine" cx="37" cy="-41" r="1.8" />
                </g>
              </g>
              <path className="v lid fur" d="M23 -45 Q34 -62 45 -45 Q34 -50 23 -45 Z" />
              <path className="v line eyes-happy" d="M26 -44 Q34 -54 42 -44" />
              <path className="v line eyes-closed" d="M26 -46 Q34 -40 42 -46" />
              <path className="v line eyes-squeeze" d="M28 -54 L40 -47 L28 -40" />
            </g>
            <path className="v line thin brows" d="M8 -64 L-2 -60 M26 -64 L42 -59" />

            <ellipse className="cream" cx="44" cy="-22" rx="20" ry="14" />
            <path className="nose" d="M50 -34 Q56 -38 61 -34 Q59 -29 56 -28 Q52 -29 50 -34 Z" />
            <path className="v line thin mouth-smile" d="M47 -21 Q52 -16 56 -21 Q60 -16 64 -21" />
            <path className="v mouth-fill mouth-open" d="M47 -21 Q56 -6 64 -21 Q56 -17 47 -21 Z" />
            <path className="v mouth-fill mouth-chew" d="M48 -21 Q56 -10 63 -21 Q56 -18 48 -21 Z" />
            <ellipse className="v mouth-fill mouth-yawn" cx="56" cy="-14" rx="8" ry="11" />
            <path className="v line thin mouth-frown" d="M48 -15 Q56 -23 63 -15" />
            <path className="line whiskers" d="M60 -25 L88 -31 M60 -20 L88 -15 M14 -22 L-6 -25" />

            <g data-part="tear" style={{ opacity: 0 }}>
              <path className="tear" d="M38 -34 C43 -26 44 -21 38 -17 C32 -21 33 -26 38 -34 Z" />
            </g>
          </g>
        </g>
      </g>

      {/* the mug while it's held (the animator moves it to the paws) */}
      <g data-part="heldMug" style={{ opacity: 0 }}>
        <Mug />
      </g>

      <Leg side="N" />
      <Arm side="N" />
    </g>
  )
}
