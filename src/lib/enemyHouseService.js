import { supabase } from './supabase'

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