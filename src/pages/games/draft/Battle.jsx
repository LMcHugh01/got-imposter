import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  tickBattle,
  finalizeBattleResult,
  computeBreakThreshold,
  computeRallyChance,
  recoverTroopsAfterCasualties,
  FORMATIONS,
  applyFormationToBreakThreshold,
  computeTerrainFormationMultiplier,
  resolvePersonalityProfile,
  ORDERS,
} from '../../../gameEngine/battleEngine'
import { computeDuelShare, DUEL_SHARE_THRESHOLD } from '../../../gameEngine/duelEngine'
import { SHOW_DEBUG_NUMBERS } from '../../../config/features'

// v2 (pacing pass): renamed from the old flat TICK_INTERVAL_MS. The
// ACTUAL interval used is dynamic per fight — see dynamicTickInterval
// below — so battles feel different lengths depending on how close the
// matchup is, not just fixed regardless of difficulty.
const BASE_TICK_INTERVAL_MS = 950
const MIN_TICK_INTERVAL_MULTIPLIER = 0.55 // lopsided fights tick this much faster than base
const MAX_TICK_INTERVAL_MULTIPLIER = 1.5 // dead-even fights tick this much slower than base

// How many ticks a successful Rally's casualty-rate relief lasts —
// implemented by temporarily maxing out the discipline modifier (§3)
// rather than inventing a second mechanism for "fewer casualties for a
// bit" — BATTLE_PLAN.md §8.
const RALLY_BOOST_TICKS = 3
const RALLY_BOOST_DISCIPLINE = 99

const STRATEGY_INFO = {
  aggressive: { label: 'Push', blurb: 'More damage dealt and taken.' },
  balanced: { label: 'Balanced', blurb: 'No major modifier.' },
  defensive: { label: 'Hold the Line', blurb: 'Fewer casualties both sides, extra protection for Infantry.' },
  ambush: { label: 'Ambush', blurb: 'High risk, high reward — needs good intelligence to pay off. Opening move only.' },
  // Regroup (BATTLE_PLAN.md §7/§9) — deliberately NOT offered as an
  // opening move, same reasoning as Ambush being opening-only in reverse:
  // "easing off" only makes sense once a fight is actually underway.
  regroup: { label: 'Regroup', blurb: 'Sharp casualty cut both sides, but you cede ground this tick.' },
}

// Ambush isn't offered again once the fight is underway — it's a one-time
// opening surprise, not something you switch into mid-battle. Regroup is
// the mirror case — never offered as an opener, always available mid-fight.
const OPENING_STRATEGIES = ['aggressive', 'balanced', 'defensive', 'ambush']
const MID_BATTLE_STRATEGIES = ['aggressive', 'balanced', 'defensive', 'regroup']

// Stage E: row order now follows the chosen Formation's lead type (§9) —
// front-loaded to the top of the battlefield display — falling back to
// this fixed neutral order for Balanced Line or when no formation applies.
const TROOP_ROW_ORDER = ['infantry', 'archers', 'cavalry']
const TROOP_TYPE_INFO = {
  infantry: { label: 'Infantry', icon: '⚔' },
  archers: { label: 'Archers', icon: '🏹' },
  cavalry: { label: 'Cavalry', icon: '🐎' },
}

function rowOrderForFormation(formationId) {
  const leadType = FORMATIONS[formationId]?.leadType
  if (!leadType) return TROOP_ROW_ORDER
  return [leadType, ...TROOP_ROW_ORDER.filter((type) => type !== leadType)]
}

const FORMATION_INFO = {
  balanced: { blurb: 'No bonus or penalty — the honest default for a mixed army.' },
  shieldWall: { blurb: 'Infantry holds even when countered. Slower to break.' },
  cavalryVanguard: { blurb: 'A hard opening charge from Cavalry. Quicker to break.' },
  skirmishLine: { blurb: 'Archers get an extended opening exchange before melee closes.' },
}

// Formations, ordered for display — Balanced Line first as the neutral
// default, then the three with an actual leadType.
const FORMATION_ORDER = ['balanced', 'shieldWall', 'cavalryVanguard', 'skirmishLine']

