import { useCallback, useEffect, useRef, useState } from 'react'

const TICK_MS = 250

// A Pomodoro timer with two phases: 'study' and 'break'.
//
// Why we store an "end time" instead of counting down 1 second at a time:
// browsers slow down timers in background tabs, so a countdown that does
// `seconds - 1` every second would fall behind. Comparing against the real
// clock (Date.now()) keeps it accurate no matter what.
export function useTimer({ studyMinutes, breakMinutes, onStudyTime, onPhaseChange }) {
  const lengthOf = useCallback(
    (phase) => (phase === 'study' ? studyMinutes : breakMinutes) * 60 * 1000,
    [studyMinutes, breakMinutes],
  )

  const [phase, setPhase] = useState('study')
  const [running, setRunning] = useState(false)
  const [remainingMs, setRemainingMs] = useState(() => lengthOf('study'))

  const endAtRef = useRef(0) // clock time when the current phase finishes
  const lastTickRef = useRef(0) // clock time of the previous tick

  // Keep the latest callbacks in a ref so the interval below never uses stale ones.
  const callbacksRef = useRef({ onStudyTime, onPhaseChange })
  callbacksRef.current = { onStudyTime, onPhaseChange }

  // When the user changes a length while the timer is stopped, show the new length.
  useEffect(() => {
    if (!running) setRemainingMs(lengthOf(phase))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studyMinutes, breakMinutes])

  const begin = (ms) => {
    const now = Date.now()
    endAtRef.current = now + ms
    lastTickRef.current = now
    setRemainingMs(ms)
    setRunning(true)
  }

  const goTo = useCallback(
    (next, autoStart) => {
      setPhase(next)
      if (autoStart) begin(lengthOf(next))
      else {
        setRunning(false)
        setRemainingMs(lengthOf(next))
      }
      callbacksRef.current.onPhaseChange?.(next)
    },
    [lengthOf],
  )

  // The heartbeat: runs only while the timer is running.
  useEffect(() => {
    if (!running) return
    const id = setInterval(() => {
      const now = Date.now()
      const endAt = endAtRef.current

      // Credit the time that just passed to today's study total.
      if (phase === 'study') {
        callbacksRef.current.onStudyTime?.(Math.min(now, endAt) - lastTickRef.current)
      }
      lastTickRef.current = now

      const left = endAt - now
      if (left > 0) {
        setRemainingMs(left)
      } else if (phase === 'study') {
        goTo('break', true) // study done → break starts by itself
      } else {
        goTo('study', false) // break done → wait for the user to press Start
      }
    }, TICK_MS)
    return () => clearInterval(id)
  }, [running, phase, goTo])

  const start = () => begin(remainingMs)

  const pause = () => {
    const now = Date.now()
    if (phase === 'study') callbacksRef.current.onStudyTime?.(now - lastTickRef.current)
    setRemainingMs(Math.max(0, endAtRef.current - now))
    setRunning(false)
  }

  const reset = () => {
    setRunning(false)
    setRemainingMs(lengthOf(phase))
  }

  // Jump straight to the other phase (handy for testing, or ending a break early).
  const skip = () => goTo(phase === 'study' ? 'break' : 'study', phase === 'study')

  return { phase, running, remainingMs, start, pause, reset, skip }
}

// 125000 ms → "02:05"
export function formatTime(ms) {
  const totalSeconds = Math.ceil(ms / 1000)
  const m = Math.floor(totalSeconds / 60)
  const s = totalSeconds % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}
