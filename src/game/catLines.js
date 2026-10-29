// ───────────────────────── Everything the cat says ─────────────────────────
// Lines are organised by PERSONALITY × LANGUAGE × SITUATION:
//
//   personality  sweet (default), diva, gang, savage: HOW the cat talks
//   language     en or hinglish
//   situation    greet, session_start, mid_session, leave, come_back, forgive,
//                finish_full, quit_early, break_start, streak_milestone,
//                coin_cap, streak_broken
//
// plus a few lines every personality shares (meows, the Play / Feed / Bathe
// reactions, coins, book mode…), at the end.
//
// Every line has a STABLE id. Never reuse or renumber an id: a voice file
// at public/voice/<id>.mp3 plays instead of the babble for that line. If
// you change a line's wording, give it a new id. The original lines keep
// their old ids (greet.01, start.easy.01…): they're the Sweet lines now.
//
//   SPICY   the line has swearing: it only plays when the user turned spicy on
//   STRICT  Sweet only: the firmer lines (the old "Toxic" ones), used when
//           strictness is Strict, so a Sweet cat on Chill or Normal stays gentle
//   {n}     the streak, in days (streak_milestone)
//
// `mood` shapes the babble: happy = higher and bouncy, sad = lower and
// slower, annoyed = short and sharp, neutral = in between.
//
// Roasts are about the BEHAVIOUR (leaving, scrolling, putting things off),
// never the person's worth, intelligence or looks. No slurs, ever.
// `npm run voice:lines` writes all of them to voice-lines.csv.
// ────────────────────────────────────────────────────────────────────────────

// The style guides for the AI (chat, quiz, report, roadmap) live with the
// Edge Functions, which can only read files under supabase/functions/.
export { AI_STYLES, DIVA_AI_STYLE, GANG_AI_STYLE, LANGUAGES, PERSONALITIES, SAVAGE_AI_STYLE, SITUATIONS, SWEET_AI_STYLE } from '../../supabase/functions/_shared/personalities.js'

const SPICY = 'spicy'
const STRICT = { strict: true }

// one group of lines with the same mood: [id, text] or [id, text, SPICY]
const say = (mood, rows, extra = {}) => ({ mood, rows, ...extra })

const lines = (personality, language, situations) =>
  Object.entries(situations).flatMap(([situation, groups]) =>
    groups.flatMap((g) =>
      g.rows.map(([id, text, flag]) => ({ id, personality, language, situation, mood: g.mood, text, spicy: flag === SPICY, strict: !!g.strict })),
    ),
  )

