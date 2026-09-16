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
 * The `accuracy` input itself should already be the correctly-blended
 * Master of Whispers + Hand rating (see battleEngine.js's
 * extractCouncilEconomyInputs) — this function doesn't know or care
 * whose rating it is, it just narrows based on the number it's given.
 */

import { clampStat } from './resources'

const MAX_WIDTH_FRACTION = 1.4 // worst-case range spans up to 140% of the true army size
const MIN_WIDTH_FRACTION = 0.12 // best-case range never narrows past 12%

// Same shape as the army-size range above, just sized for a 0-100 stat
// instead of an army count.
const MORALE_MAX_WIDTH = 70
const MORALE_MIN_WIDTH = 8

export const PERSONALITIES = ['aggressive', 'defensive', 'economic', 'deceptive', 'diplomatic', 'unpredictable']

// accuracy 0 -> all 6 shown (genuinely zero information); accuracy 1 ->
// shortlist of 1 (exact reveal).
const MAX_DECOYS = PERSONALITIES.length - 1
const MIN_DECOYS = 0

function shuffle(array, rng) {
  const result = [...array]
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return result
}

// Splits a total width randomly below/above the true value, same
// non-centered trick used for both army size and morale — the player
// can't just average the two reported ends to find the real number.
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

export function gatherIntelligence({ masterOfWhispersRating, enemyHouse, rng = Math.random }) {
  const accuracy = Math.max(0, Math.min(100, masterOfWhispersRating)) / 100

  const armyWidthFraction = MAX_WIDTH_FRACTION - accuracy * (MAX_WIDTH_FRACTION - MIN_WIDTH_FRACTION)
  const armyRange = splitRange(enemyHouse.armySize, enemyHouse.armySize * armyWidthFraction, rng, clampArmySize)

  const moraleWidth = MORALE_MAX_WIDTH - accuracy * (MORALE_MAX_WIDTH - MORALE_MIN_WIDTH)
  const moraleRange = splitRange(enemyHouse.morale, moraleWidth, rng, clampStat)

  const numDecoys = Math.round(MAX_DECOYS - accuracy * (MAX_DECOYS - MIN_DECOYS))
  const others = shuffle(PERSONALITIES.filter((p) => p !== enemyHouse.personality), rng)
  const personalityShortlist = shuffle([enemyHouse.personality, ...others.slice(0, numDecoys)], rng)

  return {
    armyRangeLow: armyRange.low,
    armyRangeHigh: armyRange.high,
    moraleRangeLow: moraleRange.low,
    moraleRangeHigh: moraleRange.high,
    personalityShortlist,
  }
}