import { useEffect, useRef } from 'react'
import { CoinIcon } from '../components/CoinIcon'
import { PRIVACY_NOTE } from './client'
import { hoursText } from './schedule'
import '../components/Sheet.css'
import './WeeklyReport.css'

const short = (day) => new Date(`${day}T12:00:00`).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })
const dayName = (day) => new Date(`${day}T12:00:00`).toLocaleDateString(undefined, { weekday: 'long' })

// The numbers come straight from the database; the words are the cat's.
export function WeeklyReport({ ref, open, onClose, api }) {
  const close = useRef(null)
  const { report, loading, error, load } = api

  useEffect(() => {
    if (!open) return
    close.current?.focus()
    if (!report && !loading && !error) load()
    const onKey = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose, report, loading, error, load])

  const s = report?.stats
  return (
    <section ref={ref} className="sheet weekly-report" role="dialog" aria-label="Weekly report" hidden={!open}>
      <header className="sheet-head">
        <h2>{s ? `Your week, ${short(s.week_start)} – ${short(s.week_end)}` : 'Your week'}</h2>
        <button ref={close} className="icon" onClick={onClose} aria-label="Close">
          ×
        </button>
      </header>

      {loading && <p className="report-thinking">The cat is looking back at your week…</p>}
      {error && (
        <div className="report-error">
          <p>{error}</p>
          <button onClick={load}>Try again</button>
        </div>
      )}
      {s && (
        <div className="report-body">
          <dl className="report-numbers">
            <div>
              <dt>Studied</dt>
              <dd>{hoursText(s.minutes)}</dd>
            </div>
            <div>
              <dt>Days</dt>
              <dd>{s.days_studied} of 7</dd>
            </div>
            <div>
              <dt>Best day</dt>
              <dd>{s.best_day ? `${dayName(s.best_day.day)}, ${hoursText(s.best_day.minutes)}` : '–'}</dd>
            </div>
            <div>
              <dt>Streak</dt>
              <dd>🔥 {s.streak}</dd>
            </div>
            <div>
              <dt>Coins</dt>
              <dd>
                <CoinIcon /> {s.coins}
              </dd>
            </div>
            {s.roadmap && (
              <div>
                <dt>Roadmap</dt>
                <dd>
                  {s.roadmap.done}/{s.roadmap.total} ({s.roadmap.pct}%)
                </dd>
              </div>
            )}
          </dl>
          {s.subjects.length > 0 && (
            <ul className="calendar-subjects report-subjects">
              {s.subjects.map((sub) => (
                <li key={sub.name} style={{ '--subject': 'var(--sage)' }}>
                  <span className="calendar-subject-name">{sub.name}</span>
                  <span className="calendar-bar" style={{ '--share': sub.minutes / s.minutes }} />
                  <span className="calendar-subject-min">{hoursText(sub.minutes)}</span>
                </li>
              ))}
            </ul>
          )}
          <p className="report-words">{report.summary}</p>
          <p className="report-tip">
            <strong>Tip:</strong> {report.tip}
          </p>
          <p className="ai-note">{PRIVACY_NOTE}</p>
        </div>
      )}
    </section>
  )
}
