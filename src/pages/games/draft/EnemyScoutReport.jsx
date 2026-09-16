import { PERSONALITY_PROFILES, FORMATIONS } from '../../../gameEngine/battleEngine'
import { computeDuelShare } from '../../../gameEngine/duelEngine'
import { SHOW_DEBUG_NUMBERS } from '../../../config/features'

const TROOP_TYPE_INFO = {
  infantry: { label: 'Infantry', icon: '⚔' },
  archers: { label: 'Archers', icon: '🏹' },
  cavalry: { label: 'Cavalry', icon: '🐎' },
}

// Every personality PERSONALITY_PROFILES actually resolves to (i.e. every
// personality 'unpredictable' can reroll into) — used below to expand
// "could be unpredictable" into "could be any of these formations/
// tendencies", rather than showing "Unpredictable" as an opaque option.
const REROLLABLE_PERSONALITIES = Object.keys(PERSONALITY_PROFILES)

// One-line flavor per personality's fixed battle profile — reads the
// SAME dealt/taken/formation numbers resolvePersonalityProfile() resolves
// against (gameEngine/battleEngine.js), just described in words instead
// of multipliers.
const TENDENCY_BLURBS = {
  aggressive: 'Favors Cavalry Vanguard — hits harder, and takes more damage doing it.',
  defensive: 'Favors Shield Wall — hits and takes less, breaks late.',
  economic: 'Balanced Line — protects its own forces, breaks early rather than risk it all.',
  deceptive: 'Favors Skirmish Line — opens with a one-time surprise advantage.',
  diplomatic: 'Balanced Line — no major modifier either way.',
}

// Derives the set of Formations the enemy could plausibly open with, from
// the personality shortlist Gather Intelligence already narrowed —
// straight off PERSONALITY_PROFILES, the exact table
// resolvePersonalityProfile() uses at battle start. 'unpredictable' in
// the shortlist expands to every rerollable personality's formation,
// since that's genuinely what it could become.
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

function StatRange({ label, low, high, icon }) {
  return (
    <div className="flex justify-between items-baseline">
      <span className="text-stone-500 text-sm">
        {icon ? `${icon} ` : ''}
        {label}
      </span>
      <span className="text-got-parchment font-bold">
        {low.toLocaleString()}–{high.toLocaleString()}
      </span>
    </div>
  )
}

/**
 * pages/games/draft/EnemyScoutReport.jsx
 *
 * Everything the player's intelligence has (or hasn't) turned up about
 * the enemy: fogged ranges for army composition/quality/morale/supply
 * (straight off gatherIntelligence's report — no calculation happens
 * here), and the formations/tendencies their personality shortlist makes
 * possible. `report` is the same intelligence-report shape used
 * elsewhere (either the real Gather Intelligence result, or the blind
 * default) — this component only reads it, never generates it, so the
 * numbers can't drift depending on when/how often this re-renders.
 */
