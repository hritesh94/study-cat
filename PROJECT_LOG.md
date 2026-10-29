# Study Cat — Project Log

Everything built so far, in order, with simple explanations of what each piece does and why.

**Live app:** https://study-cat-pink.vercel.app (HD cat, My Cat wardrobe, accounts with coins and streaks, Phase 2b, and the real room art)
**Code:** https://github.com/hritesh94/study-cat (public; branches `main`, `game-cat`, `phase-2`, `phase-2b`, `room-art`)
**Stack:** React 19 + Vite 8 + Phaser 3.90 + Supabase (Auth + Postgres)
**Status:** Phase 1, Phase 2 (accounts, coins, streaks) and Phase 2b (cat voice, study modes, phone fixes, subjects, streak calendar, room progress) complete and live. Real room art and 10 new cat animations (step 20) are merged and live too

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
| Click the cat | It turns to face you, meows (a real meow sound, and a line), then turns back and carries on. |
| Break mode | The cat closes the book, stands up, walks to the rug, sits and looks at you. Then **Play 🧶** (bats the yarn), **Feed 🐟** (walks to the bowl and eats) and **Bathe 🫧** (jumps into the tub with a splash, bubbles, a shake, jumps out) unlock. Eating and playing go in and out through their own animations. |
| Sad cat | Switch tabs during study and the cat closes its book and is sad (ears down, a tear). When you come back it says something (depending on the study mode), then goes back to reading. Away for **under 15 s** never counts. |
| Study modes (2b) | In ⚙️ Settings: **Easy** (like before), **Medium** (2 free trips away per session, then each costs 10% of that session's coins) or **Toxic** (the cat turns its back and roasts you, and each leave costs 5 coins). Picking Toxic asks "Are you sure? The cat will roast you." The server applies the penalties. A card after each session says how long you studied, the coins, and "left N times". |
| Phones (2b) | The screen stays on while you study (Screen Wake Lock). **📖 Book mode** (touch screens) is for reading on paper: the screen may sleep and that doesn't count as leaving. After a locked phone the timer is still right. |
| Subjects (2b) | Starting a study session asks "What are you studying?": your last subject is already picked, or add one with a name and a colour. Saved to your account (or this browser when logged out). The subject shows next to the STUDY tag. |
| Streak calendar (2b) | Tap the 🔥 (or the Today pill): a month view, each day in 4 shades of green by minutes, streak days joined by a flame trail, arrows and swipe to change month, tap a day for its minutes per subject, coins and sessions. The top shows your streak, best streak and this month's hours. |
| Room progress (2b) | A wall shelf with one book per subject (thicker with more hours), a coin jar that fills with today's coins (sparkles when full), and a plant on the window sill that grows with your streak and droops when it breaks. Drawn with the sprite pack's room art: books tinted with each subject's colour, 11 jar levels, 5 plant stages and their droopy versions. |
| Debug mode | Add `?debug` to the address: a panel with a breed picker, an outfit picker, the brain's current state, a button for every animation and every brain state, and slow motion. |
| Voice | "Cat babble" (2b): each line types into the speech bubble while the cat babbles it in quick, soft, high blips, made live with the Web Audio API (happy = higher and bouncy, sad = lower and slower, annoyed = short and sharp). A recording at `public/voice/<line-id>.mp3` plays instead, if there is one. Mute 🔊 in the top bar (in ⚙️ Settings on phones), plus a volume slider in ⚙️ Settings. |
| Saved minutes | Today's study minutes are shown at the top. Logged in they come from the server; logged out they're saved in `localStorage`, so they survive a reload. |
| Accounts (phase-2) | **Log in** with a 6-digit code (or link) sent by email, no password. Logged in, you earn **coins** for studying and keep a **streak**, both shown in the top bar, with a "+N coins" pop when a session ends. Your cat look is saved to your account. Everything still works logged out. |
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

### Step 16 — On GitHub · https://github.com/hritesh94/study-cat
- **What GitHub is for:** until now every commit lived only on this computer. GitHub keeps a copy online (a backup), lets others read or contribute to the code, and lets Vercel deploy by itself on every push.
- **Ignore rules first (`.gitignore`):** before anything went online, I made sure these can never be committed:
  - `.env`, `.env.*` and any `*.local` file (where secret keys will live once Supabase arrives). An optional `.env.example` with no real values is allowed.
  - `node_modules`, `dist`, `.vercel`, and generator output anywhere under `tools/**/out/`.
  - I checked each one with `git check-ignore`.
- **Secrets scan:** I searched all 23 commits on every branch for API keys and tokens (OpenAI/Anthropic, AWS, GitHub, Slack, Google, JWTs, private keys, Supabase/Vercel tokens), for `.env`/key/credential files, and for hard-coded passwords. **Nothing was found.**
- **Your email is public:** every commit records `hritesh94.4@gmail.com`, and you chose to keep it. To hide it on *future* commits, turn on GitHub's "Keep my email addresses private" and set `git config user.email` to the `…@users.noreply.github.com` address GitHub shows you.
- **GitHub CLI (`gh`):** installed with `winget install --id GitHub.cli -e`, then logged in with `gh auth login` (GitHub.com → HTTPS → Yes → web browser). The login also lets `git push` use your GitHub account.
- **The repo:**
  ```bash
  gh repo create hritesh94/study-cat --public --source . --remote origin \
    --description "A cozy Pomodoro study timer with an animated cat (React + Phaser)" \
    --homepage "https://study-cat-pink.vercel.app"
  git push -u origin main        # -u: remember origin/main, so later just `git push`
  git push -u origin game-cat
  ```
  `origin` is Git's nickname for the GitHub copy. There was no `phase-2` branch to push.
- **New README:** a short front page for the repo: what Study Cat is, the live link, cat GIFs from the sprite pack's previews, the tech stack, and how to run it locally.

#### Make Vercel deploy on every push (one-time, in the browser)
1. Open https://vercel.com, sign in, and open the **study-cat** project (under *hritesh94's projects*).
2. Go to **Settings → Git** and click **Connect Git Repository**, then choose **GitHub**.
3. GitHub asks you to install the **Vercel** app. Choose *Only select repositories* → **study-cat**, then **Install**. (Vercel can only see the repos you pick.)
4. Back in Vercel, pick **hritesh94/study-cat** and confirm. The **Production Branch** should be `main` (the default).
5. Under **Settings → Build and Deployment**, check that the framework is **Vite** (build `npm run build`, output `dist`). It was detected on the first deploy, so it should already be right.

After that:
- `git push` to **main** → Vercel builds and updates https://study-cat-pink.vercel.app by itself, in about a minute.
- A push to **any other branch** (like `game-cat`) → a **preview** deployment with its own link, so you can check a change before merging. Preview links need your Vercel login (Vercel's default protection).
- Each push also gets a ✓ or ✗ next to it on GitHub, showing whether the build worked.
- `npx vercel deploy --prod` still works, but isn't needed any more.

(Alternative to steps 2–4, from this folder: `npx vercel git connect`. It links the project to the repo in `origin`, but GitHub still asks you to install the Vercel app the first time.)

### Step 17 — Accounts, coins and streaks with Supabase · built on `phase-2`, merged into `main` and deployed
Files: `supabase/migrations/*.sql`, `tools/db-test.mjs`, `src/lib/supabase.js`, `src/hooks/useAuth.js`, `useProfile.js`, `useStudySessions.js`, `src/components/AccountPanel.jsx`, `CoinPop.jsx`, `CoinIcon.jsx`, `Sheet.css`, `src/App.jsx`
- **Supabase** is a hosted Postgres database with logins built in. The browser talks to it directly with `@supabase/supabase-js`.
- **Keys:** `.env.local` (ignored by Git, never committed) holds `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`. The same two are set in Vercel for Production, Preview and Development (`npx vercel env add …`, checked with `npx vercel env ls`).
  - The *publishable* key is meant to be public: it ends up in everyone's browser.
  - What keeps data safe is **Row Level Security** in the database. A *secret* key must never go in the app.
  - `.env.example` lists the two names (no values) for anyone cloning the repo.
- **Login:** an email **magic link** (`signInWithOtp`). Opening the link signs you in, and supabase-js reads the login from the address bar.
  - The top bar shows **Log in**, or your name once you're logged in. The panel shows coins, streak, best streak and today's minutes, lets you rename yourself, and has Log out.
  - Logged out, a gentle note under the timer says "Log in to save progress and earn coins."

#### The database (paste these 3 files, in this order)
In Supabase: **SQL Editor → New query**, paste the whole file, then **Run**. Repeat for the next file.
1. `supabase/migrations/20261029000001_tables.sql`: `game_settings` (one row with every tunable number), `profiles`, `study_sessions`, `owned_items`.
2. `supabase/migrations/20261029000002_security.sql`: Row Level Security on every table, plus grants. Users can read only their own rows, and can change only `display_name`, `breed` and `outfit`.
3. `supabase/migrations/20261029000003_functions.sql`: the sign-up trigger (a profile is created automatically) and the functions `start_session`, `end_session`, `import_local_progress`.

#### Anti-cheat: the server keeps the time and the coins
- The browser can't write coins, streaks or sessions at all. They change only inside **security definer** functions (they run with the owner's rights), and those check `auth.uid()` so they touch only your own rows.
- `start_session(planned_minutes)`: the **server** writes `started_at = now()`. Only one open session per user: a forgotten one (tab closed) is closed with nothing counted.
- `end_session(session_id, local_day)`: counted minutes = real server time passed (with 10 s of slack for network delay), capped at `planned_minutes`.
  - Coins = 1 per minute, +10 for a full session planned at **25+ minutes**, at most **300 per day**.
  - The 25-minute rule for the bonus is an extra safety I added: otherwise 1-minute "full" sessions would earn 11 coins a minute.
- **Which day:** the browser sends its own date ("2026-10-29") so late-night study counts for the right day where you live. It's trusted only within **1 day** of the server's UTC date (every time zone fits), and never earlier than a day you already used, so date tricks can't reset the daily cap.
- **Streak:** a day counts once it reaches **25 minutes** in total. The next day continues the streak, and a missed day resets it. `best_streak` keeps the record. The top bar shows 0 once your last streak day is older than yesterday.
- **Tuning:** every number above is one column in `game_settings`, e.g. `update public.game_settings set daily_coin_cap = 400;`
- **Hooked to the timer** (`useStudySessions`): studying starts → `start_session`; study ends, Skip, Pause or Reset → `end_session`. Resuming after a pause starts a new session.
  - The result updates the top bar, shows **"+N coins"** over the cat, and the cat turns to face you.
- **First login** (`import_local_progress`, once per account): this browser's total study minutes are saved as `legacy_minutes` (history only, so editing localStorage can't earn coins), and your `studycat:cat` choice becomes your profile's look.

