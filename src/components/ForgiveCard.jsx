// After a counted leave: "It was just the screen" takes it back. Browsers
// can't tell a screen that was switched off from switching to another app,
// so you tell the cat. On phones it then suggests Book mode for next time.
//
// card = { id, kind: 'ask' | 'tip' }
export function ForgiveCard({ card, onForgive, onBookMode, onClose }) {
  if (!card) return null
  return (
    <div className="forgive-card" key={card.id} role="status">
      {card.kind === 'ask' ? (
        <button className="forgive-button" onClick={onForgive}>
          <span aria-hidden="true">📱</span> It was just the screen
        </button>
      ) : (
        <>
          <span>
            Tip: turn on <strong>📖 Book mode</strong> before the screen goes off.
          </span>
          <button className="forgive-button" onClick={onBookMode}>
            Turn it on
          </button>
        </>
      )}
      <button className="icon" onClick={onClose} aria-label="Close">
        ×
      </button>
    </div>
  )
}
