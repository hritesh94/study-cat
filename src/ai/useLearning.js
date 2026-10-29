import { useCallback, useEffect, useRef, useState } from 'react'
import { localDay, supabase } from '../lib/supabase'
import { askCat } from './client'

export const MEMORY_ITEMS = [
  { key: 'goals', label: 'Your goals, in your words' },
  { key: 'motivates', label: 'What motivates you' },
  { key: 'demotivates', label: 'What gets you down' },
  { key: 'talk_style', label: 'How you talk' },
  { key: 'habits', label: 'Study habits I noticed' },
]
const QUIET_MS = 10 * 60 * 1000 + 15000 // the memory function waits for 10 quiet minutes

// "Let the cat learn about me" (profiles.learning: null = not asked yet).
// When it's on:
//   • a while after a chat goes quiet, the cat updates what it knows
//     (the memory function decides whether there's anything to do)
//   • once a day, the cat writes a fresh pack of lines (the pack function)
// When it's off: nothing is learned, no packs, only the fixed lines.
export function useLearning({ profile, updateProfile, catStyle }) {
  const userId = profile?.id ?? null
  const learning = profile ? (profile.learning ?? null) : null
  const [memory, setMemory] = useState({ userId: null, row: null, loaded: false })
  const [packState, setPackState] = useState({ key: null, pack: null })
  const memoryTimer = useRef(null)

  // ── what the cat knows ──
  const loadMemory = useCallback(async () => {
    if (!userId) return
    const { data } = await supabase.from('cat_memory').select('goals, motivates, demotivates, talk_style, habits, updated_at').maybeSingle()
    setMemory({ userId, row: data ?? null, loaded: true })
  }, [userId])

  // your own edits (allowed whether learning is on or off: it's your data).
  // user_id isn't sent: the database fills it in with your login.
  const row = memory.userId === userId ? memory.row : null
  const saveItem = useCallback(
    async (key, text) => {
      const fields = { [key]: text.trim().slice(0, 300) || null, updated_at: new Date().toISOString() }
      const table = supabase.from('cat_memory')
      const { data, error } = await (row ? table.update(fields).eq('user_id', userId) : table.insert(fields))
        .select('goals, motivates, demotivates, talk_style, habits, updated_at')
        .single()
      if (error) throw error
      setMemory({ userId, row: data, loaded: true })
    },
    [userId, row],
  )

  const deleteAll = useCallback(async () => {
    const { error } = await supabase.from('cat_memory').delete().eq('user_id', userId)
    if (error) throw error
    await supabase.from('line_packs').delete().eq('user_id', userId) // they were made from it
    setMemory({ userId, row: null, loaded: true })
    setPackState({ key: null, pack: null })
  }, [userId])

  const setLearning = useCallback((on) => updateProfile({ learning: on }), [updateProfile])

  // ── after a chat goes quiet, the cat learns from it ──
  const learnSoon = useCallback(() => {
    clearTimeout(memoryTimer.current)
    if (learning !== true) return
    memoryTimer.current = setTimeout(() => askCat('memory', {}), QUIET_MS)
  }, [learning])
  useEffect(() => () => clearTimeout(memoryTimer.current), [])
  // and once when the app opens (a chat may have ended while it was closed)
  const askedOnOpen = useRef(null)
  useEffect(() => {
    if (learning !== true || !userId || askedOnOpen.current === userId) return
    askedOnOpen.current = userId
    askCat('memory', {})
  }, [learning, userId])

  // ── today's line pack (once a day, on the first open) ──
  const today = localDay()
  const packKey = learning === true && userId ? `${userId}|${today}|${catStyle.personality}|${catStyle.language}|${catStyle.spicy}` : null
  useEffect(() => {
    if (!packKey || packState.key === packKey) return
    let cancelled = false
    ;(async () => {
      let { data } = await supabase.from('line_packs').select('day, personality, language, spicy, lines').eq('day', today).maybeSingle()
      const fits = data && data.personality === catStyle.personality && data.language === catStyle.language && data.spicy === catStyle.spicy
      if (!fits) {
        const res = await askCat('pack', { timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone })
        data = res.data?.pack ?? null // a failed pack is fine: the fixed lines are there
      }
      if (cancelled) return
      setPackState({ key: packKey, pack: data })
    })()
    return () => {
      cancelled = true
    }
  }, [packKey, packState.key, today, catStyle.personality, catStyle.language, catStyle.spicy])

  // only a pack written for today's personality, language and spicy setting
  const pack = packKey && packState.key === packKey ? packState.pack : null
  const packLines =
    pack && pack.personality === catStyle.personality && pack.language === catStyle.language && pack.spicy === catStyle.spicy
      ? pack.lines.map((l, i) => ({ ...l, id: `pack.${pack.day}.${i + 1}` }))
      : null

  return {
    learning,
    setLearning,
    memory: memory.userId === userId ? memory.row : null,
    memoryLoaded: memory.userId === userId && memory.loaded,
    loadMemory,
    saveItem,
    // the last item deleted: no empty row left behind
    deleteItem: (key) => (row && MEMORY_ITEMS.every((i) => i.key === key || !row[i.key]) ? deleteAll() : saveItem(key, '')),
    deleteAll,
    learnSoon,
    packLines,
  }
}
