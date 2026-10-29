// The profile as catVoice wants it: personality, language, spicy, and, when
// "Let the cat learn about me" is on, what the cat learned (cat_memory).
export async function voiceProfile(store) {
  const profile = await store.profile()
  if (profile?.learning === true) {
    const memory = await store.memory().catch(() => null)
    if (memory) return { ...profile, memory }
  }
  return profile
}
