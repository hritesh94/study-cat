-- ════════════════════════════════════════════════════════════════════
-- Study Cat · migration 12 · NEET PG goals
-- Paste into Supabase → SQL Editor → New query → Run, after file 11.
-- ════════════════════════════════════════════════════════════════════
--
-- A goal can now also be 'neet_pg' (the 19 MBBS subjects are built into the
-- app, like NEET UG and JEE Main).
alter table public.goals drop constraint goals_kind_check;
alter table public.goals
  add constraint goals_kind_check check (kind in ('neet', 'neet_pg', 'jee_main', 'boards', 'custom'));
