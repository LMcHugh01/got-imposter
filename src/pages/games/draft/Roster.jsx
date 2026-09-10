import {
  computeHouseStats,
  overallHouseRating,
  houseStrengthsWeaknesses,
  ratingLabel,
  STAT_LABELS,
} from '../../../gameEngine/houseStats'
import { SHOW_DEBUG_NUMBERS } from '../../../config/features'

export default function Roster({ roster }) {
  const stats = computeHouseStats(roster)
  const overall = overallHouseRating(stats)
  const { strengths, weaknesses } = houseStrengthsWeaknesses(stats)

  return (
    <div className="w-full max-w-sm flex flex-col gap-6 pt-4 pb-4">
      <div className="text-center">
        <h1
          className="text-3xl font-bold tracking-widest uppercase text-got-gold"
          style={{ fontFamily: 'Cinzel, serif' }}
        >
          Your Council
        </h1>
        <div className="gold-divider mt-3" />
      </div>

      {/* Overall rating */}
      <div className="text-center rounded-lg border border-got-gold/40 bg-got-gold/5 p-6">
        <p
          className="text-got-gold/70 text-xs tracking-[0.3em] uppercase"
          style={{ fontFamily: 'Cinzel, serif' }}
        >
          Overall House Rating
        </p>
        <p className="text-got-gold text-5xl font-black mt-2" style={{ fontFamily: 'Cinzel, serif' }}>
          {overall}
        </p>
        <p className="text-stone-500 text-xs mt-1 italic" style={{ fontFamily: 'EB Garamond, serif' }}>
          Potential, not a prediction — the campaign decides the rest.
        </p>
      </div>

      {/* Stat breakdown */}
      <div className="grid grid-cols-2 gap-2">
        {Object.entries(stats).map(([statId, value]) => (
          <div key={statId} className="rounded-lg border border-stone-700 bg-stone-900/60 p-3">
            <p
              className="text-got-gold/80 text-xs tracking-widest uppercase"
              style={{ fontFamily: 'Cinzel, serif' }}
            >
              {STAT_LABELS[statId]}
            </p>
            <div className="flex items-center justify-between mt-1">
              <span className="text-stone-500 text-xs">{ratingLabel(value)}</span>
              <span className="text-got-parchment text-lg font-bold">{value}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Strengths / weaknesses */}
      {(strengths.length > 0 || weaknesses.length > 0) && (
        <div className="rounded-lg border border-stone-700 bg-stone-900/40 p-4 flex flex-col gap-3">
          {strengths.length > 0 && (
            <div>
              <p
                className="text-got-gold text-xs tracking-widest uppercase mb-1"
                style={{ fontFamily: 'Cinzel, serif' }}
              >
                Strengths
              </p>
              {strengths.map((s) => (
                <p key={s} className="text-got-parchment/80 text-sm">
                  ✓ {s.charAt(0).toUpperCase() + s.slice(1)}
                </p>
              ))}
            </div>
          )}
          {weaknesses.length > 0 && (
            <div>
              <p
                className="text-got-red-bright text-xs tracking-widest uppercase mb-1"
                style={{ fontFamily: 'Cinzel, serif' }}
              >
                Weaknesses
              </p>
              {weaknesses.map((w) => (
                <p key={w} className="text-got-parchment/60 text-sm">
                  ⚠ {w}
                </p>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Role-by-role roster */}
      <div className="flex flex-col gap-3">
        {roster.map(({ role, character }) => (
          <div
            key={role.id}
            className="rounded-lg border border-stone-700 bg-stone-900/60 p-4 flex justify-between items-center"
          >
            <div>
              <p
                className="text-got-gold text-xs tracking-widest uppercase"
                style={{ fontFamily: 'Cinzel, serif' }}
              >
                {role.label}
              </p>
              <p className="text-got-parchment text-lg">{character.name}</p>
              <p className="text-stone-500 text-xs">{character.house ?? 'Unaffiliated'}</p>
            </div>
            {SHOW_DEBUG_NUMBERS && <p className="text-got-gold-light text-xl font-bold">{character.fit}%</p>}
          </div>
        ))}
      </div>
    </div>
  )
}