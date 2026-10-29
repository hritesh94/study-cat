// POST /functions/v1/quiz   { topic, subject?, timeZone? }
//   → { quizId, topic, questions: [{ q, options }], usage }   (no answers!)
//     or { crisis: true, reply } if the topic suggests real distress
//
// 3 short multiple-choice questions on what you just studied. The answers
// stay in the database; answer_quiz() (migration 10) checks each one and
// gives +5 coins for finishing.
import { OUTPUT } from '../config.js'
import { AiError } from '../errors.js'
import { withAllowance } from '../http.js'
import { systemPrompt } from '../prompts.js'
import { generateJson } from '../providers/index.js'
import { CRISIS_REPLY, detectDistress } from '../safety.js'
import { voiceProfile } from '../voiceProfile.js'
import { clip, num, text } from '../validate.js'

const QUESTIONS = 3

export const QUIZ_SCHEMA = {
  type: 'object',
  properties: {
    questions: {
      type: 'array',
      minItems: QUESTIONS,
      maxItems: QUESTIONS,
      items: {
        type: 'object',
        properties: {
          q: { type: 'string', description: 'The question, at most 25 words.' },
          options: { type: 'array', minItems: 4, maxItems: 4, items: { type: 'string' } },
          answer: { type: 'integer', minimum: 0, maximum: 3, description: 'Index of the one correct option.' },
          explain: { type: 'string', description: 'One short sentence: why that answer is right.' },
        },
        required: ['q', 'options', 'answer', 'explain'],
      },
    },
  },
  required: ['questions'],
}

const TASK = `TASK: Write a quick ${QUESTIONS}-question multiple-choice quiz on the topic the student gives, at the level of their exam if you know it. Each question: short and clear (at most 25 words), 4 short options with exactly ONE correct, "answer" is its index (0 to 3), and "explain" is one short, friendly sentence on why. Check every answer carefully: it must be factually right. Vary where the correct option is. If the topic isn't something you can study, quiz them on good study habits instead.`

export function validQuestions(out) {
  const questions = []
  for (const item of Array.isArray(out?.questions) ? out.questions : []) {
    const q = clip(item?.q, 220)
    const options = (Array.isArray(item?.options) ? item.options : []).map((o) => clip(o, 90)).filter(Boolean)
    const answer = num(item?.answer, -1, 10, -1)
    if (!q || options.length < 3 || options.length > 4 || new Set(options).size !== options.length) continue
    if (!Number.isInteger(answer) || answer < 0 || answer >= options.length) continue
    questions.push({ q, options, answer, explain: clip(item?.explain, 200) || 'That one is right!' })
    if (questions.length === QUESTIONS) break
  }
  if (questions.length < QUESTIONS) throw new AiError('bad_output', `Only ${questions.length} good questions`)
  return questions
}

export async function quiz(body, { store, ai }) {
  const topic = text(body.topic, { max: 200, name: 'topic' })
  const subject = text(body.subject, { max: 40, required: false, name: 'subject' })
  if (detectDistress(topic)) return { crisis: true, reply: CRISIS_REPLY }

  return withAllowance(store, 'quiz', async (usage) => {
    const [profile, goal] = await Promise.all([voiceProfile(store), store.activeGoal()])
    const context = [
      goal ? `They're preparing for: ${goal.title} (${goal.kind}).` : 'No exam goal set.',
      subject ? `Subject: ${subject}.` : '',
    ]
      .filter(Boolean)
      .join(' ')
    const out = await generateJson(ai(), {
      system: systemPrompt({ profile, task: TASK, context }),
      messages: [{ role: 'user', text: `Quiz me on: ${topic}` }],
      schema: QUIZ_SCHEMA,
      maxTokens: OUTPUT.quiz.maxTokens,
      timeoutMs: OUTPUT.quiz.timeoutMs,
      temperature: 0.5,
    })
    const questions = validQuestions(out)
    const saved = await store.saveQuiz(topic, questions)
    return {
      quizId: saved.id,
      topic,
      questions: questions.map(({ q, options }) => ({ q, options })), // the answers stay on the server
      usage: { used: usage.used, limit: usage.limit },
    }
  })
}
