// Writes every cat line to voice-lines.csv (npm run voice:lines), so a
// voice actor (or you!) can record them. Save each recording as
// public/voice/<id>.mp3 and the app plays it instead of the babble.
import fs from 'node:fs'
import { ALL_LINES } from '../src/game/catLines.js'

const cell = (value) => `"${String(value).replaceAll('"', '""')}"`
const rows = [['id', 'group', 'mood', 'text', 'file'], ...ALL_LINES.map((l) => [l.id, l.group, l.mood, l.text, `public/voice/${l.id}.mp3`])]

const ids = new Set()
for (const { id } of ALL_LINES) {
  if (ids.has(id)) throw new Error(`Duplicate line id: ${id}`)
  ids.add(id)
}

fs.writeFileSync('voice-lines.csv', rows.map((r) => r.map(cell).join(',')).join('\n') + '\n')
console.log(`voice-lines.csv: ${ALL_LINES.length} lines`)
