import { Cat } from './Cat'

// The stage App.jsx renders: the cat, positioned in the middle of the room.
// (Kept the same name and props as the old 3D scene so App.jsx didn't change.)
export function CatScene({ animation }) {
  return (
    <div className="cat-stage">
      <Cat animation={animation} />
    </div>
  )
}
