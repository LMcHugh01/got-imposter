import { useState } from 'react'
import {
  computeHouseStats,
  overallHouseRating,
  houseStrengthsWeaknesses,
  ratingLabel,
  STAT_LABELS,
} from '../../../gameEngine/houseStats'
import RoleScoreBadge from '../../../components/RoleScoreBadge'
import HouseStatModal from './HouseStatModal'

/**
 * pages/games/draft/CouncilOverview.jsx
 *
 * A condensed, always-visible version of what Roster.jsx shows once at
 * the end of the draft — same computeHouseStats/overallHouseRating/
 * houseStrengthsWeaknesses calls, same data, just laid out to live
 * permanently on the Campaign Dashboard instead of a one-time reveal
 * screen. `roster` is campaign.roster, the exact same
 * draftEngine.getFinalRoster() shape Roster.jsx already consumes.
 */
export default function CouncilOverview({ roster }) {
  const stats = computeHouseStats(roster)
  const overall = overallHouseRating(stats)
  const { strengths, weaknesses } = houseStrengthsWeaknesses(stats)
  // Which stat's breakdown modal is open, if any — null closes it.
  const [openStatId, setOpenStatId] = useState(null)

  return (
    <div className="rounded-lg border border-got-gold/30 bg-stone-900/40 p-5 flex flex-col gap-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p
            className="text-got-parchment/40 text-xs tracking-[0.26em] uppercase"
            style={{ fontFamily: 'Cinzel, serif' }}
          >
            Your Council
          </p>
          <p className="text-got-parchment text-sm mt-0.5">House rating, always in view</p>
        </div>
        <div className="text-right shrink-0">
          <p
            className="text-got-parchment/40 text-[11px] tracking-[0.22em] uppercase"
            style={{ fontFamily: 'Cinzel, serif' }}
          >
            Overall
          </p>
          <p className="text-got-gold text-3xl font-black" style={{ fontFamily: 'Cinzel, serif' }}>
            {overall}
          </p>
        </div>
      </div>

      {/* 6 house stats, condensed — each tappable for its breakdown */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
        {Object.entries(stats).map(([statId, value]) => (
          <button
            key={statId}
            onClick={() => setOpenStatId(statId)}
            className="rounded-lg border border-stone-700 bg-stone-900/60 p-2 text-center transition-all duration-200 hover:border-got-gold/50 hover:bg-stone-900/80 active:scale-[0.97]"
          >
            <p
              className="text-got-gold/70 text-[10px] tracking-widest uppercase truncate"
              style={{ fontFamily: 'Cinzel, serif' }}
            >
              {STAT_LABELS[statId]}
            </p>
            <p className="text-got-parchment text-base font-bold mt-0.5" style={{ fontFamily: 'Cinzel, serif' }}>
              {value}
            </p>
          </button>
        ))}
      </div>

      {(strengths.length > 0 || weaknesses.length > 0) && (
        <div className="flex flex-wrap gap-1.5">
          {strengths.map((s) => (
            <span
              key={s}
              className="text-got-gold/80 text-[11px] rounded-full border border-got-gold/30 bg-got-gold/5 px-2 py-0.5"
            >
              ✓ {s.charAt(0).toUpperCase() + s.slice(1)}
            </span>
          ))}
          {weaknesses.map((w) => (
            <span
              key={w}
              className="text-got-red-bright/70 text-[11px] rounded-full border border-got-red/30 bg-got-red/5 px-2 py-0.5"
            >
              ⚠ {w}
            </span>
          ))}
        </div>
      )}

      {/* Council seats — a grid rather than a scroll list, so all 10 are
          visible at a glance. */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-2">
        {roster.map(({ role, character }) => (
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
            </div>
          </div>
        ))}
      </div>

      <p className="text-stone-600 text-[11px] italic text-center" style={{ fontFamily: 'EB Garamond, serif' }}>
        {ratingLabel(overall)} house · potential, not a prediction
      </p>

      {openStatId && (
        <HouseStatModal
          statId={openStatId}
          value={stats[openStatId]}
          roster={roster}
          onClose={() => setOpenStatId(null)}
        />
      )}
    </div>
  )
}