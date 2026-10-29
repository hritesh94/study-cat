import { useEffect, useRef } from 'react'
import './Sheet.css'
import './PrefsPanel.css'

// The ⚙️ settings sheet: sound now; study mode and book mode join later.
export function PrefsPanel({ ref, open, onClose, voice, children }) {
  const closeButton = useRef(null)

  useEffect(() => {
    if (!open) return
    closeButton.current?.focus()
    const onKey = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  const percent = Math.round(voice.volume * 100)

  return (
    <section ref={ref} className="sheet prefs" role="dialog" aria-label="Settings" hidden={!open}>
      <header className="sheet-head">
        <h2>Settings</h2>
        <button className="icon" onClick={onClose} aria-label="Close" ref={closeButton}>
          ×
        </button>
      </header>

      <div className="prefs-row">
        <span className="prefs-label" id="volume-label">
          Cat voice
        </span>
        <button
          className="icon"
          onClick={() => voice.setMuted(!voice.muted)}
          aria-label={voice.muted ? 'Unmute cat' : 'Mute cat'}
          title={voice.muted ? 'Unmute cat' : 'Mute cat'}
        >
          {voice.muted ? '🔇' : '🔊'}
        </button>
        <input
          className="volume"
          type="range"
          min="0"
          max="100"
          step="5"
          value={percent}
          aria-labelledby="volume-label"
          aria-valuetext={`${percent}%`}
          disabled={voice.muted}
          onChange={(e) => voice.setVolume(Number(e.target.value) / 100)}
        />
        <span className="prefs-value">{voice.muted ? 'off' : `${percent}%`}</span>
      </div>

      {children}
    </section>
  )
}
