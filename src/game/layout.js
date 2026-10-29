// Where everything is, in the game's own pixels (the room is 320 × 180;
// the camera zooms it up 2–4×, so 1 game pixel = 2–4 screen pixels).
// The cat's feet always stand on FEET_Y (the sprite's origin is at its feet).

export const ROOM_W = 320
export const FEET_Y = 150

// Measured from the sprite sheet (see PROJECT_LOG step 13):
//  • reading: the book lies 10 px above the feet and reaches ~27 px right of the cat
//  • eat / play: the bowl / yarn are drawn ~18 px in front of the cat, at its feet
export const BOOK_DX = 27
export const PROP_DX = 18

export const SPOTS = {
  desk: 222, // sits on the cushion; the low desk starts just to its right
  rug: 140,
  bowl: 96,
  play: 140,
  tubEntry: 26, // stands here, then jumps into the tub
  tub: 56,
  tubExit: 92,
}
export const TUB_FEET_Y = 154
export const WANDER = [24, 300]

// The low desk: its top sits exactly where the sprite's book is (frame y 42).
export const DESK = { x: 232, w: 70, top: FEET_Y - 10 }
export const LAMP = { x: 292, glowY: 122 }
export const MUG = { x: 272, y: 131 }

// How far above the feet the top of the head is, per posture
// (used to put the speech bubble above the cat).
export const HEAD_TOP = { stand: 44, sit: 49, front: 46, read: 45, sleep: 32 }

// The camera keeps this world row just above the timer panel.
export const VIEW_BOTTOM = 164
export const WALK_SPEED = 24 // px per second
