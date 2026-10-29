-- ════════════════════════════════════════════════════════════════════
-- Study Cat · migration 11 · WEEKLY REPORT
-- Paste into Supabase → SQL Editor → New query → Run, after file 10.
-- ════════════════════════════════════════════════════════════════════
--
-- Every Monday (or when you tap "Weekly report") the cat sums up last week.
-- The NUMBERS come from week_stats() below; the AI only writes the words
-- around them. Each week's report is made once and kept.

-- ── week_stats(monday) → the week's numbers, from your own sessions ───
-- Runs with your own rights (security invoker), so Row Level Security
-- applies: nobody can read anyone else's week.
create function public.week_stats(p_week_start date)
returns jsonb
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare
  v_end date := p_week_start + 6;
  v jsonb;
begin
  if auth.uid() is null then
    raise exception 'Not logged in' using errcode = '28000';
  end if;
  if p_week_start is null or extract(isodow from p_week_start) <> 1 then
    raise exception 'A week starts on a Monday' using errcode = '22023';
  end if;
  with done as (
    select ss.study_day, ss.counted_minutes, ss.coins_awarded, ss.subject_id
      from public.study_sessions ss
     where ss.user_id = auth.uid() and ss.ended_at is not null and ss.counted_minutes > 0
       and ss.study_day between p_week_start and v_end
  ),
  per_day as (
    select d.study_day, sum(d.counted_minutes)::integer as minutes from done d group by d.study_day
  ),
  per_subject as (
    select coalesce(sub.name, 'No subject') as name, sum(d.counted_minutes)::integer as minutes
      from done d left join public.subjects sub on sub.id = d.subject_id
     group by 1
  ),
  bonus as (
    select b.kind, b.coins from public.bonus_coins b
     where b.user_id = auth.uid() and b.day between p_week_start and v_end
  )
  select jsonb_build_object(
    'week_start', p_week_start,
    'week_end', v_end,
    'minutes', coalesce((select sum(counted_minutes) from done), 0),
    'sessions', (select count(*) from done),
    'days_studied', (select count(*) from per_day),
    'best_day', (select jsonb_build_object('day', p.study_day, 'minutes', p.minutes) from per_day p order by p.minutes desc, p.study_day limit 1),
    'subjects', coalesce((select jsonb_agg(jsonb_build_object('name', s.name, 'minutes', s.minutes) order by s.minutes desc) from per_subject s), '[]'::jsonb),
    'coins', coalesce((select sum(coins_awarded) from done), 0) + coalesce((select sum(coins) from bonus), 0),
    'goal_days', (select count(*) from bonus where kind = 'daily_goal')
  ) into v;
  return v;
end;
$$;

revoke execute on function public.week_stats(date) from public, anon;
grant execute on function public.week_stats(date) to authenticated;

-- ── weekly_reports: the words the cat wrote, with the numbers ─────────
create table public.weekly_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  week_start date not null check (extract(isodow from week_start) = 1),
  stats jsonb not null check (jsonb_typeof(stats) = 'object' and pg_column_size(stats) < 20000),
  summary text not null check (char_length(summary) between 1 and 1000),
  tip text not null check (char_length(tip) between 1 and 400),
  created_at timestamptz not null default now(),
  unique (user_id, week_start)
);

alter table public.weekly_reports enable row level security;
revoke all on public.weekly_reports from anon, authenticated;
grant select on public.weekly_reports to authenticated;
create policy "Users read their own weekly reports"
  on public.weekly_reports for select to authenticated
  using ((select auth.uid()) = user_id);
