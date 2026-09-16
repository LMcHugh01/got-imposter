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
 *
 * v2: extractCouncilBattleInputs/extractCouncilEconomyInputs updated for
 * the merged Commander role (Master of War no longer exists as a separate
 * role — pulling from it silently contributed 0, which was quietly
 * halving the strategy input) and the new attribute names (leadership ->
 * command; intelligence -> subterfuge, since Master of Whispers's
 * scouting value now comes from Subterfuge rather than a general
 * "intelligence" stat that no longer exists).
 *
 * v3 (BATTLE_PLAN.md §1-3): only King/Commander/Kingsguard affect live
 * battle math now, each via their own roleRating (fit %) rather than a
 * single raw attribute — see extractCouncilBattleInputs below for why.
 * Master of Whispers no longer grants a scouted power bonus; Gather
 * Intelligence is purely informational now (§13). Kingsguard is new —
 * its Combat lever reduces your own casualty rate via the `discipline`
 * modifier, see tickBattle.
 */

import { effectiveAttribute, roleRating } from './ratings'
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
  // Kingsguard's Combat lever (BATTLE_PLAN.md §3) — reduces YOUR casualty
  // rate only, applied in tickBattle rather than here in raw power. Range
  // is reversed on purpose: statToModifier(0, [1.15, 0.85]) = 1.15 (worse),
  // statToModifier(100, ...) = 0.85 (better), stat=50 is neutral at 1.0,
  // same convention as every other centered modifier in this file.
  discipline: [1.15, 0.85],
  enemyRating: [0.85, 1.15], // stands in for the enemy's own leadership/strategy
}

// Your army outnumbering theirs by this ratio forces their surrender.
export const SURRENDER_RATIO = 5

// Fraction of a side's CURRENT army it can lose in one tick when the fight
// is dead even (yourShare = 0.5); scales down/up from there based on who's
// winning that tick. +/- jitter keeps it from feeling like a metronome.
// v3 (further pacing pass): halved again from 0.035. Feedback was fights
// were still resolving too fast even after v2 — fine for them to run up
// to ~a minute. MAX_TICKS raised to match.
const BASE_TICK_CASUALTY_RATE = 0.018
const TICK_JITTER = 0.25

// Safety valve — should essentially never be hit (integer rounding alone
// makes armies diverge over time), but guarantees a live battle can't hang.
const MAX_TICKS = 240 // raised alongside BASE_TICK_CASUALTY_RATE's v3 reduction above

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
  // Regroup (BATTLE_PLAN.md §7, renamed from "Fall Back" to avoid clashing
  // with Retreat's break-threshold meaning) — the one strategy besides
  // Ambush that DOES shift the power balance, not just casualties: a
  // deliberate exception, same as Ambush is. Available any tick, unlimited
  // uses — see REGROUP_SHARE_PENALTY below and tickBattle's share
  // adjustment.
  regroup: { yourCasualtyMultiplier: 0.5, enemyCasualtyMultiplier: 0.5 },
}

// Regroup costs you ground/tempo this tick in exchange for the casualty
// lull above — same mechanism as AMBUSH_SHARE_BONUS below, just always a
// cost rather than a scouted-dependent bonus/penalty.
const REGROUP_SHARE_PENALTY = 0.1

// Ambush only makes sense as an opening move (the UI enforces this — it's
// not offered again once a fight is underway). Scouted, it's a real
// surprise-attack edge on that first exchange; blind, it backfires.
const AMBUSH_SHARE_BONUS = 0.15

// Deceptive personality's ambush-style opening (§12) — the enemy's own
// version of the share shift above, but one-directional (always in
// THEIR favor) and tick-0-only, no scouted/blind distinction since
// that's a property of the PLAYER's own intelligence-gathering, not
// something the enemy AI reasons about.
const DECEPTIVE_OPENING_SHARE_BONUS = 0.1

// --- power (§10.2) -------------------------------------------------------

function computeModifier(stat, key) {
  return statToModifier(stat, MODIFIER_RANGES[key])
}

/**
 * Your side's effective power at the CURRENT army size — called fresh
 * every tick, not just once, so power genuinely shrinks as casualties
 * mount. `armySize` is sub-linear (§11 guardrail 1).
 */
export function computeYourPower({ armySize, armyQuality, morale, supply, leadership, strategy, armySizeExponent = ARMY_SIZE_EXPONENT }) {
  const baseArmyPower = Math.pow(Math.max(0, armySize), armySizeExponent) * armyQuality

  const moraleModifier = computeModifier(morale, 'morale')
  const leadershipModifier = computeModifier(leadership, 'leadership')
  const strategyModifier = computeModifier(strategy, 'strategy')
  const supplyModifier = computeModifier(supply, 'supply')

  return baseArmyPower * moraleModifier * leadershipModifier * strategyModifier * supplyModifier
}

/**
 * Enemy side's effective power at their current army size, computed from
 * an enemy_houses row (§12.2) — no council, just army stats + a rating
 * standing in for their own leadership/strategy competence.
 */
export function computeEnemyPower({ armySize, armyQuality, morale, supply, rating, armySizeExponent = ARMY_SIZE_EXPONENT }) {
  const baseArmyPower = Math.pow(Math.max(0, armySize), armySizeExponent) * armyQuality

  const moraleModifier = computeModifier(morale, 'morale')
  const supplyModifier = computeModifier(supply, 'supply')
  const ratingModifier = computeModifier(rating, 'enemyRating')

  return baseArmyPower * moraleModifier * supplyModifier * ratingModifier
}

