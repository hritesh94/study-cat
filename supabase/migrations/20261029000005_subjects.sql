-- ════════════════════════════════════════════════════════════════════
-- Study Cat · migration 5 · SUBJECTS
-- Paste into Supabase → SQL Editor → New query → Run, after file 4.
-- ════════════════════════════════════════════════════════════════════
--
-- Each user has their own list of subjects (Maths, History…) with a
-- colour. A study session can say which subject it was for.

alter table public.game_settings
  add column max_subjects integer not null default 50 check (max_subjects >= 0);

create table public.subjects (
  id uuid primary key default gen_random_uuid(),
  -- filled in by the database from the login, never by the browser
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  name text not null check (name = btrim(name) and char_length(name) between 1 and 40),
  color text not null check (color ~ '^#[0-9a-f]{6}$'),
  created_at timestamptz not null default now(),
  last_used_at timestamptz -- set by start_session
);
-- no two subjects with the same name (ignoring capitals) per user
create unique index subjects_user_name on public.subjects (user_id, lower(name));

-- sessions remember their subject; deleting a subject keeps the sessions
alter table public.study_sessions
  add column subject_id uuid references public.subjects (id) on delete set null;
create index study_sessions_subject on public.study_sessions (subject_id);

-- ── security: like the other tables, only your own rows ───────────────
alter table public.subjects enable row level security;
revoke all on public.subjects from anon, authenticated;
grant select, delete on public.subjects to authenticated;
-- only name and colour can be written; id, user_id and dates come from the database
grant insert (name, color), update (name, color) on public.subjects to authenticated;

create policy "Users read their own subjects"
  on public.subjects for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "Users add their own subjects"
  on public.subjects for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy "Users change their own subjects"
  on public.subjects for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy "Users delete their own subjects"
  on public.subjects for delete to authenticated
  using ((select auth.uid()) = user_id);

-- ── at most max_subjects per user ─────────────────────────────────────
create function public.subjects_limit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_max integer;
begin
  select max_subjects into v_max from public.game_settings where id;
  -- one insert at a time per user, so two tabs can't both squeeze in
  perform 1 from public.profiles where id = new.user_id for update;
  if (select count(*) from public.subjects where user_id = new.user_id) >= v_max then
    raise exception 'You can have at most % subjects', v_max using errcode = '23514';
  end if;
  return new;
end;
$$;
revoke execute on function public.subjects_limit() from public, anon, authenticated;

create trigger subjects_limit
  before insert on public.subjects
  for each row execute function public.subjects_limit();

-- ── start_session, now with an optional subject ───────────────────────
-- Same as file 3, plus: the subject must be one of YOUR subjects, and it's
-- marked as last used (so the picker can preselect it next time).
drop function public.start_session(integer);

create function public.start_session(p_planned_minutes integer, p_subject_id uuid default null)
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

  if p_subject_id is not null then
    update public.subjects set last_used_at = now()
     where id = p_subject_id and user_id = v_user;
    if not found then
      raise exception 'Subject not found' using errcode = 'P0002';
    end if;
  end if;

  update public.study_sessions
     set ended_at = now()
   where user_id = v_user and ended_at is null;

  insert into public.study_sessions (user_id, planned_minutes, subject_id)
  values (v_user, p_planned_minutes, p_subject_id)
  returning id into v_id;
  return v_id;
end;
$$;

revoke execute on function public.start_session(integer, uuid) from public, anon;
grant execute on function public.start_session(integer, uuid) to authenticated;
