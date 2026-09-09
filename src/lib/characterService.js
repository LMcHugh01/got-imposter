import { supabase } from './supabase'

// Difficulty is cumulative: 'medium' pulls easy+medium characters,
// 'hard' pulls the full pool. Matches the original fallback behavior.
const DIFFICULTY_LEVELS = {
  easy: ['easy'],
  medium: ['easy', 'medium'],
  hard: ['easy', 'medium', 'hard'],
}

/**
 * Fetch one random active character at or below the given difficulty.
 *
 * Throws on failure or an empty result — this is the only place the app
 * talks to character data, so callers (Settings.jsx) are expected to catch
 * this and show a recoverable error rather than crash. There is no local
 * fallback dataset anymore; Supabase is the single source of truth.
 */
export async function fetchRandomCharacter(difficulty) {
  const levels = DIFFICULTY_LEVELS[difficulty] ?? DIFFICULTY_LEVELS.easy

  const { data, error } = await supabase
    .from('characters')
    .select('*')
    .eq('active', true)
    .in('difficulty', levels)

  if (error) {
    throw new Error(`Failed to fetch characters: ${error.message}`)
  }

  if (!data || data.length === 0) {
    throw new Error(`No active characters found for difficulty "${difficulty}"`)
  }

  const random = Math.floor(Math.random() * data.length)
  return data[random]
}
