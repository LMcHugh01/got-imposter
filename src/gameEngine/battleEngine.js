/**
 * gameEngine/battleEngine.js
 *
 * A battle is now a live, tick-based fight rather than a single dice roll.
 * Each tick recomputes power from the CURRENT (shrinking) army sizes, so a
 * losing side's disadvantage compounds tick over tick — a real spiral, not
 * a one-shot probability. The player watches both armies' live counts and
 * can switch strategy or surrender mid-fight; there's no fixed round count
 * and no pre-battle win-probability display — the outcome unfolds from
 * play, not from a number shown up front.
 *
 * Ends when either side's army hits 0, or the player's army outnumbers
 * the enemy's 5:1 (forcing their surrender) — matching the player's own
 * design call, not an arbitrary round cap.
 *
 * Exact constants (tick casualty rate, jitter, the 5:1 threshold, post-
 * battle gold/morale/supply deltas) are first-draft, same caveat as
 * everywhere else in this engine — expect the balancing pass (§17 step 12)
 * to retune them. The *shape* (sub-linear army size, strategy execution
 * scaled by council skill, casualties compounding as armies shrink) is
 * what's load-bearing and what's tested here.
 */

import { effectiveAttribute } from './ratings'
import { statToModifier } from './modifiers'

// --- tunable constants -----------------------------------------------

// §11 guardrail 1 — army size is sub-linear so a bigger army can't
// automatically flatten a smaller elite one. See the battle-probability
// tuning discussion this was already retuned from sqrt (0.5) to 0.65 —
// still an open, deliberately-deferred tension between "big mismatches
// should feel decisive" and "a smaller elite army should stay viable."
const ARMY_SIZE_EXPONENT = 0.65

// Each modifier maps a 0-100 stat to a multiplier via this range. Ranges
// are centered so stat=50 always yields exactly 1.0 (neutral) — deliberate,
// so "average" council/army stats don't secretly bias the matchup.
const MODIFIER_RANGES = {
  morale: [0.8, 1.2],
  leadership: [0.8, 1.2],
  strategy: [0.8, 1.2],
  supply: [0.75, 1.25],
  intelligence: [1.0, 1.15], // only ever a bonus, and only if scouted
  enemyRating: [0.85, 1.15], // stands in for the enemy's own leadership/strategy
}

// Your army outnumbering theirs by this ratio forces their surrender.
export const SURRENDER_RATIO = 5

// Fraction of a side's CURRENT army it can lose in one tick when the fight
// is dead even (yourShare = 0.5); scales down/up from there based on who's
// winning that tick. +/- jitter keeps it from feeling like a metronome.
const BASE_TICK_CASUALTY_RATE = 0.07
const TICK_JITTER = 0.25

// Safety valve — should essentially never be hit (integer rounding alone
// makes armies diverge over time), but guarantees a live battle can't hang.
const MAX_TICKS = 80

// §5.4 / §10.4 — Aggressive/Balanced/Defensive/Ambush casualty effects,
// before being scaled by how skilled your council is at executing them.
// Aggressive/Balanced/Defensive deliberately do NOT shift the underlying
// power balance — per §10.4 their tradeoff is entirely in casualties
// ("more damage dealt and taken" / "fewer casualties both sides"). Giving
// them a power shift too made Aggressive strictly best, which is a
// dominant-strategy problem (§1 pillar 2). Ambush is the deliberate
// exception — see AMBUSH_SHARE_BONUS below.
export const STRATEGIES = {
  aggressive: { yourCasualtyMultiplier: 1.3, enemyCasualtyMultiplier: 1.35 },
  balanced: { yourCasualtyMultiplier: 1.0, enemyCasualtyMultiplier: 1.0 },
  defensive: { yourCasualtyMultiplier: 0.65, enemyCasualtyMultiplier: 0.8 },
  ambush: { yourCasualtyMultiplier: 1.1, enemyCasualtyMultiplier: 1.4 },
}

// Ambush only makes sense as an opening move (the UI enforces this — it's
// not offered again once a fight is underway). Scouted, it's a real
// surprise-attack edge on that first exchange; blind, it backfires.
const AMBUSH_SHARE_BONUS = 0.15

// --- power (§10.2) -------------------------------------------------------

function computeModifier(stat, key) {
  return statToModifier(stat, MODIFIER_RANGES[key])
}

/**
 * Your side's effective power at the CURRENT army size — called fresh
 * every tick, not just once, so power genuinely shrinks as casualties
 * mount. `armySize` is sub-linear (§11 guardrail 1).
 */
export function computeYourPower({ armySize, armyQuality, morale, supply, leadership, strategy, intelligence, scouted }) {
  const baseArmyPower = Math.pow(Math.max(0, armySize), ARMY_SIZE_EXPONENT) * armyQuality

  const moraleModifier = computeModifier(morale, 'morale')
  const leadershipModifier = computeModifier(leadership, 'leadership')
  const strategyModifier = computeModifier(strategy, 'strategy')
  const supplyModifier = computeModifier(supply, 'supply')
  const intelligenceModifier = scouted ? computeModifier(intelligence, 'intelligence') : 1.0

  return baseArmyPower * moraleModifier * leadershipModifier * strategyModifier * supplyModifier * intelligenceModifier
}

