import { useState } from 'react'
import { GameHomePage, GamePrimaryButton, GameBackLink, CINZEL } from './GameHome'
import { GameHeroFor } from './GameMark'
import RecordPrompt from './RecordPrompt'

const MAX_NAME_LENGTH = 20

// Strips a leading "house " the player might type themselves — the rest
// of the app always prefixes "House" on its own, so "House Stark" typed
// in would otherwise render as "House House Stark".
export function normalizeHouseName(raw) {
  return raw.trim().replace(/^house\s+/i, '')
}

/**
 * components/HouseNameIntro.jsx
 *
 * Start screen for games where the player names their house first
 * (Draft, Campaign). The hero (mark, tagline, name, motto) comes from the
 * game's entry in data/games.js; the game supplies its description and
 * the button's words.
 */
export default function HouseNameIntro({ gameId, description, cta, onPlay }) {
  const [name, setName] = useState('')
  const normalized = normalizeHouseName(name)
  const canPlay = normalized.length > 0

  const handleSubmit = (e) => {
    e.preventDefault()
    if (canPlay) onPlay(normalized)
  }

  return (
    <GameHomePage>
      <GameHeroFor id={gameId} description={description} />

      <form onSubmit={handleSubmit} className="w-full flex flex-col items-center">
        <div className="w-full max-w-[440px] mt-[52px]">
          <label
            htmlFor="house-name"
            className="block text-[11px] uppercase tracking-[0.32em] text-[#9d9484]"
            style={CINZEL}
          >
            House Name
          </label>
          <div
            className="flex items-baseline justify-center gap-3 mt-3.5 pb-3 border-b border-[rgba(216,184,120,.35)] focus-within:border-[#d8b878] transition-colors cursor-text"
            onClick={() => document.getElementById('house-name')?.focus()}
          >
            <span className="text-[26px] tracking-[0.14em] text-[#b39a68] select-none" style={CINZEL}>
              House
            </span>
            <input
              id="house-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={MAX_NAME_LENGTH}
              placeholder="Baratheon"
              autoComplete="off"
              autoFocus
              className="min-w-0 max-w-full bg-transparent border-none outline-none p-0 text-[26px] tracking-[0.14em] text-[#f1e6cc] caret-[#d8b878] placeholder:text-[#5f584d]"
              style={{ ...CINZEL, width: `${Math.max(name.length, 9) * 0.95}em` }}
            />
          </div>
        </div>

        <GamePrimaryButton type="submit" disabled={!canPlay} className="mt-11">
          {cta}
        </GamePrimaryButton>
      </form>

      <RecordPrompt className="mt-8" />

      <GameBackLink />
    </GameHomePage>
  )
}