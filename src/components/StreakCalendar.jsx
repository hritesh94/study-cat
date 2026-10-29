import { useEffect, useRef, useState } from 'react'
import { useDailyTotals } from '../hooks/useDailyTotals'
import { addDays, dayName, levelFor, monthGrid, monthName, monthOf, monthRange, shiftMonth } from '../lib/calendar'
import { localDay } from '../lib/supabase'
import { CoinIcon } from './CoinIcon'
import './Sheet.css'
import './StreakCalendar.css'

const WEEKDAYS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su']

// Tap the 🔥 (or "Today") → a month of study: each day coloured by
// minutes, streak days joined by a little flame trail, tap a day for more.
export function StreakCalendar({ ref, open, onClose, userId, local, streak, bestStreak, streakMinutes, version }) {
  const today = localDay()
  const [month, setMonth] = useState(monthOf(today))
  const [picked, setPicked] = useState(today)
  const closeButton = useRef(null)
  const swipe = useRef(null)
  const { from, to } = monthRange(month)
  const { days, ready, error } = useDailyTotals({ userId, from, to, version, enabled: open, local })

  useEffect(() => {
    if (!open) return
    closeButton.current?.focus()
    const onKey = (e) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowLeft' && e.altKey) setMonth((m) => shiftMonth(m, -1))
      if (e.key === 'ArrowRight' && e.altKey) setMonth((m) => shiftMonth(m, 1))
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  const isNow = month === monthOf(today)
  const go = (n) => {
    if (n > 0 && isNow) return // nothing to see in the future
    const next = shiftMonth(month, n)
    setMonth(next)
    setPicked(next === monthOf(today) ? today : null)
  }

  const minutesOf = (d) => days[d]?.minutes ?? 0
  const isStreakDay = (d) => d && minutesOf(d) >= streakMinutes
  const monthMinutes = Object.values(days).reduce((sum, d) => sum + d.minutes, 0)
  const hours = monthMinutes / 60
  const detail = picked && monthOf(picked) === month ? { day: picked, ...(days[picked] ?? { minutes: 0, subjects: [] }) } : null

  // swipe left / right on the month to change it (phones)
  const onPointerDown = (e) => (swipe.current = { x: e.clientX, y: e.clientY })
  const onPointerUp = (e) => {
    const start = swipe.current
    swipe.current = null
    if (!start) return
    const dx = e.clientX - start.x
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(e.clientY - start.y) * 1.5) go(dx < 0 ? 1 : -1)
  }

  return (
    <section ref={ref} className="sheet calendar" role="dialog" aria-label="Study calendar" hidden={!open}>
      <header className="sheet-head">
        <h2>Study calendar</h2>
        <button className="icon" onClick={onClose} aria-label="Close" ref={closeButton}>
          ×
        </button>
      </header>

      <dl className="calendar-stats">
        <div>
          <dt>Streak</dt>
          <dd>
            <span aria-hidden="true">🔥</span> {streak}
          </dd>
        </div>
        <div>
          <dt>Best</dt>
          <dd>{bestStreak}</dd>
        </div>
        <div>
          <dt>This month</dt>
          <dd>{hours >= 10 ? Math.round(hours) : Math.round(hours * 10) / 10} h</dd>
        </div>
      </dl>

      <div className="calendar-nav">
        <button className="icon" onClick={() => go(-1)} aria-label="Previous month">
          ‹
        </button>
        <span className="calendar-month" aria-live="polite">
          {monthName(month)}
        </span>
        <button className="icon" onClick={() => go(1)} aria-label="Next month" disabled={isNow}>
          ›
        </button>
      </div>

      <div className="calendar-grid" onPointerDown={onPointerDown} onPointerUp={onPointerUp} onPointerCancel={() => (swipe.current = null)}>
        {WEEKDAYS.map((w) => (
          <span key={w} className="calendar-weekday" aria-hidden="true">
            {w}
          </span>
        ))}
        {monthGrid(month).flatMap((week, w) =>
          week.map((d, i) => {
            if (!d) return <span key={`blank-${w}-${i}`} className="calendar-blank" />
            const minutes = minutesOf(d)
            const streakDay = isStreakDay(d)
            const crown = days[d]?.goal_hit // hit the daily goal from your roadmap
            const classes = [
              'calendar-day',
              `level-${levelFor(minutes)}`,
              streakDay && 'streak',
              streakDay && i > 0 && isStreakDay(addDays(d, -1)) && 'trail-left',
              streakDay && i < 6 && isStreakDay(addDays(d, 1)) && 'trail-right',
              d === today && 'today',
              d > today && 'future',
              d === picked && 'picked',
            ]
            return (
              <button
                key={d}
                className={classes.filter(Boolean).join(' ')}
                disabled={d > today}
                onClick={() => setPicked(d)}
                aria-pressed={d === picked}
                aria-label={`${dayName(d)}: ${minutes} minutes${streakDay ? ', streak day' : ''}${crown ? ', daily goal reached' : ''}`}
              >
                <span className="calendar-num">{Number(d.slice(8))}</span>
                {streakDay && (
                  <span className="calendar-flame" aria-hidden="true">
                    🔥
                  </span>
                )}
                {crown && (
                  <span className="calendar-crown" aria-hidden="true">
                    👑
                  </span>
                )}
              </button>
            )
          }),
        )}
      </div>

      <div className="calendar-legend" aria-hidden="true">
        less
        {[0, 1, 2, 3, 4].map((l) => (
          <span key={l} className={`calendar-swatch level-${l}`} />
        ))}
        more
      </div>

      {error && <p className="calendar-note">Couldn't load your study days ({error}).</p>}
      {!error && userId && !ready && <p className="calendar-note">Loading…</p>}

      {detail && (
        <div className="calendar-detail" role="status">
          <h3>{detail.day === today ? 'Today' : dayName(detail.day)}</h3>
          {detail.minutes === 0 ? (
            <p className="calendar-note">No study this day.</p>
          ) : (
            <>
              <p className="calendar-detail-stats">
                <strong>{detail.minutes} min</strong>
                {detail.goal_hit && <span>👑 daily goal</span>}
                {detail.sessions !== undefined && (
                  <span>
                    {detail.sessions} {detail.sessions === 1 ? 'session' : 'sessions'}
                  </span>
                )}
                {detail.coins !== undefined && (
                  <span className="calendar-coins">
                    <CoinIcon /> {detail.coins}
                  </span>
                )}
              </p>
              <ul className="calendar-subjects">
                {detail.subjects.map((s, i) => (
                  <li key={`${s.name}-${i}`} style={{ '--subject': s.color ?? 'var(--ink-soft)' }}>
                    <span className="calendar-subject-name">{s.name ?? 'No subject'}</span>
                    <span className="calendar-bar" style={{ '--share': s.minutes / detail.minutes }} />
                    <span className="calendar-subject-min">{s.minutes} min</span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}
    </section>
  )
}
