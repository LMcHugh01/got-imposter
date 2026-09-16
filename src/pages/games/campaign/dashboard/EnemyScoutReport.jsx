import { PERSONALITY_PROFILES, FORMATIONS } from '../../../../gameEngine/battleEngine'
import { computeDuelShare } from '../../../../gameEngine/duelEngine'
import { SHOW_DEBUG_NUMBERS } from '../../../../config/features'
import SectionHeading from './SectionHeading'

const REROLLABLE_PERSONALITIES = Object.keys(PERSONALITY_PROFILES)

const TENDENCY_BLURBS = {
  aggressive: 'Favors Cavalry Vanguard — hits harder, and takes more damage doing it.',
  defensive: 'Favors Shield Wall — hits and takes less, breaks late.',
  economic: 'Balanced Line — protects its own forces, breaks early rather than risk it all.',
  deceptive: 'Favors Skirmish Line — opens with a one-time surprise advantage.',
  diplomatic: 'Balanced Line — no major modifier either way.',
}

function possibleFormationIds(personalityShortlist) {
  const ids = new Set()
  for (const p of personalityShortlist) {
    if (p === 'unpredictable') {
      REROLLABLE_PERSONALITIES.forEach((rp) => ids.add(PERSONALITY_PROFILES[rp].formationId))
    } else if (PERSONALITY_PROFILES[p]) {
      ids.add(PERSONALITY_PROFILES[p].formationId)
    }
  }
  return [...ids]
}

// Same tiering as fitLabel.js's tiers, applied to the real accuracy
// number that produced this report (0 when unscouted) — not a fabricated
// confidence score.
function intelWord(v) {
  if (v >= 85) return 'Certain'
  if (v >= 65) return 'Reliable'
  if (v >= 45) return 'Partial'
  if (v > 0) return 'Rumour'
  return 'Blind guess'
}

function EstimateRow({ label, low, high, yourValue, scale }) {
  const exact = high <= low
  const lowPct = Math.max(0, Math.min(100, (low / scale) * 100))
  const highPct = Math.max(0, Math.min(100, (high / scale) * 100))
  const yoursPct = Math.max(0, Math.min(100, (yourValue / scale) * 100))

  return (
    <div className="py-2.5 border-b border-stone-900">
      <div className="flex justify-between items-baseline gap-3">
        <span className="text-stone-300 text-sm">{label}</span>
        <span className="text-got-gold text-sm whitespace-nowrap" style={{ fontFamily: 'Cinzel, serif' }}>
          {exact ? Math.round(low).toLocaleString() : `${Math.round(low).toLocaleString()}–${Math.round(high).toLocaleString()}`}
        </span>
      </div>
      <div className="relative h-[6px] bg-stone-900 mt-2">
        <div
          className="absolute inset-y-0"
          style={{
            left: `${lowPct}%`,
            width: `${Math.max(1.5, highPct - lowPct)}%`,
            background: 'linear-gradient(90deg,rgba(176,74,62,.35),rgba(214,122,104,.75),rgba(176,74,62,.35))',
          }}
        />
        <div className="absolute -top-[3px] -bottom-[3px] w-[2px] bg-got-gold" style={{ left: `${yoursPct}%` }} title="Your strength" />
      </div>
    </div>
  )
}

/**
 * pages/games/draft/EnemyScoutReport.jsx
 *
 * Everything the player's intelligence has (or hasn't) turned up about
 * the enemy: fogged ranges for army composition/quality/morale/supply
 * (straight off gatherIntelligence's report — no calculation happens
 * here), each shown against your own value on the same scale, and the
 * formations/tendencies their personality shortlist makes possible.
 * `report` and `intelRating` are both read-only inputs computed by the
 * parent, never generated here, so nothing on this screen can drift from
 * the underlying numbers depending on how often it re-renders.
 */
