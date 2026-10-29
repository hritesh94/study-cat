import { useEffect, useState } from 'react'

// Like useState, but the value is also saved in the browser's localStorage,
// so it survives page reloads. Values are stored as JSON text.
export function useLocalStorage(key, initialValue) {
  const [value, setValue] = useState(() => {
    try {
      const saved = localStorage.getItem(key)
      return saved !== null ? JSON.parse(saved) : initialValue
    } catch {
      // Storage can be blocked (e.g. some private windows) — just use the default.
      return initialValue
    }
  })

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value))
    } catch {
      // Ignore write failures; the app still works for this visit.
    }
  }, [key, value])

  return [value, setValue]
}