/**
 * Enemy side's effective power at their current army size, computed from
 * an enemy_houses row (§12.2) — no council, just army stats + a rating
 * standing in for their own leadership/strategy competence.
 */
export function computeEnemyPower({ armySize, armyQuality, morale, supply, rating }) {
  const baseArmyPower = Math.pow(Math.max(0, armySize), ARMY_SIZE_EXPONENT) * armyQuality

  const moraleModifier = computeModifier(morale, 'morale')
  const supplyModifier = computeModifier(supply, 'supply')
  const ratingModifier = computeModifier(rating, 'enemyRating')

  return baseArmyPower * moraleModifier * supplyModifier * ratingModifier
}

// --- strategy execution (§10.4) ----------------------------------------

/**
 * "Effectiveness of the chosen strategy is itself scaled by Master of War +
 * Commander's EffectiveAttribute" — `executionSkill` (0-1) is that combined
 * rating, so a poorly-fit Master of War barely gets any benefit (or harm)
 * from picking Aggressive, while a strong one gets close to the full effect.
 */
export function resolveStrategyModifiers(strategyId, executionSkill) {
  const strategy = STRATEGIES[strategyId]
  if (!strategy) {
    throw new Error(`Unknown strategy: "${strategyId}"`)
  }

  const skill = Math.max(0, Math.min(1, executionSkill))
  return {
    yourCasualtyMultiplier: 1 + (strategy.yourCasualtyMultiplier - 1) * skill,
    enemyCasualtyMultiplier: 1 + (strategy.enemyCasualtyMultiplier - 1) * skill,
  }
}

// --- live battle ticks ---------------------------------------------------

/**
 * One tick of a live battle. Recomputes power from the CURRENT army sizes
 * (not the starting ones), deals casualties proportional to who's winning
 * that exchange, and checks both end conditions.
 *
 * yourStats/enemyStats: same shape as computeYourPower/computeEnemyPower's
 * arguments, minus armySize (that comes from yourArmy/enemyArmy instead,
 * since it changes every tick).
 * strategyId: current strategy — can change tick to tick.
 * rng: injectable for deterministic tests.
 *
 * Returns { yourArmy, enemyArmy, yourCasualties, enemyCasualties, outcome }
 * — outcome is null while the battle continues, 'victory'/'defeat' once
 * an end condition is hit that tick.
 */
export function tickBattle({ yourArmy, enemyArmy, yourStats, enemyStats, strategyId, scouted, rng = Math.random }) {
  const strategyMods = resolveStrategyModifiers(strategyId, yourStats.executionSkill ?? 0)

  const yourPower = computeYourPower({ ...yourStats, armySize: yourArmy, scouted })
  const enemyPower = computeEnemyPower({ ...enemyStats, armySize: enemyArmy })

  let yourShare = yourPower / (yourPower + enemyPower)
  if (strategyId === 'ambush') {
    yourShare = Math.max(0, Math.min(1, yourShare + (scouted ? AMBUSH_SHARE_BONUS : -AMBUSH_SHARE_BONUS)))
  }

  const jitter = () => 1 + (rng() * 2 - 1) * TICK_JITTER

  const yourCasualtyRate = Math.max(0, BASE_TICK_CASUALTY_RATE * (1 - yourShare) * 2 * strategyMods.yourCasualtyMultiplier * jitter())
  const enemyCasualtyRate = Math.max(0, BASE_TICK_CASUALTY_RATE * yourShare * 2 * strategyMods.enemyCasualtyMultiplier * jitter())

  const yourCasualties = Math.min(yourArmy, Math.round(yourArmy * yourCasualtyRate))
  const enemyCasualties = Math.min(enemyArmy, Math.round(enemyArmy * enemyCasualtyRate))

  const nextYourArmy = Math.max(0, yourArmy - yourCasualties)
  const nextEnemyArmy = Math.max(0, enemyArmy - enemyCasualties)

  let outcome = null
  if (nextEnemyArmy <= 0) {
    outcome = 'victory'
  } else if (nextYourArmy <= 0) {
    outcome = 'defeat'
  } else if (nextYourArmy >= nextEnemyArmy * SURRENDER_RATIO) {
    outcome = 'victory'
  }

  return { yourArmy: nextYourArmy, enemyArmy: nextEnemyArmy, yourCasualties, enemyCasualties, outcome }
}

/**
 * Runs a live battle start-to-finish without pausing between ticks — not
 * used by the actual UI (which drives one tick at a time on its own
 * timer so the player can react), but useful for tests and for verifying
 * aggregate behavior over many simulated fights.
 */
