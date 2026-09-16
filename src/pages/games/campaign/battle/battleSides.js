import { extractCouncilBattleInputs } from '../../../../gameEngine/battleEngine'

function troopTotal(troops) {
  return troops.infantry + troops.archers + troops.cavalry
}

/**
 * gameEngine-adjacent helper (kept in pages/games/draft since it only
 * shapes data for these screens, not a rule of the engine itself).
 * Previously lived inline in Draft.jsx; pulled out unchanged (including
 * the extractCouncilBattleInputs call) so the new CampaignDashboard can
 * build the same yourSide/enemySide shape for the Battle Tactics / Duel
 * Offer panels without a second copy of this logic.
 */
export function buildBattleSides(campaign, enemyHouse, scouted) {
  const councilInputs = extractCouncilBattleInputs(campaign.roster)
  const yourSide = {
    troops: campaign.resources.troops,
    // Kept alongside `troops` for duelEngine.js's computeDuelShare, which
    // calls computeYourPower/computeEnemyPower directly and reads
    // .armySize itself — tickBattle derives this the same way
    // internally, but that derivation lives inside tickBattle now that
    // composition exists, not on the object passed in.
    armySize: troopTotal(campaign.resources.troops),
    armyQuality: campaign.resources.armyQuality,
    morale: campaign.resources.morale,
    supply: campaign.resources.supply,
    ...councilInputs,
    scouted,
  }
  const enemySide = {
    troops: enemyHouse.troops,
    armySize: troopTotal(enemyHouse.troops),
    armyQuality: enemyHouse.armyQuality,
    morale: enemyHouse.morale,
    supply: enemyHouse.supply,
    rating: enemyHouse.rating,
    gold: enemyHouse.gold,
    name: enemyHouse.name,
    flavorText: enemyHouse.flavorText,
    // BATTLE_PLAN.md §10 — the battle happens on the enemy's terrain;
    // enemyHouseService.js already falls back to a neutral default for
    // any house that predates the terrain migration.
    terrain: enemyHouse.terrain,
    // BATTLE_PLAN.md §12 — resolved into a concrete battle AI profile by
    // Battle.jsx, once per engagement.
    personality: enemyHouse.personality,
  }
  return { yourSide, enemySide }
}