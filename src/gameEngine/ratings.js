/**
 * gameEngine/ratings.js
 *
 * Implements §6.2 (role rating = fit %) and §6.5 (EffectiveAttribute) from
 * GOT-DRAFT-CONTEXT.md. Pure functions only — no React, no Supabase calls.
 * Takes a plain attributes object (the 26 base stats) and works from
 * there, so it's testable with fixed fixtures and reusable anywhere in
 * the engine.
 *
 * v2: Champion is special-cased — its weights depend on the character's
 * fighting style (see data/championStyles.js) rather than a flat
 * ROLE_WEIGHTS entry.
 *
 * v3: King, Hand, Consort, Commander, and Master of Coin get the same
 * treatment — see data/leadershipStyles.js, data/commandStyles.js,
 * data/coinStyles.js. ROLE_STYLE_KEY below is the single map of "which
 * role needs which style field" that every style-aware function in this
 * file (and any caller) reads from, so there's one place that knows the
 * full list of 6 style-driven roles rather than six scattered
 * `if (roleId === 'champion')`-style checks.
 *
 * Every function that used to take a trailing `fightingStyle` string now
 * takes a trailing `styles` object instead — in practice, callers just
 * pass the character object itself, since a character already carries
 * `fightingStyle`/`leadershipStyle`/`commandStyle`/`coinStyle` as
 * top-level fields (see characterAttributesService.js). Only the field
 * relevant to the role being rated is read; the rest are ignored, so
 * it's always safe to pass the whole character even when rating, say,
 * `kingsguard` (which needs no style at all).
 */

import { ROLE_WEIGHTS, ROLES } from '../data/roleWeights'
import { CHAMPION_STYLE_WEIGHTS } from '../data/championStyles'
import { LEADERSHIP_STYLE_WEIGHTS } from '../data/leadershipStyles'
import { COMMAND_STYLE_WEIGHTS } from '../data/commandStyles'
import { COIN_STYLE_WEIGHTS } from '../data/coinStyles'

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

// The 6 roles whose weight table depends on a fixed character category
// rather than one flat ROLE_WEIGHTS entry, and which field of a `styles`
// object each one reads. Exported so callers (draftEngine, houseStats,
// UI components) can ask "does this role even need a style, and does
// this character have it?" without duplicating this list themselves.
export const ROLE_STYLE_KEY = {
  champion: 'fightingStyle',
  king: 'leadershipStyle',
  hand: 'leadershipStyle',
  consort: 'leadershipStyle',
  commander: 'commandStyle',
  masterOfCoin: 'coinStyle',
}

// Human-readable reason text for UI "excluded — ..." messaging, keyed by
// the same style field names as ROLE_STYLE_KEY.
export const STYLE_MISSING_REASON = {
  fightingStyle: 'No fighting style set',
  leadershipStyle: 'No leadership style set',
  commandStyle: 'No command style set',
  coinStyle: 'No coin style set',
}

/**
 * Whether `roleId` can currently be rated for a character carrying
 * `styles` — true for every non-style-driven role, and for a
 * style-driven role only once the relevant style field is set. Use this
 * before calling roleRating() anywhere you want a graceful "not yet
 * knowable" instead of a thrown error (draft previews, dashboard cards,
 * house stat contributors).
 */
export function isRoleRatable(roleId, styles = {}) {
  const styleKey = ROLE_STYLE_KEY[roleId]
  return !styleKey || Boolean(styles[styleKey])
}

/**
 * The weight table for a given role. For the 6 style-driven roles, looks
 * up the relevant style off `styles` (see ROLE_STYLE_KEY) and returns
 * null if that style isn't set, or isn't a recognized value. Every other
 * role reads straight from ROLE_WEIGHTS.
 *
 * Exported — DraftLedger.jsx and Characters.jsx both display "which
 * attributes fed this rating and by how much," and previously each kept
 * its own hand-rolled copy of this lookup (which had already drifted:
 * one handled only Champion, the other only flat roles). One shared
 * implementation now.
 */
