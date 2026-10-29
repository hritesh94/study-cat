# Study Cat — Project Log

Everything built so far, in order, with simple explanations of what each piece does and why.

**Live app:** https://study-cat-pink.vercel.app
**Stack:** React 19 + Vite 8 + React Three Fiber (Three.js)
**Status:** Phase 1 complete (no login, no backend)

---

## 1. What the app does

| Feature | How it works |
|---|---|
| Pomodoro timer | Default 50 min study / 10 min break, both adjustable (study 1–180, break 1–60). Start, Pause, Reset, Skip. |
| Auto phases | When study ends, the break starts by itself. When the break ends, the app waits for you to press Start. |
| 3D cat | A placeholder cat made of spheres and cones, in the middle of the screen. Built so a real `.glb` model can replace it later. |
| Focus view | While studying: fullscreen, dark background, everything hidden except the cat and the time. |
| Study animations | While you study, the cat switches between **reading**, **eating** and **watching** (it follows your mouse) every 15–25 s. |
| Break mode | The cat says *"Enough studying, play with me!"* and shows **Play 🧶**, **Feed 🐟** and **Bathe 🫧**. Each has its own reaction animation. |
| Sad cat | Switch tabs during study and the cat goes sad (droopy ears, head down, a tear). When you come back it complains, then forgives you after 4 s. |
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

### Step 2 — Install the 3D libraries · `bf958cb`
```bash
npm install three @react-three/fiber @react-three/drei
```
- **three**: the 3D engine (meshes, lights, cameras).
- **@react-three/fiber (R3F)**: lets you write 3D scenes as React components, like `<mesh>`.
- **@react-three/drei**: ready-made helpers. We use `ContactShadows` (the soft shadow under the cat) and `useGLTF` / `useAnimations` for a future real model.

### Step 3 — Timer, settings, saved minutes · `38f3179`
Files: `src/hooks/useTimer.js`, `useStudyStats.js`, `useLocalStorage.js`, `src/components/Settings.jsx`
- **Timer accuracy:** the timer saves the *time the phase ends* and compares it to the real clock (`Date.now()`). Browsers slow down timers in background tabs, so a "subtract 1 every second" countdown would fall behind. This one doesn't.
- **Study minutes:** every ¼ second of study is added to a per-day record in localStorage:
  `studycat:studyMsByDay → {"2026-10-29": 90765}` (milliseconds). Keeping every day makes a history or streak screen easy later.
- **useLocalStorage:** works like `useState`, but the value is also saved in the browser.

### Step 4 — The 3D cat and focus view · `921986a`
Files: everything in `src/cat/`
- **How the cat is built:** `PlaceholderCat.jsx` makes the body, head, ears, eyes, whiskers, paws and tail from basic shapes, plus props (book, bowl, yarn, heart, bubbles, tear).
- **How it animates:** each animation is a small function that returns a *pose* (head tilt, ear droop, eye squint, which props show). `useFrame` runs about 60 times a second and moves each part a little toward its pose (`damp`), so switching animations blends smoothly instead of snapping.
- **Swappable model:** the app only ever says "play animation X". `Cat.jsx` decides whether the placeholder or a real `.glb` (`GlbCat.jsx`) plays it, based on `catConfig.js`.
- **Focus view:** CSS hides the extra UI while studying, and the Start click asks the browser for fullscreen. Browsers only allow fullscreen right after a click.

### Step 5 — Break reactions, sad cat, voice · `28625a5`
Files: `src/App.jsx`, `src/hooks/useCatVoice.js`, `src/components/BreakPanel.jsx`
- **Sad cat:** the browser fires a `visibilitychange` event whenever you switch tabs. If you're studying, the cat becomes sad.
- **Voice:** `speechSynthesis.speak()` reads the line aloud. Pitch 1.7 makes it sound more like a kitten. No internet or API key needed.
- **Which animation wins:** a break reaction beats sad, sad beats the study cycle, and the study cycle beats idle.
- **Camera re-framing:** the camera moved so the cat sits between the speech bubble and the timer panel.

### Step 6 — Deploy to Vercel · `7754558`
```bash
npx vercel deploy --prod
```
- Vercel detected a Vite app, ran `npm run build` on its servers, and published the `dist/` folder.
- Vercel added `.vercel` to `.gitignore`. That folder links this project to your Vercel account and shouldn't be committed.
- **Share only** `https://study-cat-pink.vercel.app`. The long per-deploy links (`study-xxxx-hritesh94s-projects.vercel.app`) need a Vercel login.

---

## 3. Project structure

```
study-cat/
├─ index.html               page shell; React mounts into <div id="root">
├─ package.json             dependencies + scripts (dev, build, lint, preview)
├─ public/models/           put cat.glb here later
├─ .claude/launch.json      dev-server config for Claude's browser preview
└─ src/
   ├─ main.jsx              starts React
   ├─ App.jsx               the screen: timer + cat + break panel + sad/voice logic
   ├─ App.css / index.css   layout, colors, focus view, speech bubble
   ├─ hooks/
   │  ├─ useTimer.js         study/break countdown
   │  ├─ useStudyStats.js    today's minutes (localStorage)
   │  ├─ useCatVoice.js      speech bubble + Web Speech API + mute
   │  └─ useLocalStorage.js  useState that survives reloads
   ├─ components/
   │  ├─ Settings.jsx        study/break length inputs
   │  └─ BreakPanel.jsx      Play / Feed / Bathe buttons + their lines
   └─ cat/
      ├─ catConfig.js        animation names + real-model settings
      ├─ Cat.jsx             picks placeholder or .glb
      ├─ PlaceholderCat.jsx  shape cat + all poses
      ├─ GlbCat.jsx          loads a .glb and plays its clips
      ├─ CatScene.jsx        3D canvas, camera, lights, shadow
      └─ useStudyCycle.js    rotates the study animations
```

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

Tested in a browser on the local dev server, and again on the live Vercel URL:
- ✅ Timer counts down, Pause/Reset/Skip work, settings persist
- ✅ Focus view appears on Start; the cat reads, then cycles animations
- ✅ Break mode shows the bubble and buttons; Play, Feed and Bathe each animate
- ✅ Sad cat + "come back" line after leaving the tab (tested by simulating the tab-switch event)
- ✅ Study minutes saved to localStorage
- ✅ No console errors; lint and build are clean
- ✅ Live URL opens without a login and the cat shows up
- ⚠️ The spoken voice wasn't listened to (it was muted during testing). Try it yourself; voices differ by browser.

---

## 6. Known limitations (Phase 1)

- Minutes are stored **per browser**: your friend's minutes and yours aren't shared or synced.
- Clearing browser data erases your minutes.
- Speech voices vary by browser/OS, and some browsers need a click before audio plays.
- Fullscreen can be refused by some browsers; the focus view still works in the window.
- The `.glb` path in `GlbCat.jsx` isn't tested yet, because there's no real model.

---

## 7. Swapping in a real cat model

1. Put the file at `public/models/cat.glb`.
2. In `src/cat/catConfig.js`, set `modelUrl: '/models/cat.glb'`.
3. Fill in `clipNames`, which maps each app animation (`reading`, `sad`, `play`, ...) to a clip name in your file. You can see a model's clip names at https://gltf-viewer.donmccurdy.com.
4. Adjust `scale` and `position` until it sits right.

---

## 8. Ideas for Phase 2

- Login + backend so minutes sync across devices
- History chart and study streaks (the per-day data is already being saved)
- Real `.glb` cat with proper animations
- Sounds (purring, meows) and a "session complete" notification
- A custom page title and favicon (still the Vite defaults)
