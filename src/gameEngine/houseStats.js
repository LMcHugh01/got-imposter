/**
 * gameEngine/houseStats.js
 *
 * Implements §7 from GOT-DRAFT-CONTEXT.md. Aggregates the drafted council
 * into 6 house stats using EffectiveAttribute (§6.5) — a well-fit character
 * contributes more than a poorly-fit one holding the same title.
 *
 * The design doc specifies which ROLES feed each stat, not which specific
 * sub-attribute — that mapping is a judgment call made here, documented
 * inline. Easy to retune: it's a config object, not logic.
 *
 * v2: remapped for the new 10-role / 23-attribute system (Master of War
 * merged into Commander, Grand Maester and Champion added). Note that
 * Commander→battleMorale is deliberately used in both Military and
 * Morale — a Commander's ability to rally the army is relevant to both.
 *
 * v3: Champion's contribution now needs the character's fightingStyle
 * (see ratings.js/championStyles.js). Guarded defensively — if a drafted
 * Champion somehow lacks a style, they're excluded from the Military
 * average rather than throwing and breaking the whole stats screen,
 * matching this function's existing tolerance for missing contributors.
 */

import { effectiveAttribute } from './ratings'

const STAT_CONTRIBUTORS = {
  military: [
    { role: 'commander', attr: 'strategy' },
    { role: 'commander', attr: 'battleMorale' },
    { role: 'kingsguard', attr: 'strength' },
    { role: 'champion', attr: 'technique' },
  ],
  economy: [
    { role: 'masterOfCoin', attr: 'economy' },
    { role: 'hand', attr: 'economy' },
    { role: 'king', attr: 'economy' },
    { role: 'consort', attr: 'economy' },
  ],
  diplomacy: [
    { role: 'consort', attr: 'diplomacy' },
    { role: 'king', attr: 'diplomacy' },
    { role: 'masterOfWhispers', attr: 'diplomacy' },
  ],
  intelligence: [
    { role: 'masterOfWhispers', attr: 'subterfuge' },
    { role: 'masterOfWhispers', attr: 'scholarship' },
    { role: 'grandMaester', attr: 'scholarship' },
    { role: 'hand', attr: 'subterfuge' },
  ],
  stability: [
    { role: 'masterOfLaws', attr: 'justice' },
    { role: 'king', attr: 'duty' },
    { role: 'grandMaester', attr: 'justice' },
  ],
  morale: [
    { role: 'king', attr: 'command' },
    { role: 'commander', attr: 'battleMorale' },
  ],
}

export const STAT_LABELS = {
  military: 'Military',
  economy: 'Economy',
  diplomacy: 'Diplomacy',
  intelligence: 'Intelligence',
  stability: 'Stability',
  morale: 'Morale',
}

/**
 * `roster` is the array from draftEngine.getFinalRoster() — call this only
 * once the draft is complete (all 10 roles filled).
 */
export function computeHouseStats(roster) {
  const byRole = Object.fromEntries(roster.map(({ role, character }) => [role.id, character]))

  const stats = {}
  for (const [statId, contributors] of Object.entries(STAT_CONTRIBUTORS)) {
    const values = contributors
      .map(({ role, attr }) => {
        const character = byRole[role]
        if (!character) return null
        // Champion needs a fighting style to have a computable rating at
        // all — if this specific character somehow lacks one, skip their
        // contribution rather than letting effectiveAttribute() throw.
        if (role === 'champion' && !character.fightingStyle) return null
        return effectiveAttribute(character.attributes, role, attr, character.fightingStyle)
      })
      .filter((v) => v !== null)

    stats[statId] = values.length > 0 ? Math.round(values.reduce((a, b) => a + b, 0) / values.length) : 0
  }

  return stats
}

/**
 * §7 — "a weighted roll-up of the above... display it as potential, never
 * as a win prediction." Equal weights for now (simple average); becomes a
 * tuned weighted formula later without touching anything else.
 */
export function overallHouseRating(stats) {
  const values = Object.values(stats)
  return Math.round(values.reduce((a, b) => a + b, 0) / values.length)
}

const RATING_THRESHOLDS = [
  { min: 80, label: 'Excellent' },
  { min: 65, label: 'Strong' },
  { min: 50, label: 'Solid' },
  { min: 35, label: 'Weak' },
  { min: 0, label: 'Poor' },
]

export function ratingLabel(value) {
  return RATING_THRESHOLDS.find((t) => value >= t.min).label
}

/**
 * §7.2 — plain-language strengths/weaknesses. Strength: stat >= 65.
 * Weakness: stat < 40. First-pass thresholds — tune during playtesting.
 */
export function houseStrengthsWeaknesses(stats) {
  const strengths = []
  const weaknesses = []

  for (const [statId, value] of Object.entries(stats)) {
    const label = STAT_LABELS[statId].toLowerCase()
    if (value >= 65) strengths.push(`${ratingLabel(value)} ${label}`)
    else if (value < 40) weaknesses.push(`Low ${label}`)
  }

  return { strengths, weaknesses }
}