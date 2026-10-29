// Shown under the cat's reply when a message suggests real distress.
// Plain and serious on purpose: no cat jokes here, ever.
export function CrisisCard() {
  return (
    <div className="crisis-card" role="alert">
      <strong>You don't have to go through this alone.</strong>
      <p>Please talk to someone now. These are free and confidential:</p>
      <ul>
        <li>
          <span>India:</span> <a href="tel:14416">Tele-MANAS 14416</a> or <a href="tel:18008914416">1-800-891-4416</a>, any time, in many
          languages
        </li>
        <li>
          <span>Anywhere:</span>{' '}
          <a href="https://findahelpline.com" target="_blank" rel="noopener noreferrer">
            findahelpline.com
          </a>{' '}
          finds a free helpline in your country
        </li>
        <li>
          <span>In danger right now:</span> call your local emergency number (<a href="tel:112">112</a> in India)
        </li>
      </ul>
      <p>Telling someone you trust, a friend, family member or teacher, helps too.</p>
    </div>
  )
}
