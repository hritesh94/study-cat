-- ════════════════════════════════════════════════════════════════════
-- Study Cat · migration 14 · THE CAT LEARNS YOU (memory + daily lines)
-- Paste into Supabase → SQL Editor → New query → Run, after file 13.
-- ════════════════════════════════════════════════════════════════════
--
-- "Let the cat learn about me" (profiles.learning):
--   null   not asked yet (the chat asks once)
--   true   after a chat, the cat updates cat_memory; once a day it writes a
--          fresh line pack in your personality
--   false  no memory updates, no packs: fixed lines only
-- The cat only remembers STUDY things (goals, motivation, how you talk,
-- habits), never health, family, relationships, location or other
-- personal details. You can read, edit and delete all of it.

alter table public.profiles add column learning boolean;
grant update (learning) on public.profiles to authenticated;

-- ── two more kinds of AI call, with their own daily limits ─────────────
alter table public.game_settings
  add column ai_memory_daily_limit integer not null default 10 check (ai_memory_daily_limit >= 0),
  add column ai_pack_daily_limit integer not null default 1 check (ai_pack_daily_limit >= 0);

alter table public.ai_usage drop constraint ai_usage_kind_check;
alter table public.ai_usage
  add constraint ai_usage_kind_check check (kind in ('chat', 'roadmap', 'quiz', 'report', 'memory', 'pack'));

-- file 7's ai_reserve, now knowing 'memory' and 'pack'
create or replace function public.ai_reserve(p_user uuid, p_kind text)
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
    when 'memory' then s.ai_memory_daily_limit
    when 'pack' then s.ai_pack_daily_limit
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

  if v_used is null then
    return jsonb_build_object('allowed', false, 'used', v_limit, 'limit', v_limit);
  end if;
  return jsonb_build_object('allowed', true, 'used', v_used, 'limit', v_limit);
end;
$$;

-- ── cat_memory: what the cat learned, one row per user ────────────────
create table public.cat_memory (
  user_id uuid primary key default auth.uid() references public.profiles (id) on delete cascade,
  goals text check (goals is null or char_length(goals) <= 300), -- their goals, in their own words
  motivates text check (motivates is null or char_length(motivates) <= 300),
  demotivates text check (demotivates is null or char_length(demotivates) <= 300),
  talk_style text check (talk_style is null or char_length(talk_style) <= 300), -- slang, language mix, emoji
  habits text check (habits is null or char_length(habits) <= 300), -- study habits noticed
  processed_until timestamptz, -- chat messages up to here were already learned from
  updated_at timestamptz not null default now()
);

alter table public.cat_memory enable row level security;
revoke all on public.cat_memory from anon, authenticated;
grant select, delete on public.cat_memory to authenticated;
grant insert (goals, motivates, demotivates, talk_style, habits) on public.cat_memory to authenticated;
grant update (goals, motivates, demotivates, talk_style, habits, updated_at) on public.cat_memory to authenticated;
create policy "Users read their own cat memory"
  on public.cat_memory for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "Users add their own cat memory"
  on public.cat_memory for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy "Users edit their own cat memory"
  on public.cat_memory for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy "Users delete their own cat memory"
  on public.cat_memory for delete to authenticated
  using ((select auth.uid()) = user_id);

-- ── line_packs: today's AI-written lines, one pack per user per day ───
create table public.line_packs (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  day date not null,
  personality text not null,
  language text not null,
  spicy boolean not null,
  -- [{ "situation": "greet", "mood": "happy", "text": "…" }] (checked by the pack function)
  lines jsonb not null check (jsonb_typeof(lines) = 'array' and pg_column_size(lines) < 30000),
  created_at timestamptz not null default now(),
  unique (user_id, day)
);

alter table public.line_packs enable row level security;
revoke all on public.line_packs from anon, authenticated;
grant select, delete on public.line_packs to authenticated;
create policy "Users read their own line packs"
  on public.line_packs for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "Users delete their own line packs"
  on public.line_packs for delete to authenticated
  using ((select auth.uid()) = user_id);

-- ── learning off really means off ──────────────────────────────────────
-- The Edge Functions write memory and packs with the server key (no user
-- login, so auth.uid() is null). Those writes are refused unless the user
-- has learning switched on. The user's own edits (with their login) are
-- always allowed: it's their data.
create function public.only_when_learning()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null
     and not exists (select 1 from public.profiles p where p.id = new.user_id and p.learning is true) then
    raise exception 'Learning is switched off for this user' using errcode = '42501';
  end if;
  return new;
end;
$$;
revoke execute on function public.only_when_learning() from public, anon, authenticated;

create trigger cat_memory_only_when_learning
  before insert or update on public.cat_memory
  for each row execute function public.only_when_learning();
create trigger line_packs_only_when_learning
  before insert or update on public.line_packs
  for each row execute function public.only_when_learning();