function troopTotal(troops) {
  return troops.infantry + troops.archers + troops.cavalry
}

/**
 * `engagement`, when present (a retreat-and-reattempt — BATTLE_PLAN.md
 * §15), is `{ yourTroops, enemyTroops, enemyCumulativeCasualties,
 * formationId, ticksElapsed }`: the live counts as they stood when the
 * player retreated, already recovered per-type (see
 * recoverTroopsAfterCasualties) rather than a flat total that would have
 * to be re-split from scratch. It's distinct from
 * yourSide.troops/enemySide.troops, which reflect the CAMPAIGN's official
 * totals — untouched by an in-progress, unresolved retreat, since
 * retreating deliberately never calls recordBattleResult. When
 * `engagement` is provided, the opening Strategy/Formation screen is
 * skipped entirely (resuming a fight isn't a fresh opening move), the
 * fight resumes straight into the 'fighting' phase from those counts, and
 * the ORIGINAL formation choice + tick count carry forward unchanged — a
 * formation's opening-tick bonus (Cavalry Vanguard, Skirmish Line) is
 * about the start of the whole engagement, not each individual attempt.
 *
 * `canRetreat` is false on a second attempt at the same enemy — Retreat
 * is only ever offered once per engagement (§15). `rallyAvailable` is
 * false once Rally has been spent, whether that happened in an earlier
 * attempt or earlier in this same attempt.
 */
