# Study Cat 🐱

A cozy 2D storybook Pomodoro timer: a cat keeps you company in a warm little room while you study.
Built with React + Vite + Phaser, with an HD sprite cat in 5 breeds and 5 outfits.

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
    Wardrobe.jsx          the "My Cat" panel: breeds and outfits
  game/
    GameCanvas.jsx        React <-> Phaser bridge
    RoomScene.js          the Phaser scene: pixel room, cat, camera, lighting
    catBrain.js           the cat's state machine (goals, tasks, scripts)
    catItems.js           every breed and outfit, with (future) locks
    catAnims.js           each animation's start/end posture + chain route-finder
    layout.js             spots and prop positions (game pixels)
    roomArt.js            the room and props (drawn at 3× resolution)
    DebugPanel.jsx        the ?debug panel
public/game/cat/          study-cat.json, breeds/, outfits/ (HD sprite sheets)
tools/cat-generator-hd/   the HD pack's generator, previews, README (not deployed)
```

## The cat

The cat is an HD sprite pack (see `tools/cat-generator-hd/README.md`) driven by a state machine in
`src/game/catBrain.js`. It only moves through the pack's transition chains, so it never snaps.
Pick a breed and outfit with the **🐱 My Cat** button; the choice is saved in localStorage (`studycat:cat`).
After changing the sprite sheets, run `npm run thumbs` to refresh the wardrobe pictures.
Open `http://localhost:5173/?debug` for breed/outfit pickers, buttons for every animation and state, plus slow motion.
More in [PROJECT_LOG.md](PROJECT_LOG.md) (steps 13–15).