export function weightsFor(roleId, styles = {}) {
  const styleKey = ROLE_STYLE_KEY[roleId]

  if (styleKey) {
    const styleValue = styles[styleKey]
    if (!styleValue) return null
    if (roleId === 'champion') return CHAMPION_STYLE_WEIGHTS[styleValue] ?? null
    if (roleId === 'commander') return COMMAND_STYLE_WEIGHTS[styleValue] ?? null
    if (roleId === 'masterOfCoin') return COIN_STYLE_WEIGHTS[styleValue] ?? null
    // king / hand / consort share the same 4 leadership styles, but each
    // role has its OWN weight table per style — see data/leadershipStyles.js.
    return LEADERSHIP_STYLE_WEIGHTS[roleId]?.[styleValue] ?? null
  }

  return ROLE_WEIGHTS[roleId] ?? null
}

/**
 * A character's rating for a single role — also their "fit %" for that
 * role (§6.2: same number, two uses). Clamped to 1-99 (see above).
 *
 * Strict by design — throws if a style-driven role's required style is
 * missing, or if the role id isn't recognized at all, the same way it
 * always has for Champion. That's a genuine "can't compute this"
 * situation, not something to silently paper over. Callers that need a
 * softer "not yet knowable" (draft previews, browse pages, dashboard
 * cards) should check isRoleRatable() first — see allRoleRatings/
 * bestFitRoles below for the built-in examples.
 */
export function roleRating(attributes, roleId, styles = {}) {
  const weights = weightsFor(roleId, styles)

  if (!weights) {
    const styleKey = ROLE_STYLE_KEY[roleId]
    if (styleKey) {
      throw new Error(`roleRating("${roleId}", ...) requires a ${styleKey} argument`)
    }
    throw new Error(`Unknown role: "${roleId}"`)
  }

  // A null attribute (e.g. beauty_appeal deliberately left unset for a
  // character written as a child — see data/attributes.js) is SKIPPED
  // here, not treated as 0. Without this guard, `null * weight` would
  // silently coerce to 0 in JS and score that character as if they
  // scored the worst possible on that attribute — the opposite of
  // "not evaluated." This matches the "ignore, don't zero" behavior the
  // UI's own category-average helper already uses.
  const rating = Object.entries(weights).reduce((sum, [attr, weight]) => {
    const value = attributes[attr]
    if (value == null) return sum
    return sum + value * weight
  }, 0)

  return clampRating(Math.round(rating))
}

/**
 * Rating for every one of the 10 roles at once, keyed by role id. Used by
 * the draft UI and Characters page to show a character's full fit
 * profile. Any style-driven role the character hasn't been tagged for
 * yet comes back `null` (not computed, not thrown) — a graceful "not yet
 * knowable," since this function is used in contexts (the browse page)
 * where that's expected for characters not yet fully tagged.
 */
export function allRoleRatings(attributes, styles = {}) {
  return ROLES.reduce((ratings, { id }) => {
    ratings[id] = isRoleRatable(id, styles) ? roleRating(attributes, id, styles) : null
    return ratings
  }, {})
}

/**
 * Given a character and a set of role ids to consider (e.g. only the
 * still-open roles), return the top N by rating. Powers the "best fit:
 * Hand 96%, Master of Coin 91%" line shown during character selection
 * (§5.2, Step A). Any style-driven role in roleIds whose required style
 * isn't set on `styles` is silently excluded from consideration rather
 * than throwing — same "not yet knowable" posture as allRoleRatings.
 */
export function bestFitRoles(attributes, roleIds, count = 2, styles = {}) {
  return roleIds
    .filter((roleId) => isRoleRatable(roleId, styles))
    .map((roleId) => ({ roleId, rating: roleRating(attributes, roleId, styles) }))
    .sort((a, b) => b.rating - a.rating)
    .slice(0, count)
}

/**
 * §6.5 — once a character is actually assigned to a role, their functional
 * contribution to house stats (§7) and battle math (§10) uses attributes
 * scaled by their fit % for that specific role, not raw attributes.
 */
export function effectiveAttribute(attributes, roleId, attr, styles = {}) {
  const fit = roleRating(attributes, roleId, styles) / 100
  return attributes[attr] * fit
}

/**
 * All attributes scaled by fit % for a given role at once — convenient
 * when computing a character's full contribution to house stats.
 */
export function effectiveAttributes(attributes, roleId, styles = {}) {
  const fit = roleRating(attributes, roleId, styles) / 100
  return Object.fromEntries(
    Object.keys(attributes).map((attr) => [attr, attributes[attr] * fit])
  )
}