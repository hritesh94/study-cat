import { ANIMS, RESTING, SOFT_JOIN, baseName, path } from './catAnims'
import { FEET_Y, SPOTS, TUB_FEET_Y, WALK_SPEED, WANDER } from './layout'

const rand = (a, b) => a + Math.random() * (b - a)

// ─────────────────────────── The cat brain ───────────────────────────
// A state machine with two layers:
//
//   GOAL  what the cat should be doing overall, set from the timer:
//         'wander' | 'study' | 'sad' | 'break'   (+ 'nap' for debugging)
//   TASK  a short job on top of the goal, from the break buttons:
//         'feed' | 'play' | 'bathe'
//
// Each goal/task is a little script ("walk to the desk, sit down, start
// reading…"). The scripts can only move the cat with three moves:
//
//   once(anim)        play a one-shot animation to its last frame
//   hold(anim, secs)  play a loop, stopping only at the end of a loop
//   walkTo(x)         walk there (turning around first if needed),
//                     taking whole steps so it stops on a full stride
//
// once() refuses anything that doesn't start in the cat's current posture,
// so every change goes through a chain from the pack's README. When the goal
// changes, the current move is allowed to finish first: the cat never snaps.
// ──────────────────────────────────────────────────────────────────────
export class CatBrain {
  constructor(scene, sprite, hooks) {
    this.scene = scene
    this.cat = sprite
    this.hooks = hooks // { onBusy, onMeow, onChange, setTub, setBubbles, setProp }
    this.posture = 'stand'
    this.facing = 'right'
    this.anim = null
    this.goal = 'wander'
    this.task = null
    this.version = 0 // bumps whenever plans change; scripts check it to know they're stale
    this.clickQueued = false
    this.clicking = false
    this.paused = false
    this.busy = false
    this.violations = 0
    this.history = [] // the last animations played, newest last (handy for checking chains)
    this.pending = new Set() // cancel functions for moves in progress (used by debug)
    this.wake = null
    this.dead = false

    this.rest()
    this.run()
  }

  // ── commands from outside ──
  setGoal(goal) {
    if (goal === this.goal) return
    this.goal = goal
    if (this.task) this.task = null
    this.setBusy(false)
    this.bump()
  }
  command(task) {
    this.task = task
    this.setBusy(true)
    this.bump()
  }
  poke() {
    if (this.clicking || this.paused) return
    this.clickQueued = true
    this.bump()
  }
  destroy() {
    this.dead = true
    this.abortAll()
    this.bump()
  }

  // ── debug: play any animation directly (may break the chain on purpose) ──
  debugPlay(name) {
    this.paused = true
    this.bump()
    this.abortAll()
    this.scene.tweens.killTweensOf(this.cat)
    this.clearDebugListener()
    const info = ANIMS[name]
    this.anim = name
    this.cat.play(this.hooks.key(name))
    this.posture = info.from
    this.emit()
    if (!info.loop) {
      const event = 'animationcomplete'
      const fn = (anim) => {
        if (baseName(anim.key) !== name) return
        this.cat.off(event, fn)
        this.debugListener = null
        this.posture = info.to
        if (info.flips) this.flip()
        this.rest(true)
      }
      this.debugListener = { event, fn }
      this.cat.on(event, fn)
    }
  }
  resume() {
    if (!this.paused) return
    this.clearDebugListener()
    this.paused = false
    this.bump()
  }
  // a raw debug animation that never finished mustn't fire later on a real one
  clearDebugListener() {
    if (!this.debugListener) return
    this.cat.off(this.debugListener.event, this.debugListener.fn)
    this.debugListener = null
  }

