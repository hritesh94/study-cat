-- ════════════════════════════════════════════════════════════════════
-- Study Cat · migration 2 of 3 · SECURITY (Row Level Security + grants)
-- Paste into Supabase → SQL Editor → New query → Run, after file 1.
-- ════════════════════════════════════════════════════════════════════
--
-- Two layers, both needed:
--  • GRANTS say which columns/actions the browser's roles may use at all.
--  • RLS POLICIES say which ROWS they may see or touch (only their own).
-- "authenticated" = a logged-in user in the browser; "anon" = logged out.
-- Coins, streaks and sessions can only change through the functions in
-- file 3, which run with the owner's rights ("security definer").

alter table public.game_settings enable row level security;
alter table public.profiles enable row level security;
alter table public.study_sessions enable row level security;
alter table public.owned_items enable row level security;

-- Start from nothing (Supabase grants a lot by default) …
revoke all on public.game_settings, public.profiles, public.study_sessions, public.owned_items from anon, authenticated;

-- … then allow only what the app needs.
grant select on public.game_settings to authenticated;
grant select on public.profiles, public.study_sessions, public.owned_items to authenticated;
-- the ONLY columns a user may change directly:
grant update (display_name, breed, outfit) on public.profiles to authenticated;

create policy "Settings are readable by logged-in users"
  on public.game_settings for select to authenticated
  using (true);

create policy "Users read their own profile"
  on public.profiles for select to authenticated
  using ((select auth.uid()) = id);

create policy "Users update their own profile"
  on public.profiles for update to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

create policy "Users read their own sessions"
  on public.study_sessions for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users read their own items"
  on public.owned_items for select to authenticated
  using ((select auth.uid()) = user_id);