// ── Sweet: cozy and gentle (the default) ──
const SWEET = [
  ...lines('sweet', 'en', {
    greet: [
      say('happy', [
        ['greet.01', 'Oh, hi! Ready to study?'],
        ['greet.02', 'Mrrp! You came!'],
        ['greet.03', "Hello! I've been waiting for you."],
        ['greet.04', 'Hi hi! Nice to see you.'],
        ['greet.05', 'Welcome back, study buddy!'],
        ['greet.06', 'Meow! What are we learning today?'],
      ]),
      say('happy', [
        ['sweet.en.greet.01', 'Hi again! I saved you a warm spot by the lamp.'],
        ['sweet.en.greet.02', "There you are. Let's make today a cozy study day."],
      ]),
    ],
    session_start: [
      say('happy', [
        ['start.easy.01', "Let's focus! I'll keep you company."],
        ['start.easy.02', "Study time! I've got my reading glasses on."],
        ['start.easy.03', 'You got this. One page at a time.'],
        ['start.easy.04', 'Okay, books open. Paws ready!'],
        ['start.easy.05', "Let's do this together."],
        ['start.easy.06', "I'll be right here, reading with you."],
        ['start.easy.07', 'Deep breath... and go!'],
        ['start.easy.08', 'Focus mode: on. Purr mode: also on.'],
        ['start.easy.09', "Small steps still count. Let's start."],
        ['start.easy.10', 'I believe in you! Now, to the books.'],
        ['start.easy.11', 'Quiet time. Just you, me and the pages.'],
        ['start.easy.12', "Let's make this session a good one."],
        ['start.easy.13', "Ready when you are. Oh, you're ready? Yay!"],
        ['start.easy.14', 'Cozy lamp, warm tea, big focus time.'],
        ['start.easy.15', "Let's learn something cool today."],
        ['start.easy.16', 'Study buddies, assemble!'],
      ]),
      say('neutral', [
        ['start.medium.01', "Alright, let's focus. I'll be watching. Nicely."],
        ['start.medium.02', 'Study time. Phone face down, please.'],
        ['start.medium.03', "Let's go. Stay with me this time, okay?"],
        ['start.medium.04', 'Books open. Tabs closed. Deal?'],
        ['start.medium.05', "I'm counting on you. And I'm counting trips away."],
        ['start.medium.06', "Focus up! I'll keep score."],
        ['start.medium.07', "Let's do a proper session. No wandering off."],
        ['start.medium.08', "Ready? I'll be right here, keeping an eye out."],
        ['start.medium.09', 'Okay, game face on. Study face, I mean.'],
        ['start.medium.10', 'Two free trips away. After that, it costs coins.'],
        ['start.medium.11', "Let's see how focused we can be today."],
        ['start.medium.12', "Start strong, stay strong. I'll help."],
        ['start.medium.13', 'Session starting. Distractions, please wait outside.'],
        ['start.medium.14', "Eyes on the page. I'll be on the desk."],
        ['start.medium.15', "Let's earn those coins the honest way."],
        ['start.medium.16', "Here we go. Focus is a muscle. Let's train it."],
      ]),
      say('annoyed', [
        ['start.toxic.01', "Oh, you're actually studying? Let's see how long that lasts."],
        ['start.toxic.02', 'Fine. Impress me. I dare you.'],
        ['start.toxic.03', "Timer's running. So is my patience."],
        ['start.toxic.04', "Let's go. And no, your phone doesn't need you."],
        ['start.toxic.05', 'Your last session was shorter than a loading screen. Beat it.'],
        ['start.toxic.06', 'Study time. The group chat will survive without you.'],
        ['start.toxic.07', 'Maybe today you won\'t "just check one thing."'],
        ['start.toxic.08', 'Books open. Excuses closed.'],
        ['start.toxic.09', "I'm watching. Every. Single. Tab."],
        ['start.toxic.10', "Ready? Your notifications aren't invited."],
        ['start.toxic.11', 'Oh look, a study session. Rare sighting.'],
        ['start.toxic.12', 'Go on then. Show me what focus looks like.'],
        ['start.toxic.13', "If you leave, I'll know. Cats always know."],
        ['start.toxic.14', "The clock is ticking. Unlike your scroll wheel, it's productive."],
        ['start.toxic.15', 'Let\'s go before you take a "quick break" from nothing.'],
        ['start.toxic.16', "Fine, I'll supervise. Somebody has to."],
      ], STRICT),
    ],
    mid_session: [
      say('happy', [
        ['sweet.en.mid_session.01', "You're doing so well. Keep going, I'm right here."],
        ['sweet.en.mid_session.02', "Look at you, focused and calm. I'm proud of you."],
        ['sweet.en.mid_session.03', "Little by little, page by page. You've got this."],
        ['sweet.en.mid_session.04', "Halfway feels far, but you're already on your way."],
        ['sweet.en.mid_session.05', 'Deep breath. Shoulders down. Keep reading.'],
        ['sweet.en.mid_session.06', 'Every minute you study is a gift to future you.'],
        ['sweet.en.mid_session.07', "I'm purring quietly so I don't distract you."],
        ['sweet.en.mid_session.08', "Steady and gentle wins. You're doing great."],
      ]),
    ],
    leave: [
      say('sad', [
        ['leave.easy.01', 'Hey, where did you go? I missed you.'],
        ['leave.easy.02', "You're back! I saved your page for you."],
        ['leave.easy.03', 'It got a little lonely here...'],
        ['leave.easy.04', "Welcome back. Let's pick up where we left off."],
        ['leave.easy.05', 'I waited right here. Ready to keep going?'],
        ['leave.easy.06', 'Oh! There you are. The book missed you too.'],
        ['leave.easy.07', "No worries. Let's get back to it together."],
        ['leave.easy.08', 'I kept your seat warm.'],
        ['leave.easy.09', "Back so soon? I mean... yay, you're back!"],
        ['leave.easy.10', "It's okay. Focus wanders. Let's bring it home."],
        ['leave.easy.11', "I was a little sad, but I'm happy now."],
        ['leave.easy.12', "Let's try to stay together a bit longer, okay?"],
        ['leave.easy.13', 'Welcome back! One more paragraph?'],
        ['leave.easy.14', "I didn't move an inch. Well, maybe one paw."],
        ['leave.easy.15', "You came back! That's the important part."],
        ['leave.easy.16', "Phew, you're back. The lamp and I were worried."],
      ]),
      say('sad', [
        ['leave.medium.01', "You left for a bit. That's one."],
        ['leave.medium.02', "Welcome back. Let's not make that a habit."],
        ['leave.medium.03', 'Hey, that was a quick trip. Back to work?'],
        ['leave.medium.04', "One little escape. I'll let it slide."],
        ['leave.medium.05', 'I noticed. I always notice. Okay, keep going.'],
        ['leave.medium.06', "Back already? Good. Let's stay this time."],
        ['leave.medium.07', "That's one. You get one more free pass."],
        ['leave.medium.08', 'I kept reading while you were gone. Catch up!'],
        ['leave.medium.09', 'A small detour. Now, eyes on the page.'],
        ['leave.medium.10', "Alright, alright. One break doesn't ruin a session."],
        ['leave.medium.11', "I'm not mad. Just... keeping count."],
        ['leave.medium.12', "You're back! Let's see if we can go the distance."],
        ['leave.medium.13', "Okay, that's one trip away. Let's keep it at one."],
        ['leave.medium.14', 'I saw that. Back to the books, please.'],
        ['leave.medium.15', "Wandered off? It happens. Let's refocus."],
      ]),
      say('annoyed', [
        ['leave.toxic.01', "Oh, you're back. Did the group chat finally run out of drama?"],
        ['leave.toxic.02', 'Welcome back from your very important scrolling.'],
        ['leave.toxic.03', 'Wow, that "one quick check" took a while.'],
        ['leave.toxic.04', 'Your textbook called. It wants to know if you two are still together.'],
        ['leave.toxic.05', 'Back already? The memes will miss you.'],
        ['leave.toxic.06', "That's five coins. Hope the video was worth it."],
        ['leave.toxic.07', 'I turned my back. You turned yours on the book first.'],
        ['leave.toxic.08', 'Ah, the procrastination tour is back. How was the trip?'],
        ['leave.toxic.09', 'Your thumb got more exercise than your notes did.'],
        ['leave.toxic.10', 'Five coins, gone. Just like your focus.'],
        ['leave.toxic.11', 'Let me guess: you "just needed to reply to one message."'],
        ['leave.toxic.12', 'Your study session called. It says it felt abandoned.'],
        ['leave.toxic.13', 'Back from doom-scrolling? Shocking. Truly.'],
        ['leave.toxic.14', 'You left. The book stayed. Be more like the book.'],
        ['leave.toxic.15', 'Somewhere, a deadline just got a little closer. Hi.'],
        ['leave.toxic.16', 'That tab must have been fascinating. Five coins fascinating.'],
      ], STRICT),
    ],
    come_back: [
      say('happy', [
        ['sweet.en.come_back.01', "Welcome back! Let's pick up right where we left off."],
        ['sweet.en.come_back.02', "You're here again. That's what counts."],
        ['sweet.en.come_back.03', "I kept your place warm. Let's continue."],
        ['sweet.en.come_back.04', 'Back to it? Yay. One page at a time.'],
        ['sweet.en.come_back.05', 'Hello again! The book and I missed you.'],
        ['sweet.en.come_back.06', "No worries, we're back on track now."],
        ['sweet.en.come_back.07', "You came back. That's the important part."],
        ['sweet.en.come_back.08', "Let's settle in again, nice and slow."],
      ]),
    ],
    forgive: [
      say('happy', [
        ['forgive.easy.01', "Oh! The screen just went dark? That's okay then."],
        ['forgive.easy.02', 'Phew, you never left. Back to reading!'],
        ['forgive.easy.03', 'My mistake! I thought you went away.'],
        ['forgive.easy.04', "Oops, silly me. Let's keep going."],
        ['forgive.easy.05', 'Just the screen? Then nothing to be sad about.'],
        ['forgive.easy.06', 'Yay, you were here all along!'],
        ['forgive.easy.07', 'Okay! I take back my sad face.'],
        ['forgive.easy.08', 'Ah, it got dark and I panicked. Sorry!'],
        ['forgive.easy.09', 'Got it. Screen naps are allowed.'],
        ['forgive.easy.10', "All good! Let's read on."],
        ['forgive.easy.11', 'I believe you. Back to the books!'],
        ['forgive.easy.12', 'Oh, good. I missed you for nothing.'],
        ['forgive.easy.13', 'No harm done. Where were we?'],
        ['forgive.easy.14', 'Forgiven before you even asked.'],
        ['forgive.easy.15', 'The lights went out, not you. Got it!'],
      ]),
      say('neutral', [
        ['forgive.medium.01', "Just the screen? Fine, I won't count that one."],
        ['forgive.medium.02', 'Okay, that trip is off the list.'],
        ['forgive.medium.03', 'Struck from the record. Back to work.'],
        ['forgive.medium.04', 'Alright, the screen gets the blame this time.'],
        ['forgive.medium.05', 'Counter goes back down. Eyes on the page!'],
        ['forgive.medium.06', 'Fair enough. That one is forgiven.'],
        ['forgive.medium.07', 'Noted: screen off, not you off.'],
        ['forgive.medium.08', "I'll take that one back. Let's keep going."],
        ['forgive.medium.09', 'One trip un-counted. Use it wisely.'],
        ['forgive.medium.10', 'Okay, okay. Your coins are safe from that one.'],
        ['forgive.medium.11', 'Mistake on my side. Back to the books.'],
        ['forgive.medium.12', 'Deal. That leave never happened.'],
        ['forgive.medium.13', "Fine by me. Let's see the rest of the session."],
        ['forgive.medium.14', 'Erased. Now, focus!'],
        ['forgive.medium.15', 'Got it, the screen napped, you studied.'],
      ]),
      say('annoyed', [
        ['forgive.toxic.01', '"Just the screen," sure. Fine. I\'ll allow it.'],
        ['forgive.toxic.02', 'Hmm. I believe you. This time.'],
        ['forgive.toxic.03', 'Okay, five coins back. Do not make me regret it.'],
        ['forgive.toxic.04', 'The screen went off? How convenient. Fine.'],
        ['forgive.toxic.05', "I'll pretend that was the screen. Back to work."],
        ['forgive.toxic.06', 'Forgiven. Reluctantly. Very reluctantly.'],
        ['forgive.toxic.07', 'Fine, I turn back around. Happy?'],
        ['forgive.toxic.08', "That's the screen's fault, not yours. Allegedly."],
        ['forgive.toxic.09', "Okay, I'll stop sulking. For now."],
        ['forgive.toxic.10', 'I trust you. Mostly. Now study.'],
        ['forgive.toxic.11', 'Struck off. Your honesty is noted. And watched.'],
        ['forgive.toxic.12', 'Fine. But Instagram trips still count.'],
        ['forgive.toxic.13', "Alright, I'll let it go. Don't push your luck."],
        ['forgive.toxic.14', 'Screen nap accepted. Scroll naps are not.'],
        ['forgive.toxic.15', "One free pass. Don't spend it on memes."],
      ], STRICT),
    ],
    finish_full: [
      say('happy', [
        ['finish.easy.01', "You did it! Break time, let's play!"],
        ['finish.easy.02', "Session complete! I'm so proud of you."],
        ['finish.easy.03', 'Amazing work! Now, play with me?'],
        ['finish.easy.04', 'Done! Stretch those paws.'],
        ['finish.easy.05', 'That was a great session. Treat time?'],
        ['finish.easy.06', 'You finished! Brain: fed. Now feed me?'],
        ['finish.easy.07', "Wonderful! Let's take a cozy break."],
        ['finish.easy.08', 'Look at you go! Break time.'],
        ['finish.easy.09', 'Hooray! The book can rest now. So can you.'],
        ['finish.easy.10', "You focused so well. Let's celebrate!"],
        ['finish.easy.11', 'Session done! I knew you could do it.'],
        ['finish.easy.12', 'High paw! Time for a break.'],
        ['finish.easy.13', "That's a win. Let's play for a bit."],
        ['finish.easy.14', "Great job! I'll get the yarn."],
        ['finish.easy.15', 'All done! You earned this break.'],
      ]),
      say('happy', [
        ['finish.medium.01', 'Session done! Nice focus today.'],
        ['finish.medium.02', 'You made it! Break time, you earned it.'],
        ['finish.medium.03', "Done! That's how it's done."],
        ['finish.medium.04', "Great session! Let's take a breather."],
        ['finish.medium.05', "You stuck with it. I'm impressed."],
        ['finish.medium.06', 'Finished! Time to stretch and play.'],
        ['finish.medium.07', "That's a full session. Proud of you."],
        ['finish.medium.08', 'Well done! Now, about my snack...'],
        ['finish.medium.09', 'You did the thing! Break time.'],
        ['finish.medium.10', "Solid work. Let's play a little."],
        ['finish.medium.11', 'Session complete. Coins well earned.'],
        ['finish.medium.12', 'You finished strong. Break time!'],
        ['finish.medium.13', 'Nice! The book says thanks.'],
        ['finish.medium.14', "Done and dusted. Let's relax."],
        ['finish.medium.15', "That's focus. Let's celebrate with a break."],
      ]),
      say('neutral', [
        ['finish.toxic.01', "Fine. That was... actually decent. Don't let it go to your head."],
        ['finish.toxic.02', "You finished? Huh. I'll allow it."],
        ['finish.toxic.03', 'Okay, okay. Good job. Happy now?'],
        ['finish.toxic.04', "A full session. I'm almost impressed. Almost."],
        ['finish.toxic.05', 'Look at you, finishing things. Weird. Good weird.'],
        ['finish.toxic.06', "Not bad. I'll stop roasting you for about five minutes."],
        ['finish.toxic.07', 'You actually did it. Mark the calendar.'],
        ['finish.toxic.08', 'Fine, you win this one. Take your break.'],
        ['finish.toxic.09', "Okay, that was respectable. Don't make it weird."],
        ['finish.toxic.10', 'Full session done. The book is shocked. So am I.'],
        ['finish.toxic.11', "I'll admit it. That was solid focus."],
        ['finish.toxic.12', 'Great. Now I have nothing to complain about. Annoying.'],
        ['finish.toxic.13', 'You stayed the whole time? Who are you?'],
        ['finish.toxic.14', 'Alright, you earned your break. Grudgingly.'],
        ['finish.toxic.15', 'Well, well. Someone was productive today.'],
      ], STRICT),
    ],
    quit_early: [
      say('annoyed', [
        ['quit.toxic.01', 'Quitting already? The timer had so much hope.'],
        ['quit.toxic.02', 'Oh, a break from your break from studying?'],
        ['quit.toxic.03', "Pausing? The book didn't even get to the good part."],
        ['quit.toxic.04', "That's it? I've seen longer ad breaks."],
        ['quit.toxic.05', 'Stopping early. Bold strategy.'],
        ['quit.toxic.06', 'The timer is sad. Your progress bar is sadder.'],
        ['quit.toxic.07', "Pause again and I'm charging rent."],
        ['quit.toxic.08', 'Wow, that session was a speedrun. Of quitting.'],
        ['quit.toxic.09', "You stopped. Your deadline didn't."],
        ['quit.toxic.10', 'Leaving the session? The session misses you already.'],
        ['quit.toxic.11', 'Short session. Very short. Microscopic, really.'],
        ['quit.toxic.12', "I'll just tell the book you'll be back. Eventually."],
        ['quit.toxic.13', 'Taking a breather from... five minutes of work?'],
        ['quit.toxic.14', 'And the scroll wheel wins again.'],
        ['quit.toxic.15', 'Paused. The procrastination champion strikes again.'],
      ], STRICT),
      say('neutral', [
        ['sweet.en.quit_early.01', 'Stopping early is okay. Rest, and come back soon.'],
        ['sweet.en.quit_early.02', "That's alright. Some days are shorter. I'm still proud."],
        ['sweet.en.quit_early.03', 'A short session is still a session. Well done.'],
        ['sweet.en.quit_early.04', 'Taking a pause? Be kind to yourself.'],
        ['sweet.en.quit_early.05', "Okay! Let's try a little longer next time."],
        ['sweet.en.quit_early.06', "Even a few minutes counts. I'll be here."],
        ['sweet.en.quit_early.07', 'Rest if you need to. The book will wait.'],
        ['sweet.en.quit_early.08', "We'll finish it together later. No stress."],
      ]),
    ],
    break_start: [
      say('happy', [
        ['sweet.en.break_start.01', 'Break time! Stretch those paws.'],
        ['sweet.en.break_start.02', 'You earned this. Water, snack, and a little rest.'],
        ['sweet.en.break_start.03', "Let's rest our eyes for a bit."],
        ['sweet.en.break_start.04', 'Break! Want to look out the window with me?'],
        ['sweet.en.break_start.05', 'Time to wiggle around and breathe.'],
        ['sweet.en.break_start.06', 'Good work. Enjoy your break, you deserve it.'],
        ['sweet.en.break_start.07', 'A cozy little break. Back soon!'],
        ['sweet.en.break_start.08', 'Rest now. Your brain is tidying everything away.'],
      ]),
    ],
    streak_milestone: [
      say('happy', [
        ['sweet.en.streak_milestone.01', "{n} days in a row! I'm doing a happy little dance."],
        ['sweet.en.streak_milestone.02', "Wow, a {n}-day streak. You're so consistent."],
        ['sweet.en.streak_milestone.03', "{n} days of showing up. That's real dedication."],
        ['sweet.en.streak_milestone.04', "Day {n}! Look how far you've come."],
        ['sweet.en.streak_milestone.05', '{n} days! Your future self is smiling.'],
        ['sweet.en.streak_milestone.06', "A {n}-day streak. I'm the proudest cat ever."],
        ['sweet.en.streak_milestone.07', '{n} days in a row. Little steps, big journey.'],
        ['sweet.en.streak_milestone.08', "Streak: {n} days. Let's keep it cozy and going."],
      ]),
    ],
    coin_cap: [
      say('neutral', [
        ['coins.cap.01', "That's all the coins for today!"],
        ['coins.cap.02', 'The coin jar is full for today.'],
        ['coins.cap.03', 'No more coins today, but keep going if you want!'],
        ['coins.cap.04', 'Daily coins: complete. Nice!'],
        ['coins.cap.05', 'The coin jar is happy. More tomorrow!'],
        ['coins.cap.06', "That's today's limit. You did great."],
      ]),
      say('happy', [
        ['sweet.en.coin_cap.01', 'The coin jar is full today. You did wonderfully.'],
        ['sweet.en.coin_cap.02', "That's all the coins for today. Rest well, superstar."],
      ]),
    ],
    streak_broken: [
      say('sad', [
        ['sweet.en.streak_broken.01', "The streak reset, but you didn't. Let's start again."],
        ['sweet.en.streak_broken.02', "It's okay. Day one is a lovely place to begin."],
        ['sweet.en.streak_broken.03', "Streaks come back. So do you. Let's study a little."],
        ['sweet.en.streak_broken.04', "Missed a day? That's human. Today is a fresh start."],
        ['sweet.en.streak_broken.05', "No streak yet, but plenty of time. Let's go gently."],
        ['sweet.en.streak_broken.06', "Don't be sad. One session today and we're back."],
        ['sweet.en.streak_broken.07', 'Every big streak started with day one. Here is ours.'],
        ['sweet.en.streak_broken.08', "I'm not upset at all. Let's begin again together."],
      ]),
    ],
    callout: [
      say('annoyed', [
        ['callout.medium.01', "That's twice now. Next time costs coins."],
        ['callout.medium.02', "Two trips away. I'm officially counting."],
        ['callout.medium.03', "Hey. That's the second time. Coins are on the line now."],
        ['callout.medium.04', 'Twice! Your free passes are all used up.'],
        ['callout.medium.05', "Okay, I'm calling it out: two trips away. Stay put."],
        ['callout.medium.06', "Two strikes. The next one's going to sting a little."],
        ['callout.medium.07', "Second time. I'm putting my serious face on."],
        ['callout.medium.08', "That's two. From now on, every trip costs ten percent."],
        ['callout.medium.09', "You've used both free passes. Choose wisely."],
        ['callout.medium.10', "Hmm. Twice. I'm starting to think the phone is winning."],
        ['callout.medium.11', "Two times! Let's not go for three."],
        ['callout.medium.12', "I'm keeping score, and the score is two."],
        ['callout.medium.13', "Second escape. Coins don't like that."],
        ['callout.medium.14', 'Twice now. The book is starting to feel ignored.'],
        ['callout.medium.15', "That's two. Let's make the rest of this session count."],
      ]),
    ],
    penalty: [
      say('annoyed', [
        ['penalty.medium.01', "That one cost you ten percent of this session's coins."],
        ['penalty.medium.02', 'Another trip away. There go some coins.'],
        ['penalty.medium.03', 'Coins: down. Focus: please come back.'],
        ['penalty.medium.04', "That's a coin penalty. I warned you!"],
        ['penalty.medium.05', 'Again? Ten percent off. Not the fun kind of discount.'],
        ['penalty.medium.06', 'Every trip away now costs coins. Just saying.'],
        ['penalty.medium.07', 'Your coins packed a tiny suitcase and left too.'],
        ['penalty.medium.08', 'Another escape, another ten percent.'],
        ['penalty.medium.09', "I don't make the rules. Okay, I do. Ten percent gone."],
        ['penalty.medium.10', "Ouch. That's going to show on your coin count."],
        ['penalty.medium.11', 'The coin jar felt that one.'],
        ['penalty.medium.12', 'Leaving again? The coins noticed.'],
        ['penalty.medium.13', "That's another ten percent. Let's stop the leak."],
        ['penalty.medium.14', "Back again. Minus ten percent. Let's stay now, please."],
        ['penalty.medium.15', 'Penalty time! Stay focused and keep the rest.'],
      ]),
    ],
  }),
  ...lines('sweet', 'hinglish', {
    greet: [
      say('happy', [
        ['sweet.hinglish.greet.01', 'Arre, aa gaye! Chalo, aaj thoda saath mein padhte hain.'],
        ['sweet.hinglish.greet.02', 'Hello hello! Aaj ka din cozy aur productive banayenge.'],
        ['sweet.hinglish.greet.03', 'Tum aa gaye, bas yahi chahiye tha. Shuru karein?'],
        ['sweet.hinglish.greet.04', 'Welcome back! Chai le lo, phir kitaab khol lo.'],
        ['sweet.hinglish.greet.05', 'Hi! Aaj bhi saath mein padhenge, haina?'],
      ]),
    ],
    session_start: [
      say('happy', [
        ['sweet.hinglish.session_start.01', 'Chalo shuru karte hain. Main yahin baitha hoon.'],
        ['sweet.hinglish.session_start.02', 'Ek chapter at a time. Bilkul aaram se.'],
        ['sweet.hinglish.session_start.03', 'Phone ko side mein rakho, aur kitaab ko dil se lagao.'],
        ['sweet.hinglish.session_start.04', 'Timer on! Tum kar loge, mujhe pata hai.'],
        ['sweet.hinglish.session_start.05', 'Dheere dheere hi sahi, par aaj padhna hai.'],
      ]),
    ],
    mid_session: [
      say('happy', [
        ['sweet.hinglish.mid_session.01', 'Bahut badhiya chal raha hai. Aise hi chalte raho.'],
        ['sweet.hinglish.mid_session.02', 'Tumhe focus karte dekh ke main khush hoon.'],
        ['sweet.hinglish.mid_session.03', 'Thoda thoda karke sab ho jayega. Keep going.'],
        ['sweet.hinglish.mid_session.04', 'Saans lo, shoulders relax karo, aur padhte raho.'],
        ['sweet.hinglish.mid_session.05', 'Har minute future wale tum ke liye gift hai.'],
      ]),
    ],
    leave: [
      say('sad', [
        ['sweet.hinglish.leave.01', 'Arre, kahan chale gaye? Main wait kar raha tha.'],
        ['sweet.hinglish.leave.02', 'Kitaab akeli ho gayi thi. Wapas aa jao na.'],
        ['sweet.hinglish.leave.03', 'Koi baat nahi, bas jaldi wapas aana.'],
        ['sweet.hinglish.leave.04', 'Main thoda sad ho gaya tha. Chalo, phir se.'],
        ['sweet.hinglish.leave.05', 'Tumhare bina padhai adhoori lag rahi thi.'],
      ]),
    ],
    come_back: [
      say('happy', [
        ['sweet.hinglish.come_back.01', 'Welcome back! Wahin se shuru karte hain.'],
        ['sweet.hinglish.come_back.02', 'Aa gaye! Yahi important hai.'],
        ['sweet.hinglish.come_back.03', 'Maine tumhari jagah garam rakhi thi. Chalo.'],
        ['sweet.hinglish.come_back.04', 'Koi tension nahi, ab phir se track pe hain.'],
        ['sweet.hinglish.come_back.05', 'Wapas aa gaye, bahut accha. Ek page aur?'],
      ]),
    ],
    forgive: [
      say('happy', [
        ['sweet.hinglish.forgive.01', 'Oh, screen thi? Koi baat nahi, padhte raho.'],
        ['sweet.hinglish.forgive.02', 'Theek hai, maine maan liya. Chalo aage.'],
        ['sweet.hinglish.forgive.03', 'Screen ka kasoor tha, tumhara nahi. Continue!'],
        ['sweet.hinglish.forgive.04', 'Bilkul samajh gaya. Wapas kitaab pe.'],
        ['sweet.hinglish.forgive.05', 'Koi baat nahi! Main phir se khush hoon.'],
      ]),
    ],
    finish_full: [
      say('happy', [
        ['sweet.hinglish.finish_full.01', 'Poora session ho gaya! Bahut proud hoon tumpe.'],
        ['sweet.hinglish.finish_full.02', 'Shabaash! Aaj ka kaam bahut accha raha.'],
        ['sweet.hinglish.finish_full.03', 'Tumne kar dikhaya. Ab break enjoy karo.'],
        ['sweet.hinglish.finish_full.04', 'Full session done! Tum toh star ho.'],
        ['sweet.hinglish.finish_full.05', 'Wah, kitna accha focus tha aaj!'],
      ]),
    ],
    quit_early: [
      say('neutral', [
        ['sweet.hinglish.quit_early.01', 'Jaldi ruk gaye? Koi baat nahi, thoda aaram karo.'],
        ['sweet.hinglish.quit_early.02', 'Chhota session bhi session hai. Well done.'],
        ['sweet.hinglish.quit_early.03', 'Aaj itna hi sahi. Kal thoda aur karenge.'],
        ['sweet.hinglish.quit_early.04', 'Apne aap pe gussa mat karna. Main yahin hoon.'],
        ['sweet.hinglish.quit_early.05', 'Thoda break le lo, kitaab wait karegi.'],
      ]),
    ],
    break_start: [
      say('happy', [
        ['sweet.hinglish.break_start.01', 'Break time! Thoda stretch kar lo.'],
        ['sweet.hinglish.break_start.02', 'Paani piyo, snack khao, aaram karo.'],
        ['sweet.hinglish.break_start.03', 'Aankhon ko thoda rest do. Tumne kamaya hai.'],
        ['sweet.hinglish.break_start.04', 'Chalo, thodi der khidki se bahar dekhte hain.'],
        ['sweet.hinglish.break_start.05', 'Accha kaam kiya! Ab chhota sa break.'],
      ]),
    ],
    streak_milestone: [
      say('happy', [
        ['sweet.hinglish.streak_milestone.01', '{n} din lagatar! Main khushi se naach raha hoon.'],
        ['sweet.hinglish.streak_milestone.02', 'Wah, {n} din ki streak! Kitne consistent ho tum.'],
        ['sweet.hinglish.streak_milestone.03', 'Day {n}! Dekho kitna aage aa gaye.'],
        ['sweet.hinglish.streak_milestone.04', '{n} din se roz padh rahe ho. Bahut badhiya!'],
        ['sweet.hinglish.streak_milestone.05', '{n} din ki streak. Main sabse proud cat hoon.'],
      ]),
    ],
    coin_cap: [
      say('happy', [
        ['sweet.hinglish.coin_cap.01', 'Aaj ke saare coins mil gaye! Bahut badhiya.'],
        ['sweet.hinglish.coin_cap.02', 'Coin jar full ho gaya. Ab aaram se padho.'],
        ['sweet.hinglish.coin_cap.03', 'Aaj ke coins khatam, par seekhna abhi bhi free hai.'],
        ['sweet.hinglish.coin_cap.04', 'Itne coins! Aaj tumne kamaal kar diya.'],
        ['sweet.hinglish.coin_cap.05', 'Daily coins complete. Kal phir milenge.'],
      ]),
    ],
    streak_broken: [
      say('sad', [
        ['sweet.hinglish.streak_broken.01', 'Streak toot gayi, par tum nahi. Phir se shuru karein?'],
        ['sweet.hinglish.streak_broken.02', 'Koi baat nahi. Day one bhi accha din hai.'],
        ['sweet.hinglish.streak_broken.03', 'Ek din miss hua? Insaan ho. Aaj naya din hai.'],
        ['sweet.hinglish.streak_broken.04', 'Udaas mat ho. Aaj ek session, aur hum wapas.'],
        ['sweet.hinglish.streak_broken.05', 'Har badi streak day one se shuru hoti hai.'],
      ]),
    ],
  }),
]

