import { useEffect, useState } from 'react'
import { ANIMS } from './catAnims'
import './debug.css'

const GOALS = ['wander', 'study', 'sad', 'break', 'nap']
const TASKS = ['feed', 'play', 'bathe']
const SPEEDS = [1, 0.5, 0.25, 0.1]

// Open the app with ?debug in the address bar to get this panel.
//  • Cat: pick any breed and outfit (saved, like the real choice will be)
//  • Animations: play any animation directly (pauses the brain; may snap on purpose)
//  • States: drive the brain yourself (it stops following the timer)
//  • Speed: slow motion for checking that transitions line up
export default function DebugPanel({ subscribe, sceneRef, onOverride, look, onLookChange }) {
  const [state, setState] = useState(null)
  const [speed, setSpeed] = useState(1)
  const [open, setOpen] = useState(true)
  const [following, setFollowing] = useState(true)

  useEffect(() => subscribe(setState), [subscribe])

  const brain = () => sceneRef.current?.brain
  const takeOver = () => {
    setFollowing(false)
    onOverride(true)
    brain()?.resume()
  }
  const changeSpeed = (s) => {
    setSpeed(s)
    sceneRef.current?.setSpeed(s)
  }

  if (!open) {
    return (
      <button className="debug-toggle" onClick={() => setOpen(true)}>
        🐞 debug
      </button>
    )
  }

  return (
    <aside className="debug" aria-label="Cat debug panel">
      <div className="debug-head">
        <strong>🐞 Cat debug</strong>
        <button onClick={() => setOpen(false)} aria-label="Hide debug panel">
          ×
        </button>
      </div>

      {state && (
        <dl className="debug-state">
          <dt>goal</dt>
          <dd>{state.goal}{state.task ? ` → ${state.task}` : ''}{following ? ' (timer)' : ' (debug)'}</dd>
          <dt>anim</dt>
          <dd>{state.anim}{state.paused ? ' (brain paused)' : ''}</dd>
          <dt>posture</dt>
          <dd>{state.posture}, facing {state.facing}</dd>
          <dt>chain breaks</dt>
          <dd className={state.violations ? 'bad' : 'good'}>{state.violations}</dd>
        </dl>
      )}

      {state?.breeds && (
        <>
          <h3>Breed</h3>
          <div className="debug-row">
            {state.breeds.map((b) => (
              <button key={b} className={state.breed === b ? 'on' : undefined} onClick={() => onLookChange({ ...look, breed: b })}>
                {b}
              </button>
            ))}
          </div>
          <h3>Outfit</h3>
          <div className="debug-row">
            {[null, ...state.outfits].map((o) => (
              <button key={o ?? 'none'} className={state.outfit === o ? 'on' : undefined} onClick={() => onLookChange({ ...look, outfit: o })}>
                {o ?? 'none'}
              </button>
            ))}
          </div>
        </>
      )}

      <h3>States</h3>
      <div className="debug-row">
        {GOALS.map((g) => (
          <button key={g} onClick={() => (takeOver(), brain()?.setGoal(g))}>
            {g}
          </button>
        ))}
        {TASKS.map((t) => (
          <button key={t} onClick={() => (takeOver(), brain()?.command(t))}>
            {t}
          </button>
        ))}
        <button onClick={() => (brain()?.resume(), brain()?.poke())}>click (meow)</button>
      </div>
      <button
        className="debug-follow"
        disabled={following && !state?.paused}
        onClick={() => {
          setFollowing(true)
          brain()?.resume()
          onOverride(false)
        }}
      >
        ↺ follow the timer again
      </button>

      <h3>Animations (raw — pauses the brain)</h3>
      <div className="debug-row">
        {Object.keys(ANIMS).map((name) => (
          <button key={name} className={state?.anim === name ? 'on' : undefined} onClick={() => brain()?.debugPlay(name)}>
            {name}
          </button>
        ))}
      </div>

      <h3>Speed</h3>
      <div className="debug-row">
        <button
          className={speed < 1 ? 'on' : undefined}
          onClick={() => changeSpeed((sceneRef.current?.anims.globalTimeScale ?? 1) < 1 ? 1 : 0.25)}
        >
          🐢 slow motion {speed < 1 ? 'on' : 'off'}
        </button>
        {SPEEDS.map((s) => (
          <button key={s} className={speed === s ? 'on' : undefined} onClick={() => changeSpeed(s)}>
            {s}×
          </button>
        ))}
      </div>
    </aside>
  )
}
