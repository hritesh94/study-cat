-- ════════════════════════════════════════════════════════════════════
-- Study Cat · migration 3 of 3 · FUNCTIONS (sign-up trigger + anti-cheat)
-- Paste into Supabase → SQL Editor → New query → Run, after file 2.
-- ════════════════════════════════════════════════════════════════════
--
-- "security definer" = the function runs with its owner's rights, so it can
-- change coins/streaks even though the browser can't. That's why every
-- function checks auth.uid() itself and only ever touches that user's rows.
-- "set search_path = ''" + fully written names (public.profiles) stop anyone
-- from swapping in look-alike tables.

-- ── A new user signs up → create their profile ────────────────────────
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(
      nullif(left(trim(new.raw_user_meta_data ->> 'display_name'), 40), ''),
      nullif(left(split_part(coalesce(new.email, ''), '@', 1), 40), ''),
      'Cat friend'
    )
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ── start_session(planned_minutes) → session id ───────────────────────
-- The server writes started_at = now(); the browser can't choose it.
-- If an older session was never ended (tab closed, crash), it's closed
-- first with nothing counted, so there's only ever one open session.
create or replace function public.start_session(p_planned_minutes integer)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  s public.game_settings;
  v_id uuid;
begin
  if v_user is null then
    raise exception 'Not logged in' using errcode = '28000';
  end if;
  select * into s from public.game_settings where id;
  if p_planned_minutes is null
     or p_planned_minutes < s.min_planned_minutes
     or p_planned_minutes > s.max_planned_minutes then
    raise exception 'planned_minutes must be between % and %', s.min_planned_minutes, s.max_planned_minutes
      using errcode = '22023';
  end if;

  -- one at a time per user: lock their profile row while we work
  perform 1 from public.profiles where id = v_user for update;
  if not found then
    raise exception 'No profile for this user' using errcode = 'P0002';
  end if;

  update public.study_sessions
     set ended_at = now()
   where user_id = v_user and ended_at is null;

  insert into public.study_sessions (user_id, planned_minutes)
  values (v_user, p_planned_minutes)
  returning id into v_id;
  return v_id;
end;
$$;

-- ── end_session(session_id, local_day) → result as JSON ───────────────
-- counted minutes = real server time passed, capped at planned_minutes.
-- coins = counted × coins_per_minute (+ bonus for a full, long-enough
-- session), but never more than daily_coin_cap per (local) day.
-- local_day is the browser's own date ("2026-10-29"); it's trusted only
-- within local_day_tolerance_days of the server's UTC date, and never
-- earlier than a day this user already used.
create or replace function public.end_session(p_session_id uuid, p_local_day date)
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

  select coalesce(sum(coins_awarded), 0), coalesce(sum(counted_minutes), 0)
    into v_day_coins, v_day_minutes_before
    from public.study_sessions
   where user_id = v_user and study_day = v_day;
  v_coins := greatest(0, least(v_raw, s.daily_coin_cap - v_day_coins));

  update public.study_sessions
     set ended_at = v_now, counted_minutes = v_counted, coins_awarded = v_coins, study_day = v_day
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
    'capped', v_coins < v_raw,
    'day_coins', v_day_coins + v_coins,
    'daily_coin_cap', s.daily_coin_cap,
    'day_minutes', v_day_minutes,
    'coins', v_profile.coins,
    'current_streak', v_profile.current_streak,
    'best_streak', v_profile.best_streak,
    'last_study_day', v_profile.last_study_day
  );
end;
$$;

-- ── import_local_progress: first login brings this browser's history in ─
-- Runs once per user (imported_local_at). The minutes are kept as history
-- only — they don't give coins, since anyone can edit their localStorage.
create or replace function public.import_local_progress(p_minutes integer, p_breed text, p_outfit text)
returns public.profiles
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_profile public.profiles;
begin
  if v_user is null then
    raise exception 'Not logged in' using errcode = '28000';
  end if;
  update public.profiles
     set legacy_minutes = least(greatest(coalesce(p_minutes, 0), 0), 525600), -- at most a year of minutes
         breed = case when p_breed ~ '^[a-z_]{1,32}$' then p_breed else breed end,
         outfit = case when p_outfit is null then null
                       when p_outfit ~ '^[a-z_]{1,32}$' then p_outfit else outfit end,
         imported_local_at = now()
   where id = v_user and imported_local_at is null
  returning * into v_profile;
  if not found then
    select * into v_profile from public.profiles where id = v_user; -- already imported: change nothing
  end if;
  return v_profile;
end;
$$;

-- ── Who may call what ─────────────────────────────────────────────────
-- Supabase lets everyone run new functions by default; narrow that down.
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.start_session(integer) from public, anon;
revoke execute on function public.end_session(uuid, date) from public, anon;
revoke execute on function public.import_local_progress(integer, text, text) from public, anon;
grant execute on function public.start_session(integer) to authenticated;
grant execute on function public.end_session(uuid, date) to authenticated;
grant execute on function public.import_local_progress(integer, text, text) to authenticated;
