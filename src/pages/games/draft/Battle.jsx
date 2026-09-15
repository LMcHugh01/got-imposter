import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { tickBattle, finalizeBattleResult, STRATEGIES } from '../../../gameEngine/battleEngine'
import { computeDuelShare, DUEL_SHARE_THRESHOLD } from '../../../gameEngine/duelEngine'
import { SHOW_DEBUG_NUMBERS } from '../../../config/features'

const TICK_INTERVAL_MS = 550

const OPENING_STRATEGY_INFO = {
  aggressive: { label: 'Aggressive', blurb: 'More damage dealt and taken.' },
  balanced: { label: 'Balanced', blurb: 'No major modifier.' },
  defensive: { label: 'Defensive', blurb: 'Fewer casualties both sides, better odds of survival.' },
  ambush: { label: 'Ambush', blurb: 'High risk, high reward — needs good intelligence to pay off. Opening move only.' },
}

// Ambush isn't offered again once the fight is underway — it's a one-time
// opening surprise, not something you switch into mid-battle.
const MID_BATTLE_STRATEGIES = ['aggressive', 'balanced', 'defensive']

export default function Battle({ yourSide, enemySide, enemyArmyRange, onComplete }) {
  const [phase, setPhase] = useState('strategy') // strategy | fighting
  const [strategyId, setStrategyId] = useState('balanced')
  const [live, setLive] = useState(null) // { yourArmy, enemyArmy }
  const [confirmingSurrender, setConfirmingSurrender] = useState(false)
  const strategyRef = useRef(strategyId)

  useEffect(() => {
    strategyRef.current = strategyId
  }, [strategyId])

  const startingYourArmy = yourSide.armySize
  const startingEnemyArmy = enemySide.armySize

  const handleOpenWith = (openingStrategy) => {
    setStrategyId(openingStrategy)
    strategyRef.current = openingStrategy
    setLive({ yourArmy: startingYourArmy, enemyArmy: startingEnemyArmy })
    setPhase('fighting')
  }

  useEffect(() => {
    if (phase !== 'fighting' || !live) return undefined

    const timer = setTimeout(() => {
      const result = tickBattle({
        yourArmy: live.yourArmy,
        enemyArmy: live.enemyArmy,
        yourStats: yourSide,
        enemyStats: enemySide,
        strategyId: strategyRef.current,
        scouted: Boolean(yourSide.scouted),
      })

      if (result.outcome) {
        const finalResult = finalizeBattleResult({
          outcome: result.outcome,
          startingYourArmy,
          yourArmy: result.yourArmy,
          startingEnemyArmy,
          enemyArmy: result.enemyArmy,
          enemyGold: enemySide.gold,
        })
        onComplete(finalResult)
      } else {
        setLive({ yourArmy: result.yourArmy, enemyArmy: result.enemyArmy })
      }
    }, TICK_INTERVAL_MS)

    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, live])

  const handleSurrender = () => {
    const finalResult = finalizeBattleResult({
      outcome: 'defeat',
      startingYourArmy,
      yourArmy: live.yourArmy,
      startingEnemyArmy,
      enemyArmy: live.enemyArmy,
      enemyGold: enemySide.gold,
    })
    onComplete(finalResult)
  }

  if (phase === 'strategy') {
    // Debug-only — shows the ACTUAL computed power share and how it
    // compares to the duel-offer threshold, so "why didn't I get offered
    // a duel" is directly visible instead of something to infer.
    const duelShare = SHOW_DEBUG_NUMBERS ? computeDuelShare(yourSide, enemySide) : null

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

        <div className="rounded-lg border border-stone-700 bg-stone-900/60 p-4 flex justify-between items-center">
          <div>
            <p className="text-got-gold text-xs tracking-widest uppercase" style={{ fontFamily: 'Cinzel, serif' }}>
              Your Army
            </p>
            <p className="text-got-parchment text-lg">{startingYourArmy.toLocaleString()}</p>
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

        {duelShare !== null && (
          <p className="text-stone-600 text-xs text-center">
            Power share: {Math.round(duelShare * 100)}% (duel offered at {Math.round(DUEL_SHARE_THRESHOLD * 100)}%+)
          </p>
        )}

        <div className="flex flex-col gap-2">
          <p
            className="text-got-gold/80 text-xs tracking-widest uppercase"
            style={{ fontFamily: 'Cinzel, serif' }}
          >
            Opening Strategy
          </p>
          {Object.keys(STRATEGIES).map((id) => (
            <button
              key={id}
              onClick={() => handleOpenWith(id)}
              className="text-left rounded-lg border border-stone-700 bg-stone-900/60 p-3 hover:border-got-gold/50 transition-all duration-200"
            >
              <p className="text-got-parchment" style={{ fontFamily: 'Cinzel, serif' }}>
                {OPENING_STRATEGY_INFO[id].label}
              </p>
              <p className="text-stone-500 text-xs mt-0.5 italic" style={{ fontFamily: 'EB Garamond, serif' }}>
                {OPENING_STRATEGY_INFO[id].blurb}
              </p>
            </button>
          ))}
        </div>
      </div>
    )
  }

  // phase === 'fighting'
  return (
    <div className="w-full max-w-sm flex flex-col gap-6 pt-4 pb-4">
      <div className="text-center">
        <p
          className="text-got-red-bright text-xs tracking-[0.3em] uppercase animate-pulse"
          style={{ fontFamily: 'Cinzel, serif' }}
        >
          Battle in Progress
        </p>
        <h1 className="text-2xl font-bold tracking-wide text-got-gold mt-1" style={{ fontFamily: 'Cinzel, serif' }}>
          {enemySide.name}
        </h1>
        <div className="gold-divider mt-3" />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <LiveArmyCount label="Your Army" value={live.yourArmy} color="text-got-gold" />
        <LiveArmyCount label={enemySide.name} value={live.enemyArmy} color="text-got-red-bright" align="right" />
      </div>

      <div className="flex flex-col gap-2">
        <p
          className="text-got-gold/80 text-xs tracking-widest uppercase"
          style={{ fontFamily: 'Cinzel, serif' }}
        >
          Battle Strategy
        </p>
        <div className="grid grid-cols-3 gap-2">
          {MID_BATTLE_STRATEGIES.map((id) => {
            const selected = id === strategyId
            return (
              <button
                key={id}
                onClick={() => setStrategyId(id)}
                className={[
                  'rounded-lg border py-3 text-sm transition-all duration-200',
                  selected
                    ? 'border-got-gold bg-got-gold/10 text-got-gold'
                    : 'border-stone-700 bg-stone-900/60 text-got-parchment hover:border-got-gold/50',
                ].join(' ')}
                style={{ fontFamily: 'Cinzel, serif' }}
              >
                {OPENING_STRATEGY_INFO[id].label}
              </button>
            )
          })}
        </div>
      </div>

      <AnimatePresence mode="wait">
        {confirmingSurrender ? (
          <motion.div
            key="confirm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col gap-2"
          >
            <p className="text-got-red-bright text-sm text-center italic" style={{ fontFamily: 'EB Garamond, serif' }}>
              Surrendering ends the battle now, locking in your current losses.
            </p>
            <button
              onClick={handleSurrender}
              className="w-full py-3 rounded border border-got-red bg-got-red/10 text-got-red-bright tracking-widest uppercase"
              style={{ fontFamily: 'Cinzel, serif' }}
            >
              Confirm Surrender
            </button>
            <button
              onClick={() => setConfirmingSurrender(false)}
              className="text-stone-600 text-sm text-center hover:text-stone-400"
              style={{ fontFamily: 'Cinzel, serif' }}
            >
              Keep Fighting
            </button>
          </motion.div>
        ) : (
          <motion.button
            key="surrender"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setConfirmingSurrender(true)}
            className="w-full py-3 rounded border border-stone-700 text-stone-400 tracking-widest uppercase hover:border-got-red/50 hover:text-got-red-bright transition-all duration-200"
            style={{ fontFamily: 'Cinzel, serif' }}
          >
            Surrender
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  )
}

function LiveArmyCount({ label, value, color, align = 'left' }) {
  return (
    <div className={`rounded-lg border border-stone-700 bg-stone-900/60 p-4 ${align === 'right' ? 'text-right' : ''}`}>
      <p className={`${color} text-xs tracking-widest uppercase`} style={{ fontFamily: 'Cinzel, serif' }}>
        {label}
      </p>
      <AnimatePresence mode="popLayout">
        <motion.p
          key={value}
          initial={{ opacity: 0, y: align === 'right' ? 4 : -4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className="text-got-parchment text-2xl font-bold"
        >
          {value.toLocaleString()}
        </motion.p>
      </AnimatePresence>
    </div>
  )
}