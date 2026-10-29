-- ════════════════════════════════════════════════════════════════════
-- Study Cat · migration 9 · ROADMAPS + BONUS COINS (daily goal)
-- Paste into Supabase → SQL Editor → New query → Run, after file 8.
-- ════════════════════════════════════════════════════════════════════

-- ── the numbers ───────────────────────────────────────────────────────
alter table public.game_settings
  add column daily_goal_bonus_coins integer not null default 15 check (daily_goal_bonus_coins >= 0),
  -- one lighter day a week: this much of the usual daily target
  add column goal_light_day_pct integer not null default 50 check (goal_light_day_pct between 0 and 100);

-- ── roadmaps: the AI's big-picture plan for a goal ────────────────────
-- Written only by the roadmap Edge Function (the plan is checked there).
-- Spreading it over the days is done by the app, not stored.
create table public.roadmaps (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  goal_id uuid not null references public.goals (id) on delete cascade,
  -- { feasibility, chapters: [{ id, subject, name, hours, priority }], phases, milestones }
  plan jsonb not null check (jsonb_typeof(plan) = 'object' and pg_column_size(plan) < 100000),
  created_at timestamptz not null default now()
);
create index roadmaps_goal_time on public.roadmaps (goal_id, created_at desc);

alter table public.roadmaps enable row level security;
revoke all on public.roadmaps from anon, authenticated;
grant select, delete on public.roadmaps to authenticated;
create policy "Users read their own roadmaps"
  on public.roadmaps for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "Users delete their own roadmaps"
  on public.roadmaps for delete to authenticated
  using ((select auth.uid()) = user_id);

-- ── bonus_coins: coins that don't come from a study session ───────────
-- 'daily_goal' (once per day) and 'quiz' (once per quiz, file 10). They
-- count toward the same daily cap as session coins.
create table public.bonus_coins (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  day date not null,
  kind text not null check (kind in ('daily_goal', 'quiz')),
  coins integer not null check (coins >= 0),
  ref uuid, -- the quiz it was for
  created_at timestamptz not null default now()
);
create unique index bonus_coins_one_goal_a_day on public.bonus_coins (user_id, day) where kind = 'daily_goal';
create unique index bonus_coins_one_per_quiz on public.bonus_coins (ref) where kind = 'quiz';

alter table public.bonus_coins enable row level security;
revoke all on public.bonus_coins from anon, authenticated;
grant select on public.bonus_coins to authenticated;
create policy "Users read their own bonus coins"
  on public.bonus_coins for select to authenticated
  using ((select auth.uid()) = user_id);

-- ── helpers (used inside the functions below; nobody calls them directly) ─
-- Which day a coin counts for: the browser's own date, trusted only within
-- local_day_tolerance_days of the server's UTC date and never earlier than a
-- day this user already used (the same rule as end_session).
create function public._coin_day(p_user uuid, p_local_day date)
returns date
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  s public.game_settings;
  v_utc date := (now() at time zone 'utc')::date;
  v_day date;
  v_last date;
begin
  select * into s from public.game_settings where id;
  v_day := least(greatest(coalesce(p_local_day, v_utc), v_utc - s.local_day_tolerance_days),
                 v_utc + s.local_day_tolerance_days);
  select max(study_day) into v_last from public.study_sessions where user_id = p_user and study_day is not null;
  if v_last is not null and v_day < v_last then
    v_day := v_last;
  end if;
  return v_day;
end;
$$;

-- every coin earned on a day (sessions + bonuses): what the daily cap counts
create function public._day_coins(p_user uuid, p_day date)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select (select coalesce(sum(coins_awarded), 0) from public.study_sessions where user_id = p_user and study_day = p_day)::integer
       + (select coalesce(sum(coins), 0) from public.bonus_coins where user_id = p_user and day = p_day)::integer;
$$;

-- the daily target in minutes: hours per day, less on the light weekday,
-- and never under the streak's minutes. (src/ai/schedule.js does the same.)
create function public._goal_target(p_goal public.goals, p_day date)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select greatest(s.streak_min_minutes,
                  round(p_goal.hours_per_day * 60
                        * case when extract(dow from p_day)::integer = p_goal.light_weekday
                               then s.goal_light_day_pct / 100.0 else 1 end)::integer)
    from public.game_settings s where s.id;
$$;

revoke execute on function public._coin_day(uuid, date) from public, anon, authenticated;
revoke execute on function public._day_coins(uuid, date) from public, anon, authenticated;
revoke execute on function public._goal_target(public.goals, date) from public, anon, authenticated;

-- ── claim_daily_goal(local_day) → result as JSON ──────────────────────
-- Hit today's target (from your active goal)? +15 coins, once per day,
-- within the daily cap. The minutes come from the server's own sessions.
create function public.claim_daily_goal(p_local_day date)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  s public.game_settings;
  v_goal public.goals;
  v_day date;
  v_target integer;
  v_minutes integer;
  v_day_coins integer;
  v_coins integer;
  v_total integer;
