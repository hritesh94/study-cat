// Writes every cat line to voice-lines.csv (npm run voice:lines), so a
// voice actor (or you!) can record them. Save each recording as
// public/voice/<id>.mp3 and the app plays it instead of the babble.
// One row per line, with its personality, language and situation, so you
// can record one voice at a time (e.g. filter on personality = diva).
// "any" = every personality uses that line. The daily AI line packs aren't
// here: they change every day and always use the babble.
import fs from 'node:fs'
import { LINES } from '../src/game/catLines.js'

const cell = (value) => `"${String(value).replaceAll('"', '""')}"`
const rows = [
  ['id', 'personality', 'language', 'situation', 'mood', 'spicy', 'strict', 'text', 'file'],
  ...LINES.map((l) => [l.id, l.personality, l.language, l.situation, l.mood, l.spicy ? 'yes' : '', l.strict ? 'yes' : '', l.text, `public/voice/${l.id}.mp3`]),
]

const ids = new Set()
for (const { id } of LINES) {
  if (ids.has(id)) throw new Error(`Duplicate line id: ${id}`)
  ids.add(id)
}

fs.writeFileSync('voice-lines.csv', rows.map((r) => r.map(cell).join(',')).join('\n') + '\n')
const count = (key) => Object.entries(Object.groupBy(LINES, (l) => l[key])).map(([k, v]) => `${k} ${v.length}`).join(', ')
console.log(`voice-lines.csv: ${LINES.length} lines (${count('personality')}; ${count('language')})`)
