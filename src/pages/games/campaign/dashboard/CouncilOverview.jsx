import { useState } from 'react'
import {
  computeHouseStats,
  overallHouseRating,
  ratingLabel,
  STAT_LABELS,
} from '../../../../gameEngine/houseStats'
import RoleScoreBadge from '../../../../components/RoleScoreBadge'
import HouseStatModal from './HouseStatModal'
import SectionHeading from './SectionHeading'

// Same gold9() tiering as the new design's mock — presentational only,
// reused wherever a number should read as more "alive" the higher it is.
function goldTier(v) {
  if (v >= 85) return '#d9b871'
  if (v >= 72) return '#efe7d7'
  if (v >= 58) return '#c5b89f'
  return '#a89b83'
}

/**
 * pages/games/draft/CouncilOverview.jsx
 *
 * A condensed, always-visible version of what Roster.jsx shows once at
 * the end of the draft — same computeHouseStats/overallHouseRating calls,
 * same data, just laid out to live permanently on the Campaign Dashboard.
 * `roster` is campaign.roster, the exact same draftEngine.getFinalRoster()
 * shape Roster.jsx already consumes, already in the fixed ROLES display
 * order (see data/roleWeights.js) that the seat grid below relies on.
 */
export default function CouncilOverview({ roster }) {
  const stats = computeHouseStats(roster)
  const overall = overallHouseRating(stats)
  const [openStatId, setOpenStatId] = useState(null)

  // Best/worst seat, purely a presentational reduce over fit scores
  // already computed at draft time — no new rating logic.
  let bestIdx = 0
  let worstIdx = 0
  roster.forEach((entry, i) => {
    if (entry.character.fit > roster[bestIdx].character.fit) bestIdx = i
    if (entry.character.fit < roster[worstIdx].character.fit) worstIdx = i
  })
  const best = roster[bestIdx]
  const worst = roster[worstIdx]
  const tiedBest = roster.filter((r) => r.character.fit === best.character.fit).length > 1
  const tiedWorst = roster.filter((r) => r.character.fit === worst.character.fit).length > 1

  const ringStyle = {
    background: `conic-gradient(#c9a75a 0 ${overall}%, #221c13 ${overall}% 100%)`,
  }

  return (
    <section className="flex flex-col gap-5">
      <SectionHeading label="Your Council" />

      {/* Overall ring + verdict + best/worst callout */}
      <div className="flex flex-wrap items-center gap-7">
        <div className="flex items-center gap-4 shrink-0">
          <div className="relative w-[100px] h-[100px] shrink-0 flex items-center justify-center rounded-full" style={ringStyle}>
            <div
              className="absolute inset-[8px] rounded-full"
              style={{ background: 'radial-gradient(circle at 50% 35%, #1a150e, #0a0908)' }}
            />
            <div className="relative text-center">
              <p className="text-got-gold text-3xl font-bold leading-none" style={{ fontFamily: 'Cinzel, serif' }}>
                {overall}
              </p>
              <p
                className="text-got-parchment/40 text-[9px] tracking-[0.22em] uppercase mt-1"
                style={{ fontFamily: 'Cinzel, serif' }}
              >
                Overall
              </p>
            </div>
          </div>
          <div className="min-w-0">
            <p className="text-got-gold/80 text-xs tracking-[0.18em] uppercase" style={{ fontFamily: 'Cinzel, serif' }}>
              {ratingLabel(overall)} house
            </p>
            <p className="text-stone-500 text-sm mt-1.5 max-w-[30ch] leading-snug">
              {best.character.name} is your finest seat at {best.character.fit}
              {tiedBest ? ' (tied)' : ''}. {worst.role.label} is the weak link at {worst.character.fit}
              {tiedWorst ? ' (tied)' : ''}.
            </p>
          </div>
        </div>

        {/* 6 pillars, tappable for their breakdown */}
        <div className="flex-1 min-w-[260px] grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-3">
          {Object.entries(stats).map(([statId, value]) => (
            <button key={statId} onClick={() => setOpenStatId(statId)} className="text-left group">
              <div className="flex items-baseline justify-between gap-2">
                <span
                  className="text-stone-500 text-[11px] tracking-[0.14em] uppercase whitespace-nowrap group-hover:text-stone-400"
                  style={{ fontFamily: 'Cinzel, serif' }}
                >
                  {STAT_LABELS[statId]}
                </span>
                <span className="font-semibold text-base" style={{ fontFamily: 'Cinzel, serif', color: goldTier(value) }}>
                  {value}
                </span>
              </div>
              <div className="h-[2px] bg-stone-800 mt-1.5">
                <div
                  className="h-full"
                  style={{
                    width: `${value}%`,
                    background: value >= 70 ? 'linear-gradient(90deg,#8a6f34,#d9b871)' : value >= 50 ? '#8d7a4e' : '#5c5038',
                  }}
                />
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Council seats — grid, fixed King/Cons/Hand/KG/Chmp/Cmdr/Laws/
          Coin/Whis/Maes order from ROLES, 5 wide desktop / 2 wide mobile. */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-2">
        {roster.map(({ role, character }, i) => {
          const tag = i === bestIdx ? (tiedBest ? 'Finest · tied' : 'Finest') : i === worstIdx ? (tiedWorst ? 'Weakest · tied' : 'Weakest') : null
          return (
            <div
              key={role.id}
              className="flex flex-col items-center gap-2 rounded-lg border border-stone-800 bg-stone-900/40 px-3 py-3 text-center"
            >
              <RoleScoreBadge score={character.fit} size="sm" />
              <div className="min-w-0">
                <p
                  className="text-stone-500 text-[10px] tracking-widest uppercase truncate"
                  style={{ fontFamily: 'Cinzel, serif' }}
                >
                  {role.label}
                </p>
                <p className="text-got-parchment text-sm truncate">{character.name}</p>
                {tag && (
                  <p
                    className={['text-[10px] tracking-widest uppercase mt-0.5', i === bestIdx ? 'text-got-gold/70' : 'text-got-red-bright/60'].join(' ')}
                    style={{ fontFamily: 'Cinzel, serif' }}
                  >
                    {tag}
                  </p>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {openStatId && (
        <HouseStatModal
          statId={openStatId}
          value={stats[openStatId]}
          roster={roster}
          onClose={() => setOpenStatId(null)}
        />
      )}
    </section>
  )
}