// --- strategy execution (§10.4) ----------------------------------------

/**
 * "Effectiveness of the chosen strategy is itself scaled by Commander's
 * EffectiveAttribute" — `executionSkill` (0-1) is that rating, so a
 * poorly-fit Commander barely gets any benefit (or harm) from picking
 * Aggressive, while a strong one gets close to the full effect.
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
// --- troop composition (BATTLE_PLAN.md §5) --------------------------------

export const TROOP_TYPES = ['infantry', 'archers', 'cavalry']

// The rock-paper-scissors triangle: each type is strong AGAINST the type
// it maps to here. Cavalry > Archers > Infantry > Cavalry.
export const COUNTERS = { cavalry: 'archers', archers: 'infantry', infantry: 'cavalry' }
// The inverse — which type BEATS this one — used for the bleed weighting
// below (how exposed a type is, not how strong it is).
const BEATEN_BY = { archers: 'cavalry', infantry: 'archers', cavalry: 'infantry' }

// First-draft, like every other tuning constant in this file.
const COMPOSITION_STRENGTH = 0.3 // max ~30% casualty-rate swing from a maximally-lopsided matchup
const BLEED_STRENGTH = 1.2 // how sharply losses concentrate on the countered type

function troopTotal(troops) {
  return troops.infantry + troops.archers + troops.cavalry
}

function troopShares(troops) {
  const total = troopTotal(troops)
  if (total <= 0) return { infantry: 0, archers: 0, cavalry: 0 }
  return { infantry: troops.infantry / total, archers: troops.archers / total, cavalry: troops.cavalry / total }
}

// How much `fromShare`'s composition counters `toShare`'s, one direction
// only. computeNetCompositionAdvantage below computes this both ways and
// subtracts — who's countering whom matters, not just raw overlap.
function compositionAdvantage(fromShare, toShare, counters = COUNTERS) {
  return TROOP_TYPES.reduce((sum, type) => sum + fromShare[type] * toShare[counters[type]], 0)
}

/**
 * Net composition advantage, roughly -1..1. Positive means your mix
 * counters theirs more than theirs counters yours. Two balanced armies
 * (or any two armies with the SAME shares) net to exactly 0 — composition
 * only matters when the two mixes actually differ.
 *
 * `yourCounterOverrides` (§7, Volley) lets YOUR side's targeting deviate
 * from the standard triangle for this one calculation — e.g.
 * `{ archers: 'cavalry' }` redirects your archers from their default
 * Infantry counter onto Cavalry instead. The enemy's own targeting always
 * uses the standard COUNTERS, since Volley is your order, not theirs.
 */
export function computeNetCompositionAdvantage(yourTroops, enemyTroops, yourCounterOverrides = {}) {
  const yourShare = troopShares(yourTroops)
  const enemyShare = troopShares(enemyTroops)
  const yourCounters = { ...COUNTERS, ...yourCounterOverrides }
  return compositionAdvantage(yourShare, enemyShare, yourCounters) - compositionAdvantage(enemyShare, yourShare, COUNTERS)
}

/**
 * Splits a side's total casualties for one tick across its 3 troop
 * types, weighting toward whichever type is most exposed to the ENEMY's
 * composition (the "bleeding" mechanic, §5) — a type facing its hard
 * counter loses disproportionately. Everything derives from live shares
 * each call, so a type already at 0 just contributes 0 weight — no
 * special-casing needed as a fight grinds a type down to nothing.
 * Per-type results are clamped so a side never loses more of a type than
 * it has.
 */
function splitCasualtiesByType(troops, enemyTroops, totalCasualties, vulnerabilityReductionByType = {}) {
  if (totalCasualties <= 0 || troopTotal(troops) <= 0) {
    return { infantry: 0, archers: 0, cavalry: 0 }
  }
  const share = troopShares(troops)
  const enemyShare = troopShares(enemyTroops)

  const weights = {}
  let weightTotal = 0
  for (const type of TROOP_TYPES) {
    const rawVulnerability = enemyShare[BEATEN_BY[type]]
    // Shield Wall (§9) reduces the lead type's vulnerability weight —
    // holding formation even when countered. 0 for every other type.
    const reduction = vulnerabilityReductionByType[type] ?? 0
    const vulnerability = rawVulnerability * (1 - reduction)
    weights[type] = share[type] * (1 + vulnerability * BLEED_STRENGTH)
    weightTotal += weights[type]
  }
  if (weightTotal <= 0) return { infantry: 0, archers: 0, cavalry: 0 }

  // Round two types, give the third the remainder — same trick used for
  // every other multi-way split in this codebase, so the parts always
  // sum exactly to totalCasualties before per-type clamping.
  const infantryCasualties = Math.round((totalCasualties * weights.infantry) / weightTotal)
  const archersCasualties = Math.round((totalCasualties * weights.archers) / weightTotal)
  const cavalryCasualties = totalCasualties - infantryCasualties - archersCasualties

  return {
    infantry: Math.min(troops.infantry, Math.max(0, infantryCasualties)),
    archers: Math.min(troops.archers, Math.max(0, archersCasualties)),
    cavalry: Math.min(troops.cavalry, Math.max(0, cavalryCasualties)),
  }
}

// --- Formation & Terrain (BATTLE_PLAN.md §9-§10) ---------------------------

