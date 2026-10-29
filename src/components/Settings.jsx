import { useState } from 'react'

// One minutes box. While you type it shows exactly what you typed (even
// nothing), so clearing it and typing "25" gives 25, not "125". The number
// is only checked when you leave the box (or press Enter): an empty box goes
// back to what it was, and anything else is kept between 1 and max.
function MinutesInput({ label, value, max, onChange, disabled }) {
  const [draft, setDraft] = useState(null) // null = not typing, show the saved value
  const commit = () => {
    if (draft === null) return
    const n = Math.round(Number(draft))
    if (draft.trim() !== '' && Number.isFinite(n)) onChange(Math.min(max, Math.max(1, n)))
    setDraft(null)
  }
  return (
    <label>
      {label}
      <input
        type="number"
        inputMode="numeric"
        min="1"
        max={max}
        value={draft ?? value}
        disabled={disabled}
        onChange={(e) => {
          setDraft(e.target.value)
          // a valid number updates the timer right away; the box isn't touched
          const n = Number(e.target.value)
          if (e.target.value !== '' && Number.isInteger(n) && n >= 1 && n <= max) onChange(n)
        }}
        onBlur={commit}
        onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
      />
      min
    </label>
  )
}

// Two number boxes for the study and break lengths (in minutes).
export function Settings({ studyMinutes, breakMinutes, onChange, disabled }) {
  return (
    <div className="settings">
      <MinutesInput
        label="Study"
        value={studyMinutes}
        max={180}
        disabled={disabled}
        onChange={(m) => onChange({ studyMinutes: m, breakMinutes })}
      />
      <MinutesInput
        label="Break"
        value={breakMinutes}
        max={60}
        disabled={disabled}
        onChange={(m) => onChange({ studyMinutes, breakMinutes: m })}
      />
    </div>
  )
}
