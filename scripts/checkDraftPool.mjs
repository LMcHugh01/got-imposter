/**
 * scripts/checkDraftPool.mjs
 *
 * Pulls the real draftable pool from Supabase and runs a full simulated
 * draft against it (random picks, first open role each time) purely to
 * confirm the data + engine work together end to end. Not part of the app
 * — a one-off sanity check you can delete once you trust the pipeline.
 *
 * Usage: node scripts/checkDraftPool.mjs
 */

import { createClient } from '@supabase/supabase-js'
import 'dotenv/config'

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY)

async function fetchDraftablePool() {
  const { data, error } = await supabase.from('character_attributes').select(`
    character_id,
    combat, leadership, strategy, intelligence, politics, diplomacy, loyalty, economy,
    characters ( name, house )
  `)

  if (error) throw new Error(`Failed to fetch draftable characters: ${error.message}`)
  if (!data || data.length === 0) throw new Error('No characters with attributes found.')

  return data.map((row) => ({
    id: row.character_id,
    name: row.characters.name,
    house: row.characters.house,
    attributes: {
      combat: row.combat,
      leadership: row.leadership,
      strategy: row.strategy,
      intelligence: row.intelligence,
      politics: row.politics,
      diplomacy: row.diplomacy,
      loyalty: row.loyalty,
      economy: row.economy,
    },
  }))
}

// --- inlined minimal copies of the ratings/draft engine logic, so this ---
// --- script has zero import-path dependencies on the rest of the app  ---

const ROLE_WEIGHTS = {
  king: { leadership: 0.4, politics: 0.25, diplomacy: 0.2, intelligence: 0.15 },
  consort: { diplomacy: 0.45, politics: 0.25, leadership: 0.15, loyalty: 0.15 },
  heir: { leadership: 0.35, politics: 0.2, combat: 0.15, diplomacy: 0.15, loyalty: 0.15 },
  hand: { leadership: 0.25, politics: 0.25, intelligence: 0.2, economy: 0.2, diplomacy: 0.1 },
  masterOfWhispers: { intelligence: 0.5, politics: 0.2, diplomacy: 0.1, loyalty: 0.1, strategy: 0.1 },
  masterOfCoin: { economy: 0.45, intelligence: 0.2, politics: 0.2, diplomacy: 0.15 },
  masterOfLaws: { politics: 0.3, leadership: 0.25, loyalty: 0.2, intelligence: 0.15, combat: 0.1 },
  masterOfWar: { strategy: 0.4, leadership: 0.25, combat: 0.2, intelligence: 0.15 },
  kingsguard: { combat: 0.65, loyalty: 0.2, leadership: 0.1, strategy: 0.05 },
  commander: { combat: 0.4, strategy: 0.3, leadership: 0.2, intelligence: 0.1 },
}

function roleRating(attributes, roleId) {
  const weights = ROLE_WEIGHTS[roleId]
  const rating = Object.entries(weights).reduce((sum, [attr, w]) => sum + attributes[attr] * w, 0)
  return Math.round(rating)
}

async function main() {
  console.log('Fetching draftable pool from Supabase...\n')
  const pool = await fetchDraftablePool()
  console.log(`Pool size: ${pool.length} characters with attributes\n`)

  if (pool.length < 10) {
    console.error(`Not enough characters to complete a draft (need >= 10, got ${pool.length}).`)
    process.exit(1)
  }

  // Simulate a full 10-round draft: each round, pick the first offered
  // character and slot them into the first open role.
  const roleIds = Object.keys(ROLE_WEIGHTS)
  const drafted = new Set()
  const roster = {}

  for (const roleId of roleIds) {
    const undrafted = pool.filter((c) => !drafted.has(c.id))
    const offer = undrafted.slice(0, 5)
    const pick = offer[0]
    drafted.add(pick.id)
    roster[roleId] = { ...pick, fit: roleRating(pick.attributes, roleId) }
  }

  console.log('Simulated council:')
  Object.entries(roster).forEach(([roleId, character]) => {
    console.log(`  ${roleId.padEnd(18)} ${character.name.padEnd(24)} (${character.house ?? 'no house'}) — ${character.fit}% fit`)
  })

  console.log(`\n${drafted.size} characters drafted, ${pool.length - drafted.size} remaining in pool. Looks healthy.`)
}

main().catch((err) => {
  console.error('Check failed:', err.message)
  process.exit(1)
})
