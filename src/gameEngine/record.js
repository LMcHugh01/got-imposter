/**
 * gameEngine/record.js
 *
 * A player's record across the tracked games, and how each game result
 * changes it. Pure functions — tested in record.test.js. The same record is
 * kept on the device for guests and in Supabase (game_stats) for players.
 */
import { PATIENCE } from '../data/allegiances'

export const TRACKED_GAMES = ['whispers', 'allegiances', 'draft', 'campaign']

export const EMPTY_RECORD = {
  whispers: { played: 0, solved: 0, streak: 0, best: 0, firstGuess: 0, lastGuess: 0 },
  allegiances: { played: 0, solved: 0, flawless: 0, lastPatience: 0 },
  draft: { drafts: 0, best: 0 },
  campaign: { battlesWon: 0, duelsWon: 0, won: 0, flawlessWins: 0, furthest: 0 },
}

// Fields merged by taking the larger value; everything else is a count and adds up.
const MAX_FIELDS = new Set(['streak', 'best', 'furthest'])

export function withDefaults(record = {}) {
  return Object.fromEntries(
    TRACKED_GAMES.map((g) => [g, { ...EMPTY_RECORD[g], ...(record[g] ?? {}) }])
  )
}

/** Apply one game result. Returns a new record. */
export function applyEvent(record, game, event) {
  const r = withDefaults(record)
  const s = { ...r[game] }

  if (game === 'whispers') {
    s.played += 1
    if (event.won) {
      s.solved += 1
      s.streak += 1
      if (event.guesses === 1) s.firstGuess += 1
      if (event.guesses === 6) s.lastGuess += 1
    } else {
      s.streak = 0
    }
    s.best = Math.max(s.best, s.streak)
  } else if (game === 'allegiances') {
    s.played += 1
    if (event.won) {
      s.solved += 1
      if (event.mistakes === 0) s.flawless += 1
      if (event.mistakes === PATIENCE - 1) s.lastPatience += 1
    }
  } else if (game === 'draft') {
    s.drafts += 1
    s.best = Math.max(s.best, Math.round(event.rating ?? 0))
  } else if (game === 'campaign') {
    if (event.type === 'battle' && event.won) {
      s.battlesWon += 1
      if (event.duel) s.duelsWon += 1
      s.furthest = Math.max(s.furthest, event.battleNumber ?? 0)
    }
    if (event.type === 'campaign' && event.won) {
      s.won += 1
      if (event.flawless) s.flawlessWins += 1
    }
  } else {
    return r
  }
  return { ...r, [game]: s }
}

/** Combine two records, e.g. a guest's device record into an account. */
export function mergeRecords(a, b) {
  const ra = withDefaults(a)
  const rb = withDefaults(b)
  return Object.fromEntries(
    TRACKED_GAMES.map((g) => [
      g,
      Object.fromEntries(
        Object.keys(EMPTY_RECORD[g]).map((k) => [
          k,
          MAX_FIELDS.has(k) ? Math.max(ra[g][k], rb[g][k]) : ra[g][k] + rb[g][k],
        ])
      ),
    ])
  )
}

export function isEmptyRecord(record) {
  const r = withDefaults(record)
  return TRACKED_GAMES.every((g) => Object.values(r[g]).every((v) => v === 0))
}

/**
 * A starting record for a device that already has Whispers and Allegiances
 * stats from before accounts existed, so that history isn't lost.
 */
export function seedRecord({ whispers, allegiances } = {}) {
  const r = withDefaults({})
  if (whispers) {
    r.whispers = {
      ...r.whispers,
      played: whispers.played ?? 0,
      solved: whispers.solved ?? 0,
      streak: whispers.streak ?? 0,
      best: whispers.best ?? 0,
    }
  }
  if (allegiances) {
    r.allegiances = { ...r.allegiances, played: allegiances.played ?? 0, solved: allegiances.solved ?? 0 }
  }
  return r
}
