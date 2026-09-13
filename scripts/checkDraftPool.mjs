/**
 * scripts/checkDraftPool.mjs
 *
 * Pulls the real draftable pool from Supabase and runs a full simulated
 * draft against it (random picks, first open role each time) purely to
 * confirm the data + engine work together end to end. Not part of the app
 * — a one-off sanity check you can delete once you trust the pipeline.
 *
 * v2: previously inlined its own copy of ROLE_WEIGHTS and the Supabase
 * column list so this script had zero import dependencies on the rest of
 * the app. That's exactly what let it go stale — it still referenced
 * masterOfWar/heir and the old 8 dropped columns after the attribute
 * rework, and would have errored outright since those columns no longer
 * exist. Now imports the real src files directly (plain ESM, no bundler
 * needed) so there's only one copy of this logic to keep in sync.
 *
 * Usage: node scripts/checkDraftPool.mjs
 */

import { createClient } from '@supabase/supabase-js'
import 'dotenv/config'
import { ROLES } from '../src/data/roleWeights.js'
import { roleRating } from '../src/gameEngine/ratings.js'
import { ALL_ATTRIBUTE_KEYS, ATTRIBUTE_DB_COLUMNS } from '../src/data/attributes.js'

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY)

const SELECT_COLUMNS = ALL_ATTRIBUTE_KEYS.map((key) => ATTRIBUTE_DB_COLUMNS[key]).join(', ')

async function fetchDraftablePool() {
  const { data, error } = await supabase.from('character_attributes').select(`
    character_id,
    ${SELECT_COLUMNS},
    characters ( name, house )
  `)

  if (error) throw new Error(`Failed to fetch draftable characters: ${error.message}`)
  if (!data || data.length === 0) throw new Error('No characters with attributes found.')

  return data.map((row) => ({
    id: row.character_id,
    name: row.characters.name,
    house: row.characters.house,
    attributes: Object.fromEntries(ALL_ATTRIBUTE_KEYS.map((key) => [key, row[ATTRIBUTE_DB_COLUMNS[key]]])),
  }))
}

async function main() {
  console.log('Fetching draftable pool from Supabase...\n')
  const pool = await fetchDraftablePool()
  console.log(`Pool size: ${pool.length} characters with attributes\n`)

  if (pool.length < ROLES.length) {
    console.error(`Not enough characters to complete a draft (need >= ${ROLES.length}, got ${pool.length}).`)
    process.exit(1)
  }

  // Simulate a full 10-round draft: each round, pick the first offered
  // character and slot them into the next open role.
  const drafted = new Set()
  const roster = {}

  for (const role of ROLES) {
    const undrafted = pool.filter((c) => !drafted.has(c.id))
    const offer = undrafted.slice(0, 5)
    const pick = offer[0]
    drafted.add(pick.id)
    roster[role.id] = { ...pick, fit: roleRating(pick.attributes, role.id) }
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