import { useEffect, useRef, useState } from 'react'
import './Sheet.css'
import './PrefsPanel.css'

// Strictness: what leaving the tab costs. The ids are the database's
// study_mode values (easy / medium / toxic); the server's penalty rules for
// them are unchanged. HOW the cat talks is the personality, set separately.
export const STRICTNESS = [
  { id: 'easy', emoji: '😺', name: 'Chill', about: 'Leaving the tab makes the cat a little sad. No coins lost.' },
  { id: 'medium', emoji: '😼', name: 'Normal', about: '2 free trips away per session. Each one after that costs 10% of its coins.' },
  { id: 'toxic', emoji: '😾', name: 'Strict', about: 'Every trip away costs 5 coins, and the cat turns its back on you.' },
]

// The ⚙️ settings sheet: sound and study mode (book mode joins on phones).
export function PrefsPanel({ ref, open, onClose, voice, mode, onModeChange, modeLocked, children }) {
  const closeButton = useRef(null)
  const [confirmToxic, setConfirmToxic] = useState(false)
  const pickMode = (id) => {
    if (id === mode) return
    if (id === 'toxic') return setConfirmToxic(true)
    setConfirmToxic(false)
    onModeChange(id)
  }

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

      <fieldset className="modes" disabled={modeLocked}>
        <legend className="prefs-label">Strictness</legend>
        <div className="mode-list">
          {STRICTNESS.map((m) => (
            <button
              key={m.id}
              type="button"
              className={`mode${mode === m.id ? ' picked' : ''}`}
              aria-pressed={mode === m.id}
              onClick={() => pickMode(m.id)}
            >
              <span className="mode-name">
                <span aria-hidden="true">{m.emoji}</span> {m.name}
              </span>
              <span className="mode-about">{m.about}</span>
            </button>
          ))}
        </div>
        {modeLocked && <p className="prefs-note">You can change strictness after this study session.</p>}
      </fieldset>

      {confirmToxic && (
        <div className="toxic-confirm" role="alertdialog" aria-label="Turn on Strict?">
          <p>
            <strong>Are you sure?</strong> Every trip away from the tab costs 5 coins.
          </p>
          <div className="toxic-buttons">
            <button
              className="primary"
              onClick={() => {
                setConfirmToxic(false)
                onModeChange('toxic')
              }}
            >
              Yes, strict 😾
            </button>
            <button onClick={() => setConfirmToxic(false)}>Never mind</button>
          </div>
        </div>
      )}

      {children}
    </section>
  )
}
