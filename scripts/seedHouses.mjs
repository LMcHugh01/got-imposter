/**
 * scripts/seedHouses.mjs
 *
 * One-time/occasional admin script. NOT called by the app at runtime.
 *
 * Fetches the "great houses of the realm" (Houses.jsx's own tagline) from the
 * live An API of Ice and Fire — the same API seedCharacters.mjs sources
 * characters from — and upserts the result into the Supabase "houses" table.
 *
 * Unlike seedCharacters.mjs there's no curated CSV to read: the list below
 * (GREAT_HOUSES) *is* the shortlist, since there are only nine of them.
 *
 * Usage:
 *   node scripts/seedHouses.mjs
 *
 * Requires in .env (NOT .env.local / NOT committed — this key bypasses RLS):
 *   SUPABASE_URL=https://xxxx.supabase.co
 *   SUPABASE_SERVICE_ROLE_KEY=xxxx
 */

import { createClient } from '@supabase/supabase-js'
import 'dotenv/config'

const API_BASE = 'https://www.anapioficeandfire.com/api'
const HOUSES_URL = `${API_BASE}/houses`

// The "great houses of the realm" — straight from Houses.jsx's own tagline.
// Matched by prefix against the API's house names rather than hardcoded full
// names, because a few of these (Baratheon, Targaryen) split into more than
// one API entry (e.g. "House Baratheon of King's Landing" vs "...of
// Dragonstone" vs "...of Storm's End") and hand-picking the exact suffix by
// guesswork is fragile. See pickMainBranch() below.
const GREAT_HOUSES = [
  'Stark',
  'Lannister',
  'Baratheon',
  'Tyrell',
  'Martell',
  'Greyjoy',
  'Arryn',
  'Tully',
  'Targaryen',
]

// Purely decorative — used for sigil_emoji, has no bearing on matching.
const SIGILS = {
  Stark: '🐺',
  Lannister: '🦁',
  Baratheon: '🦌',
  Tyrell: '🌹',
  Martell: '☀️',
  Greyjoy: '🐙',
  Arryn: '🦅',
  Tully: '🐟',
  Targaryen: '🐉',
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

function slugify(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

// ".../api/characters/583" -> "583". Used to derive houses.api_id from a
// house's own url.
function idFromUrl(url) {
  if (!url) return null
  const match = url.match(/(\d+)\/?$/)
  return match ? match[1] : null
}

async function fetchJson(url) {
  const res = await fetch(url)
  if (!res.ok) {
    throw new Error(`Request failed (${res.status}): ${url}`)
  }
  return res.json()
}

// Resolve a character or house resource URL to its display name — the API
// only gives URLs for currentLord/heir/overlord/founder/cadetBranches, and a
// name is what the explore page actually wants to show. Returns null for
// blank fields (and swallows a failed lookup the same way seedCharacters.mjs
// treats a failed house lookup as non-fatal) instead of blocking the row.
async function resolveName(url) {
  if (!url) return null
  try {
    const data = await fetchJson(url)
    return data.name || null
  } catch {
    return null
  }
}

async function fetchAllHouses() {
  const houses = []
  let page = 1
  const pageSize = 50
  // The API paginates at 50/page across ~444 houses total; keep pulling
  // pages until one comes back short, which means it was the last one.
  for (;;) {
    const batch = await fetchJson(`${HOUSES_URL}?page=${page}&pageSize=${pageSize}`)
    houses.push(...batch)
    if (batch.length < pageSize) break
    page += 1
    await sleep(250) // be polite to the free API
  }
  return houses
}

// Among every API entry whose name contains "{shortName}", pick the one
// with the most sworn members — reliably the main/ruling branch of a split
// house (e.g. picks the Baratheon branch with the fullest data over a
// sparser cadet entry). `includes` rather than a "House {shortName}" prefix
// because a couple of these aren't named that simply in the API — Martell
// is officially "House Nymeros Martell of Sunspear", with no "House Martell"
// entry at all.
function pickMainBranch(allHouses, shortName) {
  const candidates = allHouses.filter((h) => h.name.includes(shortName))
  if (candidates.length === 0) return null
  return candidates.reduce(
    (best, h) => (h.swornMembers.length > (best?.swornMembers.length ?? -1) ? h : best),
    null
  )
}

async function enrichHouse(shortName, house) {
  const [current_lord, heir, overlord, founder] = await Promise.all([
    resolveName(house.currentLord),
    resolveName(house.heir),
    resolveName(house.overlord),
    resolveName(house.founder),
  ])
  await sleep(250)

  const cadetBranchNames = []
  for (const url of house.cadetBranches || []) {
    cadetBranchNames.push(await resolveName(url))
    await sleep(250)
  }

  return {
    api_id: Number(idFromUrl(house.url)),
    name: house.name,
    slug: slugify(house.name),
    region: house.region || null,
    coat_of_arms: house.coatOfArms || null,
    words: house.words || null,
    titles: (house.titles || []).filter(Boolean),
    seats: (house.seats || []).filter(Boolean),
    current_lord,
    heir,
    overlord,
    founder,
    founded: house.founded || null,
    died_out: house.diedOut || null,
    ancestral_weapons: (house.ancestralWeapons || []).filter(Boolean),
    cadet_branches: cadetBranchNames.filter(Boolean),
    sworn_member_count: (house.swornMembers || []).length,
    sigil_emoji: SIGILS[shortName] ?? null,
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

  console.log('Fetching all houses from anapioficeandfire.com...')
  const allHouses = await fetchAllHouses()
  console.log(`Fetched ${allHouses.length} houses total from the API.\n`)

  const enriched = []
  const failed = []

  for (const [i, shortName] of GREAT_HOUSES.entries()) {
    const house = pickMainBranch(allHouses, shortName)
    if (!house) {
      failed.push({ shortName, error: 'no matching API house found' })
      console.error(`(${i + 1}/${GREAT_HOUSES.length}) ✗ House ${shortName}: no match in API results`)
      continue
    }
    try {
      const row = await enrichHouse(shortName, house)
      enriched.push(row)
      console.log(
        `(${i + 1}/${GREAT_HOUSES.length}) ✓ ${row.name} — ${row.sworn_member_count} sworn members`
      )
    } catch (err) {
      failed.push({ shortName, error: err.message })
      console.error(`(${i + 1}/${GREAT_HOUSES.length}) ✗ House ${shortName}: ${err.message}`)
    }
  }

  if (enriched.length > 0) {
    const { error } = await supabase.from('houses').upsert(enriched, { onConflict: 'api_id' })

    if (error) {
      console.error('Supabase upsert failed:', error.message)
      process.exit(1)
    }
    console.log(`\nUpserted ${enriched.length} houses into Supabase.`)
  }

  if (failed.length > 0) {
    console.log(`\n${failed.length} house(s) failed — fix and re-run:`)
    failed.forEach((f) => console.log(`  - House ${f.shortName}: ${f.error}`))
  }
}

main()
