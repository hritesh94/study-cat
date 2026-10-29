// A little hand-drawn coin with a paw on it.
export function CoinIcon({ size = 16 }) {
  return (
    <svg className="coin-icon" width={size} height={size} viewBox="0 0 16 16" aria-hidden="true">
      <circle cx="8" cy="8" r="7" fill="#f4c04e" stroke="#4b3b47" strokeWidth="1.4" />
      <circle cx="8" cy="8" r="4.6" fill="none" stroke="#d99a2b" strokeWidth="1" />
      <ellipse cx="8" cy="9.2" rx="1.6" ry="1.3" fill="#b8791d" />
      <circle cx="6.2" cy="6.8" r="0.7" fill="#b8791d" />
      <circle cx="8" cy="6.1" r="0.7" fill="#b8791d" />
      <circle cx="9.8" cy="6.8" r="0.7" fill="#b8791d" />
    </svg>
  )
}
