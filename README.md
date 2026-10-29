# Study Cat 🐱

A cozy 2D storybook Pomodoro timer: a cat keeps you company in a warm little room while you study.
Built with React + Vite + Phaser (pixel art).

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
  game/
    GameCanvas.jsx        React <-> Phaser bridge
    RoomScene.js          the Phaser scene: pixel room, cat, camera, lighting
    catBrain.js           the cat's state machine (goals, tasks, scripts)
    catAnims.js           each animation's start/end posture + chain route-finder
    layout.js             spots and prop positions (game pixels)
    roomArt.js            the pixel-art room and props
    DebugPanel.jsx        the ?debug panel
public/game/cat/          sprite sheet + JSON
tools/cat-generator/      the sprite pack's generator, previews, README (not deployed)
```

## The cat

The cat is a sprite pack (see `tools/cat-generator/README.md`) driven by a state machine in
`src/game/catBrain.js`. It only moves through the pack's transition chains, so it never snaps.
Open `http://localhost:5173/?debug` for buttons for every animation and state, plus slow motion.
More in [PROJECT_LOG.md](PROJECT_LOG.md) (step 13).
