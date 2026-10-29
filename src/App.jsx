import { Settings } from './components/Settings'
import { useLocalStorage } from './hooks/useLocalStorage'
import { useStudyStats } from './hooks/useStudyStats'
import { formatTime, useTimer } from './hooks/useTimer'
import './App.css'

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
  })

  return (
    <div className="app">
      <header className="topbar">
        <h1>Study Cat</h1>
        <span className="today">Today: {todayMinutes} min</span>
      </header>

      <main className="panel">
        <div className="phase">{timer.phase === 'study' ? 'Study' : 'Break'}</div>
        <div className="time">{formatTime(timer.remainingMs)}</div>
        <div className="controls">
          {timer.running ? (
            <button onClick={timer.pause}>Pause</button>
          ) : (
            <button className="primary" onClick={timer.start}>Start</button>
          )}
          <button onClick={timer.reset}>Reset</button>
          <button onClick={timer.skip}>Skip</button>
        </div>
        <Settings {...settings} onChange={setSettings} disabled={timer.running} />
      </main>
    </div>
  )
}
