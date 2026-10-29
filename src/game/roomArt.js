// Draws the room from plain rectangles, triangles and circles, baked into
// textures. Everything is drawn at RES texture pixels per game pixel, so it
// stays sharp and smooth (antialiased) when the camera zooms in — matching
// the smooth HD cat. Coordinates below are still in game pixels.
import { DESK, FEET_Y, LAMP, MUG, PROP_DX, SPOTS } from './layout'

export const C = {
  ink: 0x4b3b47,
  inkSoft: 0x6b5560,
  wall: 0xf6e9d3,
  wallLine: 0xeedfc5,
  wallDot: 0xe5d5cb,
  sageLight: 0xc9d8c1,
  sageLine: 0xb3c6ab,
  sage: 0x9cb59a,
  sageDark: 0x7a9a7c,
  baseboard: 0xf1dfc2,
  floor: 0xcf9a69,
  floorLine: 0xb88452,
  wood: 0xc58f60,
  woodLight: 0xe6c897,
  woodDark: 0xa5734a,
  cream: 0xfbf1de,
  purple: 0x9a86b0,
  purpleDark: 0x7d6a94,
  orange: 0xf2a66a,
  orangeDark: 0xd98a52,
  pink: 0xf2a7a7,
  bark: 0x8a5e42,
  water: 0xcfe6ee,
  kibble: 0xb5774c,
}

// Texture pixels per game pixel. The camera never zooms past 3×, so at
// most zoom one texture pixel = one screen pixel.
export const RES = 3

// A tiny drawing kit on top of Phaser Graphics, offset so negative
// coordinates (the wall/floor beyond the room's edges) fit in the texture,
// and scaled up by RES.
function kit(g, ox, oy) {
  const R = RES
  const rect = (x, y, w, h, color) => g.fillStyle(color).fillRect((x + ox) * R, (y + oy) * R, w * R, h * R)
  return {
    rect,
    // a box with a 1 px ink outline
    box: (x, y, w, h, color) => {
      rect(x, y, w, h, C.ink)
      rect(x + 1, y + 1, w - 2, h - 2, color)
    },
    tri: (x1, y1, x2, y2, x3, y3, color) =>
      g.fillStyle(color).fillTriangle((x1 + ox) * R, (y1 + oy) * R, (x2 + ox) * R, (y2 + oy) * R, (x3 + ox) * R, (y3 + oy) * R),
    circle: (x, y, r, color) => g.fillStyle(color).fillCircle((x + ox) * R, (y + oy) * R, r * R),
    ellipse: (x, y, w, h, color) => g.fillStyle(color).fillEllipse((x + ox) * R, (y + oy) * R, w * R, h * R),
  }
}

// The whole room background, as one texture covering x −280…600, y −120…320
// (wall and floor carry on past the room for wide screens, and the floor
// runs on below, for when an open panel lifts the room). In texture pixels
// that's 2640 × 1320, safely under the 4096 limit of most GPUs.
export const ROOM_TEX = { x: -280, y: -120, w: 880, h: 440 }

