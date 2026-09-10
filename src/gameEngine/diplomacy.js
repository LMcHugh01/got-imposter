/**
 * gameEngine/diplomacy.js
 *
 * Implements §9.2 from GOT-DRAFT-CONTEXT.md. Pure functions — no React, no
 * Supabase. This is a real negotiation, not a fixed take-it-or-leave-it
 * offer: the player chooses how many soldiers to ask for and how much
 * gold to pay, and acceptance depends on both how fair that offer is and
 * the target house's own personality and strength — not just your
 * diplomacy rating in isolation. Outcome is still genuinely probabilistic
 * (§9.2.1 — never guaranteed, even at generous terms).
 *
 * There's no dedicated "allies" data source yet — MVP reuses an
 * enemy_houses row (any house other than your current opponent) as the
 * negotiation target, since it already has army_size/personality/rating
 * to negotiate against.
 */

import { applyResourceDeltas, addAlliance } from './resources'

const MIN_CHANCE = 0.05
const MAX_CHANCE = 0.9

// "Fair" baseline price — used only to judge whether an offer is generous
// or stingy relative to what's being asked for, not a fixed cost.
const BASE_GOLD_PER_SOLDIER = 2.5

// How a house's stated personality (§12.2) colors its willingness to deal,
// independent of the offer's actual terms.
const PERSONALITY_MODIFIERS = {
  aggressive: 0.85,
  defensive: 1.0,
  diplomatic: 1.25,
  economic: 1.15, // still cares about the terms most of all, but predisposed to a deal
  deceptive: 0.9,
  unpredictable: 1.0,
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value))
}

/**
 * Chance a house accepts a specific offer. Three things move the needle:
 * - your diplomacy rating (your council's negotiating skill)
 * - how generous goldOffered is relative to what soldiersRequested would
 *   "fairly" cost (§9.2's "possible contribution... cost" framing, but now
 *   player-set rather than fixed)
 * - how large a slice of their total army you're asking for, and their
 *   personality
 */
export function computeAllianceChance({ diplomacyRating, goldOffered, soldiersRequested, enemyHouse }) {
  const base = 0.15 + (clamp(diplomacyRating, 0, 100) / 100) * 0.4

  const fairGold = soldiersRequested * BASE_GOLD_PER_SOLDIER
  const valueRatio = fairGold > 0 ? goldOffered / fairGold : 1
  const valueModifier = clamp(valueRatio, 0.4, 1.8)

  const requestedFraction = enemyHouse.armySize > 0 ? soldiersRequested / enemyHouse.armySize : 1
  const greedPenalty = requestedFraction > 0.25 ? 1 - Math.min(0.6, (requestedFraction - 0.25) * 1.5) : 1

  const personalityModifier = PERSONALITY_MODIFIERS[enemyHouse.personality] ?? 1.0

  const chance = base * valueModifier * greedPenalty * personalityModifier
  return clamp(chance, MIN_CHANCE, MAX_CHANCE)
}

/**
 * Propose specific terms to a specific house. Gold is spent regardless of
 * outcome (§9.2.1 — a rejected proposal still cost you something); on
 * acceptance, exactly `soldiersRequested` join your army as an alliance.
 */
export function attemptAlliance({
  resources,
  diplomacyRating,
  goldOffered,
  soldiersRequested,
  targetHouseName,
  enemyHouse,
  rng = Math.random,
}) {
  if (goldOffered <= 0 || soldiersRequested <= 0) {
    throw new Error('Must offer a positive amount of gold and request a positive number of soldiers.')
  }
  if (goldOffered > resources.gold) {
    throw new Error('Not enough gold to make this offer.')
  }

  const chance = computeAllianceChance({ diplomacyRating, goldOffered, soldiersRequested, enemyHouse })
  const accepted = rng() < chance

  let nextResources = applyResourceDeltas(resources, { gold: -goldOffered })

  if (!accepted) {
    return { resources: nextResources, accepted: false, contribution: 0, chance }
  }

  nextResources = addAlliance(nextResources, { houseName: targetHouseName, contribution: soldiersRequested })
  nextResources = applyResourceDeltas(nextResources, { army: soldiersRequested })

  return { resources: nextResources, accepted: true, contribution: soldiersRequested, chance }
}