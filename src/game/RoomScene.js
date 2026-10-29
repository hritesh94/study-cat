import Phaser from 'phaser'
import { CatBrain } from './catBrain'
import { PROP_ANIMS, animKey, baseName } from './catAnims'
import { BOWL_POS, C, drawProps, drawRoom, RES, ROOM_TEX, YARN_POS } from './roomArt'
import { CAT_SCALE, FEET_Y, HEAD_TOP, LAMP, MUG, ROOM_W, SPOTS, VIEW_BOTTOM } from './layout'
import { RoomProgressLayer, roomKey } from './RoomProgressLayer'

const DEPTH = { room: 0, leaves: 1, props: 2, light: 8, glow: 9, cat: 10 }
const BASE = 'game/cat/'
const ROOM_BASE = 'game/' // room.json's files are "room/…"
const MAX_ZOOM = 3 // 64 game px × 3 = 192 screen px = the HD art at 1.5×
const MIN_VIEW_W = 130 // on phones, always show at least this much room across

const catKey = (breed) => `cat-${breed}`
const outfitKey = (outfit) => `outfit-${outfit}`

// The one Phaser scene: the cozy room + the cat (+ its outfit).
// React talks to it through `bridge` (see GameCanvas.jsx).
export class RoomScene extends Phaser.Scene {
  constructor(bridge) {
    super('room')
    this.bridge = bridge
    this.inset = 0 // how much of the bottom the timer panel covers (screen px)
    this.zoomNow = 1
  }

  preload() {
    // Read study-cat.json first; as soon as it's in, queue only the breed and
    // outfit we need right now. Others load the first time they're picked
    // (each sheet is ~14 MB of graphics memory, so loading all 10 up front
    // would be ~140 MB — too much for many phones).
    const look = this.bridge.look ?? {}
    this.load.json('catMeta', `${BASE}study-cat.json`)
    this.load.once('filecomplete-json-catMeta', (key, type, meta) => {
      this.meta = meta
      this.look = this.validLook(look)
      this.queueSheets(this.look)
    })
    // the room art (shelf, books, jar, plant, tub): small, so all of it now
    this.load.json('roomMeta', `${ROOM_BASE}room/room.json`)
    this.load.once('filecomplete-json-roomMeta', (key, type, roomMeta) => {
      this.roomMeta = roomMeta
      for (const [name, item] of Object.entries(roomMeta.items)) this.load.image(roomKey(name), ROOM_BASE + item.file)
    })
  }

  create() {
    const meta = this.meta
    this.ensureAnims(this.look.breed)

    // room background, baked once into a texture (drawn at RES, shown at 1/RES)
    const g = this.make.graphics({}, false)
    drawRoom(g)
    g.generateTexture('room', ROOM_TEX.w * RES, ROOM_TEX.h * RES)
    g.destroy()
    drawProps(this)
    const art = (x, y, key) => this.add.image(x, y, key).setScale(1 / RES)
    art(ROOM_TEX.x, ROOM_TEX.y, 'room').setOrigin(0).setDepth(DEPTH.room)

    // props that come and go
    this.props = {
      bowl: art(BOWL_POS.x, BOWL_POS.y, 'bowl').setOrigin(0.5, 1).setDepth(DEPTH.props),
      yarn: art(YARN_POS.x, YARN_POS.y, 'yarn').setOrigin(0.5, 1).setDepth(DEPTH.props),
    }
    // the tub: same frame size and origin as the cat, on the tub spot, so the
    // tub drawn inside the bath_* frames lands exactly on it
    const tub = this.roomMeta.items.tub
    this.props.tub = this.add.image(SPOTS.tub, FEET_Y, roomKey('tub')).setOrigin(tub.origin.x, tub.origin.y)
    this.props.tub.setScale(CAT_SCALE).setDepth(DEPTH.props)

    // bookshelf, coin jar and plant (see roomProgress.js)
    this.progress = new RoomProgressLayer(this, DEPTH.props, this.roomMeta)

    this.makeWindowLife()
    this.makeSteam()
    this.makeLighting()

    // the cat — feet on the origin, as the pack's README says
    const o = meta.origin
    const sprite = (key) => this.add.sprite(SPOTS.rug, FEET_Y, key, 0).setOrigin(o.x, o.y).setScale(CAT_SCALE)
    this.cat = sprite(catKey(this.look.breed)).setDepth(DEPTH.cat)
    this.cat.setInteractive({ pixelPerfect: true, useHandCursor: true })
    this.cat.on('pointerdown', () => {
      this.brain.poke()
      this.bridge.onCatTap?.()
    })
    // the outfit: a second sprite glued on top of the cat (see syncOutfit)
    this.outfit = sprite(catKey(this.look.breed)).setVisible(false)
    this.applyOutfit(this.look.outfit)

    this.brain = new CatBrain(this, this.cat, {
      key: (name) => animKey(this.look.breed, name),
      info: (name) => meta.animations[name],
      onBusy: (busy) => this.bridge.onBusy?.(busy),
      onMeow: () => this.bridge.onMeow?.(),
      onChange: (state) =>
        this.bridge.onState?.({ ...state, ...this.look, breeds: Object.keys(meta.breeds), outfits: Object.keys(meta.outfits) }),
    })

    // Glue the outfit to the cat right before every draw (after all game
    // logic has run, so it can never be a frame behind), and hide the room's
    // bowl / yarn / tub while the frames on screen have their own.
    this.game.events.on('prerender', this.syncCat, this)
    this.events.once('destroy', () => {
      this.game.events.off('prerender', this.syncCat, this)
      this.brain.destroy()
    })
    this.scale.on('resize', () => this.layoutCamera(true))
    this.layoutCamera(true)
    this.bridge.ready?.(this)
  }