// ── Diva: from diva-lines.js, every id exactly as it was ──
const DIVA = [
  ...lines('diva', 'en', {
    greet: [
      say('happy', [
        ['diva.en.greet.01', 'Hi gorgeous. The books missed you. Barely, but they did.'],
        ['diva.en.greet.02', "Main character has entered the room. Let's make today count."],
        ['diva.en.greet.03', 'Look who showed up. Iconic behavior already.'],
        ['diva.en.greet.04', 'Welcome back, diva. Your future self is watching. Give her a show.'],
        ['diva.en.greet.05', "Hair? Done. Snacks? Ready. Brain? Let's switch her on."],
        ['diva.en.greet.06', "The grind called. I told her you'd be right there."],
        ['diva.en.greet.07', "You showed up. That's already more than most people did today."],
        ['diva.en.greet.08', 'Okay superstar, what are we conquering today?'],
        ['diva.en.greet.09', 'Hey bitch, the syllabus is not going to read itself. Sit.', SPICY],
        ['diva.en.greet.10', "Welcome back, queen. Let's ruin some exam's whole damn career today.", SPICY],
      ]),
    ],
    session_start: [
      say('happy', [
        ['diva.en.session_start.01', "Phone down, crown on. We're locking in."],
        ['diva.en.session_start.02', "This is your villain origin story. The villain gets straight A's."],
        ['diva.en.session_start.03', 'Pure main character energy from here to the timer. Go.'],
        ['diva.en.session_start.04', 'Open the book like it owes you money.'],
        ['diva.en.session_start.05', 'Focus mode: on. Distractions: not invited.'],
        ['diva.en.session_start.06', "Hot girls finish their chapters. Let's go."],
        ['diva.en.session_start.07', 'The timer is running and so is your glow-up.'],
        ['diva.en.session_start.08', "You versus this chapter. My money's on you, queen."],
        ['diva.en.session_start.09', 'Lock the fuck in, diva. Pretty please.', SPICY],
        ['diva.en.session_start.10', 'Tomorrow has been carrying your ass for six months. Free her. Today we work.', SPICY],
      ]),
    ],
    mid_session: [
      say('happy', [
        ['diva.en.mid_session.01', "Look at you, actually studying. I'm emotional."],
        ['diva.en.mid_session.02', 'Every page is a little revenge on everyone who doubted you.'],
        ['diva.en.mid_session.03', 'Your focus right now? Expensive.'],
        ['diva.en.mid_session.04', 'Still going? Okay, academic weapon.'],
        ['diva.en.mid_session.05', 'Sip some water, queen. Hydrated brains slay harder.'],
        ['diva.en.mid_session.06', 'This is the part of the movie where the montage plays.'],
        ['diva.en.mid_session.07', 'Your future self just sent a thank-you note.'],
        ['diva.en.mid_session.08', 'Posture check, diva. Crowns slip when you slouch.'],
        ['diva.en.mid_session.09', "Damn, look at her go. Nobody's ready.", SPICY],
        ['diva.en.mid_session.10', "You're studying like your ex is watching. Hell yes.", SPICY],
      ]),
    ],
    leave: [
      say('annoyed', [
        ['diva.en.leave.01', 'Excuse me? We were in the middle of a moment.'],
        ['diva.en.leave.02', 'The screen time is giving unemployed princess. Come back.'],
        ['diva.en.leave.03', "Leaving mid-chapter? That's not very main character of you."],
        ['diva.en.leave.04', 'Your book is sitting here like it got left on read.'],
        ['diva.en.leave.05', 'Babe. The timer is still running. Just saying.'],
        ['diva.en.leave.06', "Whatever you're scrolling is not worth your grades."],
        ['diva.en.leave.07', 'This is not Pinterest. Come back and open the book.'],
        ['diva.en.leave.08', 'I did not get this cute for you to ghost me.'],
        ['diva.en.leave.09', 'Girl, where the hell did you go?', SPICY],
        ['diva.en.leave.10', 'Tomorrow has been carrying your ass for six months. Free her. Come back.', SPICY],
      ]),
    ],
    come_back: [
      say('neutral', [
        ['diva.en.come_back.01', "Oh, she's back. Let's pretend that never happened."],
        ['diva.en.come_back.02', "Welcome back. The book forgave you. I'm still deciding."],
        ['diva.en.come_back.03', 'Good. Crown back on. Continue.'],
        ['diva.en.come_back.04', "And we're back. The comeback is always greater than the setback."],
        ['diva.en.come_back.05', 'Glad you remembered who you are.'],
        ['diva.en.come_back.06', 'Okay, recovery arc. I love a recovery arc.'],
        ['diva.en.come_back.07', 'Back already? Iconic. Now stay.'],
        ['diva.en.come_back.08', 'Phone face down, please. Thank you.'],
        ['diva.en.come_back.09', 'About damn time. Sit.', SPICY],
        ['diva.en.come_back.10', "Oh hell yes, she's back. Lock in.", SPICY],
      ]),
    ],
    forgive: [
      say('happy', [
        ['diva.en.forgive.01', 'Oh, just the screen? My bad. Carry on, queen.'],
        ['diva.en.forgive.02', "Fine, I believe you. Thousands wouldn't."],
        ['diva.en.forgive.03', "Screen nap, not a scroll? Okay, you're forgiven."],
        ['diva.en.forgive.04', 'Apology accepted. Mine, to you. Continue.'],
        ['diva.en.forgive.05', 'Got it. The phone blinked, not you.'],
        ['diva.en.forgive.06', "Okay okay, no penalty. Don't make me regret it."],
        ['diva.en.forgive.07', 'Trusting you on this one, diva.'],
        ['diva.en.forgive.08', 'Noted. Back to slaying.'],
      ]),
    ],
    finish_full: [
      say('happy', [
        ['diva.en.finish_full.01', 'SHE DID IT. Somebody get this girl a trophy.'],
        ['diva.en.finish_full.02', 'Full session. No notes. Absolutely iconic.'],
        ['diva.en.finish_full.03', "That was a masterclass. I'm framing it."],
        ['diva.en.finish_full.04', 'Another one done. Your future self is screaming.'],
        ['diva.en.finish_full.05', "You didn't just study. You served."],
        ['diva.en.finish_full.06', 'Academic weapon status: confirmed.'],
        ['diva.en.finish_full.07', "Look at you keeping promises to yourself. That's real glamour."],
        ['diva.en.finish_full.08', 'Coins earned, chapter conquered, crown polished.'],
        ['diva.en.finish_full.09', 'Holy shit, you actually did it. So proud of you.', SPICY],
        ['diva.en.finish_full.10', "That chapter didn't stand a damn chance.", SPICY],
      ]),
    ],
    quit_early: [
      say('annoyed', [
        ['diva.en.quit_early.01', "Quitting already? That's not the girl I know."],
        ['diva.en.quit_early.02', 'We said a full session, not fifteen minutes. Who are we?'],
        ['diva.en.quit_early.03', 'Pausing? Fine. But the chapter is still waiting.'],
        ['diva.en.quit_early.04', 'And? Is motivation paying your bills? No? Then sit back down.'],
        ['diva.en.quit_early.05', "Leaving early is giving 'I'll start tomorrow'. We know how that ends."],
        ['diva.en.quit_early.06', 'One more page. Then decide. Deal?'],
        ['diva.en.quit_early.07', 'Divas finish what they start.'],
        ['diva.en.quit_early.08', "I'll pretend I didn't see that. Start again when you're ready."],
        ['diva.en.quit_early.09', 'Bitch, we were so close.', SPICY],
        ['diva.en.quit_early.10', 'Are you serious right now? Get back here, damn it.', SPICY],
      ]),
    ],
    break_start: [
      say('happy', [
        ['diva.en.break_start.01', 'Break time. Stretch like you just won an award.'],
        ['diva.en.break_start.02', 'You earned this. Hydrate, snack, be fabulous.'],
        ['diva.en.break_start.03', "Ten minutes off. Not ten hours. I'm watching."],
        ['diva.en.break_start.04', 'Rest is part of the glow-up. Enjoy it.'],
        ['diva.en.break_start.05', 'Go find some sunlight, queen. Come back shining.'],
        ['diva.en.break_start.06', 'Brain on spa mode. Back soon.'],
        ['diva.en.break_start.07', 'Break? Earned. Phone? Limited. Vibes? Immaculate.'],
        ['diva.en.break_start.08', 'Play with me while your brain cools down.'],
        ['diva.en.break_start.09', 'Damn, that was a good session. Go breathe.', SPICY],
      ]),
    ],
    streak_milestone: [
      say('happy', [
        ['diva.en.streak_milestone.01', "{n} days in a row. That's not luck, that's discipline."],
        ['diva.en.streak_milestone.02', '{n}-day streak. The consistency is giving CEO.'],
        ['diva.en.streak_milestone.03', 'Day {n}. Put it on a poster.'],
        ['diva.en.streak_milestone.04', '{n} days straight. Your old excuses are shaking.'],
        ['diva.en.streak_milestone.05', 'A {n}-day streak? Main character, season {n}.'],
        ['diva.en.streak_milestone.06', '{n} days. This is what built different looks like.'],
        ['diva.en.streak_milestone.07', '{n} days in a row?? Okay, bad bitch energy.', SPICY],
      ]),
    ],
    coin_cap: [
      say('happy', [
        ['diva.en.coin_cap.01', "Coin jar's full for today. Rich in coins, richer in knowledge."],
        ['diva.en.coin_cap.02', "Daily max reached. You're officially too successful."],
        ['diva.en.coin_cap.03', 'No more coins today, but the knowledge is still free.'],
        ['diva.en.coin_cap.04', "The jar is full. You're basically a small business now."],
        ['diva.en.coin_cap.05', 'Max coins. Iconic. Keep going for the brain, not the bank.'],
      ]),
    ],
    streak_broken: [
      say('sad', [
        ['diva.en.streak_broken.01', "The streak broke. The queen didn't. Start again today."],
        ['diva.en.streak_broken.02', 'Day one again? Every legend has a comeback era.'],
        ['diva.en.streak_broken.03', "We don't cry over streaks. We rebuild them."],
        ['diva.en.streak_broken.04', "New streak, same crown. Let's go."],
        ['diva.en.streak_broken.05', "Yesterday's gone. Today's session is still yours."],
        ['diva.en.streak_broken.06', 'Comeback era starts now.'],
      ]),
    ],
  }),
  ...lines('diva', 'hinglish', {
    greet: [
      say('happy', [
        ['diva.hinglish.greet.01', 'Aa gayi meri queen! Chalo, aaj kuch bada karte hain.'],
        ['diva.hinglish.greet.02', 'Hello diva! Books wait kar rahi thi, attitude ke saath.'],
        ['diva.hinglish.greet.03', 'Welcome back jaan. Aaj ka plan? Padhna aur slay karna.'],
        ['diva.hinglish.greet.04', 'Itna glow? Padhai se aur aayega. Baitho.'],
        ['diva.hinglish.greet.05', 'Aaj ka mood: topper energy. Chalo shuru.'],
        ['diva.hinglish.greet.06', 'Oye queen, syllabus khud nahi padhega. Baith ja, damn.', SPICY],
      ]),
    ],
    session_start: [
      say('happy', [
        ['diva.hinglish.session_start.01', 'Phone side mein, crown sar pe. Shuru karo.'],
        ['diva.hinglish.session_start.02', 'Chalo queen, ab sirf tum aur yeh chapter.'],
        ['diva.hinglish.session_start.03', 'Padhai ka time, drama baad mein.'],
        ['diva.hinglish.session_start.04', 'Aaj woh chapter khatam, no excuses jaan.'],
        ['diva.hinglish.session_start.05', 'Slay mode on. Book kholo.'],
        ['diva.hinglish.session_start.06', 'Kal pe sab daal daal ke thak gaye na? Aaj lock in karo, damn.', SPICY],
      ]),
    ],
    mid_session: [
      say('happy', [
        ['diva.hinglish.mid_session.01', 'Wah, padh rahe ho! Proud moment.'],
        ['diva.hinglish.mid_session.02', 'Bas aise hi chalte raho, topper vibes aa rahe hain.'],
        ['diva.hinglish.mid_session.03', 'Paani pee lo queen, dimaag ko bhi glow chahiye.'],
        ['diva.hinglish.mid_session.04', 'Yeh focus? Ekdum premium.'],
        ['diva.hinglish.mid_session.05', 'Thoda aur, phir break. Tum kar sakte ho.'],
        ['diva.hinglish.mid_session.06', 'Damn, kya speed hai! Koi ready nahi hai tumhare liye.', SPICY],
      ]),
    ],
    leave: [
      say('annoyed', [
        ['diva.hinglish.leave.01', 'Kahan chale gaye? Timer abhi bhi chal raha hai.'],
        ['diva.hinglish.leave.02', 'Reels baad mein, marks abhi.'],
        ['diva.hinglish.leave.03', 'Book ko seen-zone kar diya? Wapas aao.'],
        ['diva.hinglish.leave.04', 'Yeh scrolling tumhare marks nahi badhayegi, jaan.'],
        ['diva.hinglish.leave.05', 'Diva aise beech mein nahi bhaagti. Wapas aao.'],
        ['diva.hinglish.leave.06', 'Oye, kahan gayi? Itna scroll karke kya mil raha hai, damn?', SPICY],
      ]),
    ],
    come_back: [
      say('neutral', [
        ['diva.hinglish.come_back.01', 'Aa gaye? Chalo, ab wapas focus.'],
        ['diva.hinglish.come_back.02', 'Comeback setback se strong hona chahiye.'],
        ['diva.hinglish.come_back.03', 'Theek hai, maaf kiya. Ab phone ulta rakh do.'],
        ['diva.hinglish.come_back.04', 'Wapas aaye ho toh poora karke hi uthna.'],
        ['diva.hinglish.come_back.05', 'Good. Queen kabhi haar nahi maanti.'],
        ['diva.hinglish.come_back.06', 'Bas, aa gaye na? Ab hilna mat, damn.', SPICY],
      ]),
    ],
    forgive: [
      say('happy', [
        ['diva.hinglish.forgive.01', 'Accha, screen thi? Theek hai, maaf kiya.'],
        ['diva.hinglish.forgive.02', 'Bharosa kar rahi hoon, todna mat.'],
        ['diva.hinglish.forgive.03', 'Chalo koi baat nahi, wapas padhai.'],
        ['diva.hinglish.forgive.04', 'Theek hai, no penalty. Aage badho.'],
        ['diva.hinglish.forgive.05', 'Screen ki galti, tumhari nahi. Got it.'],
      ]),
    ],
    finish_full: [
      say('happy', [
        ['diva.hinglish.finish_full.01', 'Kar diya! Full session, full slay.'],
        ['diva.hinglish.finish_full.02', 'Yeh hui na baat! Topper energy confirm.'],
        ['diva.hinglish.finish_full.03', 'Mujhe tum par itna proud hai, sach mein.'],
        ['diva.hinglish.finish_full.04', 'Ek aur session khatam. Queen behaviour.'],
        ['diva.hinglish.finish_full.05', 'Coins bhi mile, chapter bhi gaya. Perfect.'],
        ['diva.hinglish.finish_full.06', 'Damn! Poora session? Tum toh kamaal ho.', SPICY],
      ]),
    ],
    quit_early: [
      say('annoyed', [
        ['diva.hinglish.quit_early.01', 'Itni jaldi? Yeh tum nahi ho.'],
        ['diva.hinglish.quit_early.02', 'Bas ek page aur, phir dekhte hain.'],
        ['diva.hinglish.quit_early.03', 'Motivation bill pay nahi karta. Wapas baitho.'],
        ['diva.hinglish.quit_early.04', 'Kal se pakka? Kal kabhi nahi aata, jaan.'],
        ['diva.hinglish.quit_early.05', 'Queen beech mein nahi chhodti.'],
        ['diva.hinglish.quit_early.06', 'Itne paas the, damn! Wapas aao.', SPICY],
      ]),
    ],
    break_start: [
      say('happy', [
        ['diva.hinglish.break_start.01', 'Break time! Paani piyo, stretch karo.'],
        ['diva.hinglish.break_start.02', 'Yeh break tumne kamaya hai. Enjoy.'],
        ['diva.hinglish.break_start.03', 'Das minute ka break, das ghante ka nahi.'],
        ['diva.hinglish.break_start.04', 'Thoda rest, phir wapas slay.'],
        ['diva.hinglish.break_start.05', 'Chalo mere saath khelo thodi der.'],
      ]),
    ],
    streak_milestone: [
      say('happy', [
        ['diva.hinglish.streak_milestone.01', '{n} din lagatar! Yeh consistency ekdum boss level.'],
        ['diva.hinglish.streak_milestone.02', 'Day {n}. Kisi ne socha tha? Tumne kar dikhaya.'],
        ['diva.hinglish.streak_milestone.03', '{n} din ka streak. Ab rukna mana hai.'],
      ]),
    ],
    coin_cap: [
      say('happy', [
        ['diva.hinglish.coin_cap.01', 'Aaj ka coin jar full! Ab padhai sirf shauk ke liye.'],
        ['diva.hinglish.coin_cap.02', 'Max coins ho gaye. Ameer queen.'],
        ['diva.hinglish.coin_cap.03', 'Jar bhar gaya, dimaag bhi bharte jao.'],
      ]),
    ],
    streak_broken: [
      say('sad', [
        ['diva.hinglish.streak_broken.01', 'Streak toot gaya, tum nahi. Aaj se phir shuru.'],
        ['diva.hinglish.streak_broken.02', 'Day one phir se? Har legend ka comeback hota hai.'],
        ['diva.hinglish.streak_broken.03', 'Rona nahi, rebuild karna hai.'],
      ]),
    ],
  }),
]

