# Study Cat HD sprites

Original cats made for Study Cat, free to use and change in your project. Rendered from a small 3D model at 128 x 128 px per frame, with smooth edges.

## What's inside

- `breeds/`: one full sprite sheet per breed: `orange`, `tuxedo`, `white`, `calico`, `siamese`.
- `outfits/`: one overlay sheet per outfit: `beanie`, `scarf`, `bow`, `hoodie`, `flowers`. Each overlay has the exact same frames as the breed sheets, so it sits on top of any breed.
- `study-cat.json`: frame size, origin, file names, and every animation (first frame, frame count, fps, loop).
- `previews/`: breed and outfit lineups, plus GIFs of some combinations.
- `generator/`: the Python that makes all of this. Run `pip install numpy pillow`, then `python make.py` inside `generator/`. Output goes to `out/`.

All sheets are 10 frames per row, one animation per row. The 22 animations are the same as before: idle, walk, turn_around, sit_down, sit_idle, stand_up, look_at_you, turn_front, sit_front, meow, turn_back, read_start, read, page_turn, read_end, sleep_down, sleep, wake_up, eat, sad, play, jump.

## Wearing an outfit (Phaser)

The outfit is a second sprite drawn on top of the cat that always shows the same frame number.

```js
// preload
const meta = this.cache.json.get('catMeta'); // load study-cat.json first
this.load.spritesheet('cat-orange', 'breeds/orange.png', { frameWidth: 128, frameHeight: 128 });
this.load.spritesheet('outfit-beanie', 'outfits/beanie.png', { frameWidth: 128, frameHeight: 128 });

// create
const cat = this.add.sprite(x, y, 'cat-orange').setOrigin(0.5, 0.8125);
const outfit = this.add.sprite(x, y, 'outfit-beanie').setOrigin(0.5, 0.8125);

// every frame: keep the outfit glued to the cat
this.events.on('update', () => {
  outfit.setPosition(cat.x, cat.y);
  outfit.setFlipX(cat.flipX);
  outfit.setFrame(cat.frame.name);
  outfit.setDepth(cat.depth + 1);
});
```

Make the cat's animations from the breed sheet using `start` and `frames` from the JSON (same code as the earlier pack, frameWidth 128). Changing breed means switching the cat sprite's texture key. Taking an outfit off means hiding the outfit sprite.

## Placement

- Three-quarter view facing right. `setFlipX(true)` for left, after playing `turn_around`.
- Feet touch the origin: `setOrigin(0.5, 0.8125)`.
- The book in the reading animations sits at about y = 84 of the frame. Put the desk top there.
- 128 px already looks smooth at 1x. You can show it at 1.5x to 2x on big screens. Do not turn on `pixelArt` mode for this pack.

## Adding more

In `generator/cat_hd.py`: add a breed to `BREEDS` (fur colors, eye color, pattern) or an outfit in `build()` next to the others, add its name to `OUTFITS` in `make.py`, and run `python make.py`. Every animation gets it automatically.
