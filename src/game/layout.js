// Where everything is, in the game's own units ("game pixels": the room is
// 320 × 180; the camera zooms it up to at most 3×).
// The cat's feet always stand on FEET_Y (the sprite's origin is at its feet).
//
// The HD cat's frames are 128 × 128 and it's drawn at CAT_SCALE = 0.5, so a
// frame is 64 game pixels — the same size the room was laid out for. At the
// 3× maximum zoom that's 1.5× the art's own size.

export const ROOM_W = 320
export const FEET_Y = 150

export const CAT_SCALE = 0.5

// Measured from the HD sheets (see PROJECT_LOG step 14), in game pixels:
//  • reading: the book lies 10 px above the feet (frame y 84) and reaches ~27 px right
//  • eat / play: the bowl / yarn are drawn ~18 px in front of the cat, at its feet
export const BOOK_DX = 27
export const PROP_DX = 18

export const SPOTS = {
  desk: 222, // sits on the cushion; the low desk starts just to its right
  rug: 140,
  bowl: 96,
  play: 140,
  tubEntry: 26, // stands here, then jumps into the tub
  tub: 56, // the tub (public/game/room/tub.png) stands here, on the floor line
  tubExit: 92,
}
export const WANDER = [24, 300]

// The low desk: its top sits exactly where the sprite's book is (frame y 84).
export const DESK = { x: 232, w: 70, top: FEET_Y - 10 }
export const LAMP = { x: 292, glowY: 122 }
export const MUG = { x: 272, y: 131 }

// How far above the feet the top of the head is, per posture
// (used to put the speech bubble above the cat).
export const HEAD_TOP = { stand: 43, sit: 48, front: 45, read: 44, sleep: 35, eat: 43, play: 43, sad: 44, tub: 50, air: 50, crouch: 45 }

// The camera keeps this world row just above the timer panel.
export const VIEW_BOTTOM = 164
export const WALK_SPEED = 24 // px per second
