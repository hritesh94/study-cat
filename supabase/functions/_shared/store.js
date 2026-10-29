// Everything the AI functions read from or write to the database.
//   db     acts as the logged-in user: Row Level Security applies (reads)
//   admin  the server's own key: the daily limits and saving AI results
// The handlers only use these methods, so tests can pass a fake store.

const must = ({ data, error }) => {
  if (error) throw new Error(error.message)
  return data
}

export function makeStore({ db, admin, userId }) {
  return {
    userId,
    reserve: async (kind) => must(await admin.rpc('ai_reserve', { p_user: userId, p_kind: kind })),
    release: async (kind) => must(await admin.rpc('ai_release', { p_user: userId, p_kind: kind })),

    profile: async () => must(await db.from('profiles').select('display_name, current_streak, best_streak, last_study_day, study_mode').eq('id', userId).single()),
    activeGoal: async () => must(await db.from('goals').select('*').eq('active', true).maybeSingle()),
    goal: async (id) => must(await db.from('goals').select('*').eq('id', id).maybeSingle()),
    latestRoadmap: async (goalId) =>
      must(await db.from('roadmaps').select('id, goal_id, plan, created_at').eq('goal_id', goalId).order('created_at', { ascending: false }).limit(1).maybeSingle()),
    sessionsSince: async (day) =>
      must(
        await db
          .from('study_sessions')
          .select('started_at, counted_minutes, leave_count, study_day')
          .not('ended_at', 'is', null)
          .gte('study_day', day)
          .order('started_at', { ascending: true }),
      ),

    // the last n chat messages, oldest first
    chatHistory: async (n) =>
      must(await db.from('chat_messages').select('role, text, meta, created_at').order('created_at', { ascending: false }).limit(n)).reverse(),
    saveChat: async (rows) => must(await admin.from('chat_messages').insert(rows.map((r) => ({ ...r, user_id: userId })))),
  }
}