export default function Battle({
  yourSide,
  enemySide,
  enemyArmyRange,
  onComplete,
  onRetreat,
  engagement = null,
  canRetreat = true,
  rallyAvailable = true,
}) {
  const attemptStartYourTroops = engagement?.yourTroops ?? yourSide.troops
  const attemptStartEnemyTroops = engagement?.enemyTroops ?? enemySide.troops
  const attemptStartYourArmy = troopTotal(attemptStartYourTroops)
  const attemptStartEnemyArmy = troopTotal(attemptStartEnemyTroops)
  const terrain = enemySide.terrain ?? 'plains'

  const [phase, setPhase] = useState(engagement ? 'fighting' : 'strategy') // strategy | fighting | breakDecision
  const [strategyId, setStrategyId] = useState('balanced')
  const [formationId, setFormationId] = useState(engagement?.formationId ?? 'balanced')
  const [live, setLive] = useState(engagement ? { yourTroops: attemptStartYourTroops, enemyTroops: attemptStartEnemyTroops } : null)
  const [confirmingSurrender, setConfirmingSurrender] = useState(false)
  const [rallyResolving, setRallyResolving] = useState(false)
  const strategyRef = useRef(strategyId)
  const cumulativeYourCasualtiesRef = useRef(0)
  const cumulativeEnemyCasualtiesRef = useRef(engagement?.enemyCumulativeCasualties ?? 0)
  const ticksElapsedRef = useRef(engagement?.ticksElapsed ?? 0)
  // Orders (§7) — one-shot, unlike Tactics' sticky stance. orderRef holds
  // whatever's queued for the VERY NEXT tick only; the tick effect reads
  // and immediately clears it. queuedOrderLabel is purely for display, so
  // the player sees their tap registered before the tick actually fires.
  const orderRef = useRef(null)
  const [queuedOrderLabel, setQueuedOrderLabel] = useState(null)
  const rallyBoostTicksRef = useRef(0)
  const rallyUsedRef = useRef(!rallyAvailable)
  // Enemy personality battle AI (§12) — resolved ONCE per engagement, not
  // per tick or per render. Lazy ref init (check-and-set on first render)
  // rather than passing the call directly as useRef's argument, since
  // that argument is evaluated every render even though only the first
  // result is kept — wasteful, and for 'unpredictable' it would also
  // needlessly consume randomness on every render. Carries forward
  // unchanged across a retreat via engagement.enemyProfile, same as
  // formationId — the enemy's stance for this fight was set once, at the
  // start, and doesn't re-roll just because you regrouped.
  const enemyProfileRef = useRef(null)
  if (enemyProfileRef.current === null) {
    enemyProfileRef.current = engagement?.enemyProfile ?? resolvePersonalityProfile(enemySide.personality, attemptStartEnemyTroops)
  }

  useEffect(() => {
    strategyRef.current = strategyId
  }, [strategyId])

  const yourBreakThreshold = applyFormationToBreakThreshold(
    computeBreakThreshold(attemptStartYourArmy, yourSide.morale),
    formationId,
    terrain
  )
  // Enemy's break threshold gets the same Formation treatment (their
  // resolved formation, per §12) PLUS their personality's own
  // breakThresholdMultiplier layered on top — e.g. Economic is
  // protective of its own forces regardless of which formation it opens
  // with, so that multiplier is independent of Formation's.
  const enemyBreakThreshold = Math.max(
    1,
    Math.round(
      applyFormationToBreakThreshold(computeBreakThreshold(attemptStartEnemyArmy, enemySide.morale), enemyProfileRef.current.formationId, terrain) *
        enemyProfileRef.current.breakThresholdMultiplier
    )
  )

  // Pacing (feedback: "battles all feel the same length regardless of
  // difficulty"). The underlying casualty math is scale-invariant by
  // design — Regroup/Ambush/discipline are all tuned and tested against
  // it — so instead of reshaping that, the WALL-CLOCK pace is tied to how
  // close the fight actually is: computeDuelShare gives the same power
  // ratio duelEngine.js already uses for the duel-offer threshold.
  // closeness=1 (dead even) -> slow, tense ticking; closeness=0 (a
  // curbstomp either way) -> fast, over-quickly ticking.
  const initialShare = computeDuelShare(yourSide, enemySide)
  const closeness = 1 - Math.min(1, Math.abs(initialShare - 0.5) * 2)
  const dynamicTickInterval = Math.round(
    BASE_TICK_INTERVAL_MS * (MIN_TICK_INTERVAL_MULTIPLIER + closeness * (MAX_TICK_INTERVAL_MULTIPLIER - MIN_TICK_INTERVAL_MULTIPLIER))
  )

  const handleOpenWith = (openingStrategy) => {
    setStrategyId(openingStrategy)
    strategyRef.current = openingStrategy
    setLive({ yourTroops: attemptStartYourTroops, enemyTroops: attemptStartEnemyTroops })
    setPhase('fighting')
  }

  const resolve = (outcome, finalYourArmy, finalEnemyArmy) => {
    const finalResult = finalizeBattleResult({
      outcome,
      startingYourArmy: attemptStartYourArmy,
      yourArmy: finalYourArmy,
      startingEnemyArmy: attemptStartEnemyArmy,
      enemyArmy: finalEnemyArmy,
      enemyGold: enemySide.gold,
    })
    onComplete(finalResult)
  }

  useEffect(() => {
    if (phase !== 'fighting' || !live) return undefined

    const timer = setTimeout(() => {
      const boosted = rallyBoostTicksRef.current > 0
      const activeOrder = orderRef.current
      orderRef.current = null
      setQueuedOrderLabel(null)
      const result = tickBattle({
        yourTroops: live.yourTroops,
        enemyTroops: live.enemyTroops,
        yourStats: boosted ? { ...yourSide, discipline: RALLY_BOOST_DISCIPLINE } : yourSide,
        enemyStats: enemySide,
        strategyId: strategyRef.current,
        scouted: Boolean(yourSide.scouted),
        formationId,
        terrain,
        ticksElapsed: ticksElapsedRef.current,
        order: activeOrder,
        enemyProfile: enemyProfileRef.current,
      })
      ticksElapsedRef.current += 1
      if (boosted) rallyBoostTicksRef.current -= 1

      if (result.outcome) {
        resolve(result.outcome, result.yourArmy, result.enemyArmy)
        return
      }

      cumulativeYourCasualtiesRef.current += result.yourCasualties
      cumulativeEnemyCasualtiesRef.current += result.enemyCasualties

      if (cumulativeEnemyCasualtiesRef.current >= enemyBreakThreshold) {
        // The enemy breaking is unambiguously good news — no decision
        // needed, resolve straight to victory.
        resolve('victory', result.yourArmy, result.enemyArmy)
        return
      }

      if (cumulativeYourCasualtiesRef.current >= yourBreakThreshold) {
        setLive({ yourTroops: result.yourTroops, enemyTroops: result.enemyTroops })
        setPhase('breakDecision')
        return
      }

      setLive({ yourTroops: result.yourTroops, enemyTroops: result.enemyTroops })
    }, dynamicTickInterval)

    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, live])

  const handleSurrender = () => {
    resolve('defeat', troopTotal(live.yourTroops), troopTotal(live.enemyTroops))
  }

  // Orders (§7) — one-shot: queues for the very next tick only, then the
  // tick effect clears it automatically. Tapping a new order replaces
  // whatever was already queued rather than stacking.
  const handleCharge = () => {
    orderRef.current = { id: 'charge' }
    setQueuedOrderLabel('Charge queued')
  }

  const handleVolley = (target) => {
    orderRef.current = { id: 'volley', target }
    setQueuedOrderLabel(`Volley (${TROOP_TYPE_INFO[target].label}) queued`)
  }

  const handleRetreat = () => {
    // Per-type recovery (BATTLE_PLAN.md §15) — NOT a flat aggregate
    // re-split, which would silently reset composition to something
    // arbitrary. Whatever mix survives is exactly what carries forward.
    const recoveredTroops = recoverTroopsAfterCasualties(attemptStartYourTroops, live.yourTroops, 'retreat')
    onRetreat({
      yourTroops: recoveredTroops,
      enemyTroops: live.enemyTroops,
      enemyCumulativeCasualties: cumulativeEnemyCasualtiesRef.current,
      rallyUsed: rallyUsedRef.current,
      formationId,
      ticksElapsed: ticksElapsedRef.current,
      enemyProfile: enemyProfileRef.current,
    })
  }

  const handleRally = () => {
    setRallyResolving(true)
    rallyUsedRef.current = true
    const chance = computeRallyChance(yourSide.strategy)
    const succeeded = Math.random() < chance

    // Small pause so the roll reads as an actual moment rather than an
    // instant flicker — matches the deliberate weight of the decision.
    setTimeout(() => {
      setRallyResolving(false)
      if (succeeded) {
        cumulativeYourCasualtiesRef.current = 0
        rallyBoostTicksRef.current = RALLY_BOOST_TICKS
        setPhase('fighting')
      } else {
        resolve('defeat', troopTotal(live.yourTroops), troopTotal(live.enemyTroops))
      }
    }, 900)
  }

  if (phase === 'strategy') {
    // Debug-only — shows the ACTUAL computed power share and how it
    // compares to the duel-offer threshold, so "why didn't I get offered
    // a duel" is directly visible instead of something to infer.
    const duelShare = SHOW_DEBUG_NUMBERS ? initialShare : null

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
            <p className="text-got-parchment text-lg">{attemptStartYourArmy.toLocaleString()}</p>
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
            Formation
          </p>
          {FORMATION_ORDER.filter((id) => {
            const leadType = FORMATIONS[id].leadType
            return !leadType || yourSide.troops[leadType] > 0
          }).map((id) => {
            const selected = id === formationId
            const terrainMultiplier = computeTerrainFormationMultiplier(terrain, id)
            const suitability = terrainMultiplier > 1 ? 'Favored here' : terrainMultiplier < 1 ? 'Poor fit for this terrain' : null
            return (
              <button
                key={id}
                onClick={() => setFormationId(id)}
                className={[
                  'text-left rounded-lg border p-3 transition-all duration-200',
                  selected ? 'border-got-gold bg-got-gold/10' : 'border-stone-700 bg-stone-900/60 hover:border-got-gold/50',
                ].join(' ')}
              >
                <div className="flex justify-between items-baseline gap-2">
                  <p className="text-got-parchment" style={{ fontFamily: 'Cinzel, serif' }}>
                    {FORMATIONS[id].label}
                  </p>
                  {suitability && (
                    <span className={`text-xs flex-shrink-0 ${terrainMultiplier > 1 ? 'text-got-gold' : 'text-stone-600'}`}>
                      {suitability}
                    </span>
                  )}
                </div>
                <p className="text-stone-500 text-xs mt-0.5 italic" style={{ fontFamily: 'EB Garamond, serif' }}>
                  {FORMATION_INFO[id].blurb}
                </p>
              </button>
            )
          })}
        </div>

        <div className="flex flex-col gap-2">
          <p
            className="text-got-gold/80 text-xs tracking-widest uppercase"
            style={{ fontFamily: 'Cinzel, serif' }}
          >
            Opening Strategy
          </p>
          {OPENING_STRATEGIES.map((id) => (
            <button
              key={id}
              onClick={() => handleOpenWith(id)}
              className="text-left rounded-lg border border-stone-700 bg-stone-900/60 p-3 hover:border-got-gold/50 transition-all duration-200"
            >
              <p className="text-got-parchment" style={{ fontFamily: 'Cinzel, serif' }}>
                {STRATEGY_INFO[id].label}
              </p>
              <p className="text-stone-500 text-xs mt-0.5 italic" style={{ fontFamily: 'EB Garamond, serif' }}>
                {STRATEGY_INFO[id].blurb}
              </p>
            </button>
          ))}
        </div>
      </div>
    )
  }

  if (phase === 'breakDecision') {
    const canOfferRally = rallyAvailable && !rallyUsedRef.current

    return (
      <div className="w-full max-w-sm flex flex-col gap-6 pt-4 pb-4">
        <div className="text-center">
          <p
            className="text-got-red-bright text-sm tracking-[0.2em] uppercase animate-pulse"
            style={{ fontFamily: 'Cinzel, serif' }}
          >
            Your Line Is Breaking
          </p>
          <div className="gold-divider mt-3" />
        </div>

        <Battlefield yourTroops={live.yourTroops} enemyTroops={live.enemyTroops} enemyName={enemySide.name} tickDurationMs={dynamicTickInterval} rowOrder={rowOrderForFormation(formationId)} />

        <div className="flex flex-col gap-1.5">
          <ResolveBar
            label="Your Resolve"
            remainingPct={100 - (cumulativeYourCasualtiesRef.current / yourBreakThreshold) * 100}
            color="bg-got-gold"
          />
          <ResolveBar
            label={`${enemySide.name}'s Resolve`}
            remainingPct={100 - (cumulativeEnemyCasualtiesRef.current / enemyBreakThreshold) * 100}
            color="bg-got-red-bright"
          />
        </div>

        {rallyResolving ? (
          <p className="text-got-gold-light text-center italic" style={{ fontFamily: 'EB Garamond, serif' }}>
            Rallying the line...
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {canRetreat && (
              <ActionCard
                title="Retreat"
                blurb="Pull back now. Keeps most of your losses as wounded rather than dead — you can return to this fight with a fresh action."
                onClick={handleRetreat}
              />
            )}
            {canOfferRally && (
              <ActionCard
                title="Rally"
                blurb={`Your Commander tries to hold the line. ${Math.round(computeRallyChance(yourSide.strategy) * 100)}% chance — failure ends the battle immediately.`}
                onClick={handleRally}
              />
            )}
            <ActionCard title="Surrender" blurb="End the battle now, locking in your current losses." onClick={handleSurrender} danger />
          </div>
        )}
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

      <Battlefield yourTroops={live.yourTroops} enemyTroops={live.enemyTroops} enemyName={enemySide.name} tickDurationMs={dynamicTickInterval} rowOrder={rowOrderForFormation(formationId)} />

      {/* "Resolve" — percentage remaining before each side breaks (§8).
          Percentage rather than raw numbers on the enemy side deliberately —
          showing their exact break threshold would leak more about their
          hidden morale than Gather Intelligence's fogged range is meant to. */}
      <div className="flex flex-col gap-1.5">
        <ResolveBar
          label="Your Resolve"
          remainingPct={100 - (cumulativeYourCasualtiesRef.current / yourBreakThreshold) * 100}
          color="bg-got-gold"
        />
        <ResolveBar
          label={`${enemySide.name}'s Resolve`}
          remainingPct={100 - (cumulativeEnemyCasualtiesRef.current / enemyBreakThreshold) * 100}
          color="bg-got-red-bright"
        />
      </div>

      {SHOW_DEBUG_NUMBERS && (
        <p className="text-stone-600 text-xs text-center">
          Your losses: {cumulativeYourCasualtiesRef.current.toLocaleString()} / {yourBreakThreshold.toLocaleString()} to break
        </p>
      )}

      <div className="flex flex-col gap-2">
        <p
          className="text-got-gold/80 text-xs tracking-widest uppercase"
          style={{ fontFamily: 'Cinzel, serif' }}
        >
          Tactics
        </p>
        <div className="grid grid-cols-2 gap-2">
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
                {STRATEGY_INFO[id].label}
              </button>
            )
          })}
        </div>
      </div>

      {(live.yourTroops.cavalry > 0 || (live.yourTroops.archers > 0 && live.enemyTroops.cavalry > 0)) && (
        <div className="flex flex-col gap-2">
          <div className="flex items-baseline justify-between">
            <p className="text-got-gold/80 text-xs tracking-widest uppercase" style={{ fontFamily: 'Cinzel, serif' }}>
              Orders
            </p>
            {queuedOrderLabel && (
              <span className="text-got-gold text-xs italic" style={{ fontFamily: 'EB Garamond, serif' }}>
                {queuedOrderLabel}
              </span>
            )}
          </div>
          <div className="grid grid-cols-2 gap-2">
            {live.yourTroops.cavalry > 0 && (
              <button
                onClick={handleCharge}
                className="rounded-lg border border-stone-700 bg-stone-900/60 py-3 text-sm text-got-parchment hover:border-got-gold/50 transition-all duration-200"
                style={{ fontFamily: 'Cinzel, serif' }}
              >
                {ORDERS.charge.label}
              </button>
            )}
            {live.yourTroops.archers > 0 && live.enemyTroops.cavalry > 0 && (
              <button
                onClick={() => handleVolley('cavalry')}
                className="rounded-lg border border-stone-700 bg-stone-900/60 py-3 text-sm text-got-parchment hover:border-got-gold/50 transition-all duration-200"
                style={{ fontFamily: 'Cinzel, serif' }}
              >
                {ORDERS.volley.label} → Cavalry
              </button>
            )}
          </div>
        </div>
      )}

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

