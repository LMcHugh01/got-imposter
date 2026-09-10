/**
 * gameEngine/ratings.js
 *
 * Implements §6.2 (role rating = fit %) and §6.5 (EffectiveAttribute) from
 * GOT-DRAFT-CONTEXT.md. Pure functions only — no React, no Supabase calls.
 * Takes a plain attributes object (the 8 base stats) and works from there,
 * so it's testable with fixed fixtures and reusable anywhere in the engine.
 */

import { ROLE_WEIGHTS, ROLES } from '../data/roleWeights'

/**
 * A character's rating for a single role — also their "fit %" for that
 * role (§6.2: same number, two uses). 0-100, rounded to the nearest whole
 * number for display.
 */
export function roleRating(attributes, roleId) {
  const weights = ROLE_WEIGHTS[roleId]
  if (!weights) {
    throw new Error(`Unknown role: "${roleId}"`)
  }

  const rating = Object.entries(weights).reduce(
    (sum, [attr, weight]) => sum + attributes[attr] * weight,
    0
  )

  return Math.round(rating)
}

/**
 * Rating for every one of the 10 roles at once, keyed by role id.
 * Used by the draft UI to show a character's full fit profile.
 */
export function allRoleRatings(attributes) {
  return ROLES.reduce((ratings, { id }) => {
    ratings[id] = roleRating(attributes, id)
    return ratings
  }, {})
}

/**
 * Given a character and a set of role ids to consider (e.g. only the
 * still-open roles), return the top N by rating. Powers the "best fit:
 * Hand 96%, Master of Coin 91%" line shown during character selection
 * (§5.2, Step A).
 */
export function bestFitRoles(attributes, roleIds, count = 2) {
  return roleIds
    .map((roleId) => ({ roleId, rating: roleRating(attributes, roleId) }))
    .sort((a, b) => b.rating - a.rating)
    .slice(0, count)
}

/**
 * §6.5 — once a character is actually assigned to a role, their functional
 * contribution to house stats (§7) and battle math (§10) uses attributes
 * scaled by their fit % for that specific role, not raw attributes.
 */
export function effectiveAttribute(attributes, roleId, attr) {
  const fit = roleRating(attributes, roleId) / 100
  return attributes[attr] * fit
}

/**
 * All 8 attributes scaled by fit % for a given role at once — convenient
 * when computing a character's full contribution to house stats.
 */
export function effectiveAttributes(attributes, roleId) {
  const fit = roleRating(attributes, roleId) / 100
  return Object.fromEntries(
    Object.keys(attributes).map((attr) => [attr, attributes[attr] * fit])
  )
}