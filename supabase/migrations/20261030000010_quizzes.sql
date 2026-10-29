-- ════════════════════════════════════════════════════════════════════
-- Study Cat · migration 10 · BREAK QUIZ
-- Paste into Supabase → SQL Editor → New query → Run, after file 9.
-- ════════════════════════════════════════════════════════════════════
--
-- After a session the cat can quiz you: 3 short questions. The quiz
-- function writes them here WITH the answers; the browser only ever gets
-- the questions. answer_quiz() checks each answer and, after the last one,
-- gives the bonus (+5 coins, inside the daily cap).

alter table public.game_settings
  add column quiz_bonus_coins integer not null default 5 check (quiz_bonus_coins >= 0);

create table public.quizzes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  topic text not null check (char_length(topic) between 1 and 200),
  -- [{ "q": "…", "options": ["…", …], "answer": 2, "explain": "…" }]
  questions jsonb not null check (
    jsonb_typeof(questions) = 'array' and jsonb_array_length(questions) between 1 and 5 and pg_column_size(questions) < 20000
  ),
  answers integer[] not null default '{}', -- the choices you made, in order
  finished_at timestamptz,
  coins_awarded integer not null default 0 check (coins_awarded >= 0),
  created_at timestamptz not null default now()
);
create index quizzes_user_time on public.quizzes (user_id, created_at desc);

alter table public.quizzes enable row level security;
revoke all on public.quizzes from anon, authenticated;
-- every column EXCEPT questions (they hold the answers)
grant select (id, topic, answers, finished_at, coins_awarded, created_at) on public.quizzes to authenticated;
create policy "Users read their own quizzes"
  on public.quizzes for select to authenticated
  using ((select auth.uid()) = user_id);

-- ── answer_quiz(quiz, choice, local_day) → { correct, answer, explain, … } ─
-- Answers the next question. A quiz is for answering soon after it's made
-- (within 6 hours), and each question only once.
create function public.answer_quiz(p_quiz_id uuid, p_choice integer, p_local_day date)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  s public.game_settings;
  v_quiz public.quizzes;
  v_index integer;
  v_question jsonb;
  v_total integer;
  v_correct boolean;
  v_score integer := 0;
  v_finished boolean;
  v_day date;
  v_coins integer := 0;
  v_balance integer;
  i integer;
begin
  if v_user is null then
    raise exception 'Not logged in' using errcode = '28000';
  end if;
  select * into s from public.game_settings where id;
  perform 1 from public.profiles where id = v_user for update; -- coins: one change at a time
  select * into v_quiz from public.quizzes where id = p_quiz_id and user_id = v_user for update;
  if not found then
    raise exception 'Quiz not found' using errcode = 'P0002';
  end if;
  if v_quiz.finished_at is not null then
    raise exception 'Quiz already finished' using errcode = '22023';
  end if;
  if v_quiz.created_at < now() - interval '6 hours' then
    raise exception 'Quiz expired' using errcode = '22023';
  end if;

  v_total := jsonb_array_length(v_quiz.questions);
  v_index := cardinality(v_quiz.answers);
  v_question := v_quiz.questions -> v_index;
  if p_choice is null or p_choice < 0 or p_choice >= jsonb_array_length(v_question -> 'options') then
    raise exception 'No such answer' using errcode = '22023';
  end if;
  v_correct := (v_question ->> 'answer')::integer = p_choice;
  v_finished := v_index + 1 = v_total;

  update public.quizzes set answers = answers || p_choice where id = v_quiz.id returning * into v_quiz;
  for i in 0 .. cardinality(v_quiz.answers) - 1 loop
    if (v_quiz.questions -> i ->> 'answer')::integer = v_quiz.answers[i + 1] then
      v_score := v_score + 1;
    end if;
  end loop;

  if v_finished then
    -- finishing (not getting them right) earns the bonus
    v_day := public._coin_day(v_user, p_local_day);
    v_coins := greatest(0, least(s.quiz_bonus_coins, s.daily_coin_cap - public._day_coins(v_user, v_day)));
    insert into public.bonus_coins (user_id, day, kind, coins, ref) values (v_user, v_day, 'quiz', v_coins, v_quiz.id);
    update public.quizzes set finished_at = now(), coins_awarded = v_coins where id = v_quiz.id;
    update public.profiles set coins = coins + v_coins where id = v_user;
  end if;
  select coins into v_balance from public.profiles where id = v_user;

  return jsonb_build_object(
    'index', v_index,
    'correct', v_correct,
    'answer', (v_question ->> 'answer')::integer,
    'explain', v_question ->> 'explain',
    'score', v_score,
    'total', v_total,
    'finished', v_finished,
    'coins_awarded', v_coins,
    'capped', v_finished and v_coins < s.quiz_bonus_coins,
    'coins', v_balance
  );
end;
$$;

revoke execute on function public.answer_quiz(uuid, integer, date) from public, anon;
grant execute on function public.answer_quiz(uuid, integer, date) to authenticated;