export default function EnemyScoutReport({ yourSide, enemySide, report, intelRating }) {
  const formationIds = possibleFormationIds(report.personalityShortlist)
  const tendencyPersonalities = report.personalityShortlist.filter((p) => p !== 'unpredictable')
  const showsUnpredictable = report.personalityShortlist.includes('unpredictable')
  const duelShare = SHOW_DEBUG_NUMBERS ? computeDuelShare(yourSide, enemySide) : null

  const rows = [
    {
      label: 'Total Army',
      low: report.armyRangeLow,
      high: report.armyRangeHigh,
      yourValue: yourSide.armySize,
      scale: Math.max(report.armyRangeHigh, yourSide.armySize) * 1.15,
    },
    {
      label: 'Infantry',
      low: report.infantryRangeLow,
      high: report.infantryRangeHigh,
      yourValue: yourSide.troops.infantry,
      scale: Math.max(report.infantryRangeHigh, yourSide.troops.infantry, 1) * 1.15,
    },
    {
      label: 'Archers',
      low: report.archersRangeLow,
      high: report.archersRangeHigh,
      yourValue: yourSide.troops.archers,
      scale: Math.max(report.archersRangeHigh, yourSide.troops.archers, 1) * 1.15,
    },
    {
      label: 'Cavalry',
      low: report.cavalryRangeLow,
      high: report.cavalryRangeHigh,
      yourValue: yourSide.troops.cavalry,
      scale: Math.max(report.cavalryRangeHigh, yourSide.troops.cavalry, 1) * 1.15,
    },
    { label: 'Army Quality', low: report.armyQualityRangeLow, high: report.armyQualityRangeHigh, yourValue: yourSide.armyQuality, scale: 100 },
    { label: 'Morale', low: report.moraleRangeLow, high: report.moraleRangeHigh, yourValue: yourSide.morale, scale: 100 },
    { label: 'Supply', low: report.supplyRangeLow, high: report.supplyRangeHigh, yourValue: yourSide.supply, scale: 100 },
  ]

  return (
    <section
      id="enemy-scout-report"
      className="flex flex-col gap-5 pt-6 border-t border-stone-800"
      style={{ background: 'radial-gradient(700px 260px at 16% 0%, rgba(150,40,34,.09), transparent 70%)' }}
    >
      <SectionHeading label="Enemy Scout Report" tone="red" />

      <div className="flex flex-wrap gap-6 items-end">
        <div className="flex-1 min-w-[220px]">
          <h2 className="text-2xl font-bold text-got-gold tracking-wide" style={{ fontFamily: 'Cinzel, serif' }}>
            {enemySide.name}
          </h2>
          <p className="text-stone-500 text-sm mt-1 italic max-w-[46ch]" style={{ fontFamily: 'EB Garamond, serif' }}>
            {enemySide.flavorText}
          </p>
        </div>
        <div className="flex-1 min-w-[200px] max-w-[320px]">
          <div className="flex justify-between items-baseline gap-2">
            <span className="text-got-parchment/40 text-[11px] tracking-[0.2em] uppercase" style={{ fontFamily: 'Cinzel, serif' }}>
              Intelligence
            </span>
            <span className="text-got-gold text-sm" style={{ fontFamily: 'Cinzel, serif' }}>
              {Math.round(intelRating)} · {intelWord(intelRating)}
            </span>
          </div>
          <div className="h-[3px] bg-stone-900 mt-2">
            <div
              className="h-full"
              style={{ width: `${Math.min(100, intelRating)}%`, background: 'linear-gradient(90deg,#8a6f34,#d9b871)' }}
            />
          </div>
          <p className="text-stone-600 text-xs italic mt-1.5">
            {intelRating >= 65 ? 'Estimates below are close to the truth.' : 'Estimates are wide — gathering intelligence will narrow them.'}
          </p>
        </div>
      </div>

      {/* Estimate rows, each against your own value on the same scale */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-8">
        {rows.map((row) => (
          <EstimateRow key={row.label} {...row} />
        ))}
      </div>
      <div className="flex items-center gap-2 -mt-2">
        <div className="w-[2px] h-3 bg-got-gold shrink-0" />
        <p className="text-stone-500 text-xs italic">Gold marker shows your own strength on the same scale.</p>
      </div>

      {/* Possible formations */}
      <div className="flex flex-col gap-2">
        <p className="text-got-parchment/40 text-[11px] tracking-[0.22em] uppercase" style={{ fontFamily: 'Cinzel, serif' }}>
          Possible Formations
        </p>
        <div className="flex flex-wrap gap-1.5">
          {formationIds.map((id) => (
            <span
              key={id}
              className="text-got-parchment text-xs rounded-full border border-stone-700 bg-stone-900/60 px-2.5 py-1"
            >
              {FORMATIONS[id].label}
            </span>
          ))}
        </div>
      </div>

      {/* Possible approach */}
      <div className="flex flex-col gap-2">
        <p className="text-got-parchment/40 text-[11px] tracking-[0.22em] uppercase" style={{ fontFamily: 'Cinzel, serif' }}>
          Possible Approach
        </p>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-8">
          {tendencyPersonalities.map((p) => (
            <div key={p} className="py-2 border-b border-stone-900">
              <p className="text-got-parchment text-sm capitalize" style={{ fontFamily: 'Cinzel, serif' }}>
                {p}
              </p>
              <p className="text-stone-500 text-xs mt-0.5 italic">{TENDENCY_BLURBS[p]}</p>
            </div>
          ))}
          {showsUnpredictable && (
            <div className="py-2 border-b border-stone-900">
              <p className="text-got-parchment text-sm capitalize" style={{ fontFamily: 'Cinzel, serif' }}>
                Unpredictable
              </p>
              <p className="text-stone-500 text-xs mt-0.5 italic">Could adopt any approach above once the fight starts.</p>
            </div>
          )}
        </div>
      </div>

      <p className="text-stone-600 text-xs italic">Terrain also affects which Formation performs best — see Prepare for Battle.</p>

      {duelShare !== null && (
        <p className="text-stone-700 text-xs text-center">Power share: {Math.round(duelShare * 100)}%</p>
      )}
    </section>
  )
}