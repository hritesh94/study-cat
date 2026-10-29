import { useCallback, useEffect, useRef, useState } from 'react'
import { useLocalStorage } from './useLocalStorage'

const canSpeak = typeof window !== 'undefined' && 'speechSynthesis' in window

// Pick an English voice once the browser has loaded its voice list.
function pickVoice() {
  const voices = window.speechSynthesis.getVoices()
  return voices.find((v) => v.lang.startsWith('en') && /female|zira|samantha/i.test(v.name))
    ?? voices.find((v) => v.lang.startsWith('en'))
}

// say("Hi!") shows a speech bubble for a few seconds and reads it aloud
// with the browser's built-in Web Speech API (no internet or API key needed).
export function useCatVoice() {
  const [muted, setMuted] = useLocalStorage('studycat:muted', false)
  const [line, setLine] = useState(null)
  const clearTimer = useRef()

  const say = useCallback(
    (text) => {
      setLine(text)
      clearTimeout(clearTimer.current)
      clearTimer.current = setTimeout(() => setLine(null), 3500)

      if (!canSpeak || muted) return
      window.speechSynthesis.cancel() // stop any line that's still playing
      const utterance = new SpeechSynthesisUtterance(text)
      utterance.voice = pickVoice() ?? null
      utterance.pitch = 1.7 // higher pitch = more kitten-like
      utterance.rate = 1.05
      window.speechSynthesis.speak(utterance)
    },
    [muted],
  )

  useEffect(() => () => clearTimeout(clearTimer.current), [])
  useEffect(() => {
    if (muted && canSpeak) window.speechSynthesis.cancel()
  }, [muted])

  return { line, say, muted, setMuted, canSpeak }
}
