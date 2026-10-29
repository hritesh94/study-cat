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
import { dayTarget } from '../src/ai/schedule.js'
import { NEET_PG } from '../src/data/syllabus/neet-pg.js'

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

console.log('\nRoadmaps (migration 9)')
r = await as(A, `insert into public.roadmaps (user_id, goal_id, plan) values ($1, $2, '{}') returning id`, [A, goalA])
check("users can't write roadmaps (only the roadmap function)", r.error?.includes('permission denied'), r.error ?? 'no error')
r = await asService(`insert into public.roadmaps (user_id, goal_id, plan) values ($1, $2, $3) returning id`, [A, goalA, JSON.stringify({ chapters: [] })])
check('the roadmap function saves a roadmap', r.rows.length === 1, r.error ?? '')
check('Ana reads her roadmap', (await as(A, `select id from public.roadmaps`)).rows.length === 1)
check("Ben can't read Ana's roadmap", (await as(B, `select id from public.roadmaps`)).rows.length === 0)

console.log('\nDaily goal bonus (+15, once a day, inside the daily cap)')
const D = '44444444-4444-4444-4444-444444444444'
await admin(`insert into auth.users (id, email) values ($1, 'dee@example.com')`, [D])
const claim = async (uid, day = today) => (await as(uid, `select public.claim_daily_goal($1) as r`, [day])).rows[0]?.r
const coinsOf = async (uid) => (await admin(`select coins from public.profiles where id = $1`, [uid]))[0].coins
check('no goal → nothing to claim', (await claim(D))?.reason === 'no_goal')
const dow = (await admin(`select extract(dow from $1::date)::int as d`, [today]))[0].d
r = await as(D, `insert into public.goals (kind, title, deadline, hours_per_day, light_weekday) values ('custom', 'Spanish', $1, 1, $2) returning id`, [
  await utcDay(60),
  (dow + 1) % 7, // the lighter day is tomorrow, so today's target is the full hour
])
const goalD = r.rows[0]?.id
await session(D, 30, 30, today)
let c = await claim(D)
check('30 of 60 minutes: not yet', c?.hit === false && c.minutes === 30 && c.target === 60, JSON.stringify(c))
await session(D, 30, 30, today)
const beforeBonus = await coinsOf(D)
c = await claim(D)
check('60 of 60 minutes: +15 coins', c?.hit === true && c.coins_awarded === 15 && (await coinsOf(D)) === beforeBonus + 15, JSON.stringify(c))
c = await claim(D)
check('only once a day', c?.hit === true && c.already === true && c.coins_awarded === 0 && (await coinsOf(D)) === beforeBonus + 15)
r = await as(D, `select kind, coins from public.bonus_coins`)
check('Dee sees her bonus', r.rows.length === 1 && r.rows[0].coins === 15)
check("Ana doesn't see Dee's bonus", (await as(A, `select id from public.bonus_coins`)).rows.length === 0)
r = await as(D, `insert into public.bonus_coins (user_id, day, kind, coins) values ($1, $2, 'quiz', 500)`, [D, today])
check("users can't give themselves bonus coins", r.error?.includes('permission denied'), r.error ?? 'no error')
r = await as(D, `select * from public.daily_totals($1, $1)`, [today])
check('daily_totals: the 👑 and the bonus in the day\'s coins', r.rows[0]?.goal_hit === true && r.rows[0].coins === beforeBonus + 15, JSON.stringify(r.rows))
r = await as(A, `select * from public.daily_totals($1, $1)`, [today])
check('no crown on a day without the bonus', r.rows[0]?.goal_hit === false, JSON.stringify(r.rows))

// bonus coins count toward the daily cap, for sessions too
const dayCoins = beforeBonus + 15
await admin(`update public.game_settings set daily_coin_cap = $1`, [dayCoins + 5])
const capped = await session(D, 20, 20, today)
check('bonus coins count toward the daily cap (a 20-minute session gets only 5)', capped.coins_awarded === 5 && capped.capped === true, JSON.stringify(capped))
await admin(`update public.game_settings set daily_coin_cap = 300`)