// Chosen once, pre-battle, alongside Opening Strategy — YOUR side only for
// now; the enemy doesn't pick a formation until the personality battle AI
// (§12) exists, which needs this to exist first. leadType sets both the
// battlefield's front row (Battle.jsx) and which type gets Shield Wall's
// vulnerability reduction; breakThresholdMultiplier is applied externally
// by the caller (Battle.jsx calls applyFormationToBreakThreshold), not
// inside tickBattle, since the break threshold is computed once per fight
// rather than per tick.
export const FORMATIONS = {
  balanced: { label: 'Balanced Line', leadType: null, breakThresholdMultiplier: 1.0 },
  shieldWall: { label: 'Shield Wall', leadType: 'infantry', breakThresholdMultiplier: 1.2, vulnerabilityReduction: 0.3 },
  cavalryVanguard: { label: 'Cavalry Vanguard', leadType: 'cavalry', breakThresholdMultiplier: 0.85, openingAdvantageBonus: 0.25 },
  skirmishLine: { label: 'Skirmish Line', leadType: 'archers', breakThresholdMultiplier: 1.0, openingCasualtyMultiplier: 0.7 },
}

// How many ticks Cavalry Vanguard's charge and Skirmish Line's extended
// exchange last before settling into ordinary combat.
const OPENING_FORMATION_TICKS = 3

// Terrain lives on the enemy house (enemy_houses.terrain) — the battle
// happens wherever they are. A match AMPLIFIES the chosen formation's own
// effect; a mismatch DAMPENS it toward neutral — it never flips a bonus
// into an outright penalty, since both multipliers below stay in [0, ∞)
// and scaleTowardNeutral only interpolates between neutral and the base
// value, never past either end.
export const TERRAIN_FORMATION_AFFINITY = {
  plains: { favors: ['cavalryVanguard'], penalizes: ['skirmishLine'] },
  forest: { favors: ['skirmishLine', 'shieldWall'], penalizes: ['cavalryVanguard'] },
  hills: { favors: ['skirmishLine'], penalizes: ['cavalryVanguard'] },
  riverlands: { favors: ['shieldWall'], penalizes: ['cavalryVanguard'] },
  snowfields: { favors: ['shieldWall'], penalizes: [] },
}
const TERRAIN_FAVOR_MULTIPLIER = 1.5
const TERRAIN_PENALTY_MULTIPLIER = 0.5

// Terrain that makes it harder to bring a numbers advantage fully to bear
// — a simplified first pass: a flat exponent reduction, applied
// symmetrically to BOTH sides (it's the same battlefield for everyone).
// The fuller design also had army QUALITY partially offset this per side;
// left out of this pass to keep the first cut simple — worth adding later
// if it's worth the extra complexity.
const CRAMPED_TERRAINS = ['forest', 'riverlands']
const CRAMPED_EXPONENT_PENALTY = 0.1

// Snowfields' general hardship — applies regardless of formation choice,
// on top of whatever Shield Wall's own terrain-amplified bonus is doing.
const SNOWFIELDS_CASUALTY_MULTIPLIER = 1.15

export function computeTerrainFormationMultiplier(terrain, formationId) {
  const affinity = TERRAIN_FORMATION_AFFINITY[terrain]
  if (!affinity || formationId === 'balanced') return 1
  if (affinity.favors.includes(formationId)) return TERRAIN_FAVOR_MULTIPLIER
  if (affinity.penalizes.includes(formationId)) return TERRAIN_PENALTY_MULTIPLIER
  return 1
}

// Interpolates `value` toward `neutral` by `multiplier` — a multiplier of
// 1 returns `value` unchanged, 0 collapses to `neutral`, and (per the
// favor/penalty constants above) this only ever moves BETWEEN neutral and
// value, never past either end, since multiplier stays within [0.5, 1.5].
function scaleTowardNeutral(value, neutral, multiplier) {
  return neutral + (value - neutral) * multiplier
}

/**
 * Applies Formation and Terrain to a break threshold already computed by
 * computeBreakThreshold — kept as a separate step since the threshold
 * itself is about morale/army-size (§8) and doesn't need to know
 * Formation exists; this is where the two combine, called once per fight
 * by Battle.jsx rather than per tick.
 */
export function applyFormationToBreakThreshold(baseThreshold, formationId, terrain) {
  const formation = FORMATIONS[formationId] ?? FORMATIONS.balanced
  const terrainMultiplier = computeTerrainFormationMultiplier(terrain, formationId)
  const adjustedMultiplier = scaleTowardNeutral(formation.breakThresholdMultiplier, 1, terrainMultiplier)
  return Math.max(1, Math.round(baseThreshold * adjustedMultiplier))
}

// --- Orders (BATTLE_PLAN.md §7) --------------------------------------------

// Live, per-tick, troop-type-specific commands — distinct from Tactics
// (a sticky stance that stays chosen until changed) in that an Order is
// ONE-SHOT: the caller (Battle.jsx) applies it for exactly one tick, via
// tickBattle's `order` param, then clears back to no order. Contextual —
// only meaningful (and only shown in the UI) if you actually have the
// relevant troop type.
export const ORDERS = {
  charge: { label: 'Charge', requiresType: 'cavalry' },
  volley: { label: 'Volley', requiresType: 'archers' },
}