export function drawRoom(g) {
  const { rect, box, tri, circle, ellipse } = kit(g, -ROOM_TEX.x, -ROOM_TEX.y)
  const L = ROOM_TEX.x
  const W = ROOM_TEX.w

  // wall + wallpaper (faint stripes and dots)
  rect(L, ROOM_TEX.y, W, 98 - ROOM_TEX.y, C.wall)
  for (let x = L; x < L + W; x += 10) rect(x, ROOM_TEX.y, 1, 96 - ROOM_TEX.y, C.wallLine)
  for (let y = ROOM_TEX.y + 4; y < 92; y += 12) for (let x = L + ((y / 12) % 2 ? 5 : 0); x < L + W; x += 20) rect(x + 2, y, 1, 1, C.wallDot)

  // wainscot, baseboard
  rect(L, 96, W, 1, C.sageDark)
  rect(L, 97, W, 21, C.sageLight)
  for (let x = L; x < L + W; x += 20) rect(x, 100, 1, 16, C.sageLine)
  rect(L, 118, W, 1, C.inkSoft)
  rect(L, 119, W, 3, C.baseboard)
  rect(L, 122, W, 1, C.inkSoft)

  // wooden floor: plank rows get taller toward you, which fakes depth
  rect(L, 123, W, 200, C.floor)
  const rows = [123, 129, 136, 144, 153, 163, 175, 189, 205, 224, 246, 270, 296]
  rows.forEach((y, i) => {
    if (i > 0) rect(L, y, W, 1, C.floorLine)
    const next = rows[i + 1] ?? 322
    for (let x = L + ((i * 17) % 48); x < L + W; x += 48) rect(x, y, 1, next - y, C.floorLine)
  })

  // ── window ──
  rect(24, 8, 82, 2, C.ink) // curtain rod
  box(34, 14, 60, 64, C.woodLight)
  rect(38, 18, 52, 12, 0xf8dcbf) // sky bands
  rect(38, 30, 52, 12, 0xfae6cc)
  rect(38, 42, 52, 16, 0xeef0d8)
  circle(52, 28, 5, 0xfff4d6) // sun
  for (let x = 38; x < 90; x++) {
    const back = 56 + Math.round(3 * Math.sin(x / 7))
    rect(x, back, 1, 74 - back, 0xbcd0b4)
    const front = 64 + Math.round(2 * Math.sin(x / 5 + 1))
    rect(x, front, 1, 74 - front, C.sage)
  }
  rect(74, 46, 2, 20, C.bark) // a little autumn tree
  circle(75, 40, 8, C.orange)
  circle(81, 46, 5, C.orangeDark)
  circle(69, 46, 5, C.orange)
  rect(63, 18, 2, 56, C.woodLight) // window bars
  rect(38, 45, 52, 2, C.woodLight)
  rect(30, 78, 68, 4, C.ink) // sill
  rect(31, 78, 66, 3, C.wood)
  for (const cx of [26, 92]) {
    // curtains
    rect(cx, 10, 10, 76, C.ink)
    rect(cx + 1, 10, 8, 75, C.purple)
    rect(cx + 3, 12, 1, 70, C.purpleDark)
    rect(cx + 6, 12, 1, 70, C.purpleDark)
    rect(cx, 50, 10, 3, C.sage)
  }

  // ── framed paw print above the desk ──
  box(250, 28, 26, 22, C.wood)
  rect(253, 31, 20, 16, C.cream)
  rect(260, 39, 6, 5, C.orange)
  for (const [x, y] of [[257, 36], [260, 34], [264, 34], [267, 36]]) rect(x, y, 2, 2, C.orange)

  // ── plant ──
  tri(120, 111, 106, 88, 115, 90, C.sage)
  tri(120, 111, 134, 86, 126, 90, C.sage)
  tri(120, 111, 118, 78, 124, 80, C.sageDark)
  tri(120, 111, 104, 100, 112, 98, C.sageDark)
  tri(120, 111, 136, 98, 130, 97, C.sageDark)
  box(110, 109, 20, 4, 0xf3bb90) // pot rim
  box(112, 112, 16, 12, 0xeba476)
  rect(113, 116, 14, 1, C.cream)

  // ── rug ──
  ellipse(146, 158, 96, 17, C.ink)
  ellipse(146, 158, 94, 15, C.purple)
  for (let a = 0; a < Math.PI * 2; a += Math.PI / 14) rect(146 + Math.round(Math.cos(a) * 38), 158 + Math.round(Math.sin(a) * 5), 2, 1, C.cream)

  // ── cushion at the desk ──
  box(SPOTS.desk - 14, FEET_Y - 1, 30, 5, C.purple)

  // ── low desk: its top is exactly where the sprite's book lies ──
  box(DESK.x, DESK.top - 1, DESK.w, 5, C.wood)
  rect(DESK.x + 1, DESK.top, DESK.w - 2, 1, 0xd9a678)
  rect(DESK.x + 2, DESK.top + 4, DESK.w - 4, 3, C.woodDark)
  box(DESK.x + 4, DESK.top + 6, 4, 9, C.woodDark)
  box(DESK.x + DESK.w - 8, DESK.top + 6, 4, 9, C.woodDark)
  // mug
  box(MUG.x, MUG.y, 7, 9, C.cream)
  rect(MUG.x + 1, MUG.y + 3, 5, 2, C.purple)
  rect(MUG.x + 7, MUG.y + 2, 2, 1, C.ink)
  rect(MUG.x + 8, MUG.y + 2, 1, 4, C.ink)
  rect(MUG.x + 7, MUG.y + 5, 2, 1, C.ink)
  // lamp
  box(LAMP.x - 6, DESK.top - 4, 12, 4, C.purple)
  rect(LAMP.x - 1, LAMP.glowY - 2, 2, DESK.top - LAMP.glowY - 1, C.ink)
  box(LAMP.x - 8, LAMP.glowY - 10, 16, 8, C.sage)
  box(LAMP.x - 5, LAMP.glowY - 13, 10, 4, C.sage)
  rect(LAMP.x - 4, LAMP.glowY - 2, 8, 2, 0xfff1c4)
}

// Small props that change during the day get their own textures
// (also drawn at RES; show them with .setScale(1 / RES)).
export function drawProps(scene) {
  const make = (key, w, h, draw) => {
    const g = scene.make.graphics({}, false)
    draw(kit(g, 0, 0))
    g.generateTexture(key, w * RES, h * RES)
    g.destroy()
  }
  // an empty food bowl (hidden while the eat animation shows its own bowl)
  make('bowl', 14, 7, ({ rect, box }) => {
    box(0, 2, 14, 5, C.sage)
    rect(3, 1, 3, 2, C.kibble)
    rect(7, 0, 3, 3, C.kibble)
  })
  // a yarn ball (hidden while the play animation shows its own)
  make('yarn', 8, 8, ({ circle, rect }) => {
    circle(4, 4, 4, C.ink)
    circle(4, 4, 3, C.purple)
    rect(2, 3, 4, 1, C.purpleDark)
    rect(3, 5, 3, 1, C.purpleDark)
  })
  make('leaf', 3, 2, ({ rect }) => rect(0, 0, 3, 2, 0xffffff))
  make('pixel', 1, 1, ({ rect }) => rect(0, 0, 1, 1, 0xffffff))

  // the lamp's soft glow (a smooth gradient on purpose — light isn't pixels)
  const glow = scene.textures.createCanvas('glow', 128, 128)
  const ctx = glow.getContext()
  const grad = ctx.createRadialGradient(64, 64, 0, 64, 64, 64)
  grad.addColorStop(0, 'rgba(255, 208, 138, 0.9)')
  grad.addColorStop(0.45, 'rgba(255, 184, 112, 0.3)')
  grad.addColorStop(1, 'rgba(255, 184, 112, 0)')
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, 128, 128)
  glow.refresh()
}

// where the room's own bowl / yarn sit (bottom edge), lined up with the ones
// drawn inside the eat / play frames: HD frame rows 104–114 and 100–117,
// i.e. down to 5 and 6 game px below the feet
export const BOWL_POS = { x: SPOTS.bowl + PROP_DX, y: FEET_Y + 5 }
export const YARN_POS = { x: SPOTS.play + PROP_DX, y: FEET_Y + 6 }
