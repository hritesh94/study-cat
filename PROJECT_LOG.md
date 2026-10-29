# Study Cat — Project Log

Everything built so far, in order, with simple explanations of what each piece does and why.

**Live app:** https://study-cat-pink.vercel.app (the HD cat with the "My Cat" wardrobe, merged into `main` and deployed)
**Stack:** React 19 + Vite 8 + Phaser 3.90
**Status:** Phase 1 complete, cozy redesign, and now the game-engine cat (no login, no backend)

---

## 1. What the app does

| Feature | How it works |
|---|---|
| Pomodoro timer | Default 50 min study / 10 min break, both adjustable (study 1–180, break 1–60). Start, Pause, Reset, Skip. |
| Auto phases | When study ends, the break starts by itself. When the break ends, the app waits for you to press Start. |
| HD cat | A smooth 128 × 128 sprite cat in **5 breeds** (orange, tuxedo, white, calico, siamese), with **5 outfits** it can wear (beanie, scarf, bow, hoodie, flowers). It's shown at up to 1.5× its art size. A **state machine** (the cat brain) decides what it does, and only uses the pack's transition chains, so it never snaps between poses. It walks to a spot before using it and turns around before changing direction. |
| My Cat | A **🐱 My Cat** button in the top bar opens a cozy wardrobe: a Breeds tab (5 breeds) and an Outfits tab (5 outfits + None), each with a little picture. Tap one and the cat changes right away. While it's open, the cat walks to the rug and shows off (looks at you, turns to face you). The choice is saved in `localStorage`, and every item is ready to be locked behind coins or a streak later. |
| Cozy room | Pixel art: wooden floor, rug, a low desk with a cushion, a warm lamp and a steaming mug, a food bowl, a yarn ball, a little bath tub, a plant, a framed paw print, and a window with leaves falling from an autumn tree. On phones the camera follows the cat. |
| Mood lighting | **Study:** the room dims slightly, the lamp glows warmer, and it turns to dusk outside. **Break:** the room brightens and it's sunny. |
| Focus view | While studying: fullscreen, and everything hidden except the cat, the room and the time. |
| Study | The cat walks to the desk, sits down, puts its glasses on and reads, turning a page every 20–40 s. |
| No timer running | It wanders around the room, sits for a while, sometimes looks at you, and sometimes curls up for a nap. |
| Click the cat | It turns to face you, meows (and says a line), then turns back and carries on. |
| Break mode | The cat closes the book, stands up, walks to the rug, sits and looks at you. Then **Play 🧶** (bats the yarn), **Feed 🐟** (walks to the bowl and eats) and **Bathe 🫧** (hops into the tub, bubbles, a shake, hops out) unlock. |
| Sad cat | Switch tabs during study and the cat closes its book and is sad (ears down, a tear). When you come back it complains, then goes back to reading after 4 s. |
| Debug mode | Add `?debug` to the address: a panel with a breed picker, an outfit picker, the brain's current state, a button for every animation and every brain state, and slow motion. |
| Voice | The cat speaks short lines using the browser's built-in speech (Web Speech API). Mute button 🔊 in the top bar. |
| Saved minutes | Today's study minutes are shown at the top and saved in `localStorage`, so they survive a reload. |
| Saved settings | Your study/break lengths and mute choice are saved too. |

---

## 2. Step-by-step build history

Each step is one Git commit. You can see them with `git log --oneline`.

### Step 1 — Scaffold the project · `c6037ef`
```bash
npm create vite@latest . -- --template react
npm install
git init -b main
```
- **Vite** is the tool that runs your app while you develop (`npm run dev`) and bundles it for the web (`npm run build`).
- **Git** saves snapshots ("commits") of your code, so you can always go back.

### Step 2 — Install the 3D libraries · `bf958cb` *(removed again in Step 8)*
```bash
npm install three @react-three/fiber @react-three/drei
```
The first version of the cat was 3D: `three` is a 3D engine, and React Three Fiber lets you write 3D scenes as React components.

### Step 3 — Timer, settings, saved minutes · `38f3179`
Files: `src/hooks/useTimer.js`, `useStudyStats.js`, `useLocalStorage.js`, `src/components/Settings.jsx`
- **Timer accuracy:** the timer saves the *time the phase ends* and compares it to the real clock (`Date.now()`). Browsers slow down timers in background tabs, so a "subtract 1 every second" countdown would fall behind. This one doesn't.
- **Study minutes:** every ¼ second of study is added to a per-day record in localStorage:
  `studycat:studyMsByDay → {"2026-10-29": 90765}` (milliseconds). Keeping every day makes a history or streak screen easy later.
