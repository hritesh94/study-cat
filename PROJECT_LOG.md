# Study Cat — Project Log

Everything built so far, in order, with simple explanations of what each piece does and why.

**Live app:** https://study-cat-pink.vercel.app
**Stack:** React 19 + Vite 8, with a rigged 2D SVG cat puppet and room (no 3D or animation library)
**Status:** Phase 1 complete, plus the cozy 2D redesign and the rigged puppet (no login, no backend)

---

## 1. What the app does

| Feature | How it works |
|---|---|
| Pomodoro timer | Default 50 min study / 10 min break, both adjustable (study 1–180, break 1–60). Start, Pause, Reset, Skip. |
| Auto phases | When study ends, the break starts by itself. When the break ends, the app waits for you to press Start. |
| Puppet cat | A 2D cat in a 3/4 side view, built like a puppet: head, torso, 3-part tail, and legs with real joints. It's always alive: it breathes, blinks, twitches its ears and swishes its tail. |
| Cozy room | Wooden floor, rug, a desk with a warm lamp, an open book, a pencil and a steaming mug, a stool, a plant, a framed paw print, and a window with leaves slowly falling outside. |
| Mood lighting | **Study:** the room dims slightly, the lamp glows warmer, and it turns to dusk outside. **Break:** the room brightens and it's sunny. |
| Focus view | While studying: fullscreen, and everything hidden except the cat, the room and the time. |
| Study actions | The cat hops onto the stool and switches every 15–25 s between: **reading** (head follows the lines), **turning a page** (the paw grabs the corner and the page flips), **writing** with a pencil, **sipping** from the mug with both paws, **chin on paw → yawn → stretch**, and **watching** you (turns toward your mouse). |
| Break mode | The cat hops down to the rug and says *"Enough studying, play with me!"*. **Play 🧶** = bats the yarn with its front paws, **Feed 🐟** = eats from a bowl with its tail swishing, **Bathe 🫧** = sits in a little tub and shakes off bubbles. |
| Sad cat | Switch tabs during study and the cat hunches on the stool: ears back, tail wrapped around its feet, sad brows, a tear. When you come back it complains, then forgives you after 4 s. |
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

---

## 3. Project structure

```
study-cat/
├─ index.html               page shell, title, favicon link
├─ package.json             dependencies + scripts (dev, build, lint, preview)
├─ public/favicon.svg       🐱 tab icon
├─ .claude/launch.json      dev-server config for Claude's browser preview
└─ src/
   ├─ main.jsx              starts React, loads the fonts
   ├─ App.jsx               the screen: timer + cat + break panel + sad/voice logic
   ├─ App.css               layout variables, panel, bubble, focus view
   ├─ index.css             palette + hand-drawn buttons and inputs
   ├─ hooks/
   │  ├─ useTimer.js         study/break countdown
   │  ├─ useStudyStats.js    today's minutes (localStorage)
   │  ├─ useCatVoice.js      speech bubble + Web Speech API + mute
   │  └─ useLocalStorage.js  useState that survives reloads
   ├─ components/
   │  ├─ Settings.jsx        study/break length inputs
   │  └─ BreakPanel.jsx      Play / Feed / Bathe buttons + their lines
   ├─ cat/
   │  ├─ catConfig.js        the list of animation names (the "contract")
   │  ├─ poses.js            ★ rig sizes, every pose, every action — edit here
   │  ├─ rig.js              the math: inverse kinematics, blending, easing
   │  ├─ usePuppet.js        the animator loop + idle life (breathe/blink/…)
   │  ├─ Cat.jsx             the puppet drawing: one <g> per jointed part
   │  ├─ cat.css             fur, outlines, eye/mouth expressions
   │  ├─ CatScene.jsx        room + the stage (desk, stool, props, cat)
   │  ├─ stage.css           stage paints, lamp glow, study/break lighting
   │  └─ useStudyCycle.js    rotates the study actions
   └─ scene/
      ├─ Room.jsx            wall, window with falling leaves, plant, floor
      └─ room.css            room layout + study/break dimming
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
| `git log --oneline` | Shows the commit history |
| `git status` | Shows what changed since the last commit |
| `npx vercel deploy --prod` | Publishes the current code to the live URL |

---

## 5. How it was tested

Puppet checked in the browser at 1280×800, 800×600 and phone (375×812) sizes:
- ✅ Every study pose inspected up close: reading, page reach / flip / land, pencil pick-up, writing, thinking (pencil to chin), mug reach + sip with both paws, chin rest, yawn, stretch, watching (mouse on both sides)
- ✅ Every break pose: sitting on the rug, batting the yarn, eating from the bowl (with hearts), bathing in the tub
- ✅ Sad: hunched on the stool, ears back, tear, tail wrapped in front of the feet (via the real tab-switch logic, event simulated)
- ✅ Hop between stool and rug when study starts and when the break starts (real Start / Skip buttons)
- ✅ All 12 names in `catConfig.js` resolve to actions; all 22 poses give valid angles
- ✅ Speech bubble follows the cat's head on the stool and on the rug
- ✅ Phone: break panel fits under the cat (buttons stay on one row)
- ✅ No console errors; lint and build clean; `App.jsx`, `hooks/` and `components/` unchanged
- ⚠️ The spoken voice wasn't listened to (muted during testing). Try it yourself; voices differ by browser.

---

## 6. Known limitations

- Minutes are stored **per browser**: your friend's minutes and yours aren't shared or synced.
- Clearing browser data erases your minutes.
- Speech voices vary by browser/OS, and some browsers need a click before audio plays.
- Fullscreen can be refused by some browsers; the focus view still works in the window.
- The cat only follows the mouse, not touch (on phones it just looks ahead).
- On narrow phones the edges of the stage are cropped (the far end of the desk, the book stack).
- Movements are hand-tuned poses, so some hand-offs (like grabbing the pencil) are a quick fade rather than a true grip.

---

## 7. Adding a new action (example: "wave")

1. In `src/cat/poses.js`, add a pose (copy a similar one and change a few numbers):
   ```js
   wave: { ...readStill, head: -6, armN: { reach: [400, 170], paw: -80 }, eyes: 'happy' },
   ```
2. Add the action (a list of steps):
   ```js
   waving: { steps: [{ pose: 'wave', dur: 0.4, hold: 0.3 }, { pose: 'readStill', dur: 0.4 }] },
   ```
3. Try it: `studyCat.play('waving')` in the browser console (dev server only).
4. To use it in the app, add `'waving'` to `CAT_ANIMATIONS` (and to `STUDY_IDLES` if it's a study action).

Tips: angles are degrees, `0` = hanging straight down, negative = forward. Use `reach` / `foot` targets in stage coordinates (800 × 520) when a paw needs to touch something.

---

## 8. Ideas for Phase 2

- Login + backend so minutes sync across devices
- History chart and study streaks (the per-day data is already being saved)
- Sounds (purring, meows, rain on the window) and a "session complete" notification
- Day/night room that follows your real clock
- More actions (stretching on the rug, napping on the desk, chasing a falling leaf)
- Unlockable room decorations as study rewards
