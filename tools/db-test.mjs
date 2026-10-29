// Tests the Supabase migrations on a throw-away Postgres that runs inside
// Node (PGlite), with two pretend users:   npm run test:db
//
// It recreates the bits of Supabase the migrations rely on: the `auth`
// schema with `auth.users` and `auth.uid()`, the `anon` / `authenticated`
// roles, and Supabase's default "everyone may do everything" grants, so the
// security file really has to take them away. Nothing touches your real
// Supabase project.
import { PGlite } from '@electric-sql/pglite'
import { readdirSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const dir = join(dirname(fileURLToPath(import.meta.url)), '..', 'supabase', 'migrations')
const db = await PGlite.create()

// ── a tiny stand-in for Supabase ──
await db.exec(`
  create role anon nologin;
  create role authenticated nologin;
  create role service_role nologin bypassrls; -- the server's own key (Edge Functions)
  create schema auth;
  create table auth.users (id uuid primary key, email text, raw_user_meta_data jsonb not null default '{}');
  create function auth.uid() returns uuid language sql stable
    as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
  grant usage on schema auth, public to anon, authenticated, service_role;
  grant execute on function auth.uid() to anon, authenticated, service_role;
  -- Supabase's defaults: new tables and functions are open to everyone
  alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
  alter default privileges in schema public grant execute on functions to anon, authenticated, service_role;
`)
for (const file of readdirSync(dir).filter((f) => f.endsWith('.sql')).sort()) {
  await db.exec(readFileSync(join(dir, file), 'utf8'))
  console.log(`  ran ${file}`)
}

// ── helpers ──
let passed = 0
const failures = []
const check = (name, ok, detail = '') => {
  if (ok) passed++
  else failures.push(`${name}${detail ? ` (${detail})` : ''}`)
  console.log(`${ok ? '  ✓' : '  ✗'} ${name}${!ok && detail ? ` — ${detail}` : ''}`)
}
const admin = async (sql, params) => (await db.query(sql, params)).rows
// run as a logged-in user (or logged out when uid is null)
async function as(uid, sql, params) {
  await db.exec(uid ? `set role authenticated` : `set role anon`)
  await db.query(`select set_config('request.jwt.claim.sub', $1, false)`, [uid ?? ''])
  try {
    return { rows: (await db.query(sql, params)).rows, error: null }
  } catch (error) {
    return { rows: [], error: error.message }
  } finally {
    await db.exec(`reset role`)
    await db.query(`select set_config('request.jwt.claim.sub', '', false)`)
  }
}
// run as the Edge Functions' server key (service_role)
async function asService(sql, params) {
  await db.exec(`set role service_role`)
  try {
    return { rows: (await db.query(sql, params)).rows, error: null }
  } catch (error) {
    return { rows: [], error: error.message }
  } finally {
    await db.exec(`reset role`)
  }
}
// pretend a session started `minutes` ago (only the test, as admin, can do this)
const backdate = (id, minutes) =>
  admin(`update public.study_sessions set started_at = now() - make_interval(secs => $2) where id = $1`, [id, minutes * 60])
const utcDay = async (offset = 0) => (await admin(`select ((now() at time zone 'utc')::date + $1::int)::text as d`, [offset]))[0].d
async function session(uid, planned, minutesAgo, day, leaves) {
  const start = await as(uid, `select public.start_session($1) as id`, [planned])
  if (start.error) throw new Error(start.error)
  const id = start.rows[0].id
  await backdate(id, minutesAgo)
  const end =
    leaves === undefined
      ? await as(uid, `select public.end_session($1, $2) as r`, [id, day]) // the old 2-argument call still works
      : await as(uid, `select public.end_session($1, $2, $3) as r`, [id, day, leaves])
  if (end.error) throw new Error(end.error)
  return end.rows[0].r
}

const A = '11111111-1111-1111-1111-111111111111'
const B = '22222222-2222-2222-2222-222222222222'
await admin(`insert into auth.users (id, email) values ($1, 'ana@example.com'), ($2, 'ben@example.com')`, [A, B])
const today = await utcDay(0)

console.log('\nProfiles and Row Level Security')
const profiles = await admin(`select id, display_name, coins from public.profiles order by display_name`)
check('sign-up trigger made a profile for each user', profiles.length === 2 && profiles[0].display_name === 'ana')
let r = await as(A, `select id from public.profiles`)
check('Ana sees only her own profile', r.rows.length === 1 && r.rows[0].id === A)
r = await as(A, `select id from public.profiles where id = $1`, [B])
check("Ana can't see Ben's profile", r.rows.length === 0)
r = await as(null, `select id from public.profiles`)
check('logged-out visitors see no profiles', r.error !== null || r.rows.length === 0, r.error ?? '')
r = await as(A, `update public.profiles set coins = 99999 where id = $1`, [A])
check("Ana can't change her coins", r.error?.includes('permission denied'), r.error ?? 'no error')
r = await as(A, `update public.profiles set current_streak = 50, best_streak = 50 where id = $1`, [A])
check("Ana can't change her streak", r.error?.includes('permission denied'), r.error ?? 'no error')
r = await as(A, `update public.profiles set display_name = 'Ana B', breed = 'tuxedo', outfit = 'bow' where id = $1 returning display_name`, [A])
check('Ana can change her name, breed and outfit', r.rows[0]?.display_name === 'Ana B', r.error ?? '')
r = await as(A, `update public.profiles set display_name = 'hacked' where id = $1 returning id`, [B])
check("Ana can't rename Ben", r.rows.length === 0 && (await admin(`select display_name from public.profiles where id = $1`, [B]))[0].display_name === 'ben')
r = await as(A, `insert into public.study_sessions (user_id, planned_minutes, counted_minutes, coins_awarded) values ($1, 50, 50, 300)`, [A])
check("Ana can't write a session directly", r.error?.includes('permission denied'), r.error ?? 'no error')
r = await as(A, `insert into public.owned_items (user_id, item_id) values ($1, 'hoodie')`, [A])
check("Ana can't give herself items", r.error?.includes('permission denied'), r.error ?? 'no error')
r = await as(A, `update public.game_settings set daily_coin_cap = 999999`)
check("Ana can't change the game settings", r.error?.includes('permission denied'), r.error ?? 'no error')
r = await as(A, `select daily_coin_cap from public.game_settings`)
check('Ana can read the game settings', r.rows[0]?.daily_coin_cap === 300)
r = await as(null, `select public.start_session(1)`)
check("logged-out visitors can't start a session", r.error?.includes('permission denied'), r.error ?? 'no error')
r = await as(A, `select public.handle_new_user()`)
check("users can't call the sign-up function", r.error !== null)

console.log('\nSessions and coins')
r = await as(A, `select public.start_session(0)`)
check('planned 0 minutes is refused', r.error?.includes('between'))
r = await as(A, `select public.start_session(181)`)
check('planned 181 minutes is refused (max 180)', r.error?.includes('between'))
const first = (await as(A, `select public.start_session(50) as id`)).rows[0].id
const second = (await as(A, `select public.start_session(50) as id`)).rows[0].id
const closed = (await admin(`select ended_at is not null as ended, coins_awarded from public.study_sessions where id = $1`, [first]))[0]
check('starting again closes the old open session, with 0 coins', closed.ended && closed.coins_awarded === 0)
r = await as(B, `select public.end_session($1, $2)`, [second, today])
check("Ben can't end Ana's session", r.error?.includes('not found'), r.error ?? 'no error')
let res = (await as(A, `select public.end_session($1, $2) as r`, [second, today])).rows[0].r
check('ending right away counts 0 minutes and 0 coins', res.counted_minutes === 0 && res.coins_awarded === 0)
r = await as(A, `select public.end_session($1, $2)`, [second, today])
check("a session can't be ended twice", r.error?.includes('already ended'), r.error ?? 'no error')

res = await session(A, 1, 61 / 60, today)
check('a 1-minute test session gives 1 coin (no bonus under 25 min)', res.counted_minutes === 1 && res.coins_awarded === 1, JSON.stringify(res))
res = await session(A, 50, 49 + 55 / 60, today)
check('50 min (49:55 on the server) counts as full: 50 + 10 bonus', res.counted_minutes === 50 && res.coins_awarded === 60, JSON.stringify(res))
res = await session(A, 50, 20, today)
check('stopping after 20 of 50 min gives 20 coins, no bonus', res.counted_minutes === 20 && res.coins_awarded === 20 && !res.full)
res = await session(A, 50, 180, today)
check('leaving it running 3 h still counts only the 50 planned', res.counted_minutes === 50 && res.coins_awarded === 60)

console.log('\nDaily cap (300)')
res = await session(A, 180, 180, today) // would be 190 → day total now 141 + 190 = 331 > 300
check('the cap trims a session to fit', res.coins_awarded === 300 - 141 && res.capped && res.day_coins === 300, JSON.stringify(res))
res = await session(A, 60, 60, today)
check('after the cap: 0 coins, minutes still count', res.coins_awarded === 0 && res.counted_minutes === 60 && res.capped)
const coinsA = (await admin(`select coins from public.profiles where id = $1`, [A]))[0].coins
check("Ana's coins equal the sum of her sessions", coinsA === 300, `coins ${coinsA}`)
res = await session(A, 10, 10, '1999-01-01')
check('a fake old date is pulled back to today (no fresh cap)', res.study_day === today && res.coins_awarded === 0, JSON.stringify(res))
res = await session(A, 10, 10, await utcDay(1))
check('the next day (within 1 day of UTC) gets a fresh cap', res.coins_awarded === 10 && res.day_coins === 10)
res = await session(A, 10, 10, today)
check("going back to yesterday's date isn't allowed", res.study_day === (await utcDay(1)))
res = await session(A, 10, 10, '2999-01-01')
check('a far-future date is limited to 1 day ahead', res.study_day === (await utcDay(1)))

console.log('\nStreaks (test only: allow any date, to walk through days)')
await admin(`update public.game_settings set local_day_tolerance_days = 100000`)
const day = (n) => `2030-01-${String(n).padStart(2, '0')}`
res = await session(B, 20, 20, day(1))
check('20 minutes: not a streak day yet', res.current_streak === 0)
res = await session(B, 10, 10, day(1))
check('another 10 that day → 30 min → streak 1', res.current_streak === 1 && res.best_streak === 1)
res = await session(B, 30, 30, day(1))
check('more study the same day keeps the streak at 1', res.current_streak === 1)
res = await session(B, 25, 25, day(2))
check('next day with 25 min → streak 2', res.current_streak === 2)
res = await session(B, 30, 30, day(3))
check('day 3 → streak 3', res.current_streak === 3 && res.best_streak === 3)
res = await session(B, 5, 5, day(5))
check('missing a day resets the streak (5 min on day 5 → 0)', res.current_streak === 0 && res.best_streak === 3)
res = await session(B, 25, 25, day(5))
check('…and reaching 25 min on day 5 starts again at 1, best stays 3', res.current_streak === 1 && res.best_streak === 3)
await admin(`update public.game_settings set local_day_tolerance_days = 1`)

console.log('\nStudy modes (a fresh user, Cat, so the daily cap starts at 0)')
const C = '33333333-3333-3333-3333-333333333333'
await admin(`insert into auth.users (id, email) values ($1, 'cat@example.com')`, [C])
const mode = async (uid) => (await admin(`select study_mode from public.profiles where id = $1`, [uid]))[0].study_mode
check('new profiles start in easy mode', (await mode(C)) === 'easy')
r = await as(C, `update public.profiles set study_mode = 'chaos' where id = $1`, [C])
check('only easy / medium / toxic are allowed', r.error?.includes('check'), r.error ?? 'no error')
r = await as(C, `update public.profiles set study_mode = 'toxic' where id = $1 returning id`, [B])
check("Cat can't change Ben's mode", r.rows.length === 0 && (await mode(B)) === 'easy')
res = await session(C, 50, 50, today, 5)
check('easy: leaving 5 times costs nothing (50 + 10 bonus)', res.coins_awarded === 60 && res.penalty_coins === 0 && res.leave_count === 5, JSON.stringify(res))
r = await as(C, `update public.profiles set study_mode = 'medium' where id = $1 returning study_mode`, [C])
check('Cat can switch herself to medium', r.rows[0]?.study_mode === 'medium', r.error ?? '')
res = await session(C, 50, 50, today, 2)
check('medium: the first 2 leaves are free', res.coins_awarded === 60 && res.penalty_coins === 0 && res.study_mode === 'medium', JSON.stringify(res))
res = await session(C, 50, 50, today, 3)
check('medium: the 3rd leave removes 10% (60 → 54)', res.coins_awarded === 54 && res.penalty_coins === 6 && res.session_coins === 60, JSON.stringify(res))
const row = (await admin(`select study_mode, leave_count, penalty_coins, coins_awarded from public.study_sessions where id = $1`, [res.session_id]))[0]
check('the session row keeps its mode, leaves and penalty', row.study_mode === 'medium' && row.leave_count === 3 && row.penalty_coins === 6 && row.coins_awarded === 54, JSON.stringify(row))
res = await session(C, 50, 50, today, 5)
check('medium: 5 leaves → 3 × 10% off (60 → 42)', res.coins_awarded === 42 && res.penalty_coins === 18, JSON.stringify(res))
res = await session(C, 50, 50, today, 15)
check('medium: 15 leaves → never below 0 coins', res.coins_awarded === 0 && res.penalty_coins === 60, JSON.stringify(res))
await as(C, `update public.profiles set study_mode = 'toxic' where id = $1`, [C])
res = await session(C, 50, 50, today, 4)
check('toxic: each leave costs 5 coins (60 − 20 = 40)', res.coins_awarded === 40 && res.penalty_coins === 20 && res.study_mode === 'toxic', JSON.stringify(res))
res = await session(C, 1, 1, today, 50)
check('toxic: a penalty bigger than the session gives 0, not minus', res.coins_awarded === 0 && res.penalty_coins === 1, JSON.stringify(res))
// day total so far: 60 + 60 + 54 + 42 + 0 + 40 + 0 = 256, so 44 are left under the cap
res = await session(C, 50, 50, today, 4)
check('the penalty comes off BEFORE the cap (60 − 20 = 40 fits in the 44 left)', res.coins_awarded === 40 && !res.capped, JSON.stringify(res))
res = await session(C, 50, 50, today, -10)
check('a negative leave count is treated as 0 (no extra coins)', res.leave_count === 0 && res.penalty_coins === 0 && res.coins_awarded === 4 && res.capped, JSON.stringify(res))
res = await session(C, 20, 20, today)
check('old call without leave_count counts as 0 leaves', res.leave_count === 0 && res.penalty_coins === 0, JSON.stringify(res))
res = await session(C, 50, 50, today, 2)
check('toxic at the cap: penalty still recorded, 0 coins', res.coins_awarded === 0 && res.penalty_coins === 10 && res.capped, JSON.stringify(res))
const dayC = (await admin(`select sum(coins_awarded)::int as n from public.study_sessions where user_id = $1 and study_day = $2`, [C, today]))[0].n
check('with penalties the daily cap still holds', dayC === 300, `day total ${dayC}`)
const coinsC = (await admin(`select coins from public.profiles where id = $1`, [C]))[0].coins
check("Cat's coins equal the sum of her sessions", coinsC === dayC, `${coinsC} vs ${dayC}`)
r = await as(C, `update public.profiles set study_mode = 'easy', coins = 5000 where id = $1`, [C])
check("changing the mode doesn't open the coins column", r.error?.includes('permission denied'), r.error ?? 'no error')

console.log('\nSubjects')
r = await as(A, `insert into public.subjects (name, color) values ('Maths', '#f2a66a') returning id, user_id`)
const maths = r.rows[0]?.id
check('Ana can add a subject, and it belongs to her', r.rows[0]?.user_id === A, r.error ?? '')
r = await as(A, `insert into public.subjects (user_id, name, color) values ($1, 'Sneaky', '#f2a66a')`, [B])
check("Ana can't add a subject for Ben", r.error?.includes('permission denied'), r.error ?? 'no error')
r = await as(A, `insert into public.subjects (name, color) values ('maths', '#9cb59a')`)
check('the same name twice is refused (ignoring capitals)', r.error?.includes('duplicate'), r.error ?? 'no error')
r = await as(A, `insert into public.subjects (name, color) values ('Art', 'red')`)
check('a colour must be like #a1b2c3', r.error?.includes('check'), r.error ?? 'no error')
r = await as(A, `insert into public.subjects (name, color) values ('   ', '#f2a66a')`)
check('an empty name is refused', r.error?.includes('check'), r.error ?? 'no error')
r = await as(B, `select id from public.subjects`)
check("Ben can't see Ana's subjects", r.rows.length === 0, r.error ?? '')
r = await as(B, `update public.subjects set name = 'Hacked' where id = $1 returning id`, [maths])
check("Ben can't rename Ana's subject", r.rows.length === 0)
r = await as(B, `delete from public.subjects where id = $1 returning id`, [maths])
check("Ben can't delete Ana's subject", r.rows.length === 0 && (await admin(`select count(*)::int as n from public.subjects where id = $1`, [maths]))[0].n === 1)
r = await as(A, `update public.subjects set user_id = $2 where id = $1`, [maths, B])
check("Ana can't hand her subject to Ben", r.error?.includes('permission denied'), r.error ?? 'no error')
r = await as(null, `select id from public.subjects`)
check('logged-out visitors see no subjects', r.error !== null || r.rows.length === 0)

const withSubject = await as(A, `select public.start_session(25, $1) as id`, [maths])
const sRow = (await admin(`select subject_id from public.study_sessions where id = $1`, [withSubject.rows[0]?.id]))[0]
const used = (await admin(`select last_used_at from public.subjects where id = $1`, [maths]))[0]
check('start_session stores the subject and marks it last used', sRow?.subject_id === maths && used.last_used_at !== null, withSubject.error ?? '')
const bensSubject = (await as(B, `insert into public.subjects (name, color) values ('Bio', '#7fb3c9') returning id`)).rows[0].id
const openBefore = (await admin(`select count(*)::int as n from public.study_sessions where user_id = $1 and ended_at is null`, [A]))[0].n
r = await as(A, `select public.start_session(25, $1)`, [bensSubject])
const openAfter = (await admin(`select count(*)::int as n from public.study_sessions where user_id = $1 and ended_at is null`, [A]))[0].n
check("Ana can't start a session with Ben's subject (nothing changes)", r.error?.includes('Subject not found') && openBefore === openAfter, r.error ?? 'no error')
r = await as(A, `select public.start_session(25) as id`)
const noSubject = (await admin(`select subject_id from public.study_sessions where id = $1`, [r.rows[0]?.id]))[0]
check('start_session without a subject still works', noSubject && noSubject.subject_id === null, r.error ?? '')
await as(A, `select public.end_session($1, $2)`, [r.rows[0].id, today])
r = await as(A, `delete from public.subjects where id = $1 returning id`, [maths])
const kept = (await admin(`select subject_id from public.study_sessions where id = $1`, [withSubject.rows[0].id]))[0]
check('deleting a subject keeps its sessions (subject becomes empty)', r.rows.length === 1 && kept.subject_id === null, r.error ?? '')
await admin(`update public.game_settings set max_subjects = 2`)
await as(C, `insert into public.subjects (name, color) values ('One', '#f2a66a'), ('Two', '#f2a66a')`)
r = await as(C, `insert into public.subjects (name, color) values ('Three', '#f2a66a')`)
check('at most max_subjects per user', r.error?.includes('at most 2'), r.error ?? 'no error')
await admin(`update public.game_settings set max_subjects = 50`)
r = await as(A, `select public.subjects_limit()`)
check("users can't call the limit function", r.error !== null)

console.log('\nStats for the calendar and the room')
const cSubjects = (await as(C, `select id, name from public.subjects order by name`)).rows
const one = cSubjects.find((x) => x.name === 'One').id
const two = cSubjects.find((x) => x.name === 'Two').id
async function subjectSession(uid, minutes, subjectId) {
  const id = (await as(uid, `select public.start_session($1, $2) as id`, [minutes, subjectId])).rows[0].id
  await backdate(id, minutes)
  return (await as(uid, `select public.end_session($1, $2) as r`, [id, today])).rows[0].r
}
await subjectSession(C, 30, one)
await subjectSession(C, 20, two)
await subjectSession(C, 10, null)
await as(C, `select public.end_session(public.start_session(5), $1::date)`, [today]) // ended at once: 0 minutes
const real = (await admin(
  `select sum(counted_minutes)::int as minutes, sum(coins_awarded)::int as coins, count(*) filter (where counted_minutes > 0)::int as sessions
     from public.study_sessions where user_id = $1 and study_day = $2`, [C, today]))[0]
r = await as(C, `select * from public.daily_totals($1, $1)`, [today])
const dayRow = r.rows[0]
check("daily_totals: today's minutes, coins and sessions match the sessions", dayRow?.minutes === real.minutes && dayRow.coins === real.coins && dayRow.sessions === real.sessions, r.error ?? JSON.stringify({ dayRow, real }))
const bySubject = Object.fromEntries((dayRow?.subjects ?? []).map((x) => [x.name ?? '(none)', x.minutes]))
check('daily_totals: minutes per subject, with names', bySubject.One === 30 && bySubject.Two === 20 && bySubject['(none)'] >= 10, JSON.stringify(dayRow?.subjects))
r = await as(C, `select * from public.daily_totals($1::date - 30, $1::date)`, [today])
check('daily_totals: only days with study time come back', r.rows.length === 1, r.error ?? JSON.stringify(r.rows))
r = await as(B, `select * from public.daily_totals($1, $1)`, [today])
check("Ben's daily_totals don't include Cat's study", r.rows.length === 0, r.error ?? JSON.stringify(r.rows))
r = await as(A, `select * from public.daily_totals('2026-01-01', '2026-03-31')`)
check('daily_totals refuses more than 62 days', r.error?.includes('62 days'), r.error ?? 'no error')
r = await as(A, `select * from public.daily_totals('2026-02-01', '2026-01-01')`)
check('daily_totals refuses an end before the start', r.error?.includes('62 days'), r.error ?? 'no error')
r = await as(null, `select * from public.daily_totals('2026-01-01', '2026-01-31')`)
check("logged-out visitors can't call daily_totals", r.error?.includes('permission denied'), r.error ?? 'no error')
r = await as(C, `select * from public.subject_totals()`)
const totals = Object.fromEntries(r.rows.map((x) => [x.name, x.minutes]))
check('subject_totals: all-time minutes per subject', totals.One === 30 && totals.Two === 20 && r.rows.length === 2, r.error ?? JSON.stringify(r.rows))
r = await as(B, `select * from public.subject_totals()`)
check("Ben's subject_totals show only his subjects", r.rows.length === 1 && r.rows[0].name === 'Bio', JSON.stringify(r.rows))
r = await as(null, `select * from public.subject_totals()`)
check("logged-out visitors can't call subject_totals", r.error?.includes('permission denied'), r.error ?? 'no error')

console.log('\nEach user sees only their own sessions')
const mine = await as(A, `select distinct user_id from public.study_sessions`)
check('Ana only sees her sessions', mine.rows.length === 1 && mine.rows[0].user_id === A)
const bens = await as(B, `select count(*)::int as n from public.study_sessions`)
const bensReal = (await admin(`select count(*)::int as n from public.study_sessions where user_id = $1`, [B]))[0].n
check('Ben sees exactly his sessions', bens.rows[0].n === bensReal)

console.log('\nFirst-login import (once)')
r = await as(B, `select legacy_minutes, breed, outfit from public.import_local_progress(1234, 'calico', 'scarf')`)
check('imports minutes and the cat look', r.rows[0]?.legacy_minutes === 1234 && r.rows[0].breed === 'calico' && r.rows[0].outfit === 'scarf', r.error ?? '')
r = await as(B, `select legacy_minutes, breed from public.import_local_progress(99999, 'white', null)`)
check('a second import changes nothing', r.rows[0]?.legacy_minutes === 1234 && r.rows[0].breed === 'calico')
r = await as(A, `select legacy_minutes from public.import_local_progress(-5, 'not a breed!', 'x y')`)
check('bad values are ignored, not saved', r.rows[0]?.legacy_minutes === 0 && !r.error, r.error ?? '')
const coinsB = (await admin(`select coins, legacy_minutes from public.profiles where id = $1`, [B]))[0]
const earnedB = (await admin(`select sum(coins_awarded)::int as n from public.study_sessions where user_id = $1`, [B]))[0].n
check('imported minutes give no coins (coins = only what sessions earned)', coinsB.legacy_minutes === 1234 && coinsB.coins === earnedB, `${coinsB.coins} vs ${earnedB}`)

console.log('\nAI limits (migration 7)')
r = await as(A, `select public.ai_reserve($1, 'chat')`, [A])
check("users can't take AI calls themselves", r.error?.includes('permission denied'), r.error ?? 'no error')
r = await as(A, `select public.ai_release($1, 'chat')`, [A])
check("users can't give AI calls back (that would be unlimited)", r.error?.includes('permission denied'), r.error ?? 'no error')
r = await as(null, `select public.ai_reserve($1, 'chat')`, [A])
check("logged-out visitors can't either", r.error?.includes('permission denied'), r.error ?? 'no error')
const reserve = async (uid, kind) => (await asService(`select public.ai_reserve($1, $2) as r`, [uid, kind])).rows[0]?.r
const limits = { chat: 30, roadmap: 3, quiz: 10, report: 1 }
for (const [kind, limit] of Object.entries(limits)) {
  let last
  for (let i = 0; i < limit; i++) last = await reserve(A, kind)
  const over = await reserve(A, kind)
  check(`${kind}: ${limit} a day, then refused`, last?.allowed === true && last.used === limit && over?.allowed === false && over.limit === limit, JSON.stringify({ last, over }))
}
check("one user's limit doesn't touch another's", (await reserve(B, 'report'))?.allowed === true)
await asService(`select public.ai_release($1, 'quiz')`, [A])
check('a failed AI call is given back (one more allowed)', (await reserve(A, 'quiz'))?.allowed === true && (await reserve(A, 'quiz'))?.allowed === false)
for (let i = 0; i < 5; i++) await asService(`select public.ai_release($1, 'report')`, [B])
check('giving back never goes below 0', (await admin(`select used from public.ai_usage where user_id = $1 and kind = 'report'`, [B]))[0].used === 0)
r = await asService(`select public.ai_reserve($1, 'poems')`, [A])
check('an unknown kind is refused', r.error?.includes('Unknown AI kind'), r.error ?? 'no error')
await admin(`update public.game_settings set ai_chat_daily_limit = 31`)
check('the limits live in game_settings', (await reserve(A, 'chat'))?.allowed === true && (await reserve(A, 'chat'))?.allowed === false)
await admin(`update public.game_settings set ai_chat_daily_limit = 30`)
r = await as(A, `select kind, used from public.ai_usage`)
check('users see their own AI usage only', r.rows.length === 4 && r.rows.every((x) => x.used > 0), JSON.stringify(r.rows))
r = await as(A, `update public.ai_usage set used = 0`)
check("users can't reset their usage", r.error?.includes('permission denied'), r.error ?? 'no error')
r = await as(A, `insert into public.ai_usage (user_id, day, kind, used) values ($1, '2030-01-01', 'chat', 0)`, [A])
check("users can't add usage rows", r.error?.includes('permission denied'), r.error ?? 'no error')

console.log('\nChat messages (migration 8)')
r = await as(A, `insert into public.chat_messages (user_id, role, text) values ($1, 'cat', 'I am the cat')`, [A])
check("users can't write the cat's lines", r.error?.includes('permission denied'), r.error ?? 'no error')
r = await asService(
  `insert into public.chat_messages (user_id, role, text, meta) values ($1, 'user', 'hi', '{}'), ($1, 'cat', 'mrrp', '{"suggest":"quiz"}'), ($2, 'user', 'ben here', '{}')`,
  [A, B],
)
check('the chat function saves messages', !r.error, r.error ?? '')
r = await as(A, `select text from public.chat_messages order by id`)
check('Ana reads only her chat', r.rows.length === 2 && r.rows[1].text === 'mrrp', JSON.stringify(r.rows))
r = await as(A, `delete from public.chat_messages returning id`)
check('Ana can clear her chat', r.rows.length === 2 && (await admin(`select count(*)::int as n from public.chat_messages where user_id = $1`, [A]))[0].n === 0)
check("clearing doesn't touch Ben's chat", (await admin(`select count(*)::int as n from public.chat_messages where user_id = $1`, [B]))[0].n === 1)
r = await asService(`insert into public.chat_messages (user_id, role, text) values ($1, 'user', $2)`, [A, 'x'.repeat(8001)])
check('a message over 8000 characters is refused', r.error !== null)

console.log('\nGoals (migration 8)')
const goalSql = `insert into public.goals (kind, title, deadline, hours_per_day, subjects) values ($1, $2, $3, $4, $5) returning id, user_id`
r = await as(A, goalSql, ['neet', 'NEET UG 2027', '2027-05-02', 6, JSON.stringify([{ name: 'Physics', level: 'weak' }])])
const goalA = r.rows[0]?.id
check('Ana sets a goal (it is hers automatically)', r.rows[0]?.user_id === A, r.error ?? '')
r = await as(A, goalSql, ['jee_main', 'JEE', '2027-01-20', 5, '[]'])
check('only one active goal at a time', r.error?.includes('duplicate') || r.error?.includes('unique'), r.error ?? 'no error')
r = await as(A, `insert into public.goals (user_id, kind, title, deadline, hours_per_day) values ($1, 'neet', 'x', '2027-05-02', 4)`, [B])
check("Ana can't make a goal for Ben", r.error?.includes('permission denied'), r.error ?? 'no error')
r = await as(B, goalSql, ['custom', 'Learn Spanish', '2027-03-01', 0.25, '[]'])
check('less than half an hour a day is refused', r.error?.includes('check'), r.error ?? 'no error')
r = await as(B, goalSql, ['custom', 'Learn Spanish', '2027-03-01', 1, '[]'])
const goalB = r.rows[0]?.id
r = await as(A, `update public.goals set hours_per_day = 7, done_chapters = '{phy_units}' where id = $1 returning hours_per_day`, [goalA])
check('Ana can change her goal', Number(r.rows[0]?.hours_per_day) === 7, r.error ?? '')
r = await as(A, `update public.goals set hours_per_day = 1 where id = $1 returning id`, [goalB])
check("Ana can't change Ben's goal", r.rows.length === 0)
r = await as(A, `select id from public.goals`)
check('Ana sees only her goal', r.rows.length === 1 && r.rows[0].id === goalA)
r = await as(A, `update public.goals set user_id = $2 where id = $1`, [goalA, B])
check("a goal can't be moved to someone else", r.error?.includes('permission denied'), r.error ?? 'no error')

console.log(`\n${passed} passed, ${failures.length} failed`)
if (failures.length) {
  console.log('Failed:\n - ' + failures.join('\n - '))
  process.exit(1)
}