// Charge's netAdvantage bump scales by how much cavalry you actually
// have (a token cavalry force shouldn't get the full effect) — this is
// the max bump, at 100% cavalry share.
const CHARGE_MAX_ADVANTAGE_BONUS = 0.3
// The "small extra Cavalry losses" cost — reuses the exact same
// vulnerability-reduction knob Shield Wall uses, just negative (increases
// rather than decreases vulnerability).
const CHARGE_CAVALRY_VULNERABILITY_PENALTY = -0.2

// --- Enemy personality battle AI (BATTLE_PLAN.md §12) ----------------------

// A static per-battle profile set from personality at battle start — NOT
// a dynamic per-tick reactive AI (that would be a genuinely bigger,
// separate build). Reuses Formation math (§9) applied to the enemy's
// side instead of yours, generalizing something already built rather
// than inventing a second mechanic. "Dealt"/"Taken" map directly onto
// this engine's existing yourCasualtyRate/enemyCasualtyRate split —
// Dealt is casualties the enemy deals TO you (scales yourCasualtyRate),
// Taken is casualties the enemy itself suffers (scales enemyCasualtyRate)
// — same slot resolveStrategyModifiers already occupies, just fixed for
// the whole fight instead of live-chosen.
const PERSONALITY_PROFILES = {
  aggressive: { formationId: 'cavalryVanguard', dealtMultiplier: 1.2, takenMultiplier: 1.15, breakThresholdMultiplier: 1.0 },
  defensive: { formationId: 'shieldWall', dealtMultiplier: 0.9, takenMultiplier: 0.8, breakThresholdMultiplier: 1.15 },
  // Protective of its own forces — breaks/retreats early (§12).
  economic: { formationId: 'balanced', dealtMultiplier: 0.95, takenMultiplier: 0.95, breakThresholdMultiplier: 0.75 },
  deceptive: { formationId: 'skirmishLine', dealtMultiplier: 1.0, takenMultiplier: 1.0, breakThresholdMultiplier: 1.0, ambushOpening: true },
  diplomatic: { formationId: 'balanced', dealtMultiplier: 1.0, takenMultiplier: 1.0, breakThresholdMultiplier: 1.0 },
}

const NEUTRAL_PERSONALITY_PROFILE = {
  formationId: 'balanced',
  dealtMultiplier: 1,
  takenMultiplier: 1,
  breakThresholdMultiplier: 1,
  ambushOpening: false,
}

const REROLLABLE_PERSONALITIES = Object.keys(PERSONALITY_PROFILES)

/**
 * Resolves a house's `personality` into a concrete battle profile —
 * called ONCE per battle by the caller (Battle.jsx), not per tick, since
 * this is a static pre-fight setup step, not a live decision. Handles
 * "unpredictable" by rerolling to one of the other 5 profiles here, once,
 * rather than leaving that randomness for tickBattle to deal with every
 * tick. Aggressive's Cavalry Vanguard is downgraded to Balanced Line if
 * the house has no actual cavalry — same "don't offer/apply a formation
 * with no troops behind it" rule the player's own Formation picker uses.
 */
export function resolvePersonalityProfile(personality, troops, rng = Math.random) {
  const effectivePersonality =
    personality === 'unpredictable' ? REROLLABLE_PERSONALITIES[Math.floor(rng() * REROLLABLE_PERSONALITIES.length)] : personality
  const profile = PERSONALITY_PROFILES[effectivePersonality] ?? PERSONALITY_PROFILES.diplomatic
  const formationId = profile.formationId === 'cavalryVanguard' && troops.cavalry <= 0 ? 'balanced' : profile.formationId
  return { ...profile, formationId, resolvedPersonality: effectivePersonality }
}