- **useLocalStorage:** works like `useState`, but the value is also saved in the browser.

### Step 4 — The 3D cat and focus view · `921986a` *(the cat was replaced in Step 8)*
- The first cat was built from 3D spheres and cones, and animated 60 times a second in JavaScript.
- **The idea that survived:** the app only ever says "play animation X", which is why the 2D redesign could replace the whole cat without touching App.jsx.
- **Focus view:** CSS hides the extra UI while studying, and the Start click asks the browser for fullscreen. Browsers only allow fullscreen right after a click.

### Step 5 — Break reactions, sad cat, voice · `28625a5`
Files: `src/App.jsx`, `src/hooks/useCatVoice.js`, `src/components/BreakPanel.jsx`
- **Sad cat:** the browser fires a `visibilitychange` event whenever you switch tabs. If you're studying, the cat becomes sad.
- **Voice:** `speechSynthesis.speak()` reads the line aloud. Pitch 1.7 makes it sound more like a kitten. No internet or API key needed.
- **Which animation wins:** a break reaction beats sad, sad beats the study cycle, and the study cycle beats idle.

### Step 6 — Deploy to Vercel · `7754558`
```bash
npx vercel deploy --prod
```
- Vercel detected a Vite app, ran `npm run build` on its servers, and published the `dist/` folder.
- Vercel added `.vercel` to `.gitignore`. That folder links this project to your Vercel account and shouldn't be committed.
- **Share only** `https://study-cat-pink.vercel.app`. The long per-deploy links (`study-xxxx-hritesh94s-projects.vercel.app`) need a Vercel login.

### Step 7 — Project log · `e41811b`
This file.

### Step 8 — 2D storybook SVG cat · `88133e5`
Files: `src/cat/Cat.jsx`, `src/cat/cat.css`, `src/cat/catConfig.js`
```bash
npm uninstall three @react-three/fiber @react-three/drei
```
- **SVG** is a picture made of shapes described in code (`<path>`, `<circle>`...). It stays crisp at any size, and CSS can style and animate every part.
- **One connected shape:** the head and body are a single `<path>`, a peanut-like outline. The ears and tail are drawn *before* it, so the body covers their bases.
- **Animations are CSS classes.** `Cat.jsx` puts one class on the `<svg>`, like `cat--reading`. Then `cat.css` says "when reading, raise the paws, show the book, tilt the face down…".
- **Two groups per moving part:** the outer group holds a *pose* that uses `transition` (blends smoothly when the animation changes). The inner group plays a *loop* that uses `@keyframes` (repeats forever). That's how the cat can, say, hold the book *and* scan the lines at the same time.
- **Idle life:** blinking, tail swishing and breathing run all the time, with speeds that change per mood (fast tail when playing, slow sighs when sad).
- **Mouse following:** `Cat.jsx` writes the mouse position into CSS variables (`--lx`, `--ly`). The watching pose uses them to lean and look at you, without re-rendering React.
- **Smaller app:** removing three.js cut the JavaScript bundle from about 1 MB to about 240 kB.

### Step 9 — Cozy room + mood lighting · `49eb932`
Files: `src/scene/Room.jsx`, `src/scene/room.css`, `src/cat/CatScene.jsx`
- The room is several small SVGs (window, plant, desk, picture, floor, rug) placed with CSS. Each one is measured from the **floor line** (`--floor`), so everything stays lined up on any screen size.
- **Falling leaves:** each leaf has two nested animations: one falls down, the other sways left and right while spinning. A `clipPath` hides them outside the glass.
- **Lighting without JavaScript:** App.jsx already puts `focus` or `break` on the page's main element, and `room.css` reacts to those classes. It fades in a dim purple layer, a warm lamp halo and a dusk sky for study, and a soft bright layer for break.
- `CatScene.jsx` kept the same name and `animation` prop as the old 3D scene, so **App.jsx didn't change at all**.

