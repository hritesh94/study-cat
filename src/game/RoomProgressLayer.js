// Draws the room's progress objects (bookshelf, coin jar, plant) from
// roomProgress.js. Each one uses its `art` image when the config gives
// one, and a simple placeholder shape when it doesn't.
import { C } from './roomArt'
import { ROOM_PROGRESS as P, bookHeight, bookWidth, jarFill, plantStage } from './roomProgress'

const LINE = 0.7 // outline thickness in room pixels

export class RoomProgressLayer {
  constructor(scene, depth) {
    this.scene = scene
    this.depth = depth
    this.data = { subjects: [], todayCoins: 0, dailyCap: 0, streak: 0, broken: false }
    this.objects = []
    this.sparkles = []
    this.draw()
  }

  // data = { subjects: [{ name, color, minutes }], todayCoins, dailyCap, streak, broken }
  set(data) {
    this.data = { ...this.data, ...data }
    this.loadArt().then(() => this.draw())
  }

  // load any `art` images named in the config that aren't loaded yet
  loadArt() {
    const paths = [P.bookshelf.art, P.bookshelf.book.art, P.coinJar.art, ...P.plant.stages.map((s) => s.art)].filter(Boolean)
    const missing = paths.filter((p) => !this.scene.textures.exists(p))
    if (!missing.length) return Promise.resolve()
    return new Promise((resolve) => {
      for (const p of missing) this.scene.load.image(p, p)
      this.scene.load.once('complete', resolve)
      this.scene.load.start()
    })
  }

  // an art image at (x, y) = its bottom centre, w × h room pixels
  image(path, x, y, w, h) {
    const img = this.scene.add.image(x, y, path).setOrigin(0.5, 1).setDisplaySize(w, h).setDepth(this.depth)
    this.objects.push(img)
    return img
  }
  graphics() {
    const g = this.scene.add.graphics().setDepth(this.depth)
    this.objects.push(g)
    return g
  }

  draw() {
    for (const o of this.objects) o.destroy()
    for (const t of this.sparkles) t.remove()
    this.objects = []
    this.sparkles = []
    this.drawShelf()
    this.drawJar()
    this.drawPlant()
  }

  // ── bookshelf: one book per subject ──
  drawShelf() {
    const s = P.bookshelf
    if (s.art) this.image(s.art, s.x + s.width / 2, s.y + 12, s.width, 12)
    else {
      const g = this.graphics()
      g.fillStyle(C.wood).fillRect(s.x, s.y, s.width, 3)
      g.lineStyle(LINE, C.ink).strokeRect(s.x, s.y, s.width, 3)
      for (const bx of [s.x + 8, s.x + s.width - 8]) {
        // little brackets under the board
        g.fillStyle(C.woodDark).fillTriangle(bx - 3, s.y + 3, bx + 3, s.y + 3, bx, s.y + 9)
        g.lineStyle(LINE, C.ink).strokeTriangle(bx - 3, s.y + 3, bx + 3, s.y + 3, bx, s.y + 9)
      }
    }

    const room = P.coinJar.x - P.coinJar.width / 2 - 3 // books stop before the jar
    let x = s.x + 3
    const g = this.graphics()
    this.data.subjects.forEach((subject, i) => {
      const w = bookWidth(subject.minutes / 60)
      if (x + w > room) return // the shelf is full
      const h = bookHeight(i)
      const color = Number.parseInt((subject.color ?? '#c9d8c1').slice(1), 16)
      if (s.book.art) this.image(s.book.art, x + w / 2, s.y, w, h).setTint(color)
      else {
        g.fillStyle(color).fillRect(x, s.y - h, w, h)
        g.fillStyle(0xffffff, 0.45).fillRect(x + 0.6, s.y - h + 2, w - 1.2, 1) // a band on the spine
        g.fillStyle(0x000000, 0.12).fillRect(x + w - 0.8, s.y - h, 0.8, h) // a bit of shade
        g.lineStyle(LINE, C.ink).strokeRect(x, s.y - h, w, h)
      }
      x += w + s.book.gap
    })
  }

