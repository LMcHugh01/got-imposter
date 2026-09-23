import { describe, it, expect } from 'vitest'
import {
  createGame,
  currentCardId,
  startTurn,
  secondsLeft,
  markCard,
  endTurn,
  setLogResult,
  nextResult,
  finishTurn,
  logScore,
  scores,
  standings,
  winners,
  rematch,
} from './ravens'

const settings = (over = {}) => ({
  teams: ['house-stark', 'house-lannister'],
  seconds: 60,
  rounds: 2,
  stealing: true,
  threeWords: false,
  difficulties: ['easy'],
  ...over,
})
const ordered = () => 0.999 // keeps shuffle stable enough for tests
const T0 = 1_000_000

function playTurn(game, results, now = T0) {
  let g = startTurn(game, now)
  results.forEach((r) => {
    g = markCard(g, r, now + 1000)
  })
  return finishTurn(endTurn(g))
}

describe('createGame', () => {
  it('starts on the ready screen for the first house', () => {
    const g = createGame(settings(), [1, 2, 3])
    expect(g.phase).toBe('ready')
    expect(g.teamIndex).toBe(0)
    expect(g.round).toBe(1)
  })
  it('refuses an empty deck', () => {
    expect(() => createGame(settings(), [])).toThrow()
  })
})

describe('the candle', () => {
  it('counts down from the chosen length', () => {
    const g = startTurn(createGame(settings({ seconds: 45 }), [1]), T0)
    expect(secondsLeft(g, T0)).toBe(45)
    expect(secondsLeft(g, T0 + 44_100)).toBe(1)
    expect(secondsLeft(g, T0 + 60_000)).toBe(0)
  })
  it('ends the turn instead of scoring a tap made after it burned out', () => {
    const g = markCard(startTurn(createGame(settings(), [1, 2]), T0), 'got', T0 + 61_000)
    expect(g.phase).toBe('review')
    expect(g.log).toEqual([])
  })
})

describe('marking cards', () => {
  it('logs the card and moves to the next one', () => {
    let g = startTurn(createGame(settings(), [1, 2, 3], ordered), T0)
    const first = currentCardId(g)
    g = markCard(g, 'got', T0 + 1)
    expect(g.log).toEqual([{ cardId: first, result: 'got' }])
    expect(currentCardId(g)).not.toBe(first)
  })
  it('reshuffles when the deck runs out rather than stopping', () => {
    let g = startTurn(createGame(settings(), [1, 2]), T0)
    for (let i = 0; i < 5; i++) g = markCard(g, 'lost', T0 + 1)
    expect(g.log).toHaveLength(5)
    expect(g.phase).toBe('turn')
  })
  it('ignores anything but got and lost', () => {
    const g = markCard(startTurn(createGame(settings(), [1, 2]), T0), 'pass', T0 + 1)
    expect(g.log).toEqual([])
  })
})

describe('scoring', () => {
  it('gives +1 for a guess and -1 for pass, forbidden and stolen', () => {
    expect(
      logScore([
        { result: 'got' },
        { result: 'got' },
        { result: 'pass' },
        { result: 'forbidden' },
        { result: 'stolen' },
      ]),
    ).toBe(-1)
  })
  it('only counts a turn once it is finished', () => {
    let g = startTurn(createGame(settings(), [1, 2, 3]), T0)
    g = endTurn(markCard(g, 'got', T0 + 1))
    expect(scores(g)).toEqual([0, 0])
    expect(scores(finishTurn(g))).toEqual([1, 0])
  })
})

describe('review corrections', () => {
  it('lets a mis-tap be fixed before the turn is committed', () => {
    let g = startTurn(createGame(settings(), [1, 2, 3]), T0)
    g = endTurn(markCard(g, 'lost', T0 + 1))
    g = setLogResult(g, 0, 'got')
    expect(scores(finishTurn(g))).toEqual([1, 0])
  })
  it('flips a card between got and lost', () => {
    expect(nextResult('got')).toBe('lost')
    expect(nextResult('lost')).toBe('got')
  })
})

describe('turn order and the end of the game', () => {
  it('passes to each house, then starts the next round', () => {
    let g = playTurn(createGame(settings(), [1, 2, 3]), ['got'])
    expect([g.teamIndex, g.round, g.phase]).toEqual([1, 1, 'ready'])
    g = playTurn(g, ['got'])
    expect([g.teamIndex, g.round, g.phase]).toEqual([0, 2, 'ready'])
  })
  it('supports a single round', () => {
    let g = createGame(settings({ rounds: 1 }), [1, 2, 3])
    g = playTurn(playTurn(g, ['got']), ['lost'])
    expect(g.phase).toBe('final')
  })
  it('finishes after the last house in the last round', () => {
    let g = createGame(settings({ rounds: 1 }), [1, 2, 3])
    g = playTurn(g, ['got', 'got'])
    g = playTurn(g, ['got'])
    expect(g.phase).toBe('final')
    expect(winners(g).map((w) => w.slug)).toEqual(['house-stark'])
  })
  it('shares first place on a tie', () => {
    let g = createGame(settings({ rounds: 1 }), [1, 2, 3])
    g = playTurn(g, ['got'])
    g = playTurn(g, ['got'])
    expect(winners(g)).toHaveLength(2)
    expect(standings(g).map((s) => s.rank)).toEqual([1, 1])
  })
  it('ranks after a tie skip a place', () => {
    let g = createGame(settings({ teams: ['a', 'b', 'c'], rounds: 1 }), [1, 2, 3])
    g = playTurn(g, ['got'])
    g = playTurn(g, ['got'])
    g = playTurn(g, ['lost'])
    expect(standings(g).map((s) => s.rank)).toEqual([1, 1, 3])
  })
  it('rematch keeps the settings and clears the scores', () => {
    let g = playTurn(createGame(settings({ rounds: 1 }), [1, 2, 3]), ['got'])
    g = playTurn(g, ['got'])
    const r = rematch(g)
    expect(r.settings).toEqual(g.settings)
    expect(r.history).toEqual([])
    expect(r.phase).toBe('ready')
  })
})