### Step 10 — Hand-drawn UI, title, favicon · `801f500`
Files: `src/index.css`, `src/App.css`, `src/main.jsx`, `index.html`, `public/favicon.svg`
- **Hand-drawn look:** thick soft-dark outlines, solid offset shadows, and wobbly corners: `border-radius` with a different curve on each corner. Buttons "press into the page" when clicked.
- **Fonts:** *Fredoka* (rounded) for the UI and *Patrick Hand* for the speech bubble. They're installed from npm (`@fontsource/...`), so they ship with the app and work offline.
- **Panel layout:** on wide screens it's two columns (time | buttons) to stay short. Phones get one column and a taller floor.
- **Title:** "Study Cat 🐱 · cozy study timer". **Favicon:** an SVG with the 🐱 emoji.

### Step 11 — Docs + redeploy · `b8a2530`
This log was updated, then `npx vercel deploy --prod`.

### Step 12 — Rigged puppet cat + pose system · `422955f`
Files: `src/cat/poses.js`, `rig.js`, `usePuppet.js`, `Cat.jsx`, `CatScene.jsx`, `cat.css`, `stage.css`
The one-shape cat couldn't *do* things, so it was rebuilt like a paper puppet.

- **The rig (`Cat.jsx`):** every moving part is its own `<g>`, drawn with its **joint at (0, 0)**. Its transform is `translate(to the joint) rotate(angle)`, so it spins around the joint. Children sit *inside* their parent's group (thigh → shin → paw), so when the thigh turns, the shin and paw come with it. Parts can never detach.
  ```
  root (hips) ─ tail1 → tail2 → tail3
              ─ far back leg:  thigh → shin → paw
              ─ far front leg: upper → forearm → paw
              ─ torso → head → ears, eyes, mouth
              ─ near back leg, near front leg (→ pencil)
  ```
  Draw order is depth: far legs first, near legs last. Far legs are a slightly darker orange.
- **Poses (`poses.js`):** a pose is just numbers: `{ torso: 8, head: 14, tail: [40, 25, 30], ... }`. Instead of working out elbow and knee angles by hand, a leg can say *where its paw should be* (`reach: [466, 250]` = "the book's corner"). `rig.js` then solves the angles with **two-bone inverse kinematics**: the triangle math for "shoulder → elbow → paw".
- **Actions:** an action is a list of steps: *move to this pose in `dur` seconds, then `hold`*. For example, **page turn** = read → reach the corner → grab → lift (the page is half-flipped) → put it down (the page lands) → read. To add an action, write a few poses and one list, with no new animation code.
- **The animator (`usePuppet.js`):** about 60 times a second it blends from where the cat *was* toward the next pose (with `easeInOut`, so moves start and stop softly). It adds idle life on top: breathing, random blinks, ear twitches, and a tail swish that travels down the 3 segments. Then it writes the transforms straight onto the SVG, so React never re-renders.
- **Living loops:** a pose can have a `motion` function, e.g. reading slowly sweeps the head and eyes across a line, writing scribbles the pencil, and watching reads the mouse position.
- **One stage:** the desk, stool, book, mug, rug, bowl, yarn and tub moved into the *same* SVG as the cat (800 × 520 units), so a paw target like `[494, 244]` is exactly the mug. The room behind it (wall, window, plant, floor) stays as before.
- **Hopping:** when an action moves the cat between the stool and the floor, the animator makes it an arc (a hop) instead of a slide.
- **Props follow the story:** the desk pencil disappears when the paw picks it up, the mug moves to the cat's mouth, and the page flips with the paw.
- **Try it yourself:** while `npm run dev` is running, open the browser console and type `studyCat.play('pageTurn')`, or any action or pose name from `poses.js`.
- `App.jsx`, `hooks/` and `components/` are unchanged. The old name `eating` still works: it now plays `sipping`.

### Step 13 — Pixel cat in Phaser + a cat brain · built on branch `game-cat`, merged in `b02da02`
Files: `src/game/*`, `public/game/cat/*`, `tools/cat-generator/*`, `src/App.jsx`, `src/App.css`
```bash
git switch -c game-cat          # a new branch, so main stays safe
npm install phaser@3.90.0
```
- **Branch:** it was built on `game-cat` so `main` stayed safe. After you checked it locally, it was merged into `main` and deployed (`git merge --no-ff game-cat`).
- **The sprite pack:** it came already unzipped as `study-cat-3d/` (there was no `.zip` file to delete).
  - `study-cat.png` (a sprite sheet: 22 animations, each frame 64 × 64 px) and `study-cat.json` (where each animation starts, how many frames, fps, loop) → `public/game/cat/`, so the game can load them.
  - The Python generator, previews and README → `tools/cat-generator/`. Nothing in `tools/` is deployed. Its `out/` folder is git-ignored.
