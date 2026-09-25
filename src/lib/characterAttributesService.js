import { supabase } from './supabase'
import { ALL_ATTRIBUTE_KEYS, ATTRIBUTE_DB_COLUMNS } from '../data/attributes'
import { CHAMPION_STYLE_FROM_DB } from '../data/championStyles'
import { LEADERSHIP_STYLE_FROM_DB } from '../data/leadershipStyles'
import { COMMAND_STYLE_FROM_DB } from '../data/commandStyles'
import { COIN_STYLE_FROM_DB } from '../data/coinStyles'

// Comma-separated DB column list, built once from the single source of
// truth in data/attributes.js — if the attribute list changes again, this
// updates automatically rather than needing a second hand-edit.
export const SELECT_COLUMNS = ALL_ATTRIBUTE_KEYS.map((key) => ATTRIBUTE_DB_COLUMNS[key]).join(', ')

/**
 * Maps a raw character_attributes row (snake_case DB columns) to the
 * camelCase attributes object the engine expects. Returns null if there's
 * no row at all (character has no attributes yet). Exported — reused by
 * enemyHouseService.js so there's only one copy of this mapping.
 */
export function mapAttributeRow(row) {
  if (!row) return null
  return Object.fromEntries(ALL_ATTRIBUTE_KEYS.map((key) => [key, row[ATTRIBUTE_DB_COLUMNS[key]]]))
}

/**
 * Maps a raw DB fighting_style value ('untrained') to the camelCase
 * key the engine expects ('untrained'). Returns null if unset — a
 * character not yet tagged, expected during the data-entry rollout.
 * Exported — reused by enemyHouseService.js.
 */
export function mapFightingStyle(dbValue) {
  if (!dbValue) return null
  return CHAMPION_STYLE_FROM_DB[dbValue] ?? null
}

/**
 * Same shape as mapFightingStyle, for the 3 new style categories
 * (characters.leadership_style / command_style / coin_style). Each
 * returns null if unset — same data-entry-rollout posture as fighting
 * style: these are new columns and none of the 64 shortlisted characters
 * have been tagged yet.
 */
export function mapLeadershipStyle(dbValue) {
  if (!dbValue) return null
  return LEADERSHIP_STYLE_FROM_DB[dbValue] ?? null
}

export function mapCommandStyle(dbValue) {
  if (!dbValue) return null
  return COMMAND_STYLE_FROM_DB[dbValue] ?? null
}

export function mapCoinStyle(dbValue) {
  if (!dbValue) return null
  return COIN_STYLE_FROM_DB[dbValue] ?? null
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
 *   { id, name, house, attributes: { strength, speed, ... },
 *     fightingStyle, leadershipStyle, commandStyle, coinStyle }
 *
 * Note: any of the 4 style fields can still be null here even though
 * attributes are guaranteed present — attributes and each style tag are
 * separate data-entry passes, so a character can have attributes without
 * being tagged for some or all styles yet. Any code that computes a
 * rating for a style-driven role needs to handle that (see ratings.js's
 * graceful-null behavior via isRoleRatable()).
 */
export async function fetchDraftablePool() {
  const { data, error } = await supabase.from('character_attributes').select(`
    character_id,
    ${SELECT_COLUMNS},
characters ( name, house, image_url, fighting_style, leadership_style, command_style, coin_style )
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
    fightingStyle: mapFightingStyle(row.characters.fighting_style),
    leadershipStyle: mapLeadershipStyle(row.characters.leadership_style),
    commandStyle: mapCommandStyle(row.characters.command_style),
    coinStyle: mapCoinStyle(row.characters.coin_style),
  }))
}

/**
 * Fetch every character for browsing/curation, whether or not they have
 * attributes yet. Deliberately the opposite direction from
 * fetchDraftablePool(): queries FROM characters and embeds
 * character_attributes, which Supabase treats as a LEFT join — a
 * character with no attributes row still comes back, just with
 * `attributes: null`. That's what lets the Characters page show gaps
 * instead of silently hiding them. Same posture for every style column —
 * a character with none yet still comes back, just with that field null.
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
    fighting_style,
    leadership_style,
    command_style,
    coin_style,
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
      image_url: row.characters.image_url,
      attributes: mapAttributeRow(attrRow),
      hasAttributes: Boolean(attrRow),
      fightingStyle: mapFightingStyle(row.fighting_style),
      hasFightingStyle: Boolean(row.fighting_style),
      leadershipStyle: mapLeadershipStyle(row.leadership_style),
      commandStyle: mapCommandStyle(row.command_style),
      coinStyle: mapCoinStyle(row.coin_style),
    }
  })
}