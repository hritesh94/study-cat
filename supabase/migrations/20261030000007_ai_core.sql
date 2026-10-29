-- ════════════════════════════════════════════════════════════════════
-- Study Cat · migration 7 · AI CORE (daily limits per user)
-- Paste into Supabase → SQL Editor → New query → Run, after file 6.
-- ════════════════════════════════════════════════════════════════════
--
-- The cat's AI features run in Supabase Edge Functions, with ONE Gemini key
-- for everybody, on Google's free tier. Its limits are shared by all users,
-- so each user gets a few AI calls per day. The Edge Function reserves one
-- here BEFORE it calls the AI, and gives it back if the AI call fails.
--
-- Only the Edge Functions (the service_role) may reserve or give back: if
-- users could, they could give calls back forever.

-- ── the limits, next to the other tunables ────────────────────────────
alter table public.game_settings
  add column ai_chat_daily_limit integer not null default 30 check (ai_chat_daily_limit >= 0),
  add column ai_roadmap_daily_limit integer not null default 3 check (ai_roadmap_daily_limit >= 0),
  add column ai_quiz_daily_limit integer not null default 10 check (ai_quiz_daily_limit >= 0),
  add column ai_report_daily_limit integer not null default 1 check (ai_report_daily_limit >= 0);

-- ── how many AI calls each user made, per (UTC) day and kind ──────────
create table public.ai_usage (
  user_id uuid not null references public.profiles (id) on delete cascade,
  day date not null,
  kind text not null check (kind in ('chat', 'roadmap', 'quiz', 'report')),
  used integer not null default 0 check (used >= 0),
  primary key (user_id, day, kind)
);

alter table public.ai_usage enable row level security;
revoke all on public.ai_usage from anon, authenticated;
grant select on public.ai_usage to authenticated;
create policy "Users read their own AI usage"
  on public.ai_usage for select to authenticated
  using ((select auth.uid()) = user_id);

-- ── ai_reserve(user, kind) → { allowed, used, limit } ─────────────────
-- Takes one call from today's allowance, in one step (two requests at the
-- same moment can't both get the last one).
create function public.ai_reserve(p_user uuid, p_kind text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  s public.game_settings;
  v_limit integer;
  v_day date := (now() at time zone 'utc')::date;
  v_used integer;
begin
  select * into s from public.game_settings where id;
  v_limit := case p_kind
    when 'chat' then s.ai_chat_daily_limit
    when 'roadmap' then s.ai_roadmap_daily_limit
    when 'quiz' then s.ai_quiz_daily_limit
    when 'report' then s.ai_report_daily_limit
  end;
  if v_limit is null then
    raise exception 'Unknown AI kind %', p_kind using errcode = '22023';
  end if;
  if not exists (select 1 from public.profiles where id = p_user) then
    raise exception 'No profile for this user' using errcode = 'P0002';
  end if;
  if v_limit <= 0 then
    return jsonb_build_object('allowed', false, 'used', 0, 'limit', v_limit);
  end if;

  insert into public.ai_usage as u (user_id, day, kind, used)
  values (p_user, v_day, p_kind, 1)
  on conflict (user_id, day, kind) do update
    set used = u.used + 1
    where u.used < v_limit
  returning u.used into v_used;

  if v_used is null then -- already at the limit: nothing was changed
    return jsonb_build_object('allowed', false, 'used', v_limit, 'limit', v_limit);
  end if;
  return jsonb_build_object('allowed', true, 'used', v_used, 'limit', v_limit);
end;
$$;

-- ── ai_release(user, kind): the AI call failed, give the call back ────
create function public.ai_release(p_user uuid, p_kind text)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.ai_usage
     set used = greatest(0, used - 1)
   where user_id = p_user and kind = p_kind and day = (now() at time zone 'utc')::date;
$$;

revoke execute on function public.ai_reserve(uuid, text) from public, anon, authenticated;
revoke execute on function public.ai_release(uuid, text) from public, anon, authenticated;
grant execute on function public.ai_reserve(uuid, text) to service_role;
grant execute on function public.ai_release(uuid, text) to service_role;
