/**
 * gameEngine/intelligence.js
 *
 * Implements §9.3 and §8.6 from GOT-DRAFT-CONTEXT.md. Pure function — no
 * React, no Supabase.
 *
 * The reported army range is NEVER centered on the true value and NEVER
 * collapses to a single number, even at maximum accuracy — both are
 * deliberate. A centered range would let the player back out the true
 * value by averaging the two ends; a zero-width range at high accuracy
 * would amount to just showing the real number, which this game never
 * does (§1 pillar 1 — the player builds potential, they don't get to see
 * the answer key). Width scales with the accuracy rating (§8.6): weak
 * accuracy gives a very wide, barely-useful range; strong accuracy gives
 * a tight one, but never a point value.
 *
 * v2 (BATTLE_PLAN.md §13): morale and personality now follow that exact
 * same philosophy instead of being binary reveal/hide gates. Morale gets
 * a narrowing range (same non-centered-split shape as army size, just on
 * a 0-100 scale). Personality gets a narrowing SHORTLIST rather than a
 * yes/no reveal — at low accuracy you see most or all of the 6 possible
 * personalities (genuinely no signal), at high accuracy the shortlist
 * collapses toward just the true one. The old binary
 * moraleRevealed/personalityRevealed fields are gone — this was the odd
 * one out against the rest of this module's design, not the norm.
 *
 * v3 (dashboard pass): the same two shapes (narrowing range / narrowing
 * shortlist) extended to the rest of what the Enemy House Overview needs
 * to show, rather than inventing a third shape:
 *   - army SIZE range is joined by a range per troop type
 *     (infantry/archers/cavalry), same width-fraction math, computed
 *     independently per type so the three don't silently sum back to a
 *     tighter total than the aggregate range implies.
 *   - armyQuality and supply get the exact same narrowing-range treatment
 *     morale already had — all three are 0-100 stats on the same house,
 *     no reason for morale to be the only one modeled this way.
 *   - terrain gets the exact same narrowing SHORTLIST treatment
 *     personality already had — enemy_houses.terrain is one fixed value
 *     per house, same shape as personality, so it reuses the identical
 *     shuffle-and-slice logic, just over TERRAIN_TYPES instead of
 *     PERSONALITIES.
 *
 * The `accuracy` input itself should already be the correctly-blended
 * Master of Whispers + Hand rating (see battleEngine.js's
 * extractCouncilEconomyInputs) — this function doesn't know or care
 * whose rating it is, it just narrows based on the number it's given.
 */

import { clampStat } from './resources'
import { TERRAIN_TYPES } from './battleEngine'

const MAX_WIDTH_FRACTION = 1.4 // worst-case range spans up to 140% of the true army size
const MIN_WIDTH_FRACTION = 0.12 // best-case range never narrows past 12%

// Shared by every 0-100 stat this module narrows (morale, armyQuality,
// supply) — one range definition rather than a copy per stat.
const STAT_MAX_WIDTH = 70
const STAT_MIN_WIDTH = 8

export const PERSONALITIES = ['aggressive', 'defensive', 'economic', 'deceptive', 'diplomatic', 'unpredictable']

// accuracy 0 -> all 6 shown (genuinely zero information); accuracy 1 ->
// shortlist of 1 (exact reveal).
const MAX_DECOYS = PERSONALITIES.length - 1
const MIN_DECOYS = 0

// Same shape as the personality shortlist above, just over the 5 terrain
// types instead of the 6 personalities.
const MAX_TERRAIN_DECOYS = TERRAIN_TYPES.length - 1
const MIN_TERRAIN_DECOYS = 0

function shuffle(array, rng) {
  const result = [...array]
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return result
}

// Splits a total width randomly below/above the true value, same
// non-centered trick used for army size, morale, armyQuality, and supply
// alike — the player can't just average the two reported ends to find
// the real number.
function splitRange(trueValue, totalWidth, rng, clamp) {
  const belowWidth = rng() * totalWidth
  const aboveWidth = totalWidth - belowWidth
  return {
    low: clamp(trueValue - belowWidth),
    high: clamp(trueValue + aboveWidth),
  }
}

function clampArmySize(value) {
  return Math.max(0, Math.round(value))
}

// Builds a narrowing shortlist over `pool`, guaranteed to contain
// `trueValue` — shared logic behind both the personality and terrain
// shortlists below (previously duplicated inline for personality only).
function buildShortlist(trueValue, pool, maxDecoys, accuracy, rng) {
  const numDecoys = Math.round(maxDecoys - accuracy * maxDecoys)
  const others = shuffle(pool.filter((p) => p !== trueValue), rng)
  return shuffle([trueValue, ...others.slice(0, numDecoys)], rng)
}

export function gatherIntelligence({ masterOfWhispersRating, enemyHouse, rng = Math.random }) {
  const accuracy = Math.max(0, Math.min(100, masterOfWhispersRating)) / 100

  const armyWidthFraction = MAX_WIDTH_FRACTION - accuracy * (MAX_WIDTH_FRACTION - MIN_WIDTH_FRACTION)
  const armyRange = splitRange(enemyHouse.armySize, enemyHouse.armySize * armyWidthFraction, rng, clampArmySize)

  // Per-troop-type ranges — independent draws, same width fraction as the
  // aggregate. Falls back to a zero range for a fixture/house missing
  // `.troops` entirely (defensive only; enemyHouseService.js always
  // populates this, with its own fallback split, for real data).
  const troops = enemyHouse.troops ?? { infantry: 0, archers: 0, cavalry: 0 }
  const infantryRange = splitRange(troops.infantry, troops.infantry * armyWidthFraction, rng, clampArmySize)
  const archersRange = splitRange(troops.archers, troops.archers * armyWidthFraction, rng, clampArmySize)
  const cavalryRange = splitRange(troops.cavalry, troops.cavalry * armyWidthFraction, rng, clampArmySize)

  const statWidth = STAT_MAX_WIDTH - accuracy * (STAT_MAX_WIDTH - STAT_MIN_WIDTH)
  const moraleRange = splitRange(enemyHouse.morale, statWidth, rng, clampStat)
  // armyQuality/supply may be absent on an older fixture — same
  // defensive fallback as troops above; real houses always have both.
  const armyQualityRange = splitRange(enemyHouse.armyQuality ?? 50, statWidth, rng, clampStat)
  const supplyRange = splitRange(enemyHouse.supply ?? 50, statWidth, rng, clampStat)

  const personalityShortlist = buildShortlist(enemyHouse.personality, PERSONALITIES, MAX_DECOYS, accuracy, rng)
  const terrainShortlist = buildShortlist(enemyHouse.terrain ?? 'plains', TERRAIN_TYPES, MAX_TERRAIN_DECOYS, accuracy, rng)

  return {
    armyRangeLow: armyRange.low,
    armyRangeHigh: armyRange.high,
    infantryRangeLow: infantryRange.low,
    infantryRangeHigh: infantryRange.high,
    archersRangeLow: archersRange.low,
    archersRangeHigh: archersRange.high,
    cavalryRangeLow: cavalryRange.low,
    cavalryRangeHigh: cavalryRange.high,
    moraleRangeLow: moraleRange.low,
    moraleRangeHigh: moraleRange.high,
    armyQualityRangeLow: armyQualityRange.low,
    armyQualityRangeHigh: armyQualityRange.high,
    supplyRangeLow: supplyRange.low,
    supplyRangeHigh: supplyRange.high,
    personalityShortlist,
    terrainShortlist,
  }
}