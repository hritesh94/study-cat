// Cuts one preview frame out of every breed and outfit sheet, for the
// "My Cat" wardrobe:  npm run thumbs
//
// The frame is the first frame of `sit_front` (the cat facing you). Each
// thumbnail keeps the full frame size, so an outfit thumbnail lines up
// exactly on top of a breed thumbnail. Run it again whenever the sheets in
// public/game/cat/ change.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { PNG } from 'pngjs'

const root = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'game', 'cat')
const meta = JSON.parse(readFileSync(join(root, 'study-cat.json'), 'utf8'))
const { frameWidth: W, frameHeight: H, framesPerRow } = meta
const frame = meta.animations.sit_front.start
const sx = (frame % framesPerRow) * W
const sy = Math.floor(frame / framesPerRow) * H

function cut(image, out) {
  const sheet = PNG.sync.read(readFileSync(join(root, image)))
  const thumb = new PNG({ width: W, height: H })
  PNG.bitblt(sheet, thumb, sx, sy, W, H, 0, 0)
  mkdirSync(dirname(out), { recursive: true })
  writeFileSync(out, PNG.sync.write(thumb))
  return out
}

for (const [id, b] of Object.entries(meta.breeds)) cut(b.image, join(root, 'thumbs', 'breeds', `${id}.png`))
for (const [id, o] of Object.entries(meta.outfits)) cut(o.image, join(root, 'thumbs', 'outfits', `${id}.png`))
console.log(`Made ${Object.keys(meta.breeds).length + Object.keys(meta.outfits).length} thumbnails from frame ${frame} (sit_front 0).`)