- **Phaser** is a 2D game engine: it draws to a `<canvas>` many times a second, plays sprite animations, moves things (tweens), and handles clicks on sprites. `pixelArt: true` turns off smoothing, so pixels stay square when zoomed.
- **Measuring the sprites:** before placing anything, I measured the frames. The book in the reading frames lies 10 px above the cat's feet and reaches 27 px to its right, so the low desk's top is exactly there. The bowl (in `eat`) and the yarn (in `play`) are drawn inside the sprite, so the room's own bowl and yarn hide while those play.
- **Pixel-art room (`roomArt.js`):** drawn from rectangles, triangles and circles at 1 px = 1 game pixel, then baked into a texture. The camera zooms it with **whole numbers only** (2×, 3× or 4×), so every pixel stays a sharp square. Wall and floor continue past the room's edges, so wide screens don't show empty space.
- **Camera (`RoomScene.js`):** it picks the zoom so the floor sits just above the timer panel (React measures the panel and tells the game). If the room is wider than the screen (phones), the camera follows the cat.
- **The cat brain (`catBrain.js`):** a state machine.
  - **Goal**, from the timer: `wander`, `study`, `sad` or `break`. **Task**, from the buttons: `feed`, `play` or `bathe`.
  - Each goal is a short script, like *walk to the desk → sit → open the book → read, turn a page now and then*.
  - Scripts can only use three moves: `once(anim)` (play to the last frame), `hold(loop, seconds)` (always stops at the end of a loop) and `walkTo(x)` (whole strides only, turning around first if needed).
- **Postures (`catAnims.js`):** the pack's README says every animation starts and ends in a pose. Those poses are written down as **postures**: stand, sit, front, read, sleep.
  - A tiny route-finder (`path()`) gets from any posture to any other using only the allowed chains. For example, read → stand = `read_end, stand_up`.
  - If anything ever tried to start from the wrong posture, it's counted as a **chain break**. The debug panel shows the count, and it stayed at 0 in testing.
- **Never snapping:** when the goal changes (e.g. the break starts), the current move finishes first, then the new script plans from wherever the cat is.
- **Turning left:** as the README says, play `turn_around`, then set `flipX`. Both happen in the same instant the animation ends, so there's no frame of the wrong direction.
- **Bathe** has no animation in the pack, so it's built from pieces: walk to the tub → `jump` in (the sprite is moved along an arc during the leap frames) → `sit_down` → bubbles and a little shake → `stand_up` → `jump` out. Once in the tub it always finishes, so the cat can't get stuck in the water.
- **React still owns the app:**
  - `useTimer`, the stats and the voice are unchanged.
  - `App.jsx` now only tells the game *what* the cat should be doing (`goal`, `mood`) and passes the break buttons through as commands.
  - The game tells React when the cat is busy (so the buttons wait) and when it meows (so the voice speaks).
  - The game also writes the cat's head position into CSS variables, so the speech bubble follows it around the room.
- **Phaser loads lazily:** it's about 1.2 MB, so it's in its own file (`import()`), loaded after the page shows.
- **Debug mode (`?debug`, `DebugPanel.jsx`):** shows the goal, animation, posture, facing and chain-break count. It has buttons for every state (wander, study, sad, break, nap, feed, play, bathe, click) and every raw animation. A raw animation pauses the brain and may snap on purpose; "follow the timer" hands control back. Speed: 1×, 0.5×, 0.25×, 0.1×.
- **Bugs found while testing and fixed:**
  - If study started while the cat was asleep and already facing the desk, it began walking straight out of the sleep pose. Now `walkTo` always stands up first.
  - A raw debug animation that never finished could fire its "done" handler later on a real animation. Now it's cleared.
  - Phaser missed some window resizes. Now the canvas watches its own size.
- The old SVG puppet files (`src/cat/`, `src/scene/`) were removed on this branch. They're safe on `main` and in git history.

### Step 14 — HD cat: 5 breeds, 5 outfits · built on branch `game-cat`
Files: `public/game/cat/*`, `tools/cat-generator-hd/*`, `src/game/*`, `src/App.jsx`
- **The new pack:** `study-cat-hd.zip` (deleted after unpacking). It contains:
  - `breeds/` and `outfits/` (1280 × 2816 sheets: 10 frames per row, 22 rows of 128 × 128) and `study-cat.json` → `public/game/cat/`.
  - The generator and previews → `tools/cat-generator-hd/` (not deployed).
  - The old 64 px sheet and its generator were removed.
