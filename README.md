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
    poses.js              rig sizes, every pose and action (edit here!)
    rig.js                inverse kinematics + blending math
    usePuppet.js          the animator: pose blending + idle life
    Cat.jsx               the puppet: one <g> per jointed body part
    CatScene.jsx          room + stage (desk, stool, props, cat)
    useStudyCycle.js      rotates the study actions while you focus
  scene/
    Room.jsx              wall, window, plant, floor
```

## Adding cat actions

The cat is a rigged SVG puppet. Poses are joint angles (or paw targets) in `src/cat/poses.js`,
and actions are short lists of poses. See "Adding a new action" in [PROJECT_LOG.md](PROJECT_LOG.md).
While `npm run dev` runs, try `studyCat.play('pageTurn')` in the browser console.
