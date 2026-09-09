/**
 * scripts/seedCharacters.mjs
 *
 * One-time/occasional admin script. NOT called by the app at runtime.
 *
 * Reads scripts/character-shortlist.csv (api_id, name, difficulty — the list
 * you curated and approved), fetches each character's house/culture/titles/
 * aliases from the live An API of Ice and Fire, and upserts the result into
 * the Supabase "characters" table.
 *
 * Usage:
 *   node scripts/seedCharacters.mjs
 *
 * Requires in .env (NOT .env.local / NOT committed — this key bypasses RLS):
 *   SUPABASE_URL=https://xxxx.supabase.co
 *   SUPABASE_SERVICE_ROLE_KEY=xxxx
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createClient } from '@supabase/supabase-js'
import 'dotenv/config'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const CSV_PATH = path.join(__dirname, 'character-shortlist.csv')
const API_BASE = 'https://www.anapioficeandfire.com/api'

// Known corrections for cases where the source data's house/allegiance
// doesn't match what you actually want displayed (e.g. a character whose
// allegiance shifted mid-story). Keyed by api_id.
const HOUSE_OVERRIDES = {
  957: 'House Stark', // Sansa — source data ties her to House Baelish (her marriage), not her birth house
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

function parseCsv(text) {
  const [headerLine, ...lines] = text.trim().split('\n')
  const headers = headerLine.split(',')
  return lines
    .filter(Boolean)
    .map((line) => {
      // simple CSV split; fine for this dataset (no embedded commas in
      // names/difficulty). Wrap a value in quotes in the CSV if that changes.
      const values = line.split(',')
      const row = {}
      headers.forEach((h, i) => {
        row[h.trim()] = values[i]?.trim()
      })
      return row
    })
}

async function fetchJson(url) {
  const res = await fetch(url)
  if (!res.ok) {
    throw new Error(`Request failed (${res.status}): ${url}`)
  }
  return res.json()
}

async function enrichCharacter({ api_id, name, difficulty }) {
  const apiId = Number(api_id)
  const character = await fetchJson(`${API_BASE}/characters/${apiId}`)

  let house = HOUSE_OVERRIDES[apiId] ?? null
  if (!house && character.allegiances?.[0]) {
    try {
      const houseData = await fetchJson(character.allegiances[0])
      house = houseData.name || null
    } catch {
      // House lookup failing shouldn't block seeding the character
      house = null
    }
  }

  return {
    api_id: apiId,
    // Use the curated CSV name as the source of truth for display
    // (it's where you resolved things like alias-only characters, e.g. Hodor).
    name: name || character.name,
    aliases: (character.aliases || []).filter(Boolean),
    house,
    culture: character.culture || null,
    titles: (character.titles || []).filter(Boolean),
    difficulty,
    image_url: null,
    active: true,
  }
}

async function main() {
  const supabaseUrl = process.env.SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceKey) {
    console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env')
    process.exit(1)
  }

  const supabase = createClient(supabaseUrl, serviceKey)

  const csvText = fs.readFileSync(CSV_PATH, 'utf-8')
  const rows = parseCsv(csvText)
  console.log(`Loaded ${rows.length} characters from ${CSV_PATH}`)

  const enriched = []
  const failed = []

  for (const [i, row] of rows.entries()) {
    try {
      const character = await enrichCharacter(row)
      enriched.push(character)
      console.log(`(${i + 1}/${rows.length}) ✓ ${character.name} — ${character.house ?? 'no house'}`)
    } catch (err) {
      failed.push({ ...row, error: err.message })
      console.error(`(${i + 1}/${rows.length}) ✗ ${row.name}: ${err.message}`)
    }
    await sleep(250) // be polite to the free API
  }

  if (enriched.length > 0) {
    const { error } = await supabase
      .from('characters')
      .upsert(enriched, { onConflict: 'api_id' })

    if (error) {
      console.error('Supabase upsert failed:', error.message)
      process.exit(1)
    }
    console.log(`\nUpserted ${enriched.length} characters into Supabase.`)
  }

  if (failed.length > 0) {
    console.log(`\n${failed.length} character(s) failed — fix and re-run:`)
    failed.forEach((f) => console.log(`  - ${f.name} (api_id ${f.api_id}): ${f.error}`))
  }
}

main()