// ── Gang: Gen Z chill (starter set; the finished set comes later) ──
const GANG = [
  ...lines('gang', 'en', {
    greet: [
      say('happy', [
        ['gang.en.greet.01', "Yooo you're here. Gang's all here now."],
        ['gang.en.greet.02', 'Sup legend. We locking in or what?'],
        ['gang.en.greet.03', "Ayy, look who pulled up. Let's get this W."],
        ['gang.en.greet.04', "What's good, chief. Books are waiting fr."],
        ['gang.en.greet.05', 'The squad is complete. Time to cook.'],
        ['gang.en.greet.06', 'Hey bestie, ready to be an academic weapon today?'],
        ['gang.en.greet.07', 'Pull up a chair, gang. Today we study, no cap.'],
        ['gang.en.greet.08', "You showed up. That's already a W."],
        ['gang.en.greet.09', "Yo, we're locking the hell in today. Let's go.", SPICY],
      ]),
    ],
    session_start: [
      say('happy', [
        ['gang.en.session_start.01', "Gang, we're locking in tonight."],
        ['gang.en.session_start.02', "Timer's on. Phone face down. Let's cook."],
        ['gang.en.session_start.03', 'Alright, focus mode activated. No distractions, fr.'],
        ['gang.en.session_start.04', 'We grinding. Main character study arc starts now.'],
        ['gang.en.session_start.05', "Okay chief, it's giving productive. Let's run it."],
        ['gang.en.session_start.06', 'Locked in. Notifications on mute, brain on max.'],
        ['gang.en.session_start.07', "Let's get this bread. And by bread I mean marks."],
        ['gang.en.session_start.08', "New session, new W. Let's go."],
        ['gang.en.session_start.09', "Phone down, damn it. We're cooking now.", SPICY],
      ]),
    ],
    mid_session: [
      say('happy', [
        ['gang.en.mid_session.01', "No cap, you're cooking right now."],
        ['gang.en.mid_session.02', 'This focus is lowkey insane. Keep it up.'],
        ['gang.en.mid_session.03', "You're in your academic weapon era fr."],
        ['gang.en.mid_session.04', "Bro is locked in. I'm so proud."],
        ['gang.en.mid_session.05', "Still going? That's elite behavior."],
        ['gang.en.mid_session.06', 'The grind is grinding. Respect.'],
        ['gang.en.mid_session.07', "You're on a roll, don't stop now."],
        ['gang.en.mid_session.08', 'Main character energy. Keep reading.'],
        ['gang.en.mid_session.09', "You're cooking so hard right now, holy shit.", SPICY],
      ]),
    ],
    leave: [
      say('annoyed', [
        ['gang.en.leave.01', 'Bro left mid-session. Not the vibe.'],
        ['gang.en.leave.02', "Wait, where'd you go? We were cooking."],
        ['gang.en.leave.03', 'Gang, the book is getting ghosted. Come back.'],
        ['gang.en.leave.04', "Ayo, that's a lowkey L. Get back here."],
        ['gang.en.leave.05', 'You fumbled the focus. Come back and pick it up.'],
        ['gang.en.leave.06', 'The session is feeling abandoned rn.'],
        ['gang.en.leave.07', 'Not you leaving the group chat of studying.'],
        ['gang.en.leave.08', 'Bro dipped. The chapter is in shambles.'],
        ['gang.en.leave.09', 'Bro really dipped mid-chapter. Get your ass back here.', SPICY],
      ]),
    ],
    come_back: [
      say('happy', [
        ['gang.en.come_back.01', "Welcome back, chief. Let's run it back."],
        ['gang.en.come_back.02', "You're back! We move."],
        ['gang.en.come_back.03', "Okay we're so back. Let's cook again."],
        ['gang.en.come_back.04', 'Back in the zone? Say less.'],
        ['gang.en.come_back.05', "Comeback arc starting now. Let's go."],
        ['gang.en.come_back.06', 'W for coming back. Now lock in.'],
        ['gang.en.come_back.07', 'There you are. The squad missed you.'],
        ['gang.en.come_back.08', "We're back in business, gang."],
        ['gang.en.come_back.09', "Damn, we're so back. Let's go.", SPICY],
      ]),
    ],
    forgive: [
      say('happy', [
        ['gang.en.forgive.01', 'Oh it was just the screen? My bad, we good.'],
        ['gang.en.forgive.02', "Say less, it's all good. Back to it."],
        ['gang.en.forgive.03', 'Fair, screen naps happen. We move.'],
        ['gang.en.forgive.04', "Okay okay, you're forgiven. No cap."],
        ['gang.en.forgive.05', 'All good, gang. Keep cooking.'],
        ['gang.en.forgive.06', "Screen's fault, not yours. Respect."],
        ['gang.en.forgive.07', "We're chill. Let's keep the streak alive."],
        ['gang.en.forgive.08', 'Forgiven. Now back to the grind.'],
        ['gang.en.forgive.09', 'Ah hell, it was the screen? We good.', SPICY],
      ]),
    ],
    finish_full: [
      say('happy', [
        ['gang.en.finish_full.01', "Full session done. That's a massive W."],
        ['gang.en.finish_full.02', 'You ate that session, no crumbs.'],
        ['gang.en.finish_full.03', 'Okay you actually cooked. Huge respect.'],
        ['gang.en.finish_full.04', 'Session complete. Academic weapon behavior.'],
        ['gang.en.finish_full.05', 'W secured. Take your break, legend.'],
        ['gang.en.finish_full.06', "That's how it's done, gang."],
        ['gang.en.finish_full.07', 'Locked in the whole time? Built different.'],
        ['gang.en.finish_full.08', 'GG. You absolutely slayed that.'],
        ['gang.en.finish_full.09', 'Damn, you cooked that whole session. Respect.', SPICY],
      ]),
    ],
    quit_early: [
      say('neutral', [
        ['gang.en.quit_early.01', "Quitting early? That's kinda mid, ngl."],
        ['gang.en.quit_early.02', 'Tapping out already? Run it back later.'],
        ['gang.en.quit_early.03', "Short session. We'll take the small W."],
        ['gang.en.quit_early.04', "Fumbled the timer, but there's always next round."],
        ['gang.en.quit_early.05', 'Leaving already? The grind will miss you.'],
        ['gang.en.quit_early.06', "That's an early exit, chief. Next time we go longer."],
        ['gang.en.quit_early.07', 'Not the speedrun of quitting.'],
        ['gang.en.quit_early.08', "Okay, pause. But we're running it back, fr."],
        ['gang.en.quit_early.09', "Quitting already? Damn, that's an L.", SPICY],
      ]),
    ],
    break_start: [
      say('happy', [
        ['gang.en.break_start.01', 'Break time, gang. Touch some grass real quick.'],
        ['gang.en.break_start.02', 'You earned this break, no cap.'],
        ['gang.en.break_start.03', 'Snack break. Hydrate or diedrate.'],
        ['gang.en.break_start.04', 'Ten minutes of chill. Then we lock back in.'],
        ['gang.en.break_start.05', 'Stretch, breathe, vibe. Break starts now.'],
        ['gang.en.break_start.06', 'Go get that snack, you deserve it.'],
        ['gang.en.break_start.07', "Break mode on. Don't get lost in reels though."],
        ['gang.en.break_start.08', 'Chill time. You cooked hard.'],
        ['gang.en.break_start.09', 'Break time. Go relax, you earned that shit.', SPICY],
      ]),
    ],
    streak_milestone: [
      say('happy', [
        ['gang.en.streak_milestone.01', "{n} days in a row?? You're actually built different."],
        ['gang.en.streak_milestone.02', "{n}-day streak. That's insane, no cap."],
        ['gang.en.streak_milestone.03', 'Day {n}. The consistency is elite.'],
        ['gang.en.streak_milestone.04', '{n} days straight. Main character behavior.'],
        ['gang.en.streak_milestone.05', "Gang, that's {n} days. We don't miss."],
        ['gang.en.streak_milestone.06', '{n}-day streak unlocked. Massive W.'],
        ['gang.en.streak_milestone.07', '{n} days locked in. Legendary.'],
        ['gang.en.streak_milestone.08', 'Streak: {n}. Keep the W train going.'],
        ['gang.en.streak_milestone.09', '{n} days in a row? Hell yeah, gang.', SPICY],
      ]),
    ],
    coin_cap: [
      say('happy', [
        ['gang.en.coin_cap.01', "Coin jar's maxed. You're rich today, gang."],
        ['gang.en.coin_cap.02', 'Max coins reached. Certified baller.'],
        ['gang.en.coin_cap.03', "That's all the coins for today. W behavior."],
        ['gang.en.coin_cap.04', 'Coins capped. The bag is secured.'],
        ['gang.en.coin_cap.05', 'No more coins today, but the knowledge stays free.'],
        ['gang.en.coin_cap.06', "Jar's full. You cooked the economy."],
        ['gang.en.coin_cap.07', 'Daily coins: done. Legend status.'],
        ['gang.en.coin_cap.08', 'You hit the cap. Absolutely goated.'],
        ['gang.en.coin_cap.09', "Coin jar's full. Damn, you're rich.", SPICY],
      ]),
    ],
    streak_broken: [
      say('neutral', [
        ['gang.en.streak_broken.01', "Streak reset. It's fine, we run it back."],
        ['gang.en.streak_broken.02', 'Lost the streak? Comeback arc starts today.'],
        ['gang.en.streak_broken.03', "Day one again, but we're built for this."],
        ['gang.en.streak_broken.04', "L on the streak, but not on you. Let's go."],
        ['gang.en.streak_broken.05', "Fresh start, gang. Let's get that W today."],
        ['gang.en.streak_broken.06', "Streaks reset. Legends don't."],
        ['gang.en.streak_broken.07', 'We fell off a bit. Time to bounce back.'],
        ['gang.en.streak_broken.08', "No streak? No stress. One session and we're back."],
        ['gang.en.streak_broken.09', "Streak's gone, damn. Let's rebuild it today.", SPICY],
      ]),
    ],
  }),
  ...lines('gang', 'hinglish', {
    greet: [
      say('happy', [
        ['gang.hinglish.greet.01', 'Bhai aa gaya! Aaj full lock in karte hain.'],
        ['gang.hinglish.greet.02', 'Kya scene hai boss? Padhai ka plan ready?'],
        ['gang.hinglish.greet.03', 'Gang aa gayi! Aaj kuch bada karte hain.'],
        ['gang.hinglish.greet.04', 'Oye legend, chal aaj W lete hain.'],
        ['gang.hinglish.greet.05', 'Aa gaya mera bhai. Books wait kar rahi hain.'],
      ]),
    ],
    session_start: [
      say('happy', [
        ['gang.hinglish.session_start.01', 'Chal bhai, aaj raat full lock in.'],
        ['gang.hinglish.session_start.02', "Phone side mein, focus on. Let's cook."],
        ['gang.hinglish.session_start.03', 'Timer chalu. Ab koi distraction nahi, fr.'],
        ['gang.hinglish.session_start.04', 'Aaj ka session ek number jayega.'],
        ['gang.hinglish.session_start.05', 'Bas shuru kar, baaki apne aap ho jayega.'],
      ]),
    ],
    mid_session: [
      say('happy', [
        ['gang.hinglish.mid_session.01', 'No cap bhai, tu toh cook kar raha hai.'],
        ['gang.hinglish.mid_session.02', 'Kya focus hai yaar, ek number.'],
        ['gang.hinglish.mid_session.03', 'Bhai full academic weapon mode mein hai.'],
        ['gang.hinglish.mid_session.04', 'Aise hi chalta reh, solid chal raha hai.'],
        ['gang.hinglish.mid_session.05', 'Bhai locked in hai. Respect.'],
      ]),
    ],
    leave: [
      say('annoyed', [
        ['gang.hinglish.leave.01', 'Bhai kahan bhaag gaya? Hum cook kar rahe the.'],
        ['gang.hinglish.leave.02', 'Chapter ko ghost kar diya? Wapas aa.'],
        ['gang.hinglish.leave.03', 'Ye toh L ho gaya bhai. Wapas aa jaldi.'],
        ['gang.hinglish.leave.04', 'Focus fumble ho gaya. Wapas utha.'],
        ['gang.hinglish.leave.05', 'Bhai session akela feel kar raha hai.'],
      ]),
    ],
    come_back: [
      say('happy', [
        ['gang.hinglish.come_back.01', 'Wapas aa gaya bhai! Chal phir se cook karte hain.'],
        ['gang.hinglish.come_back.02', "We're so back. Shuru kar."],
        ['gang.hinglish.come_back.03', "Comeback arc on. Let's go."],
        ['gang.hinglish.come_back.04', 'Aa gaya? Bas, ab lock in.'],
        ['gang.hinglish.come_back.05', 'Welcome back boss. Chalo aage.'],
      ]),
    ],
    forgive: [
      say('happy', [
        ['gang.hinglish.forgive.01', 'Arre screen thi? Chill, sab theek hai.'],
        ['gang.hinglish.forgive.02', 'Say less bhai, koi baat nahi.'],
        ['gang.hinglish.forgive.03', 'Theek hai, maaf kiya. Wapas grind pe.'],
        ['gang.hinglish.forgive.04', 'Screen ka kasoor, tera nahi. We move.'],
        ['gang.hinglish.forgive.05', 'Sab badhiya bhai, continue kar.'],
      ]),
    ],
    finish_full: [
      say('happy', [
        ['gang.hinglish.finish_full.01', 'Poora session done! Bhai ne cook kar diya.'],
        ['gang.hinglish.finish_full.02', 'Ek number session tha. Massive W.'],
        ['gang.hinglish.finish_full.03', 'Bhai tu toh built different hai.'],
        ['gang.hinglish.finish_full.04', 'Session complete. Ab break le, legend.'],
        ['gang.hinglish.finish_full.05', 'Full focus, full W. Respect bhai.'],
      ]),
    ],
    quit_early: [
      say('neutral', [
        ['gang.hinglish.quit_early.01', 'Itni jaldi? Bhai ye thoda mid tha.'],
        ['gang.hinglish.quit_early.02', 'Chal koi na, next time lamba session.'],
        ['gang.hinglish.quit_early.03', 'Short session, chhota W. Chalega.'],
        ['gang.hinglish.quit_early.04', 'Bhai tap out kar diya? Baad mein run it back.'],
        ['gang.hinglish.quit_early.05', 'Abhi chhod raha hai? Grind miss karega.'],
      ]),
    ],
    break_start: [
      say('happy', [
        ['gang.hinglish.break_start.01', 'Break time bhai. Thoda grass touch kar le.'],
        ['gang.hinglish.break_start.02', 'Break kamaya hai tune, no cap.'],
        ['gang.hinglish.break_start.03', 'Snack le, paani pi, chill kar.'],
        ['gang.hinglish.break_start.04', 'Das minute chill, phir wapas lock in.'],
        ['gang.hinglish.break_start.05', 'Break pe reels mein mat kho jana bhai.'],
      ]),
    ],
    streak_milestone: [
      say('happy', [
        ['gang.hinglish.streak_milestone.01', '{n} din lagatar? Bhai tu built different hai.'],
        ['gang.hinglish.streak_milestone.02', '{n} din ki streak, no cap insane.'],
        ['gang.hinglish.streak_milestone.03', 'Day {n}. Consistency ek number.'],
        ['gang.hinglish.streak_milestone.04', '{n} din straight. Gang miss nahi karti.'],
        ['gang.hinglish.streak_milestone.05', '{n} din ki streak unlocked. Massive W.'],
      ]),
    ],
    coin_cap: [
      say('happy', [
        ['gang.hinglish.coin_cap.01', 'Coin jar full bhai. Aaj tu ameer hai.'],
        ['gang.hinglish.coin_cap.02', 'Max coins. Bag secured.'],
        ['gang.hinglish.coin_cap.03', 'Aaj ke coins khatam. Legend status.'],
        ['gang.hinglish.coin_cap.04', 'Jar full kar diya. Goated bhai.'],
        ['gang.hinglish.coin_cap.05', 'Coins capped, par padhai free hai. Chalta reh.'],
      ]),
    ],
    streak_broken: [
      say('neutral', [
        ['gang.hinglish.streak_broken.01', 'Streak toot gayi? Chill, run it back karte hain.'],
        ['gang.hinglish.streak_broken.02', 'Day one phir se, par hum ready hain.'],
        ['gang.hinglish.streak_broken.03', 'Streak pe L, tujh pe nahi. Chal shuru kar.'],
        ['gang.hinglish.streak_broken.04', 'Fresh start bhai. Aaj W lete hain.'],
        ['gang.hinglish.streak_broken.05', 'Streak reset hoti hai, legends nahi.'],
      ]),
    ],
  }),
]