  // ── internals ──
  bump() {
    this.version++
    const wake = this.wake
    this.wake = null
    wake?.()
  }
  stale(v) {
    return v !== null && v !== this.version
  }
  setBusy(busy) {
    if (busy === this.busy) return
    this.busy = busy
    this.hooks.onBusy?.(busy)
    this.emit()
  }
  emit() {
    this.hooks.onChange?.({
      goal: this.goal,
      task: this.task,
      posture: this.posture,
      facing: this.facing,
      anim: this.anim,
      busy: this.busy,
      paused: this.paused,
      violations: this.violations,
    })
  }
  abortAll() {
    for (const cancel of [...this.pending]) cancel()
    this.pending.clear()
  }

  // Start an animation. Complains (and counts) if it breaks the chain.
  // While debug has paused the brain, scripts can't start anything.
  start(name, force = false) {
    if (this.paused && !force) return false
    const info = ANIMS[name]
    if (info.from !== this.posture) {
      this.violations++
      console.warn(`[cat] ${name} can't start from "${this.posture}"`)
    }
    // no transition art for this join? blend it instead of cutting
    if (this.anim && this.anim !== name && (SOFT_JOIN.has(name) || SOFT_JOIN.has(this.anim))) this.hooks.crossfade?.()
    this.anim = name
    this.history.push(name)
    if (this.history.length > 60) this.history.shift()
    this.cat.play(this.hooks.key(name))
    this.emit()
    return true
  }
  // Show the resting loop for the current posture (idle, sit_idle, read…).
  rest(force = false) {
    this.start(RESTING[this.posture], force)
  }
  flip() {
    this.facing = this.facing === 'right' ? 'left' : 'right'
    this.cat.setFlipX(this.facing === 'left')
  }

  // A one-shot animation, played to its last frame. The very same moment it
  // ends we update the posture (and flip after turn_around) and start the
  // resting loop, so there's never a frame of the wrong pose.
  once(name) {
    return new Promise((resolve) => {
      const done = () => {
        this.pending.delete(cancel)
        resolve()
      }
      // listen for any completion and match by name, so swapping breed
      // mid-animation (a different Phaser key) still counts
      const onComplete = (anim) => {
        if (baseName(anim.key) !== name) return
        this.cat.off('animationcomplete', onComplete)
        const info = ANIMS[name]
        this.posture = info.to
        if (info.flips) this.flip()
        this.rest()
        done()
      }
      const cancel = () => {
        this.cat.off('animationcomplete', onComplete)
        done()
      }
      this.pending.add(cancel)
      this.cat.on('animationcomplete', onComplete)
      if (!this.start(name)) cancel()
    })
  }

  // A loop, for about `seconds`. It always stops at the end of a loop
  // (where the pose matches the posture), even when interrupted.
  hold(name, seconds, v) {
    return new Promise((resolve) => {
      if (this.paused) return resolve()
      if (this.anim !== name) this.start(name)
      const a = this.hooks.info(name) // { fps, frames } from study-cat.json
      const loops = Math.max(1, Math.round((seconds * a.fps) / a.frames))
      let count = 0
      const finish = () => {
        this.cat.off('animationrepeat', onRepeat)
        this.pending.delete(finish)
        resolve()
      }
      const onRepeat = () => {
        count++
        if (count >= loops || this.stale(v)) finish()
      }
      this.pending.add(finish)
      this.cat.on('animationrepeat', onRepeat)
    })
  }

  // Get into a posture by the shortest chain, e.g. read → sit → stand.
  async toPosture(target, v = null) {
    for (const step of path(this.posture, target)) {
      if (this.stale(v)) return
      await this.once(step)
    }
  }

  async turnToFace(dir, v) {
    if (dir === this.facing) return
    await this.toPosture('stand', v)
    if (this.stale(v)) return
    await this.once('turn_around')
  }

