import { supabase } from './supabase'
import { normalizeDifficulties } from '../data/imposterOptions'
import { TEAM_HOUSE_SLUGS } from '../data/ravens'

/**
 * lib/ravensService.js
 *
 * Cards come from the ravens_cards table, joined to characters (portrait)
 * and houses (sigil) through their optional links.
 */
export async function fetchRavensCards(difficulties) {
  const levels = normalizeDifficulties(difficulties)
  const { data, error } = await supabase
    .from('ravens_cards')
    .select('id, kind, answer, forbidden_words, difficulty, characters(image_url), houses(image_url)')
    .eq('active', true)
    .in('difficulty', levels)

  if (error) throw new Error(`Failed to fetch Ravens cards: ${error.message}`)

  return (data ?? []).map((row) => ({
    id: row.id,
    kind: row.kind,
    answer: row.answer,
    forbidden: row.forbidden_words ?? [],
    difficulty: row.difficulty,
    imageUrl: row.characters?.image_url || row.houses?.image_url || null,
    imageKind: row.characters?.image_url ? 'portrait' : row.houses?.image_url ? 'sigil' : null,
  }))
}

/** The great houses players can play as, with their sigils and colours. */
export async function fetchTeamHouses() {
  const { data, error } = await supabase
    .from('houses')
    .select('slug, name, image_url, sigil_emoji, tinct_from, words')
    .in('slug', TEAM_HOUSE_SLUGS)

  if (error) throw new Error(`Failed to fetch houses: ${error.message}`)

  const bySlug = Object.fromEntries((data ?? []).map((h) => [h.slug, h]))
  // Keep the chosen display order, and still offer a house if its row is missing.
  return TEAM_HOUSE_SLUGS.map((slug) => {
    const h = bySlug[slug]
    const fallbackName = slug.replace(/^house-/, 'House ').replace(/\b\w/g, (c) => c.toUpperCase())
    return {
      slug,
      name: h?.name ?? fallbackName,
      imageUrl: h?.image_url ?? null,
      emoji: h?.sigil_emoji ?? null,
      tint: h?.tinct_from ?? null,
      words: h?.words ?? null,
    }
  })
}