export function tickBattle({
  yourTroops,
  enemyTroops,
  yourStats,
  enemyStats,
  strategyId,
  scouted,
  rng = Math.random,
  formationId = 'balanced',
  terrain = 'plains',
  ticksElapsed = 0,
  order = null,
  enemyProfile = NEUTRAL_PERSONALITY_PROFILE,
}) {
  const yourArmy = troopTotal(yourTroops)
  const enemyArmy = troopTotal(enemyTroops)
  const formation = FORMATIONS[formationId] ?? FORMATIONS.balanced
  const terrainMultiplier = computeTerrainFormationMultiplier(terrain, formationId)
  const enemyFormationId = enemyProfile.formationId ?? 'balanced'
  const enemyFormation = FORMATIONS[enemyFormationId] ?? FORMATIONS.balanced
  const enemyTerrainMultiplier = computeTerrainFormationMultiplier(terrain, enemyFormationId)

  const strategyMods = resolveStrategyModifiers(strategyId, yourStats.executionSkill ?? 0)

  // Cramped terrain (§10) reduces how efficiently EITHER side's numbers
  // convert into power — the same battlefield for both armies, so this
  // isn't formation-dependent and applies even with Balanced Line chosen.
  const armySizeExponent = CRAMPED_TERRAINS.includes(terrain) ? ARMY_SIZE_EXPONENT - CRAMPED_EXPONENT_PENALTY : ARMY_SIZE_EXPONENT

  const yourPower = computeYourPower({ ...yourStats, armySize: yourArmy, armySizeExponent })
  const enemyPower = computeEnemyPower({ ...enemyStats, armySize: enemyArmy, armySizeExponent })

  let yourShare = yourPower / (yourPower + enemyPower)
  if (strategyId === 'ambush') {
    yourShare = Math.max(0, Math.min(1, yourShare + (scouted ? AMBUSH_SHARE_BONUS : -AMBUSH_SHARE_BONUS)))
  } else if (strategyId === 'regroup') {
    yourShare = Math.max(0, Math.min(1, yourShare - REGROUP_SHARE_PENALTY))
  }
  // Deceptive personality (§12) — a one-time opening advantage in the
  // enemy's favor, tick 0 only.
  if (enemyProfile.ambushOpening && ticksElapsed === 0) {
    yourShare = Math.max(0, Math.min(1, yourShare - DECEPTIVE_OPENING_SHARE_BONUS))
  }

  const jitter = () => 1 + (rng() * 2 - 1) * TICK_JITTER

  // Kingsguard's Combat lever (BATTLE_PLAN.md §3) — reduces only YOUR
  // casualty rate, kept distinct from strategy's yourCasualtyMultiplier
  // (which already touches both sides). Defaults to neutral (50) if a
  // caller hasn't supplied it, so this never NaNs out an otherwise-valid
  // fight — same graceful-degradation posture as a missing council role
  // elsewhere in this engine.
  const disciplineModifier = computeModifier(yourStats.discipline ?? 50, 'discipline')

  // Composition (§5) — a THIRD independent multiplier on casualty rate,
  // alongside strategy and discipline. Two balanced/identical mixes net
  // to a multiplier of exactly 1.0 (no effect) — only a genuine mismatch
  // between your mix and theirs moves this. Cavalry Vanguard's opening
  // charge (§9) adds a flat, terrain-scaled bonus on top for its first
  // few ticks only. Volley (§7) can redirect your archers' targeting for
  // this one tick, overriding the standard triangle.
  const yourCounterOverrides = order?.id === 'volley' && order.target ? { archers: order.target } : {}
  let netAdvantage = computeNetCompositionAdvantage(yourTroops, enemyTroops, yourCounterOverrides)
  if (formationId === 'cavalryVanguard' && ticksElapsed < OPENING_FORMATION_TICKS) {
    const openingBonus = scaleTowardNeutral(formation.openingAdvantageBonus, 0, terrainMultiplier)
    netAdvantage = Math.max(-1, Math.min(1, netAdvantage + openingBonus))
  }
  // Enemy's own Cavalry Vanguard (§12) — the mirror case: their charge
  // works against YOUR net advantage, same magnitude/terrain-scaling
  // logic as yours, just subtracted instead of added.
  if (enemyFormationId === 'cavalryVanguard' && ticksElapsed < OPENING_FORMATION_TICKS) {
    const enemyOpeningBonus = scaleTowardNeutral(enemyFormation.openingAdvantageBonus, 0, enemyTerrainMultiplier)
    netAdvantage = Math.max(-1, Math.min(1, netAdvantage - enemyOpeningBonus))
  }
  // Charge (§7) — a one-shot netAdvantage bump scaled by how much cavalry
  // you actually have, so a token cavalry force doesn't get the full
  // effect. Distinct from Cavalry Vanguard: this is a live order any
  // battle can use for one tick, not a pre-battle formation choice.
  if (order?.id === 'charge' && yourTroops.cavalry > 0) {
    const cavalryShare = yourTroops.cavalry / Math.max(1, yourArmy)
    netAdvantage = Math.max(-1, Math.min(1, netAdvantage + CHARGE_MAX_ADVANTAGE_BONUS * cavalryShare))
  }
  const yourCompositionModifier = 1 - netAdvantage * COMPOSITION_STRENGTH
  const enemyCompositionModifier = 1 + netAdvantage * COMPOSITION_STRENGTH

  // Skirmish Line's extended ranged exchange (§9) — a flat casualty-rate
  // cut for BOTH sides, terrain-scaled, opening ticks only, triggered by
  // EITHER side having it (an extended ranged phase is a property of the
  // engagement, not just of whoever chose it). If both sides somehow have
  // it simultaneously, yours takes precedence — a rare edge case, not
  // worth stacking two discounts for.
  let skirmishOpeningMultiplier = 1
  if (ticksElapsed < OPENING_FORMATION_TICKS) {
    if (formationId === 'skirmishLine') {
      skirmishOpeningMultiplier = scaleTowardNeutral(formation.openingCasualtyMultiplier, 1, terrainMultiplier)
    } else if (enemyFormationId === 'skirmishLine') {
      skirmishOpeningMultiplier = scaleTowardNeutral(enemyFormation.openingCasualtyMultiplier, 1, enemyTerrainMultiplier)
    }
  }

  // Snowfields' general hardship (§10) — applies regardless of formation.
  const snowfieldsMultiplier = terrain === 'snowfields' ? SNOWFIELDS_CASUALTY_MULTIPLIER : 1

  // Personality's casualty stance (§12) — "Dealt" is casualties the enemy
  // deals TO you (scales yourCasualtyRate), "Taken" is casualties the
  // enemy itself suffers (scales enemyCasualtyRate). Fixed for the whole
  // fight, same slot strategyMods already occupies.
  const yourCasualtyRate = Math.max(
    0,
    BASE_TICK_CASUALTY_RATE *
      (1 - yourShare) *
      2 *
      strategyMods.yourCasualtyMultiplier *
      disciplineModifier *
      yourCompositionModifier *
      skirmishOpeningMultiplier *
      snowfieldsMultiplier *
      enemyProfile.dealtMultiplier *
      jitter()
  )
  const enemyCasualtyRate = Math.max(
    0,
    BASE_TICK_CASUALTY_RATE *
      yourShare *
      2 *
      strategyMods.enemyCasualtyMultiplier *
      enemyCompositionModifier *
      skirmishOpeningMultiplier *
      snowfieldsMultiplier *
      enemyProfile.takenMultiplier *
      jitter()
  )

  const totalYourCasualties = Math.min(yourArmy, Math.round(yourArmy * yourCasualtyRate))
  const totalEnemyCasualties = Math.min(enemyArmy, Math.round(enemyArmy * enemyCasualtyRate))

  // Shield Wall (§9) reduces vulnerability for its lead type — now
  // applies to whichever side has it, since the enemy AI (§12) can also
  // pick a formation. Charge (§7) increases it for YOUR Cavalry
  // specifically as its one-shot cost; that and Shield Wall never target
  // the same type when Shield Wall is yours (its lead type is Infantry),
  // so a simple merge is safe — if that ever changed, the later entry
  // would just win, same as any object spread.
  const yourVulnerabilityReduction = {
    ...(formationId === 'shieldWall'
      ? { [formation.leadType]: Math.max(0, Math.min(0.8, scaleTowardNeutral(formation.vulnerabilityReduction, 0, terrainMultiplier))) }
      : {}),
    ...(order?.id === 'charge' && yourTroops.cavalry > 0 ? { cavalry: CHARGE_CAVALRY_VULNERABILITY_PENALTY } : {}),
  }
  const enemyVulnerabilityReduction =
    enemyFormationId === 'shieldWall'
      ? { [enemyFormation.leadType]: Math.max(0, Math.min(0.8, scaleTowardNeutral(enemyFormation.vulnerabilityReduction, 0, enemyTerrainMultiplier))) }
      : {}

  const yourCasualtiesByType = splitCasualtiesByType(yourTroops, enemyTroops, totalYourCasualties, yourVulnerabilityReduction)
  const enemyCasualtiesByType = splitCasualtiesByType(enemyTroops, yourTroops, totalEnemyCasualties, enemyVulnerabilityReduction)

  const nextYourTroops = {
    infantry: yourTroops.infantry - yourCasualtiesByType.infantry,
    archers: yourTroops.archers - yourCasualtiesByType.archers,
    cavalry: yourTroops.cavalry - yourCasualtiesByType.cavalry,
  }
  const nextEnemyTroops = {
    infantry: enemyTroops.infantry - enemyCasualtiesByType.infantry,
    archers: enemyTroops.archers - enemyCasualtiesByType.archers,
    cavalry: enemyTroops.cavalry - enemyCasualtiesByType.cavalry,
  }
  const nextYourArmy = troopTotal(nextYourTroops)
  const nextEnemyArmy = troopTotal(nextEnemyTroops)

  // Actual (post-per-type-clamping) totals — can differ very slightly
  // from totalYourCasualties/totalEnemyCasualties above in extreme
  // near-wipeout edge cases where a type ran out mid-split. Reporting the
  // real totals here rather than the pre-clamp intent keeps
  // yourArmy/army-sum bookkeeping always exactly consistent.
  const yourCasualties = yourArmy - nextYourArmy
  const enemyCasualties = enemyArmy - nextEnemyArmy

  let outcome = null
  if (nextEnemyArmy <= 0) {
    outcome = 'victory'
  } else if (nextYourArmy <= 0) {
    outcome = 'defeat'
  } else if (nextYourArmy >= nextEnemyArmy * SURRENDER_RATIO) {
    outcome = 'victory'
  }

  return {
    yourTroops: nextYourTroops,
    enemyTroops: nextEnemyTroops,
    yourArmy: nextYourArmy,
    enemyArmy: nextEnemyArmy,
    yourCasualties,
    enemyCasualties,
    outcome,
  }
}