  // ── breeds and outfits ──
  validLook({ breed, outfit } = {}) {
    return {
      breed: this.meta.breeds[breed] ? breed : 'orange',
      outfit: outfit && this.meta.outfits[outfit] ? outfit : null,
    }
  }
  sheet(key, image) {
    if (!this.textures.exists(key)) {
      this.load.spritesheet(key, BASE + image, { frameWidth: this.meta.frameWidth, frameHeight: this.meta.frameHeight })
    }
  }
  queueSheets({ breed, outfit }) {
    this.sheet(catKey(breed), this.meta.breeds[breed].image)
    if (outfit) this.sheet(outfitKey(outfit), this.meta.outfits[outfit].image)
  }
  // one set of animations per breed: "<breed>:<name>", from the JSON's list
  ensureAnims(breed) {
    for (const [name, a] of Object.entries(this.meta.animations)) {
      const key = animKey(breed, name)
      if (this.anims.exists(key)) continue
      this.anims.create({
        key,
        frames: this.anims.generateFrameNumbers(catKey(breed), { start: a.start, end: a.start + a.frames - 1 }),
        frameRate: a.fps,
        repeat: a.loop ? -1 : 0,
      })
    }
  }

  // Change breed and/or outfit. Loads sheets the first time they're used.
  setLook(next) {
    const look = this.validLook(next)
    const wanted = (this.lookRequest = look)
    const apply = () => {
      if (this.lookRequest !== wanted) return // a newer pick won
      if (look.breed !== this.look.breed) this.applyBreed(look.breed)
      if (look.outfit !== this.look.outfit) this.applyOutfit(look.outfit)
      this.look = look
      this.brain.emit()
    }
    this.queueSheets(look)
    if (this.load.list.size > 0) {
      this.load.once('complete', apply)
      this.load.start()
    } else apply()
  }
  // Swap the breed without losing the cat's place: same animation, same frame.
  applyBreed(breed) {
    this.ensureAnims(breed)
    this.look = { ...this.look, breed }
    const current = this.cat.anims.currentAnim
    if (!current) return this.cat.setTexture(catKey(breed), this.cat.frame.name)
    const frameIndex = Math.max(0, (this.cat.anims.currentFrame?.index ?? 1) - 1)
    this.cat.play({ key: animKey(breed, baseName(current.key)), startFrame: frameIndex })
  }
  applyOutfit(outfit) {
    this.look = { ...this.look, outfit }
    if (outfit) this.outfit.setTexture(outfitKey(outfit), this.cat.frame.name)
    this.outfit.setVisible(!!outfit)
  }
  syncCat() {
    // As in the pack's README: same position, flip, frame number, one layer up.
    const { cat, outfit } = this
    if (outfit.visible) {
      outfit.setPosition(cat.x, cat.y)
      outfit.setFlipX(cat.flipX)
      outfit.setFrame(cat.frame.name)
      outfit.setDepth(cat.depth + 1)
    }
    // the frame on screen (a finished animation keeps showing its last one)
    const shown = cat.anims.currentAnim ? baseName(cat.anims.currentAnim.key) : null
    for (const [prop, anims] of Object.entries(PROP_ANIMS)) this.props[prop].setVisible(!anims.includes(shown))
  }

  // ── camera: floor kept above the timer panel, cat at most 1.5× its art ──
  targetZoom() {
    const { width, height } = this.scale
    const fit = Math.min((height - this.inset) / 140, width / MIN_VIEW_W, MAX_ZOOM)
    return Phaser.Math.Clamp(fit, 1, MAX_ZOOM)
  }
  layoutCamera(snap = false) {
    const cam = this.cameras.main
    const { width, height } = this.scale
    const target = this.targetZoom()
    this.zoomNow = snap ? target : Phaser.Math.Linear(this.zoomNow, target, 0.08)
    if (Math.abs(this.zoomNow - target) < 0.002) this.zoomNow = target
    const zoom = this.zoomNow
    cam.setZoom(zoom)
    const viewW = width / zoom
    const viewH = height / zoom
    // the world row VIEW_BOTTOM sits right at the top edge of the panel
    const top = VIEW_BOTTOM - (height - this.inset) / zoom
    // the whole room fits? center it. Otherwise follow the cat (phones).
    let cx = ROOM_W / 2
    if (viewW < ROOM_W) {
      const want = Phaser.Math.Clamp(this.cat?.x ?? cx, viewW / 2, ROOM_W - viewW / 2)
      cx = snap || this.camX === undefined ? want : Phaser.Math.Linear(this.camX, want, 0.06)
    }
    this.camX = cx
    cam.centerOn(cx, top + viewH / 2)
  }

