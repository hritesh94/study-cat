# Study Cat HD sprites, version 2

Same cats, breeds and outfits as before (128 x 128 frames, same origin, same 22 animations in the same names), plus:

- **10 new animations** in every breed and outfit sheet
- **Room art** in the same style and scale as the cat: bookshelf, books, coin jar, plant stages, bath tub

Everything here replaces the previous pack. The sheets now have 32 rows (10 frames per row), so always read `start` and `frames` from `study-cat.json` instead of assuming row numbers.

## New animations

| Name | What it does | Starts / ends |
|---|---|---|
| eat_start / eat_end | head goes down into the bowl, and back up (bowl in the frames) | standing / standing |
| play_start / play_end | crouches at the yarn, and stands back up (yarn in the frames) | standing / standing |
| sad_start / sad_end | sits -> sad, and back | sitting / sitting |
| bath_in | lands in the tub with a splash (play it right after `jump`) | in air / in the tub |
| bath | sits in the bath, bubbles on its head (loops) | in the tub |
| bath_shake | shakes off, droplets fly | in the tub |
| bath_out | stands up in the tub and crouches, ready to jump out (then play `jump`) | in the tub / crouch |

So the chains are now real motion instead of crossfades: `stand -> eat_start -> eat -> eat_end -> stand`, the same for play, and `sit -> sad_start -> sad -> sad_end -> sit`.

**Bath:** the tub is part of the bath frames. Put `room/tub.png` in the room at the tub spot with the cat's scale and origin (0.5, 0.8125). For a bath: walk next to the tub, play `jump` while moving the cat onto the tub spot, then `bath_in`, `bath` (and `bath_shake`), `bath_out`, then `jump` back out. Hide `tub.png` while any `bath_*` animation is playing, because those frames already contain the tub in exactly the same place.

## Room art (`room/`)

`room/room.json` lists every image with its size and **origin** (the point that touches the shelf, sill or floor). Use `setOrigin(origin.x, origin.y)` and draw everything at the **same scale as the cat** (0.5 in the current game), and sizes will match.

- **Shelf:** `shelf.png`. Its origin is the middle of the plank's top. Books stand on that line.
- **Books:** 6 thicknesses for 0, 1, 3, 8, 20 and 50+ hours (`book_0` ... `book_5`). Each book is two images:
  - `book_N_cover.png` is light grey on purpose: `setTint(subjectColor)` colors it.
  - `book_N_pages.png` goes on top, not tinted.
  - Place books left to right from the shelf's left end, each one `thicknessPx` (in room.json) plus a small gap after the last.
- **Coin jar:** `jar_00` ... `jar_10` = 0% ... 100% full. Pick the closest level to today's coins / daily cap. When full, loop `jar_sparkle_0..3` (about 6 fps) on top; they share the jar's origin.
- **Plant:** `plant_0_seed`, `plant_1_sprout`, `plant_2_leafy`, `plant_3_bushy`, `plant_4_blooming`, and `_droopy` versions of 1-4 for when the streak broke.
- **Tub:** `tub.png`, see Bath above.

## Previews

`previews/` has GIFs of the bath, eat, play and sad sequences, and `room_art.png`.

## Generator

`generator/make.py` makes the cat sheets, `generator/props.py` makes the room art (`pip install numpy pillow`). New room pieces go in `props.py`; new animations go at the end of `poses.py`.
