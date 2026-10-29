import { Room } from '../scene/Room'
import { Cat } from './Cat'

// The stage App.jsx renders: the cozy room, with the cat in the middle.
// (Kept the same name and props as the old 3D scene so App.jsx didn't change.)
export function CatScene({ animation }) {
  return (
    <>
      <Room />
      <div className="cat-stage">
        <Cat animation={animation} />
      </div>
    </>
  )
}
