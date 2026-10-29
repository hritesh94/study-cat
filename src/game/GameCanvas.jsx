import { lazy, Suspense, useCallback, useEffect, useImperativeHandle, useRef } from 'react'

const DebugPanel = lazy(() => import('./DebugPanel'))
const DEBUG = typeof location !== 'undefined' && new URLSearchParams(location.search).has('debug')

// The bridge between React and the Phaser game.
//
//  React → game:  `goal` (wander / study / sad / break), `mood` (lighting),
//                 and ref.current.command('feed' | 'play' | 'bathe')
//  game → React:  onBusy (the cat is busy, so the break buttons are disabled),
//                 onMeow (the cat was clicked and meows), and the cat's head
//                 position, written as CSS variables for the speech bubble.
//
// Phaser is big, so it's loaded only when this component mounts
// (`import()` makes Vite put it in its own file).
export function GameCanvas({ ref, goal, mood, panelRef, onBusy, onMeow }) {
  const hostRef = useRef(null)
  const sceneRef = useRef(null)
  const bridge = useRef({})
  const latest = useRef({ goal, mood })
  const debugOverride = useRef(false)

  // keep callbacks fresh without restarting the game
  useEffect(() => {
    latest.current = { goal, mood }
    Object.assign(bridge.current, { onBusy, onMeow })
  })

  // the debug panel listens to the brain's state through this
  const subscribe = useCallback((listener) => {
    bridge.current.onState = listener
    return () => {
      bridge.current.onState = null
    }
  }, [])

  useImperativeHandle(ref, () => ({
    command: (task) => sceneRef.current?.brain.command(task),
  }))

  // start the game once
  useEffect(() => {
    let game
    let cancelled = false
    const host = hostRef.current
    const app = host.parentElement
    let lastX = null
    let lastY = null

    Object.assign(bridge.current, {
      ready: (scene) => {
        sceneRef.current = scene
        // handy while developing: poke the game from the browser console
        if (import.meta.env.DEV) window.catScene = scene
        scene.brain.setGoal(latest.current.goal)
        scene.setMood(latest.current.mood)
        measure()
      },
      onCatScreen: (x, y) => {
        if (lastX !== null && Math.abs(x - lastX) < 0.5 && Math.abs(y - lastY) < 0.5) return
        lastX = x
        lastY = y
        app.style.setProperty('--cat-x', `${x.toFixed(1)}px`)
        app.style.setProperty('--cat-head-y', `${y.toFixed(1)}px`)
      },
    })

    // how much of the bottom of the screen the timer panel covers
    const measure = () => {
      const panel = panelRef.current
      if (!panel || !sceneRef.current) return
      sceneRef.current.setInset(window.innerHeight - panel.getBoundingClientRect().top)
    }
    const observer = new ResizeObserver((entries) => {
      // Phaser doesn't notice every kind of resize on its own, so nudge it
      if (entries.some((e) => e.target === host)) game?.scale.refresh()
      measure()
    })
    observer.observe(host)
    if (panelRef.current) observer.observe(panelRef.current)
    window.addEventListener('resize', measure)

    Promise.all([import('phaser'), import('./RoomScene')]).then(([{ default: Phaser }, { RoomScene }]) => {
      if (cancelled) return
      game = new Phaser.Game({
        type: Phaser.AUTO,
        parent: host,
        pixelArt: true, // nearest-neighbour scaling: crisp pixels
        roundPixels: true,
        backgroundColor: '#f6e9d3',
        banner: false,
        audio: { noAudio: true },
        scale: { mode: Phaser.Scale.RESIZE, width: '100%', height: '100%' },
        scene: new RoomScene(bridge.current),
      })
    })

    return () => {
      cancelled = true
      observer.disconnect()
      window.removeEventListener('resize', measure)
      game?.destroy(true)
      sceneRef.current = null
    }
  }, [panelRef])

  // follow the timer (unless the debug panel took over)
  useEffect(() => {
    if (!debugOverride.current) sceneRef.current?.brain.setGoal(goal)
  }, [goal])
  useEffect(() => {
    sceneRef.current?.setMood(mood)
  }, [mood])

  return (
    <>
      <div ref={hostRef} className="game" />
      {DEBUG && (
        <Suspense>
          <DebugPanel
            subscribe={subscribe}
            sceneRef={sceneRef}
            onOverride={(on) => {
              debugOverride.current = on
              if (!on) sceneRef.current?.brain.setGoal(latest.current.goal)
            }}
          />
        </Suspense>
      )}
    </>
  )
}