  // ── living details ──
  makeWindowLife() {
    // leaves drift down from the tree, only inside the glass
    const glass = this.make.graphics({}, false).fillStyle(0xffffff).fillRect(38, 18, 52, 56)
    const mask = glass.createGeometryMask()
    const colors = [C.orange, C.orangeDark, C.sage]
    const drop = () => {
      const leaf = this.add.image(Phaser.Math.Between(62, 86), 36, 'leaf').setScale(1 / RES)
      leaf.setTint(Phaser.Utils.Array.GetRandom(colors)).setDepth(DEPTH.leaves).setMask(mask)
      const sway = Phaser.Math.FloatBetween(0, Math.PI * 2)
      const drift = Phaser.Math.Between(-30, -8)
      this.tweens.addCounter({
        from: 0,
        to: 1,
        duration: Phaser.Math.Between(5000, 8000),
        onUpdate: (tw) => {
          const t = tw.getValue()
          leaf.y = 36 + t * 40
          leaf.x += Math.sin(sway + t * 12) * 0.25 + drift * 0.0012
          leaf.angle = Math.sin(sway + t * 10) * 40
        },
        onComplete: () => leaf.destroy(),
      })
      this.time.delayedCall(Phaser.Math.Between(1400, 3200), drop)
    }
    drop()
    // dusk tint over the glass for study time
    this.dusk = this.add.rectangle(38, 18, 52, 56, C.purpleDark, 1).setOrigin(0).setAlpha(0).setDepth(DEPTH.leaves + 0.5)
  }

  makeSteam() {
    const puff = () => {
      const p = this.add.image(MUG.x + Phaser.Math.Between(2, 5), MUG.y - 1, 'pixel').setScale(1 / RES).setDepth(DEPTH.props)
      p.setAlpha(0.9)
      this.tweens.add({ targets: p, y: MUG.y - 10, x: p.x + Phaser.Math.Between(-2, 2), alpha: 0, duration: 1800, onComplete: () => p.destroy() })
      this.time.delayedCall(500, puff)
    }
    puff()
  }

  makeLighting() {
    const big = [ROOM_TEX.x, ROOM_TEX.y, ROOM_TEX.w, ROOM_TEX.h]
    this.dim = this.add.rectangle(...big, 0x3b2d4a).setOrigin(0).setAlpha(0).setDepth(DEPTH.light)
    this.bright = this.add.rectangle(...big, 0xfff8e6).setOrigin(0).setAlpha(0).setDepth(DEPTH.light)
    this.glow = this.add.image(LAMP.x, LAMP.glowY, 'glow').setScale(1.6).setAlpha(0.35).setDepth(DEPTH.glow)
    this.glow.setBlendMode(Phaser.BlendModes.ADD)
  }

  // 'focus' (studying) dims the room and warms the lamp; 'break' brightens it.
  // how you're doing: { subjects, todayCoins, dailyCap, streak, broken }
  setProgress(data) {
    if (data) this.progress?.set(data)
  }

  setMood(mood) {
    const to = {
      focus: { dim: 0.28, bright: 0, glow: 0.85, dusk: 0.35 },
      break: { dim: 0, bright: 0.14, glow: 0.2, dusk: 0 },
      idle: { dim: 0, bright: 0, glow: 0.35, dusk: 0 },
    }[mood]
    this.tweens.add({ targets: this.dim, alpha: to.dim, duration: 1200 })
    this.tweens.add({ targets: this.bright, alpha: to.bright, duration: 1200 })
    this.tweens.add({ targets: this.glow, alpha: to.glow, duration: 1200 })
    this.tweens.add({ targets: this.dusk, alpha: to.dusk, duration: 1200 })
  }

  setInset(px) {
    this.inset = px
  }

  // slow motion for debugging: animations, tweens, timers and particles together
  setSpeed(s) {
    this.anims.globalTimeScale = s
    this.tweens.timeScale = s
    this.time.timeScale = s
  }

  update() {
    this.layoutCamera()
    // tell React where the cat's head is on screen, for the speech bubble
    const cam = this.cameras.main
    const view = cam.worldView
    const x = (this.cat.x - view.x) * cam.zoom
    const y = (this.cat.y - (HEAD_TOP[this.brain.posture] ?? 44) - view.y) * cam.zoom
    this.bridge.onCatScreen?.(x, y)
  }
}