const E = '55555555-5555-5555-5555-555555555555'
await admin(`insert into auth.users (id, email) values ($1, 'eve@example.com')`, [E])
await as(E, `insert into public.goals (kind, title, deadline, hours_per_day, light_weekday) values ('custom', 'x', $1, 0.5, $2)`, [await utcDay(30), (dow + 1) % 7])
await admin(`update public.game_settings set daily_coin_cap = 34`) // a 25-minute session earns 25 + 10
await session(E, 25, 25, today)
await session(E, 5, 5, today)
c = await claim(E)
check('the bonus itself stops at the daily cap', c?.hit === true && c.coins_awarded === 0 && c.capped === true, JSON.stringify(c))
await admin(`update public.game_settings set daily_coin_cap = 300`)
r = await as(E, `select * from public.daily_totals($1, $1)`, [today])
check('…but the day still gets its crown', r.rows[0]?.goal_hit === true)

// the server's daily target is the same as the app's (src/ai/schedule.js)
const targets = []
for (const [hours, light] of [[6, dow], [6, (dow + 3) % 7], [0.5, dow], [2.5, dow], [7.25, (dow + 1) % 7], [16, dow]]) {
  await admin(`update public.goals set hours_per_day = $2, light_weekday = $3 where id = $1`, [goalD, hours, light])
  const sql = (await admin(`select public._goal_target(g, $2::date) as t from public.goals g where g.id = $1`, [goalD, today]))[0].t
  const js = dayTarget({ hours_per_day: hours, light_weekday: light }, today, { goal_light_day_pct: 50, streak_min_minutes: 25 })
  targets.push(`${hours}h:${sql}/${js}`)
  if (sql !== js) check(`target for ${hours} h (light day ${light === dow})`, false, `SQL ${sql}, app ${js}`)
}
check('the daily target is the same in SQL and in the app (incl. the lighter day)', targets.every((t) => t.split(':')[1].split('/')[0] === t.split('/')[1]), targets.join(' '))

await admin(`update public.goals set deadline = $2 where id = $1`, [goalD, await utcDay(-1)])
check('no bonus after the deadline', (await claim(D))?.reason === 'after_deadline')
r = await as(D, `select public._day_coins($1, $2)`, [D, today])
check("users can't call the helper functions", r.error?.includes('permission denied'), r.error ?? 'no error')
r = await as(null, `select public.claim_daily_goal($1)`, [today])
check("logged-out visitors can't claim", r.error?.includes('permission denied'), r.error ?? 'no error')

