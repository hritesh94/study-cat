-- ════════════════════════════════════════════════════════════════════
-- Study Cat · migration 4 · STUDY MODES (Easy, Medium, Toxic)
-- Paste into Supabase → SQL Editor → New query → Run, after file 3.
-- ════════════════════════════════════════════════════════════════════
--
-- Easy   = leaving the tab costs nothing (like before).
-- Medium = the first 2 leaves per session are free; each leave after that
--          removes 10% of that session's coins.
-- Toxic  = every leave removes 5 coins from that session.
--
-- The browser only says HOW MANY times it left (p_leave_count). The server
-- works out the coins from the mode saved on the profile. Sending a smaller
-- number can only ever give back what the normal rules give; the browser
-- can never send a coin amount.

-- ── the numbers, next to the other tunables ───────────────────────────
alter table public.game_settings
  add column medium_free_leaves integer not null default 2 check (medium_free_leaves >= 0),
  add column medium_leave_penalty_pct integer not null default 10 check (medium_leave_penalty_pct between 0 and 100),
  add column toxic_leave_penalty_coins integer not null default 5 check (toxic_leave_penalty_coins >= 0),
  add column max_leave_count integer not null default 1000 check (max_leave_count >= 0);

-- ── the mode lives on the profile; the user may change it themselves ──
alter table public.profiles
  add column study_mode text not null default 'easy' check (study_mode in ('easy', 'medium', 'toxic'));
grant update (study_mode) on public.profiles to authenticated;
-- (the "Users update their own profile" policy from file 2 already limits
--  this to their own row)

-- ── what each session's leaves cost (for the summary and history) ─────
alter table public.study_sessions
  add column study_mode text check (study_mode is null or study_mode in ('easy', 'medium', 'toxic')),
  add column leave_count integer not null default 0 check (leave_count >= 0),
  add column penalty_coins integer not null default 0 check (penalty_coins >= 0);

-- ── end_session, now with p_leave_count ───────────────────────────────
-- Same rules as file 3 (server time, planned-minutes cap, 25-minute bonus
-- rule, daily cap, date checks, streaks), plus the leave penalty, which is
-- taken off the session's coins BEFORE the daily cap.
drop function public.end_session(uuid, date);

create function public.end_session(p_session_id uuid, p_local_day date, p_leave_count integer default 0)
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

  select coalesce(sum(coins_awarded), 0), coalesce(sum(counted_minutes), 0)
    into v_day_coins, v_day_minutes_before
    from public.study_sessions
   where user_id = v_user and study_day = v_day;
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

revoke execute on function public.end_session(uuid, date, integer) from public, anon;
grant execute on function public.end_session(uuid, date, integer) to authenticated;