// --- rout / morale-break (BATTLE_PLAN.md §8) ------------------------------

// Fraction of a side's STARTING army it can lose (cumulative, across the
// whole fight) before that side's morale breaks and the fight forces a
// decision — scaled by morale, same statToModifier shape as everywhere
// else, but a wider range than the general 'morale' power modifier since
// this is a much bigger swing (whether the fight ends at all, not just
// how hard you hit).
export const BASE_BREAK_PCT = 0.35
const BREAK_MORALE_RANGE = [0.7, 1.3]

/**
 * How many cumulative casualties a side (starting at `startingArmySize`,
 * with the given `morale`) can absorb before breaking. Cumulative
 * casualties are tracked by the CALLER across ticks — tickBattle itself
 * stays stateless and per-tick, same as everywhere else in this file.
 */
export function computeBreakThreshold(startingArmySize, morale) {
  const moraleModifier = statToModifier(morale, BREAK_MORALE_RANGE)
  return Math.max(1, Math.round(startingArmySize * BASE_BREAK_PCT * moraleModifier))
}

// --- Rally (BATTLE_PLAN.md §8) --------------------------------------------

/**
 * Chance Rally succeeds when your side breaks — reuses Commander's own
 * battle lever (extractCouncilBattleInputs' `strategy`, i.e. Commander's
 * roleRating) rather than inventing a new stat. 30%-70% range: even a
 * weak Commander has a real shot, even a strong one isn't a guaranteed
 * save.
 */
export function computeRallyChance(commanderRating) {
  const clamped = Math.max(0, Math.min(100, commanderRating))
  return 0.3 + (clamped / 100) * 0.4
}

