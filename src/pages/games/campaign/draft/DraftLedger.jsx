import { useState } from 'react'
import { ROLE_WEIGHTS } from '../../../../data/roleWeights'
import { CHAMPION_STYLE_WEIGHTS, CHAMPION_STYLE_LABELS } from '../../../../data/championStyles'
import { ATTRIBUTE_LABELS, ALL_ATTRIBUTE_KEYS } from '../../../../data/attributes'
import { fitLabel } from './fitLabel'

/**
 * pages/games/draft/DraftLedger.jsx
 *
 * The "ledger-style character summary" shown right after a character is
 * sworn in to a role. Deliberately reads from data the engine already
 * computed/owns rather than recalculating anything:
 *   - `character.fit` comes straight from draftEngine.assignRole (which
 *     itself calls gameEngine/ratings.js) — not recomputed here.
 *   - The "role coefficients" breakdown below reads ROLE_WEIGHTS /
 *     CHAMPION_STYLE_WEIGHTS directly (the same config roleRating() uses)
 *     just to decide which attributes to surface and in what order.
 *   - The full-ledger toggle reads ATTRIBUTE_LABELS / ALL_ATTRIBUTE_KEYS,
 *     the existing 23-attribute source of truth.
 *
 * This is NOT a second Ledger page — it only ever renders inline as part
 * of the character-selection flow, for whichever character was just
 * assigned, and disappears once the player moves on.
 */

function weightsForRole(roleId, fightingStyle) {
  if (roleId === 'champion') {
    return fightingStyle ? CHAMPION_STYLE_WEIGHTS[fightingStyle] : null
  }
  return ROLE_WEIGHTS[roleId] ?? null
}

// Top N attributes by |weight| — the ones that actually moved this
// character's fit score for this role, positive or negative.
function topWeightedAttributes(roleId, fightingStyle, count = 6) {
  const weights = weightsForRole(roleId, fightingStyle)
  if (!weights) return []
  return Object.entries(weights)
    .sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))
    .slice(0, count)
    .map(([attr, weight]) => ({ attr, weight }))
}

function valueTone(value) {
  if (value >= 85) return 'text-got-gold-light'
  if (value >= 70) return 'text-got-parchment'
  if (value >= 55) return 'text-got-parchment/70'
  return 'text-stone-500'
}

export default function DraftLedger({ role, character, isFinal, onContinue }) {
  const [showFullLedger, setShowFullLedger] = useState(false)

  const tier = fitLabel(character.fit)
  const breakdown = topWeightedAttributes(role.id, character.fightingStyle)

  return (
    <div className="rounded-lg border border-got-gold/30 bg-stone-900/40 p-5 sm:p-6">
      <div className="text-center">
        <p
          className="text-got-parchment/40 text-xs tracking-[0.3em] uppercase"
          style={{ fontFamily: 'Cinzel, serif' }}
        >
          Sworn to Your Council
        </p>
        <p className="text-got-parchment text-2xl font-semibold mt-2" style={{ fontFamily: 'Cinzel, serif' }}>
          {character.name}
        </p>
        <p className="text-stone-500 text-sm mt-0.5">{character.house ?? 'Unaffiliated'}</p>
        {role.id === 'champion' && character.fightingStyle && (
          <p className="text-stone-500 text-xs mt-1 italic" style={{ fontFamily: 'EB Garamond, serif' }}>
            Fighting style: {CHAMPION_STYLE_LABELS[character.fightingStyle]}
          </p>
        )}

        <div className="flex items-baseline justify-center gap-2 mt-4">
          <span className="text-got-gold text-5xl font-black" style={{ fontFamily: 'Cinzel, serif' }}>
            {character.fit}
          </span>
          <span
            className="text-got-parchment/40 text-xs tracking-widest uppercase text-left"
            style={{ fontFamily: 'Cinzel, serif' }}
          >
            Fit as
            <br />
            {role.label}
          </span>
        </div>
        <p className="text-got-gold/70 text-xs tracking-[0.22em] uppercase mt-2" style={{ fontFamily: 'Cinzel, serif' }}>
          {tier} Fit
        </p>
      </div>

      <div className="gold-divider my-5" />

      <p
        className="text-got-parchment/40 text-xs tracking-[0.24em] uppercase mb-3"
        style={{ fontFamily: 'Cinzel, serif' }}
      >
        What the seat asked of them
      </p>

      <div className="flex flex-col gap-3">
        {breakdown.map(({ attr, weight }) => {
          const value = character.attributes[attr]
          return (
            <div key={attr}>
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-stone-400 text-sm">{ATTRIBUTE_LABELS[attr]}</span>
                <span className="text-stone-600 text-[11px]" style={{ fontFamily: 'Cinzel, serif' }}>
                  {weight > 0 ? '+' : ''}
                  {Math.round(weight * 100)}%
                </span>
                <span
                  className={['text-sm font-semibold', valueTone(value)].join(' ')}
                  style={{ fontFamily: 'Cinzel, serif' }}
                >
                  {value}
                </span>
              </div>
              <div className="h-[3px] bg-stone-800 mt-1 rounded-full overflow-hidden">
                <div
                  className={weight >= 0 ? 'h-full bg-got-gold/70' : 'h-full bg-got-red/60'}
                  style={{ width: `${value}%` }}
                />
              </div>
            </div>
          )
        })}
      </div>

      <button
        onClick={() => setShowFullLedger((v) => !v)}
        className="w-full mt-5 py-3 rounded border border-stone-700 text-stone-400 text-xs tracking-[0.2em] uppercase transition-colors hover:border-got-gold/40 hover:text-got-gold"
        style={{ fontFamily: 'Cinzel, serif' }}
      >
        {showFullLedger ? 'Hide full ledger' : `Full ledger · ${ALL_ATTRIBUTE_KEYS.length} attributes`}
      </button>

      {showFullLedger && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-5 gap-y-1.5 mt-4">
          {ALL_ATTRIBUTE_KEYS.map((attr) => (
            <div key={attr} className="flex items-baseline justify-between gap-2 border-b border-stone-800/80 py-1">
              <span className="text-stone-500 text-xs truncate">{ATTRIBUTE_LABELS[attr]}</span>
              <span
                className={['text-xs font-semibold', valueTone(character.attributes[attr])].join(' ')}
                style={{ fontFamily: 'Cinzel, serif' }}
              >
                {character.attributes[attr]}
              </span>
            </div>
          ))}
        </div>
      )}

      <button
        onClick={onContinue}
        className="w-full mt-3 py-4 rounded border border-got-gold bg-got-gold/10 text-got-gold text-sm font-bold tracking-widest uppercase transition-all duration-200 hover:bg-got-gold/20 active:scale-[0.98]"
        style={{ fontFamily: 'Cinzel, serif' }}
      >
        {isFinal ? 'Seat the Council' : 'Summon the Next Five'}
      </button>
    </div>
  )
}