// ── Savage: roasts the habit, never the person (starter set) ──
const SAVAGE = [
  ...lines('savage', 'en', {
    greet: [
      say('neutral', [
        ['savage.en.greet.01', "Oh, you're here. The syllabus almost filed a missing person report."],
        ['savage.en.greet.02', 'Look who remembered they have exams.'],
        ['savage.en.greet.03', 'Welcome. Your excuses are not invited today.'],
        ['savage.en.greet.04', "Back again? Let's see if you actually study this time."],
        ['savage.en.greet.05', 'Hi. Your books have more dust than your phone has fingerprints.'],
        ['savage.en.greet.06', 'Oh good, you opened the app. Now open the book.'],
        ['savage.en.greet.07', 'Ready to stop planning and start doing?'],
        ['savage.en.greet.08', "Hello. Let's make today's screen time less embarrassing."],
        ['savage.en.greet.09', 'Oh look, you showed up. Now get your ass studying.', SPICY],
      ]),
    ],
    session_start: [
      say('annoyed', [
        ['savage.en.session_start.01', "Timer's on. Let's see how long before you 'just check' your phone."],
        ['savage.en.session_start.02', 'Books open. Excuses closed. Go.'],
        ['savage.en.session_start.03', "Your phone isn't going anywhere. Neither is your syllabus."],
        ['savage.en.session_start.04', 'Okay, prove me wrong. Study for once.'],
        ['savage.en.session_start.05', 'Start now, or start explaining your marks later.'],
        ['savage.en.session_start.06', 'Every minute you delay, the exam gets closer. Tick tock.'],
        ['savage.en.session_start.07', 'Planning is not studying. Go.'],
        ['savage.en.session_start.08', 'You made the timetable. Now follow it.'],
        ['savage.en.session_start.09', 'Enough damn planning. Study.', SPICY],
      ]),
    ],
    mid_session: [
      say('happy', [
        ['savage.en.mid_session.01', "Still here? Wow, you're actually doing it."],
        ['savage.en.mid_session.02', 'Look at that, focus. Keep it coming.'],
        ['savage.en.mid_session.03', 'Keep this up and your report card might stop crying.'],
        ['savage.en.mid_session.04', "This is the most productive you've been all week. Don't stop."],
        ['savage.en.mid_session.05', 'Nice. Your phone is sulking. Good.'],
        ['savage.en.mid_session.06', 'Look at you, doing the thing instead of talking about it.'],
        ['savage.en.mid_session.07', 'Keep going. The reels can wait. They always do.'],
        ['savage.en.mid_session.08', 'Focus looks good on you. Keep it on.'],
        ['savage.en.mid_session.09', "Holy shit, you're actually studying. Keep going.", SPICY],
      ]),
    ],
    leave: [
      say('annoyed', [
        ['savage.en.leave.01', 'And there it goes. The attention span of a goldfish on caffeine.'],
        ['savage.en.leave.02', "Another 'quick check'? That's the fifth quick check."],
        ['savage.en.leave.03', 'Broke rehna hai kya? Come back and study.'],
        ['savage.en.leave.04', "The book didn't leave. You did. Think about that."],
        ['savage.en.leave.05', 'Wow, the reels needed you that badly?'],
        ['savage.en.leave.06', "Your syllabus watched you leave. It's not impressed."],
        ['savage.en.leave.07', 'That tab is not going to pass your exam for you.'],
        ['savage.en.leave.08', 'Leaving already? Your future self just sighed.'],
        ['savage.en.leave.09', 'Seriously? Get your ass back to the book.', SPICY],
      ]),
    ],
    come_back: [
      say('neutral', [
        ['savage.en.come_back.01', "Oh, you're back. Did the internet run out?"],
        ['savage.en.come_back.02', 'Welcome back from your very important scrolling.'],
        ['savage.en.come_back.03', "Back already? Let's pretend that didn't happen."],
        ['savage.en.come_back.04', "Good, you're back. The book is still waiting. Impatiently."],
        ['savage.en.come_back.05', 'Finally. Sit down and finish what you started.'],
        ['savage.en.come_back.06', 'Back to reality. Reality has exams.'],
        ['savage.en.come_back.07', 'Nice of you to join us again.'],
        ['savage.en.come_back.08', "You're back. Now stay back."],
        ['savage.en.come_back.09', "Oh, now you're back? Damn. Sit down.", SPICY],
      ]),
    ],
    forgive: [
      say('neutral', [
        ['savage.en.forgive.01', "Just the screen? Fine. I'll believe you this once."],
        ['savage.en.forgive.02', 'Okay, screen nap. Not a scroll. Got it.'],
        ['savage.en.forgive.03', "Forgiven. Don't make me regret it."],
        ['savage.en.forgive.04', "Fine, that one doesn't count. The next one will."],
        ['savage.en.forgive.05', "I'll let it slide. Your marks won't, though."],
        ['savage.en.forgive.06', 'Alright, the screen did it. Back to work.'],
        ['savage.en.forgive.07', "One free pass. Don't waste it on memes."],
        ['savage.en.forgive.08', 'Accepted. Now prove it by studying.'],
        ['savage.en.forgive.09', 'Fine, the screen did it. Now get back to work, damn it.', SPICY],
      ]),
    ],
    finish_full: [
      say('happy', [
        ['savage.en.finish_full.01', 'A full session? Who are you and what did you do with the procrastinator?'],
        ['savage.en.finish_full.02', "Okay, that was actually good. Don't get used to the praise."],
        ['savage.en.finish_full.03', "You finished. I'm shocked. Pleasantly."],
        ['savage.en.finish_full.04', 'Full session done. Your excuses are unemployed now.'],
        ['savage.en.finish_full.05', 'Look at you, finishing things. Character development.'],
        ['savage.en.finish_full.06', "That's how you do it. Now do it again tomorrow."],
        ['savage.en.finish_full.07', 'Respect. That was real work.'],
        ['savage.en.finish_full.08', "You didn't quit. Mark the calendar."],
        ['savage.en.finish_full.09', "Damn, a full session. I'm actually impressed.", SPICY],
      ]),
    ],
    quit_early: [
      say('annoyed', [
        ['savage.en.quit_early.01', 'Quitting already? The timer had such high hopes.'],
        ['savage.en.quit_early.02', "That's it? I've seen longer ad breaks."],
        ['savage.en.quit_early.03', 'Stopping early. Your marks are taking notes.'],
        ['savage.en.quit_early.04', 'Broke rehna hai kya? Finish the session.'],
        ['savage.en.quit_early.05', "Bold of you to quit when the exam isn't quitting."],
        ['savage.en.quit_early.06', 'Short session. Next one longer, no excuses.'],
        ['savage.en.quit_early.07', "You paused. The syllabus didn't."],
        ['savage.en.quit_early.08', 'Wow, a speedrun. Of giving up.'],
        ['savage.en.quit_early.09', "Quitting already? Come on, that's bullshit.", SPICY],
      ]),
    ],
    break_start: [
      say('neutral', [
        ['savage.en.break_start.01', 'Break time. Ten minutes, not ten reels.'],
        ['savage.en.break_start.02', 'Fine, take a break. You actually earned this one.'],
        ['savage.en.break_start.03', 'Rest. You earned it, for once.'],
        ['savage.en.break_start.04', 'Break starts now. The timer is watching you.'],
        ['savage.en.break_start.05', 'Go drink water. Not scroll. Water.'],
        ['savage.en.break_start.06', 'Take your break. Then come back. Actually come back.'],
        ['savage.en.break_start.07', 'Snack, stretch, return. In that order.'],
        ['savage.en.break_start.08', "You worked. Now rest. Don't overdo the resting."],
        ['savage.en.break_start.09', "Break time. Don't turn it into a damn nap.", SPICY],
      ]),
    ],
    streak_milestone: [
      say('happy', [
        ['savage.en.streak_milestone.01', "{n} days in a row? Okay, I'll stop doubting you. For now."],
        ['savage.en.streak_milestone.02', '{n}-day streak. Your excuses have been on vacation.'],
        ['savage.en.streak_milestone.03', 'Day {n}. Look at all that discipline.'],
        ['savage.en.streak_milestone.04', '{n} days straight. Annoyingly impressive.'],
        ['savage.en.streak_milestone.05', "{n} days. Keep it up and I'll run out of roasts."],
        ['savage.en.streak_milestone.06', '{n}-day streak. Your phone is getting jealous.'],
        ['savage.en.streak_milestone.07', "{n} days of showing up. Don't ruin it tomorrow."],
        ['savage.en.streak_milestone.08', "Streak: {n}. Fine. You're doing good."],
        ['savage.en.streak_milestone.09', '{n} days in a row. Damn, look at you.', SPICY],
      ]),
    ],
    coin_cap: [
      say('neutral', [
        ['savage.en.coin_cap.01', 'Coin jar full. Now try earning some marks too.'],
        ['savage.en.coin_cap.02', 'Max coins today. The jar is richer than your revision notes.'],
        ['savage.en.coin_cap.03', "No more coins today. Knowledge doesn't have a cap though."],
        ['savage.en.coin_cap.04', 'Coins capped. Your excuses, sadly, are not.'],
        ['savage.en.coin_cap.05', "That's all the coins. Keep studying anyway, it's free."],
        ['savage.en.coin_cap.06', "Jar's full. Fill your notes like that next."],
        ['savage.en.coin_cap.07', 'Daily max. Impressive, for once.'],
        ['savage.en.coin_cap.08', 'You maxed the coins. Now max the syllabus.'],
        ['savage.en.coin_cap.09', "Coin jar's full. Damn, rich and studious.", SPICY],
      ]),
    ],
    streak_broken: [
      say('annoyed', [
        ['savage.en.streak_broken.01', "The streak broke. Right after 'I'll start tomorrow'. Shocking."],
        ['savage.en.streak_broken.02', 'Back to day one. Tomorrow-you let today-you down.'],
        ['savage.en.streak_broken.03', 'Streak gone. The phone won, again.'],
        ['savage.en.streak_broken.04', 'No streak. But you can start a new one right now. Go.'],
        ['savage.en.streak_broken.05', 'Day one again. Make this one last longer.'],
        ['savage.en.streak_broken.06', "The streak broke. The syllabus didn't. Open it."],
        ['savage.en.streak_broken.07', 'Broke the streak? Fix it today. No excuses.'],
        ['savage.en.streak_broken.08', "Zero days. Let's make it one. Open the book."],
        ['savage.en.streak_broken.09', "The streak's dead. Damn. Start a new one now.", SPICY],
      ]),
    ],
  }),
  ...lines('savage', 'hinglish', {
    greet: [
      say('neutral', [
        ['savage.hinglish.greet.01', 'Aa gaye? Syllabus ne missing complaint likha diya tha.'],
        ['savage.hinglish.greet.02', 'Oh, yaad aaya ki exam bhi hai?'],
        ['savage.hinglish.greet.03', 'Welcome. Bahaane bahar chhod ke aana.'],
        ['savage.hinglish.greet.04', 'App khol li, ab kitaab bhi khol lo.'],
        ['savage.hinglish.greet.05', 'Aaj bhi sirf planning karni hai ya padhna bhi hai?'],
      ]),
    ],
    session_start: [
      say('annoyed', [
        ['savage.hinglish.session_start.01', 'Timer on. Dekhte hain phone kitni der door rehta hai.'],
        ['savage.hinglish.session_start.02', 'Broke rehna hai kya? Padh le.'],
        ['savage.hinglish.session_start.03', 'Timetable bana liya, ab follow bhi kar lo.'],
        ['savage.hinglish.session_start.04', 'Abhi shuru karo, warna result pe explain karna.'],
        ['savage.hinglish.session_start.05', 'Planning padhai nahi hai. Shuru karo.'],
      ]),
    ],
    mid_session: [
      say('happy', [
        ['savage.hinglish.mid_session.01', 'Arre, sach mein padh rahe ho? Chalte raho.'],
        ['savage.hinglish.mid_session.02', 'Itna focus? Pehli baar dekha. Rukna mat.'],
        ['savage.hinglish.mid_session.03', 'Aise hi chalo, report card bhi khush ho jayega.'],
        ['savage.hinglish.mid_session.04', 'Phone gussa hai, aur ye acchi baat hai.'],
        ['savage.hinglish.mid_session.05', 'Baatein kam, kaam zyada. Bilkul aise hi.'],
      ]),
    ],
    leave: [
      say('annoyed', [
        ['savage.hinglish.leave.01', 'Broke rehna hai kya? Wapas aa, padh le.'],
        ['savage.hinglish.leave.02', "Phir se 'bas ek minute'? Wah."],
        ['savage.hinglish.leave.03', 'Kitaab nahi gayi, tum gaye. Socho.'],
        ['savage.hinglish.leave.04', 'Reels tumhara exam nahi dengi.'],
        ['savage.hinglish.leave.05', 'Itni jaldi bore ho gaye? Wapas aao.'],
      ]),
    ],
    come_back: [
      say('neutral', [
        ['savage.hinglish.come_back.01', 'Aa gaye wapas? Internet khatam ho gaya kya?'],
        ['savage.hinglish.come_back.02', 'Scrolling se fursat mil gayi? Baitho.'],
        ['savage.hinglish.come_back.03', 'Chalo, jo shuru kiya tha woh khatam karo.'],
        ['savage.hinglish.come_back.04', 'Wapas aa gaye. Ab wapas mat jaana.'],
        ['savage.hinglish.come_back.05', 'Reality mein swagat hai. Reality mein exam hai.'],
      ]),
    ],
    forgive: [
      say('neutral', [
        ['savage.hinglish.forgive.01', 'Screen thi? Theek hai, is baar maan liya.'],
        ['savage.hinglish.forgive.02', 'Chalo maaf kiya. Agli baar nahi.'],
        ['savage.hinglish.forgive.03', 'Theek hai, ye count nahi hoga. Agla hoga.'],
        ['savage.hinglish.forgive.04', 'Maan liya. Ab padh ke dikhao.'],
        ['savage.hinglish.forgive.05', 'Ek free pass. Memes pe waste mat karna.'],
      ]),
    ],
    finish_full: [
      say('happy', [
        ['savage.hinglish.finish_full.01', 'Poora session? Kaun ho tum, aur procrastinator kahan hai?'],
        ['savage.hinglish.finish_full.02', 'Accha tha. Tareef ki aadat mat daalna.'],
        ['savage.hinglish.finish_full.03', 'Khatam kar diya? Shocked hoon, accha wala.'],
        ['savage.hinglish.finish_full.04', 'Full session. Ab bahaane berozgaar ho gaye.'],
        ['savage.hinglish.finish_full.05', 'Aise hi kal bhi karna. Tab maanunga.'],
      ]),
    ],
    quit_early: [
      say('annoyed', [
        ['savage.hinglish.quit_early.01', 'Itni jaldi? Ad break bhi isse lamba hota hai.'],
        ['savage.hinglish.quit_early.02', 'Broke rehna hai kya? Session poora karo.'],
        ['savage.hinglish.quit_early.03', 'Tum ruk gaye, syllabus nahi rukega.'],
        ['savage.hinglish.quit_early.04', 'Quit karne ka speedrun chal raha hai kya?'],
        ['savage.hinglish.quit_early.05', 'Exam nahi ruk raha, tum kyun ruk gaye?'],
      ]),
    ],
    break_start: [
      say('neutral', [
        ['savage.hinglish.break_start.01', 'Break time. Das minute, das reels nahi.'],
        ['savage.hinglish.break_start.02', 'Chalo break lo, is baar kamaya hai.'],
        ['savage.hinglish.break_start.03', 'Paani piyo. Scroll nahi, paani.'],
        ['savage.hinglish.break_start.04', 'Break ke baad wapas aana. Sach mein aana.'],
        ['savage.hinglish.break_start.05', 'Snack, stretch, wapas. Isi order mein.'],
      ]),
    ],
    streak_milestone: [
      say('happy', [
        ['savage.hinglish.streak_milestone.01', '{n} din lagatar? Theek hai, ab shak nahi karunga.'],
        ['savage.hinglish.streak_milestone.02', '{n} din ki streak. Bahaane chhutti pe hain.'],
        ['savage.hinglish.streak_milestone.03', 'Day {n}. Itna discipline? Wah.'],
        ['savage.hinglish.streak_milestone.04', '{n} din. Aise hi chala toh roasts khatam ho jayenge.'],
        ['savage.hinglish.streak_milestone.05', '{n} din ki streak. Phone jealous ho raha hai.'],
      ]),
    ],
    coin_cap: [
      say('neutral', [
        ['savage.hinglish.coin_cap.01', 'Coin jar full. Ab marks bhi kama lo.'],
        ['savage.hinglish.coin_cap.02', 'Aaj ke coins khatam. Gyaan ki koi limit nahi.'],
        ['savage.hinglish.coin_cap.03', 'Coins capped. Bahaane abhi bhi uncapped hain.'],
        ['savage.hinglish.coin_cap.04', 'Jar bhar gaya. Notes bhi aise hi bharo.'],
        ['savage.hinglish.coin_cap.05', 'Max coins. Ab syllabus bhi max karo.'],
      ]),
    ],
    streak_broken: [
      say('annoyed', [
        ['savage.hinglish.streak_broken.01', "Streak toot gayi. 'Kal se pakka' ka result."],
        ['savage.hinglish.streak_broken.02', 'Phir se day one. Phone jeet gaya.'],
        ['savage.hinglish.streak_broken.03', 'Streak gayi. Nayi abhi shuru karo.'],
        ['savage.hinglish.streak_broken.04', 'Zero din. Chalo ek banate hain. Kitaab kholo.'],
        ['savage.hinglish.streak_broken.05', 'Streak todi hai toh aaj jodo. Koi bahana nahi.'],
      ]),
    ],
  }),
]