- **Same animations, same rules:** the HD pack has the same 22 animations, with the same frame starts, counts and fps. So the brain kept its names and posture chains.
  - To make sure, I compared the **last frame of every animation with the first frame of every animation that may follow it**, for all 5 breeds (107 joins each).
  - Normal motion inside an animation changes about 3.5 % of the cat's outline per frame. Every chain join was in that range, **except three**.
- **What I found and fixed:**
  - `eat`, `play` and `sad` have no transition art. Their first and last frames are already head-in-bowl, crouched or slumped, so cutting into them changed 19–41 % of the outline in one frame: a visible snap.
  - The brain now **crossfades** those joins: a "ghost" copy of the last frame fades out over 0.24 s while the new animation starts underneath (`SOFT_JOIN` in `catAnims.js`).
  - A real fix later would be to add `eat_start`/`eat_end`-style transitions in the generator.
- **All breeds share one shape:** the 5 breeds have pixel-identical outlines in every frame (0 % difference). That's why one outfit sheet fits every breed.
- **Measured, then laid out:** the book sits at frame y 84, and the bowl and yarn 36 px in front of the feet. At 0.5 scale that's exactly the old layout (10 px and 18 px in game pixels), so the cat is drawn at **0.5 scale** and the room's spots didn't change.
  - The room's own bowl and yarn were 2–4 px too high compared with the ones drawn inside `eat`/`play`, so they hopped when swapped. They were moved down to match.
- **Smooth, not pixelated:** `pixelArt: false` and `antialias: true`.
  - The room is now drawn at **3 texture pixels per game pixel** (`RES` in `roomArt.js`), so it stays sharp and smooth like the cat instead of turning blurry or blocky.
  - The camera zooms smoothly (no longer in whole steps), capped at **3×**. 64 game px × 3 = 192 screen px = the HD art at 1.5×, and phones get ~1.44×.
- **Breeds:** each breed is its own sheet, so each breed gets its own Phaser animations, named `"<breed>:<animation>"` (e.g. `tuxedo:walk`).
  - The brain still thinks in plain names (`walk`) and listens for "any animation finished", matching by name. That way the breed can be swapped **mid-animation**: the new breed continues the same animation from the same frame.
