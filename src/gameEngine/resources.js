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
 *
 * v2 (BATTLE_PLAN.md §5): `army` is no longer its own stored field — it's
 * derived as the sum of `troops.{infantry,archers,cavalry}`, recomputed
 * every time troops changes. This is deliberate: two sources of truth for
 * the same number is how they drift apart. Every existing caller that
 * reads `resources.army` keeps working unchanged, since it's still a real
 * field on the object, just always freshly summed rather than stored.
 *
 * Existing callers that WRITE a generic `{ army: delta }` (Recruit's
 * masterOfCoin flow before this v2, Recover, alliances landing troops,
 * battle casualties via campaign.js) also keep working unchanged — a
 * generic army delta is split PROPORTIONALLY across the current troop
 * mix (see splitArmyDeltaAcrossTroops), on the theory that reinforcements
 * or losses that don't specify a type land across your existing
 * composition rather than silently favoring one type. The one place that
 * DOES specify a type explicitly is Recruit's new composition choice
 * (economy.js), which passes `{ troops: { infantry: N } }` instead.
 */

export const TROOP_TYPES = ['infantry', 'archers', 'cavalry']

// First-draft starting composition — a fairly conventional infantry-heavy
// medieval army mix. No lore/house-specific starting composition exists
// yet (that's a natural extension once Houses (§12 Terrain) exist), so
// this one fixed ratio applies to every campaign for now.
const STARTING_TROOP_SHARE = { infantry: 0.6, archers: 0.2, cavalry: 0.2 }

export function createInitialResources() {
  const startingArmy = 10000
  return {
    troops: splitTotalByShare(startingArmy, STARTING_TROOP_SHARE),
    army: startingArmy,
    armyQuality: 70, // no starting value specified in §8 — see build-step notes
    gold: 25000,
    morale: 75,
    stability: 75,
    supply: 80,
    alliances: [], // { houseName, contribution }, appended by Diplomacy (§8.7, §9.2)
  }
}

// morale/stability/supply/armyQuality are conceptually 0-100 (§8). army,
// gold, and each troop type are unbounded non-negative counts.
export function clampStat(value) {
  return Math.max(0, Math.min(100, Math.round(value)))
}

export function clampCount(value) {
  return Math.max(0, Math.round(value))
}

function troopTotal(troops) {
  return troops.infantry + troops.archers + troops.cavalry
}

// Splits a total into 3 troop counts by share, giving cavalry the
// remainder so the three always sum exactly to the total regardless of
// rounding — same remainder trick used in intelligence.js and elsewhere
// in this codebase for a 3-or-more-way split.
function splitTotalByShare(total, share) {
  const infantry = clampCount(total * share.infantry)
  const archers = clampCount(total * share.archers)
  const cavalry = clampCount(total - infantry - archers)
  return { infantry, archers, cavalry }
}

/**
 * Splits a generic (untyped) army delta proportionally across the
 * CURRENT troop mix. If there are no troops at all to split by (a wiped
 * or brand-new army), the whole delta goes to infantry as a sane
 * fallback rather than being silently dropped.
 */
function splitArmyDeltaAcrossTroops(troops, delta) {
  const total = troopTotal(troops)
  if (total <= 0) {
    return { infantry: clampCount(delta), archers: 0, cavalry: 0 }
  }
  const deltaInfantry = Math.round((delta * troops.infantry) / total)
  const deltaArchers = Math.round((delta * troops.archers) / total)
  const deltaCavalry = delta - deltaInfantry - deltaArchers
  return {
    infantry: clampCount(troops.infantry + deltaInfantry),
    archers: clampCount(troops.archers + deltaArchers),
    cavalry: clampCount(troops.cavalry + deltaCavalry),
  }
}

const STAT_FIELDS = ['armyQuality', 'morale', 'stability', 'supply']
const COUNT_FIELDS = ['gold'] // 'army' is handled separately below — see v2 note above

/**
 * Applies a partial set of deltas (e.g. { army: 1400, gold: 2100, morale: 6,
 * supply: -7 } from a battle result) to a resources object. Returns a new
 * object — never mutates the one passed in. Only the fields present in
 * `deltas` are touched.
 *
 * Troop deltas can be given two ways: a generic `{ army: N }` (split
 * proportionally across the current mix — see splitArmyDeltaAcrossTroops)
 * or an explicit `{ troops: { infantry: N, cavalry: -M } }` for a caller
 * that knows exactly which type it's changing (Recruit's composition
 * choice). If both are present, the explicit `troops` delta wins and
 * `army` is ignored, rather than double-applying two different deltas to
 * the same underlying counts.
 */
export function applyResourceDeltas(resources, deltas) {
  const next = { ...resources }

  if (deltas.troops !== undefined) {
    next.troops = {
      infantry: clampCount(resources.troops.infantry + (deltas.troops.infantry ?? 0)),
      archers: clampCount(resources.troops.archers + (deltas.troops.archers ?? 0)),
      cavalry: clampCount(resources.troops.cavalry + (deltas.troops.cavalry ?? 0)),
    }
  } else if (deltas.army !== undefined) {
    next.troops = splitArmyDeltaAcrossTroops(resources.troops, deltas.army)
  }
  next.army = troopTotal(next.troops)

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