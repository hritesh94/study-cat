import { useEffect, useRef, useState } from 'react'
import { CoinIcon } from '../components/CoinIcon'
import { PRIVACY_NOTE } from './client'
import { CrisisCard } from './CrisisCard'
import './QuizBubble.css'

// The quiz, asked one question at a time in the cat's speech bubble.
export function QuizBubble({ api }) {
  const { quiz } = api
  const [topic, setTopic] = useState('')
  const [seed, setSeed] = useState(null)
  const first = useRef(null)

  // a new offer fills in its topic
  if (quiz?.stage === 'ask' && seed !== quiz) {
    setSeed(quiz)
    setTopic(quiz.topic)
  }

  const stage = quiz?.stage
  const index = quiz?.index
  useEffect(() => {
    first.current?.focus()
  }, [stage, index])
  useEffect(() => {
    if (!stage) return
    const onKey = (e) => e.key === 'Escape' && api.close()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [stage, api])

  if (!quiz) return null
  const q = quiz.questions?.[quiz.index]
  const r = quiz.result

  return (
    <div className="bubble quiz-bubble" role="dialog" aria-label="Quiz">
      <button className="icon quiz-close" onClick={api.close} aria-label="Close quiz">
        ×
      </button>

      {quiz.stage === 'ask' && (
        <form
          className="quiz-ask"
          onSubmit={(e) => {
            e.preventDefault()
            if (topic.trim()) api.start(topic.trim())
          }}
        >
          <p>Quiz you? What on?</p>
          <input ref={first} value={topic} maxLength={200} placeholder="e.g. Optics, or a few words" onChange={(e) => setTopic(e.target.value)} aria-label="Quiz topic" />
          <button className="primary" type="submit" disabled={!topic.trim()}>
            Quiz me
          </button>
          <small>{PRIVACY_NOTE}</small>
        </form>
      )}

      {quiz.stage === 'loading' && <p className="quiz-thinking">Hmm, let me think of 3 questions…</p>}

      {(quiz.stage === 'question' || quiz.stage === 'checking' || quiz.stage === 'feedback') && q && (
        <div className="quiz-question">
          <small>
            Question {quiz.index + 1} of {quiz.questions.length}
          </small>
          <p>{q.q}</p>
          <div className="quiz-options">
            {q.options.map((o, i) => {
              const state = r ? (i === r.answer ? 'right' : i === quiz.choice ? 'wrong' : '') : i === quiz.choice ? 'chosen' : ''
              return (
                <button
                  key={i}
                  ref={i === 0 && quiz.stage === 'question' ? first : undefined}
                  className={`quiz-option ${state}`}
                  disabled={quiz.stage !== 'question'}
                  onClick={() => api.answer(i)}
                >
                  {o}
                </button>
              )
            })}
          </div>
          {r && (
            <div className="quiz-feedback" role="status">
              <strong>{r.correct ? 'Yes! Purr.' : 'Not quite!'}</strong> {r.explain}
              <button ref={first} className="primary" onClick={api.next}>
                {r.finished ? 'Finish' : 'Next'}
              </button>
            </div>
          )}
        </div>
      )}

      {quiz.stage === 'done' && (
        <div className="quiz-done" role="status">
          <p>
            {quiz.result.score} of {quiz.result.total} right!{' '}
            {quiz.result.score === quiz.result.total ? 'You know this!' : 'Good practice, and now you know the rest.'}
          </p>
          {quiz.result.coins_awarded > 0 ? (
            <p className="quiz-coins">
              <CoinIcon /> +{quiz.result.coins_awarded} for finishing
            </p>
          ) : (
            <small>No coins this time: today's coin jar is full.</small>
          )}
          <button ref={first} className="primary" onClick={api.close}>
            Thanks, cat
          </button>
        </div>
      )}

      {quiz.stage === 'error' && (
        <div className="quiz-done">
          <p>{quiz.message}</p>
          <button ref={first} onClick={api.close}>
            Okay
          </button>
        </div>
      )}

      {quiz.stage === 'crisis' && (
        <div className="quiz-done serious">
          <p>{quiz.message}</p>
          <CrisisCard />
        </div>
      )}
    </div>
  )
}
