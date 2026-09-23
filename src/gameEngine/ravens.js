/**
 * gameEngine/ravens.js
 *
 * Pure rules for Ravens — no React, no timers, no storage — tested in
 * ravens.test.js. Time is passed in (`now`), so the clock is testable.
 *
 * A game:
 *   settings  { teams: [slug…], seconds, rounds, stealing, threeWords, difficulties }
 *   deck      [cardId…] shuffled; pos is the next card to show
 *   round     1-based; teamIndex is whose turn it is
 *   phase     'ready' | 'turn' | 'review' | 'final'
 *   endAt     when the candle burns out (ms timestamp) during a turn
 *   log       this turn's cards: [{ cardId, result }]
 *   history   finished turns: [{ teamIndex, round, log }]
 */
import { RESULTS } from '../data/ravens'

export function shuffle(items, random = Math.random) {
  const out = items.slice()
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

export function createGame(settings, cardIds, random = Math.random) {
  if (cardIds.length === 0) throw new Error('No cards to play with.')
  return {
    settings,
    deck: shuffle(cardIds, random),
    pos: 0,
    round: 1,
    teamIndex: 0,
    phase: 'ready',
    endAt: null,
    log: [],
    history: [],
  }
}

export function currentCardId(game) {
  return game.deck[game.pos % game.deck.length]
}

export function nextCardId(game) {
  return game.deck[(game.pos + 1) % game.deck.length]
}

export function startTurn(game, now) {
  if (game.phase !== 'ready') return game
  return { ...game, phase: 'turn', endAt: now + game.settings.seconds * 1000, log: [] }
}

export function secondsLeft(game, now) {
  if (game.phase !== 'turn') return game.settings.seconds
  return Math.max(0, Math.ceil((game.endAt - now) / 1000))
}

/** Record how the current card ended and move on to the next one. */
export function markCard(game, result, now) {
  if (game.phase !== 'turn' || !RESULTS[result]) return game
  if (now >= game.endAt) return endTurn(game)

  let { deck, pos } = game
  const log = [...game.log, { cardId: currentCardId(game), result }]
  pos += 1
  // Out of cards: reshuffle and keep going rather than end the game.
  if (pos >= deck.length) {
    deck = shuffle(deck)
    pos = 0
  }
  return { ...game, deck, pos, log }
}

export function endTurn(game) {
  if (game.phase !== 'turn') return game
  return { ...game, phase: 'review', endAt: null }
}

/** On the review screen: correct a mis-tap. */
export function setLogResult(game, index, result) {
  if (game.phase !== 'review' || !game.log[index] || !RESULTS[result]) return game
  const log = game.log.map((entry, i) => (i === index ? { ...entry, result } : entry))
  return { ...game, log }
}

/** Tapping a card on the review screen flips it between got and lost. */
export function nextResult(result) {
  return result === 'got' ? 'lost' : 'got'
}

export function isLastTurn(game) {
  return game.round === game.settings.rounds && game.teamIndex === game.settings.teams.length - 1
}

/** Commit the reviewed turn and pass the phone on (or finish). */
export function finishTurn(game) {
  if (game.phase !== 'review') return game
  const history = [...game.history, { teamIndex: game.teamIndex, round: game.round, log: game.log }]
  if (isLastTurn(game)) return { ...game, history, log: [], phase: 'final' }
  const wraps = game.teamIndex + 1 >= game.settings.teams.length
  return {
    ...game,
    history,
    log: [],
    phase: 'ready',
    teamIndex: wraps ? 0 : game.teamIndex + 1,
    round: wraps ? game.round + 1 : game.round,
  }
}

export function logScore(log) {
  return log.reduce((sum, entry) => sum + (entry.result === 'got' ? 1 : -1), 0)
}

/** Committed score per team (the turn under review isn't counted until it's finished). */
export function scores(game) {
  const totals = game.settings.teams.map(() => 0)
  game.history.forEach((turn) => {
    totals[turn.teamIndex] += logScore(turn.log)
  })
  return totals
}

/**
 * Teams ranked by score. Tied teams share a rank (1, 1, 3).
 * Returns [{ teamIndex, slug, score, rank }].
 */
export function standings(game) {
  const totals = scores(game)
  const ranked = game.settings.teams
    .map((slug, teamIndex) => ({ teamIndex, slug, score: totals[teamIndex] }))
    .sort((a, b) => b.score - a.score || a.teamIndex - b.teamIndex)
  return ranked.map((row) => ({ ...row, rank: 1 + ranked.filter((other) => other.score > row.score).length }))
}

export function winners(game) {
  return standings(game).filter((row) => row.rank === 1)
}

/** A fresh game with the same settings and a newly shuffled deck. */
export function rematch(game, random = Math.random) {
  return createGame(game.settings, game.deck, random)
}