/**
 * Animates a displayed number from its previous value to `target` over
 * `durationMs`, rather than snapping — the "count down one at a time"
 * feel, requested directly rather than the instant jump-cut a raw state
 * update gives you. Plain requestAnimationFrame rather than a Framer
 * Motion MotionValue, since a MotionValue driving text content (as
 * opposed to a style prop) needs extra plumbing Framer doesn't give you
 * for free — this is simpler and has no other dependency.
 */
function useCountUp(target, durationMs) {
  const [display, setDisplay] = useState(target)
  const fromRef = useRef(target)

  useEffect(() => {
    const from = fromRef.current
    if (from === target) return undefined

    const start = performance.now()
    let frame
    const step = (now) => {
      const t = Math.min(1, (now - start) / durationMs)
      setDisplay(Math.round(from + (target - from) * t))
      if (t < 1) {
        frame = requestAnimationFrame(step)
      } else {
        fromRef.current = target
      }
    }
    frame = requestAnimationFrame(step)
    return () => cancelAnimationFrame(frame)
  }, [target, durationMs])

  return display
}

/**
 * The Stage D/E visual battlefield (BATTLE_PLAN.md §6, §9) — a bold Total
 * row up top (feedback: "hard to tell who's winning" — the per-type rows
 * alone made you do the addition yourself), then one row per troop type,
 * bar length relative to whichever type/side is currently largest. Row
 * order follows `rowOrder` (the chosen Formation's lead type first, via
 * rowOrderForFormation) — defaults to the fixed neutral order if omitted.
 */
