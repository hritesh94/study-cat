import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AccountPanel } from './components/AccountPanel'
import { ChatPanel } from './ai/ChatPanel'
import { useChat } from './ai/useChat'
import { useGoal } from './ai/useGoal'
import { BreakPanel } from './components/BreakPanel'
import { CoinIcon } from './components/CoinIcon'
import { CoinPop } from './components/CoinPop'
import { ForgiveCard } from './components/ForgiveCard'
import { GameCanvas } from './game/GameCanvas'
import { lineById, pickLine } from './game/catLines'
import { PrefsPanel } from './components/PrefsPanel'
import { SessionSummary } from './components/SessionSummary'
import { StreakCalendar } from './components/StreakCalendar'
import { SubjectPicker } from './components/SubjectPicker'
import { Settings } from './components/Settings'
import { Wardrobe } from './components/Wardrobe'
import { streaksFrom } from './lib/calendar'
import { liveStreak, localDay } from './lib/supabase'
import { useAuth } from './hooks/useAuth'
import { useCatVoice } from './hooks/useCatVoice'
import { useDailyTotals } from './hooks/useDailyTotals'
import { LEAVE_GRACE_MS, useLeaveTracker } from './hooks/useLeaveTracker'
import { useLocalStorage } from './hooks/useLocalStorage'
import { useProfile } from './hooks/useProfile'
import { useStudySessions } from './hooks/useStudySessions'
import { useStudyStats } from './hooks/useStudyStats'
import { useSubjectTotals } from './hooks/useSubjectTotals'
import { useSubjects } from './hooks/useSubjects'
import { useWakeLock } from './hooks/useWakeLock'
import { formatTime, useTimer } from './hooks/useTimer'
import './App.css'

// What the cat says lives in src/game/catLines.js.
const BREAK_LINE = lineById('break.idle.01')

