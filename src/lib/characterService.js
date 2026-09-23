import { supabase } from './supabase'
import { normalizeDifficulties } from '../data/imposterOptions'

/**
 * Fetch one random active character from the selected difficulties.
 *
 * Difficulties are no longer cumulative: the player picks exactly which
 * tiers to include, so ['easy', 'hard'] draws from easy and hard only.
 * A single string (the old store value) is still accepted.
 *
 * Throws on failure or an empty result — callers (Settings.jsx) catch
 * this and show a recoverable error. Supabase is the single source of truth.
 *
 * Sources (Game of Thrones / House of the Dragon / A Knight of the Seven
 * Kingdoms / Lore): once the `characters` table has a `source` column,
 * add `sources` as a second argument and chain `.in('source', sources)`.
 * Until then every character is Game of Thrones, so no filter is needed.
 */
export async function fetchRandomCharacter(difficulties) {
  const levels = normalizeDifficulties(difficulties)

  const { data, error } = await supabase
    .from('characters')
    .select('*')
    .eq('active', true)
    .in('difficulty', levels)

  if (error) {
    throw new Error(`Failed to fetch characters: ${error.message}`)
  }

  if (!data || data.length === 0) {
    throw new Error(`No active characters found for difficulty "${levels.join(', ')}"`)
  }

  const random = Math.floor(Math.random() * data.length)
  return data[random]
}
