import { CoinIcon } from './CoinIcon'

// "+12 coins" floating up from the cat's head after a study session.
// It sits where the speech bubble does (the game writes --cat-x / --cat-head-y).
export function CoinPop({ pop }) {
  if (!pop) return null
  return (
    <div className="coin-pop" key={pop.id} role="status">
      {pop.coins > 0 ? (
        <>
          <CoinIcon size={22} /> +{pop.coins} {pop.coins === 1 ? 'coin' : 'coins'}
        </>
      ) : (
        "Today's coins are all collected 🐾"
      )}
      {pop.coins > 0 && (
        <span className="coin-pop-sparks" aria-hidden="true">
          <CoinIcon size={12} />
          <CoinIcon size={10} />
          <CoinIcon size={12} />
        </span>
      )}
    </div>
  )
}