- **Outfits** are a second sprite on top of the cat. Right before every draw (Phaser's `prerender` event, after all game logic), it copies the cat's position, flip, frame number and depth + 1, as the README says. With no outfit, that sprite is hidden.
- **Loading:** each sheet takes ~14 MB of graphics memory once decoded, so loading all 10 up front would be ~140 MB, too much for many phones.
  - So the game reads `study-cat.json`, loads only the breed and outfit you're using, and loads others the first time they're picked.
  - Animations are created from the JSON's `animations` list for each breed as it arrives.
- **Saved choice:** `studycat:cat` in `localStorage`, e.g. `{"breed":"siamese","outfit":"bow"}`. Unknown values fall back to orange with no outfit.
- **Debug panel:** new breed and outfit pickers, plus a one-tap "🐢 slow motion" toggle next to the speed buttons.

### Step 15 — "My Cat" wardrobe · built on `game-cat`, then merged into `main` and deployed
Files: `src/game/catItems.js`, `src/components/Wardrobe.jsx` + `.css`, `tools/make-thumbs.mjs`, `public/game/cat/thumbs/`, `src/App.jsx`, `src/game/catBrain.js`, `src/game/GameCanvas.jsx`
- **One list of items (`catItems.js`):** every breed and outfit, with its name and a `lock`.
  - All locks are `null` (unlocked) for now.
  - Later an item can say `lock: { price: 120 }` or `lock: { streak: 7 }`, and `lockStatus(item, progress)` decides whether it's available. `progress` will be `{ coins, streak, owned }` from Supabase.
  - A locked tile is greyed out, shows "🔒 120 coins" or "🔒 7-day streak", and can't be picked. (Checked by temporarily locking two items in the browser.)
- **The wardrobe (`Wardrobe.jsx`):** a bottom sheet in the same hand-drawn style as the panel.
  - It has two tabs (Breeds / Outfits), a grid of tiles, a ✓ on what the cat wears, and × or Escape to close.
  - It's a proper dialog for screen readers, and keyboard focus moves into it and back to the button.
  - Tapping a tile calls the same `setCatLook` as the debug picker, so it changes the cat instantly and saves `studycat:cat`.
- **Previews:** the first frame of `sit_front` (the cat facing you), cut out of each sheet by `npm run thumbs` (`tools/make-thumbs.mjs`, using the small `pngjs` library).
  - The 10 thumbnails are about 40 KB in total, so the wardrobe doesn't download ~3.4 MB of full sheets just for pictures.
  - Each thumbnail keeps the full 128 × 128 frame, so an outfit thumbnail stacks exactly on top of a breed thumbnail. Outfit tiles show the outfit on *your current* breed.
- **Showing off:** while the wardrobe is open, App.jsx gives the cat a new goal, `showOff`. The brain walks it to the middle of the rug (unless it's already there), then loops `sit_down → look_at_you → turn_front → sit_front → turn_back`, all through the usual chains. Closing the wardrobe hands the cat back to the timer.
- **Keeping the cat in view:** the game already lifts the room above the timer panel. Now it measures whichever is taller, the panel or the open wardrobe, so the cat stays visible above the sheet on phones too.
- **Phones:** the button shrinks to just "🐱" so the top bar fits, and the grid is always 3 tiles across, so every breed and outfit fits without scrolling.
- **Testing tool:** `?timerloop` (dev only) makes the game tick on timers instead of animation frames, so tests can run in a hidden browser window. It isn't in production builds.
- The floor now continues further down, so lifting the room never shows an empty band at the bottom of the screen.

---

## 3. Project structure

```
study-cat/
├─ index.html               page shell, title, favicon link
├─ package.json             dependencies + scripts (dev, build, lint, preview)
├─ public/
│  ├─ favicon.svg           🐱 tab icon
│  └─ game/cat/             study-cat.json, breeds/, outfits/ (sheets) + thumbs/ (wardrobe pictures)
├─ tools/
│  ├─ cat-generator-hd/     the HD pack's Python generator, previews, README (not deployed)
│  └─ make-thumbs.mjs       cuts the wardrobe pictures out of the sheets (npm run thumbs)
└─ src/
   ├─ main.jsx              starts React, loads the fonts
   ├─ App.jsx               the screen: timer, panel, voice; tells the cat its goal
   ├─ App.css               panel, speech bubble (follows the cat), focus view
   ├─ index.css             palette + hand-drawn buttons and inputs
   ├─ hooks/                useTimer, useStudyStats, useCatVoice, useLocalStorage
   ├─ components/           Settings, BreakPanel, Wardrobe (the My Cat panel)
   └─ game/
      ├─ GameCanvas.jsx     React ↔ Phaser bridge (loads Phaser lazily)
      ├─ RoomScene.js       the Phaser scene: room, cat + outfit, breeds, camera, lighting
      ├─ catBrain.js        ★ the cat's state machine (goals, tasks, scripts)
      ├─ catItems.js        ★ every breed and outfit, with names and (future) locks
      ├─ catAnims.js        each animation's start/end posture, chain route-finder, soft joins
      ├─ layout.js          every spot and prop position (game pixels)
      ├─ roomArt.js         the drawing of the room and props (at 3× resolution)
      ├─ DebugPanel.jsx     the ?debug panel
      └─ debug.css
```

### Palette
| | Color | Used for |
|---|---|---|
| Cream | `#fbf1de` / wall `#f6e9d3` | wall, panel, belly, pages |
| Soft orange | `#f2a66a` | cat fur, Start button, tree |
| Sage green | `#9cb59a` | wainscot, plant, lamp shade, bowl, break buttons |
| Dusty purple | `#9a86b0` | curtains, rug, book cover, yarn |
| Soft ink | `#4b3b47` | all outlines and text |

### What's saved in localStorage
| Key | Example | Meaning |
|---|---|---|
| `studycat:studyMsByDay` | `{"2026-10-29": 90765}` | Milliseconds studied per day |
| `studycat:settings` | `{"studyMinutes":50,"breakMinutes":10}` | Your timer lengths |
| `studycat:muted` | `false` | Whether the cat's voice is muted |
| `studycat:cat` | `{"breed":"tuxedo","outfit":"scarf"}` | Which cat you have and what it wears |

To reset everything, open the browser console on the site and run `localStorage.clear()`.

---

## 4. Commands cheat sheet

| Command | What it does |
|---|---|
| `npm install` | Downloads the libraries listed in `package.json` |
| `npm run dev` | Runs the app locally at http://localhost:5173 (reloads as you edit) |
| `npm run build` | Makes the optimized website in `dist/` |
| `npm run preview` | Serves the built `dist/` locally, to check the release version |
| `npm run lint` | Checks the code for common mistakes (oxlint) |
| `npm run thumbs` | Re-cuts the wardrobe pictures after the sprite sheets change |
| `git log --oneline` | Shows the commit history |
| `git status` | Shows what changed since the last commit |
| `npx vercel deploy --prod` | Publishes the current code to the live URL |
| open `http://localhost:5173/?debug` | The cat debug panel |
| add `?timerloop` (dev only) | Keeps the game running in a hidden browser window, for automated tests |

---

## 5. How it was tested

**My Cat wardrobe (step 15)**, at 1280×800 and phone size (375×812):
- ✅ The real **🐱 My Cat** button opens it; × and Escape close it. Focus moves into the panel and back to the button.
- ✅ Tapping **Tuxedo**, then **Beanie**, then **Hoodie** (real clicks) changed the cat right away and saved `studycat:cat`. The ✓ moves with the choice.
- ✅ While open, the cat walked to the rug and played `sit_down → look_at_you → turn_front → sit_front → turn_back…` with **0 chain breaks**. After closing, it went back to wandering.
- ✅ The game counts the sheet as covering the screen (252 px open vs 161 px closed), so the cat stays above it.
- ✅ **Phone:** the top bar fits (icon-only button), 3 tiles per row, no scrolling on either tab, and the cat visible above the sheet.
- ✅ **Locks:** with two items temporarily locked (120 coins, 7-day streak), they showed greyed out with their labels and couldn't be picked. `lockStatus` unlocked them for a long-enough streak or an owned item.
- ✅ Lint and build clean; the thumbnails are in the build, and `tools/` and `?timerloop` aren't.

**HD cat (step 14)**, run in the browser at 1280×800 and phone size (375×812):
- ✅ **The art itself:** all 5 breeds have identical outlines in every frame. Every chain join matches except `eat`, `play` and `sad`, which now crossfade.
- ✅ **Every animation × every breed (110 combinations):** each played from its own breed's sheet and showed every one of its frames.
- ✅ **Outfits:** each of the 5 outfits on 2 breeds, while wandering, plus all 22 animations with hoodie+tuxedo and beanie+calico. In about 3,000 checked frames the outfit always had the cat's frame, position, flip and depth + 1, and it hid with no outfit. Swapping breed mid-animation kept everything going.
- ✅ **By eye:** beanie while walking, scarf while reading (the book sits on the desk top), hoodie mid-turn, flowers while sleeping, bow while meowing, hoodie while eating (the sprite's bowl lines up with the room's).
- ✅ **The brain, through the real buttons, as a calico in a scarf:** study → `read`, a `page_turn`, sad → back to read (crossfaded in and out), click → meow → back to read, break → rug → `look_at_you` → buttons unlock, Feed, Play, Bathe, click while asleep, pause → wander. **0 chain breaks.**
- ✅ **Saved choice:** picking siamese + bow in the debug panel survived a reload, and only those two sheets were loaded.
- ✅ **Phone:** the cat at 1.44× its art, the camera follows it, and its feet stay above the panel (also in break with its taller panel).
- ✅ Lint and build clean; only the HD sheets and JSON are in the build (`tools/` isn't). Not deployed yet, on purpose.
- ⚠️ The voice still wasn't listened to (muted during tests).

**64 px pixel cat (step 13)**, run in the browser at 1280×800 and phone size (375×812), with an automatic recorder that logged every animation, where the cat was, and which way it faced:
- ✅ **Chain breaks: 0** across every test below, so no animation ever started from the wrong pose.
- ✅ **Wander:** every change of direction was `idle → turn_around → idle → walk`; the cat never slid while not walking; it always faced the way it walked; it sat, looked at you, slept and woke up.
- ✅ **Study (real Start button):** walk → turn → `sit_down → read_start → read`, even starting from sleep (`wake_up → stand_up → …`). A `page_turn` fired on its own and went back to `read`. The book lines up with the desk top.
- ✅ **Sad (tab switch, simulated):** `read_end → sad`, the "come back" line, then `read_start → read` after 4 s.
- ✅ **Click the cat (a real mouse click):** while reading, `read_end → turn_front → meow → turn_back → read_start → read`, and the bubble said "Meow meow!". While asleep it woke up first, then went back to sleep.
- ✅ **Break (real Skip button):** `read_end → stand_up → turn → walk → turn → sit_down → look_at_you`. Play/Feed/Bathe stayed disabled until the look, then enabled.
- ✅ **Feed:** walked to the bowl, faced it, ate (the room's bowl hid), went back to the rug. **Play:** batted the yarn. **Bathe:** jumped in, bubbles, shake, jumped out.
- ✅ **Pause during break** → wander; **Start again** → back to the rug.
- ✅ **Debug panel:** raw animations pause the brain, "follow the timer" resumes it, and slow motion slows animations, tweens and timers together. Without `?debug` the panel isn't there.
- ✅ **Phone:** 3× zoom, the camera follows the cat, and its feet stay above the panel.
- ✅ Lint and build clean. Phaser is in its own lazy-loaded file, and `tools/` isn't in the build.
- ✅ After merging into `main`: deployed, and the live site loads the game with no console errors; `tools/` isn't served.
- ⚠️ The voice still wasn't listened to (muted during tests).

**Earlier SVG puppet (on `main`)** was checked at 1280×800, 800×600 and 375×812: every pose, the hops, sad, the bubble, and the phone layout.

---

## 6. Known limitations

- Minutes are stored **per browser**: your friend's minutes and yours aren't shared or synced.
- Clearing browser data erases your minutes.
- Speech voices vary by browser/OS, and some browsers need a click before audio plays.
- Fullscreen can be refused by some browsers; the focus view still works in the window.
- The sprite pack has no bath animation, so **Bathe** is assembled from jump, sit and a shake.
- A change of plan waits for the current move to finish (up to about 2 s for a long loop like `read`), on purpose, so the cat never snaps.
- Phaser adds about 320 kB (gzipped) to download, plus ~0.5 MB for a breed sheet and ~0.15 MB for an outfit. They load after the page, but the very first visit shows an empty room for a moment, and picking a new breed or outfit takes a moment the first time.
- `eat`, `play` and `sad` have no in/out transition art in the pack, so those joins are a quick crossfade rather than real motion.
- The window's hills and a few room details are still drawn from small rectangles, so up close they have little steps.
- When locks become real, a saved breed or outfit that's locked will need a fallback (e.g. orange with no outfit). Today nothing is locked, so that can't happen yet.
- After regenerating the sprite pack, run `npm run thumbs`, or the wardrobe pictures will be out of date.
- If the browser tab is in the background, the game pauses (browsers stop drawing hidden pages). The timer keeps counting correctly.

---

## 7. Teaching the cat something new (Phaser version)

Example: "when the break starts, sometimes nap on the rug instead".
1. Behaviours live in `src/game/catBrain.js`, in `scripts`. Each one is an `async` function using `walkTo`, `toPosture`, `once` and `hold`:
   ```js
   async lazyBreak(v) {
     await this.goTo(SPOTS.rug, 'right', v)
     if (this.stale(v)) return
     await this.toPosture('sleep', v)   // sit_down, sleep_down: chosen for you
     await this.hold('sleep', Infinity, v)
   },
   ```
2. `if (this.stale(v)) return` after each step lets the cat drop the plan when the timer changes its goal.
3. Try it with `?debug` and `window.catScene.brain.setGoal('lazyBreak')` in the console.
4. A new place in the room goes in `layout.js` (`SPOTS`); a new prop goes in `roomArt.js`.

**A new breed or outfit:** add it in the generator (`tools/cat-generator-hd/generator/cat_hd.py`, `make.py`), run `python make.py`, and copy its sheet and the new `study-cat.json` into `public/game/cat/`. The game reads the lists from the JSON, so no code changes are needed.

If a new sprite animation is added to the pack, add one line to `ANIMS` in `catAnims.js` saying which posture it starts and ends in. The route-finder then knows how to reach it.

---

## 8. Ideas for Phase 2

- Login + backend so minutes sync across devices
- A shop with coins earned by studying, to buy breeds and outfits (Supabase): fill in the `lock`s in `catItems.js` and pass real `progress` to the wardrobe
- History chart and study streaks (the per-day data is already being saved)
- Sounds (purring, meows, rain on the window) and a "session complete" notification
- Day/night room that follows your real clock
- More behaviours for the Phaser cat (chasing a falling leaf, napping in a sunbeam)
- Unlockable room decorations as study rewards
