import { FORMATIONS } from '../../../gameEngine/battleEngine'
import { STRATEGY_INFO, OPENING_STRATEGIES, FORMATION_INFO, FORMATION_ORDER } from './Battle'

const TERRAIN_LABELS = {
  plains: 'Plains',
  forest: 'Forest',
  hills: 'Hills',
  riverlands: 'Riverlands',
  snowfields: 'Snowfields',
}

/**
 * pages/games/draft/PrepareForBattleModal.jsx
 *
 * Opened from the "Prepare for Battle" button on EnemyHouseOverview.
 * Shows the fogged terrain shortlist (same shape/source as the
 * personality shortlist — gatherIntelligence's terrainShortlist), then
 * the Formation + opening Strategy pickers (the same
 * STRATEGY_INFO/OPENING_STRATEGIES/FORMATION_INFO/FORMATION_ORDER
 * Battle.jsx exports — one copy of this presentation data, same as
 * before). Neither picker preselects a value: "Go to Battle" only
 * enables once both are chosen.
 *
 * When `resuming` is true (returning from a Retreat), formation/strategy
 * already carry forward from the original attempt, so this shows a
 * simple confirmation instead of the pickers.
 */
export default function PrepareForBattleModal({
  yourSide,
  enemySide,
  terrainShortlist,
  formationId,
  strategyId,
  onFormationChange,
  onStrategyChange,
  onBack,
  onGoToBattle,
  resuming = false,
}) {
  if (resuming) {
    return (
      <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
        <div onClick={onBack} className="absolute inset-0 bg-black/80" />
        <div
          className="relative w-full max-w-md border-t border-got-gold/30 bg-got-charcoal p-6 sm:rounded-lg sm:border flex flex-col gap-4"
          style={{ background: 'linear-gradient(#15110c, #0e0c0a)' }}
        >
          <div className="text-center">
            <p
              className="text-got-parchment/40 text-xs tracking-[0.3em] uppercase"
              style={{ fontFamily: 'Cinzel, serif' }}
            >
              Prepare for Battle
            </p>
            <h2 className="text-xl font-bold text-got-gold tracking-wide mt-1" style={{ fontFamily: 'Cinzel, serif' }}>
              {enemySide.name}
            </h2>
            <p className="text-stone-500 text-xs mt-2 italic" style={{ fontFamily: 'EB Garamond, serif' }}>
              Your formation and orders carry forward from before the retreat.
            </p>
          </div>
          <div className="flex flex-col gap-2 mt-2">
            <button
              onClick={onGoToBattle}
              className="w-full py-3.5 rounded border border-got-red bg-got-red/10 text-got-red-bright text-sm font-bold tracking-widest uppercase transition-all duration-200 hover:bg-got-red/20 active:scale-[0.98]"
              style={{ fontFamily: 'Cinzel, serif' }}
            >
              Resume Battle
            </button>
            <button
              onClick={onBack}
              className="w-full py-3.5 rounded border border-stone-700 text-stone-400 text-sm tracking-widest uppercase transition-colors hover:border-got-gold/40 hover:text-got-gold"
              style={{ fontFamily: 'Cinzel, serif' }}
            >
              Back
            </button>
          </div>
        </div>
      </div>
    )
  }

  const canGoToBattle = Boolean(formationId) && Boolean(strategyId)

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
      <div onClick={onBack} className="absolute inset-0 bg-black/80" />
      <div
        className="relative w-full max-w-md max-h-[85vh] overflow-y-auto border-t border-got-gold/30 bg-got-charcoal p-6 sm:rounded-lg sm:border flex flex-col gap-5"
        style={{ background: 'linear-gradient(#15110c, #0e0c0a)' }}
      >
        <div className="text-center">
          <p
            className="text-got-parchment/40 text-xs tracking-[0.3em] uppercase"
            style={{ fontFamily: 'Cinzel, serif' }}
          >
            Prepare for Battle
          </p>
          <h2 className="text-xl font-bold text-got-gold tracking-wide mt-1" style={{ fontFamily: 'Cinzel, serif' }}>
            {enemySide.name}
          </h2>
        </div>

        {/* Possible terrain — fogged shortlist, same shape as the
            personality shortlist on the Enemy Overview panel. */}
        <div className="flex flex-col gap-2">
          <p className="text-got-gold/80 text-xs tracking-widest uppercase" style={{ fontFamily: 'Cinzel, serif' }}>
            Possible Terrain
          </p>
          <div className="flex flex-wrap gap-1.5">
            {terrainShortlist.map((id) => (
              <span
                key={id}
                className="text-got-parchment text-xs rounded-full border border-stone-700 bg-stone-900/60 px-2.5 py-1"
              >
                {TERRAIN_LABELS[id] ?? id}
              </span>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <p className="text-got-gold/80 text-xs tracking-widest uppercase" style={{ fontFamily: 'Cinzel, serif' }}>
            Formation
          </p>
          {FORMATION_ORDER.filter((id) => {
            const leadType = FORMATIONS[id].leadType
            return !leadType || yourSide.troops[leadType] > 0
          }).map((id) => {
            const selected = id === formationId
            return (
              <button
                key={id}
                onClick={() => onFormationChange(id)}
                className={[
                  'text-left rounded-lg border p-3 transition-all duration-200',
                  selected ? 'border-got-gold bg-got-gold/10' : 'border-stone-700 bg-stone-900/60 hover:border-got-gold/50',
                ].join(' ')}
              >
                <p className="text-got-parchment" style={{ fontFamily: 'Cinzel, serif' }}>
                  {FORMATIONS[id].label}
                </p>
                <p className="text-stone-500 text-xs mt-0.5 italic" style={{ fontFamily: 'EB Garamond, serif' }}>
                  {FORMATION_INFO[id].blurb}
                </p>
              </button>
            )
          })}
        </div>

        <div className="flex flex-col gap-2">
          <p className="text-got-gold/80 text-xs tracking-widest uppercase" style={{ fontFamily: 'Cinzel, serif' }}>
            Opening Strategy
          </p>
          {OPENING_STRATEGIES.map((id) => {
            const selected = id === strategyId
            return (
              <button
                key={id}
                onClick={() => onStrategyChange(id)}
                className={[
                  'text-left rounded-lg border p-3 transition-all duration-200',
                  selected ? 'border-got-gold bg-got-gold/10' : 'border-stone-700 bg-stone-900/60 hover:border-got-gold/50',
                ].join(' ')}
              >
                <p className="text-got-parchment" style={{ fontFamily: 'Cinzel, serif' }}>
                  {STRATEGY_INFO[id].label}
                </p>
                <p className="text-stone-500 text-xs mt-0.5 italic" style={{ fontFamily: 'EB Garamond, serif' }}>
                  {STRATEGY_INFO[id].blurb}
                </p>
              </button>
            )
          })}
        </div>

        <div className="flex flex-col gap-2 mt-1">
          <button
            onClick={onGoToBattle}
            disabled={!canGoToBattle}
            className="w-full py-3.5 rounded border border-got-red bg-got-red/10 text-got-red-bright text-sm font-bold tracking-widest uppercase transition-all duration-200 hover:bg-got-red/20 active:scale-[0.98] disabled:opacity-30 disabled:cursor-not-allowed"
            style={{ fontFamily: 'Cinzel, serif' }}
          >
            Go to Battle
          </button>
          <button
            onClick={onBack}
            className="w-full py-3.5 rounded border border-stone-700 text-stone-400 text-sm tracking-widest uppercase transition-colors hover:border-got-gold/40 hover:text-got-gold"
            style={{ fontFamily: 'Cinzel, serif' }}
          >
            Back
          </button>
        </div>
      </div>
    </div>
  )
}
