// ───────────── Everything you can choose for your cat ─────────────
// One list for the wardrobe now, and for the shop later.
//
// Each item can get a `lock`. Right now every lock is `null` (unlocked).
// Later, with coins and streaks from Supabase, an item could be:
//   lock: { price: 120 }     // costs 120 coins
//   lock: { streak: 7 }      // unlocks after a 7-day study streak
// and `lockStatus()` below decides whether it's available.
//
// `id` must match the names in public/game/cat/study-cat.json.
// ────────────────────────────────────────────────────────────────────

export const BREEDS = [
  { id: 'orange', name: 'Orange tabby', lock: null },
  { id: 'tuxedo', name: 'Tuxedo', lock: null },
  { id: 'white', name: 'White', lock: null },
  { id: 'calico', name: 'Calico', lock: null },
  { id: 'siamese', name: 'Siamese', lock: null },
]

export const OUTFITS = [
  { id: null, name: 'None', lock: null },
  { id: 'beanie', name: 'Beanie', lock: null },
  { id: 'scarf', name: 'Scarf', lock: null },
  { id: 'bow', name: 'Bow', lock: null },
  { id: 'hoodie', name: 'Hoodie', lock: null },
  { id: 'flowers', name: 'Flower crown', lock: null },
]

// Preview pictures: the first frame of `sit_front`, cut out of each sheet by
// `npm run thumbs` (tools/make-thumbs.mjs), so the wardrobe doesn't have to
// download every full sheet just to show tiny pictures.
export const breedThumb = (id) => `game/cat/thumbs/breeds/${id}.png`
export const outfitThumb = (id) => `game/cat/thumbs/outfits/${id}.png`

// Is this item available? `progress` will come from the backend later:
// { coins, streak, owned: Set of item ids }.
export function lockStatus(item, progress = {}) {
  const { lock } = item
  if (!lock) return { locked: false }
  if (progress.owned?.has(item.id)) return { locked: false }
  if (lock.streak != null && (progress.streak ?? 0) >= lock.streak) return { locked: false }
  if (lock.price != null) return { locked: true, label: `${lock.price} coins` }
  if (lock.streak != null) return { locked: true, label: `${lock.streak}-day streak` }
  return { locked: true, label: 'Locked' }
}
