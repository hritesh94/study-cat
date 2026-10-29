-- ════════════════════════════════════════════════════════════════════
-- Study Cat · migration 13 · PERSONALITY, LANGUAGE, SPICY
-- Paste into Supabase → SQL Editor → New query → Run, after file 12.
-- ════════════════════════════════════════════════════════════════════
--
-- Two separate settings now:
--   personality  HOW the cat talks: sweet, diva, gang or savage
--   strictness   what leaving costs: the existing study_mode column
--                (easy / medium / toxic in the database; the app shows them
--                as Chill / Normal / Strict). Its penalty rules in
--                end_session are unchanged.
-- Plus the language the cat talks in, and "spicy" (lines with swearing,
-- off unless you turn it on). All three are yours to change.

alter table public.profiles
  add column personality text not null default 'sweet' check (personality in ('sweet', 'diva', 'gang', 'savage')),
  add column language text not null default 'en' check (language in ('en', 'hinglish')),
  add column spicy boolean not null default false;

grant update (personality, language, spicy) on public.profiles to authenticated;
-- (the "Users update their own profile" policy from file 2 limits this to your own row)