export default function EnemyScoutReport({ yourSide, enemySide, report, onPrepareForBattle, resuming }) {
  const formationIds = possibleFormationIds(report.personalityShortlist)
  const tendencyPersonalities = report.personalityShortlist.filter((p) => p !== 'unpredictable')
  const showsUnpredictable = report.personalityShortlist.includes('unpredictable')
  const duelShare = SHOW_DEBUG_NUMBERS ? computeDuelShare(yourSide, enemySide) : null

  return (
    <div id="enemy-scout-report" className="rounded-lg border border-got-red/30 bg-got-red/5 p-5 flex flex-col gap-5">
      <div>
        <p
          className="text-got-red-bright/70 text-xs tracking-[0.3em] uppercase"
          style={{ fontFamily: 'Cinzel, serif' }}
        >
          Enemy Scout Report
        </p>
        <h2 className="text-xl font-bold text-got-gold tracking-wide mt-1" style={{ fontFamily: 'Cinzel, serif' }}>
          {enemySide.name}
        </h2>
        <p className="text-stone-500 text-xs mt-1 italic" style={{ fontFamily: 'EB Garamond, serif' }}>
          {enemySide.flavorText}
        </p>
      </div>

      {/* Army composition — total + per troop type, each its own
          independent fogged range. */}
      <div className="rounded-lg border border-stone-700 bg-stone-900/60 p-4 flex flex-col gap-2">
        <StatRange label="Total Army" low={report.armyRangeLow} high={report.armyRangeHigh} />
        <div className="h-px bg-stone-800 my-1" />
        <StatRange label={TROOP_TYPE_INFO.infantry.label} icon={TROOP_TYPE_INFO.infantry.icon} low={report.infantryRangeLow} high={report.infantryRangeHigh} />
        <StatRange label={TROOP_TYPE_INFO.archers.label} icon={TROOP_TYPE_INFO.archers.icon} low={report.archersRangeLow} high={report.archersRangeHigh} />
        <StatRange label={TROOP_TYPE_INFO.cavalry.label} icon={TROOP_TYPE_INFO.cavalry.icon} low={report.cavalryRangeLow} high={report.cavalryRangeHigh} />
      </div>

      {/* Army quality / morale / supply — same narrowing-range treatment. */}
      <div className="rounded-lg border border-stone-700 bg-stone-900/60 p-4 flex flex-col gap-2">
        <StatRange label="Army Quality" low={report.armyQualityRangeLow} high={report.armyQualityRangeHigh} />
        <StatRange label="Morale" low={report.moraleRangeLow} high={report.moraleRangeHigh} />
        <StatRange label="Supply" low={report.supplyRangeLow} high={report.supplyRangeHigh} />
      </div>

      {/* Possible formations — derived, not a separate guess. */}
      <div className="flex flex-col gap-2">
        <p className="text-got-gold/80 text-xs tracking-widest uppercase" style={{ fontFamily: 'Cinzel, serif' }}>
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

      {/* Possible battle tendencies — one blurb per still-possible
          personality, straight off PERSONALITY_PROFILES. */}
      <div className="flex flex-col gap-2">
        <p className="text-got-gold/80 text-xs tracking-widest uppercase" style={{ fontFamily: 'Cinzel, serif' }}>
          Possible Approach
        </p>
        <div className="flex flex-col gap-1.5">
          {tendencyPersonalities.map((p) => (
            <div key={p} className="rounded-lg border border-stone-800 bg-stone-900/40 px-3 py-2">
              <p className="text-got-parchment text-sm capitalize" style={{ fontFamily: 'Cinzel, serif' }}>
                {p}
              </p>
              <p className="text-stone-500 text-xs mt-0.5 italic" style={{ fontFamily: 'EB Garamond, serif' }}>
                {TENDENCY_BLURBS[p]}
              </p>
            </div>
          ))}
          {showsUnpredictable && (
            <div className="rounded-lg border border-stone-800 bg-stone-900/40 px-3 py-2">
              <p className="text-got-parchment text-sm capitalize" style={{ fontFamily: 'Cinzel, serif' }}>
                Unpredictable
              </p>
              <p className="text-stone-500 text-xs mt-0.5 italic" style={{ fontFamily: 'EB Garamond, serif' }}>
                Could adopt any approach above once the fight starts.
              </p>
            </div>
          )}
        </div>
      </div>

      <p className="text-stone-600 text-xs italic" style={{ fontFamily: 'EB Garamond, serif' }}>
        Terrain also affects which Formation performs best — see Prepare for Battle.
      </p>

      {duelShare !== null && (
        <p className="text-stone-600 text-xs text-center">Power share: {Math.round(duelShare * 100)}%</p>
      )}

      <button
        onClick={onPrepareForBattle}
        className="w-full py-4 rounded border border-got-red bg-got-red/10 text-got-red-bright text-lg tracking-widest uppercase transition-all duration-200 hover:bg-got-red/20 active:scale-[0.98]"
        style={{ fontFamily: 'Cinzel, serif' }}
      >
        {resuming ? 'Resume Battle' : 'Prepare for Battle'}
      </button>
    </div>
  )
}
