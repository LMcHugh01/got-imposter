/**
 * data/ravens.js
 *
 * Settings and reference values for Ravens. The cards themselves live in
 * Supabase (ravens_cards) — see lib/ravensService.js.
 */

// Houses the players can play as, by slug in the houses table. Order is
// the order they're offered at setup.
export const TEAM_HOUSE_SLUGS = [
  'house-stark',
  'house-lannister',
  'house-targaryen',
  'house-baratheon',
  'house-greyjoy',
  'house-tyrell',
  'house-martell',
  'house-arryn',
]

export const MIN_TEAMS = 2
export const MAX_TEAMS = 4

export const CANDLE_OPTIONS = [30, 45, 60] // seconds per turn
export const ROUND_OPTIONS = [1, 2, 3, 4, 5] // every house describes once per round

// Every card ends one of two ways. A pass, a forbidden word, or a rival
// stealing the answer all cost the same point, so they share one button.
export const RESULTS = {
  got: { label: 'Got It', short: 'Got it', points: 1 },
  lost: { label: 'Lost It', short: 'Lost', points: -1 },
}

export const KIND_LABELS = {
  character: 'Character',
  house: 'House',
  place: 'Place',
  event: 'Event',
  object: 'Object',
  saying: 'Saying',
}

export const DEFAULT_SETTINGS = {
  teams: ['house-stark', 'house-lannister'],
  seconds: 60,
  rounds: 3,
  difficulties: ['easy', 'medium'],
  stealing: true,
  threeWords: false,
}