// What the cat says when you come back to the tab, by study mode.
// Medium: the first leaves are free, the last free one gets called out,
// after that every leave costs coins.
function leaveLine(mode, count, freeLeaves) {
  if (mode !== 'medium') return pickLine('leave', mode)
  return pickLine(count < freeLeaves ? 'leave' : count === freeLeaves ? 'callout' : 'penalty', 'medium')
}

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
  const { todayMinutes: localTodayMinutes, addStudyMs, byDay, bySubjectDay } = useStudyStats()
  const voice = useCatVoice()

  // ── Account (Supabase): optional; everything works logged out too ──
  const auth = useAuth()
  const { profile, settings: gameRules, update: updateProfile, merge: mergeProfile } = useProfile(auth.user)
  const streak = liveStreak(profile)

  // ── Your study goal (from the chat or the goal form) ──
  const goalApi = useGoal(profile?.id ?? null)

  // ── Study mode: easy | medium | toxic (on your profile when logged in) ──
  const [localMode, setLocalMode] = useLocalStorage('studycat:mode', 'easy')
  const studyMode = profile ? (profile.study_mode ?? 'easy') : localMode
  const setStudyMode = (mode) => {
    setLocalMode(mode)
    if (profile) updateProfile({ study_mode: mode })
  }

  // ── Subjects: what you're studying (picked when a session starts) ──
  const subjectsApi = useSubjects(profile?.id ?? null)
  const [subjectId, setSubjectId] = useState(null) // this session's subject
  const subject = subjectsApi.subjects.find((s) => s.id === subjectId) ?? null

  // ── Study history: the calendar, "Today: N min" and the streak ──
  // Logged in it all comes from the server (statsVersion bumps after each
  // session to fetch again); logged out, from this browser.
  const [statsVersion, setStatsVersion] = useState(0)
  const localStats = useMemo(
    () => ({ byDay, bySubjectDay, subjects: subjectsApi.subjects }),
    [byDay, bySubjectDay, subjectsApi.subjects],
  )
  const today = localDay()
  const serverToday = useDailyTotals({ userId: profile?.id ?? null, from: today, to: today, version: statsVersion })
  const todayMinutes = profile && serverToday.ready ? (serverToday.days[today]?.minutes ?? 0) : localTodayMinutes
  const streakMinutes = gameRules?.streak_min_minutes ?? 25
  const localStreaks = useMemo(
    () => streaksFrom(Object.fromEntries(Object.entries(byDay).map(([d, ms]) => [d, Math.floor(ms / 60000)])), streakMinutes),
    [byDay, streakMinutes],
  )

  // ── The room shows your progress (bookshelf, coin jar, plant) ──
  const subjectTotals = useSubjectTotals({ userId: profile?.id ?? null, version: statsVersion, local: localStats })
  const shownStreak = profile ? streak : localStreaks.current
  const shownBest = profile ? profile.best_streak : localStreaks.best
  // the streak that broke (the server keeps it until you study again)
  const lostStreak = profile ? profile.current_streak : localStreaks.last
  const todayCoins = serverToday.days[today]?.coins ?? 0
  const dailyCap = profile ? (gameRules?.daily_coin_cap ?? 300) : 0
  const roomProgress = useMemo(
    () => ({ subjects: subjectTotals, todayCoins, dailyCap, streak: shownStreak, broken: shownStreak === 0 && shownBest > 0, lostStreak }),
    [subjectTotals, todayCoins, dailyCap, shownStreak, shownBest, lostStreak],
  )

  const sessionMs = useRef(0) // study time in this session (for the summary card)
  const skipping = useRef(false)
  const timer = useTimer({
    studyMinutes: settings.studyMinutes,
    breakMinutes: settings.breakMinutes,
    onStudyTime: (ms) => {
      addStudyMs(ms, subjectId)
      sessionMs.current += ms
    },
    onPhaseChange: (next) => {
      if (next === 'break') {
        exitFullscreen()
        // skipping isn't finishing: no praise (and Toxic mode notices)
        if (!skipping.current) voice.say(pickLine('finish', studyMode))
        else if (studyMode === 'toxic') voice.say(pickLine('quit', 'toxic'))
      } else {
        voice.say(pickLine('break.end'))
      }
      skipping.current = false
    },
  })

  const focusing = timer.phase === 'study' && timer.running

  // ── Phones: keep the screen on while studying ──
  // Book mode = you're reading on paper, so the screen may go to sleep:
  // then the page being hidden doesn't count as leaving.
  const [bookMode, setBookMode] = useLocalStorage('studycat:bookMode', false)
  useWakeLock(focusing && !bookMode)
  const toggleBookMode = () => {
    const on = !bookMode
    setBookMode(on)
    if (on) voice.say(pickLine('book.on'))
  }

  // ── Leaving the tab during study ──
  // The cat looks sad while you're away (Toxic: turns its back on you), then
  // says something when you're back. Under 15 seconds away doesn't count.
  // The server turns the count into coins.
  const [away, setAway] = useState(null) // null | 'sad' | 'sulk'
  const cheerUp = useRef(null)
  const [forgiveCard, setForgiveCard] = useState(null) // "It was just the screen
  const leaves = useLeaveTracker({
    active: focusing,
    bookMode,
    onLeave: ({ book }) => {
      clearTimeout(cheerUp.current)
      setAway(book ? null : studyMode === 'toxic' ? 'sulk' : 'sad')
    },
    onReturn: ({ count, counted, book, awayMs }) => {
      clearTimeout(cheerUp.current)
      if (book) {
        if (awayMs >= LEAVE_GRACE_MS) voice.say(pickLine('book.back'))
        return
      }
      if (!counted) return setAway(null) // just a quick look away: all forgiven
      voice.say(leaveLine(studyMode, count, gameRules?.medium_free_leaves ?? 2))
      cheerUp.current = setTimeout(() => setAway(null), studyMode === 'toxic' ? 6000 : 4000)
      setForgiveCard({ id: Date.now(), kind: 'ask' })
    },
  })
  useEffect(() => () => clearTimeout(cheerUp.current), [])
  useEffect(() => {
    if (!forgiveCard) return
    const hide = setTimeout(() => setForgiveCard(null), forgiveCard.kind === 'ask' ? 15000 : 10000)
    return () => clearTimeout(hide)
  }, [forgiveCard])
  // the screen went off, it wasn't you: the leave is taken back (no penalty)
  const forgiveLeave = () => {
    if (!leaves.forgive()) return setForgiveCard(null)
    clearTimeout(cheerUp.current)
    setAway(null)
    voice.say(pickLine('forgive', studyMode))
    const phone = window.matchMedia?.('(pointer: coarse)').matches
    setForgiveCard(phone && !bookMode ? { id: Date.now(), kind: 'tip' } : null)
  }

  // ── The card after a study session ──
  const [summary, setSummary] = useState(null)
  useEffect(() => {
    if (!summary) return
    const hide = setTimeout(() => setSummary(null), 9000)
    return () => clearTimeout(hide)
  }, [summary])

  // The listeners below are set up once, so they read fresh values from this ref.
  const latest = useRef({})
  useEffect(() => {
    latest.current = {
      say: voice.say,
      lineShowing: !!voice.line,
      // logged out there's no server result, so the summary comes from here
      onFocusEnd: () => {
        const minutes = Math.floor(sessionMs.current / 60000)
        const count = leaves.current()
        if (minutes > 0 || count > 0) setSummary({ id: Date.now(), minutes, leaves: count, penalty: 0 })
      },
    }
  })
  const wasFocusing = useRef(false)
  useEffect(() => {
    if (wasFocusing.current && !focusing && !profile) latest.current.onFocusEnd()
    wasFocusing.current = focusing
  }, [focusing, profile])

  // ── The cat (a Phaser game) ──
  // React decides WHAT the cat should be doing; the cat's brain decides HOW
  // to get there (walking, sitting down, turning around…).
  const game = useRef(null)
  const panelRef = useRef(null)
  const [catBusy, setCatBusy] = useState(true)

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
  const [sheet, setSheet] = useState(null) // null | 'wardrobe' | 'account' | 'prefs' | 'subject' | 'calendar' | 'chat'
  const wardrobeRef = useRef(null)
  const accountRef = useRef(null)
  const prefsRef = useRef(null)
  const subjectRef = useRef(null)
  const calendarRef = useRef(null)
  const chatRef = useRef(null)
  const chatButton = useRef(null)
  const calendarOpener = useRef(null) // the 🔥 or the Today pill, whichever opened it
  const myCatButton = useRef(null)
  const accountButton = useRef(null)
  const prefsButton = useRef(null)
  const openSheet = useRef(null)
  useEffect(() => {
    openSheet.current = sheet
  })
  const closeSheet = useCallback(() => {
    // keyboard users land back on the button they came from
    const from =
      { account: accountButton, prefs: prefsButton, subject: startButton, calendar: calendarOpener, chat: chatButton }[openSheet.current] ?? myCatButton
    setSheet(null)
    from.current?.focus()
  }, [])
  const toggleSheet = (name) => setSheet((open) => (open === name ? null : name))
  const openCalendar = (e) => {
    calendarOpener.current = e.currentTarget
    toggleSheet('calendar')
  }
  const wardrobeOpen = sheet === 'wardrobe'
  // what the game must keep the cat above
  const coverRefs = useMemo(() => [panelRef, wardrobeRef, accountRef, prefsRef, subjectRef, calendarRef, chatRef], [])

  // ── Chat with the cat (the AI, logged in only) ──
  const chat = useChat({ userId: profile?.id ?? null, open: sheet === 'chat' })
  const situation = focusing ? 'studying' : timer.phase === 'break' ? (summary ? 'after_session' : 'break') : 'idle'
  const onChatAction = async (action, payload) => {
    if (action === 'login') return setSheet('account')
    if (action === 'confirm-goal') return goalApi.saveGoal(payload)
    if (action === 'edit-goal') return chat.say('Sure! Tell me what to change.')
  }

  // ── Study sessions on the server → coins + streak ──
  const [coinPop, setCoinPop] = useState(null)
  const [coinBump, setCoinBump] = useState(false)
  useStudySessions({
    enabled: !!profile,
    focusing,
    plannedMinutes: () => Math.ceil(timer.remainingMs / 60000),
    // local (logged-out) subjects aren't on the server
    subjectId: () => (subjectId && !subjectId.startsWith('local-') ? subjectId : null),
    leaveCount: leaves.current,
    onResult: (r) => {
      mergeProfile({ coins: r.coins, current_streak: r.current_streak, best_streak: r.best_streak, last_study_day: r.last_study_day })
      setStatsVersion((v) => v + 1)
      if (r.counted_minutes > 0 || r.leave_count > 0) {
        setSummary({ id: Date.now(), minutes: r.counted_minutes, coins: r.coins_awarded, penalty: r.penalty_coins ?? 0, leaves: r.leave_count ?? 0 })
      }
      if (r.coins_awarded <= 0 && !r.capped) return
      setCoinPop({ id: Date.now(), coins: r.coins_awarded })
      setCoinBump(true)
      game.current?.celebrate()
      voice.say(pickLine(r.coins_awarded > 0 ? 'coins.earned' : 'coins.cap'))
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
  const timerGoal = !timer.running ? 'wander' : timer.phase === 'study' ? (away ?? 'study') : 'break'
  const catGoal = wardrobeOpen ? 'showOff' : timerGoal
  const mood = focusing ? 'focus' : timer.phase === 'break' ? 'break' : 'idle'

  // ── Break reactions: Play / Feed / Bathe ──
  const doBreakAction = (action) => {
    voice.say(pickLine(`react.${action.animation}`))
    game.current?.command(action.animation)
  }
  const bubble = voice.line ?? (timer.phase === 'break' ? { ...BREAK_LINE, shown: BREAK_LINE.text.length } : null)

  // The first tap anywhere: the cat says hello (sound needs a tap first).
  const greeted = useRef(false)
  useEffect(() => {
    const greet = () => {
      if (greeted.current) return
      greeted.current = true
      // after the tap's own reaction (e.g. Start says its line first)
      setTimeout(() => !latest.current.lineShowing && latest.current.say(pickLine('greet'), { meow: true }), 250)
    }
    window.addEventListener('pointerdown', greet, { once: true })
    return () => window.removeEventListener('pointerdown', greet)
  }, [])

  // Start on a fresh study session asks for the subject first; resuming
  // after Pause (or starting a break) goes straight on.
  const startButton = useRef(null)
  const start = () => {
    const fresh = timer.phase === 'study' && timer.remainingMs === settings.studyMinutes * 60000
    if (fresh) setSheet('subject')
    else startNow()
  }
  const startWith = (id) => {
    setSheet(null)
    setSubjectId(id)
    subjectsApi.remember(id)
    startNow()
  }
  const startNow = () => {
    if (timer.phase === 'study') {
      enterFullscreen()
      // a new study session: nothing counted yet
      leaves.reset()
      sessionMs.current = 0
      clearTimeout(cheerUp.current)
      setAway(null)
      setSummary(null)
      setForgiveCard(null)
      voice.say(pickLine('start', studyMode))
    }
    timer.start()
  }
  // Toxic mode has opinions about stopping early
  const quitLine = () => focusing && studyMode === 'toxic' && voice.say(pickLine('quit', 'toxic'))
  const pause = () => {
    exitFullscreen()
    quitLine()
    timer.pause()
  }
  const reset = () => {
    quitLine()
    timer.reset()
  }
  const skip = () => {
    skipping.current = timer.phase === 'study'
    timer.skip()
  }

  return (
    <div className={`app ${focusing ? 'focus' : ''} ${timer.phase}${sheet ? ' sheet-open' : ''}`}>
      <GameCanvas
        ref={game}
        goal={catGoal}
        mood={mood}
        look={catLook}
        progress={roomProgress}
        onLookChange={setCatLook}
        coverRefs={coverRefs}
        onBusy={setCatBusy}
        onMeow={() => voice.say(pickLine('meow'), { meow: true })}
        // tapping the cat (logged in, not while studying) opens the chat, after its meow
        onCatTap={() => profile && !focusing && !openSheet.current && setTimeout(() => setSheet('chat'), 700)}
      />

      <header className={`topbar${profile ? ' signed-in' : ''}`}>
        <h1>Study Cat</h1>
        <div className="topbar-right">
          {profile && (
            <>
              <span className={`stat coins${coinBump ? ' bump' : ''}`} title="Coins" aria-label={`${profile.coins} coins`}>
                <CoinIcon /> {profile.coins}
              </span>
              <button
                className="stat streak"
                onClick={openCalendar}
                aria-expanded={sheet === 'calendar'}
                title={`Study streak (best: ${profile.best_streak}). Open the calendar`}
                aria-label={`${streak} day streak. Open the study calendar`}
              >
                <span aria-hidden="true">🔥</span> {streak}
              </button>
            </>
          )}
          <button
            ref={chatButton}
            className="icon chat-button"
            onClick={() => toggleSheet('chat')}
            aria-expanded={sheet === 'chat'}
            aria-label="Chat with the cat"
            title="Chat with the cat"
          >
            💬
          </button>
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
          <button className="today" onClick={openCalendar} aria-expanded={sheet === 'calendar'} title="Studied today. Open the calendar">
            <span className="today-label">Today: </span>
            {todayMinutes} min
          </button>
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
              className="icon mute"
              onClick={() => voice.setMuted(!voice.muted)}
              aria-label={voice.muted ? 'Unmute cat' : 'Mute cat'}
              title={voice.muted ? 'Unmute cat' : 'Mute cat'}
            >
              {voice.muted ? '🔇' : '🔊'}
            </button>
          )}
          <button
            ref={prefsButton}
            className="icon"
            onClick={() => toggleSheet('prefs')}
            aria-expanded={sheet === 'prefs'}
            aria-label="Settings"
            title="Settings"
          >
            ⚙️
          </button>
        </div>
      </header>

      {bubble && (
        // the whole line is laid out at once (so the bubble doesn't grow
        // while typing); the not-yet-typed part is just invisible
        <div className="bubble" key={bubble.turn ?? bubble.id} role="status">
          <span className="sr-only">{bubble.text}</span>
          <span aria-hidden="true">
            {bubble.text.slice(0, bubble.shown)}
            <span className="untyped">{bubble.text.slice(bubble.shown)}</span>
          </span>
        </div>
      )}

      <CoinPop pop={coinPop} />
      <SessionSummary summary={summary} onClose={() => setSummary(null)} />
      <ForgiveCard
        card={focusing ? forgiveCard : null}
        onForgive={forgiveLeave}
        onBookMode={() => {
          setForgiveCard(null)
          if (!bookMode) toggleBookMode()
        }}
        onClose={() => setForgiveCard(null)}
      />
      <StreakCalendar
        ref={calendarRef}
        open={sheet === 'calendar'}
        onClose={closeSheet}
        userId={profile?.id ?? null}
        local={localStats}
        streak={shownStreak}
        bestStreak={shownBest}
        streakMinutes={streakMinutes}
        version={statsVersion}
      />
      <SubjectPicker
        ref={subjectRef}
        open={sheet === 'subject'}
        onClose={closeSheet}
        subjects={subjectsApi.subjects}
        preselected={subjectsApi.preselected}
        onAdd={subjectsApi.add}
        onStart={startWith}
      />

      <PrefsPanel
        ref={prefsRef}
        open={sheet === 'prefs'}
        onClose={closeSheet}
        voice={voice}
        mode={studyMode}
        onModeChange={setStudyMode}
        modeLocked={focusing}
      />
      <ChatPanel
        ref={chatRef}
        open={sheet === 'chat'}
        onClose={closeSheet}
        loggedIn={!!profile}
        chat={chat}
        goal={goalApi.goal}
        situation={situation}
        onAction={onChatAction}
      />
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
        <div className="phase-row">
          <div className="phase">{timer.phase === 'study' ? 'Study' : 'Break'}</div>
          {timer.phase === 'study' && subject && (timer.running || timer.remainingMs < settings.studyMinutes * 60000) && (
            <div className="phase-subject" style={{ '--subject': subject.color }}>
              <span className="subject-dot" aria-hidden="true" />
              {subject.name}
            </div>
          )}
        </div>
        <div className="time">{formatTime(timer.remainingMs)}</div>
        {timer.phase === 'break' && <BreakPanel onAction={doBreakAction} busy={catBusy} />}
        <div className="controls">
          {timer.running ? (
            <button onClick={pause}>Pause</button>
          ) : (
            <button className="primary" onClick={start} ref={startButton}>
              Start
            </button>
          )}
          <button onClick={reset}>Reset</button>
          <button onClick={skip}>{timer.phase === 'study' ? 'Skip to break' : 'End break'}</button>
        </div>
        <Settings {...settings} onChange={setSettings} disabled={timer.running} />
        {/* phones only (see App.css) */}
        <button className={`book-toggle${bookMode ? ' on' : ''}`} onClick={toggleBookMode} aria-pressed={bookMode}>
          <span aria-hidden="true">📖</span> Book mode: {bookMode ? 'on' : 'off'}
        </button>
        {auth.enabled && auth.ready && !auth.user && (
          <p className="login-note">
            <button onClick={() => setSheet('account')}>Log in</button> to save progress and earn coins.
          </p>
        )}
      </main>
    </div>
  )
}
