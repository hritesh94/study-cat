import { useEffect, useRef, useState } from 'react'
import { PRIVACY_NOTE } from './client'
import { CrisisCard } from './CrisisCard'
import { GOAL_KINDS } from './useGoal'
import '../components/Sheet.css'
import './ChatPanel.css'

// The first thing the cat says (the chat function uses the same line).
const HELLO_NEW = "Mrrp, hi! I'm your study cat. What are you studying for?"
const HELLO = "Mrrp! I'm here. How's studying going?"

const SUGGESTION = {
  roadmap: 'Build my roadmap',
  quiz: 'Quiz me',
  goal: 'Set a goal',
}

const dayText = (day) => new Date(`${day}T12:00:00`).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })

// "Is this right?" for the goal the cat worked out while chatting.
function GoalConfirm({ goal, onConfirm, onEdit, saved }) {
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const confirm = async () => {
    setSaving(true)
    setError('')
    try {
      await onConfirm(goal)
    } catch (e) {
      setError(e.message)
      setSaving(false)
    }
  }
  return (
    <div className="goal-confirm">
      <strong>{goal.title}</strong>
      <dl>
        <dt>For</dt>
        <dd>{GOAL_KINDS[goal.kind]}</dd>
        <dt>Deadline</dt>
        <dd>{dayText(goal.deadline)}</dd>
        <dt>Per day</dt>
        <dd>{goal.hours_per_day} h</dd>
        {goal.subjects.length > 0 && (
          <>
            <dt>Subjects</dt>
            <dd>{goal.subjects.map((s) => `${s.name} (${s.level})`).join(', ')}</dd>
          </>
        )}
      </dl>
      {saved ? (
        <p className="goal-saved">✓ Saved as your goal</p>
      ) : (
        <div className="chat-actions">
          <button className="primary" onClick={confirm} disabled={saving}>
            {saving ? 'Saving…' : 'Looks right'}
          </button>
          {onEdit && <button onClick={() => onEdit(goal)}>Change something</button>}
        </div>
      )}
      {error && <p className="chat-error">{error}</p>}
    </div>
  )
}

// Chat with the cat (a bottom sheet). Logged in only: the AI needs an account.
//   chat     from useChat()
//   goal     your active goal (null = none yet: the cat asks about it)
//   onAction(name, payload)  'roadmap' | 'quiz' | 'goal' | 'login' | 'confirm-goal' | 'edit-goal'
export function ChatPanel({ ref, open, onClose, loggedIn, chat, goal, situation, onAction }) {
  const [draft, setDraft] = useState('')
  const [confirmClear, setConfirmClear] = useState(false)
  const [savedGoals, setSavedGoals] = useState(() => new Set()) // message ids whose goal was saved
  const input = useRef(null)
  const list = useRef(null)
  const [slow, setSlow] = useState(false) // the answer is taking a while (Google is busy)

  useEffect(() => {
    if (!chat.sending) return
    const later = setTimeout(() => setSlow(true), 7000)
    return () => {
      clearTimeout(later)
      setSlow(false)
    }
  }, [chat.sending])

  useEffect(() => {
    if (!open) return
    input.current?.focus()
    const onKey = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  // keep the newest message in view
  const count = chat.messages.length
  useEffect(() => {
    if (open) list.current?.scrollTo({ top: list.current.scrollHeight })
  }, [open, count, chat.sending])

  const send = (e) => {
    e.preventDefault()
    if (!draft.trim()) return
    chat.send(draft, situation)
    setDraft('')
  }

  // the last goal the cat proposed is the one to confirm
  const lastGoalId = [...chat.messages].reverse().find((m) => m.meta?.goal)?.id

  const confirmGoal = async (id, proposed) => {
    await onAction('confirm-goal', proposed)
    setSavedGoals((s) => new Set(s).add(id))
    chat.say('Yay! Want me to build your roadmap?', { suggest: 'roadmap', local: true })
  }

  return (
    <section ref={ref} className="sheet chat-panel" role="dialog" aria-label="Chat with the cat" hidden={!open}>
      <header className="sheet-head">
        <h2>Chat with the cat</h2>
        <div className="chat-head-buttons">
          {loggedIn && chat.messages.length > 0 && (
            <button className="chat-clear" onClick={() => setConfirmClear(true)}>
              Clear chat
            </button>
          )}
          <button className="icon" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>
      </header>

      {!loggedIn ? (
        <div className="chat-login">
          <p>The cat can chat, plan your studies and quiz you once you're logged in.</p>
          <button className="primary" onClick={() => onAction('login')}>
            Log in
          </button>
        </div>
      ) : (
        <>
          {confirmClear && (
            <div className="chat-confirm" role="alertdialog" aria-label="Clear chat?">
              <span>Delete the whole chat? The cat forgets it too.</span>
              <button
                onClick={async () => {
                  await chat.clear()
                  setConfirmClear(false)
                }}
              >
                Delete
              </button>
              <button onClick={() => setConfirmClear(false)}>Keep</button>
            </div>
          )}
          <ol className="chat-list" ref={list} aria-live="polite">
            {chat.loaded && chat.messages.length === 0 && (
              <li className="msg cat">
                <p>{goal ? HELLO : HELLO_NEW}</p>
              </li>
            )}
            {chat.messages.map((m) => (
              <li key={m.id} className={`msg ${m.role}${m.meta?.crisis ? ' serious' : ''}${m.meta?.error ? ' oops' : ''}`}>
                <p>{m.text}</p>
                {m.role === 'cat' && m.meta?.crisis && <CrisisCard />}
                {m.role === 'cat' && m.meta?.goal && m.id === lastGoalId && (
                  <GoalConfirm
                    goal={m.meta.goal}
                    saved={savedGoals.has(m.id)}
                    onConfirm={(g) => confirmGoal(m.id, g)}
                    onEdit={(g) => onAction('edit-goal', g)}
                  />
                )}
                {m.role === 'cat' && m.meta?.suggest && SUGGESTION[m.meta.suggest] && (
                  <div className="chat-actions">
                    <button className="primary" onClick={() => onAction(m.meta.suggest)}>
                      {SUGGESTION[m.meta.suggest]}
                    </button>
                  </div>
                )}
              </li>
            ))}
            {chat.sending && (
              <li className="msg cat typing" aria-label="The cat is typing">
                <p>
                  <span>•</span>
                  <span>•</span>
                  <span>•</span>
                </p>
                {slow && <small className="chat-slow">Still thinking… Google is busy right now, so this can take a bit.</small>}
              </li>
            )}
          </ol>
          <form className="chat-form" onSubmit={send}>
            <textarea
              ref={input}
              value={draft}
              rows={1}
              maxLength={2000}
              placeholder="Say something to the cat…"
              aria-label="Your message"
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) send(e)
              }}
            />
            <button className="primary" type="submit" disabled={!draft.trim() || chat.sending}>
              Send
            </button>
          </form>
          <p className="ai-note">
            {PRIVACY_NOTE}
            {chat.usage && ` · ${Math.max(0, chat.usage.limit - chat.usage.used)} messages left today`}
          </p>
        </>
      )}
    </section>
  )
}
