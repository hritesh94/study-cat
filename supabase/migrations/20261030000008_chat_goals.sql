-- ════════════════════════════════════════════════════════════════════
-- Study Cat · migration 8 · CHAT + GOALS
-- Paste into Supabase → SQL Editor → New query → Run, after file 7.
-- ════════════════════════════════════════════════════════════════════

-- ── chat_messages: what you and the cat said ──────────────────────────
-- Written only by the chat Edge Function (so the cat's side is really the
-- cat's). You can read your own and delete them all ("Clear chat").
create table public.chat_messages (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role text not null check (role in ('user', 'cat')),
  text text not null check (char_length(text) between 1 and 8000),
  -- e.g. { "suggest": "roadmap" } or { "crisis": true } or { "goal": {…} }
  meta jsonb not null default '{}' check (jsonb_typeof(meta) = 'object' and pg_column_size(meta) < 4000),
  created_at timestamptz not null default now()
);
create index chat_messages_user_time on public.chat_messages (user_id, created_at desc);

alter table public.chat_messages enable row level security;
revoke all on public.chat_messages from anon, authenticated;
grant select, delete on public.chat_messages to authenticated;
create policy "Users read their own chat"
  on public.chat_messages for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "Users delete their own chat"
  on public.chat_messages for delete to authenticated
  using ((select auth.uid()) = user_id);

-- ── goals: what you're studying for ───────────────────────────────────
-- From the chat (the cat asks) or the "Set a goal" form. Only one goal is
-- active at a time. It's your own data, so you may change it; the daily
-- goal bonus (file 9) only trusts hours_per_day within 0.5–16.
create table public.goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  kind text not null check (kind in ('neet', 'jee_main', 'boards', 'custom')),
  title text not null check (char_length(title) between 1 and 80),
  deadline date not null check (deadline > date '2020-01-01'),
  hours_per_day numeric(4, 2) not null check (hours_per_day between 0.5 and 16),
  light_weekday smallint not null default 0 check (light_weekday between 0 and 6), -- 0 = Sunday
  -- [{ "name": "Physics", "level": "weak" | "okay" | "strong" }]
  subjects jsonb not null default '[]' check (jsonb_typeof(subjects) = 'array' and pg_column_size(subjects) < 4000),
  -- NEET / JEE: the syllabus chapters [{ id, subject, name, weight }] (custom: null, the roadmap finds them)
  chapters jsonb check (chapters is null or (jsonb_typeof(chapters) = 'array' and pg_column_size(chapters) < 40000)),
  done_chapters text[] not null default '{}' check (cardinality(done_chapters) <= 400),
  notes text check (notes is null or char_length(notes) <= 8000), -- custom goals: what it's about
  active boolean not null default true,
  created_at timestamptz not null default now()
);
create unique index goals_one_active on public.goals (user_id) where active;

alter table public.goals enable row level security;
revoke all on public.goals from anon, authenticated;
grant select, delete on public.goals to authenticated;
grant insert (kind, title, deadline, hours_per_day, light_weekday, subjects, chapters, done_chapters, notes, active)
  on public.goals to authenticated;
grant update (title, deadline, hours_per_day, light_weekday, subjects, chapters, done_chapters, notes, active)
  on public.goals to authenticated;
create policy "Users read their own goals"
  on public.goals for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "Users add their own goals"
  on public.goals for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy "Users change their own goals"
  on public.goals for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy "Users delete their own goals"
  on public.goals for delete to authenticated
  using ((select auth.uid()) = user_id);
