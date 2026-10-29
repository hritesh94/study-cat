import { useEffect, useRef, useState } from 'react'
import { CatScene } from './cat/CatScene'
import { useStudyCycle } from './cat/useStudyCycle'
import { BreakPanel } from './components/BreakPanel'
import { Settings } from './components/Settings'
import { useCatVoice } from './hooks/useCatVoice'
import { useLocalStorage } from './hooks/useLocalStorage'
import { useStudyStats } from './hooks/useStudyStats'
import { formatTime, useTimer } from './hooks/useTimer'
import './App.css'

const BREAK_LINE = 'Enough studying, play with me!'
const START_LINES = ["Let's focus!", "Study time! I'll keep you company.", 'You got this!']
const COME_BACK_LINES = ['Hey! Where did you go?', 'You left me all alone...', 'No sneaking off!']
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
  const studyAnimation = useStudyCycle(focusing)

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

  // ── Break reactions: Play / Feed / Bathe ──
  const [reaction, setReaction] = useState(null)
  const reactionTimer = useRef()
  const doBreakAction = (action) => {
    setReaction(action.animation)
    voice.say(action.line)
    clearTimeout(reactionTimer.current)
    reactionTimer.current = setTimeout(() => setReaction(null), 3000)
  }

  // Which animation wins when several apply? Reaction > sad > studying > idle.
  const catAnimation = reaction ?? (sad ? 'sad' : focusing ? studyAnimation : 'idle')
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
      <CatScene animation={catAnimation} />

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

      <main className="panel">
        <div className="phase">{timer.phase === 'study' ? 'Study' : 'Break'}</div>
        <div className="time">{formatTime(timer.remainingMs)}</div>
        {timer.phase === 'break' && <BreakPanel onAction={doBreakAction} busy={reaction !== null} />}
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
