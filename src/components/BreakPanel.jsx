// The three things you can do with the cat during a break.
// (What the cat says back is in catLines.js: react.play, react.feed, react.bathe.)
const BREAK_ACTIONS = [
  { animation: 'play', label: 'Play', emoji: '🧶' },
  { animation: 'feed', label: 'Feed', emoji: '🐟' },
  { animation: 'bathe', label: 'Bathe', emoji: '🫧' },
]

export function BreakPanel({ onAction, busy }) {
  return (
    <div className="break-actions">
      {BREAK_ACTIONS.map((action) => (
        <button key={action.animation} onClick={() => onAction(action)} disabled={busy}>
          <span aria-hidden="true">{action.emoji}</span> {action.label}
        </button>
      ))}
    </div>
  )
}
