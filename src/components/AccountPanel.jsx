import { useEffect, useRef, useState } from 'react'
import { CoinIcon } from './CoinIcon'
import './Sheet.css'
import './AccountPanel.css'

// Friendlier words for the errors people are most likely to hit.
function explain(error) {
  const msg = error?.message ?? String(error)
  if (/rate limit|too many/i.test(msg)) return 'Too many emails just now. Please wait a few minutes and try again.'
  if (/invalid.*email|email.*invalid/i.test(msg)) return "That email address doesn't look right."
  return msg
}

// The "Log in" / account panel: a bottom sheet like My Cat.
export function AccountPanel({ ref, open, onClose, auth, profile, settings, streak, todayMinutes, onRename }) {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState('idle') // idle | sending | sent | error
  const [message, setMessage] = useState('')
  const [draftName, setDraftName] = useState(null) // null = not edited, show the saved name
  const firstField = useRef(null)

  useEffect(() => {
    if (!open) return
    firstField.current?.focus()
    const onKey = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  const name = draftName ?? profile?.display_name ?? ''

  const send = async (e) => {
    e.preventDefault()
    setStatus('sending')
    try {
      await auth.sendMagicLink(email.trim())
      setStatus('sent')
    } catch (error) {
      setStatus('error')
      setMessage(explain(error))
    }
  }

  const rename = (e) => {
    e.preventDefault()
    const clean = name.trim().slice(0, 40)
    if (clean && clean !== profile.display_name) onRename(clean)
    setDraftName(null)
  }

  const loggedIn = !!auth.user

  return (
    <section ref={ref} className="sheet account" role="dialog" aria-label={loggedIn ? 'Your account' : 'Log in'} hidden={!open}>
      <header className="sheet-head">
        <h2>{loggedIn ? `Hi, ${profile?.display_name ?? 'friend'}!` : 'Log in'}</h2>
        <button className="icon" onClick={onClose} aria-label="Close" ref={loggedIn ? firstField : undefined}>
          ×
        </button>
      </header>

      {!loggedIn && status !== 'sent' && (
        <form className="account-form" onSubmit={send}>
          <p className="account-note">
            Log in to save progress and earn coins. We'll email you a magic link, so there's no password to remember.
          </p>
          <label>
            Email
            <input
              ref={firstField}
              type="email"
              required
              autoComplete="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={status === 'sending'}
            />
          </label>
          <button className="primary" type="submit" disabled={status === 'sending' || !email.trim()}>
            {status === 'sending' ? 'Sending…' : 'Send magic link'}
          </button>
          {status === 'error' && (
            <p className="account-error" role="alert">
              {message}
            </p>
          )}
        </form>
      )}

      {!loggedIn && status === 'sent' && (
        <div className="account-sent" role="status">
          <p className="account-big" aria-hidden="true">
            ✉️
          </p>
          <p>
            Check your inbox for an email from Study Cat and open the link <strong>on this device</strong>. You'll be
            logged in right here.
          </p>
          <button onClick={() => setStatus('idle')}>Use a different email</button>
        </div>
      )}

      {loggedIn && (
        <div className="account-me">
          {profile ? (
            <dl className="account-stats">
              <div>
                <dt>Coins</dt>
                <dd>
                  <CoinIcon /> {profile.coins}
                </dd>
              </div>
              <div>
                <dt>Streak</dt>
                <dd>🔥 {streak}</dd>
              </div>
              <div>
                <dt>Best streak</dt>
                <dd>{profile.best_streak}</dd>
              </div>
              <div>
                <dt>Today</dt>
                <dd>{todayMinutes} min</dd>
              </div>
            </dl>
          ) : (
            <p className="account-note">Loading your profile…</p>
          )}
          {profile && (
            <form className="account-rename" onSubmit={rename}>
              <label>
                Your name
                <input value={name} maxLength={40} onChange={(e) => setDraftName(e.target.value)} />
              </label>
              <button type="submit" disabled={!name.trim() || name.trim() === profile.display_name}>
                Save
              </button>
            </form>
          )}
          {settings && (
            <p className="account-note">
              Coins: {settings.coins_per_minute} per minute you study, +{settings.full_session_bonus} for finishing a session
              of {settings.bonus_min_planned_minutes} minutes or more, up to {settings.daily_coin_cap} a day. A day counts for
              your streak at {settings.streak_min_minutes} minutes.
            </p>
          )}
          <button className="account-logout" onClick={auth.signOut}>
            Log out
          </button>
        </div>
      )}
    </section>
  )
}
