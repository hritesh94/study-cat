import { useEffect, useRef, useState } from 'react'
import { MEMORY_ITEMS } from './useLearning'
import '../components/Sheet.css'
import './MemoryPanel.css'

// "What the cat knows about me": every item in plain words, to edit or
// delete, "Delete everything", and the switch for learning.
export function MemoryPanel({ ref, open, onClose, api }) {
  const close = useRef(null)
  const [editing, setEditing] = useState(null) // { key, text }
  const [confirmAll, setConfirmAll] = useState(false)
  const [error, setError] = useState('')
  const { memory, memoryLoaded, loadMemory, learning } = api

  useEffect(() => {
    if (!open) return
    close.current?.focus()
    loadMemory()
    const onKey = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose, loadMemory])

  const run = async (work) => {
    setError('')
    try {
      await work()
    } catch (e) {
      setError(e.message)
    }
  }
  const known = MEMORY_ITEMS.filter((item) => memory?.[item.key])

  return (
    <section ref={ref} className="sheet memory-panel" role="dialog" aria-label="What the cat knows about me" hidden={!open}>
      <header className="sheet-head">
        <h2>What the cat knows about me</h2>
        <button ref={close} className="icon" onClick={onClose} aria-label="Close">
          ×
        </button>
      </header>

      <div className="memory-body">
        <label className="memory-switch">
          <input type="checkbox" checked={learning === true} onChange={(e) => api.setLearning(e.target.checked)} />
          <span>
            <strong>Let the cat learn about me</strong>
            <small>
              It remembers study things only (goals, what helps, how you talk, habits), so it can talk more like you. Never health, family,
              relationships or where you live.
            </small>
          </span>
        </label>
        {learning !== true && <p className="memory-note">Learning is off: the cat doesn't learn anything new, and uses its usual lines.</p>}

        {memoryLoaded && known.length === 0 && <p className="memory-note">Nothing yet. The cat learns a little after you chat with it.</p>}
        <ul className="memory-items">
          {MEMORY_ITEMS.map((item) => {
            const text = memory?.[item.key]
            if (!text && editing?.key !== item.key) return null
            return (
              <li key={item.key}>
                <span className="memory-label">{item.label}</span>
                {editing?.key === item.key ? (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault()
                      run(async () => {
                        await api.saveItem(item.key, editing.text)
                        setEditing(null)
                      })
                    }}
                  >
                    <textarea rows={2} maxLength={300} value={editing.text} onChange={(e) => setEditing({ ...editing, text: e.target.value })} autoFocus />
                    <div className="memory-buttons">
                      <button className="primary" type="submit">
                        Save
                      </button>
                      <button type="button" onClick={() => setEditing(null)}>
                        Cancel
                      </button>
                    </div>
                  </form>
                ) : (
                  <>
                    <p>{text}</p>
                    <div className="memory-buttons">
                      <button onClick={() => setEditing({ key: item.key, text })}>Edit</button>
                      <button onClick={() => run(() => api.deleteItem(item.key))}>Delete</button>
                    </div>
                  </>
                )}
              </li>
            )
          })}
        </ul>

        {error && (
          <p className="chat-error" role="alert">
            {error}
          </p>
        )}
        {known.length > 0 &&
          (confirmAll ? (
            <div className="chat-confirm" role="alertdialog" aria-label="Delete everything?">
              <span>Delete everything the cat knows about you?</span>
              <button
                onClick={() =>
                  run(async () => {
                    await api.deleteAll()
                    setConfirmAll(false)
                  })
                }
              >
                Delete
              </button>
              <button onClick={() => setConfirmAll(false)}>Keep</button>
            </div>
          ) : (
            <button className="memory-delete-all" onClick={() => setConfirmAll(true)}>
              Delete everything
            </button>
          ))}
      </div>
    </section>
  )
}
