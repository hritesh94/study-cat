// Draws the room's progress objects (bookshelf, coin jar, plant) from
// roomProgress.js, with the room art listed in public/game/room/room.json.
// RoomScene loads room.json and every image in it before the room appears.
import { ROOM_PROGRESS as P, bookFor, jarFill, jarLevel, plantStage } from './roomProgress'

// Phaser texture key of a room.json image, e.g. "room:shelf"
export const roomKey = (name) => `room:${name}`
const SPARKLE = 'room:jar-sparkle'

export class RoomProgressLayer {
  constructor(scene, depth, meta) {
    this.scene = scene
    this.depth = depth
    this.items = meta.items // from room.json
    this.data = { subjects: [], todayCoins: 0, dailyCap: 0, streak: 0, broken: false, lostStreak: 0 }
    this.objects = []
    if (!scene.anims.exists(SPARKLE)) {
      scene.anims.create({
        key: SPARKLE,
        frames: P.coinJar.sparkle.frames.map((name) => ({ key: roomKey(name) })),
        frameRate: P.coinJar.sparkle.fps,
        repeat: -1,
      })
    }
    this.draw()
  }

  // data = { subjects: [{ name, color, minutes }], todayCoins, dailyCap,
  //          streak, broken, lostStreak (how long the broken streak was) }
  set(data) {
    this.data = { ...this.data, ...data }
    this.draw()
  }

  // a room.json image with its origin at (x, y), at the cat's scale
  // (kind 'sprite' for one that plays an animation)
  image(name, x, y, kind = 'image') {
    const { origin } = this.items[name]
    const img = this.scene.add[kind](x, y, roomKey(name)).setOrigin(origin.x, origin.y).setScale(P.scale).setDepth(this.depth)
    this.objects.push(img)
    return img
  }

  draw() {
    for (const o of this.objects) o.destroy()
    this.objects = []
    this.drawShelf()
    this.drawJar()
    this.drawPlant()
  }

  // ── bookshelf: one book per subject, left to right from the shelf's left end ──
  drawShelf() {
    const s = P.bookshelf
    const shelf = this.items[s.art]
    this.image(s.art, s.x, s.y)
    const jar = this.items[P.coinJar.levels[0]]
    const end = P.coinJar.x - (jar.width * jar.origin.x * P.scale) // books stop before the jar
    let x = s.x - (shelf.usableWidthPx / 2) * P.scale // left edge of the next book
    for (const subject of this.data.subjects) {
      const book = bookFor(subject.minutes / 60)
      const w = this.items[book.cover].thicknessPx * P.scale
      if (x + w > end) break // the shelf is full
      const color = Number.parseInt((subject.color ?? '#c9d8c1').slice(1), 16)
      this.image(book.cover, x + w / 2, s.y).setTint(color)
      this.image(book.pages, x + w / 2, s.y) // on top, not tinted
      x += w + s.gap * P.scale
    }
  }

  // ── coin jar: today's coins out of the daily cap ──
  drawJar() {
    const j = P.coinJar
    const fill = jarFill(this.data.todayCoins, this.data.dailyCap)
    this.image(jarLevel(fill), j.x, j.y)
    if (fill >= 1) this.image(j.sparkle.frames[0], j.x, j.y, 'sprite').setDepth(this.depth + 0.1).play(SPARKLE)
  }

  // ── plant: grows with the streak, droops when it broke ──
  drawPlant() {
    const p = P.plant
    const { broken, streak, lostStreak } = this.data
    // a broken streak shows the plant it had grown into, wilted
    const stage = plantStage(broken ? lostStreak : streak)
    this.image(broken && stage.droopy ? stage.droopy : stage.art, p.x, p.y)
  }

  destroy() {
    for (const o of this.objects) o.destroy()
  }
}
