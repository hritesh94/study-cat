// ───────────────────────── Room progress: one config ─────────────────────────
// The room shows how you're doing:
//   • a bookshelf with one book per subject, thicker the more hours it has
//   • a coin jar that fills up with today's coins (sparkles when full)
//   • a plant that grows with your streak (and droops when it breaks)
//
// Everything that decides how they look is in this file. Positions are in
// room pixels (the room is 320 wide; the floor line where the cat stands
// is y = 150, the wall is above y ≈ 96).
//
// ART: every `art` is null for now, so simple placeholder shapes are
// drawn. To use real art, put a PNG in public/game/room/ and write its
// path here (e.g. art: '/game/room/plant-sprout.png'). The image is
// drawn at the size given next to it, anchored at the bottom centre. No
// other code needs to change.
// ──────────────────────────────────────────────────────────────────────────

export const ROOM_PROGRESS = {
  bookshelf: {
    // the shelf board, on the empty wall between the plant and the picture
    x: 146, // left end
    y: 64, // top of the board = where the books stand
    width: 98, // books fill it from the left; the coin jar stands at the right end
    art: null, // whole shelf image (width × 12), drawn under the books
    book: {
      height: [13, 18], // books get a height in this range (it varies, like real books)
      gap: 0.6,
      art: null, // one book image, tinted with the subject's colour and stretched to size
    },
    // a book's thickness from that subject's total study hours
    thickness: [
      { hours: 0, width: 3 },
      { hours: 1, width: 4 },
      { hours: 3, width: 5 },
      { hours: 8, width: 6.5 },
      { hours: 20, width: 8 },
      { hours: 50, width: 10 },
    ],
  },

  coinJar: {
    x: 236, // bottom centre, standing on the right end of the shelf…
    y: 64, // …so the same height as the shelf
    width: 12,
    height: 15,
    art: null, // the empty glass jar, drawn in front of the coins
    coinColor: 0xf3c34f,
    sparkles: 5, // how many sparkles twinkle when today's jar is full
  },

  plant: {
    x: 46, // bottom centre of the pot, on the window sill
    y: 78,
    // which stage shows: the highest one whose `streak` you've reached
    stages: [
      { streak: 0, name: 'seed', art: null, size: [12, 10] },
      { streak: 3, name: 'sprout', art: null, size: [12, 16] },
      { streak: 7, name: 'leafy', art: null, size: [14, 22] },
      { streak: 14, name: 'bushy', art: null, size: [18, 26] },
      { streak: 30, name: 'blooming', art: null, size: [20, 30] },
    ],
    // when a streak broke (you had one, now it's 0): tilt a little, go pale
    droop: { angle: -10, tint: 0xd8cf9a },
  },
}

// ── small helpers the room (and tests) use ──

export function bookWidth(hours) {
  const t = ROOM_PROGRESS.bookshelf.thickness
  return t.reduce((w, step) => (hours >= step.hours ? step.width : w), t[0].width)
}

// a stable, "random-looking" height per book, so it doesn't jump around
export function bookHeight(index) {
  const [lo, hi] = ROOM_PROGRESS.bookshelf.book.height
  return lo + ((index * 7 + 3) % 6) * ((hi - lo) / 5)
}

export function plantStage(streak) {
  const stages = ROOM_PROGRESS.plant.stages
  let index = 0
  stages.forEach((s, i) => {
    if (streak >= s.streak) index = i
  })
  return { index, ...stages[index] }
}

// 0 … 1
export const jarFill = (todayCoins, dailyCap) => (dailyCap > 0 ? Math.min(1, Math.max(0, todayCoins / dailyCap)) : 0)
