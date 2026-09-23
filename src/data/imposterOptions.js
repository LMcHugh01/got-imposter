/**
 * data/imposterOptions.js
 *
 * Everything the Imposter setup screen lets players choose from.
 *
 * DIFFICULTIES — multi-select. Players can mix any combination
 * (e.g. Easy + Hard). At least one is always selected.
 *
 * SOURCE_GROUPS — which shows / lore the character pool comes from.
 * Flip `available` to true once the characters for that source are
 * seeded in Supabase (with a matching `source` column value) and the
 * option becomes selectable automatically — no UI changes needed.
 */

export const DIFFICULTIES = [
  { id: 'easy', label: 'Easy', note: 'Well-known characters' },
  { id: 'medium', label: 'Medium', note: 'Supporting cast and lesser houses' },
  { id: 'hard', label: 'Hard', note: 'Deep cuts from across the realm' },
]

export const DIFFICULTY_IDS = DIFFICULTIES.map((d) => d.id)

const COMBO_NOTES = {
  'easy+medium': 'Well-known characters and the supporting cast',
  'easy+hard': 'Household names mixed with deep cuts',
  'medium+hard': 'Supporting cast and deep cuts from across the realm',
  'easy+medium+hard': 'Every character in the realm, famous to forgotten',
}

/**
 * Accepts an array, a single id string (legacy store value), or nothing.
 * Always returns a non-empty array in canonical order (easy → hard).
 */
export function normalizeDifficulties(value) {
  const list = Array.isArray(value) ? value : value ? [value] : []
  const clean = DIFFICULTY_IDS.filter((id) => list.includes(id))
  return clean.length ? clean : ['easy']
}

export function describeDifficulties(ids) {
  const list = normalizeDifficulties(ids)
  if (list.length === 1) return DIFFICULTIES.find((d) => d.id === list[0]).note
  return COMBO_NOTES[list.join('+')]
}

export function difficultyLabels(ids) {
  return normalizeDifficulties(ids).map((id) => DIFFICULTIES.find((d) => d.id === id).label)
}

export const SOURCE_GROUPS = [
  {
    id: 'shows',
    label: 'The Shows',
    options: [
      { id: 'got', label: 'Game of Thrones', detail: 'The War of the Five Kings and beyond', available: true },
      { id: 'hotd', label: 'House of the Dragon', detail: 'The Targaryens and the Dance of the Dragons', available: false },
      { id: 'kotsk', label: 'A Knight of the Seven Kingdoms', detail: 'The travels of Dunk and Egg', available: false },
    ],
  },
  {
    id: 'lore',
    label: 'The Lore',
    options: [
      { id: 'lore', label: 'Book Lore', detail: 'Spoken of or written about, never seen on screen', available: false },
    ],
  },
]

export const ALL_SOURCES = SOURCE_GROUPS.flatMap((g) => g.options)
export const DEFAULT_SOURCES = ALL_SOURCES.filter((s) => s.available).map((s) => s.id)
