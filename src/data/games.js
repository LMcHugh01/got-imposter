/**
 * data/games.js
 *
 * The one source for every game's details: its name, tagline ("A Game of
 * Deduction."), motto ("Six Guesses", shown under the name on its own
 * screen) and route. The Home page, the Games page and each game's own
 * screen all read them from here; each game's mark lives in
 * components/GameMark.jsx.
 *
 * Each game also carries what the filters need:
 *   mode     'solo' | 'pass'        (pass = pass-and-play on one phone)
 *   players  [min, max]
 *   minutes  [min, max]             rough length of one game or session
 *
 * Move a game from UPCOMING_GAMES into GAMES (with a `to` route) when it
 * launches and both pages pick it up.
 */

export const GAMES = [
  {
    id: 'imposter',
    title: 'Imposter',
    description: 'A Game of Subterfuge.',
    motto: 'One Traitor',
    to: '/games/imposter',
    mode: 'pass',
    players: [2, 20],
    minutes: [10, 20],
  },
  {
    id: 'campaign',
    title: 'Campaign',
    description: 'A Game of Strategy.',
    motto: 'Eight Battles',
    to: '/games/campaign',
    mode: 'solo',
    players: [1, 1],
    minutes: [30, 60],
  },
  {
    id: 'draft',
    title: 'Draft',
    description: 'A Game of Counsel.',
    motto: 'Ten Seats',
    to: '/games/draft',
    mode: 'solo',
    players: [1, 1],
    minutes: [5, 10],
  },
  {
    id: 'whispers',
    title: 'Whispers',
    description: 'A Game of Deduction.',
    motto: 'Six Guesses',
    to: '/games/whispers',
    mode: 'solo',
    players: [1, 1],
    minutes: [2, 10],
  },
  {
    id: 'allegiances',
    title: 'Allegiances',
    description: 'A Game of Diplomacy.',
    motto: 'Four Bonds',
    to: '/games/allegiances',
    mode: 'solo',
    players: [1, 1],
    minutes: [5, 10],
  },
  {
    id: 'ravens',
    title: 'Ravens',
    description: 'A Game of Speed.',
    motto: 'One Candle',
    to: '/games/ravens',
    mode: 'pass',
    players: [4, 20],
    minutes: [15, 30],
  },
]

/** A game's details by id ('draft', 'ravens', …). */
export function getGame(id) {
  const game = GAMES.find((g) => g.id === id)
  if (!game) throw new Error(`Unknown game: ${id}`)
  return game
}

export const UPCOMING_GAMES = [{ id: 'trivia', title: 'Trivia', description: 'A Game of Scholarship.' }]

export const EXPLORE = [
  { id: 'map', title: 'The Map', description: 'The lands of the realm, from the Wall to Dorne.', to: '/maps' },
  { id: 'characters', title: 'Characters', description: 'The lords, knights and wanderers of Westeros.', to: '/characters' },
  { id: 'houses', title: 'Houses', description: 'The great houses, their sigils and their words.', to: '/houses' },
]

// The four games shown on the home page: two to pass around, two to play
// alone. Every game is on the Games page.
export const FEATURED_GAMES = ['imposter', 'ravens', 'allegiances', 'campaign']

/* ---------------- filters ---------------- */

export const MODE_FILTERS = [
  { id: 'any', label: 'Any' },
  { id: 'solo', label: 'Solo' },
  { id: 'pass', label: 'Pass & Play' },
]

export const PLAYER_FILTERS = [
  { id: 'any', label: 'Any' },
  { id: '1', label: '1', range: [1, 1] },
  { id: '2-3', label: '2–3', range: [2, 3] },
  { id: '4-7', label: '4–7', range: [4, 7] },
  { id: '8+', label: '8+', range: [8, 99] },
]

export const LENGTH_FILTERS = [
  { id: 'any', label: 'Any' },
  { id: 'quick', label: 'Under 10 min' },
  { id: 'long', label: 'Longer' },
]

export const NO_FILTERS = { mode: 'any', players: 'any', length: 'any' }

/** Games matching every chosen filter. A game fits a player range if the ranges overlap. */
export function filterGames(games, filters) {
  const players = PLAYER_FILTERS.find((p) => p.id === filters.players)?.range
  return games.filter((g) => {
    if (filters.mode !== 'any' && g.mode !== filters.mode) return false
    if (players && (g.players[0] > players[1] || g.players[1] < players[0])) return false
    if (filters.length === 'quick' && g.minutes[0] >= 10) return false
    if (filters.length === 'long' && g.minutes[1] <= 10) return false
    return true
  })
}

export function describeGame(game) {
  const mode = game.mode === 'pass' ? 'Pass & Play' : 'Solo'
  const [pMin, pMax] = game.players
  const players = pMax === 1 ? '1 player' : pMin === pMax ? `${pMin} players` : `${pMin}–${pMax} players`
  const [mMin, mMax] = game.minutes
  const minutes = mMin === mMax ? `${mMin} min` : `${mMin}–${mMax} min`
  return { mode, players, minutes }
}