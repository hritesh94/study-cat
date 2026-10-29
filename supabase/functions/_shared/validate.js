// Small checks for what users send and what the AI sends back.
// Never trust either: everything is checked before it's used or saved.
import { INPUT } from './config.js'
import { AiError } from './errors.js'

// ── user input ──
export function text(value, { max = INPUT.maxChars, required = true, name = 'text' } = {}) {
  if (value === undefined || value === null || value === '') {
    if (required) throw new AiError('bad_input', `${name} is missing`)
    return ''
  }
  if (typeof value !== 'string') throw new AiError('bad_input', `${name} must be text`)
  const t = value.trim()
  if (required && !t) throw new AiError('bad_input', `${name} is empty`)
  if (t.length > max) throw new AiError('too_big', `${name} is longer than ${max} characters`, { max })
  return t
}

export function image(value) {
  if (!value) return null
  const { mimeType, data } = value
  if (!INPUT.imageTypes.includes(mimeType) || typeof data !== 'string' || !/^[A-Za-z0-9+/=]+$/.test(data.slice(0, 200))) {
    throw new AiError('bad_input', 'That image type is not supported')
  }
  const bytes = Math.floor((data.length * 3) / 4)
  if (bytes > INPUT.maxImageBytes) throw new AiError('too_big', 'The image is larger than 5 MB', { maxBytes: INPUT.maxImageBytes })
  return { mimeType, data }
}

export const isDay = (v) => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(`${v}T00:00:00Z`))
export const isUuid = (v) => typeof v === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v)

// a time zone the server understands, or UTC
export function timeZone(value) {
  if (typeof value !== 'string' || value.length > 64) return 'UTC'
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: value })
    return value
  } catch {
    return 'UTC'
  }
}

// ── AI output ──
export const clip = (v, max) => (typeof v === 'string' ? v.replace(/\s+/g, ' ').trim().slice(0, max) : '')
export const oneOf = (v, options, fallback) => (options.includes(v) ? v : fallback)
export const num = (v, min, max, fallback) => (typeof v === 'number' && Number.isFinite(v) ? Math.min(max, Math.max(min, v)) : fallback)