  // ── coin jar: today's coins out of the daily cap ──
  drawJar() {
    const j = P.coinJar
    const left = j.x - j.width / 2
    const top = j.y - j.height
    const fill = jarFill(this.data.todayCoins, this.data.dailyCap)
    const g = this.graphics()
    // coins inside (drawn first, so the glass sits in front)
    if (fill > 0) {
      const h = (j.height - 3) * fill
      g.fillStyle(j.coinColor).fillRect(left + 1, j.y - h, j.width - 2, h)
      g.fillStyle(0xffffff, 0.5)
      for (let cy = j.y - 2; cy > j.y - h; cy -= 2.5) g.fillRect(left + 2 + ((cy * 3) % 5), cy, 1.5, 0.7) // coin glints
    }
    if (j.art) this.image(j.art, j.x, j.y, j.width, j.height)
    else {
      g.fillStyle(0xdff0f2, 0.35).fillRoundedRect(left, top + 2, j.width, j.height - 2, 2)
      g.lineStyle(LINE, C.ink).strokeRoundedRect(left, top + 2, j.width, j.height - 2, 2)
      g.fillStyle(C.purple).fillRect(left + 1, top, j.width - 2, 2.5) // lid
      g.lineStyle(LINE, C.ink).strokeRect(left + 1, top, j.width - 2, 2.5)
      g.fillStyle(0xffffff, 0.6).fillRect(left + 1.5, top + 4, 1, j.height - 7) // shine
    }
    if (fill >= 1) this.sparkle(j)
  }

  sparkle(j) {
    for (let i = 0; i < j.sparkles; i++) {
      const star = this.graphics()
      star.fillStyle(0xfff4c2).fillPoints([
        { x: 0, y: -2 },
        { x: 0.5, y: -0.5 },
        { x: 2, y: 0 },
        { x: 0.5, y: 0.5 },
        { x: 0, y: 2 },
        { x: -0.5, y: 0.5 },
        { x: -2, y: 0 },
        { x: -0.5, y: -0.5 },
      ], true)
      const angle = (i / j.sparkles) * Math.PI * 2
      star.setPosition(j.x + Math.cos(angle) * (j.width * 0.75), j.y - j.height / 2 + Math.sin(angle) * (j.height * 0.6)).setScale(0).setDepth(this.depth + 0.1)
      this.sparkles.push(
        this.scene.tweens.add({ targets: star, scale: 1, alpha: { from: 1, to: 0.2 }, duration: 600, yoyo: true, repeat: -1, delay: i * 260, repeatDelay: 500 }),
      )
    }
  }

  // ── plant: grows with the streak ──
  drawPlant() {
    const p = P.plant
    const stage = plantStage(this.data.streak)
    const broken = this.data.broken
    if (stage.art) {
      const img = this.image(stage.art, p.x, p.y, ...stage.size)
      if (broken) img.setAngle(p.droop.angle).setTint(p.droop.tint)
      return
    }
    const leaf = broken ? p.droop.tint : C.sage
    const leafDark = broken ? 0xc2b77f : C.sageDark
    // the pot doesn't droop
    const pot = this.graphics()
    pot.fillStyle(0xeba476).fillRect(p.x - 4, p.y - 6, 8, 6)
    pot.fillStyle(0xf3bb90).fillRect(p.x - 5, p.y - 7.5, 10, 2)
    pot.lineStyle(LINE, C.ink).strokeRect(p.x - 4, p.y - 6, 8, 6).strokeRect(p.x - 5, p.y - 7.5, 10, 2)

    // the plant leans from the soil when drooping
    const g = this.graphics().setPosition(p.x, p.y - 7.5)
    if (broken) g.setAngle(p.droop.angle)
    const n = stage.index
    if (n === 0) {
      g.fillStyle(C.bark).fillEllipse(0, 0, 6, 2) // soil + a seed
      g.fillStyle(C.sageDark).fillCircle(0.5, -0.8, 0.9)
      return
    }
    const stem = [0, 5, 9, 12, 13][n]
    g.lineStyle(1, leafDark).lineBetween(0, 0, 0, -stem)
    const leaves = [0, 2, 4, 6, 6][n]
    for (let i = 0; i < leaves; i++) {
      // leaves take turns left and right, each pair a bit lower down the stem
      const side = i % 2 ? 1 : -1
      const y = -stem + 2 + Math.floor(i / 2) * ((stem - 2) / Math.ceil(leaves / 2)) + (side > 0 ? 1 : 0)
      const w = 3.2 + n * 0.7
      const h = 1.6 + n * 0.25
      g.fillStyle(i % 3 === 2 ? leafDark : leaf).fillEllipse((side * w) / 2, y, w, h)
      g.lineStyle(0.5, C.ink).strokeEllipse((side * w) / 2, y, w, h)
    }
    g.fillStyle(leaf).fillEllipse(0, -stem - 1, 2.6, 3.4) // the top bud
    if (n === 4 && !broken) {
      for (const [fx, fy] of [[-4, -stem + 2], [4, -stem + 4], [0, -stem - 2.5]]) {
        g.fillStyle(C.pink).fillCircle(fx, fy, 1.6)
        g.fillStyle(0xfff1c4).fillCircle(fx, fy, 0.6)
      }
    }
  }

  destroy() {
    for (const o of this.objects) o.destroy()
    for (const t of this.sparkles) t.remove()
  }
}
