import Phaser from 'phaser'
import { CatBrain } from './catBrain'
import { BOWL_POS, C, drawProps, drawRoom, ROOM_TEX, YARN_POS } from './roomArt'
import { FEET_Y, HEAD_TOP, LAMP, MUG, ROOM_W, SPOTS, VIEW_BOTTOM } from './layout'

const DEPTH = { room: 0, leaves: 1, props: 2, light: 8, glow: 9, cat: 10, front: 20 }

// The one Phaser scene: the cozy room + the cat.
// React talks to it through `bridge` (see GameCanvas.jsx).
export class RoomScene extends Phaser.Scene {
  constructor(bridge) {
    super('room')
    this.bridge = bridge
    this.inset = 0 // how much of the bottom the timer panel covers (screen px)
    this.zoomNow = 3
  }

  preload() {
    this.load.spritesheet('cat', 'game/cat/study-cat.png', { frameWidth: 64, frameHeight: 64 })
    this.load.json('catAnims', 'game/cat/study-cat.json')
  }

  create() {
    // animations, straight from the pack's JSON (as its README shows)
    const meta = this.cache.json.get('catAnims')
    for (const [key, a] of Object.entries(meta.animations)) {
      this.anims.create({
        key,
        frames: this.anims.generateFrameNumbers('cat', { start: a.start, end: a.start + a.frames - 1 }),
        frameRate: a.fps,
        repeat: a.loop ? -1 : 0,
      })
    }

    // room background, baked once into a texture
    const g = this.make.graphics({}, false)
    drawRoom(g)
    g.generateTexture('room', ROOM_TEX.w, ROOM_TEX.h)
    g.destroy()
    drawProps(this)
    this.add.image(ROOM_TEX.x, ROOM_TEX.y, 'room').setOrigin(0).setDepth(DEPTH.room)

    // props that come and go
    this.props = {
      bowl: this.add.image(BOWL_POS.x, BOWL_POS.y, 'bowl').setOrigin(0.5, 1).setDepth(DEPTH.props),
      yarn: this.add.image(YARN_POS.x, YARN_POS.y, 'yarn').setOrigin(0.5, 1).setDepth(DEPTH.props),
    }
    this.add.image(SPOTS.tub, FEET_Y - 3, 'tubBack').setDepth(DEPTH.props)
    this.tubFront = this.add.image(SPOTS.tub, FEET_Y - 2, 'tubFront').setOrigin(0.5, 0).setDepth(DEPTH.props)

    this.makeWindowLife()
    this.makeSteam()
    this.makeLighting()
    this.bubbles = this.add.particles(0, 0, 'bubble', {
      x: { min: SPOTS.tub - 14, max: SPOTS.tub + 14 },
      y: FEET_Y - 2,
      speedY: { min: -18, max: -8 },
      speedX: { min: -4, max: 4 },
      lifespan: 1400,
      scale: { start: 0.6, end: 1 },
      alpha: { start: 1, end: 0 },
      frequency: 140,
      emitting: false,
    })
    this.bubbles.setDepth(DEPTH.front + 1)

    // the cat — feet on the origin, as the pack's README says
    const o = meta.origin
    this.cat = this.add.sprite(SPOTS.rug, FEET_Y, 'cat', 0).setOrigin(o.x, o.y).setDepth(DEPTH.cat)
    this.cat.setInteractive({ pixelPerfect: true, useHandCursor: true })
    this.cat.on('pointerdown', () => this.brain.poke())

    this.brain = new CatBrain(this, this.cat, {
      onBusy: (busy) => this.bridge.onBusy?.(busy),
      onMeow: () => this.bridge.onMeow?.(),
      onChange: (state) => this.bridge.onState?.(state),
      setProp: (name, visible) => this.props[name].setVisible(visible),
      setTub: (inTub) => this.tubFront.setDepth(inTub ? DEPTH.front : DEPTH.props),
      setBubbles: (on) => (on ? this.bubbles.start() : this.bubbles.stop()),
    })

    this.events.once('destroy', () => this.brain.destroy())
    this.scale.on('resize', () => this.layoutCamera(true))
    this.layoutCamera(true)
    this.bridge.ready?.(this)
  }

  // ── camera: integer zoom (crisp pixels), floor kept above the timer panel ──
  targetZoom() {
    const { width, height } = this.scale
    let zoom = Phaser.Math.Clamp(Math.floor((height - this.inset) / 140), 2, 4)
    // narrow phones: show at least ~120 px of room across, so it's not all cat
    if (zoom > 3 && width / zoom < 120) zoom = 3
    return zoom
  }
  layoutCamera(snap = false) {
    const cam = this.cameras.main
    const { width, height } = this.scale
    const target = this.targetZoom()
    this.zoomNow = snap ? target : Phaser.Math.Linear(this.zoomNow, target, 0.08)
    if (Math.abs(this.zoomNow - target) < 0.01) this.zoomNow = target
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
      const leaf = this.add.image(Phaser.Math.Between(62, 86), 36, 'leaf').setTint(Phaser.Utils.Array.GetRandom(colors))
      leaf.setDepth(DEPTH.leaves).setMask(mask)
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
      const p = this.add.image(MUG.x + Phaser.Math.Between(2, 5), MUG.y - 1, 'pixel').setDepth(DEPTH.props).setAlpha(0.9)
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
    this.bubbles.timeScale = s
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
