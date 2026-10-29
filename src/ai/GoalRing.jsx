import { hoursText } from './schedule'

// Today's goal in the top bar: a ring that fills up, and "3h 20m / 6h".
export function GoalRing({ ref, minutes, target, onClick, expanded }) {
  const share = target > 0 ? Math.min(1, minutes / target) : 0
  const r = 12
  const length = 2 * Math.PI * r
  const label = `${hoursText(minutes)} / ${hoursText(target)}`
  return (
    <button
      ref={ref}
      className={`goal-ring${share >= 1 ? ' done' : ''}`}
      onClick={onClick}
      aria-expanded={expanded}
      title={`Today's goal: ${label}. Open your roadmap`}
      aria-label={`Today's goal: ${label}. Open your roadmap`}
    >
      <svg viewBox="0 0 32 32" aria-hidden="true">
        <circle className="track" cx="16" cy="16" r={r} />
        <circle className="fill" cx="16" cy="16" r={r} strokeDasharray={length} strokeDashoffset={length * (1 - share)} />
      </svg>
      <span className="goal-ring-text">{share >= 1 ? `👑 ${label}` : label}</span>
    </button>
  )
}
