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
 * the answer key). Width scales with Master of Whispers's rating (§8.6):
 * weak Whispers gives a very wide, barely-useful range; strong Whispers
 * gives a tight one, but never a point value.
 */

const MAX_WIDTH_FRACTION = 1.4 // worst-case range spans up to 140% of the true army size
const MIN_WIDTH_FRACTION = 0.12 // best-case range never narrows past 12%

export function gatherIntelligence({ masterOfWhispersRating, enemyHouse, rng = Math.random }) {
  const accuracy = Math.max(0, Math.min(100, masterOfWhispersRating)) / 100
  const widthFraction = MAX_WIDTH_FRACTION - accuracy * (MAX_WIDTH_FRACTION - MIN_WIDTH_FRACTION)
  const totalWidth = enemyHouse.armySize * widthFraction

  // Randomly split the width below/above the true value so it never sits
  // dead center — the player can't just average the two ends to find it.
  const belowWidth = rng() * totalWidth
  const aboveWidth = totalWidth - belowWidth

  return {
    armyRangeLow: Math.max(0, Math.round(enemyHouse.armySize - belowWidth)),
    armyRangeHigh: Math.round(enemyHouse.armySize + aboveWidth),
    moraleRevealed: accuracy >= 0.4,
    morale: accuracy >= 0.4 ? enemyHouse.morale : null,
    personalityRevealed: accuracy >= 0.3,
    personality: accuracy >= 0.3 ? enemyHouse.personality : null,
  }
}