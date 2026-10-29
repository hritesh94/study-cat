# Study Cat sprites (3D-rendered pixel art)

An original orange tabby made for Study Cat. Free to use and change in your project.

The cat is a small 3D model (round body, head, legs, tail, ears, eyes) rendered into 64 x 64 pixel art with toon lighting. That is why it can turn toward you, look at you and turn around, and why every animation matches.

## Files

- `study-cat.png`: the sprite sheet. 64 x 64 frames, 10 per row.
- `study-cat.json`: each animation's first frame, frame count, fps and whether it loops.
- `previews/`: a GIF of every animation, plus one image of them all.
- `generator/`: the Python that builds the cat. `cat.py` is the model and poses, `anims.py` defines the animations, `render.py` is the renderer. Run `pip install numpy pillow`, then `python anims.py`. Output goes to `out/`.

## Animations

| Name | What it does | Loops |
|---|---|---|
| idle | standing, breathing, small head turns, blink | yes |
| walk | walk cycle | yes |
| turn_around | turns from facing right to facing left, through facing you | no |
| sit_down / stand_up | stand to sit, and back | no |
| sit_idle | sitting | yes |
| look_at_you | turns its head to you, blinks, smiles, looks back | no |
| turn_front / turn_back | turns its whole body to face you, and back | no |
| sit_front | sitting, facing you | yes |
| meow | facing you, meows (good for clicks) | no |
| read_start / read_end | paws onto the book with glasses on, and off | no |
| read | reading | yes |
| page_turn | paw flips a page | no |
| sleep_down / wake_up | curl up, and back to sitting | no |
| sleep | curled up, breathing, zzz | yes |
| eat | eating from a bowl | yes |
| sad | ears down, a tear rolls | yes |
| play | bats a yarn ball | yes |
| jump | crouch, leap, tuck, land (move the sprite in the engine) | no |

## How the transitions chain

Every transition starts on the exact pose the previous one ends on:

- standing: idle, walk, turn_around, eat, play, jump all start and end standing.
- stand -> sit: sit_down, then sit_idle, look_at_you, sleep_down, read_start, turn_front.
- facing you: turn_front -> sit_front / meow -> turn_back.
- studying: sit_down -> read_start -> read / page_turn -> read_end -> stand_up.

Turning left: play `turn_around`, then set `flipX = true` and continue with `walk`. Turning right again: play `turn_around` with flipX still on, then set flipX back to false.

## Placement

- The default view is three-quarter, facing right. Flip it for left.
- Feet touch the origin point. Use `sprite.setOrigin(0.5, 0.8125)`.
- In the reading animations the book sits at about y = 42 of the frame. Put the desk top there.

## Phaser

```js
this.load.spritesheet('cat', 'study-cat.png', { frameWidth: 64, frameHeight: 64 });
this.load.json('catAnims', 'study-cat.json');

// in create():
const meta = this.cache.json.get('catAnims');
for (const [key, a] of Object.entries(meta.animations)) {
  this.anims.create({
    key,
    frames: this.anims.generateFrameNumbers('cat', { start: a.start, end: a.start + a.frames - 1 }),
    frameRate: a.fps,
    repeat: a.loop ? -1 : 0,
  });
}
```

Use `pixelArt: true` in the game config so it stays crisp when scaled up (3x or 4x looks good).
