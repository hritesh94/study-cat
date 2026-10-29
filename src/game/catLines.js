// ───────────────────────── Everything the cat says ─────────────────────────
// Every line has a STABLE id. Never reuse or renumber an id: a voice file
// at public/voice/<id>.mp3 plays instead of the babble for that line.
// If you change a line's wording, give it a new id, so an old recording
// can't play the wrong words.
//
// `mood` shapes the babble: happy = higher and bouncy, sad = lower and
// slower, annoyed = short and sharp, neutral = in between.
//
// Groups are "<situation>" (any study mode) or "<situation>.<mode>".
// Toxic lines roast the BEHAVIOUR (leaving, scrolling, putting things
// off), never the person's worth, intelligence or looks. No slurs, no
// swearing.
//
// `npm run voice:lines` writes all of them to voice-lines.csv.
// ────────────────────────────────────────────────────────────────────────────

const group = (mood, lines) => ({ mood, lines })

export const LINE_GROUPS = {
  // ── starting a study session ──
  'start.easy': group('happy', [
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
  'start.medium': group('neutral', [
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
  'start.toxic': group('annoyed', [
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
  ]),

  // ── coming back after leaving the tab during study ──
  'leave.easy': group('sad', [
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
  'leave.medium': group('sad', [
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
  // Medium, the 2nd time: the cat calls it out
  'callout.medium': group('annoyed', [
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
  // Medium, the 3rd time and after: it costs 10% of the session's coins
  'penalty.medium': group('annoyed', [
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
  // Toxic: a roast every time (and 5 coins off the session)
  'leave.toxic': group('annoyed', [
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
  ]),

  // ── a study session finished (the timer ran out) ──
  'finish.easy': group('happy', [
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
  'finish.medium': group('happy', [
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
  // Toxic, after a full session anyway: grudging praise
  'finish.toxic': group('neutral', [
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
  ]),
  // Toxic: stopping a study session early (Pause / Skip / Reset)
  'quit.toxic': group('annoyed', [
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
  ]),

  // ── any mode ──
  'break.idle': group('happy', [['break.idle.01', 'Enough studying, play with me!']]),
  'break.end': group('neutral', [
    ['break.end.01', "Break's over! Back to work."],
    ['break.end.02', 'Okay, books again!'],
    ['break.end.03', "Break done. Let's focus."],
    ['break.end.04', 'Time to get back to it.'],
    ['break.end.05', "Refreshed? Let's go again."],
    ['break.end.06', 'Back to the books we go.'],
    ['break.end.07', 'That was nice. Now, study!'],
    ['break.end.08', 'Ready for another round?'],
  ]),
  meow: group('happy', [
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
  // the first tap after opening the app (with a real meow sound)
  greet: group('happy', [
    ['greet.01', 'Oh, hi! Ready to study?'],
    ['greet.02', 'Mrrp! You came!'],
    ['greet.03', "Hello! I've been waiting for you."],
    ['greet.04', 'Hi hi! Nice to see you.'],
    ['greet.05', 'Welcome back, study buddy!'],
    ['greet.06', 'Meow! What are we learning today?'],
  ]),
  'react.play': group('happy', [
    ['react.play.01', 'Wheee! Again, again!'],
    ['react.play.02', 'Got it! Got it!'],
    ['react.play.03', 'Yarn is the best!'],
    ['react.play.04', 'Pounce!'],
    ['react.play.05', 'This is the best break ever!'],
    ['react.play.06', 'One more throw!'],
    ['react.play.07', "Hehe, it's running away!"],
    ['react.play.08', 'Yarn: defeated.'],
  ]),
  'react.feed': group('happy', [
    ['react.feed.01', 'Yum! Thank you!'],
    ['react.feed.02', 'Nom nom nom...'],
    ['react.feed.03', 'Best snack ever!'],
    ['react.feed.04', 'Mmm, crunchy!'],
    ['react.feed.05', 'My favorite!'],
    ['react.feed.06', 'Food makes studying better!'],
    ['react.feed.07', "You're the best!"],
    ['react.feed.08', 'More? Just kidding. Unless...?'],
  ]),
  'react.bathe': group('neutral', [
    ['react.bathe.01', 'Brrr... squeaky clean!'],
    ['react.bathe.02', 'Bubbles! Okay, this is fine.'],
    ['react.bathe.03', 'Not the water!'],
    ['react.bathe.04', 'I am now ninety percent fluff.'],
    ['react.bathe.05', 'So... much... soap.'],
    ['react.bathe.06', "Fine, I'm clean. Happy?"],
    ['react.bathe.07', 'Splish splash!'],
    ['react.bathe.08', 'I smell like flowers now.'],
  ]),
  'coins.earned': group('happy', [
    ['coins.earned.01', 'Yay, coins!'],
    ['coins.earned.02', 'Look at those coins!'],
    ['coins.earned.03', 'Shiny! Well earned.'],
    ['coins.earned.04', 'Into the jar they go!'],
    ['coins.earned.05', 'Coins for focus! I love it.'],
    ['coins.earned.06', 'Ka-ching!'],
    ['coins.earned.07', 'You earned those!'],
    ['coins.earned.08', 'Rich cat energy!'],
  ]),
  'coins.cap': group('neutral', [
    ['coins.cap.01', "That's all the coins for today!"],
    ['coins.cap.02', 'The coin jar is full for today.'],
    ['coins.cap.03', 'No more coins today, but keep going if you want!'],
    ['coins.cap.04', 'Daily coins: complete. Nice!'],
    ['coins.cap.05', 'The coin jar is happy. More tomorrow!'],
    ['coins.cap.06', "That's today's limit. You did great."],
  ]),
  // book mode: the screen may sleep while you read on paper
  'book.on': group('neutral', [
    ['book.on.01', "Okay, go read your book. I'll wait right here."],
    ['book.on.02', "Book mode! I won't count it if the screen sleeps."],
    ['book.on.03', "Go on, read. I'll guard the timer."],
    ['book.on.04', "Reading off-screen? I'll be right here."],
    ['book.on.05', 'Take your time with the book.'],
    ['book.on.06', "I'll keep the lamp on for you."],
    ['book.on.07', "Happy reading! I'll keep watch."],
    ['book.on.08', "Turn those pages. I'll wait."],
  ]),
  'book.back': group('happy', [
    ['book.back.01', 'Welcome back, reader!'],
    ['book.back.02', 'How was the book?'],
    ['book.back.03', "You're back! Good reading?"],
    ['book.back.04', 'Pages turned! Nice.'],
    ['book.back.05', "Back from the book! Let's keep going."],
    ['book.back.06', 'I waited, just like I said.'],
  ]),
}

// Every line, flat: [{ id, text, mood, group }]
export const ALL_LINES = Object.entries(LINE_GROUPS).flatMap(([name, g]) =>
  g.lines.map(([id, text]) => ({ id, text, mood: g.mood, group: name })),
)

const lastPicked = {}

// A random line for a situation, preferring the mode's own group:
// pickLine('leave', 'toxic') → from 'leave.toxic'; pickLine('meow') → 'meow'.
// Never the same line twice in a row.
export function pickLine(situation, mode) {
  const name = mode && LINE_GROUPS[`${situation}.${mode}`] ? `${situation}.${mode}` : situation
  const g = LINE_GROUPS[name] ?? LINE_GROUPS[`${situation}.easy`]
  if (!g) throw new Error(`No cat lines for "${situation}"`)
  let i = Math.floor(Math.random() * g.lines.length)
  if (g.lines.length > 1 && g.lines[i][0] === lastPicked[name]) i = (i + 1) % g.lines.length
  const [id, text] = g.lines[i]
  lastPicked[name] = id
  return { id, text, mood: g.mood }
}

export const lineById = (id) => ALL_LINES.find((l) => l.id === id)
