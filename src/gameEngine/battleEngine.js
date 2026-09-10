/**
 * gameEngine/battleEngine.js
 *
 * Implements §10 and §11 from GOT-DRAFT-CONTEXT.md. Pure functions only —
 * no React, no Supabase. Never does `if (yourRating > enemyRating) win()`
 * (§10.1): always power -> probability -> modifiers -> random roll ->
 * casualties, exactly as the doc requires.
 *
 * The doc names each modifier (Morale, Leadership, Strategy, Supply,
 * Intelligence) but doesn't give exact formulas for turning a 0-100 stat
 * into a multiplier, or for casualties/loot/morale deltas after the roll —
 * those are first-draft judgment calls made here, same as the house-stats
 * mapping in step 6. All flagged inline. Expect a balancing pass (§17 step
 * 12) to retune the constants; the *shape* of the system (sub-linear army
 * size, soft probability caps, strategy execution scaled by council skill)
 * is what §11's guardrails actually require and is what's tested here.
 */

import { effectiveAttribute } from './ratings'
import { statToModifier } from './modifiers'

// --- tunable constants -----------------------------------------------

// §11 guardrail 1 — army size is sub-linear so a bigger army can't
// automatically flatten a smaller elite one. sqrt (0.5) was the original
// choice but proved too forgiving in practice: a 6x army mismatch (10k vs
// 60k) only produced a ~2.4x power gap under sqrt, letting a wildly
// outnumbered side keep a ~30% win chance even against a stat-comparable
// opponent. 0.65 steepens that (a 6x mismatch is now ~3.2x power) without
// going fully linear (1.0), which would let "just build the biggest army"
// dominate every matchup and break pillar 2's "no dominant strategy."
// There's a real, unresolved tension here between "big mismatches should
// feel decisive" and "a smaller elite army should stay viable" — this is
// a step toward the former without abandoning the latter, not a final
// answer. Expect further tuning in the balancing pass (§17 step 12).
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

// §10.3 — "never 0% or 100%". Also directly enforces §11 guardrail 4: no
// single stat can push probability past these caps, because nothing in
// the formula runs after this clamp.
const PROBABILITY_FLOOR = 0.05
const PROBABILITY_CEILING = 0.95

// §5.4 / §10.4 — Aggressive/Balanced/Defensive/Ambush base effects, before
// being scaled by how skilled your council is at executing them.
//
// Aggressive/Balanced/Defensive deliberately do NOT shift win probability —
// per §10.4 their tradeoff is entirely in casualties ("more damage dealt
// and taken" / "fewer casualties both sides"). Giving them a probability
// shift too made Aggressive strictly best and Defensive strictly worst for
// win chance, which is a dominant-strategy problem (§1 pillar 2). Only
// Ambush genuinely swings probability, because that's explicitly its
// design: "high risk/high reward."
export const STRATEGIES = {
  aggressive: { probabilityShift: 0, yourCasualtyMultiplier: 1.3, enemyCasualtyMultiplier: 1.35 },
  balanced: { probabilityShift: 0, yourCasualtyMultiplier: 1.0, enemyCasualtyMultiplier: 1.0 },
  defensive: { probabilityShift: 0, yourCasualtyMultiplier: 0.65, enemyCasualtyMultiplier: 0.8 },
  // "requires decent Intelligence to be worth it" (§10.4) — enforced in
  // resolveStrategyModifiers: unscouted Ambush flips this shift negative.
  ambush: { probabilityShift: 0.08, yourCasualtyMultiplier: 1.1, enemyCasualtyMultiplier: 1.4 },
}
const AMBUSH_BLIND_PENALTY = -0.1

// --- power & probability (§10.2, §10.3) --------------------------------

/**
 * Your side's effective power. `armySize` is sub-linear via a 0.65 power
 * (§11 guardrail 1) — a bigger army matters more than sqrt would give it
 * credit for, but still doesn't scale linearly, so a smaller elite army
 * keeps a genuine (if smaller) chance rather than the guardrail collapsing
 * entirely. See ARMY_SIZE_EXPONENT's comment for the tuning trade-off.
 */
export function computeYourPower({ armySize, armyQuality, morale, supply, leadership, strategy, intelligence, scouted }) {
  const baseArmyPower = Math.pow(Math.max(0, armySize), ARMY_SIZE_EXPONENT) * armyQuality

  const moraleModifier = statToModifier(morale, MODIFIER_RANGES.morale)
  const leadershipModifier = statToModifier(leadership, MODIFIER_RANGES.leadership)
  const strategyModifier = statToModifier(strategy, MODIFIER_RANGES.strategy)
  const supplyModifier = statToModifier(supply, MODIFIER_RANGES.supply)
  const intelligenceModifier = scouted ? statToModifier(intelligence, MODIFIER_RANGES.intelligence) : 1.0

  return baseArmyPower * moraleModifier * leadershipModifier * strategyModifier * supplyModifier * intelligenceModifier
}

/**
 * Enemy side's effective power, computed straight from an enemy_houses row
 * (§12.2) — they don't have a drafted council, just army stats + a rating
 * standing in for their own leadership/strategy competence.
 */
export function computeEnemyPower({ armySize, armyQuality, morale, supply, rating }) {
  const baseArmyPower = Math.pow(Math.max(0, armySize), ARMY_SIZE_EXPONENT) * armyQuality

  const moraleModifier = statToModifier(morale, MODIFIER_RANGES.morale)
  const supplyModifier = statToModifier(supply, MODIFIER_RANGES.supply)
  const ratingModifier = statToModifier(rating, MODIFIER_RANGES.enemyRating)

  return baseArmyPower * moraleModifier * supplyModifier * ratingModifier
}

