import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AccountPanel } from './components/AccountPanel'
import { BreakPanel } from './components/BreakPanel'
import { CoinIcon } from './components/CoinIcon'
import { CoinPop } from './components/CoinPop'
import { GameCanvas } from './game/GameCanvas'
import { Settings } from './components/Settings'
import { Wardrobe } from './components/Wardrobe'
import { liveStreak } from './lib/supabase'
import { useAuth } from './hooks/useAuth'
import { useCatVoice } from './hooks/useCatVoice'
import { useLocalStorage } from './hooks/useLocalStorage'
import { useProfile } from './hooks/useProfile'
import { useStudySessions } from './hooks/useStudySessions'
import { useStudyStats } from './hooks/useStudyStats'
import { formatTime, useTimer } from './hooks/useTimer'
import './App.css'

const BREAK_LINE = 'Enough studying, play with me!'
const START_LINES = ["Let's focus!", "Study time! I'll keep you company.", 'You got this!']
const COME_BACK_LINES = ['Hey! Where did you go?', 'You left me all alone...', 'No sneaking off!']
const MEOW_LINES = ['Meow!', 'Mrrp?', 'Meow meow!']
const pick = (lines) => lines[Math.floor(Math.random() * lines.length)]

// Browsers only allow fullscreen right after a click, so we call this from
// the Start button. If it's refused, the focus view still works in the window.
function enterFullscreen() {
  if (!document.fullscreenElement) document.documentElement.requestFullscreen?.().catch(() => {})
}
function exitFullscreen() {
  if (document.fullscreenElement) document.exitFullscreen().catch(() => {})
}