console.log('\nBreak quiz (migration 10)')
const questions = JSON.stringify([
  { q: 'One?', options: ['a', 'b', 'c', 'd'], answer: 1, explain: 'b is one' },
  { q: 'Two?', options: ['a', 'b', 'c', 'd'], answer: 2, explain: 'c is two' },
  { q: 'Three?', options: ['a', 'b', 'c'], answer: 0, explain: 'a is three' },
])
r = await as(D, `insert into public.quizzes (user_id, topic, questions) values ($1, 'x', $2)`, [D, questions])
check("users can't write quizzes (only the quiz function)", r.error?.includes('permission denied'), r.error ?? 'no error')
const makeQuiz = async (uid) => (await asService(`insert into public.quizzes (user_id, topic, questions) values ($1, 'Optics', $2) returning id`, [uid, questions])).rows[0].id
const quizD = await makeQuiz(D)
r = await as(D, `select questions from public.quizzes`)
check("users can't read a quiz's questions (they hold the answers)", r.error?.includes('permission denied'), r.error ?? 'no error')
r = await as(D, `select id, topic from public.quizzes`)
check('…but they can see their quizzes', r.rows.length === 1 && r.rows[0].topic === 'Optics')
const answer = async (uid, id, choice) => as(uid, `select public.answer_quiz($1, $2, $3) as r`, [id, choice, today])
r = await answer(A, quizD, 1)
check("Ana can't answer Dee's quiz", r.error?.includes('not found'), r.error ?? 'no error')
r = await answer(D, quizD, 9)
check('an answer that is not one of the options is refused', r.error?.includes('No such answer'), r.error ?? 'no error')
const coinsBeforeQuiz = await coinsOf(D)
let a1 = (await answer(D, quizD, 1)).rows[0]?.r
check('a right answer: correct, with the explanation', a1?.correct === true && a1.explain === 'b is one' && !a1.finished && a1.coins_awarded === 0, JSON.stringify(a1))
a1 = (await answer(D, quizD, 0)).rows[0]?.r
check('a wrong answer: shows the right one', a1?.correct === false && a1.answer === 2 && a1.score === 1, JSON.stringify(a1))
check('no coins before the quiz is finished', (await coinsOf(D)) === coinsBeforeQuiz)
await admin(`update public.game_settings set daily_coin_cap = 99999`)
a1 = (await answer(D, quizD, 0)).rows[0]?.r
check('finishing gives +5 coins (right or wrong)', a1?.finished === true && a1.coins_awarded === 5 && a1.score === 2 && (await coinsOf(D)) === coinsBeforeQuiz + 5, JSON.stringify(a1))
r = await answer(D, quizD, 0)
check('a finished quiz takes no more answers (no coins twice)', r.error?.includes('already finished') && (await coinsOf(D)) === coinsBeforeQuiz + 5, r.error ?? 'no error')
check('the bonus is recorded once', (await admin(`select count(*)::int as n from public.bonus_coins where ref = $1`, [quizD]))[0].n === 1)
await admin(`update public.game_settings set daily_coin_cap = 300`)
// the quiz bonus counts toward the daily cap
const quizE = await makeQuiz(E)
await admin(`update public.game_settings set daily_coin_cap = (select public._day_coins($1, $2::date)) + 2`, [E, today])
for (const choice of [1, 2]) await answer(E, quizE, choice)
a1 = (await answer(E, quizE, 0)).rows[0]?.r
check('the quiz bonus stops at the daily cap (only 2 left)', a1?.coins_awarded === 2 && a1.capped === true, JSON.stringify(a1))
await admin(`update public.game_settings set daily_coin_cap = 300`)
const old = await makeQuiz(D)
await admin(`update public.quizzes set created_at = now() - interval '7 hours' where id = $1`, [old])
r = await answer(D, old, 1)
check('a quiz older than 6 hours expires', r.error?.includes('expired'), r.error ?? 'no error')
r = await as(null, `select public.answer_quiz($1, 0, $2)`, [quizD, today])
check("logged-out visitors can't answer", r.error?.includes('permission denied'), r.error ?? 'no error')

