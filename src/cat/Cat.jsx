import { Suspense } from 'react'
import { CAT_CONFIG } from './catConfig'
import { GlbCat } from './GlbCat'
import { PlaceholderCat } from './PlaceholderCat'

// The one cat component the app uses. It picks the real model if one is
// configured, otherwise the placeholder made of basic shapes.
export function Cat({ animation }) {
  if (!CAT_CONFIG.modelUrl) return <PlaceholderCat animation={animation} />

  return (
    // While the .glb downloads, show the placeholder instead of nothing.
    <Suspense fallback={<PlaceholderCat animation={animation} />}>
      <GlbCat
        url={CAT_CONFIG.modelUrl}
        animation={animation}
        clipNames={CAT_CONFIG.clipNames}
        scale={CAT_CONFIG.scale}
        position={CAT_CONFIG.position}
      />
    </Suspense>
  )
}