/**
 * Runs a live battle start-to-finish without pausing between ticks — not
 * used by the actual UI (which drives one tick at a time on its own
 * timer so the player can react), but useful for tests and for verifying
 * aggregate behavior over many simulated fights.
 *
 * `respectBreakThresholds` is opt-in and defaults to false so every
 * existing caller/test is completely unaffected — when true, it applies
 * the simplest possible policy for a HEADLESS simulation (no Retreat, no
 * Rally, since those are genuine player decisions this function can't
 * make): the enemy breaking is an instant victory, you breaking is an
 * instant defeat, same as an immediate Surrender. The live UI (Battle.jsx)
 * implements the real Retreat/Rally/Surrender choice on top of the same
 * computeBreakThreshold function.
 */
export function runBattleToCompletion({
  yourTroops,
  enemyTroops,
  yourStats,
  enemyStats,
  strategyId,
  scouted,
  rng = Math.random,
  respectBreakThresholds = false,
  formationId = 'balanced',
  terrain = 'plains',
}) {
  let currentYourTroops = yourTroops
  let currentEnemyTroops = enemyTroops
  let ticks = 0
  let outcome = null
  let cumulativeYourCasualties = 0
  let cumulativeEnemyCasualties = 0

  const startingYourArmy = troopTotal(yourTroops)
  const startingEnemyArmy = troopTotal(enemyTroops)
  const yourBreakThreshold = respectBreakThresholds
    ? applyFormationToBreakThreshold(computeBreakThreshold(startingYourArmy, yourStats.morale), formationId, terrain)
    : Infinity
  const enemyBreakThreshold = respectBreakThresholds ? computeBreakThreshold(startingEnemyArmy, enemyStats.morale) : Infinity

  while (outcome === null && ticks < MAX_TICKS) {
    const result = tickBattle({
      yourTroops: currentYourTroops,
      enemyTroops: currentEnemyTroops,
      yourStats,
      enemyStats,
      strategyId: ticks === 0 ? strategyId : strategyId === 'ambush' ? 'balanced' : strategyId,
      scouted,
      rng,
      formationId,
      terrain,
      ticksElapsed: ticks,
    })
    currentYourTroops = result.yourTroops
    currentEnemyTroops = result.enemyTroops
    cumulativeYourCasualties += result.yourCasualties
    cumulativeEnemyCasualties += result.enemyCasualties
    outcome = result.outcome
    ticks += 1

    if (outcome === null && respectBreakThresholds) {
      if (cumulativeEnemyCasualties >= enemyBreakThreshold) {
        outcome = 'victory'
      } else if (cumulativeYourCasualties >= yourBreakThreshold) {
        outcome = 'defeat'
      }
    }
  }

  const currentYourArmy = troopTotal(currentYourTroops)
  const currentEnemyArmy = troopTotal(currentEnemyTroops)

  if (outcome === null) {
    // Hit the safety cap — resolve by whoever's ahead rather than hang.
    outcome = currentYourArmy >= currentEnemyArmy ? 'victory' : 'defeat'
  }

  return { yourTroops: currentYourTroops, enemyTroops: currentEnemyTroops, yourArmy: currentYourArmy, enemyArmy: currentEnemyArmy, outcome, ticks }
}

// --- surrender & final consequences (§10.6, §10.7) -----------------------

// §10.7 recovery rates by how the fight ended (BATTLE_PLAN.md §14) — not
// every casualty is permanently gone. A victory lets you recover most of
// your wounded; a retreat (you pulled back in an orderly way) recovers
// half; a defeat (routed, failed Rally, or surrendered) leaves most of
// them behind. This runs automatically, IN ADDITION TO the paid Recover
// action — Recover is a further boost on top of this, not a replacement.
const RECOVERY_RATES = { victory: 0.75, retreat: 0.5, defeat: 0.25 }
const KILLED_FRACTION = 0.4 // of gross casualties — the rest are wounded, see below

/**
 * The killed/wounded/recovery split (§14) for ONE count — reused both by
 * finalizeBattleResult (on the aggregate army total) and by
 * recoverTroopsAfterCasualties below (per troop type, for a Retreat's
 * carry-forward — BATTLE_PLAN.md §15). Returns the count that actually
 * survives to carry forward, not the casualties figure itself.
 */
function applyCasualtyRecovery(startingCount, currentCount, recoveryRate) {
  const gross = Math.max(0, startingCount - currentCount)
  const killed = Math.round(gross * KILLED_FRACTION)
  const wounded = gross - killed
  const recovered = Math.round(wounded * recoveryRate)
  const net = killed + (wounded - recovered)
  return Math.max(0, startingCount - net)
}

/**
 * Applies the SAME wounded/dead recovery split as finalizeBattleResult,
 * but per troop type — needed specifically for a Retreat (§15), where the
 * carried-forward army must keep its actual composition rather than
 * being re-split from a flat aggregate number (which would silently
 * reset the mix to something arbitrary).
 */
export function recoverTroopsAfterCasualties(startingTroops, currentTroops, outcome) {
  const recoveryRate = RECOVERY_RATES[outcome] ?? RECOVERY_RATES.defeat
  return {
    infantry: applyCasualtyRecovery(startingTroops.infantry, currentTroops.infantry, recoveryRate),
    archers: applyCasualtyRecovery(startingTroops.archers, currentTroops.archers, recoveryRate),
    cavalry: applyCasualtyRecovery(startingTroops.cavalry, currentTroops.cavalry, recoveryRate),
  }
}

