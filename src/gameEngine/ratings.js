/**
 * gameEngine/ratings.js
 *
 * Implements §6.2 (role rating = fit %) and §6.5 (EffectiveAttribute) from
 * GOT-DRAFT-CONTEXT.md. Pure functions only — no React, no Supabase calls.
 * Takes a plain attributes object (the 23 base stats) and works from
 * there, so it's testable with fixed fixtures and reusable anywhere in
 * the engine.
 *
 * v2: Champion is special-cased throughout. Every other role's weights
 * live in ROLE_WEIGHTS; Champion's depend on the character's fighting
 * style (see data/championStyles.js), so every function that can touch
 * Champion now takes an optional trailing `fightingStyle` argument.
 * roleRating() itself is strict — it throws if asked for Champion with no
 * style, the same way it throws for an unknown role id, because that's a
 * genuine "can't compute this" situation, not something to silently
 * paper over. allRoleRatings()/bestFitRoles() are more forgiving (return
 * null / skip Champion) since they're the layer the Characters browse
 * page uses, where characters mid-data-entry may not have a style yet —
 * one untagged character shouldn't crash the whole page.
 */

import { ROLE_WEIGHTS, ROLES } from '../data/roleWeights'
import { CHAMPION_STYLE_WEIGHTS } from '../data/championStyles'

// Ratings clamp to this range — never a flat 0 (nobody's a total
// write-off) and never a perfect 100 (nobody's flawless). This matters
// beyond cosmetics: effectiveAttribute() divides by 100 and uses the
// result as a direct multiplier, so an unclamped negative-weight role
// could otherwise push a rating below 0 or above 100 and invert what
// EffectiveAttribute is supposed to do (scale a contribution down, never
// flip its sign or amplify it past the raw value).
const MIN_RATING = 1
const MAX_RATING = 99

function clampRating(value) {
  return Math.min(MAX_RATING, Math.max(MIN_RATING, value))
}

function weightsFor(roleId, fightingStyle) {
  if (roleId === 'champion') {
    if (!fightingStyle) return null
    return CHAMPION_STYLE_WEIGHTS[fightingStyle] ?? null
  }
  return ROLE_WEIGHTS[roleId] ?? null
}

/**
 * A character's rating for a single role — also their "fit %" for that
 * role (§6.2: same number, two uses). Clamped to 1-99 (see above).
 *
 * For every role except Champion, `fightingStyle` is ignored. For
 * Champion, it's required — throws if missing, same as an unknown role.
 *
 * Negative weights are supported (e.g. Grand Maester penalizing Family) —
 * roleRating() itself doesn't care about sign, it's just a weighted sum.
 * The clamp is what keeps a heavily-penalized character's score from
 * going negative rather than reading as "very poor fit."
 */
export function roleRating(attributes, roleId, fightingStyle) {
  const weights = weightsFor(roleId, fightingStyle)

  if (!weights) {
    if (roleId === 'champion' && !fightingStyle) {
      throw new Error('roleRating("champion", ...) requires a fightingStyle argument')
    }
    throw new Error(`Unknown role: "${roleId}"`)
  }

  const rating = Object.entries(weights).reduce(
    (sum, [attr, weight]) => sum + attributes[attr] * weight,
    0
  )

  return clampRating(Math.round(rating))
}

/**
 * Rating for every one of the 10 roles at once, keyed by role id. Used by
 * the draft UI and Characters page to show a character's full fit
 * profile. Champion's entry is `null` (not computed, not thrown) if no
 * `fightingStyle` is passed — a graceful "not yet knowable," since this
 * function is used in contexts (the browse page) where that's expected
 * to happen for characters not yet tagged.
 */
export function allRoleRatings(attributes, fightingStyle) {
  return ROLES.reduce((ratings, { id }) => {
    if (id === 'champion' && !fightingStyle) {
      ratings[id] = null
    } else {
      ratings[id] = roleRating(attributes, id, fightingStyle)
    }
    return ratings
  }, {})
}

/**
 * Given a character and a set of role ids to consider (e.g. only the
 * still-open roles), return the top N by rating. Powers the "best fit:
 * Hand 96%, Master of Coin 91%" line shown during character selection
 * (§5.2, Step A). If `champion` is in roleIds but no fightingStyle is
 * given, Champion is silently excluded from consideration rather than
 * throwing — same "not yet knowable" posture as allRoleRatings.
 */
export function bestFitRoles(attributes, roleIds, count = 2, fightingStyle) {
  return roleIds
    .filter((roleId) => roleId !== 'champion' || Boolean(fightingStyle))
    .map((roleId) => ({ roleId, rating: roleRating(attributes, roleId, fightingStyle) }))
    .sort((a, b) => b.rating - a.rating)
    .slice(0, count)
}

/**
 * §6.5 — once a character is actually assigned to a role, their functional
 * contribution to house stats (§7) and battle math (§10) uses attributes
 * scaled by their fit % for that specific role, not raw attributes.
 */
export function effectiveAttribute(attributes, roleId, attr, fightingStyle) {
  const fit = roleRating(attributes, roleId, fightingStyle) / 100
  return attributes[attr] * fit
}

/**
 * All attributes scaled by fit % for a given role at once — convenient
 * when computing a character's full contribution to house stats.
 */
export function effectiveAttributes(attributes, roleId, fightingStyle) {
  const fit = roleRating(attributes, roleId, fightingStyle) / 100
  return Object.fromEntries(
    Object.keys(attributes).map((attr) => [attr, attributes[attr] * fit])
  )
}