  // Walk in whole strides (one walk loop = one stride), so the cat always
  // stops with its feet back in the standing pose.
  async walkTo(x, v) {
    const dist = Math.abs(x - this.cat.x)
    if (dist < 1 || this.paused) return
    await this.toPosture('stand', v) // walking only ever starts from standing
    if (this.stale(v)) return
    await this.turnToFace(x > this.cat.x ? 'right' : 'left', v)
    if (this.stale(v)) return
    const walk = this.hooks.info('walk')
    const cycle = walk.frames / walk.fps // seconds per stride
    const strides = Math.max(1, Math.round(dist / (WALK_SPEED * cycle)))
    if (!this.start('walk')) return
    await new Promise((resolve) => {
      const tween = this.scene.tweens.add({
        targets: this.cat,
        x,
        duration: strides * cycle * 1000,
        ease: 'Linear',
        onComplete: () => finish(),
      })
      const onRepeat = () => {
        if (this.stale(v)) finish(true) // interrupted: stop at the end of this stride
      }
      let finished = false
      const finish = (stop) => {
        if (finished) return
        finished = true
        if (stop) tween.stop()
        this.cat.off('animationrepeat', onRepeat)
        this.pending.delete(finish)
        resolve()
      }
      this.pending.add(() => finish(true))
      this.cat.on('animationrepeat', onRepeat)
    })
    this.rest()
  }

  async goTo(x, facing, v) {
    await this.walkTo(x, v)
    if (this.stale(v) || !facing) return
    await this.turnToFace(facing, v)
  }

  // The jump animation is drawn in place; we move the sprite during the leap frames.
  async jumpTo(x, y) {
    const frame = 1000 / this.hooks.info('jump').fps
    const fromX = this.cat.x
    const fromY = this.cat.y
    this.scene.tweens.addCounter({
      from: 0,
      to: 1,
      delay: frame * 1.5,
      duration: frame * 3,
      onUpdate: (tw) => {
        const t = tw.getValue()
        this.cat.x = fromX + (x - fromX) * t
        this.cat.y = fromY + (y - fromY) * t - Math.sin(Math.PI * t) * 12
      },
    })
    await this.once('jump')
    this.cat.setPosition(x, y)
  }

  // ── the main loop ──
  async run() {
    while (!this.dead) {
      if (this.paused) {
        await new Promise((r) => (this.wake = r))
        continue
      }
      const v = this.version
      if (this.clickQueued) {
        this.clickQueued = false
        await this.meowAtYou()
        continue
      }
      const name = this.task ?? this.goal
      await this.scripts[name].call(this, v)
      if (this.dead || this.stale(v)) continue
      if (this.task === name) {
        this.task = null // task done → back to the goal (break: walks back to the rug)
        continue
      }
      await new Promise((r) => (this.wake = r)) // a goal script ended on its own: wait
    }
  }

  // Clicked: face you, meow, turn back. Runs to the end, then the goal resumes
  // (e.g. reading again: read_start → read).
  async meowAtYou() {
    this.clicking = true
    await this.toPosture('sit')
    await this.once('turn_front')
    this.hooks.onMeow?.()
    await this.once('meow')
    await this.once('turn_back')
    this.clicking = false
  }