begin
  if v_user is null then
    raise exception 'Not logged in' using errcode = '28000';
  end if;
  select * into s from public.game_settings where id;
  perform 1 from public.profiles where id = v_user for update; -- one claim at a time

  select * into v_goal from public.goals where user_id = v_user and active;
  if not found then
    return jsonb_build_object('hit', false, 'reason', 'no_goal');
  end if;
  v_day := public._coin_day(v_user, p_local_day);
  if v_day > v_goal.deadline then
    return jsonb_build_object('hit', false, 'reason', 'after_deadline');
  end if;

  v_target := public._goal_target(v_goal, v_day);
  select coalesce(sum(counted_minutes), 0) into v_minutes
    from public.study_sessions where user_id = v_user and study_day = v_day;
  if v_minutes < v_target then
    return jsonb_build_object('hit', false, 'day', v_day, 'minutes', v_minutes, 'target', v_target);
  end if;
  if exists (select 1 from public.bonus_coins where user_id = v_user and day = v_day and kind = 'daily_goal') then
    return jsonb_build_object('hit', true, 'already', true, 'coins_awarded', 0, 'day', v_day, 'minutes', v_minutes, 'target', v_target);
  end if;

  v_day_coins := public._day_coins(v_user, v_day);
  v_coins := greatest(0, least(s.daily_goal_bonus_coins, s.daily_coin_cap - v_day_coins));
  insert into public.bonus_coins (user_id, day, kind, coins) values (v_user, v_day, 'daily_goal', v_coins);
  update public.profiles set coins = coins + v_coins where id = v_user returning coins into v_total;

  return jsonb_build_object(
    'hit', true,
    'already', false,
    'coins_awarded', v_coins,
    'capped', v_coins < s.daily_goal_bonus_coins,
    'coins', v_total,
    'day', v_day,
    'minutes', v_minutes,
    'target', v_target
  );
end;
$$;

revoke execute on function public.claim_daily_goal(date) from public, anon;
grant execute on function public.claim_daily_goal(date) to authenticated;

-- ── end_session: bonus coins now count toward the daily cap too ───────
-- Exactly file 4's function, except the line marked ★.
create or replace function public.end_session(p_session_id uuid, p_local_day date, p_leave_count integer default 0)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  s public.game_settings;
  v_profile public.profiles;
  v_session public.study_sessions;
  v_now timestamptz := now();
  v_utc date := (now() at time zone 'utc')::date;
  v_day date;
  v_last_day date;
  v_seconds numeric;
  v_counted integer;
  v_full boolean;
  v_raw integer;
  v_leaves integer;
  v_penalty integer;
  v_after_penalty integer;
  v_coins integer;
  v_day_coins integer;
  v_day_minutes_before integer;
  v_day_minutes integer;
  v_streak integer;
  v_streak_day date;