export function runBattleToCompletion({ yourArmy, enemyArmy, yourStats, enemyStats, strategyId, scouted, rng = Math.random }) {
  let currentYourArmy = yourArmy
  let currentEnemyArmy = enemyArmy
  let ticks = 0
  let outcome = null

  while (outcome === null && ticks < MAX_TICKS) {
    const result = tickBattle({
      yourArmy: currentYourArmy,
      enemyArmy: currentEnemyArmy,
      yourStats,
      enemyStats,
      strategyId: ticks === 0 ? strategyId : strategyId === 'ambush' ? 'balanced' : strategyId,
      scouted,
      rng,
    })
    currentYourArmy = result.yourArmy
    currentEnemyArmy = result.enemyArmy
    outcome = result.outcome
    ticks += 1
  }

  if (outcome === null) {
    // Hit the safety cap — resolve by whoever's ahead rather than hang.
    outcome = currentYourArmy >= currentEnemyArmy ? 'victory' : 'defeat'
  }

  return { yourArmy: currentYourArmy, enemyArmy: currentEnemyArmy, outcome, ticks }
}

// --- surrender & final consequences (§10.6, §10.7) -----------------------

/**
 * Turns a battle's final army counts into the result shape the UI/campaign
 * expect — used both when a battle ends naturally (0 army or 5:1
 * surrender) and when the player voluntarily surrenders. Surrendering
 * simply stops the fight at its current numbers rather than dealing any
 * additional casualties — that's what makes it a real choice ("cut losses
 * now") rather than just a slower version of losing.
 */
export function finalizeBattleResult({ outcome, startingYourArmy, yourArmy, startingEnemyArmy, enemyArmy, enemyGold }) {
  const won = outcome === 'victory'
  const yourCasualties = Math.max(0, startingYourArmy - yourArmy)
  const enemyCasualties = Math.max(0, startingEnemyArmy - enemyArmy)

  // §10.7 — a portion of the enemy's SURVIVING army surrenders and joins
  // you when you force their surrender with troops still standing; if
  // their army was wiped out entirely, there's nothing left to gain.
  const enemySurrendered = won && enemyArmy > 0 ? Math.round(enemyArmy * 0.4) : 0
  const soldiersGained = enemySurrendered

  const yourLossRate = startingYourArmy > 0 ? yourCasualties / startingYourArmy : 0

  const goldGained = won ? Math.round((enemyGold ?? 0) * 0.2) : 0
  const moraleChange = won ? Math.round(8 - yourLossRate * 10) : -Math.round(6 + yourLossRate * 10)
  const supplyChange = -Math.round(3 + startingYourArmy / 5000)

  return {
    outcome,
    yourCasualties,
    enemyCasualties,
    enemySurrendered,
    soldiersGained,
    goldGained,
    moraleChange,
    supplyChange,
  }
}

// --- roster -> engine input extraction -----------------------------------

/**
 * Pulls the handful of EffectiveAttribute values the battle formula needs
 * straight from a completed draft roster (§17 step 4's getFinalRoster
 * shape) — the one seam between the draft/council system and the battle
 * system. Missing roles (shouldn't happen post-draft, but defensively)
 * contribute 0 rather than throwing.
 */
export function extractCouncilBattleInputs(roster) {
  const byRole = Object.fromEntries(roster.map(({ role, character }) => [role.id, character]))

  const effectiveOrZero = (roleId, attr) => {
    const character = byRole[roleId]
    return character ? effectiveAttribute(character.attributes, roleId, attr) : 0
  }

  const leadership = average([effectiveOrZero('king', 'leadership'), effectiveOrZero('commander', 'leadership')])
  const strategy = average([effectiveOrZero('masterOfWar', 'strategy'), effectiveOrZero('commander', 'strategy')])
  const intelligence = effectiveOrZero('masterOfWhispers', 'intelligence')

  return {
    leadership,
    strategy,
    intelligence,
    executionSkill: strategy / 100,
  }
}

function average(values) {
  const valid = values.filter((v) => typeof v === 'number' && !Number.isNaN(v))
  if (valid.length === 0) return 0
  return valid.reduce((a, b) => a + b, 0) / valid.length
}

/**
 * Pulls the ratings the campaign actions (§9) need from a completed draft
 * roster — Master of Coin's economy rating for Recruit, King/Consort's
 * diplomacy for Diplomacy, Master of Whispers's intelligence for
 * Intelligence. Same missing-role-contributes-0 posture as
 * extractCouncilBattleInputs.
 */
export function extractCouncilEconomyInputs(roster) {
  const byRole = Object.fromEntries(roster.map(({ role, character }) => [role.id, character]))

  const effectiveOrZero = (roleId, attr) => {
    const character = byRole[roleId]
    return character ? effectiveAttribute(character.attributes, roleId, attr) : 0
  }

  return {
    masterOfCoinRating: effectiveOrZero('masterOfCoin', 'economy'),
    diplomacyRating: average([effectiveOrZero('king', 'diplomacy'), effectiveOrZero('consort', 'diplomacy')]),
    masterOfWhispersRating: effectiveOrZero('masterOfWhispers', 'intelligence'),
  }
}