  scripts = {
    // no timer running: stroll around, sit a while, sometimes nap
    async wander(v) {
      while (!this.stale(v)) {
        await this.toPosture('stand', v)
        if (this.stale(v)) return
        let x
        do x = rand(WANDER[0], WANDER[1])
        while (Math.abs(x - this.cat.x) < 40)
        await this.walkTo(x, v)
        if (this.stale(v)) return
        if (Math.random() < 0.5) {
          await this.hold('idle', rand(2, 5), v)
          continue
        }
        await this.once('sit_down')
        await this.hold('sit_idle', rand(3, 7), v)
        if (this.stale(v)) return
        if (Math.random() < 0.35) await this.once('look_at_you')
        if (!this.stale(v) && Math.random() < 0.35) {
          await this.toPosture('sleep', v)
          await this.hold('sleep', rand(12, 25), v)
          if (this.stale(v)) return
          await this.once('wake_up')
          await this.hold('sit_idle', 2, v)
        }
      }
    },

    // the "My Cat" panel is open: come to the middle of the rug (unless
    // already near it), sit and show off the look
    async showOff(v) {
      if (Math.abs(this.cat.x - SPOTS.rug) > 30) {
        await this.goTo(SPOTS.rug, 'right', v)
        if (this.stale(v)) return
      }
      await this.toPosture('sit', v)
      while (!this.stale(v)) {
        await this.once('look_at_you')
        if (this.stale(v)) return
        await this.toPosture('front', v) // turn_front: face you
        await this.hold('sit_front', rand(3, 5), v)
        if (this.stale(v)) return
        await this.toPosture('sit', v) // turn_back
        await this.hold('sit_idle', rand(1, 2), v)
      }
    },

    // debug only: curl up and stay asleep
    async nap(v) {
      await this.toPosture('sleep', v)
      await this.hold('sleep', Infinity, v)
    },

    // study: walk to the desk, sit, open the book, read; turn a page every 20–40 s
    async study(v) {
      await this.goTo(SPOTS.desk, 'right', v)
      if (this.stale(v)) return
      await this.toPosture('read', v)
      while (!this.stale(v)) {
        await this.hold('read', rand(20, 40), v)
        if (this.stale(v)) return
        await this.once('page_turn')
      }
    },

    // you switched tabs: close the book and be sad (study resumes reading after)
    async sad(v) {
      await this.toPosture('sit', v)
      if (this.stale(v)) return
      await this.hold('sad', Infinity, v)
    },

    // break: off the stool, onto the rug, look at you, then wait for a button
    async break(v) {
      this.setBusy(true)
      await this.goTo(SPOTS.rug, 'right', v)
      if (this.stale(v)) return
      await this.toPosture('sit', v)
      if (this.stale(v)) return
      await this.once('look_at_you')
      this.setBusy(false)
      while (!this.stale(v)) {
        await this.hold('sit_idle', rand(6, 12), v)
        if (!this.stale(v)) await this.once('look_at_you')
      }
    },

    // Feed: walk to the bowl and eat
    async feed(v) {
      await this.goTo(SPOTS.bowl, 'right', v)
      if (this.stale(v)) return
      await this.toPosture('stand', v)
      this.hooks.setProp?.('bowl', false) // the eat animation draws its own bowl
      await this.hold('eat', 5, v)
      this.hooks.setProp?.('bowl', true)
    },

    // Play: bat the yarn on the rug
    async play(v) {
      await this.goTo(SPOTS.play, 'right', v)
      if (this.stale(v)) return
      await this.toPosture('stand', v)
      this.hooks.setProp?.('yarn', false) // the play animation draws its own yarn
      await this.hold('play', 4, v)
      this.hooks.setProp?.('yarn', true)
    },

    // Bathe (the pack has no bath animation, so it's built from pieces):
    // hop into the tub, sit in the bubbles, give a shake, hop out.
    // Once in the tub it always finishes, so the cat can't get stuck in it.
    async bathe(v) {
      await this.goTo(SPOTS.tubEntry, 'right', v)
      if (this.stale(v)) return
      await this.toPosture('stand', v)
      await this.jumpTo(SPOTS.tub, TUB_FEET_Y)
      this.hooks.setTub?.(true)
      await this.once('sit_down')
      this.hooks.setBubbles?.(true)
      await this.hold('sit_idle', 1.5, null)
      const shake = this.scene.tweens.add({ targets: this.cat, x: this.cat.x + 1, duration: 60, yoyo: true, repeat: 9 })
      await this.hold('sit_idle', 1.6, null)
      shake.stop()
      this.cat.x = SPOTS.tub
      this.hooks.setBubbles?.(false)
      await this.once('stand_up')
      await this.jumpTo(SPOTS.tubExit, FEET_Y)
      this.hooks.setTub?.(false)
    },
  }
}
