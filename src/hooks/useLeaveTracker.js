import { useCallback, useEffect, useRef, useState } from 'react'

// Away for less than this never counts as leaving, in any mode (checking
// the time, a notification, the phone dimming for a moment…).
export const LEAVE_GRACE_MS = 15000

// Counts how often you leave the tab (or lock the phone) while studying.
//
//   onLeave({ book })                          → the page was hidden during a session
//   onReturn({ count, awayMs, counted, book }) → you're back; count = leaves this session
//
// book = book mode was on (reading on paper: the screen may sleep), so
// that time away never counts. The count belongs to one study session:
// call reset() when one starts. The server gets it at the end
// (end_session's p_leave_count) and works out any coin penalty itself.
export function useLeaveTracker({ active, bookMode, onLeave, onReturn }) {
  const [count, setCount] = useState(0)
  const state = useRef({ count: 0, awayAt: null, book: false })
  const latest = useRef({})
  useEffect(() => {
    latest.current = { active, bookMode, onLeave, onReturn }
  })

  useEffect(() => {
    const onVisibilityChange = () => {
      const t = state.current
      if (document.hidden) {
        if (!latest.current.active) return
        t.awayAt = Date.now()
        t.book = !!latest.current.bookMode
        latest.current.onLeave?.({ book: t.book })
        return
      }
      if (t.awayAt === null) return
      const awayMs = Date.now() - t.awayAt
      const book = t.book
      t.awayAt = null
      if (!latest.current.active) return // the session ended while you were away
      const counted = !book && awayMs >= LEAVE_GRACE_MS
      if (counted) {
        t.count += 1
        setCount(t.count)
      }
      latest.current.onReturn?.({ count: t.count, awayMs, counted, book })
    }
    document.addEventListener('visibilitychange', onVisibilityChange)
    return () => document.removeEventListener('visibilitychange', onVisibilityChange)
  }, [])

  const reset = useCallback(() => {
    state.current = { count: 0, awayAt: null, book: false }
    setCount(0)
  }, [])
  // the count right now, for end_session (which may run while you're still
  // away, e.g. the study time ran out on a locked phone: that counts too
  // once it's past the grace period)
  const current = useCallback(() => {
    const t = state.current
    const stillAway = t.awayAt !== null && !t.book && Date.now() - t.awayAt >= LEAVE_GRACE_MS
    return t.count + (stillAway ? 1 : 0)
  }, [])

  return { count, reset, current }
}
