import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'

const FUR = '#f2a65a'
const CREAM = '#fde8c8'
const DARK = '#2b2233'
const PINK = '#f48fb1'

const { damp } = THREE.MathUtils

// Each animation is a function that returns a "pose": how the body parts
// should be positioned right now. `a` = seconds since this animation started,
// `t` = total seconds, `pointer` = mouse position (-1..1).
// Anything not returned falls back to the values in REST.
const REST = {
  y: 0, rotY: 0, rotZ: 0, squash: 1,
  headX: 0, headY: 0, headZ: 0, ears: 0, eyes: 1,
  tailX: -0.5, tailZ: 0, paws: 0,
  book: 0, bowl: 0, yarn: 0, bubbles: 0, heart: 0, tear: 0,
}

const blink = (a, every = 4) => (a % every < 0.15 ? 0.1 : 1)

const POSES = {
  idle: (a, t) => ({
    y: Math.abs(Math.sin(a * 3)) * 0.12,
    headZ: Math.sin(a * 1.5) * 0.15,
    tailZ: Math.sin(t * 5) * 0.6,
    eyes: blink(a, 3),
  }),
  reading: (a, t) => ({
    headX: 0.35,
    headY: Math.sin(a * 0.6) * 0.15, // eyes scanning across the page
    headZ: Math.sin(a * 0.8) * 0.06,
    eyes: a % 5 < 0.15 ? 0.1 : 0.8,
    paws: 1,
    book: 1,
    tailZ: Math.sin(t * 1.2) * 0.25,
  }),
  eating: (a, t) => ({
    headX: 0.55 + Math.max(0, Math.sin(a * 5)) * 0.3, // nom nom nom
    eyes: 0.5,
    bowl: 1,
    tailZ: Math.sin(t * 3) * 0.4,
  }),
  watching: (a, t, pointer) => ({
    headY: pointer.x * 0.6,
    headX: -pointer.y * 0.3,
    rotY: pointer.x * 0.15,
    headZ: Math.sin(a * 0.7) * 0.08,
    eyes: blink(a, 4),
    tailZ: Math.sin(t * 1.5) * 0.5,
  }),
  sad: () => ({
    headX: 0.5,
    ears: 1,
    eyes: 0.35,
    squash: 0.92,
    tailX: -1.35,
    tear: 1,
  }),
  play: (a) => ({
    y: Math.abs(Math.sin(a * 6)) * 0.5,
    rotZ: Math.sin(a * 6) * 0.15,
    headX: -0.2,
    paws: 0.6 + Math.sin(a * 12) * 0.3, // batting at the yarn
    yarn: 1,
    tailZ: Math.sin(a * 8) * 0.7,
  }),
  feed: (a) => ({
    y: Math.abs(Math.sin(a * 4)) * 0.08,
    headX: 0.5 + Math.max(0, Math.sin(a * 9)) * 0.3,
    eyes: 0.3, // happy ^^ squint
    bowl: 1,
    heart: 1,
    tailZ: Math.sin(a * 6) * 0.6,
  }),
  bathe: (a) => ({
    rotZ: Math.sin(a * 30) * 0.12 * Math.max(0, 1 - a / 2.5), // shake it off
    eyes: 0.2,
    ears: 0.5,
    squash: 0.95,
    bubbles: 1,
  }),
}

// A heart shape for the "feed" reaction.
function useHeartGeometry() {
  return useMemo(() => {
    const s = new THREE.Shape()
    s.moveTo(0, -0.3)
    s.bezierCurveTo(-0.05, -0.2, -0.3, -0.1, -0.3, 0.08)
    s.bezierCurveTo(-0.3, 0.25, -0.08, 0.28, 0, 0.12)
    s.bezierCurveTo(0.08, 0.28, 0.3, 0.25, 0.3, 0.08)
    s.bezierCurveTo(0.3, -0.1, 0.05, -0.2, 0, -0.3)
    const geo = new THREE.ExtrudeGeometry(s, { depth: 0.08, bevelEnabled: false })
    geo.center()
    return geo
  }, [])
}

function Fur({ color = FUR }) {
  return <meshStandardMaterial color={color} roughness={0.85} />
}

