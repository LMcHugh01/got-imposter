/**
 * gameEngine/draftEngine.js
 *
 * Implements §5 from GOT-DRAFT-CONTEXT.md. Pure functions operating on a
 * plain draft-state object — no React, no Supabase calls. The state is
 * never mutated in place; every function that changes state returns a new
 * state object, so it's safe to use directly as React state later.
 *
 * A "character" here is expected to look like:
 *   { id, name, house, attributes: {26 stats}, fightingStyle,
 *     leadershipStyle, commandStyle, coinStyle }
 * i.e. the joined shape of a characters + character_attributes row. Where
 * that join happens (characterAttributesService.js) is outside this file's
 * concern — this engine only cares about the shape above. Each style
 * field is only meaningful for its own role(s) (see gameEngine/ratings.js
 * ROLE_STYLE_KEY) — a role that doesn't need a style ignores all of them.
 */

import { ROLES } from '../data/roleWeights'
import { roleRating, isRoleRatable } from './ratings'

const OFFER_SIZE = 5

function shuffle(array, rng) {
  const result = [...array]
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return result
}

/**
 * Sets up a fresh draft. `pool` is every eligible character (already
 * filtered upstream to only those with a character_attributes row).
 * Throws if the pool can't possibly fill all 10 roles — a data problem,
 * not a normal game state (§5.2).
 */
export function createDraftState(pool) {
  if (!pool || pool.length < ROLES.length) {
    throw new Error(
      `Draft pool too small: need at least ${ROLES.length} eligible characters, got ${pool?.length ?? 0}.`
    )
  }

  return {
    pool,
    draftedCharacterIds: new Set(),
    roleAssignments: Object.fromEntries(ROLES.map((r) => [r.id, null])),
    round: 1,
  }
}

export function getOpenRoles(state) {
  return ROLES.filter((r) => state.roleAssignments[r.id] === null)
}

export function getUndraftedCharacters(state) {
  return state.pool.filter((c) => !state.draftedCharacterIds.has(c.id))
}

export function isDraftComplete(state) {
  return Object.values(state.roleAssignments).every((c) => c !== null)
}

/**
 * Step A (§5.2) — 5 random undrafted characters (fewer only if the pool
 * itself is nearly exhausted, 1 minimum). Given createDraftState's size
 * guard, this can never legitimately return an empty offer: with a pool of
 * >= 10 and at most 9 characters drafted before the 10th and final round,
 * at least 1 always remains.
 */
export function offerCharacters(state, rng = Math.random) {
  const undrafted = getUndraftedCharacters(state)

  if (undrafted.length === 0) {
    throw new Error(
      'No undrafted characters left to offer — this indicates the attributes-populated pool is too small, not a normal game state.'
    )
  }

  const offerSize = Math.min(OFFER_SIZE, undrafted.length)
  return shuffle(undrafted, rng).slice(0, offerSize)
}

/**
 * Step B (§5.2) — once a character is picked, their fit % against every
 * still-open role, sorted best-first to help the player choose. If an
 * open role needs a style the character hasn't been tagged for yet
 * (Champion needing fightingStyle, King/Hand/Consort needing
 * leadershipStyle, Commander needing commandStyle, Master of Coin
 * needing coinStyle), its fit shows as null rather than crashing the
 * pick screen — isRoleRatable() is the single source of truth for which
 * roles need what (see gameEngine/ratings.js).
 */
export function getRoleOptionsForCharacter(state, character) {
  return getOpenRoles(state)
    .map((role) => {
      if (!isRoleRatable(role.id, character)) {
        return { roleId: role.id, label: role.label, fit: null }
      }
      return {
        roleId: role.id,
        label: role.label,
        fit: roleRating(character.attributes, role.id, character),
      }
    })
    .sort((a, b) => (b.fit ?? -1) - (a.fit ?? -1))
}

/**
 * Locks a character into a role, advances the round. Returns a new state;
 * does not mutate the one passed in. Deliberately strict here (unlike the
 * Step B preview above) — actually assigning an untagged character to a
 * style-driven role throws, since that's a real data gap that should
 * surface immediately rather than lock in a wrong/missing rating. (This
 * falls straight out of roleRating() itself being strict — no extra guard
 * needed here.)
 */
export function assignRole(state, character, roleId) {
  if (state.draftedCharacterIds.has(character.id)) {
    throw new Error(`${character.name} has already been drafted.`)
  }
  if (!(roleId in state.roleAssignments)) {
    throw new Error(`Unknown role: "${roleId}"`)
  }
  if (state.roleAssignments[roleId] !== null) {
    throw new Error(`Role "${roleId}" is already filled.`)
  }

  const fit = roleRating(character.attributes, roleId, character)

  return {
    ...state,
    draftedCharacterIds: new Set([...state.draftedCharacterIds, character.id]),
    roleAssignments: {
      ...state.roleAssignments,
      [roleId]: { ...character, fit },
    },
    round: state.round + 1,
  }
}

/**
 * Convenience for the final council screen (§7) — the 10 roles in a fixed
 * display order, each paired with whoever ended up filling it.
 */
export function getFinalRoster(state) {
  return ROLES.map((role) => ({
    role,
    character: state.roleAssignments[role.id],
  }))
}