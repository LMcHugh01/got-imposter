import { supabase } from './supabase'

/**
 * Fetch the static (non-era) house records — sigil, name, words, region,
 * founder, cadet branches. Doesn't change based on the selected timeline
 * year, so this is fetched once regardless of which point is selected.
 */
export async function fetchAllHouses() {
  const { data, error } = await supabase
    .from('houses')
    .select('*')
    .eq('active', true)
    .order('name', { ascending: true })

  if (error) {
    throw new Error(`Failed to fetch houses: ${error.message}`)
  }

  return (data ?? []).map((row) => ({
    id: row.api_id,
    name: row.name,
    slug: row.slug,
    region: row.region,
    words: row.words,
    founder: row.founder,
    founded: row.founded,
    cadetBranches: row.cadet_branches ?? [],
    sigil: row.sigil_emoji,
    imageUrl: row.image_url,
    tinctFrom: row.tinct_from,
    tinctTo: row.tinct_to,
    blazon: row.blazon,
    bannermen: row.bannermen ?? [],
    tier: row.tier, // 'great' | 'lordly' | 'knightly' | 'unknown'
    swornTo: row.sworn_to,
  }))
}

/**
 * Fetch every house_eras row across every timeline point — small table
 * (houses × points, 18 rows today), so this pulls everything at once
 * rather than refetching per click. Houses.jsx merges a house with its
 * matching (houseId, year) row client-side whenever the selected timeline
 * point changes, so switching points is instant with no network round trip.
 */
export async function fetchAllHouseEras() {
  const { data, error } = await supabase
    .from('house_eras')
    .select('*')
    .order('year', { ascending: true })

  if (error) {
    throw new Error(`Failed to fetch house eras: ${error.message}`)
  }

  return (data ?? []).map((row) => ({
    houseId: row.house_id,
    year: row.year,
    eraLabel: row.era_label,
    status: row.status, // 'active' | 'royalty' | 'exiled' | 'extinct', or free text (e.g. 'Diminished')
    kingdom: row.kingdom,
    currentLord: row.current_lord,
    rulerLabel: row.ruler_label,
    regent: row.regent,
    castellan: row.castellan,
    heir: row.heir,
    heirLabel: row.heir_label,
    overlord: row.overlord,
    seats: row.seats ?? [],
    titles: row.titles ?? [],
    commanderTitles: row.commander_titles ?? [],
    branches: row.branches ?? [],
    summary: row.summary,
    // Optional per-era overrides of the house's own region and tier (a
    // house that moved, or was raised in rank). Only set when the row has
    // one, so merging { ...house, ...era } never blanks the house's own.
    ...(row.region ? { region: row.region } : {}),
    ...(row.tier ? { tier: row.tier } : {}),
  }))
}

/**
 * Fetch every small_council row across every timeline point — cross-house
 * data (a Hand or Master of Whispers isn't tied to any one tracked house),
 * so this is its own table rather than a column on houses/house_eras.
 * Same "fetch everything once" shape as fetchAllHouseEras — small table,
 * no refetch needed when the selected year changes.
 */
export async function fetchAllSmallCouncil() {
  const { data, error } = await supabase
    .from('small_council')
    .select('*')
    .order('sort_order', { ascending: true })

  if (error) {
    throw new Error(`Failed to fetch the small council: ${error.message}`)
  }

  return (data ?? []).map((row) => ({
    year: row.year,
    role: row.role,
    characterName: row.character_name,
    house: row.house,
    sortOrder: row.sort_order,
    council: row.council ?? 'small_council', // 'small_council' | 'nights_watch'
  }))
}

/**
 * Fetch the castles shown on the map: which to show and their icon size
 * ('large' | 'medium' | 'small'). Who holds each one isn't stored here;
 * the map works it out per era from the houses' seats. `mapMarker` is the
 * map's name for it when that differs from `name`; `aliases` are other names
 * a house might list it under as a seat; `x`/`y` place a castle the map has
 * no marker for.
 */
export async function fetchAllCastles() {
  const { data, error } = await supabase.from('castles').select('*').order('name', { ascending: true })

  if (error) {
    throw new Error(`Failed to fetch castles: ${error.message}`)
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    iconSize: row.icon_size,
    mapMarker: row.map_marker,
    aliases: row.aliases ?? [],
    x: row.x,
    y: row.y,
  }))
}