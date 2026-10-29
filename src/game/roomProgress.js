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
// ART: every `art` names an image in public/game/room/room.json (from the
// sprite pack, made by tools/cat-generator-hd/generator/props.py). room.json
// gives each image's file, size and ORIGIN: the point that touches the
// shelf, sill or floor. The image is drawn with that origin at the x, y
// below, at the cat's scale, so the room art and the cat match in size.
// ──────────────────────────────────────────────────────────────────────────

import { CAT_SCALE } from './layout'

export const ROOM_PROGRESS = {
  scale: CAT_SCALE, // room art is drawn at the same scale as the cat sheets

  bookshelf: {
    // the middle of the plank's top (the shelf's origin), on the empty wall
    // between the plant and the picture. Books stand on this line.
    x: 190,
    y: 64,
    art: 'shelf',
    gap: 1, // art pixels between two books
    // a book's thickness from that subject's total study hours: the
    // thickest one whose `hours` you've reached. Each book is a cover
    // (light grey, tinted with the subject's colour) with pages on top.
    books: [
      { hours: 0, cover: 'book_0_cover', pages: 'book_0_pages' },
      { hours: 1, cover: 'book_1_cover', pages: 'book_1_pages' },
      { hours: 3, cover: 'book_2_cover', pages: 'book_2_pages' },
      { hours: 8, cover: 'book_3_cover', pages: 'book_3_pages' },
      { hours: 20, cover: 'book_4_cover', pages: 'book_4_pages' },
      { hours: 50, cover: 'book_5_cover', pages: 'book_5_pages' },
    ],
  },

  coinJar: {
    // standing on the right end of the shelf (books stop before it)
    x: 213,
    y: 64,
    // jar_00 … jar_10 = 0 % … 100 % full; the closest one is shown
    levels: ['jar_00', 'jar_01', 'jar_02', 'jar_03', 'jar_04', 'jar_05', 'jar_06', 'jar_07', 'jar_08', 'jar_09', 'jar_10'],
    // looped on top when today's jar is full (same origin as the jar)
    sparkle: { frames: ['jar_sparkle_0', 'jar_sparkle_1', 'jar_sparkle_2', 'jar_sparkle_3'], fps: 6 },
  },

  plant: {
    x: 46, // the middle of the pot's bottom, on the window sill
    y: 78,
    // which stage shows: the highest one whose `streak` you've reached.
    // `droopy`: how it looks after that streak broke (a seed can't droop).
    stages: [
      { streak: 0, name: 'seed', art: 'plant_0_seed', droopy: null },
      { streak: 3, name: 'sprout', art: 'plant_1_sprout', droopy: 'plant_1_sprout_droopy' },
      { streak: 7, name: 'leafy', art: 'plant_2_leafy', droopy: 'plant_2_leafy_droopy' },
      { streak: 14, name: 'bushy', art: 'plant_3_bushy', droopy: 'plant_3_bushy_droopy' },
      { streak: 30, name: 'blooming', art: 'plant_4_blooming', droopy: 'plant_4_blooming_droopy' },
    ],
  },
}

// ── small helpers the room (and tests) use ──

// the book for a subject with this many hours
export function bookFor(hours) {
  const books = ROOM_PROGRESS.bookshelf.books
  return books.reduce((pick, b) => (hours >= b.hours ? b : pick), books[0])
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

// the jar image closest to that fill
export const jarLevel = (fill) => ROOM_PROGRESS.coinJar.levels[Math.round(fill * (ROOM_PROGRESS.coinJar.levels.length - 1))]
