# Study Cat 🐱

A cozy 2D storybook Pomodoro timer: a cat keeps you company in a warm little room while you study.
Built with React + Vite + SVG.

**Live:** https://study-cat-pink.vercel.app · **Full build history and explanations:** [PROJECT_LOG.md](PROJECT_LOG.md)

## Run it

```bash
npm install
npm run dev
```

Then open http://localhost:5173.

## How the code is organized

```
src/
  App.jsx                 the screen: decides what the cat does and when
  hooks/
    useTimer.js           study/break countdown (accurate in background tabs)
    useStudyStats.js      today's study minutes, saved in localStorage
    useCatVoice.js        speech bubble + browser speech (Web Speech API)
    useLocalStorage.js    useState that survives page reloads
  components/
    Settings.jsx          study/break length inputs
    BreakPanel.jsx        Play / Feed / Bathe buttons
  cat/
    catConfig.js          the animation names (the cat's "contract")
    Cat.jsx               the SVG cat + mouse tracking
    cat.css               every pose and loop, per animation
    CatScene.jsx          room + cat together
    useStudyCycle.js      rotates reading → eating → watching while you study
  scene/
    Room.jsx              window, plant, desk, lamp, mug, floor, rug
    room.css              room layout, falling leaves, study/break lighting
```

## Changing the cat

The app only ever asks the cat to "play animation X" (names in `src/cat/catConfig.js`).
Redraw the cat in `Cat.jsx` / `cat.css` and keep those names, and nothing else needs to change.
