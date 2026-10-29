import { CatScene } from './cat/CatScene'
import { useStudyCycle } from './cat/useStudyCycle'
import { Settings } from './components/Settings'
import { useLocalStorage } from './hooks/useLocalStorage'
import { useStudyStats } from './hooks/useStudyStats'
import { formatTime, useTimer } from './hooks/useTimer'
import './App.css'

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

  const timer = useTimer({
    studyMinutes: settings.studyMinutes,
    breakMinutes: settings.breakMinutes,
    onStudyTime: addStudyMs,
    onPhaseChange: (next) => {
      if (next === 'break') exitFullscreen()
    },
  })

  const focusing = timer.phase === 'study' && timer.running
  const studyAnimation = useStudyCycle(focusing)
  const catAnimation = focusing ? studyAnimation : 'idle'

  const start = () => {
    if (timer.phase === 'study') enterFullscreen()
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
        <span className="today">Today: {todayMinutes} min</span>
      </header>

      <main className="panel">
        <div className="phase">{timer.phase === 'study' ? 'Study' : 'Break'}</div>
        <div className="time">{formatTime(timer.remainingMs)}</div>
        <div className="controls">
          {timer.running ? (
            <button onClick={pause}>Pause</button>
          ) : (
            <button className="primary" onClick={start}>Start</button>
          )}
          <button onClick={timer.reset}>Reset</button>
          <button onClick={timer.skip}>Skip</button>
        </div>
        <Settings {...settings} onChange={setSettings} disabled={timer.running} />
      </main>
    </div>
  )
}