/**
 * Turns a battle's final army counts into the result shape the UI/campaign
 * expect — used when a battle ends naturally (0 army, 5:1 surrender, or a
 * broken side accepting the outcome), when the player voluntarily
 * surrenders, and when the player accepts a Retreat (outcome: 'retreat' —
 * see BATTLE_PLAN.md §15; a retreat never reaches campaign.js at all, but
 * still needs this same wounded/dead math to compute what army count
 * carries forward into the resumed fight). Surrendering simply stops the
 * fight at its current numbers rather than dealing any additional
 * casualties — that's what makes it a real choice ("cut losses now")
 * rather than just a slower version of losing.
 */
export function finalizeBattleResult({ outcome, startingYourArmy, yourArmy, startingEnemyArmy, enemyArmy, enemyGold }) {
  const won = outcome === 'victory'
  const enemyCasualties = Math.max(0, startingEnemyArmy - enemyArmy)

  // Wounded/dead split — killed are gone for good; wounded mostly return,
  // at a rate that depends on how the fight ended. `yourCasualties` below
  // is the NET figure (what actually leaves the army count) — everything
  // downstream (campaign.js, the results screen) consumes this one field
  // and needed no changes to benefit from the recovery.
  const recoveryRate = RECOVERY_RATES[outcome] ?? RECOVERY_RATES.defeat
  const survivingYourArmy = applyCasualtyRecovery(startingYourArmy, yourArmy, recoveryRate)
  const yourCasualties = Math.max(0, startingYourArmy - survivingYourArmy)

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
 * Pulls the 3 battle-relevant levers straight from a completed draft
 * roster (§17 step 4's getFinalRoster shape) — the one seam between the
 * draft/council system and the battle system. Missing roles (shouldn't
 * happen post-draft, but defensively) contribute 0 rather than throwing.
 *
 * v3 (BATTLE_PLAN.md §1-2): only King, Commander, and Kingsguard affect
 * live battle math now — every other role's payoff moved to a pre-battle
 * action (Recruit/Diplomacy/Gather Intelligence/Recover/Duel, see §1).
 * Each of the 3 uses that character's own roleRating (fit %) for their
 * exact seat, NOT a single raw attribute — a single-attribute source was
 * tried and rejected (the "Tywin problem": a low-Strength, high-Strategy
 * Commander would be wrongly penalized if Strength happened to be the
 * chosen attribute). roleRating is already the correctly role-weighted
 * composite, so a strategy-heavy Commander scores well regardless of
 * their Strength, since roleWeights.commander barely weights it.
 *
 * "leadership" is no longer King+Commander averaged together — King
 * alone drives it now, since Commander has its own distinct lever
 * (strategy/executionSkill). Master of Whispers no longer contributes to
 * live battle at all (was previously a scouted-only power bonus) — see
 * computeYourPower, which no longer accepts an intelligence input.
 */
export function extractCouncilBattleInputs(roster) {
  const byRole = Object.fromEntries(roster.map(({ role, character }) => [role.id, character]))

  const ratingOrZero = (roleId) => {
    const character = byRole[roleId]
    return character ? roleRating(character.attributes, roleId, character.fightingStyle) : 0
  }

  const leadership = ratingOrZero('king')
  const strategy = ratingOrZero('commander')
  const discipline = ratingOrZero('kingsguard')

  return {
    leadership,
    strategy,
    discipline,
    executionSkill: strategy / 100,
  }
}

function average(values) {
  const valid = values.filter((v) => typeof v === 'number' && !Number.isNaN(v))
  if (valid.length === 0) return 0
  return valid.reduce((a, b) => a + b, 0) / valid.length
}

/**
 * Pulls the ratings the pre-battle actions need from a completed draft
 * roster (BATTLE_PLAN.md §1) — Recruit, Diplomacy, Gather Intelligence,
 * and the two Recover ratings. Same missing-role-contributes-0 posture as
 * extractCouncilBattleInputs.
 *
 * v3: Recruit and Gather Intelligence are now 50/50 averages with Hand
 * (previously pulled from a single role only — a real gap, since Hand
 * was designed to co-own both). Recover deliberately does NOT average
 * Grand Maester and Master of Laws together — each drives its OWN output
 * independently (Grand Maester's scholarship -> soldiersReturned, Master
 * of Laws's justice -> moraleGained) rather than one blended rating
 * scaling both, per §4.
 */
export function extractCouncilEconomyInputs(roster) {
  const byRole = Object.fromEntries(roster.map(({ role, character }) => [role.id, character]))

  const effectiveOrZero = (roleId, attr) => {
    const character = byRole[roleId]
    return character ? effectiveAttribute(character.attributes, roleId, attr) : 0
  }

  return {
    masterOfCoinRating: average([effectiveOrZero('masterOfCoin', 'economy'), effectiveOrZero('hand', 'economy')]),
    diplomacyRating: average([effectiveOrZero('king', 'diplomacy'), effectiveOrZero('consort', 'diplomacy')]),
    masterOfWhispersRating: average([effectiveOrZero('masterOfWhispers', 'subterfuge'), effectiveOrZero('hand', 'subterfuge')]),
    grandMaesterRating: effectiveOrZero('grandMaester', 'scholarship'),
    masterOfLawsRating: effectiveOrZero('masterOfLaws', 'justice'),
  }
}