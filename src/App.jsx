import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AccountPanel } from './components/AccountPanel'
import { ChatPanel } from './ai/ChatPanel'
import { GoalForm } from './ai/GoalForm'
import { GoalRing } from './ai/GoalRing'
import { QuizBubble } from './ai/QuizBubble'
import { RoadmapPanel } from './ai/RoadmapPanel'
import { useQuiz } from './ai/useQuiz'
import { WeeklyReport } from './ai/WeeklyReport'
import { lastWeekStart, useWeeklyReport } from './ai/useWeeklyReport'
import { buildSchedule, dayTarget } from './ai/schedule'
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
import { SUBJECT_COLORS, useSubjects } from './hooks/useSubjects'
import { useWakeLock } from './hooks/useWakeLock'
import { formatTime, useTimer } from './hooks/useTimer'
import './App.css'

// What the cat says lives in src/game/catLines.js.
const BREAK_LINE = lineById('break.idle.01')

// What the cat says when you come back after leaving the tab. On Normal
// strictness the first leaves are free, the last free one gets called out,
// and after that every leave costs coins: a Sweet cat says so.
function leaveSituation(personality, mode, count, freeLeaves) {
  if (mode !== 'medium' || personality !== 'sweet') return 'leave'
  return count < freeLeaves ? 'leave' : count === freeLeaves ? 'callout' : 'penalty'
}

