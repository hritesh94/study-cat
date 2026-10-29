import { useCallback, useEffect, useRef, useState } from 'react'
import { canMakeSound, meow, setMuted as setAudioMuted, setVolume as setAudioVolume, speak, unlockAudio } from '../audio/catVoice'
import { useLocalStorage } from './useLocalStorage'

// The cat talks: a line types into the speech bubble while the cat babbles
// it (or plays its recording). Lines come from src/game/catLines.js.
//
// say(line) with line = { id, text, mood }; say(line, { meow: true }) plays
// a real meow sound instead of babble (for clicks and greetings).
export function useCatVoice() {
  const [muted, setMuted] = useLocalStorage('studycat:muted', false)
  const [volume, setVolume] = useLocalStorage('studycat:volume', 0.7)
  const [line, setLine] = useState(null) // { id, text, mood, turn, shown }
  const hide = useRef(null)
  const lastTurn = useRef(0)

  useEffect(() => setAudioMuted(muted), [muted])
  useEffect(() => setAudioVolume(volume), [volume])

  // sound is only allowed after the first click/tap/key
  useEffect(() => {
    const unlock = () => unlockAudio()
    window.addEventListener('pointerdown', unlock)
    window.addEventListener('keydown', unlock)
    return () => {
      window.removeEventListener('pointerdown', unlock)
      window.removeEventListener('keydown', unlock)
    }
  }, [])

  const say = useCallback((next, { meow: withMeow = false } = {}) => {
    if (!next) return
    clearTimeout(hide.current)
    const turn = (lastTurn.current += 1) // a newer line always wins
    setLine({ ...next, turn, shown: 0 })
    const onType = (shown) => setLine((l) => (l?.turn === turn ? { ...l, shown } : l))
    if (withMeow) meow()
    const typed = withMeow ? speak({ ...next, id: null }, onType, { silent: true }) : speak(next, onType)
    // keep it up long enough to read, then clear the bubble
    typed.then(() => {
      if (lastTurn.current !== turn) return
      hide.current = setTimeout(() => setLine((l) => (l?.turn === turn ? null : l)), Math.max(2200, next.text.length * 45))
    })
  }, [])

  useEffect(() => () => clearTimeout(hide.current), [])

  return { line, say, muted, setMuted, volume, setVolume, canSpeak: canMakeSound() }
}
