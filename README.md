# Study Cat 🐱

A Pomodoro study timer with a 3D cat companion.
Built with React + Vite + React Three Fiber.

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
    catConfig.js          animation names + settings for a real model
    Cat.jsx               picks the placeholder or the .glb model
    PlaceholderCat.jsx    cat made of spheres/cones, posed every frame
    GlbCat.jsx            loads a real .glb and plays its clips
    CatScene.jsx          3D canvas, camera and lights
    useStudyCycle.js      rotates reading → eating → watching while you study
```

## Swapping in a real cat model

1. Put your model at `public/models/cat.glb`.
2. In `src/cat/catConfig.js`, set `modelUrl: '/models/cat.glb'`.
3. Map each app animation (`reading`, `sad`, `play`, ...) to a clip name in your file
   under `clipNames`. Adjust `scale` / `position` until it sits right.

Nothing else needs to change — the app only ever asks the cat to "play animation X".
