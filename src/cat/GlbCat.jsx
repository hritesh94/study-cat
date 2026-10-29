import { useAnimations, useGLTF } from '@react-three/drei'
import { useEffect, useRef } from 'react'

// Loads a real cat model (.glb) and plays the clip that matches `animation`.
// Not used until CAT_CONFIG.modelUrl is set in catConfig.js.
export function GlbCat({ url, animation, clipNames, scale, position }) {
  const group = useRef()
  const { scene, animations } = useGLTF(url)
  const { actions } = useAnimations(animations, group)

  useEffect(() => {
    const action = actions[clipNames[animation] ?? animation]
    if (!action) {
      console.warn(`Cat model has no clip for "${animation}". Available:`, Object.keys(actions))
      return
    }
    // Fade between clips so the change isn't a sudden jump.
    action.reset().fadeIn(0.3).play()
    return () => action.fadeOut(0.3)
  }, [animation, actions, clipNames])

  return (
    <group ref={group} scale={scale} position={position}>
      <primitive object={scene} />
    </group>
  )
}
