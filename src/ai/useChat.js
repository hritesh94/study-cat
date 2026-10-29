import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { askCat } from './client'

// The chat with the cat. Messages are saved on the server by the chat
// function (table chat_messages); this loads them when the chat first
// opens, sends new ones, and clears them all.
//   message = { id, role: 'user' | 'cat', text, meta: { suggest?, goal?, crisis?, error? } }
export function useChat({ userId, open }) {
  const [state, setState] = useState({ userId: null, messages: [], loaded: false })
  const [sending, setSending] = useState(false)
  const [usage, setUsage] = useState(null) // { used, limit } after the last reply
  const nextId = useRef(0)
  const mine = state.userId === userId
  const messages = mine ? state.messages : []

  useEffect(() => {
    if (!open || !userId || !supabase || (mine && state.loaded)) return
    let cancelled = false
    supabase
      .from('chat_messages')
      .select('id, role, text, meta, created_at')
      .order('created_at', { ascending: false })
      .limit(60)
      .then(({ data }) => {
        if (cancelled) return
        setState({ userId, messages: (data ?? []).reverse(), loaded: true })
      })
    return () => {
      cancelled = true
    }
  }, [open, userId, mine, state.loaded])

  const add = useCallback((msg) => {
    const id = `local-${nextId.current++}`
    setState((s) => ({ ...s, messages: [...s.messages, { id, meta: {}, ...msg }] }))
    return id
  }, [])

  // situation: what the timer is doing ('idle' | 'studying' | 'break' | 'after_session')
  const send = useCallback(
    async (text, situation) => {
      const message = text.trim()
      if (!message || sending) return null
      add({ role: 'user', text: message })
      setSending(true)
      const { data, error } = await askCat('chat', {
        message,
        situation,
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      })
      setSending(false)
      if (error) {
        add({ role: 'cat', text: error.text, meta: { error: error.code } })
        return null
      }
      setUsage(data.usage ?? null)
      const meta = {}
      if (data.crisis) meta.crisis = true
      if (data.suggest && data.suggest !== 'none') meta.suggest = data.suggest
      if (data.goal) meta.goal = data.goal
      add({ role: 'cat', text: data.reply, meta })
      return data
    },
    [add, sending],
  )

  const clear = useCallback(async () => {
    if (!userId) return
    const { error } = await supabase.from('chat_messages').delete().eq('user_id', userId)
    if (!error) setState({ userId, messages: [], loaded: true })
    return !error
  }, [userId])

  return { messages, loaded: mine && state.loaded, sending, usage, send, clear, say: (text, meta) => add({ role: 'cat', text, meta }) }
}
