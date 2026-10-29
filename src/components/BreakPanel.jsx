// The three things you can do with the cat during a break.
const BREAK_ACTIONS = [
  { animation: 'play', label: 'Play', emoji: '🧶', line: 'Wheee! Again, again!' },
  { animation: 'feed', label: 'Feed', emoji: '🐟', line: 'Yum! Thank you!' },
  { animation: 'bathe', label: 'Bathe', emoji: '🫧', line: 'Brrr... squeaky clean!' },
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
