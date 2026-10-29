-- ════════════════════════════════════════════════════════════════════
-- Study Cat · migration 1 of 3 · TABLES
-- Paste into Supabase → SQL Editor → New query → Run. Run it once.
-- ════════════════════════════════════════════════════════════════════

-- ── Game settings: every number we may want to tune, in ONE row ──────
-- Change a value later with e.g.:
--   update public.game_settings set daily_coin_cap = 400;
create table public.game_settings (
  id boolean primary key default true check (id), -- there can only be one row
  coins_per_minute integer not null default 1 check (coins_per_minute >= 0),
  full_session_bonus integer not null default 10 check (full_session_bonus >= 0),
  -- the bonus only counts for sessions planned at least this long, so lots
  -- of tiny 1-minute "full" sessions can't farm bonuses
  bonus_min_planned_minutes integer not null default 25 check (bonus_min_planned_minutes >= 0),
  daily_coin_cap integer not null default 300 check (daily_coin_cap >= 0),
  streak_min_minutes integer not null default 25 check (streak_min_minutes > 0), -- a day counts for the streak at this many minutes
  min_planned_minutes integer not null default 1 check (min_planned_minutes > 0),
  max_planned_minutes integer not null default 180 check (max_planned_minutes > 0),
  -- a few seconds of slack for network delay, so a full 50:00 session isn't
  -- counted as 49 minutes
  grace_seconds integer not null default 10 check (grace_seconds between 0 and 59),
  -- how far the browser's "today" may differ from the server's UTC date
  -- (time zones run from −12 h to +14 h, so 1 day covers everyone)
  local_day_tolerance_days integer not null default 1 check (local_day_tolerance_days >= 0)
);
insert into public.game_settings default values;

-- ── One profile per user (created automatically at sign-up, see file 3) ─
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null default 'Cat friend' check (char_length(display_name) between 1 and 40),
  breed text not null default 'orange' check (breed ~ '^[a-z_]{1,32}$'),
  outfit text check (outfit is null or outfit ~ '^[a-z_]{1,32}$'),
  coins integer not null default 0 check (coins >= 0),
  current_streak integer not null default 0 check (current_streak >= 0),
  best_streak integer not null default 0 check (best_streak >= 0),
  last_study_day date, -- the last (local) day that counted toward the streak
  -- minutes studied on this browser before ever logging in (history only, no coins)
  legacy_minutes integer not null default 0 check (legacy_minutes >= 0),
  imported_local_at timestamptz, -- when those were brought in (only once)
  created_at timestamptz not null default now()
);

-- ── Study sessions: times always come from the server ─────────────────
create table public.study_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  planned_minutes integer not null check (planned_minutes > 0),
  counted_minutes integer not null default 0 check (counted_minutes >= 0),
  coins_awarded integer not null default 0 check (coins_awarded >= 0),
  study_day date, -- the user's local day this session counted for
  check (ended_at is null or ended_at >= started_at)
);
-- only ONE open (not yet ended) session per user at a time
create unique index study_sessions_one_open on public.study_sessions (user_id) where ended_at is null;
create index study_sessions_user_day on public.study_sessions (user_id, study_day);

-- ── Items a user has unlocked (for the shop later) ────────────────────
create table public.owned_items (
  user_id uuid not null references public.profiles (id) on delete cascade,
  item_id text not null check (item_id ~ '^[a-z_]{1,32}$'),
  unlocked_at timestamptz not null default now(),
  primary key (user_id, item_id)
);
