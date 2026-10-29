import { useEffect, useRef, useState } from 'react'
import { BreakPanel } from './components/BreakPanel'
import { GameCanvas } from './game/GameCanvas'
import { Settings } from './components/Settings'
import { useCatVoice } from './hooks/useCatVoice'
import { useLocalStorage } from './hooks/useLocalStorage'
import { useStudyStats } from './hooks/useStudyStats'
import { formatTime, useTimer } from './hooks/useTimer'
import './App.css'

const BREAK_LINE = 'Enough studying, play with me!'
const START_LINES = ["Let's focus!", "Study time! I'll keep you company.", 'You got this!']
const COME_BACK_LINES = ['Hey! Where did you go?', 'You left me all alone...', 'No sneaking off!']
const MEOW_LINES = ['Meow!', 'Mrrp?', 'Meow meow!']
const pick = (lines) => lines[Math.floor(Math.random() * lines.length)]

// Browsers only allow fullscreen right after a click, so we call this from
// the Start button. If it's refused, the focus view still works in the window.
function enterFullscreen() {
  if (!document.fullscreenElement) document.documentElement.requestFullscreen?.().catch(() => {})
}
function exitFullscreen() {
  if (document.fullscreenElement) document.exitFullscreen().catch(() => {})
}

export default function App() {
  const [settings, setSettings] = useLocalStorage('studycat:settings', {
    studyMinutes: 50,
    breakMinutes: 10,
  })
  const { todayMinutes, addStudyMs } = useStudyStats()
  const voice = useCatVoice()

  const timer = useTimer({
    studyMinutes: settings.studyMinutes,
    breakMinutes: settings.breakMinutes,
    onStudyTime: addStudyMs,
    onPhaseChange: (next) => {
      if (next === 'break') {
        exitFullscreen()
        voice.say(BREAK_LINE)
      } else {
        voice.say("Break's over! Back to work.")
      }
    },
  })

  const focusing = timer.phase === 'study' && timer.running

  // ── Sad cat: switching tabs during study ──
  const [sad, setSad] = useState(false)
  // The event listener below is set up once, so it reads fresh values from this ref.
  const latest = useRef({})
  useEffect(() => {
    latest.current = { focusing, sad, say: voice.say }
  })
  useEffect(() => {
    let cheerUp
    const onVisibilityChange = () => {
      const { focusing, sad, say } = latest.current
      if (document.hidden) {
        if (focusing) {
          clearTimeout(cheerUp)
          setSad(true)
        }
      } else if (sad) {
        // You're back: the cat complains, stays sad a moment, then forgives you.
        say(pick(COME_BACK_LINES))
        cheerUp = setTimeout(() => setSad(false), 4000)
      }
    }
    document.addEventListener('visibilitychange', onVisibilityChange)
    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange)
      clearTimeout(cheerUp)
    }
  }, [])

  // ── The cat (a Phaser game) ──
  // React decides WHAT the cat should be doing; the cat's brain decides HOW
  // to get there (walking, sitting down, turning around…).
  const game = useRef(null)
  const panelRef = useRef(null)
  const [catBusy, setCatBusy] = useState(true)
  // which cat you have (the shop and coins come later; for now it's saved here)
  const [catLook, setCatLook] = useLocalStorage('studycat:cat', { breed: 'orange', outfit: null })
  const catGoal = !timer.running ? 'wander' : timer.phase === 'study' ? (sad ? 'sad' : 'study') : 'break'
  const mood = focusing ? 'focus' : timer.phase === 'break' ? 'break' : 'idle'

  // ── Break reactions: Play / Feed / Bathe ──
  const doBreakAction = (action) => {
    voice.say(action.line)
    game.current?.command(action.animation)
  }
  const bubble = voice.line ?? (timer.phase === 'break' ? BREAK_LINE : null)

  const start = () => {
    if (timer.phase === 'study') {
      enterFullscreen()
      voice.say(pick(START_LINES))
    }
    timer.start()
  }
  const pause = () => {
    exitFullscreen()
    timer.pause()
  }

  return (
    <div className={`app ${focusing ? 'focus' : ''} ${timer.phase}`}>
      <GameCanvas
        ref={game}
        goal={catGoal}
        mood={mood}
        look={catLook}
        onLookChange={setCatLook}
        panelRef={panelRef}
        onBusy={setCatBusy}
        onMeow={() => voice.say(pick(MEOW_LINES))}
      />

      <header className="topbar">
        <h1>Study Cat</h1>
        <div className="topbar-right">
          <span className="today">Today: {todayMinutes} min</span>
          {voice.canSpeak && (
            <button
              className="icon"
              onClick={() => voice.setMuted(!voice.muted)}
              aria-label={voice.muted ? 'Unmute cat' : 'Mute cat'}
              title={voice.muted ? 'Unmute cat' : 'Mute cat'}
            >
              {voice.muted ? '🔇' : '🔊'}
            </button>
          )}
        </div>
      </header>

      {bubble && (
        <div className="bubble" key={bubble}>
          {bubble}
        </div>
      )}

      <main className="panel" ref={panelRef}>
        <div className="phase">{timer.phase === 'study' ? 'Study' : 'Break'}</div>
        <div className="time">{formatTime(timer.remainingMs)}</div>
        {timer.phase === 'break' && <BreakPanel onAction={doBreakAction} busy={catBusy} />}
        <div className="controls">
          {timer.running ? (
            <button onClick={pause}>Pause</button>
          ) : (
            <button className="primary" onClick={start}>Start</button>
          )}
          <button onClick={timer.reset}>Reset</button>
          <button onClick={timer.skip}>{timer.phase === 'study' ? 'Skip to break' : 'End break'}</button>
        </div>
        <Settings {...settings} onChange={setSettings} disabled={timer.running} />
      </main>
    </div>
  )
}
