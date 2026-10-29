import { useEffect, useRef } from 'react'
import { localDay, supabase } from '../lib/supabase'

// Tells the server when studying starts and stops, so coins come from the
// server's clock, not the browser's.
//
//   focusing turns on  (Start / resume)          → start_session
//   focusing turns off (study ends, Skip, Pause,
//                       Reset)                    → end_session → onResult
//
// subjectId() = what you're studying (optional).
// leaveCount() = how often you left the tab; the server turns that into a
// coin penalty for your study mode (the browser never sends coins).
//
// Calls are queued one after another, so a quick Start-Pause can't mix up
// their order. If the tab is closed mid-session, the server closes that
// session (with nothing counted) the next time one starts.
export function useStudySessions({ enabled, focusing, plannedMinutes, subjectId, leaveCount, onResult, onError }) {
  const queue = useRef(Promise.resolve())
  const openId = useRef(null)
  const latest = useRef({})
  useEffect(() => {
    latest.current = { plannedMinutes, subjectId, leaveCount, onResult, onError }
  })

  useEffect(() => {
    if (!enabled) return
    const run = (job) => {
      queue.current = queue.current.then(job).catch((e) => latest.current.onError?.(e))
    }
    if (focusing) {
      run(async () => {
        const minutes = Math.min(180, Math.max(1, latest.current.plannedMinutes()))
        const subject = latest.current.subjectId?.() ?? null
        const { data, error } = await supabase.rpc(
          'start_session',
          subject ? { p_planned_minutes: minutes, p_subject_id: subject } : { p_planned_minutes: minutes },
        )
        if (error) throw error
        openId.current = data
      })
    } else {
      const leaves = latest.current.leaveCount?.() ?? 0 // counted now, not when the queue gets to it
      run(async () => {
        const id = openId.current
        if (!id) return
        openId.current = null
        const { data, error } = await supabase.rpc('end_session', {
          p_session_id: id,
          p_local_day: localDay(),
          p_leave_count: leaves,
        })
        if (error) throw error
        latest.current.onResult?.(data)
      })
    }
  }, [enabled, focusing])
}
