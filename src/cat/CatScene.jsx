import { ContactShadows } from '@react-three/drei'
import { Canvas } from '@react-three/fiber'
import { Cat } from './Cat'

// The 3D "stage": camera, lights, a soft shadow, and the cat.
export function CatScene({ animation }) {
  return (
    <Canvas
      className="scene"
      camera={{ position: [0, 1.4, 7], fov: 40 }}
      shadows
      // Listen for the mouse on the whole page (not just the canvas),
      // so the "watching" cat can follow your cursor even over buttons.
      eventSource={document.getElementById('root')}
      eventPrefix="client"
    >
      <hemisphereLight args={['#fff4e0', '#3a3350', 1.2]} />
      <directionalLight position={[3, 5, 4]} intensity={1.6} castShadow />
      {/* Shift the cat down so the camera looks at its middle. */}
      <group position={[0, -0.6, 0]}>
        <Cat animation={animation} />
        <ContactShadows opacity={0.45} scale={6} blur={2.5} far={3} />
      </group>
    </Canvas>
  )
}
