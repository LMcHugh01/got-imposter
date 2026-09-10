/**
 * gameEngine/economy.js
 *
 * Implements §9.1 (Recruit) and §9.4 (Recover) from GOT-DRAFT-CONTEXT.md.
 * Pure functions — no React, no Supabase. Both spend gold and return a new
 * resources object via applyResourceDeltas.
 *
 * Recover's rate is taken directly from the doc's own worked example
 * (§9.4: "3,000 gold -> +2,000 wounded soldiers returned, +5 morale").
 * Recruit has no worked example in the doc to calibrate against — its
 * original example (5,000 gold -> 4,000 soldiers) was sized against the
 * v1 50,000-starting-army design, before Army was lowered to 10,000 (§8's
 * note). The constant below is scaled proportionally from that example
 * rather than invented from nothing, but — like the battle formula
 * constants — expect this to move in the balancing pass (§17 step 12).
 */

import { applyResourceDeltas } from './resources'
import { statToModifier } from './modifiers'

// --- Recruit (§9.1) -----------------------------------------------------

// Calibrated from the v1 doc's example (5,000 gold -> 4,000 soldiers
// against a 50,000 army, i.e. ~8% of army size per 5,000 gold) scaled down
// to the current 10,000 starting army.
const RECRUIT_BASE_COST_PER_SOLDIER = 6.25

/**
 * Gold cost to recruit one soldier right now, before you decide how much
 * to spend. Scales with Master of Coin's rating, current stability, and
 * gets more expensive as your army grows (§11 guardrail 3 — diminishing
 * recruitment efficiency, the check against "just recruit forever").
 */
export function recruitmentCostPerSoldier({ currentArmy, masterOfCoinRating, stability }) {
  const armyScaling = 1 + currentArmy / 20000
  const efficiency = statToModifier(masterOfCoinRating, [0.7, 1.4])
  const stabilityModifier = statToModifier(stability, [0.85, 1.15])
  return (RECRUIT_BASE_COST_PER_SOLDIER * armyScaling) / (efficiency * stabilityModifier)
}

/**
 * Spend gold to recruit soldiers. Returns a new resources object.
 * Throws if you don't have enough gold — the UI should disable the action
 * rather than let this throw in practice, but it's a hard guard either way.
 */
export function recruit({ resources, goldToSpend, masterOfCoinRating }) {
  if (goldToSpend <= 0) {
    throw new Error('Must spend a positive amount of gold to recruit.')
  }
  if (goldToSpend > resources.gold) {
    throw new Error('Not enough gold to recruit that many soldiers.')
  }

  const costPerSoldier = recruitmentCostPerSoldier({
    currentArmy: resources.army,
    masterOfCoinRating,
    stability: resources.stability,
  })
  const soldiersGained = Math.floor(goldToSpend / costPerSoldier)

  return {
    resources: applyResourceDeltas(resources, { army: soldiersGained, gold: -goldToSpend }),
    soldiersGained,
  }
}

// --- Recover (§9.4) ------------------------------------------------------

// Directly from the doc's example: 3,000 gold -> 2,000 soldiers + 5 morale.
const RECOVER_SOLDIERS_PER_GOLD = 2000 / 3000
const RECOVER_MORALE_PER_GOLD = 5 / 3000

export function recover({ resources, goldToSpend }) {
  if (goldToSpend <= 0) {
    throw new Error('Must spend a positive amount of gold to recover.')
  }
  if (goldToSpend > resources.gold) {
    throw new Error('Not enough gold to recover.')
  }

  const soldiersReturned = Math.round(goldToSpend * RECOVER_SOLDIERS_PER_GOLD)
  const moraleGained = Math.round(goldToSpend * RECOVER_MORALE_PER_GOLD)

  return {
    resources: applyResourceDeltas(resources, { army: soldiersReturned, gold: -goldToSpend, morale: moraleGained }),
    soldiersReturned,
    moraleGained,
  }
}
