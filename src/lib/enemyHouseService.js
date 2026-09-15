import { supabase } from './supabase'
import { SELECT_COLUMNS, mapAttributeRow, mapFightingStyle } from './characterAttributesService'

function normalizeEnemyHouse(row) {
  return {
    id: row.id,
    name: row.name,
    tier: row.tier,
    personality: row.personality,
    rating: row.rating,
    armySize: row.army_size,
    armyQuality: row.army_quality,
    morale: row.morale,
    supply: row.supply,
    gold: row.gold,
    commanderName: row.commander_name,
    flavorText: row.flavor_text,
  }
}

/**
 * Fetch one random enemy house, optionally scoped to a tier (§12.1) and
 * excluding ids already faced this campaign (so a tier visited twice, per
 * §17 step 10's battle-tier curve, doesn't repeat the same opponent). If
 * every house in the tier has already been excluded, falls back to
 * allowing repeats rather than breaking the campaign.
 */
export async function fetchRandomEnemyHouse(tier = null, excludeIds = []) {
  let query = supabase.from('enemy_houses').select('*')
  if (tier !== null) {
    query = query.eq('tier', tier)
  }

  const { data, error } = await query

  if (error) {
    throw new Error(`Failed to fetch enemy houses: ${error.message}`)
  }

  if (!data || data.length === 0) {
    throw new Error(
      tier !== null ? `No enemy houses found for tier ${tier}.` : 'No enemy houses found.'
    )
  }

  const unfaced = data.filter((row) => !excludeIds.includes(row.id))
  const candidates = unfaced.length > 0 ? unfaced : data

  const random = Math.floor(Math.random() * candidates.length)
  return normalizeEnemyHouse(candidates[random])
}

/**
 * Fetch the duel-eligible champions for one enemy house (via
 * enemy_house_champions — migration 007). Returns an array, which can be
 * empty for houses with no lore-matching roster character — that's
 * expected, not an error. See duelEngine.js's getEnemyDuelFighter(),
 * which falls back to a procedural fighter in that case.
 *
 * Deliberately doesn't re-fetch the house itself — callers already have
 * it from fetchRandomEnemyHouse() and can pass its id straight in.
 */
export async function fetchEnemyHouseChampions(enemyHouseId) {
  const { data, error } = await supabase
    .from('enemy_house_champions')
    .select(
      `
      characters (
        api_id,
        name,
        fighting_style,
        character_attributes ( ${SELECT_COLUMNS} )
      )
    `
    )
    .eq('enemy_house_id', enemyHouseId)

  if (error) {
    throw new Error(`Failed to fetch enemy house champions: ${error.message}`)
  }

  return (data ?? [])
    .map((row) => row.characters)
    .filter(Boolean)
    .map((c) => {
      const attrRow = Array.isArray(c.character_attributes) ? c.character_attributes[0] : c.character_attributes
      return {
        id: c.api_id,
        name: c.name,
        attributes: mapAttributeRow(attrRow),
        fightingStyle: mapFightingStyle(c.fighting_style),
      }
    })
    // A champion candidate needs both attributes and a fighting style to
    // actually be duel-usable — exclude any that are somehow missing
    // either (shouldn't happen for the curated 007 list, but this
    // service should never hand the engine a character it can't rate).
    .filter((c) => c.attributes && c.fightingStyle)
}