function Battlefield({ yourTroops, enemyTroops, enemyName, tickDurationMs, rowOrder = TROOP_ROW_ORDER }) {
  const yourTotal = troopTotal(yourTroops)
  const enemyTotal = troopTotal(enemyTroops)
  const maxTotal = Math.max(yourTotal, enemyTotal, 1)
  const maxTypeValue = Math.max(
    yourTroops.infantry, yourTroops.archers, yourTroops.cavalry,
    enemyTroops.infantry, enemyTroops.archers, enemyTroops.cavalry,
    1 // never divide by zero if both armies are somehow fully wiped
  )

  return (
    <div className="rounded-lg border border-stone-700 bg-stone-900/60 p-4 flex flex-col gap-3">
      <div className="flex justify-between text-xs tracking-widest uppercase" style={{ fontFamily: 'Cinzel, serif' }}>
        <span className="text-got-gold">Your Line</span>
        <span className="text-got-red-bright">{enemyName}</span>
      </div>
      <TroopRow
        icon="Σ"
        bold
        yourValue={yourTotal}
        enemyValue={enemyTotal}
        maxValue={maxTotal}
        tickDurationMs={tickDurationMs}
      />
      <div className="h-px bg-stone-700" />
      {rowOrder.map((type) => (
        <motion.div key={type} layout transition={{ duration: 0.4 }}>
          <TroopRow
            icon={TROOP_TYPE_INFO[type].icon}
            yourValue={yourTroops[type]}
            enemyValue={enemyTroops[type]}
            maxValue={maxTypeValue}
            tickDurationMs={tickDurationMs}
          />
        </motion.div>
      ))}
    </div>
  )
}

