import { supabase } from './supabase'

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
 *   { id, name, house, attributes: { combat, leadership, ... } }
 */
export async function fetchDraftablePool() {
  const { data, error } = await supabase.from('character_attributes').select(`
    character_id,
    combat, leadership, strategy, intelligence, politics, diplomacy, loyalty, economy,
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