#### Login emails: sent through Brevo
At first, magic links took ages: Supabase's built-in email sender is only for trying things out (slow, a few emails an hour, often in Spam). So login emails now go through **Brevo** (free plan: 300 emails a day), connected in Supabase under **Authentication → Emails → SMTP Settings**:
- Host `smtp-relay.brevo.com`, port `587`, username = the Brevo SMTP login (`…@smtp-brevo.com`), password = a Brevo **SMTP key**. That key is a secret, so it lives only in Supabase's dashboard, never in the code or `.env.local`.
- Sender: **Study Cat <ghte98@gmail.com>**, verified in Brevo under **Settings → Senders, domains, IPs**.
- **Authentication → Rate Limits** was raised so testing isn't blocked.
- **No domain yet:** sending "from" a Gmail address works, but Brevo warns about it ("Freemail domain is not recommended", default DKIM), and some emails may land in Spam. When the app gets real users, buy a domain (e.g. `study-cat.com` looked unregistered), authenticate it in Brevo's **Domains** tab (it gives you DNS records), and switch the sender. No code changes are needed.
- If a login email doesn't arrive: check Spam, then **Brevo → Transactional → Logs**, then **Supabase → Logs → Auth**.

#### Testing the database without touching the real one
`npm run test:db` runs all three migrations in **PGlite** (real Postgres compiled to WebAssembly, inside Node), with a stand-in for Supabase's `auth` schema, roles and default "everyone can do everything" grants. Two pretend users, Ana and Ben, go through **44 checks**: each sees only their own data, coins, streak, sessions, items and settings can't be written directly, session times come from the server, the daily cap holds, fake dates are pulled back, streaks count and reset, and the import happens once.