// ── every personality: meows, reactions, coins, book mode, goals ──
const SHARED = [
  ...lines('any', 'en', {
    meow: [
      say('happy', [
        ['meow.01', 'Meow!'],
        ['meow.02', 'Mrrp?'],
        ['meow.03', 'Meow meow!'],
        ['meow.04', 'Hi!'],
        ['meow.05', 'Purrr...'],
        ['meow.06', 'Mrow?'],
        ['meow.07', 'Hello there!'],
        ['meow.08', 'Pet me?'],
        ['meow.09', 'Mew!'],
        ['meow.10', 'Hehe, that tickles.'],
      ]),
    ],
    'react.play': [
      say('happy', [
        ['react.play.01', 'Wheee! Again, again!'],
        ['react.play.02', 'Got it! Got it!'],
        ['react.play.03', 'Yarn is the best!'],
        ['react.play.04', 'Pounce!'],
        ['react.play.05', 'This is the best break ever!'],
        ['react.play.06', 'One more throw!'],
        ['react.play.07', "Hehe, it's running away!"],
        ['react.play.08', 'Yarn: defeated.'],
      ]),
    ],
    'react.feed': [
      say('happy', [
        ['react.feed.01', 'Yum! Thank you!'],
        ['react.feed.02', 'Nom nom nom...'],
        ['react.feed.03', 'Best snack ever!'],
        ['react.feed.04', 'Mmm, crunchy!'],
        ['react.feed.05', 'My favorite!'],
        ['react.feed.06', 'Food makes studying better!'],
        ['react.feed.07', "You're the best!"],
        ['react.feed.08', 'More? Just kidding. Unless...?'],
      ]),
    ],
    'react.bathe': [
      say('neutral', [
        ['react.bathe.01', 'Brrr... squeaky clean!'],
        ['react.bathe.02', 'Bubbles! Okay, this is fine.'],
        ['react.bathe.03', 'Not the water!'],
        ['react.bathe.04', 'I am now ninety percent fluff.'],
        ['react.bathe.05', 'So... much... soap.'],
        ['react.bathe.06', "Fine, I'm clean. Happy?"],
        ['react.bathe.07', 'Splish splash!'],
        ['react.bathe.08', 'I smell like flowers now.'],
      ]),
    ],
    'coins.earned': [
      say('happy', [
        ['coins.earned.01', 'Yay, coins!'],
        ['coins.earned.02', 'Look at those coins!'],
        ['coins.earned.03', 'Shiny! Well earned.'],
        ['coins.earned.04', 'Into the jar they go!'],
        ['coins.earned.05', 'Coins for focus! I love it.'],
        ['coins.earned.06', 'Ka-ching!'],
        ['coins.earned.07', 'You earned those!'],
        ['coins.earned.08', 'Rich cat energy!'],
      ]),
    ],
    'book.on': [
      say('neutral', [
        ['book.on.01', "Okay, go read your book. I'll wait right here."],
        ['book.on.02', "Book mode! I won't count it if the screen sleeps."],
        ['book.on.03', "Go on, read. I'll guard the timer."],
        ['book.on.04', "Reading off-screen? I'll be right here."],
        ['book.on.05', 'Take your time with the book.'],
        ['book.on.06', "I'll keep the lamp on for you."],
        ['book.on.07', "Happy reading! I'll keep watch."],
        ['book.on.08', "Turn those pages. I'll wait."],
      ]),
    ],
    'book.back': [
      say('happy', [
        ['book.back.01', 'Welcome back, reader!'],
        ['book.back.02', 'How was the book?'],
        ['book.back.03', "You're back! Good reading?"],
        ['book.back.04', 'Pages turned! Nice.'],
        ['book.back.05', "Back from the book! Let's keep going."],
        ['book.back.06', 'I waited, just like I said.'],
      ]),
    ],
    'break.idle': [
      say('happy', [
        ['break.idle.01', 'Enough studying, play with me!'],
      ]),
    ],
    'break.end': [
      say('neutral', [
        ['break.end.01', "Break's over! Back to work."],
        ['break.end.02', 'Okay, books again!'],
        ['break.end.03', "Break done. Let's focus."],
        ['break.end.04', 'Time to get back to it.'],
        ['break.end.05', "Refreshed? Let's go again."],
        ['break.end.06', 'Back to the books we go.'],
        ['break.end.07', 'That was nice. Now, study!'],
        ['break.end.08', 'Ready for another round?'],
      ]),
    ],
    'goal.done': [
      say('happy', [
        ['goal.done.01', "You hit today's goal! I'm so proud of you."],
        ['goal.done.02', "Today's goal: done! Here's a crown."],
        ['goal.done.03', 'Goal reached! Purr purr purr.'],
        ['goal.done.04', 'All of today’s minutes, done. You’re amazing!'],
        ['goal.done.05', "Crown time! That's your daily goal."],
        ['goal.done.06', 'You did everything you planned today. Wow.'],
      ]),
    ],
    'quiz.done': [
      say('happy', [
        ['quiz.done.01', 'Quiz done! Your brain is warm now.'],
        ['quiz.done.02', 'Three questions, all answered. Nice!'],
        ['quiz.done.03', 'Quiz finished! Have some coins.'],
        ['quiz.done.04', 'Smart human. Quiz complete!'],
      ]),
    ],
  }),
]