export function PlaceholderCat({ animation = 'idle' }) {
  // One ref holding every body part, e.g. parts.current.head.
  // Changing 3D objects directly each frame is much faster than re-rendering React.
  const parts = useRef({})
  const part = (name) => (obj) => {
    parts.current[name] = obj
  }
  const pose = useRef({ ...REST }) // the smoothed, current pose
  const started = useRef({ name: null, at: 0 })
  const heartGeo = useHeartGeometry()

  // useFrame runs ~60 times per second, right before each frame is drawn.
  useFrame(({ clock, pointer }, delta) => {
    const t = clock.elapsedTime
    if (started.current.name !== animation) started.current = { name: animation, at: t }
    const a = t - started.current.at

    const target = { ...REST, ...(POSES[animation] ?? POSES.idle)(a, t, pointer) }
    // "damp" moves each value a little toward its target every frame,
    // so switching animations blends smoothly instead of snapping.
    const p = pose.current
    const P = parts.current
    for (const k in target) p[k] = damp(p[k], target[k], 8, delta)

    P.root.position.y = p.y
    P.root.rotation.set(0, p.rotY, p.rotZ)
    P.body.scale.set(1, 1.1 * p.squash, 0.9)
    P.head.position.y = 1.75 * p.squash
    P.head.rotation.set(p.headX, p.headY, p.headZ)
    P.earL.rotation.z = 0.3 + p.ears * 0.9
    P.earR.rotation.z = -0.3 - p.ears * 0.9
    P.eyeL.scale.y = P.eyeR.scale.y = Math.max(0.05, p.eyes)
    P.tail.rotation.set(p.tailX, 0, p.tailZ)
    for (const paw of [P.pawL, P.pawR]) {
      paw.position.y = 0.15 + p.paws * 0.6
      paw.position.z = 0.6 + p.paws * 0.15
    }

    // Props grow in/out with their pose value (0 = hidden, 1 = full size).
    const show = (obj, amount) => {
      obj.visible = amount > 0.01
      obj.scale.setScalar(Math.max(0.001, amount))
    }
    show(P.book, p.book)
    show(P.bowl, p.bowl)
    show(P.yarn, p.yarn)
    show(P.bubbles, p.bubbles)
    show(P.heart, p.heart)
    show(P.tear, p.tear)

    P.yarn.position.set(Math.sin(a * 3) * 0.6, 0.3 + Math.abs(Math.sin(a * 6)) * 0.5, 1.0)
    P.yarn.rotation.set(a * 4, a * 3, 0)
    P.heart.position.y = 2.7 + (a % 1.5) * 0.4
    P.heart.rotation.y = Math.sin(a * 3) * 0.4
    P.tear.position.y = -0.05 - (a % 1.2) * 0.5
    P.bubbles.children.forEach((b, i) => {
      const k = i / P.bubbles.children.length
      const angle = k * Math.PI * 2 + t * 0.6
      b.position.set(Math.cos(angle) * 1.0, ((t * 0.5 + k) % 1) * 2.6, Math.sin(angle) * 0.8)
    })
  })

  return (
    <group>
      <group ref={part("root")}>
        {/* body + belly */}
        <mesh ref={part("body")} position={[0, 0.75, 0]} castShadow>
          <sphereGeometry args={[0.75, 32, 32]} />
          <Fur />
        </mesh>
        <mesh position={[0, 0.65, 0.45]} scale={[1, 1.1, 0.5]}>
          <sphereGeometry args={[0.48, 24, 24]} />
          <Fur color={CREAM} />
        </mesh>

        {/* front paws */}
        <mesh ref={part("pawL")} position={[-0.3, 0.15, 0.6]}>
          <sphereGeometry args={[0.18, 16, 16]} />
          <Fur color={CREAM} />
        </mesh>
        <mesh ref={part("pawR")} position={[0.3, 0.15, 0.6]}>
          <sphereGeometry args={[0.18, 16, 16]} />
          <Fur color={CREAM} />
        </mesh>

        {/* tail: the group is the pivot at the base, so rotating it swings the tail */}
        <group ref={part("tail")} position={[0, 0.3, -0.6]}>
          <mesh position={[0, 0.55, 0]}>
            <capsuleGeometry args={[0.1, 0.9, 8, 12]} />
            <Fur />
          </mesh>
        </group>

        {/* head */}
        <group ref={part("head")} position={[0, 1.75, 0]}>
          <mesh scale={[1.1, 0.95, 1]} castShadow>
            <sphereGeometry args={[0.6, 32, 32]} />
            <Fur />
          </mesh>
          <group ref={part("earL")} position={[-0.38, 0.42, 0]}>
            <mesh position={[0, 0.18, 0]}>
              <coneGeometry args={[0.2, 0.4, 16]} />
              <Fur />
            </mesh>
          </group>
          <group ref={part("earR")} position={[0.38, 0.42, 0]}>
            <mesh position={[0, 0.18, 0]}>
              <coneGeometry args={[0.2, 0.4, 16]} />
              <Fur />
            </mesh>
          </group>
          {/* muzzle */}
          <mesh position={[0, -0.15, 0.48]} scale={[1.2, 0.8, 0.7]}>
            <sphereGeometry args={[0.2, 16, 16]} />
            <Fur color={CREAM} />
          </mesh>
          <mesh position={[0, -0.06, 0.62]}>
            <sphereGeometry args={[0.05, 12, 12]} />
            <meshStandardMaterial color={PINK} />
          </mesh>
          {/* eyes (scale.y squishes them for blinks, squints and sad eyes) */}
          <mesh ref={part("eyeL")} position={[-0.22, 0.08, 0.53]}>
            <sphereGeometry args={[0.09, 16, 16]} />
            <meshStandardMaterial color={DARK} roughness={0.3} />
          </mesh>
          <mesh ref={part("eyeR")} position={[0.22, 0.08, 0.53]}>
            <sphereGeometry args={[0.09, 16, 16]} />
            <meshStandardMaterial color={DARK} roughness={0.3} />
          </mesh>
          {/* whiskers */}
          {[-1, 1].map((side) =>
            [0.03, -0.05].map((dy, i) => (
              <mesh
                key={`${side}${i}`}
                position={[side * 0.42, -0.12 + dy, 0.5]}
                rotation={[0, 0, side * (i ? -0.15 : 0.15)]}
              >
                <boxGeometry args={[0.35, 0.012, 0.012]} />
                <meshStandardMaterial color={DARK} />
              </mesh>
            )),
          )}
          {/* a tear for when you leave */}
          <group ref={part("tear")} position={[0.24, 0, 0.56]}>
            <mesh>
              <sphereGeometry args={[0.05, 12, 12]} />
              <meshStandardMaterial color="#7ec8ff" transparent opacity={0.85} />
            </mesh>
          </group>
        </group>
      </group>

      {/* ── props ── (outside the root so they don't bounce with the cat) */}
      <group ref={part("book")} position={[0, 0.95, 0.9]} rotation={[0.5, 0, 0]}>
        <mesh>
          <boxGeometry args={[0.72, 0.52, 0.1]} />
          <meshStandardMaterial color="#fffaf0" />
        </mesh>
        <mesh position={[0, 0, 0.04]}>
          <boxGeometry args={[0.76, 0.56, 0.05]} />
          <meshStandardMaterial color="#5b7bd5" />
        </mesh>
      </group>

      <group ref={part("bowl")} position={[0, 0.1, 1.05]}>
        <mesh>
          <cylinderGeometry args={[0.35, 0.25, 0.18, 24]} />
          <meshStandardMaterial color="#e05a6d" />
        </mesh>
        <mesh position={[0, 0.08, 0]} scale={[1, 0.3, 1]}>
          <sphereGeometry args={[0.3, 16, 16]} />
          <meshStandardMaterial color="#8a5a3b" />
        </mesh>
      </group>

      <group ref={part("yarn")}>
        <mesh>
          <sphereGeometry args={[0.2, 16, 16]} />
          <meshStandardMaterial color={PINK} />
        </mesh>
        <mesh rotation={[0.6, 0, 0.3]}>
          <torusGeometry args={[0.2, 0.02, 8, 24]} />
          <meshStandardMaterial color="#d46a92" />
        </mesh>
      </group>

      <group ref={part("heart")} position={[0.7, 2.7, 0.3]}>
        <mesh geometry={heartGeo}>
          <meshStandardMaterial color="#ff5d7a" />
        </mesh>
      </group>

      <group ref={part("bubbles")}>
        {Array.from({ length: 10 }, (_, i) => (
          <mesh key={i}>
            <sphereGeometry args={[0.08 + (i % 3) * 0.04, 16, 16]} />
            <meshStandardMaterial color="#cdeeff" transparent opacity={0.55} roughness={0.1} />
          </mesh>
        ))}
      </group>
    </group>
  )
}
