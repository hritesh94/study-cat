// Two number boxes for the study and break lengths (in minutes).
export function Settings({ studyMinutes, breakMinutes, onChange, disabled }) {
  const clamp = (value, max) => Math.min(max, Math.max(1, Math.round(Number(value) || 1)))

  return (
    <div className="settings">
      <label>
        Study
        <input
          type="number"
          min="1"
          max="180"
          value={studyMinutes}
          disabled={disabled}
          onChange={(e) => onChange({ studyMinutes: clamp(e.target.value, 180), breakMinutes })}
        />
        min
      </label>
      <label>
        Break
        <input
          type="number"
          min="1"
          max="60"
          value={breakMinutes}
          disabled={disabled}
          onChange={(e) => onChange({ studyMinutes, breakMinutes: clamp(e.target.value, 60) })}
        />
        min
      </label>
    </div>
  )
}