function TroopRow({ icon, yourValue, enemyValue, maxValue, tickDurationMs, bold = false }) {
  const yourDisplay = useCountUp(yourValue, tickDurationMs)
  const enemyDisplay = useCountUp(enemyValue, tickDurationMs)
  const yourPct = (yourValue / maxValue) * 100
  const enemyPct = (enemyValue / maxValue) * 100
  const textSize = bold ? 'text-sm font-bold' : 'text-xs'
  const barHeight = bold ? 'h-2.5' : 'h-2'

  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 flex items-center justify-end gap-2">
        <span className={`text-got-parchment ${textSize} w-14 text-right tabular-nums`}>{yourDisplay.toLocaleString()}</span>
        <div className={`w-20 ${barHeight} bg-stone-800 rounded-full overflow-hidden flex justify-end`}>
          <div className="h-full bg-got-gold transition-all duration-500" style={{ width: `${yourPct}%` }} />
        </div>
      </div>
      <span className="text-stone-500 text-sm w-5 text-center flex-shrink-0" aria-hidden="true">
        {icon}
      </span>
      <div className="flex-1 flex items-center gap-2">
        <div className={`w-20 ${barHeight} bg-stone-800 rounded-full overflow-hidden`}>
          <div className="h-full bg-got-red-bright transition-all duration-500" style={{ width: `${enemyPct}%` }} />
        </div>
        <span className={`text-got-parchment ${textSize} w-14 tabular-nums`}>{enemyDisplay.toLocaleString()}</span>
      </div>
    </div>
  )
}

function ResolveBar({ label, remainingPct, color }) {
  const clamped = Math.max(0, Math.min(100, remainingPct))
  return (
    <div className="flex items-center gap-2">
      <span className="text-stone-500 text-xs w-32 flex-shrink-0">{label}</span>
      <div className="flex-1 h-1.5 bg-stone-800 rounded-full overflow-hidden">
        <div className={`h-full ${color} transition-all duration-500`} style={{ width: `${clamped}%` }} />
      </div>
    </div>
  )
}

function ActionCard({ title, blurb, onClick, danger = false }) {
  return (
    <button
      onClick={onClick}
      className={[
        'text-left rounded-lg border p-3 transition-all duration-200',
        danger
          ? 'border-stone-700 bg-stone-900/60 hover:border-got-red/50'
          : 'border-got-gold/40 bg-got-gold/5 hover:border-got-gold',
      ].join(' ')}
    >
      <p className={danger ? 'text-stone-400' : 'text-got-gold'} style={{ fontFamily: 'Cinzel, serif' }}>
        {title}
      </p>
      <p className="text-stone-500 text-xs mt-0.5 italic" style={{ fontFamily: 'EB Garamond, serif' }}>
        {blurb}
      </p>
    </button>
  )
}