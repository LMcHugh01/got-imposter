/**
 * gameEngine/campaign.js
 *
 * Implements §12 from GOT-DRAFT-CONTEXT.md. Pure functions + a plain state
 * object — no React, no Supabase. A campaign tracks your roster, resources
 * (persisting and accumulating across battles), which battle you're on,
 * which enemy houses you've already faced, and a log of confirmed results.
 */

import { createInitialResources, applyResourceDeltas } from './resources'
import { computeHouseStats, overallHouseRating } from './houseStats'

// §12.1 — which tier each of the 8 battles draws its opponent from. Tiers
// 1-3 get one battle each, 4-5 get two (you'll need at least 2 houses in
// those tiers to avoid an immediate repeat), 6 is the Iron Throne, once.
export const BATTLE_TIER_CURVE = [1, 2, 3, 4, 4, 5, 5, 6]
export const TOTAL_BATTLES = BATTLE_TIER_CURVE.length

export function createCampaign(roster) {
  return {
    roster,
    resources: createInitialResources(),
    battleNumber: 1,
    usedEnemyHouseIds: [],
    battleLog: [],
    status: 'active', // active | victory | defeat
  }
}

export function getCurrentTier(campaign) {
  return BATTLE_TIER_CURVE[campaign.battleNumber - 1]
}

export function isFinalBattle(campaign) {
  return campaign.battleNumber === TOTAL_BATTLES
}

export function isCampaignOver(campaign) {
  return campaign.status !== 'active'
}

/**
 * Applies a confirmed battle result to the campaign: resource deltas,
 * a battle log entry, used-house tracking, and status/battleNumber
 * progression. Returns a new campaign — never mutates the one passed in.
 *
 * A defeat here ends the campaign (§12.3) and does NOT advance
 * battleNumber — that's the correct behavior for a "hard" defeat. The
 * current UI instead offers unlimited retry before ever calling this with
 * a defeat result, so in practice this branch is there for correctness
 * and for whenever a stricter difficulty mode wants it, not currently
 * exercised by the app.
 */
export function recordBattleResult(campaign, enemyHouse, result) {
  const nextResources = applyResourceDeltas(campaign.resources, {
    army: result.soldiersGained - result.yourCasualties,
    gold: result.goldGained,
    morale: result.moraleChange,
    supply: result.supplyChange,
  })

  const logEntry = {
    battleNumber: campaign.battleNumber,
    tier: getCurrentTier(campaign),
    enemyName: enemyHouse.name,
    ...result,
  }

  const wasFinal = isFinalBattle(campaign)
  let status = 'active'
  if (result.outcome === 'defeat') {
    status = 'defeat'
  } else if (wasFinal) {
    status = 'victory'
  }

  return {
    ...campaign,
    resources: nextResources,
    usedEnemyHouseIds: [...campaign.usedEnemyHouseIds, enemyHouse.id],
    battleLog: [...campaign.battleLog, logEntry],
    battleNumber: status === 'active' ? campaign.battleNumber + 1 : campaign.battleNumber,
    status,
  }
}

/**
 * §12.3 — Campaign Summary: battles won, starting vs final army, gold
 * earned, alliances made, final house rating. Meaningful at any point once
 * at least one battle has been confirmed — used both on the final victory
 * screen and (partially) on a defeat screen, since defeats are always
 * retriable in this build rather than hard campaign-enders (see
 * recordBattleResult's comment).
 */
export function summarizeCampaign(campaign) {
  const startingArmy = createInitialResources().army
  const goldEarned = campaign.battleLog.reduce((sum, entry) => sum + (entry.goldGained ?? 0), 0)
  const soldiersRecruitedFromSurrender = campaign.battleLog.reduce((sum, entry) => sum + (entry.soldiersGained ?? 0), 0)
  const enemySoldiersDefeated = campaign.battleLog.reduce((sum, entry) => sum + (entry.enemyCasualties ?? 0), 0)

  const stats = computeHouseStats(campaign.roster)
  const finalHouseRating = overallHouseRating(stats)

  return {
    battlesWon: campaign.battleLog.length,
    totalBattles: TOTAL_BATTLES,
    startingArmy,
    finalArmy: campaign.resources.army,
    goldEarned,
    soldiersRecruitedFromSurrender,
    enemySoldiersDefeated,
    alliancesMade: campaign.resources.alliances.length,
    finalHouseRating,
  }
}