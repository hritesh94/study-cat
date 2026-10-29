import { useCallback, useState } from 'react'
import { localDay, supabase } from '../lib/supabase'
import { askCat } from './client'

// The break quiz, step by step:
//   ask       "Quiz me on…" (the topic is filled in for you, you can change it)
//   loading   the cat thinks up 3 questions (the quiz function)
//   question  one question with its options
//   feedback  right or not, and why (checked by the server: answer_quiz)
//   done      the score, and +5 coins for finishing
//   error / crisis
// onFinish(result) is called with the server's last answer (coins etc.).
export function useQuiz({ onFinish }) {
  const [quiz, setQuiz] = useState(null)

  const offer = useCallback((topic, subject) => setQuiz({ stage: 'ask', topic: topic ?? '', subject: subject ?? null }), [])
  const close = useCallback(() => setQuiz(null), [])

  const start = useCallback(async (topic) => {
    setQuiz((q) => ({ ...q, stage: 'loading', topic }))
    const { data, error } = await askCat('quiz', { topic, subject: quiz?.subject ?? undefined })
    if (error) return setQuiz((q) => ({ ...q, stage: 'error', message: error.text }))
    if (data.crisis) return setQuiz((q) => ({ ...q, stage: 'crisis', message: data.reply }))
    setQuiz((q) => ({ ...q, stage: 'question', quizId: data.quizId, questions: data.questions, index: 0, result: null }))
  }, [quiz?.subject])

  const answer = useCallback(
    async (choice) => {
      if (!quiz || quiz.stage !== 'question') return
      setQuiz((q) => ({ ...q, stage: 'checking', choice }))
      const { data, error } = await supabase.rpc('answer_quiz', { p_quiz_id: quiz.quizId, p_choice: choice, p_local_day: localDay() })
      if (error) {
        const message = /expired/i.test(error.message) ? 'That quiz is too old now. Want a new one?' : 'Mrrp, I lost my place. Try again?'
        return setQuiz((q) => ({ ...q, stage: 'error', message }))
      }
      setQuiz((q) => ({ ...q, stage: 'feedback', result: data }))
      if (data.finished) onFinish?.(data)
    },
    [quiz, onFinish],
  )

  const next = useCallback(
    () =>
      setQuiz((q) => (q.result?.finished ? { ...q, stage: 'done' } : { ...q, stage: 'question', index: q.index + 1, result: null, choice: null })),
    [],
  )

  return { quiz, offer, start, answer, next, close }
}
