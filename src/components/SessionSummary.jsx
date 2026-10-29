import { CoinIcon } from './CoinIcon'

// A little card after a study session: minutes, coins and how often you left.
// summary = { id, minutes, coins?, penalty, leaves }  (coins only when logged in)
export function SessionSummary({ summary, onClose }) {
  if (!summary) return null
  const { minutes, coins, penalty, leaves } = summary
  return (
    <div className="summary" role="status" key={summary.id}>
      <strong>Session done</strong>
      <span>{minutes} min</span>
      {coins !== undefined && (
        <span className="summary-coins">
          <CoinIcon /> +{coins}
        </span>
      )}
      {leaves > 0 && (
        <span className="summary-leaves">
          left {leaves} {leaves === 1 ? 'time' : 'times'}
          {penalty > 0 && ` (−${penalty} ${penalty === 1 ? 'coin' : 'coins'})`}
        </span>
      )}
      <button className="icon" onClick={onClose} aria-label="Close summary">
        ×
      </button>
    </div>
  )
}