function clampProbability(p) {
  return Math.max(PROBABILITY_FLOOR, Math.min(PROBABILITY_CEILING, p))
}

/**
 * §10.3 — YourShare = YourPower / (YourPower + EnemyPower), clamped.
 */
export function computeWinProbability(yourPower, enemyPower) {
  return clampProbability(yourPower / (yourPower + enemyPower))
}

// --- strategy execution (§10.4) ----------------------------------------

/**
 * "Effectiveness of the chosen strategy is itself scaled by Master of War +
 * Commander's EffectiveAttribute" — `executionSkill` (0-1) is that combined
 * rating, so a poorly-fit Master of War barely gets any benefit (or harm)
 * from picking Aggressive, while a strong one gets close to the full effect.
 */
export function resolveStrategyModifiers(strategyId, executionSkill, scouted) {
  const strategy = STRATEGIES[strategyId]
  if (!strategy) {
    throw new Error(`Unknown strategy: "${strategyId}"`)
  }

  let probabilityShift = strategy.probabilityShift
  if (strategyId === 'ambush' && !scouted) {
    probabilityShift = AMBUSH_BLIND_PENALTY
  }

  const skill = Math.max(0, Math.min(1, executionSkill))
  return {
    appliedShift: probabilityShift * skill,
    yourCasualtyMultiplier: 1 + (strategy.yourCasualtyMultiplier - 1) * skill,
    enemyCasualtyMultiplier: 1 + (strategy.enemyCasualtyMultiplier - 1) * skill,
  }
}

// --- casualties & consequences (§10.6, §10.7) ---------------------------

/**
 * How close the fight was, 0 (total mismatch) to 1 (dead even) — drives
 * casualty rates. A near-even fight is brutal for both sides even if you
 * win it (a Pyrrhic victory, §10.6); a lopsided one is cheap for the
 * favorite and costly for the underdog.
 */
function closenessOf(probability) {
  return 1 - Math.abs(probability - 0.5) * 2
}

function resolveCasualties({ armySize, enemyArmySize, probability, won, yourCasualtyMultiplier, enemyCasualtyMultiplier }) {
  const closeness = closenessOf(probability)
  const baseRate = 0.08 + closeness * 0.22 // 0.08 (lopsided) .. 0.30 (even fight)

  const yourRate = Math.min(0.9, (won ? baseRate * 0.55 : baseRate * 1.35) * yourCasualtyMultiplier)
  const enemyRate = Math.min(0.9, (won ? baseRate * 1.35 : baseRate * 0.55) * enemyCasualtyMultiplier)

  const yourCasualties = Math.round(armySize * yourRate)
  const enemyCasualtiesRaw = Math.round(enemyArmySize * enemyRate)

  // §10.7 — some enemy losses surrender and join you instead of dying,
  // but only when you win.
  const surrenderFraction = won ? 0.15 : 0
  const enemySurrendered = Math.round(enemyCasualtiesRaw * surrenderFraction)
  const enemyCasualties = enemyCasualtiesRaw - enemySurrendered

  return { yourCasualties, enemyCasualties, enemySurrendered }
}

// --- full battle resolution ---------------------------------------------

/**
 * yourSide: { armySize, armyQuality, morale, supply, leadership, strategy,
 *             intelligence, executionSkill, scouted, gold? }
 * enemySide: { armySize, armyQuality, morale, supply, rating, gold? } —
 *            straight from an enemy_houses row (gold is what gets looted)
 * strategyId: one of STRATEGIES' keys
 * rng: injectable for deterministic tests, defaults to Math.random
 */
/**
 * The probability a battle would resolve in your favor for a given
 * strategy choice, without actually rolling the outcome. Used by the
 * battle prep screen for the live "Estimated Victory Chance" display
 * (§10.6) as the player switches between strategies, and internally by
 * simulateBattle for the actual roll.
 */
export function computeBattleProbability({ yourSide, enemySide, strategyId = 'balanced' }) {
  const strategyMods = resolveStrategyModifiers(strategyId, yourSide.executionSkill ?? 0, Boolean(yourSide.scouted))
  const yourPower = computeYourPower(yourSide)
  const enemyPower = computeEnemyPower(enemySide)
  const baseProbability = yourPower / (yourPower + enemyPower)
  return clampProbability(baseProbability + strategyMods.appliedShift)
}

export function simulateBattle({ yourSide, enemySide, strategyId = 'balanced', rng = Math.random }) {
  const strategyMods = resolveStrategyModifiers(strategyId, yourSide.executionSkill ?? 0, Boolean(yourSide.scouted))
  const probability = computeBattleProbability({ yourSide, enemySide, strategyId })

  const won = rng() < probability

  const { yourCasualties, enemyCasualties, enemySurrendered } = resolveCasualties({
    armySize: yourSide.armySize,
    enemyArmySize: enemySide.armySize,
    probability,
    won,
    yourCasualtyMultiplier: strategyMods.yourCasualtyMultiplier,
    enemyCasualtyMultiplier: strategyMods.enemyCasualtyMultiplier,
  })

  const closeness = closenessOf(probability)
  const goldGained = won ? Math.round((enemySide.gold ?? 0) * (0.15 + closeness * 0.1)) : 0
  const moraleChange = won ? Math.round(4 + closeness * 4) : -Math.round(6 + closeness * 6)
  const supplyChange = -Math.round(3 + yourSide.armySize / 5000)

  return {
    outcome: won ? 'victory' : 'defeat',
    probability: Math.round(probability * 100),
    yourCasualties,
    enemyCasualties,
    enemySurrendered,
    soldiersGained: enemySurrendered,
    goldGained,
    moraleChange,
    supplyChange,
  }
}

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