import { useEffect, useMemo, useRef, useState } from 'react'
import { syllabusFor } from '../data/syllabus'
import { localDay } from '../lib/supabase'
import { PRIVACY_NOTE } from './client'
import { shrinkImage } from './image'
import { GOAL_KINDS } from './useGoal'
import { addDays } from './schedule'
import '../components/Sheet.css'
import './GoalForm.css'

const LEVELS = ['weak', 'okay', 'strong']
const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const DEFAULT_TITLES = { neet: 'NEET UG', neet_pg: 'NEET PG', jee_main: 'JEE Main', boards: 'Board exams', custom: '' }

const initial = (start) => {
  const kind = start?.kind ?? 'neet'
  return {
    kind,
    title: start?.title ?? DEFAULT_TITLES[kind],
    deadline: start?.deadline ?? '',
    hours: String(start?.hours_per_day ?? 4),
    lightDay: start?.light_weekday ?? 0,
    levels: Object.fromEntries((start?.subjects ?? []).map((s) => [s.name, s.level])),
    subjectNames: (start?.subjects ?? []).map((s) => s.name).join(', '),
    done: new Set(start?.done_chapters ?? []),
    notes: start?.notes ?? '',
  }
}

// "Set a goal": what you're studying for, the deadline, hours per day,
// how each subject feels, and the chapters already done. Custom goals:
// describe it, and paste or photograph the syllabus or task list.
//   start: a goal to edit, or the one the cat worked out in the chat
//   onSave(fields, extra) — extra = { build, syllabusText, image } for the roadmap
export function GoalForm({ ref, open, onClose, start, onSave }) {
  const [form, setForm] = useState(() => initial(start))
  const [syllabusText, setSyllabusText] = useState('')
  const [photo, setPhoto] = useState(null) // { mimeType, data, bytes, name }
  const [photoError, setPhotoError] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const first = useRef(null)
  const [startKey, setStartKey] = useState(start)

  // a new starting point (e.g. "Change something" in the chat) refills the form
  if (start !== startKey) {
    setStartKey(start)
    setForm(initial(start))
  }

  useEffect(() => {
    if (!open) return
    first.current?.focus()
    const onKey = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  const syllabus = syllabusFor(form.kind)
  const subjects = useMemo(
    () =>
      syllabus
        ? syllabus.subjects
        : form.subjectNames
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean)
            .slice(0, 12),
    [syllabus, form.subjectNames],
  )
  const set = (fields) => setForm((f) => ({ ...f, ...fields }))
  const tomorrow = addDays(localDay(), 1)
  const hours = Number(form.hours)
  const valid =
    form.title.trim() && form.deadline >= tomorrow && hours >= 0.5 && hours <= 16 && (syllabus || form.notes.trim() || syllabusText.trim() || photo)

  const pickPhoto = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    setPhotoError('')
    if (!file) return
    try {
      setPhoto({ ...(await shrinkImage(file)), name: file.name })
    } catch (err) {
      setPhoto(null)
      setPhotoError(err.message)
    }
  }

  const save = async (build) => {
    setSaving(true)
    setError('')
    try {
      await onSave(
        {
          kind: form.kind,
          title: form.title.trim().slice(0, 80),
          deadline: form.deadline,
          hours_per_day: Math.round(hours * 2) / 2,
          light_weekday: Number(form.lightDay),
          subjects: subjects.map((name) => ({ name, level: form.levels[name] ?? 'okay' })),
          done_chapters: syllabus ? [...form.done].filter((id) => syllabus.chapters.some((c) => c.id === id)) : [],
          notes: syllabus ? null : form.notes.trim().slice(0, 8000) || null,
        },
        { build, syllabusText: syllabusText.trim() || undefined, image: photo ? { mimeType: photo.mimeType, data: photo.data } : undefined },
      )
      setSyllabusText('')
      setPhoto(null)
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <section ref={ref} className="sheet goal-form" role="dialog" aria-label="Set a goal" hidden={!open}>
      <header className="sheet-head">
        <h2>{start?.id ? 'Your goal' : 'Set a goal'}</h2>
        <button className="icon" onClick={onClose} aria-label="Close">
          ×
        </button>
      </header>

      <form className="goal-fields" onSubmit={(e) => e.preventDefault()}>
        <fieldset className="goal-kinds">
          <legend>What are you studying for?</legend>
          {Object.entries(GOAL_KINDS).map(([kind, name], i) => (
            <label key={kind} className={`goal-kind${form.kind === kind ? ' picked' : ''}`}>
              <input
                ref={i === 0 ? first : undefined}
                type="radio"
                name="goal-kind"
                checked={form.kind === kind}
                onChange={() => set({ kind, title: DEFAULT_TITLES[kind] || form.title })}
              />
              {name}
            </label>
          ))}
        </fieldset>

        <div className="goal-row">
          <label>
            Name
            <input value={form.title} maxLength={80} placeholder="e.g. Class 12 boards" onChange={(e) => set({ title: e.target.value })} />
          </label>
          <label>
            Deadline
            <input type="date" value={form.deadline} min={tomorrow} onChange={(e) => set({ deadline: e.target.value })} />
          </label>
        </div>
        <div className="goal-row">
          <label>
            Hours a day
            <input type="number" inputMode="decimal" min="0.5" max="16" step="0.5" value={form.hours} onChange={(e) => set({ hours: e.target.value })} />
          </label>
          <label>
            Lighter day
            <select value={form.lightDay} onChange={(e) => set({ lightDay: Number(e.target.value) })}>
              {WEEKDAYS.map((d, i) => (
                <option key={d} value={i}>
                  {d}
                </option>
              ))}
            </select>
          </label>
        </div>

        {!syllabus && (
          <label>
            Subjects (separated by commas)
            <input value={form.subjectNames} maxLength={400} placeholder="e.g. Maths, Physics, English" onChange={(e) => set({ subjectNames: e.target.value })} />
          </label>
        )}
        {subjects.length > 0 && (
          <fieldset className="goal-levels">
            <legend>How does each subject feel?</legend>
            {subjects.map((name) => (
              <div key={name} className="goal-level">
                <span>{name}</span>
                <div role="radiogroup" aria-label={name}>
                  {LEVELS.map((level) => (
                    <button
                      key={level}
                      type="button"
                      role="radio"
                      aria-checked={(form.levels[name] ?? 'okay') === level}
                      className={(form.levels[name] ?? 'okay') === level ? 'picked' : ''}
                      onClick={() => set({ levels: { ...form.levels, [name]: level } })}
                    >
                      {level}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </fieldset>
        )}

        {syllabus ? (
          <details className="goal-done">
            <summary>Chapters already done ({form.done.size})</summary>
            {syllabus.subjects.map((subject) => (
              <fieldset key={subject}>
                <legend>{subject}</legend>
                {syllabus.chapters
                  .filter((c) => c.subject === subject)
                  .map((c) => (
                    <label key={c.id} className="goal-chapter">
                      <input
                        type="checkbox"
                        checked={form.done.has(c.id)}
                        onChange={(e) => {
                          const done = new Set(form.done)
                          if (e.target.checked) done.add(c.id)
                          else done.delete(c.id)
                          set({ done })
                        }}
                      />
                      {c.name}
                    </label>
                  ))}
              </fieldset>
            ))}
            <p className="ai-note">
              Chapters from the official {syllabus.name} syllabus (checked {syllabus.lastChecked}). Please double-check them against the official PDF.
            </p>
          </details>
        ) : (
          <>
            <label>
              What's the goal about?
              <textarea rows={2} maxLength={8000} value={form.notes} placeholder="e.g. CBSE class 12, science stream" onChange={(e) => set({ notes: e.target.value })} />
            </label>
            <label>
              Syllabus or task list (paste it here)
              <textarea rows={3} maxLength={8000} value={syllabusText} placeholder="Chapter names, topics, tasks…" onChange={(e) => setSyllabusText(e.target.value)} />
            </label>
            <label className="goal-photo">
              …or a photo of it
              <input type="file" accept="image/*" onChange={pickPhoto} />
            </label>
            {photo && (
              <p className="ai-note">
                📷 {photo.name} ({Math.round(photo.bytes / 1024)} KB){' '}
                <button type="button" onClick={() => setPhoto(null)}>
                  Remove
                </button>
              </p>
            )}
            {photoError && <p className="chat-error">{photoError}</p>}
          </>
        )}

        <p className="ai-note">{PRIVACY_NOTE}</p>
        {error && (
          <p className="chat-error" role="alert">
            {error}
          </p>
        )}
        {start?.id ? (
          // changing hours or the deadline only re-plans the days (no AI)
          <div className="goal-buttons">
            <button type="button" className="primary" disabled={!valid || saving} onClick={() => save(false)}>
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        ) : (
          <div className="goal-buttons">
            <button type="button" className="primary" disabled={!valid || saving} onClick={() => save(true)}>
              {saving ? 'Saving…' : 'Save and build my roadmap'}
            </button>
            <button type="button" disabled={!valid || saving} onClick={() => save(false)}>
              Just save
            </button>
          </div>
        )}
      </form>
    </section>
  )
}
