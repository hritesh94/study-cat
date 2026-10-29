# Study Cat — Project Log

Everything built so far, in order, with simple explanations of what each piece does and why.

**Live app:** https://study-cat-pink.vercel.app
**Stack:** React 19 + Vite 8, with a 2D SVG cat and room (no 3D library)
**Status:** Phase 1 complete, plus the cozy 2D redesign (no login, no backend)

---

## 1. What the app does

| Feature | How it works |
|---|---|
| Pomodoro timer | Default 50 min study / 10 min break, both adjustable (study 1–180, break 1–60). Start, Pause, Reset, Skip. |
| Auto phases | When study ends, the break starts by itself. When the break ends, the app waits for you to press Start. |
| Storybook cat | A 2D cat drawn in SVG, with the head and body as one connected outline. It's always alive: it blinks, swishes its tail, and breathes slowly. |
| Cozy room | Behind the cat: wooden floor, rug, desk, warm lamp, plant, a steaming mug, a framed paw print, and a window with leaves slowly falling outside. |
| Mood lighting | **Study:** the room dims slightly, the lamp glows warmer, and it turns to dusk outside. **Break:** the room brightens and it's sunny. |
| Focus view | While studying: fullscreen, and everything hidden except the cat, the room and the time. |
| Study animations | While you study, the cat switches between **reading** (with page flips), **eating** and **watching** (it follows your mouse) every 15–25 s. |
| Break mode | The cat says *"Enough studying, play with me!"* and shows **Play 🧶**, **Feed 🐟** and **Bathe 🫧**, each with its own reaction (hopping with yarn, munching with hearts, shaking off bubbles). |
| Sad cat | Switch tabs during study and the cat goes sad (droopy ears and tail, sad brows, a tear). When you come back it complains, then forgives you after 4 s. |
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

### Step 11 — Docs + redeploy
This log was updated, then `npx vercel deploy --prod`.

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
   │  ├─ Cat.jsx             the SVG cat drawing + mouse tracking
   │  ├─ cat.css             every pose, loop and prop, per animation
   │  ├─ CatScene.jsx        room + cat together (what App.jsx renders)
   │  └─ useStudyCycle.js    rotates the study animations
   └─ scene/
      ├─ Room.jsx            window, plant, desk, lamp, mug, floor, rug
      └─ room.css            room layout, leaves/steam, study/break lighting
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

Redesign checked in the browser at desktop (800×600) and phone (375×812) sizes:
- ✅ All 8 animations render: idle, reading, eating, watching, sad, play, feed, bathe
- ✅ Watching cat leans toward the mouse
- ✅ Play and Bathe triggered through the real break buttons
- ✅ Sad cat through the real tab-switch logic (event simulated)
- ✅ Study: room dims, lamp warms, dusk sky. Break: room brightens.
- ✅ Phone layout: cat, panel and room fit without overlapping
- ✅ No console errors; lint and build clean; `App.jsx`, `hooks/` and `components/` unchanged
- ⚠️ The spoken voice wasn't listened to (muted during testing). Try it yourself; voices differ by browser.

---

## 6. Known limitations

- Minutes are stored **per browser**: your friend's minutes and yours aren't shared or synced.
- Clearing browser data erases your minutes.
- Speech voices vary by browser/OS, and some browsers need a click before audio plays.
- Fullscreen can be refused by some browsers; the focus view still works in the window.
- The cat only follows the mouse, not touch (on phones it just looks ahead).

---

## 7. Changing the cat's art later

The rest of the app only knows the animation names in `src/cat/catConfig.js`.
To restyle or replace the cat (different SVG, a sprite sheet, Lottie...):
1. Keep `Cat.jsx` accepting `animation` with those same names.
2. Change the drawing in `Cat.jsx` and the poses in `cat.css`.
3. App.jsx doesn't need to change.

To add a **new** animation: add its name to `CAT_ANIMATIONS`, add `.cat--yourname` rules in `cat.css`, then use the name in App.jsx.

---

## 8. Ideas for Phase 2

- Login + backend so minutes sync across devices
- History chart and study streaks (the per-day data is already being saved)
- Sounds (purring, meows, rain on the window) and a "session complete" notification
- Day/night room that follows your real clock
- Unlockable room decorations as study rewards