// streak days worth a celebration (and then every 50)
const MILESTONES = new Set([3, 5, 7, 10, 14, 21, 30, 45, 60, 75, 100])
const isMilestone = (n) => MILESTONES.has(n) || (n > 100 && n % 50 === 0)

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

  // ── How the cat talks: personality, language, spicy (on your profile when logged in) ──
  const [localStyle, setLocalStyle] = useLocalStorage('studycat:catStyle', { personality: 'sweet', language: 'en', spicy: false })
  const catStyle = profile ? { personality: profile.personality ?? 'sweet', language: profile.language ?? 'en', spicy: !!profile.spicy } : localStyle
  const setCatStyle = (fields) => {
    setLocalStyle({ ...catStyle, ...fields })
    if (profile) updateProfile(fields)
  }
  // a line for a situation, in this cat's voice (see src/game/catLines.js)
  const line = (situation, extra) => pickLine(situation, { ...catStyle, strict: studyMode === 'toxic', ...extra })

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
        // skipping isn't finishing: no praise
        voice.say(line(skipping.current ? 'quit_early' : 'finish_full'))
        // and a few seconds later, the break itself
        clearTimeout(breakHello.current)
        breakHello.current = setTimeout(() => !latest.current.lineShowing && latest.current.say(latest.current.line('break_start')), 7000)
      } else {
        clearTimeout(breakHello.current)
        voice.say(line('break.end'))
      }
      skipping.current = false
    },
  })

  const focusing = timer.phase === 'study' && timer.running
  const breakHello = useRef(null)
  useEffect(() => () => clearTimeout(breakHello.current), [])


  // ── Phones: keep the screen on while studying ──
  // Book mode = you're reading on paper, so the screen may go to sleep:
  // then the page being hidden doesn't count as leaving.
  const [bookMode, setBookMode] = useLocalStorage('studycat:bookMode', false)
  useWakeLock(focusing && !bookMode)
  const toggleBookMode = () => {
    const on = !bookMode
    setBookMode(on)
    if (on) voice.say(line('book.on'))
  }

  // ── Leaving the tab during study ──
  // The cat looks sad while you're away (Strict: turns its back on you),
  // tells you off when you're back, and welcomes you back a moment later.
  // Under 15 seconds away doesn't count.
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
        if (awayMs >= LEAVE_GRACE_MS) voice.say(line('book.back'))
        return
      }
      if (!counted) return setAway(null) // just a quick look away: all forgiven
      voice.say(line(leaveSituation(catStyle.personality, studyMode, count, gameRules?.medium_free_leaves ?? 2)))
      cheerUp.current = setTimeout(
        () => {
          setAway(null)
          latest.current.say(latest.current.line('come_back'))
        },
        studyMode === 'toxic' ? 6000 : 4500,
      )
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
    voice.say(line('forgive'))
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
      line,
      lineShowing: !!voice.line,
      streakBroken: roomProgress.broken,
      // logged out there's no server result, so the summary comes from here
      onFocusEnd: () => {
        const minutes = Math.floor(sessionMs.current / 60000)
        const count = leaves.current()
        if (minutes > 0 || count > 0) setSummary({ id: Date.now(), minutes, leaves: count, penalty: 0 })
      },
    }
  })
  // Now and then during a long session (every 20-30 minutes), a little word.
  useEffect(() => {
    if (!focusing) return
    let timeout
    const next = () => {
      timeout = setTimeout(
        () => {
          if (!latest.current.lineShowing) latest.current.say(latest.current.line('mid_session'))
          next()
        },
        (20 + Math.random() * 10) * 60000,
      )
    }
    next()
    return () => clearTimeout(timeout)
  }, [focusing])
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
  const [sheet, setSheet] = useState(null) // null | 'wardrobe' | 'account' | 'prefs' | 'subject' | 'calendar' | 'chat' | 'goal' | 'roadmap' | 'report'
  const wardrobeRef = useRef(null)
  const accountRef = useRef(null)
  const prefsRef = useRef(null)
  const subjectRef = useRef(null)
  const calendarRef = useRef(null)
  const chatRef = useRef(null)
  const chatButton = useRef(null)
  const goalRef = useRef(null)
  const roadmapRef = useRef(null)
  const ringButton = useRef(null)
  const reportRef = useRef(null)
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
      { account: accountButton, prefs: prefsButton, subject: startButton, calendar: calendarOpener, chat: chatButton, roadmap: ringButton, goal: ringButton, report: calendarOpener }[openSheet.current] ?? myCatButton
    setSheet(null)
    from.current?.focus()
  }, [setSheet])
  const toggleSheet = (name) => setSheet((open) => (open === name ? null : name))
  const openCalendar = (e) => {
    calendarOpener.current = e.currentTarget
    toggleSheet('calendar')
  }
  const wardrobeOpen = sheet === 'wardrobe'
  // what the game must keep the cat above
  const coverRefs = useMemo(() => [panelRef, wardrobeRef, accountRef, prefsRef, subjectRef, calendarRef, chatRef, goalRef, roadmapRef, reportRef], [])

  // ── Chat with the cat (the AI, logged in only) ──
  const chat = useChat({ userId: profile?.id ?? null, open: sheet === 'chat' })
  const situation = focusing ? 'studying' : timer.phase === 'break' ? (summary ? 'after_session' : 'break') : 'idle'
  const onChatAction = async (action, payload) => {
    if (action === 'login') return setSheet('account')
    if (action === 'confirm-goal') return goalApi.saveGoal(payload)
    if (action === 'edit-goal') return openGoalForm(payload)
    if (action === 'goal') return openGoalForm(null)
    if (action === 'quiz') {
      setSheet(null)
      return offerQuiz()
    }
    if (action === 'roadmap') {
      if (!goalApi.goal) return openGoalForm(null)
      setSheet('roadmap')
      if (!goalApi.roadmap && !goalApi.building) goalApi.buildRoadmap()
    }
  }

  // ── Goal form and roadmap ──
  const [goalFormStart, setGoalFormStart] = useState(null) // the goal to edit, or one from the chat
  const openGoalForm = (start) => {
    setGoalFormStart(start)
    setSheet('goal')
  }
  const saveGoalForm = async (fields, { build, syllabusText, image }) => {
    const current = goalApi.goal
    let goal
    if (goalFormStart?.id && current?.id === goalFormStart.id && fields.kind === current.kind) {
      // same goal, new hours / deadline / levels: only the schedule re-runs
      const { kind: _kind, ...changes } = fields
      await goalApi.updateGoal(changes)
      goal = { ...current, ...changes }
    } else goal = await goalApi.saveGoal(fields)
    setSheet('roadmap')
    if (build) goalApi.buildRoadmap({ syllabusText, image }, goal)
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
      const streakUp = r.current_streak > (profile?.current_streak ?? 0) && isMilestone(r.current_streak)
      mergeProfile({ coins: r.coins, current_streak: r.current_streak, best_streak: r.best_streak, last_study_day: r.last_study_day })
      setStatsVersion((v) => v + 1)
      if (r.counted_minutes > 0 || r.leave_count > 0) {
        setSummary({ id: Date.now(), minutes: r.counted_minutes, coins: r.coins_awarded, penalty: r.penalty_coins ?? 0, leaves: r.leave_count ?? 0 })
      }
      if (streakUp) {
        game.current?.celebrate()
        voice.say(line('streak_milestone', { n: r.current_streak }))
      }
      if (r.coins_awarded <= 0 && !r.capped) return
      setCoinPop({ id: Date.now(), coins: r.coins_awarded })
      setCoinBump(true)
      if (streakUp) return
      game.current?.celebrate()
      voice.say(line(r.coins_awarded > 0 ? 'coins.earned' : 'coin_cap'))
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
  // ── Today's goal (the ring) and the +15 coins when it's reached ──
  const studyGoal = goalApi.goal
  const studyPlan = goalApi.roadmap?.plan
  const goalTarget = profile && studyGoal && today < studyGoal.deadline ? dayTarget(studyGoal, today, gameRules) : null
  // (cheap: one pass over the days left; the React compiler memoizes it)
  const schedule = studyGoal ? buildSchedule({ goal: studyGoal, plan: studyPlan, today, rules: gameRules }) : null
  const claimedDay = useRef(null)
  const claimDailyGoal = goalApi.claimDailyGoal
  useEffect(() => {
    if (!goalTarget || !serverToday.ready || todayMinutes < goalTarget || claimedDay.current === today) return
    claimedDay.current = today
    claimDailyGoal().then((r) => {
      if (!r?.hit || r.already) return
      mergeProfile({ coins: r.coins })
      setStatsVersion((v) => v + 1) // the 👑 in the calendar
      if (r.coins_awarded > 0) {
        setCoinPop({ id: Date.now(), coins: r.coins_awarded })
        setCoinBump(true)
      }
      game.current?.celebrate()
      latest.current.say(latest.current.line('goal.done'))
    })
  }, [goalTarget, serverToday.ready, todayMinutes, today, claimDailyGoal, mergeProfile])

  // Starting the timer picks the subject of the next chapter on the roadmap
  // (the subject is made for you the first time).
  const nextChapter = schedule?.today?.chapters[0] ?? schedule?.next ?? null
  const subjectFor = (name) => subjectsApi.subjects.find((s) => s.name.toLowerCase() === name?.toLowerCase())
  const roadmapSubjects = useMemo(() => [...new Set((studyPlan?.chapters ?? []).map((c) => c.subject))], [studyPlan])
  const addingSubjects = useRef(false)
  const subjectList = subjectsApi.subjects
  const addSubject = subjectsApi.add
  useEffect(() => {
    if (!profile || addingSubjects.current) return
    const missing = roadmapSubjects.filter((name) => !subjectList.some((s) => s.name.toLowerCase() === name.toLowerCase()))
    if (!missing.length) return
    addingSubjects.current = true
    ;(async () => {
      for (const [i, name] of missing.entries()) await addSubject(name, SUBJECT_COLORS[(subjectList.length + i) % SUBJECT_COLORS.length]).catch(() => {})
      addingSubjects.current = false
    })()
  }, [profile, roadmapSubjects, subjectList, addSubject])

  // ── The break quiz: offered after a session, never forced ──
  const quizApi = useQuiz({
    onFinish: (r) => {
      mergeProfile({ coins: r.coins })
      setStatsVersion((v) => v + 1)
      if (r.coins_awarded > 0) {
        setCoinPop({ id: Date.now(), coins: r.coins_awarded })
        setCoinBump(true)
      }
      game.current?.celebrate()
      latest.current.say(latest.current.line('quiz.done'))
    },
  })
  // the topic: this session's roadmap chapter, else its subject
  const offerQuiz = () => {
    const chapters = goalApi.roadmap?.plan?.chapters ?? []
    const done = new Set(goalApi.goal?.done_chapters ?? [])
    const chapter = subject ? chapters.find((c) => !done.has(c.id) && c.subject.toLowerCase() === subject.name.toLowerCase()) : nextChapter
    setSummary(null)
    quizApi.offer(chapter?.name ?? subject?.name ?? '', chapter?.subject ?? subject?.name ?? null)
  }

  // ── Weekly report: on Mondays it opens by itself (once per week) ──
  const reportApi = useWeeklyReport()
  const loadReport = reportApi.load
  const reportTried = useRef(false)
  useEffect(() => {
    if (!profile || reportTried.current || new Date().getDay() !== 1) return
    reportTried.current = true
    const week = lastWeekStart()
    let seen = null
    try {
      seen = localStorage.getItem('studycat:reportSeen')
    } catch {
      // no storage: it may show again next time, that's fine
    }
    if (seen === week) return
    loadReport().then((report) => {
      if (!report) return
      try {
        localStorage.setItem('studycat:reportSeen', week)
      } catch {
        // see above
      }
      if (report.stats.minutes > 0 && !openSheet.current) setSheet('report')
    })
  }, [profile, loadReport])

  const timerGoal = !timer.running ? 'wander' : timer.phase === 'study' ? (away ?? 'study') : 'break'
  const catGoal = wardrobeOpen ? 'showOff' : timerGoal
  const mood = focusing ? 'focus' : timer.phase === 'break' ? 'break' : 'idle'

  // ── Break reactions: Play / Feed / Bathe ──
  const doBreakAction = (action) => {
    voice.say(line(`react.${action.animation}`))
    game.current?.command(action.animation)
  }
  const bubble = voice.line ?? (timer.phase === 'break' ? { ...BREAK_LINE, shown: BREAK_LINE.text.length } : null)

  // The first tap anywhere: the cat says hello (sound needs a tap first).
  // If your streak broke, once a day it says so instead (kindly, in its way).
  const greeted = useRef(false)
  useEffect(() => {
    const greet = () => {
      if (greeted.current) return
      greeted.current = true
      let situation = 'greet'
      if (latest.current.streakBroken) {
        try {
          if (localStorage.getItem('studycat:brokenSaid') !== localDay()) {
            localStorage.setItem('studycat:brokenSaid', localDay())
            situation = 'streak_broken'
          }
        } catch {
          // no storage: just say hello
        }
      }
      // after the tap's own reaction (e.g. Start says its line first)
      setTimeout(() => !latest.current.lineShowing && latest.current.say(latest.current.line(situation), { meow: true }), 250)
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
      voice.say(line('session_start'))
    }
    timer.start()
  }
  // stopping a study session early (Pause / Reset); Skip says it at the break
  const quitLine = () => focusing && voice.say(line('quit_early'))
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
        onMeow={() => voice.say(line('meow'), { meow: true })}
        // tapping the cat (logged in, not while studying) opens the chat, after its meow
        onCatTap={() => profile && !focusing && !openSheet.current && setTimeout(() => setSheet('chat'), 700)}
      />

      <header className={`topbar${profile ? ' signed-in' : ''}`}>
        <h1>Study Cat</h1>
        <div className="topbar-right">
          {goalTarget !== null && (
            <GoalRing
              ref={ringButton}
              minutes={todayMinutes}
              target={goalTarget}
              expanded={sheet === 'roadmap'}
              onClick={() => toggleSheet('roadmap')}
            />
          )}
          {profile && goalApi.loaded && !studyGoal && (
            <button
              ref={ringButton}
              className="set-goal"
              onClick={() => openGoalForm(null)}
              aria-expanded={sheet === 'goal'}
              aria-label="Set a goal"
              title="Set a goal"
            >
              <span aria-hidden="true">🎯</span>
              <span className="set-goal-label"> Set a goal</span>
            </button>
          )}
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

      {bubble && !quizApi.quiz && (
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
      <SessionSummary summary={summary} onClose={() => setSummary(null)} onQuiz={profile && !focusing ? offerQuiz : undefined} />
      <QuizBubble api={quizApi} />
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
        onReport={profile ? () => setSheet('report') : undefined}
      />
      <WeeklyReport ref={reportRef} open={sheet === 'report'} onClose={closeSheet} api={reportApi} />
      <SubjectPicker
        ref={subjectRef}
        open={sheet === 'subject'}
        onClose={closeSheet}
        subjects={subjectsApi.subjects}
        preselected={(nextChapter && subjectFor(nextChapter.subject)?.id) ?? subjectsApi.preselected}
        hint={nextChapter && `Next on your roadmap: ${nextChapter.name} (${nextChapter.subject})`}
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
        catStyle={catStyle}
        onStyleChange={setCatStyle}
        onSay={(sample) => voice.say(sample)}
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
      <GoalForm ref={goalRef} open={sheet === 'goal'} onClose={closeSheet} start={goalFormStart} onSave={saveGoalForm} />
      <RoadmapPanel
        ref={roadmapRef}
        open={sheet === 'roadmap'}
        onClose={closeSheet}
        goalApi={goalApi}
        rules={gameRules}
        today={today}
        onEditGoal={() => openGoalForm(goalApi.goal)}
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
