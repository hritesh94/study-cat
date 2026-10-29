import { useEffect } from 'react'

// Keeps the phone's screen on while `active` (the Screen Wake Lock API).
// The browser drops the lock whenever the page is hidden, so we ask again
// when it's visible. Browsers without it (or that say no): nothing happens.
export function useWakeLock(active) {
  useEffect(() => {
    if (!active || !navigator.wakeLock) return
    let lock = null
    let stopped = false
    const request = async () => {
      if (stopped || document.hidden || (lock && !lock.released)) return
      try {
        const next = await navigator.wakeLock.request('screen')
        if (stopped) next.release().catch(() => {})
        else lock = next
      } catch {
        // not allowed right now (e.g. battery saver): fine, the timer still works
      }
    }
    const onVisibilityChange = () => !document.hidden && request()
    request()
    document.addEventListener('visibilitychange', onVisibilityChange)
    return () => {
      stopped = true
      document.removeEventListener('visibilitychange', onVisibilityChange)
      lock?.release().catch(() => {})
    }
  }, [active])
}