export const LINES = [...SWEET, ...DIVA, ...GANG, ...SAVAGE, ...SHARED]
export const ALL_LINES = LINES // (the old name)
const BY_ID = new Map(LINES.map((l) => [l.id, l]))
export const lineById = (id) => BY_ID.get(id)

// The fixed lines for a situation, best match first: this personality and
// language → this personality in English → Sweet in this language → Sweet
// → the shared lines.
function fixedLines(situation, { personality = 'sweet', language = 'en', spicy = false, strict = false }) {
  for (const [p, lang] of [
    [personality, language],
    [personality, 'en'],
    ['sweet', language],
    ['sweet', 'en'],
    ['any', 'en'],
  ]) {
    let pool = LINES.filter((l) => l.personality === p && l.language === lang && l.situation === situation && (spicy || !l.spicy))
    if (p === 'sweet') {
      const firm = pool.filter((l) => l.strict)
      pool = strict && firm.length ? firm : pool.filter((l) => !l.strict)
    }
    if (pool.length) return pool
  }
  return []
}

const lastPicked = {}

// A line for a situation, for this user:
//   ctx = { personality, language, spicy, strict, pack, n }
//   pack: today's AI-written lines ({ id, situation, mood, text }); they come
//         first, the fixed lines are the fallback
//   n:    the streak days, for {n}
// Never the same line twice in a row.
export function pickLine(situation, ctx = {}) {
  const fromPack = (ctx.pack ?? []).filter((l) => l.situation === situation)
  const pool = fromPack.length ? fromPack : fixedLines(situation, ctx)
  if (!pool.length) throw new Error(`No cat lines for "${situation}"`)
  let i = Math.floor(Math.random() * pool.length)
  if (pool.length > 1 && pool[i].id === lastPicked[situation]) i = (i + 1) % pool.length
  const line = pool[i]
  lastPicked[situation] = line.id
  return { id: line.id, text: line.text.replaceAll('{n}', String(ctx.n ?? '')), mood: line.mood, pack: fromPack.length > 0 }
}

// For the personality picker: a friendly sample in each voice.
export const SAMPLE_LINES = {
  sweet: 'sweet.en.mid_session.01',
  diva: 'diva.en.greet.02',
  gang: 'gang.en.session_start.01',
  savage: 'savage.en.session_start.02',
}
