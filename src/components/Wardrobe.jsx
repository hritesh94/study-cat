import { useEffect, useRef, useState } from 'react'
import { BREEDS, OUTFITS, breedThumb, lockStatus, outfitThumb } from '../game/catItems'
import './Wardrobe.css'

const asset = (path) => import.meta.env.BASE_URL + path

// One preview: the breed's picture, with the outfit's picture stacked on top
// (both thumbnails are full frames, so they line up exactly).
function Preview({ breed, outfit }) {
  return (
    <span className="wardrobe-thumb" aria-hidden="true">
      <img src={asset(breedThumb(breed))} alt="" draggable="false" />
      {outfit && <img src={asset(outfitThumb(outfit))} alt="" draggable="false" />}
    </span>
  )
}

// The "My Cat" panel: pick a breed and an outfit. Changes apply instantly.
// It's always in the page (just hidden when closed) so the game can measure
// it and keep the cat visible above it.
export function Wardrobe({ ref, open, onClose, look, onChange, progress }) {
  const [tab, setTab] = useState('breeds')
  const closeRef = useRef(null)

  // Escape closes; when it opens, move keyboard focus into the panel
  useEffect(() => {
    if (!open) return
    closeRef.current?.focus()
    const onKey = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  const items = tab === 'breeds' ? BREEDS : OUTFITS
  const isChosen = (item) => (tab === 'breeds' ? look.breed === item.id : (look.outfit ?? null) === item.id)
  const choose = (item) => onChange(tab === 'breeds' ? { ...look, breed: item.id } : { ...look, outfit: item.id })

  return (
    <section ref={ref} className="wardrobe" role="dialog" aria-label="My Cat" hidden={!open}>
      <header className="wardrobe-head">
        <h2>My Cat</h2>
        <button ref={closeRef} className="icon" onClick={onClose} aria-label="Close My Cat">
          ×
        </button>
      </header>

      <div className="wardrobe-tabs" role="tablist" aria-label="Wardrobe sections">
        {[
          ['breeds', 'Breeds'],
          ['outfits', 'Outfits'],
        ].map(([id, label]) => (
          <button key={id} role="tab" aria-selected={tab === id} className={tab === id ? 'on' : undefined} onClick={() => setTab(id)}>
            {label}
          </button>
        ))}
      </div>

      <div className="wardrobe-grid" role="tabpanel" aria-label={tab === 'breeds' ? 'Breeds' : 'Outfits'}>
        {items.map((item) => {
          const { locked, label } = lockStatus(item, progress)
          const chosen = isChosen(item)
          return (
            <button
              key={item.id ?? 'none'}
              className={`wardrobe-item${chosen ? ' chosen' : ''}${locked ? ' locked' : ''}`}
              aria-pressed={chosen}
              disabled={locked}
              onClick={() => choose(item)}
            >
              <Preview breed={tab === 'breeds' ? item.id : look.breed} outfit={tab === 'breeds' ? null : item.id} />
              <span className="wardrobe-name">{item.name}</span>
              {locked && <span className="wardrobe-lock">🔒 {label}</span>}
              {chosen && (
                <span className="wardrobe-check" aria-hidden="true">
                  ✓
                </span>
              )}
            </button>
          )
        })}
      </div>
    </section>
  )
}
