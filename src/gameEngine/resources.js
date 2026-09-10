/**
 * gameEngine/resources.js
 *
 * Implements §8 from GOT-DRAFT-CONTEXT.md — the resource state shape and
 * starting values for a campaign. This module only defines the shape and
 * a safe way to change it; the actual logic that produces deltas (battle
 * outcomes, Recruit, Diplomacy, Recover) lives in their own modules built
 * in later steps (battleEngine.js, economy.js, diplomacy.js), and all of
 * them should go through applyResourceDeltas rather than mutating fields
 * directly — that's the one place clamping/rounding rules live.
 */

export function createInitialResources() {
  return {
    army: 10000,
    armyQuality: 70, // no starting value specified in §8 — see build-step notes
    gold: 25000,
    morale: 75,
    stability: 75,
    supply: 80,
    alliances: [], // { houseName, contribution }, appended by Diplomacy (§8.7, §9.2)
  }
}

// morale/stability/supply/armyQuality are conceptually 0-100 (§8). army and
// gold are unbounded non-negative counts.
export function clampStat(value) {
  return Math.max(0, Math.min(100, Math.round(value)))
}

export function clampCount(value) {
  return Math.max(0, Math.round(value))
}

const STAT_FIELDS = ['armyQuality', 'morale', 'stability', 'supply']
const COUNT_FIELDS = ['army', 'gold']

/**
 * Applies a partial set of deltas (e.g. { army: 1400, gold: 2100, morale: 6,
 * supply: -7 } from a battle result) to a resources object. Returns a new
 * object — never mutates the one passed in. Only the fields present in
 * `deltas` are touched.
 */
export function applyResourceDeltas(resources, deltas) {
  const next = { ...resources }

  for (const field of STAT_FIELDS) {
    if (deltas[field] !== undefined) {
      next[field] = clampStat(resources[field] + deltas[field])
    }
  }

  for (const field of COUNT_FIELDS) {
    if (deltas[field] !== undefined) {
      next[field] = clampCount(resources[field] + deltas[field])
    }
  }

  return next
}

export function addAlliance(resources, alliance) {
  return {
    ...resources,
    alliances: [...resources.alliances, alliance],
  }
}

export function totalAlliedSoldiers(resources) {
  return resources.alliances.reduce((sum, a) => sum + (a.contribution ?? 0), 0)
}
