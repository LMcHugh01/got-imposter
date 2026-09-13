import { supabase } from './supabase'
import { ALL_ATTRIBUTE_KEYS, ATTRIBUTE_DB_COLUMNS } from '../data/attributes'

// Comma-separated DB column list, built once from the single source of
// truth in data/attributes.js — if the attribute list changes again, this
// updates automatically rather than needing a second hand-edit.
const SELECT_COLUMNS = ALL_ATTRIBUTE_KEYS.map((key) => ATTRIBUTE_DB_COLUMNS[key]).join(', ')

/**
 * Maps a raw character_attributes row (snake_case DB columns) to the
 * camelCase attributes object the engine expects. Returns null if there's
 * no row at all (character has no attributes yet).
 */
function mapAttributeRow(row) {
  if (!row) return null
  return Object.fromEntries(ALL_ATTRIBUTE_KEYS.map((key) => [key, row[ATTRIBUTE_DB_COLUMNS[key]]]))
}

/**
 * Fetch every character eligible for the Draft pool.
 *
 * Queries FROM character_attributes rather than characters — since
 * character_attributes.character_id has a NOT NULL foreign key into
 * characters.api_id, every row here is guaranteed to have a matching
 * character. This is the "inner join" behavior described in §4 of
 * GOT-DRAFT-CONTEXT.md: a character with no attributes row simply never
 * appears in the result, no filtering logic needed.
 *
 * Shapes the result into exactly what gameEngine/draftEngine.js and
 * gameEngine/ratings.js expect:
 *   { id, name, house, attributes: { strength, speed, ... } }
 */
export async function fetchDraftablePool() {
  const { data, error } = await supabase.from('character_attributes').select(`
    character_id,
    ${SELECT_COLUMNS},
    characters ( name, house )
  `)

  if (error) {
    throw new Error(`Failed to fetch draftable characters: ${error.message}`)
  }

  if (!data || data.length === 0) {
    throw new Error('No characters with attributes found — the draft pool is empty.')
  }

  return data.map((row) => ({
    id: row.character_id,
    name: row.characters.name,
    house: row.characters.house,
    attributes: mapAttributeRow(row),
  }))
}

/**
 * Fetch every character for browsing/curation, whether or not they have
 * attributes yet. Deliberately the opposite direction from
 * fetchDraftablePool(): queries FROM characters and embeds
 * character_attributes, which Supabase treats as a LEFT join — a
 * character with no attributes row still comes back, just with
 * `attributes: null`. That's what lets the Characters page show gaps
 * instead of silently hiding them.
 */
export async function fetchAllCharactersForBrowse() {
  const { data, error } = await supabase
    .from('characters')
    .select(
      `
    api_id,
    name,
    house,
    image_url,
    character_attributes ( ${SELECT_COLUMNS} )
  `
    )
    .order('name', { ascending: true })

  if (error) {
    throw new Error(`Failed to fetch characters: ${error.message}`)
  }

  return (data ?? []).map((row) => {
    // Embedded relation comes back as an array even though it's 1:1
    // (unique constraint on character_id) — take the first row.
    const attrRow = Array.isArray(row.character_attributes)
      ? row.character_attributes[0]
      : row.character_attributes

    return {
      id: row.api_id,
      name: row.name,
      house: row.house,
      image_url: row.image_url,
      attributes: mapAttributeRow(attrRow),
      hasAttributes: Boolean(attrRow),
    }
  })
}