begin
  if v_user is null then
    raise exception 'Not logged in' using errcode = '28000';
  end if;
  select * into s from public.game_settings where id;

  -- lock the profile first, so two end_session calls can't race
  select * into v_profile from public.profiles where id = v_user for update;
  select * into v_session from public.study_sessions
   where id = p_session_id and user_id = v_user
   for update;
  if not found then
    raise exception 'Session not found' using errcode = 'P0002';
  end if;
  if v_session.ended_at is not null then
    raise exception 'Session already ended' using errcode = '22023';
  end if;

  -- which day does this count for?
  v_day := least(greatest(coalesce(p_local_day, v_utc), v_utc - s.local_day_tolerance_days),
                 v_utc + s.local_day_tolerance_days);
  select max(study_day) into v_last_day
    from public.study_sessions
   where user_id = v_user and study_day is not null;
  if v_last_day is not null and v_day < v_last_day then
    v_day := v_last_day; -- no going back in time
  end if;

  -- minutes and coins, from server time only
  v_seconds := extract(epoch from (v_now - v_session.started_at));
  v_counted := greatest(0, least(v_session.planned_minutes, floor((v_seconds + s.grace_seconds) / 60)::integer));
  v_full := v_seconds + s.grace_seconds >= v_session.planned_minutes * 60;
  v_raw := v_counted * s.coins_per_minute
         + case when v_full and v_session.planned_minutes >= s.bonus_min_planned_minutes
                then s.full_session_bonus else 0 end;

  -- leaving the tab: the penalty depends on the SAVED mode
  v_leaves := least(greatest(coalesce(p_leave_count, 0), 0), s.max_leave_count);
  v_penalty := case v_profile.study_mode
    when 'medium' then (v_raw * s.medium_leave_penalty_pct * greatest(0, v_leaves - s.medium_free_leaves)) / 100
    when 'toxic' then s.toxic_leave_penalty_coins * v_leaves
    else 0
  end;
  v_after_penalty := greatest(0, v_raw - v_penalty);
  v_penalty := v_raw - v_after_penalty; -- what was really taken (never more than the session had)

  select coalesce(sum(counted_minutes), 0)
    into v_day_minutes_before
    from public.study_sessions
   where user_id = v_user and study_day = v_day;
  v_day_coins := public._day_coins(v_user, v_day); -- ★ sessions AND bonus coins
  v_coins := greatest(0, least(v_after_penalty, s.daily_coin_cap - v_day_coins));

  update public.study_sessions
     set ended_at = v_now, counted_minutes = v_counted, coins_awarded = v_coins, study_day = v_day,
         study_mode = v_profile.study_mode, leave_count = v_leaves, penalty_coins = v_penalty
   where id = v_session.id;

  -- streak: a day counts once its total reaches streak_min_minutes
  v_day_minutes := v_day_minutes_before + v_counted;
  v_streak := v_profile.current_streak;
  v_streak_day := v_profile.last_study_day;
  if v_streak_day is not null and v_streak_day < v_day - 1 then
    v_streak := 0; -- a day was missed
  end if;
  if v_day_minutes >= s.streak_min_minutes and v_day_minutes_before < s.streak_min_minutes then
    v_streak := case when v_streak_day = v_day - 1 then v_profile.current_streak + 1 else 1 end;
    v_streak_day := v_day;
  end if;

  update public.profiles
     set coins = coins + v_coins,
         current_streak = v_streak,
         best_streak = greatest(best_streak, v_streak),
         last_study_day = v_streak_day
   where id = v_user
  returning * into v_profile;

  return jsonb_build_object(
    'session_id', v_session.id,
    'study_day', v_day,
    'counted_minutes', v_counted,
    'full', v_full,
    'coins_awarded', v_coins,
    'capped', v_coins < v_after_penalty,
    'day_coins', v_day_coins + v_coins,
    'daily_coin_cap', s.daily_coin_cap,
    'day_minutes', v_day_minutes,
    'coins', v_profile.coins,
    'current_streak', v_profile.current_streak,
    'best_streak', v_profile.best_streak,
    'last_study_day', v_profile.last_study_day,
    'study_mode', v_profile.study_mode,
    'leave_count', v_leaves,
    'session_coins', v_raw,
    'penalty_coins', v_penalty
  );
end;
$$;

-- ── daily_totals: + bonus coins in "coins", + goal_hit (the 👑) ────────
drop function public.daily_totals(date, date);

create function public.daily_totals(p_from date, p_to date)
returns table (day date, minutes integer, coins integer, sessions integer, subjects jsonb, goal_hit boolean)
language plpgsql
stable
security invoker
set search_path = ''
as $$
#variable_conflict use_column
begin
  if auth.uid() is null then
    raise exception 'Not logged in' using errcode = '28000';
  end if;
  if p_from is null or p_to is null or p_to < p_from or p_to - p_from > 61 then
    raise exception 'Ask for 1 to 62 days at a time' using errcode = '22023';
  end if;
  return query
  with done as (
    select ss.study_day, ss.counted_minutes, ss.coins_awarded, ss.subject_id
      from public.study_sessions ss
     where ss.user_id = auth.uid()
       and ss.ended_at is not null
       and ss.counted_minutes > 0 -- a Start-then-Pause with nothing counted isn't a session
       and ss.study_day between p_from and p_to
  ),
  per_subject as (
    select d.study_day, d.subject_id, sum(d.counted_minutes)::integer as minutes
      from done d
     group by d.study_day, d.subject_id
  ),
  bonus as (
    select b.day, sum(b.coins)::integer as coins, bool_or(b.kind = 'daily_goal') as goal_hit
      from public.bonus_coins b
     where b.user_id = auth.uid() and b.day between p_from and p_to
     group by b.day
  ),
  per_day as (
    select d.study_day as day, sum(d.counted_minutes)::integer as minutes,
           sum(d.coins_awarded)::integer as coins, count(*)::integer as sessions
      from done d
     group by d.study_day
  )
  select coalesce(t.day, b.day),
         coalesce(t.minutes, 0),
         coalesce(t.coins, 0) + coalesce(b.coins, 0),
         coalesce(t.sessions, 0),
         coalesce((
           select jsonb_agg(jsonb_build_object('subject_id', p.subject_id, 'name', sub.name, 'color', sub.color, 'minutes', p.minutes)
                            order by p.minutes desc)
             from per_subject p
             left join public.subjects sub on sub.id = p.subject_id
            where p.study_day = t.day
         ), '[]'::jsonb),
         coalesce(b.goal_hit, false)
    from per_day t
    full join bonus b on b.day = t.day
   order by 1;
end;
$$;

revoke execute on function public.daily_totals(date, date) from public, anon;
grant execute on function public.daily_totals(date, date) to authenticated;
