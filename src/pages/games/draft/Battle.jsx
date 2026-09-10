import { useState, useMemo } from 'react'
import { computeBattleProbability, STRATEGIES } from '../../../gameEngine/battleEngine'
import { SHOW_DEBUG_NUMBERS } from '../../../config/features'

const STRATEGY_INFO = {
  aggressive: { label: 'Aggressive', blurb: 'More damage dealt and taken.' },
  balanced: { label: 'Balanced', blurb: 'No major modifier.' },
  defensive: { label: 'Defensive', blurb: 'Fewer casualties both sides, better odds of survival.' },
  ambush: { label: 'Ambush', blurb: 'High risk, high reward — needs good intelligence to pay off.' },
}

export default function Battle({ yourSide, enemySide, enemyArmyRange, onEngage }) {
  const [strategyId, setStrategyId] = useState('balanced')

  const probability = useMemo(
    () => Math.round(computeBattleProbability({ yourSide, enemySide, strategyId }) * 100),
    [yourSide, enemySide, strategyId]
  )

  return (
    <div className="w-full max-w-sm flex flex-col gap-6 pt-4 pb-4">
      <div className="text-center">
        <p
          className="text-got-parchment/40 text-sm tracking-[0.3em] uppercase"
          style={{ fontFamily: 'Cinzel, serif' }}
        >
          Battle
        </p>
        <h1
          className="text-2xl font-bold tracking-wide text-got-gold mt-1"
          style={{ fontFamily: 'Cinzel, serif' }}
        >
          {enemySide.name}
        </h1>
        <p className="text-stone-500 text-xs mt-1 italic" style={{ fontFamily: 'EB Garamond, serif' }}>
          {enemySide.flavorText}
        </p>
        <div className="gold-divider mt-3" />
      </div>

      {/* Matchup summary */}
      <div className="rounded-lg border border-stone-700 bg-stone-900/60 p-4 flex justify-between items-center">
        <div>
          <p className="text-got-gold text-xs tracking-widest uppercase" style={{ fontFamily: 'Cinzel, serif' }}>
            Your Army
          </p>
          <p className="text-got-parchment text-lg">{yourSide.armySize.toLocaleString()}</p>
        </div>
        <span className="text-stone-600 text-xl">⚔</span>
        <div className="text-right">
          <p className="text-got-red-bright text-xs tracking-widest uppercase" style={{ fontFamily: 'Cinzel, serif' }}>
            {enemySide.name}
          </p>
          <p className="text-got-parchment text-lg">
            {enemyArmyRange.low.toLocaleString()}–{enemyArmyRange.high.toLocaleString()}
          </p>
        </div>
      </div>

      {/* Victory chance */}
      {SHOW_DEBUG_NUMBERS && (
        <div className="text-center rounded-lg border border-got-gold/40 bg-got-gold/5 p-4">
          <p
            className="text-got-gold/70 text-xs tracking-[0.3em] uppercase"
            style={{ fontFamily: 'Cinzel, serif' }}
          >
            Estimated Victory Chance
          </p>
          <p className="text-got-gold text-4xl font-black mt-1" style={{ fontFamily: 'Cinzel, serif' }}>
            {probability}%
          </p>
        </div>
      )}

      {/* Strategy select */}
      <div className="flex flex-col gap-2">
        <p
          className="text-got-gold/80 text-xs tracking-widest uppercase"
          style={{ fontFamily: 'Cinzel, serif' }}
        >
          Battle Strategy
        </p>
        {Object.keys(STRATEGIES).map((id) => {
          const selected = id === strategyId
          return (
            <button
              key={id}
              onClick={() => setStrategyId(id)}
              className={[
                'text-left rounded-lg border p-3 transition-all duration-200',
                selected
                  ? 'border-got-gold bg-got-gold/10'
                  : 'border-stone-700 bg-stone-900/60 hover:border-got-gold/50',
              ].join(' ')}
            >
              <p
                className={selected ? 'text-got-gold' : 'text-got-parchment'}
                style={{ fontFamily: 'Cinzel, serif' }}
              >
                {STRATEGY_INFO[id].label}
              </p>
              <p className="text-stone-500 text-xs mt-0.5 italic" style={{ fontFamily: 'EB Garamond, serif' }}>
                {STRATEGY_INFO[id].blurb}
              </p>
            </button>
          )
        })}
      </div>

      <button
        onClick={() => onEngage(strategyId)}
        className="w-full py-4 rounded border border-got-red bg-got-red/10 text-got-red-bright text-lg tracking-widest uppercase transition-all duration-200 hover:bg-got-red/20 active:scale-[0.98]"
        style={{ fontFamily: 'Cinzel, serif' }}
      >
        Engage
      </button>
    </div>
  )
}