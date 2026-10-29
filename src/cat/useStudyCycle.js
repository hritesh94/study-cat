import { useEffect, useState } from 'react'
import { STUDY_IDLES } from './catConfig'

// While `active`, switch to a different study idle animation every 15–25 s.
export function useStudyCycle(active) {
  const [current, setCurrent] = useState(STUDY_IDLES[0])

  useEffect(() => {
    if (!active) return
    let id
    const scheduleNext = () => {
      id = setTimeout(() => {
        setCurrent((prev) => {
          const others = STUDY_IDLES.filter((name) => name !== prev)
          return others[Math.floor(Math.random() * others.length)]
        })
        scheduleNext()
      }, 15000 + Math.random() * 10000)
    }
    scheduleNext()
    return () => clearTimeout(id)
  }, [active])

  return current
}