### Step 18 — Phase 2b: voice, study modes, phones, subjects, calendar, room · built on `phase-2b`, merged into `main` and deployed
Six parts, one commit each: `ecf4c61` voice, `04cae3d` study modes, `f7b55a6` phones, `b8e281d` subjects, `0bcfd27` calendar, `5a2af71` room progress.

#### The database: paste 3 more files, in this order
In Supabase: **SQL Editor → New query**, paste the whole file, **Run**, then the next one. Files 1–3 from step 17 are already in, so start at 4:
4. `supabase/migrations/20261029000004_study_modes.sql`
5. `supabase/migrations/20261029000005_subjects.sql`
6. `supabase/migrations/20261029000006_stats.sql`

They only add things. `end_session` and `start_session` are rebuilt with one extra, optional input each, so the live site (which doesn't send them) keeps working after you paste them. `npm run test:db` now runs all 6 files: **89 checks** (the 44 from step 17, all still passing, plus 45 new ones).

#### Part 1 — The cat's voice (`src/audio/catVoice.js`, `src/game/catLines.js`)
- **Cat babble** replaces the browser's speech voice. While a line types into the bubble, every letter makes a tiny blip: an oscillator (a tone generator) through a soft filter, with a quick fade in and out. The pitch wobbles a little at random, vowels are a bit brighter, and questions go up at the end.
  - Moods: **happy** = higher and bouncy, **sad** = lower and slower, **annoyed** = short and sharp (a square wave), **neutral** in between.
  - Browsers only allow sound after a click or tap, so the first tap unlocks it (and the cat greets you with a meow).
- **Every line has a stable id**, like `leave.toxic.07`, in `src/game/catLines.js` (262 lines). The ids must never be reused: if `public/voice/<id>.mp3` exists, that recording plays instead of the babble, and the text types along with it.
  - A small Vite plugin (`vite.config.js`) lists the files in `public/voice/`, so the app never tries to download recordings that don't exist.
  - `npm run voice:lines` writes `voice-lines.csv` (id, group, mood, text, file name) for whoever records them.
- **Meows** for clicks and greetings: 4 short sounds (`public/sounds/*.wav`) made by `tools/make-meows.mjs` from sine waves (a rising-then-falling pitch while the "mouth" moves from *m-i* to *a* to *ow*). They're our own work, released as **CC0**; see `CREDITS.md`.
- **⚙️ Settings** sheet (new): mute and a **volume** slider (saved in `studycat:volume`). On phones the top-bar mute button moves in here, to make room.
- The bubble lays out the whole line at once and reveals it letter by letter, so it doesn't grow while typing. Screen readers get the full line.

#### Part 2 — Study modes (`useLeaveTracker`, `PrefsPanel`, migration 4)
- `profiles.study_mode`: `'easy'` (default), `'medium'` or `'toxic'`; nothing else is allowed. The user may change it (a column grant), only on their own row (the RLS policy from step 17).
- **The browser only sends how many times you left** (`end_session(session_id, local_day, leave_count)`). The server reads the mode saved on your profile and works out the coins. It never receives a coin amount. Sending a smaller number can only give back what the normal rules give.
  - **Medium:** leaves after the 2nd remove 10% of that session's coins each (`floor(coins × 10% × extra leaves)`), never below 0.
  - **Toxic:** 5 coins per leave, never below 0.
  - The penalty comes off **before** the daily cap, and each session row stores `study_mode`, `leave_count` and `penalty_coins`. The new numbers are columns in `game_settings` (`medium_free_leaves`, `medium_leave_penalty_pct`, `toxic_leave_penalty_coins`).
- **What the cat does** (at least 15 lines per mode and situation in `catLines.js`):
  - Easy: sad while you're away, kind when you're back.
  - Medium: normal lines for the first trip, it **calls you out on the 2nd**, then "ten percent off" lines.
  - Toxic: it **turns its back** (a new `sulk` script: turn around, sit facing away) and roasts the behaviour (leaving, scrolling, procrastinating). It never says anything about the person, and there's no swearing. Pause, Reset or Skip during study gets a "quitting already?" line, and finishing a full session gets grudging praise.
- The mode can't be changed in the middle of a session (Settings says why).

#### Part 3 — Phones (`useWakeLock`, `useLeaveTracker`, `useTimer`)
- **Screen Wake Lock**: while studying, the screen is asked to stay on. Browsers drop the lock when the page is hidden, so it's asked for again when it's visible. If a browser doesn't support it (or says no, e.g. battery saver), nothing happens.
- **📖 Book mode** (shown on touch screens, under the timer): the page going hidden doesn't count as leaving, the cat says it'll wait, and it says welcome back. The wake lock is off in book mode, since the screen may sleep.
- **Grace period:** away for under **15 s** never counts, in any mode. If the study time runs out while you're still away, that absence counts once it's past 15 s.
- **"It was just the screen":** browsers send a web page the same signal ("the page is hidden") whether you switched the screen off or went to another app, so the cat can't tell them apart. After a counted leave, a **📱 It was just the screen** button shows for 15 s. Tapping it takes that leave back (no penalty), the cat stops sulking and says a forgive line (15 per mode, `forgive.*` in `catLines.js`). On phones, a tip then offers to turn on Book mode.
- **Locked phone:** phones pause the page's timers. The timer always compared against the real clock, but the break used to start from when you unlocked. Now it starts from when study really ended, and a break that also ran out moves on to Study by itself.

#### Part 4 — Subjects (`useSubjects`, `SubjectPicker`, migration 5)
- New table `subjects` (name, colour, last used). RLS: you see, add, change and delete only your own. The browser may write only `name` and `color`; `user_id` is filled in from the login. Names are unique per user (ignoring capitals), at most 40 letters, colours like `#a1b2c3`, and at most 50 subjects (a trigger; `max_subjects` in `game_settings`).
- `start_session(planned_minutes, subject_id)`: the subject is optional, must be yours, and gets marked as last used. Deleting a subject keeps its sessions (their subject just becomes empty).
- **Start** on a fresh study session opens the picker. Resuming after Pause doesn't. Logged out, subjects live in `studycat:subjects`.

#### Part 5 — Streak calendar (`StreakCalendar`, `useDailyTotals`, migration 6)
- `daily_totals(from, to)` returns one row per day with study time: minutes, coins, sessions (with at least a minute counted) and minutes per subject. At most 62 days per call. `subject_totals()` gives all-time minutes per subject. Both run with the caller's own rights, so RLS still hides other people's rows.
- The calendar's 4 green levels: 1–24 min, 25–59, 60–119, 120+ (`DAY_LEVELS` in `src/lib/calendar.js`). A streak day is one with 25+ minutes, the same rule as the server.
- Logged in, **"Today: N min"** comes from the server and refreshes after every session. Logged out, the calendar uses this browser's history, which now also keeps minutes per subject (`studycat:studyMsBySubject`). Logged out there are no coins, and the streak is worked out from those minutes.

#### Part 6 — Room progress (`src/game/roomProgress.js`, `RoomProgressLayer.js`)
- **One config file** holds every position, threshold and stage:
  - book thickness by hours (0, 1, 3, 8, 20, 50 h)
  - the coin jar's size and colour
  - plant stages at **0, 3, 7, 14 and 30** streak days (seed, sprout, leafy, bushy, blooming), and the droop (tilted and pale when you had a streak and it's back to 0)
- Every item has an `art` slot, set to `null` for now, so simple placeholder shapes are drawn. To use real art, drop a PNG in `public/game/room/` and write its path in the config. It loads by itself, at the size in the config. Checked by pointing the blooming plant at an existing PNG.
- The room drawing itself is unchanged. The shelf and jar sit on the empty wall between the plant and the picture, and the new plant sits on the window sill.

### Step 19 — Log in with a code, friendlier minute boxes
- **Login code:** on a phone, the email's link opens in whatever browser the mail app picks (Gmail on iPhone opens Chrome), so you ended up logged in there instead of in Safari. The email now also has a **6-digit code**. Type it into the Log in panel (`verifyOtp` in `useAuth.js`) and you're logged in right there, in that browser. The link still works as before.
  - Supabase only puts the code in the email if the email template asks for it. In **Authentication → Emails → Templates**, both **Magic Link** and **Confirm signup** need `{{ .Token }}` in them (see below).
  - A wrong or expired code says "That code didn't work…". The box keeps only digits and waits for 6.
- **Minute boxes:** they used to fix the number on every key press, so clearing the box jumped straight to 1 (and typing 25 after that gave 125). Now the box shows exactly what you type, even nothing. The number is checked only when you leave the box or press Enter: empty goes back to the old value, 0 becomes 1, and too big becomes the maximum (180 study, 60 break).

#### The email templates (Supabase → Authentication → Emails → Templates)
Put this in both **Magic Link** and **Confirm signup** (a brand-new account gets Confirm signup; after that it's Magic Link):
```html
<h2>Log in to Study Cat 🐱</h2>
<p>Your code:</p>
<p style="font-size: 28px; font-weight: bold; letter-spacing: 6px">{{ .Token }}</p>
<p>Type it into Study Cat, in the browser you're using. Or <a href="{{ .ConfirmationURL }}">open this link</a> on this device.</p>
<p>The code works for an hour. If you didn't ask for it, you can ignore this email.</p>
```

### Step 20 — Real room art and the new cat animations · built on branch `room-art`, merged into `main` and deployed
Commits: `c99e1ce` the pack, `039c2c5` the code, merged in `139924f`. No database changes, so nothing to paste into Supabase.
Files: `public/game/cat/*`, `public/game/room/*`, `tools/cat-generator-hd/*`, `src/game/catAnims.js`, `catBrain.js`, `RoomScene.js`, `roomProgress.js`, `RoomProgressLayer.js`, `layout.js`, `roomArt.js`, `src/lib/calendar.js`, `src/App.jsx`
- **The pack, version 2** (`study-cat-hd-v2.zip`, deleted after unpacking):
  - `breeds/`, `outfits/` and `study-cat.json` replaced the ones in `public/game/cat/`. The sheets are now 1280 × 4096: **32 rows** (animations) instead of 22.
  - `room/` (new) → `public/game/room/`: the shelf, 6 books, 11 jar levels + 4 sparkle frames, 5 plant stages + 4 droopy ones, the tub, and `room.json` (every image's size and origin).
  - `generator/` (now with `props.py` for the room art) replaced `tools/cat-generator-hd/generator/`. The new previews were added to `tools/cat-generator-hd/previews/`, and the pack's README is `tools/cat-generator-hd/README-v2.md`.
  - `npm run thumbs` gave exactly the same wardrobe pictures (`sit_front` didn't move).
- **No row numbers in the code:** the game already made every animation from `start` and `frames` in `study-cat.json`, and so does `make-thumbs.mjs`. I checked that the 22 old animations have the same start, frames and fps as before.
- **10 new animations in `ANIMS`** (`catAnims.js`), with the start and end postures from the README. Four new postures: `eat`, `play`, `sad` and `tub`, plus two short in-between ones:
  ```
  stand ──eat_start──▶ eat  ──eat_end──▶ stand        (same for play_start / play_end)
  sit   ──sad_start──▶ sad  ──sad_end──▶ sit
  jump (stopped in the air) ─▶ air ──bath_in──▶ tub ──bath_out──▶ crouch ──jump──▶ stand
  ```
  `jump` may now start from `stand` or `crouch`. The route-finder handles that, so `toPosture('stand')` from the tub is `bath_out, jump`.
- **No more crossfades:** eating, playing and being sad now go in and out through their own transition art. The ghost sprites and `SOFT_JOIN` are gone. Measured on all 5 breeds, the joins into and out of the loops change 0–3 % of the outline (a normal frame is ~3.5 %); before, they were 19–41 %.
- **Bowl, yarn and tub hide by themselves:** `PROP_ANIMS` in `catAnims.js` lists the animations that draw their own bowl, yarn or tub. Right before every draw, `RoomScene` hides the room's copy while one of those is on screen, even a finished one still showing its last frame. That replaced the old `setProp` / `setTub` / `setBubbles` calls.
- **The real bath** (as in the README):
  1. walk next to the tub
  2. `jump` while moving onto the tub spot
  3. `bath_in` (lands with a splash)
  4. `bath` (bubbles on its head), `bath_shake`, `bath` again
  5. `bath_out` (stands up and crouches)
  6. `jump` back out
  - **The tub:** `room/tub.png`, drawn at the tub spot with the cat's scale and origin. It hides while any `bath_*` plays, because those frames have the tub in exactly the same place (checked: 1.8 % different, only the water).
  - **Two cuts in the jumps, so it doesn't snap:**
    - The jump frames are crouch, leap, tuck, landing, crouch, stand. `bath_in` starts **in the air**, so the jump in stops after the tuck (`jumpIntoAir`). Without the cut, the cat landed on the floor in front of the tub and then popped back up into the air.
    - The jump out starts at the leap frame, because `bath_out` already ends crouched.
  - **Exactly on the spot:** the arc's tween is stopped and the cat is placed exactly on the spot before the next animation shows. In the first test the tween's clock ran one frame behind, so `bath_in`'s tub appeared 2 px off for one frame.
  - The old particle bubbles, the 1-px shake, and the two-layer drawn tub are gone.
- **Room progress with the real art** (`roomProgress.js`, `RoomProgressLayer.js`):
  - Every `art` slot names an image in `room.json`. `RoomScene` loads `room.json` and all its images up front (about 70 kB). Each image is drawn with its own origin, at the cat's scale (0.5), so the sizes match the cat.
  - **Books:** one per subject, left to right from the shelf's left end (`usableWidthPx`), each one `thicknessPx` + 1 art pixel after the last. The cover is tinted with the subject's colour; the pages go on top, untinted. Neighbouring books share an outline, like in the pack's preview. They stop before the jar when the shelf is full.
  - **Coin jar:** stands on the shelf's right end and shows the closest of `jar_00` … `jar_10` to today's coins ÷ daily cap. When it's really full (cap reached), the 4 sparkle frames loop on top at 6 fps.
  - **Plant:** on the window sill, the stage from your streak (0 / 3 / 7 / 14 / 30 days). When the streak broke, it shows the **droopy** version of the stage that streak had reached. That's why App now also passes `lostStreak`: logged in, the server's `current_streak`, which it keeps until you study again; logged out, the last run in `streaksFrom`. A broken 1–2 day streak is still a seed, which has no droopy art.
  - The placeholder shapes are removed.
- **Checked with `?debug`** on desktop (1400 × 900) and phone (375 × 812):
  - all 5 breeds, each with a different outfit (none, beanie, scarf, flowers, bow), in `bath`, `bath_shake`, `eat` and `sad`. The outfit follows every frame and stays behind the tub's rim.
  - the whole bath frame by frame in slow motion (calico + hoodie).
  - Feed, Play and Bathe from the real break buttons on the phone.
  - study → sad → study → break: **0 chain breaks**.
  - 9 room states: empty, half, full shelf, every droopy stage, and the sparkling jar.

---

## 3. Project structure

```
study-cat/
├─ index.html               page shell, title, favicon link
├─ package.json             dependencies + scripts (dev, build, lint, preview)
├─ public/
│  ├─ favicon.svg           🐱 tab icon
│  ├─ game/cat/             study-cat.json, breeds/, outfits/ (sheets) + thumbs/ (wardrobe pictures)
│  ├─ game/room/            room.json + the room art: shelf, books, coin jar, plant stages, tub
│  ├─ sounds/               the 4 meows (CC0, made by tools/make-meows.mjs)
│  └─ voice/                recorded lines go here as <line-id>.mp3 (empty for now)
├─ tools/
│  ├─ cat-generator-hd/     the HD pack's Python generator (props.py: room art), previews, READMEs (not deployed)
│  ├─ make-thumbs.mjs       cuts the wardrobe pictures out of the sheets (npm run thumbs)
│  ├─ make-meows.mjs        makes public/sounds/*.wav (npm run meows)
│  └─ db-test.mjs           tests the database migrations in PGlite (npm run test:db)
├─ scripts/export-lines.mjs writes voice-lines.csv (npm run voice:lines)
├─ voice-lines.csv          every cat line with its id, for recording
├─ CREDITS.md               where every sound comes from (all CC0)
├─ supabase/migrations/     the 6 SQL files to paste into Supabase, in order
├─ .env.local               your Supabase URL + publishable key (NOT committed)
├─ .env.example             the same names with no values (committed)
└─ src/
   ├─ main.jsx              starts React, loads the fonts
   ├─ App.jsx               the screen: timer, panel, voice; tells the cat its goal
   ├─ App.css               panel, speech bubble (follows the cat), focus view
   ├─ index.css             palette + hand-drawn buttons and inputs
   ├─ audio/catVoice.js     ★ cat babble (Web Audio), recordings, meows, volume
   ├─ lib/supabase.js       the Supabase client, local day, live streak
   ├─ lib/calendar.js       dates for the calendar, the 4 day levels, local streaks
   ├─ hooks/                useTimer, useStudyStats, useCatVoice, useLocalStorage,
   │                        useAuth, useProfile, useStudySessions, useLeaveTracker,
   │                        useWakeLock, useSubjects, useDailyTotals, useSubjectTotals
   ├─ components/           Settings, BreakPanel, Wardrobe (My Cat), AccountPanel,
   │                        PrefsPanel (⚙️), SubjectPicker, StreakCalendar,
   │                        SessionSummary, CoinPop, CoinIcon, Sheet.css (shared bottom sheet)
   └─ game/
      ├─ GameCanvas.jsx     React ↔ Phaser bridge (loads Phaser lazily)
      ├─ RoomScene.js       the Phaser scene: room, cat + outfit, breeds, camera, lighting
      ├─ catBrain.js        ★ the cat's state machine (goals, tasks, scripts)
      ├─ catItems.js        ★ every breed and outfit, with names and (future) locks
      ├─ catLines.js        ★ everything the cat says, each line with a stable id
      ├─ roomProgress.js    ★ bookshelf / coin jar / plant: positions, thresholds, which room.json image
      ├─ RoomProgressLayer.js draws them with the room art
      ├─ catAnims.js        each animation's start/end posture, chain route-finder, props drawn in frames
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
| `studycat:volume` | `0.7` | The cat's voice volume (0–1) |
| `studycat:mode` | `"medium"` | Study mode when logged out (logged in, it's on your profile) |
| `studycat:bookMode` | `false` | Book mode on or off |
| `studycat:subjects` | `[{"id":"local-…","name":"Biology","color":"#7fb3c9"}]` | Your subjects when logged out |
| `studycat:lastSubject` | `"local-…"` (or `"none"`) | The subject to preselect next time |
| `studycat:studyMsBySubject` | `{"2026-10-29": {"local-…": 1200000, "": 300000}}` | Milliseconds per subject per day (`""` = no subject) |

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
| `npm run test:db` | Tests the Supabase migrations locally (three pretend users, 89 checks) |
| `npm run voice:lines` | Writes every cat line with its id to `voice-lines.csv` |
| `npm run meows` | Re-makes the meow sounds in `public/sounds/` |
| `npx vercel env ls` | Lists the environment variables on Vercel |
| `git log --oneline` | Shows the commit history |
| `git status` | Shows what changed since the last commit |
| `git push` | Sends your commits to GitHub (once Vercel is connected, a push to `main` also deploys) |
| `npx vercel deploy --prod` | Publishes the current code to the live URL by hand (not needed once Vercel is connected to GitHub) |
| open `http://localhost:5173/?debug` | The cat debug panel |
| add `?timerloop` (dev only) | Keeps the game running in a hidden browser window, for automated tests |

---

## 5. How it was tested

**Phase 2b (step 18)**, on desktop and phone size (375×812), logged out (logins need your inbox, so the logged-in part is your checklist below):
- ✅ `npm run test:db`: **89/89**, including the 44 from step 17 unchanged. New: modes (default easy, only 3 values, can't change someone else's, Easy costs nothing, Medium 2 free then 10% each, never below 0, Toxic 5 per leave, a negative count is treated as 0, the penalty comes off before the cap, the cap still holds, coins = sum of sessions, the mode grant doesn't open `coins`), subjects (own rows only, can't add for someone else or hand one over, duplicate / bad colour / empty name refused, the limit, `start_session` with your own subject only, deleting keeps sessions), and stats (totals match the sessions, per-subject minutes, only your rows, 62-day limit, logged out refused).
- ✅ **Voice:** one babble blip per letter (20 blips for "Study buddies, assemble!"), meow sounds on the greeting and on a click, the volume slider, mute, and the line typing into the bubble. With a test file at `public/voice/start.easy.01.mp3`, that line played the file instead of babbling (the test file was removed).
- ✅ **Modes** (leaving the tab simulated): Toxic asked "Are you sure?", the start line was a roast, the cat **sulked** while away, the return line was a roast, Pause got a "quitting" line, and the card said "left 1 time". Medium: a normal line on leave 1, a call-out on leave 2, penalty lines on 3 and 4. The mode is locked during a session.
- ✅ **"It was just the screen"** (phone size, Toxic): after a 20 s absence the cat sulked and the button showed. Tapping it brought the cat back to reading with a forgive line, the leave was taken back (no "left" on the card), and the tip's **Turn it on** switched Book mode on.
- ✅ **Phones:** a 5 s look-away didn't count and the cat went straight back to reading, 20 s counted, and in book mode a 60 s absence didn't count ("I waited, just like I said."). With a 1-minute session and the clock moved 70 s on (a locked phone), the break showed **09:49**, not 10:00. Moved past the whole break, it was back on Study, waiting for Start.
- ✅ **Subjects:** add with a colour, duplicate name refused, picked one shown next to STUDY, preselected next time.
- ✅ **Calendar** (with sample history): streak 4, best 4, 7.9 h this month (all correct by hand), 8 streak days with trails only between neighbours in the same week, day detail per subject, arrows, swipe, no future months. Fixed: on phones the Sunday column was cut off.
- ✅ **Room:** books by hours, the jar filling and sparkling at the cap, all 5 plant stages and the droop, checked by eye. A configured PNG replaced the placeholder.
- ✅ **Phone top bar:** fits on one line (the word "Today:" hides under 420 px, and mute moves into ⚙️).
- ✅ Lint and build clean. No console errors on a fresh load.
- ⚠️ Not done by me: anything logged in (needs your magic link) and a real phone with a locked screen. See the checklist.

#### Testing Phase 2b with two accounts (after pasting files 4, 5 and 6)
Run it locally (`npm run dev`) or on a Vercel preview, since `main` and the live site don't have Phase 2b yet. Use two browsers, one account each, study set to **2 minutes** (the modes apply to any length; the bonus only from 25 min).
1. **A:** ⚙️ Settings → **Medium**. Start → pick **+ new subject** "Maths", any colour → Start studying.
2. Leave the tab 3 times, each for **more than 15 s**, then let it finish. The card says "left 3 times (−0 coins)" for a 2-coin session (10% of 2 rounds down to 0). For a visible penalty, do a 25-minute session: 25 + 10 bonus = 35, and a 3rd leave takes off 3.
3. Leave for **under 15 s**: nothing is counted.
4. ⚙️ → **Toxic** (it asks first). A 2-minute session with 1 leave → 0 coins (2 − 5, never below 0), and the cat turns its back.
5. In the console: `await supabase.from('profiles').update({ study_mode: 'chaos' }).eq('id', (await supabase.auth.getUser()).data.user.id)` → an error (check constraint). `…update({ coins: 9999 })…` still → permission denied.
6. Tap the 🔥 → today is green, tap it: Maths with its minutes, the coins and the sessions. "Today: N min" matches.
7. The shelf shows a thin Maths book. The jar shows today's coins out of 300. The plant matches your streak.
8. **B:** `await supabase.from('subjects').select('*')` → `[]` (none of A's). `await supabase.rpc('daily_totals', { p_from: '2026-10-01', p_to: '2026-10-31' })` → only B's days. B starts in Easy.
9. **Phone:** open the Vercel preview on your phone, start studying and leave it: the screen should stay on. Lock it for a minute, unlock: the time is right, the cat complains, and **📱 It was just the screen** takes it back. Turn on 📖 Book mode, lock it for 30 s: no leave counted.

**Accounts (step 17)**
- ✅ `npm run test:db`: 44/44 database checks with two simulated users (listed in step 17).
- ✅ Logged out, in the browser: the app works as before; "Log in" is in the top bar with the note under the timer; the panel opens and closes (×, Escape), focus moves in and back, an invalid email is refused, and the timer panel steps aside while a sheet is open.
- ✅ The real Supabase project answers (before the migrations: "table not found", as expected).
- ✅ Phone: the logged-in top bar (coins, streak, 👤) fits on one line (checked with sample values).
- ✅ The "+N coins" pop shows over the cat's head, and the cat faces you (checked with sample markup).
- ✅ Vercel has both variables for Production, Preview and Development, matching `.env.local` exactly.
- ✅ **Live, with two real accounts** (done by you, since magic links need your inboxes), on the real Supabase project:
  - Magic-link login works once emails go through Brevo.
  - With the daily cap lowered to 5, coins stopped at the cap and the app said "Today's coins are all collected".
  - From the browser console, `update({ coins: 9999 })` on your own profile was refused: **403 Forbidden**.
  - A second account saw **exactly one profile row, its own** (0 coins, 0 streak), and none of the first account's data.
- ⚠️ During the test, supabase-js warned the computer's clock was about 1 hour off. Coins are safe (the server keeps time), but keep the device clock on "Set time automatically", since the app uses the device's date for "today".

#### Testing with two accounts (do this after pasting the 3 SQL files)
Use two browsers (or a normal and a private window), one account each, with 1-minute study sessions. While testing, in the SQL Editor, `update public.game_settings set daily_coin_cap = 5;` makes the cap easy to hit. Afterwards set it back with `update public.game_settings set daily_coin_cap = 300;`.
1. Log in as A. The profile shows your email name, 0 coins and 0 streak, and your local cat look carries over.
2. Set study to 1 minute and let it finish → "+1 coin" (no bonus under 25 min).
3. In the dev console: `await supabase.from('profiles').update({ coins: 9999 }).eq('id', (await supabase.auth.getUser()).data.user.id)` → an error (permission denied), and coins don't change.
4. `await supabase.from('profiles').select('*')` → only A's own row. `await supabase.from('study_sessions').select('*')` → only A's sessions.
5. Repeat 1-minute sessions until the cap (5) → "Today's coins are all collected".
6. Log in as B in the other browser: B sees only B's data and starts at 0 coins.
7. Start a session, wait 30 s, press Pause → 0 coins (less than a minute counted).

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

- Logged out, minutes and subjects are stored **per browser**. With an account, coins, streaks, subjects and minutes are saved online. Subjects made while logged out aren't copied into your account when you log in.
- Login emails come from a Gmail address through Brevo (no domain yet), so a few may land in Spam until a real domain is set up.
- If the tab is closed in the middle of a session, that session earns nothing (the server closes it with 0 the next time you start).
- A trickster can still move their "today" up to 1 day ahead, but that only uses up tomorrow's cap early. It can't add coins beyond the real minutes studied.
- Clearing browser data erases your minutes.
- Browsers need a tap before any sound plays, so the very first line (before you tap anything) is silent.
- The leave count comes from the browser. Someone could send 0 (or tap "It was just the screen" after scrolling Instagram) to skip the Medium/Toxic penalties, but they can never get more than Easy gives, and the mode is their own choice anyway.
- A web page can't tell "screen switched off" from "switched to another app" (Safari gives no way to know). That's why the button and Book mode exist.
- The leave count is per server session, and Pause → Start begins a new one, so pausing resets the free trips in Medium.
- On iPhones, the wake lock needs iOS 16.4 or newer. Older ones just let the screen sleep (use Book mode).
- Fullscreen can be refused by some browsers; the focus view still works in the window.
- A change of plan waits for the current move to finish (up to about 2 s for a long loop like `read`), on purpose, so the cat never snaps.
- Phaser adds about 320 kB (gzipped) to download, plus ~0.6–0.8 MB for a breed sheet, ~0.05–0.35 MB for an outfit, and ~70 kB of room art. They load after the page, but the very first visit shows an empty room for a moment, and picking a new breed or outfit takes a moment the first time.
- The room's own bowl and yarn are still simple drawings (`roomArt.js`). The pack draws an HD bowl and yarn inside the eat and play frames, so you can see the swap when the cat starts eating or playing. They're in the same place, but the style differs.
- Each breed sheet is now 1280 × 4096, about 21 MB of graphics memory once decoded (it was 14 MB). Only the breed and outfit in use are loaded, but 4096 px is also the largest texture some older phones accept.
- The window's hills and a few room details are still drawn from small rectangles, so up close they have little steps.
- When locks become real, a saved breed or outfit that's locked will need a fallback (e.g. orange with no outfit). Today nothing is locked, so that can't happen yet.
- After regenerating the sprite pack, run `npm run thumbs`, or the wardrobe pictures will be out of date.
- The repo is public, so anything committed is visible to everyone. Keep secrets in `.env.local` (ignored), never in the code.
- If the browser tab is in the background, the game pauses (browsers stop drawing hidden pages). The timer keeps counting correctly, also after a locked phone.

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

If a new sprite animation is added to the pack, add one line to `ANIMS` in `catAnims.js` saying which posture it starts and ends in (`from` can be a list). The route-finder then knows how to reach it. If its frames draw a room prop (like the bowl), add it to `PROP_ANIMS` so the room's copy hides while it plays.

**New room art:** add it in `tools/cat-generator-hd/generator/props.py`, copy the image and the new `room.json` into `public/game/room/`, and name it in `roomProgress.js`. It's drawn with its origin from `room.json`, at the cat's scale.

---

## 8. Ideas for Phase 2

- A shop: spend coins on breeds and outfits. Fill in the `lock`s in `catItems.js`, pass real `progress` (coins, streak, `owned_items`) to the wardrobe, and add a `buy_item` function on the server that checks the price
- Recorded voice lines (`npm run voice:lines` → `voice-lines.csv`, files go in `public/voice/`)
- More sounds (purring, rain on the window) and a "session complete" notification
- Edit or delete subjects, and copy logged-out subjects into the account on first login
- Day/night room that follows your real clock
- More behaviours for the Phaser cat (chasing a falling leaf, napping in a sunbeam)
- Unlockable room decorations as study rewards
