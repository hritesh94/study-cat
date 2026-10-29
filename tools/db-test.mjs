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
  create schema auth;
  create table auth.users (id uuid primary key, email text, raw_user_meta_data jsonb not null default '{}');
  create function auth.uid() returns uuid language sql stable
    as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
  grant usage on schema auth, public to anon, authenticated;
  grant execute on function auth.uid() to anon, authenticated;
  -- Supabase's defaults: new tables and functions are open to everyone
  alter default privileges in schema public grant all on tables to anon, authenticated;
  alter default privileges in schema public grant execute on functions to anon, authenticated;
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

console.log(`\n${passed} passed, ${failures.length} failed`)
if (failures.length) {
  console.log('Failed:\n - ' + failures.join('\n - '))
  process.exit(1)
}