console.log('\nWeekly report (migration 11)')
const monday = (await admin(`select date_trunc('week', $1::date)::date::text as d`, [today]))[0].d
const week = async (uid, start = monday) => as(uid, `select public.week_stats($1) as w`, [start])
r = await week(D)
const w = r.rows[0]?.w
const realD = (await admin(`select coalesce(sum(counted_minutes), 0)::int as m, count(*)::int as n from public.study_sessions where user_id = $1 and ended_at is not null and counted_minutes > 0 and study_day between $2::date and $2::date + 6`, [D, monday]))[0]
check("week_stats: the week's minutes and sessions", w?.minutes === realD.m && w.sessions === realD.n && w.minutes > 0, JSON.stringify({ w, realD }))
check('week_stats: days, best day, subjects, coins incl. bonuses, goal days', w?.days_studied === 1 && w.best_day?.minutes === realD.m && Array.isArray(w.subjects) && w.goal_days === 1 && w.coins >= 15, JSON.stringify(w))
r = await week(B)
const realB = (await admin(`select count(*)::int as n from public.study_sessions where user_id = $1 and ended_at is not null and counted_minutes > 0 and study_day between $2::date and $2::date + 6`, [B, monday]))[0].n
check('week_stats only counts your own sessions', r.rows[0]?.w.sessions === realB, JSON.stringify(r.rows[0]?.w))
r = await week(D, (await admin(`select ($1::date + 1)::text as d`, [monday]))[0].d) // a Tuesday
check('a week must start on a Monday', r.error?.includes('Monday'), r.error ?? 'no error')
r = await as(null, `select public.week_stats($1)`, [monday])
check("logged-out visitors can't call week_stats", r.error?.includes('permission denied'), r.error ?? 'no error')
r = await as(D, `insert into public.weekly_reports (user_id, week_start, stats, summary, tip) values ($1, $2, '{}', 'x', 'y')`, [D, monday])
check("users can't write their own report (only the report function)", r.error?.includes('permission denied'), r.error ?? 'no error')
r = await asService(`insert into public.weekly_reports (user_id, week_start, stats, summary, tip) values ($1, $2, $3, 'A good week!', 'Keep going.') returning id`, [D, monday, JSON.stringify(w)])
check('the report function saves a report', r.rows.length === 1, r.error ?? '')
r = await asService(`insert into public.weekly_reports (user_id, week_start, stats, summary, tip) values ($1, $2, '{}', 'again', 'again')`, [D, monday])
check('one report per week', r.error?.includes('duplicate') || r.error?.includes('unique'), r.error ?? 'no error')
check('Dee reads her report, Ana does not', (await as(D, `select summary from public.weekly_reports`)).rows.length === 1 && (await as(A, `select summary from public.weekly_reports`)).rows.length === 0)

console.log('\nNEET PG goals (migration 12)')
const F = '66666666-6666-6666-6666-666666666666'
await admin(`insert into auth.users (id, email) values ($1, 'fay@example.com')`, [F])
r = await as(F, `insert into public.goals (kind, title, deadline, hours_per_day, chapters) values ('neet_pg', 'NEET PG 2027', '2027-08-15', 8, $1) returning kind, jsonb_array_length(chapters) as n`, [JSON.stringify(NEET_PG.chapters)])
check('a NEET PG goal with all its topics can be saved', r.rows[0]?.kind === 'neet_pg' && r.rows[0].n === NEET_PG.chapters.length, r.error ?? '')
r = await as(F, `update public.goals set kind = 'mbbs' where user_id = $1`, [F])
check('goal types are still a fixed list', r.error !== null)

console.log('\nPersonality, language, spicy (migration 13)')
r = await admin(`select personality, language, spicy, study_mode from public.profiles where id = $1`, [F])
check('new profiles: sweet, English, not spicy (strictness unchanged)', r[0].personality === 'sweet' && r[0].language === 'en' && r[0].spicy === false && r[0].study_mode === 'easy', JSON.stringify(r[0]))
r = await as(F, `update public.profiles set personality = 'diva', language = 'hinglish', spicy = true where id = $1 returning personality, language, spicy`, [F])
check('you can change your own personality, language and spicy', r.rows[0]?.personality === 'diva' && r.rows[0].language === 'hinglish' && r.rows[0].spicy === true, r.error ?? '')
r = await as(F, `update public.profiles set personality = 'evil' where id = $1`, [F])
check('only the 4 personalities', r.error?.includes('check'), r.error ?? 'no error')
r = await as(F, `update public.profiles set language = 'fr' where id = $1`, [F])
check("only 'en' and 'hinglish'", r.error?.includes('check'), r.error ?? 'no error')
r = await as(A, `update public.profiles set personality = 'savage' where id = $1 returning id`, [F])
check("you can't change someone else's personality", r.rows.length === 0 && (await admin(`select personality from public.profiles where id = $1`, [F]))[0].personality === 'diva')
r = await as(F, `update public.profiles set personality = 'gang', coins = 99999 where id = $1`, [F])
check('the new grants don\'t open coins', r.error?.includes('permission denied'), r.error ?? 'no error')

console.log(`\n${passed} passed, ${failures.length} failed`)
if (failures.length) {
  console.log('Failed:\n - ' + failures.join('\n - '))
  process.exit(1)
}
