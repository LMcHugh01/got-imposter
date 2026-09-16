import { useState } from 'react'

const MAX_NAME_LENGTH = 24

// Strips a leading "house " the player might type themselves — the rest
// of the app always prefixes "House" on its own, so "House Stark" typed
// in would otherwise render as "House House Stark".
function normalizeName(raw) {
  const trimmed = raw.trim()
  return trimmed.replace(/^house\s+/i, '')
}

/**
 * pages/games/draft/DraftIntro.jsx
 *
 * The very first screen of the Draft game — name your house, then Play
 * Now begins the actual draft (fetching the draftable pool and creating
 * draft state, exactly as before; this screen just gates that start
 * behind naming the house you're about to build).
 */
export default function DraftIntro({ onPlay }) {
  const [name, setName] = useState('')

  const normalized = normalizeName(name)
  const canPlay = normalized.length > 0

  const handleSubmit = (e) => {
    e.preventDefault()
    if (canPlay) onPlay(normalized)
  }

  return (
    <div className="w-full max-w-sm flex flex-col gap-8 pt-10 pb-4 text-center">
      <div>
        <p className="text-got-parchment/40 text-xs tracking-[0.35em] uppercase" style={{ fontFamily: 'Cinzel, serif' }}>
          Game of Thrones
        </p>
        <h1
          className="text-4xl font-black tracking-wide text-got-gold mt-2"
          style={{ fontFamily: 'Cinzel, serif', textShadow: '0 0 30px rgba(201,168,76,0.35)' }}
        >
          The Draft
        </h1>
        <div className="gold-divider mt-4" />
        <p className="text-stone-500 text-sm mt-4 italic leading-relaxed" style={{ fontFamily: 'EB Garamond, serif' }}>
          Ten seats await a ruler. Build your council, then take your house to war.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <label
          htmlFor="house-name"
          className="text-got-gold/80 text-xs tracking-widest uppercase text-left"
          style={{ fontFamily: 'Cinzel, serif' }}
        >
          House Name
        </label>
        <div className="flex items-center rounded-lg border border-stone-700 bg-stone-900/60 focus-within:border-got-gold/50 transition-colors">
          <span className="pl-4 text-stone-500 text-lg select-none" style={{ fontFamily: 'Cinzel, serif' }}>
            House
          </span>
          <input
            id="house-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={MAX_NAME_LENGTH}
            placeholder="Baratheon"
            autoFocus
            className="flex-1 min-w-0 bg-transparent py-3.5 pl-2 pr-4 text-got-parchment text-lg outline-none placeholder:text-stone-700"
            style={{ fontFamily: 'Cinzel, serif' }}
          />
        </div>

        <button
          type="submit"
          disabled={!canPlay}
          className="w-full mt-3 py-4 rounded border border-got-gold bg-got-gold/10 text-got-gold text-lg tracking-widest uppercase transition-all duration-200 hover:bg-got-gold/20 active:scale-[0.98] disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-got-gold/10"
          style={{ fontFamily: 'Cinzel, serif' }}
        >
          Play Now
        </button>
      </form>
    </div>
  )
}
