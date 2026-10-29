import { useEffect, useMemo, useRef, useState } from 'react'
import { PRIVACY_NOTE } from './client'
import { buildSchedule, daysBetween, hoursText, roadmapWeek } from './schedule'
import '../components/Sheet.css'
import './RoadmapPanel.css'

const VERDICT = { comfortable: 'Looks doable', tight: "It's tight", not_enough_time: 'Not enough time' }
const PHASE = { learn: 'Learning', buffer: 'Buffer day (catch up)', revise: 'Revision', mock: 'Mock tests' }

// Your roadmap: countdown, progress, today's plan, weekly milestones and a
// chapter checklist. The days are planned by schedule.js (no AI); only
// "Build" / "Regenerate" ask the AI (and count toward the daily limit).
export function RoadmapPanel({ ref, open, onClose, goalApi, rules, today, onEditGoal }) {
  const { goal, roadmap, building: busy, buildError: message } = goalApi
  const [askRegenerate, setAskRegenerate] = useState(false)
  const close = useRef(null)

  useEffect(() => {
    if (!open) return
    close.current?.focus()
    const onKey = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  const schedule = useMemo(() => (goal ? buildSchedule({ goal, plan: roadmap?.plan, today, rules }) : null), [goal, roadmap, today, rules])

  const build = () => {
    setAskRegenerate(false)
    goalApi.buildRoadmap()
  }

  if (!goal) {
    return (
      <section ref={ref} className="sheet roadmap-panel" role="dialog" aria-label="Your roadmap" hidden={!open}>
        <header className="sheet-head">
          <h2>Your roadmap</h2>
          <button ref={close} className="icon" onClick={onClose} aria-label="Close">
            ×
          </button>
        </header>
        <p>Set a goal first, and the cat will plan your way there.</p>
        <button className="primary" onClick={onEditGoal}>
          Set a goal
        </button>
      </section>
    )
  }

  const left = daysBetween(today, goal.deadline)
  const plan = roadmap?.plan
  const week = roadmap ? roadmapWeek(roadmap, today) : 1
  const done = new Set(goal.done_chapters ?? [])
  const chapters = plan?.chapters ?? goal.chapters ?? []
  const subjects = [...new Set(chapters.map((c) => c.subject))]
  const todayPlan = schedule?.today

  return (
    <section ref={ref} className="sheet roadmap-panel" role="dialog" aria-label="Your roadmap" hidden={!open}>
      <header className="sheet-head">
        <h2>{goal.title}</h2>
        <button ref={close} className="icon" onClick={onClose} aria-label="Close">
          ×
        </button>
      </header>

      <div className="roadmap-body">
        <p className="roadmap-countdown">
          <strong>{left > 0 ? left : 0}</strong> {left === 1 ? 'day' : 'days'} to {goal.title}
        </p>
        <div className="roadmap-progress" role="progressbar" aria-valuenow={schedule.progress.pct} aria-valuemin={0} aria-valuemax={100} aria-label="Chapters done">
          <span style={{ width: `${schedule.progress.pct}%` }} />
        </div>
        <p className="roadmap-small">
          {schedule.progress.done} of {schedule.progress.total} chapters done ({schedule.progress.pct}%) · {Number(goal.hours_per_day)} h a day
        </p>

        {!plan ? (
          <div className="roadmap-empty">
            <p>No roadmap yet. The cat can plan the chapter order, the hours and the weeks for you.</p>
            <button className="primary" onClick={build} disabled={busy}>
              {busy ? 'Planning… (this takes a moment)' : 'Build my roadmap'}
            </button>
          </div>
        ) : (
          <>
            <div className={`roadmap-verdict ${plan.feasibility.verdict}`}>
              <strong>{VERDICT[plan.feasibility.verdict]}</strong>
              <span>{plan.feasibility.message}</span>
              <span className="roadmap-small">
                About {plan.feasibility.needed_hours} h of chapters, {plan.feasibility.learn_hours} h for learning (of {plan.feasibility.available_hours} h
                in total).
              </span>
            </div>

            {todayPlan && (
              <div className="roadmap-today">
                <h3>
                  Today: {hoursText(todayPlan.target)}
                  {todayPlan.light && ' (lighter day)'}
                </h3>
                {todayPlan.chapters.length > 0 ? (
                  <ul>
                    {todayPlan.chapters.map((c) => (
                      <li key={c.id}>
                        {c.name} <span className="roadmap-small">({c.subject}, {hoursText(c.minutes)})</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="roadmap-small">{PHASE[todayPlan.phase]}</p>
                )}
              </div>
            )}
            {schedule.behind && (
              <p className="roadmap-behind">
                {schedule.unscheduled.length} {schedule.unscheduled.length === 1 ? "chapter doesn't" : "chapters don't"} fit before revision starts. More
                hours a day, or a later deadline, would help.
              </p>
            )}

            {plan.milestones.length > 0 && (
              <details className="roadmap-section" open>
                <summary>Milestones</summary>
                <ol className="roadmap-milestones">
                  {plan.milestones.map((m, i) => (
                    <li key={i} className={m.week === week ? 'now' : m.week < week ? 'past' : ''}>
                      <span>Week {m.week}</span> {m.text}
                    </li>
                  ))}
                </ol>
              </details>
            )}
          </>
        )}

        <details className="roadmap-section">
          <summary>Chapters</summary>
          {subjects.map((subject) => (
            <fieldset key={subject} className="roadmap-chapters">
              <legend>{subject}</legend>
              {chapters
                .filter((c) => c.subject === subject)
                .map((c) => (
                  <label key={c.id}>
                    <input type="checkbox" checked={done.has(c.id)} onChange={(e) => goalApi.setDone(c.id, e.target.checked)} />
                    <span>{c.name}</span>
                    {c.hours > 0 && <span className="roadmap-small">{c.hours} h</span>}
                  </label>
                ))}
            </fieldset>
          ))}
        </details>

        {message && (
          <p className="chat-error" role="alert">
            {message}
          </p>
        )}
        {askRegenerate && (
          <div className="chat-confirm" role="alertdialog" aria-label="Make a new roadmap?">
            <span>Make a new roadmap? That uses one of today's roadmaps.</span>
            <button onClick={build}>Yes, new one</button>
            <button onClick={() => setAskRegenerate(false)}>No</button>
          </div>
        )}
        <div className="roadmap-buttons">
          <button onClick={onEditGoal}>Edit goal</button>
          {plan && (
            <button onClick={() => setAskRegenerate(true)} disabled={busy}>
              {busy ? 'Planning…' : 'Regenerate roadmap'}
            </button>
          )}
        </div>
        <p className="ai-note">{PRIVACY_NOTE}</p>
      </div>
    </section>
  )
}
