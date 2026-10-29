import { useCallback, useEffect, useRef, useState } from 'react'

// Counts how often you leave the tab (or lock the phone) while studying.
//
//   onLeave()                  → the page was hidden during a session
//   onReturn({ count, awayMs }) → you're back; count = leaves this session
//
// The count belongs to one study session: call reset() when one starts.
// The server gets it at the end (end_session's p_leave_count) and works
// out any coin penalty itself.
export function useLeaveTracker({ active, onLeave, onReturn }) {
  const [count, setCount] = useState(0)
  const state = useRef({ count: 0, awayAt: null })
  const latest = useRef({})
  useEffect(() => {
    latest.current = { active, onLeave, onReturn }
  })

  useEffect(() => {
    const onVisibilityChange = () => {
      const t = state.current
      if (document.hidden) {
        if (!latest.current.active) return
        t.awayAt = Date.now()
        latest.current.onLeave?.()
        return
      }
      if (t.awayAt === null) return
      const awayMs = Date.now() - t.awayAt
      t.awayAt = null
      if (!latest.current.active) return // the session ended while you were away
      t.count += 1
      setCount(t.count)
      latest.current.onReturn?.({ count: t.count, awayMs })
    }
    document.addEventListener('visibilitychange', onVisibilityChange)
    return () => document.removeEventListener('visibilitychange', onVisibilityChange)
  }, [])

  const reset = useCallback(() => {
    state.current = { count: 0, awayAt: null }
    setCount(0)
  }, [])
  // the count right now (for end_session, which may run while you're away)
  const current = useCallback(() => state.current.count, [])

  return { count, reset, current }
}
