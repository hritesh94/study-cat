-- ════════════════════════════════════════════════════════════════════
-- Study Cat · migration 6 · STATS (for the streak calendar and the room)
-- Paste into Supabase → SQL Editor → New query → Run, after file 5.
-- ════════════════════════════════════════════════════════════════════
--
-- Read-only summaries of YOUR study sessions. They run with the caller's
-- own rights ("security invoker"), so Row Level Security still applies:
-- nobody can read anyone else's numbers through them.

-- ── daily_totals(from, to): one row per day that has study time ───────
-- minutes, coins, sessions, and the minutes per subject that day.
-- At most 62 days per call (a month view needs 31).
create function public.daily_totals(p_from date, p_to date)
returns table (day date, minutes integer, coins integer, sessions integer, subjects jsonb)
language plpgsql
stable
security invoker
set search_path = ''
as $$
#variable_conflict use_column
begin
  if auth.uid() is null then
    raise exception 'Not logged in' using errcode = '28000';
  end if;
  if p_from is null or p_to is null or p_to < p_from or p_to - p_from > 61 then
    raise exception 'Ask for 1 to 62 days at a time' using errcode = '22023';
  end if;
  return query
  with done as (
    select ss.study_day, ss.counted_minutes, ss.coins_awarded, ss.subject_id
      from public.study_sessions ss
     where ss.user_id = auth.uid()
       and ss.ended_at is not null
       and ss.counted_minutes > 0 -- a Start-then-Pause with nothing counted isn't a session
       and ss.study_day between p_from and p_to
  ),
  per_subject as (
    select d.study_day, d.subject_id, sum(d.counted_minutes)::integer as minutes
      from done d
     group by d.study_day, d.subject_id
  )
  select t.study_day,
         t.minutes,
         t.coins,
         t.sessions,
         coalesce((
           select jsonb_agg(jsonb_build_object('subject_id', p.subject_id, 'name', sub.name, 'color', sub.color, 'minutes', p.minutes)
                            order by p.minutes desc)
             from per_subject p
             left join public.subjects sub on sub.id = p.subject_id
            where p.study_day = t.study_day
         ), '[]'::jsonb)
    from (
      select d.study_day, sum(d.counted_minutes)::integer as minutes,
             sum(d.coins_awarded)::integer as coins, count(*)::integer as sessions
        from done d
       group by d.study_day
    ) t
   order by t.study_day;
end;
$$;

-- ── subject_totals(): all-time minutes per subject (the bookshelf) ────
create function public.subject_totals()
returns table (subject_id uuid, name text, color text, minutes integer)
language sql
stable
security invoker
set search_path = ''
as $$
  select sub.id, sub.name, sub.color, coalesce(sum(ss.counted_minutes), 0)::integer
    from public.subjects sub
    left join public.study_sessions ss on ss.subject_id = sub.id and ss.ended_at is not null
   where sub.user_id = auth.uid()
   group by sub.id, sub.name, sub.color, sub.created_at
   order by sub.created_at;
$$;

revoke execute on function public.daily_totals(date, date) from public, anon;
revoke execute on function public.subject_totals() from public, anon;
grant execute on function public.daily_totals(date, date) to authenticated;
grant execute on function public.subject_totals() to authenticated;
