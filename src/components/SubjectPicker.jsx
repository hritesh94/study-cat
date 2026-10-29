import { useEffect, useRef, useState } from 'react'
import { SUBJECT_COLORS } from '../hooks/useSubjects'
import './Sheet.css'
import './SubjectPicker.css'

// "What are you studying?" Shown when a study session starts. The last
// subject is already picked, so it's usually just one tap on Start.
// hint: e.g. "Next on your roadmap: Optics" (its subject is preselected)
export function SubjectPicker({ ref, open, onClose, subjects, preselected, hint, onAdd, onStart }) {
  const [picked, setPicked] = useState(undefined) // undefined = the preselected one
  const [adding, setAdding] = useState(false)
  const [name, setName] = useState('')
  const [color, setColor] = useState(SUBJECT_COLORS[0])
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const startButton = useRef(null)
  const nameField = useRef(null)

  useEffect(() => {
    if (!open) return
    startButton.current?.focus()
    const onKey = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  const current = picked === undefined ? preselected : picked

  const openForm = () => {
    setAdding(true)
    setError('')
    // the input exists after this render
    setTimeout(() => nameField.current?.focus(), 0)
  }

  const add = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      const subject = await onAdd(name, color)
      setPicked(subject.id)
      setAdding(false)
      setName('')
      setColor(SUBJECT_COLORS[(SUBJECT_COLORS.indexOf(color) + 1) % SUBJECT_COLORS.length])
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <section ref={ref} className="sheet subject-picker" role="dialog" aria-label="What are you studying?" hidden={!open}>
      <header className="sheet-head">
        <h2>What are you studying?</h2>
        <button className="icon" onClick={onClose} aria-label="Close">
          ×
        </button>
      </header>
      {hint && <p className="subject-hint">{hint}</p>}

      <div className="subject-list" role="radiogroup" aria-label="Subject">
        {subjects.map((s) => (
          <button
            key={s.id}
            role="radio"
            aria-checked={current === s.id}
            className={`subject-chip${current === s.id ? ' picked' : ''}`}
            style={{ '--subject': s.color }}
            onClick={() => setPicked(s.id)}
          >
            <span className="subject-dot" aria-hidden="true" />
            {s.name}
          </button>
        ))}
        <button
          role="radio"
          aria-checked={current === null}
          className={`subject-chip none${current === null ? ' picked' : ''}`}
          onClick={() => setPicked(null)}
        >
          No subject
        </button>
        {!adding && (
          <button className="subject-chip add" onClick={openForm}>
            + new subject
          </button>
        )}
      </div>

      {adding && (
        <form className="subject-form" onSubmit={add}>
          <label>
            Name
            <input ref={nameField} value={name} maxLength={40} placeholder="e.g. Biology" onChange={(e) => setName(e.target.value)} />
          </label>
          <div className="subject-colors" role="radiogroup" aria-label="Colour">
            {SUBJECT_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                role="radio"
                aria-checked={color === c}
                aria-label={`Colour ${c}`}
                className={`swatch${color === c ? ' picked' : ''}`}
                style={{ background: c }}
                onClick={() => setColor(c)}
              />
            ))}
          </div>
          <div className="subject-form-buttons">
            <button type="submit" disabled={!name.trim() || saving}>
              {saving ? 'Saving…' : 'Add'}
            </button>
            <button type="button" onClick={() => setAdding(false)}>
              Cancel
            </button>
          </div>
          {error && (
            <p className="subject-error" role="alert">
              {error}
            </p>
          )}
        </form>
      )}

      <button ref={startButton} className="primary subject-start" onClick={() => onStart(current)}>
        Start studying
      </button>
    </section>
  )
}