export default function App() {
  const [settings, setSettings] = useLocalStorage('studycat:settings', {
    studyMinutes: 50,
    breakMinutes: 10,
  })
  const { todayMinutes, addStudyMs } = useStudyStats()
  const voice = useCatVoice()

  const timer = useTimer({
    studyMinutes: settings.studyMinutes,
    breakMinutes: settings.breakMinutes,
    onStudyTime: addStudyMs,
    onPhaseChange: (next) => {
      if (next === 'break') {
        exitFullscreen()
        voice.say(BREAK_LINE)
      } else {
        voice.say("Break's over! Back to work.")
      }
    },
  })

  const focusing = timer.phase === 'study' && timer.running

  // ── Sad cat: switching tabs during study ──
  const [sad, setSad] = useState(false)
  // The event listener below is set up once, so it reads fresh values from this ref.
  const latest = useRef({})
  useEffect(() => {
    latest.current = { focusing, sad, say: voice.say }
  })
  useEffect(() => {
    let cheerUp
    const onVisibilityChange = () => {
      const { focusing, sad, say } = latest.current
      if (document.hidden) {
        if (focusing) {
          clearTimeout(cheerUp)
          setSad(true)
        }
      } else if (sad) {
        // You're back: the cat complains, stays sad a moment, then forgives you.
        say(pick(COME_BACK_LINES))
        cheerUp = setTimeout(() => setSad(false), 4000)
      }
    }
    document.addEventListener('visibilitychange', onVisibilityChange)
    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange)
      clearTimeout(cheerUp)
    }
  }, [])

  // ── The cat (a Phaser game) ──
  // React decides WHAT the cat should be doing; the cat's brain decides HOW
  // to get there (walking, sitting down, turning around…).
  const game = useRef(null)
  const panelRef = useRef(null)
  const [catBusy, setCatBusy] = useState(true)

  // ── Account (Supabase): optional; everything works logged out too ──
  const auth = useAuth()
  const { profile, settings: gameRules, update: updateProfile, merge: mergeProfile } = useProfile(auth.user)
  const streak = liveStreak(profile)

  // Which cat you have: from your profile when logged in, else this browser.
  const [localLook, setLocalLook] = useLocalStorage('studycat:cat', { breed: 'orange', outfit: null })
  const profileBreed = profile?.breed
  const profileOutfit = profile?.outfit
  const catLook = useMemo(
    () => (profileBreed ? { breed: profileBreed, outfit: profileOutfit ?? null } : localLook),
    [profileBreed, profileOutfit, localLook],
  )
  const setCatLook = (look) => {
    setLocalLook(look)
    if (profile) updateProfile({ breed: look.breed, outfit: look.outfit })
  }

  // One bottom sheet at a time: the "My Cat" wardrobe or the account panel.
  // While the wardrobe is open the cat shows off its look.
  const [sheet, setSheet] = useState(null) // null | 'wardrobe' | 'account'
  const wardrobeRef = useRef(null)
  const accountRef = useRef(null)
  const myCatButton = useRef(null)
  const accountButton = useRef(null)
  const openSheet = useRef(null)
  useEffect(() => {
    openSheet.current = sheet
  })
  const closeSheet = useCallback(() => {
    // keyboard users land back on the button they came from
    const from = openSheet.current === 'account' ? accountButton : myCatButton
    setSheet(null)
    from.current?.focus()
  }, [])
  const toggleSheet = (name) => setSheet((open) => (open === name ? null : name))
  const wardrobeOpen = sheet === 'wardrobe'
  // what the game must keep the cat above
  const coverRefs = useMemo(() => [panelRef, wardrobeRef, accountRef], [])

  // ── Study sessions on the server → coins + streak ──
  const [coinPop, setCoinPop] = useState(null)
  const [coinBump, setCoinBump] = useState(false)
  useStudySessions({
    enabled: !!profile,
    focusing,
    plannedMinutes: () => Math.ceil(timer.remainingMs / 60000),
    onResult: (r) => {
      mergeProfile({ coins: r.coins, current_streak: r.current_streak, best_streak: r.best_streak, last_study_day: r.last_study_day })
      if (r.coins_awarded <= 0 && !r.capped) return
      setCoinPop({ id: Date.now(), coins: r.coins_awarded })
      setCoinBump(true)
      game.current?.celebrate()
      voice.say(r.coins_awarded > 0 ? `Yay! +${r.coins_awarded} ${r.coins_awarded === 1 ? 'coin' : 'coins'}!` : "That's all the coins for today!")
    },
    onError: (error) => console.warn('[study session]', error.message),
  })
  useEffect(() => {
    if (!coinPop) return
    const hide = setTimeout(() => setCoinPop(null), 2600)
    const unbump = setTimeout(() => setCoinBump(false), 700)
    return () => {
      clearTimeout(hide)
      clearTimeout(unbump)
    }
  }, [coinPop])
  const timerGoal = !timer.running ? 'wander' : timer.phase === 'study' ? (sad ? 'sad' : 'study') : 'break'
  const catGoal = wardrobeOpen ? 'showOff' : timerGoal
  const mood = focusing ? 'focus' : timer.phase === 'break' ? 'break' : 'idle'

  // ── Break reactions: Play / Feed / Bathe ──
  const doBreakAction = (action) => {
    voice.say(action.line)
    game.current?.command(action.animation)
  }
  const bubble = voice.line ?? (timer.phase === 'break' ? BREAK_LINE : null)

  const start = () => {
    if (timer.phase === 'study') {
      enterFullscreen()
      voice.say(pick(START_LINES))
    }
    timer.start()
  }
  const pause = () => {
    exitFullscreen()
    timer.pause()
  }

  return (
    <div className={`app ${focusing ? 'focus' : ''} ${timer.phase}${sheet ? ' sheet-open' : ''}`}>
      <GameCanvas
        ref={game}
        goal={catGoal}
        mood={mood}
        look={catLook}
        onLookChange={setCatLook}
        coverRefs={coverRefs}
        onBusy={setCatBusy}
        onMeow={() => voice.say(pick(MEOW_LINES))}
      />

      <header className={`topbar${profile ? ' signed-in' : ''}`}>
        <h1>Study Cat</h1>
        <div className="topbar-right">
          {profile && (
            <>
              <span className={`stat coins${coinBump ? ' bump' : ''}`} title="Coins" aria-label={`${profile.coins} coins`}>
                <CoinIcon /> {profile.coins}
              </span>
              <span className="stat streak" title={`Study streak (best: ${profile.best_streak})`} aria-label={`${streak} day streak`}>
                <span aria-hidden="true">🔥</span> {streak}
              </span>
            </>
          )}
          <button
            ref={myCatButton}
            className="mycat"
            onClick={() => toggleSheet('wardrobe')}
            aria-expanded={wardrobeOpen}
            aria-label="My Cat"
            title="My Cat"
          >
            <span aria-hidden="true">🐱</span>
            <span className="mycat-label"> My Cat</span>
          </button>
          <span className="today">Today: {todayMinutes} min</span>
          {auth.enabled && auth.ready && (
            <button
              ref={accountButton}
              className={auth.user ? 'account-button' : 'login-button'}
              onClick={() => toggleSheet('account')}
              aria-expanded={sheet === 'account'}
              title={auth.user ? 'Your account' : 'Log in'}
            >
              {auth.user ? (
                <>
                  <span aria-hidden="true">👤</span>
                  <span className="account-name"> {profile?.display_name ?? '…'}</span>
                </>
              ) : (
                'Log in'
              )}
            </button>
          )}
          {voice.canSpeak && (
            <button
              className="icon"
              onClick={() => voice.setMuted(!voice.muted)}
              aria-label={voice.muted ? 'Unmute cat' : 'Mute cat'}
              title={voice.muted ? 'Unmute cat' : 'Mute cat'}
            >
              {voice.muted ? '🔇' : '🔊'}
            </button>
          )}
        </div>
      </header>

      {bubble && (
        <div className="bubble" key={bubble}>
          {bubble}
        </div>
      )}

      <CoinPop pop={coinPop} />

      <Wardrobe ref={wardrobeRef} open={wardrobeOpen} onClose={closeSheet} look={catLook} onChange={setCatLook} />
      {auth.enabled && (
        <AccountPanel
          ref={accountRef}
          open={sheet === 'account'}
          onClose={closeSheet}
          auth={auth}
          profile={profile}
          settings={gameRules}
          streak={streak}
          todayMinutes={todayMinutes}
          onRename={(display_name) => updateProfile({ display_name })}
        />
      )}

      <main className="panel" ref={panelRef}>
        <div className="phase">{timer.phase === 'study' ? 'Study' : 'Break'}</div>
        <div className="time">{formatTime(timer.remainingMs)}</div>
        {timer.phase === 'break' && <BreakPanel onAction={doBreakAction} busy={catBusy} />}
        <div className="controls">
          {timer.running ? (
            <button onClick={pause}>Pause</button>
          ) : (
            <button className="primary" onClick={start}>Start</button>
          )}
          <button onClick={timer.reset}>Reset</button>
          <button onClick={timer.skip}>{timer.phase === 'study' ? 'Skip to break' : 'End break'}</button>
        </div>
        <Settings {...settings} onChange={setSettings} disabled={timer.running} />
        {auth.enabled && auth.ready && !auth.user && (
          <p className="login-note">
            <button onClick={() => setSheet('account')}>Log in</button> to save progress and earn coins.
          </p>
        )}
      </main>
    </div>
  )
}
