import { describe, it, expect } from 'vitest'
import { applyEvent, mergeRecords, withDefaults, isEmptyRecord, seedRecord, EMPTY_RECORD } from './record'
import { HONOURS, newlyEarned, honourProgress } from '../data/honours'
import { PATIENCE } from '../data/allegiances'

const play = (events) => events.reduce((r, [g, e]) => applyEvent(r, g, e), withDefaults({}))

describe('applyEvent', () => {
  it('tracks Whispers streaks, bests and first/last-guess solves', () => {
    const r = play([
      ['whispers', { won: true, guesses: 1 }],
      ['whispers', { won: true, guesses: 6 }],
      ['whispers', { won: false, guesses: 6 }],
      ['whispers', { won: true, guesses: 3 }],
    ])
    expect(r.whispers).toEqual({ played: 4, solved: 3, streak: 1, best: 2, firstGuess: 1, lastGuess: 1 })
  })
  it('tracks flawless and last-patience Allegiances clears', () => {
    const r = play([
      ['allegiances', { won: true, mistakes: 0 }],
      ['allegiances', { won: true, mistakes: PATIENCE - 1 }], // one patience left
      ['allegiances', { won: false, mistakes: PATIENCE }],
    ])
    expect(r.allegiances).toEqual({ played: 3, solved: 2, flawless: 1, lastPatience: 1 })
  })
  it('keeps the best Draft rating', () => {
    expect(play([['draft', { rating: 84.4 }], ['draft', { rating: 71 }]]).draft).toEqual({ drafts: 2, best: 84 })
  })
  it('counts Campaign battles, duels and wins', () => {
    const r = play([
      ['campaign', { type: 'battle', won: true, battleNumber: 1 }],
      ['campaign', { type: 'battle', won: true, duel: true, battleNumber: 2 }],
      ['campaign', { type: 'battle', won: false, battleNumber: 3 }],
      ['campaign', { type: 'campaign', won: true, flawless: false }],
    ])
    expect(r.campaign).toEqual({ battlesWon: 2, duelsWon: 1, won: 1, flawlessWins: 0, furthest: 2 })
  })
  it('ignores unknown games', () => {
    expect(applyEvent({}, 'ravens', { won: true })).toEqual(EMPTY_RECORD)
  })
})

describe('mergeRecords', () => {
  it('adds counts and keeps the larger best, streak and furthest', () => {
    const a = play([['whispers', { won: true, guesses: 2 }], ['whispers', { won: true, guesses: 2 }]])
    const b = play([['whispers', { won: true, guesses: 1 }], ['draft', { rating: 90 }]])
    const m = mergeRecords(a, b)
    expect(m.whispers).toMatchObject({ played: 3, solved: 3, best: 2, streak: 2, firstGuess: 1 })
    expect(m.draft).toEqual({ drafts: 1, best: 90 })
  })
})

describe('seedRecord and isEmptyRecord', () => {
  it('carries over pre-account Whispers and Allegiances stats', () => {
    const r = seedRecord({ whispers: { streak: 4, best: 9, solved: 20, played: 25 }, allegiances: { solved: 2, played: 3 } })
    expect(r.whispers).toMatchObject({ played: 25, solved: 20, streak: 4, best: 9 })
    expect(r.allegiances).toMatchObject({ played: 3, solved: 2 })
    expect(isEmptyRecord(r)).toBe(false)
    expect(isEmptyRecord(seedRecord({}))).toBe(true)
  })
})

describe('honours', () => {
  it('has sixteen honours with unique ids', () => {
    expect(HONOURS).toHaveLength(16)
    expect(new Set(HONOURS.map((h) => h.id)).size).toBe(16)
  })
  it('awards Sworn to every signed-in player', () => {
    expect(newlyEarned(withDefaults({}), [])).toEqual(['sworn'])
  })
  it('awards game honours at their thresholds, once', () => {
    const r = play([['draft', { rating: 91 }]])
    expect(newlyEarned(r, ['sworn']).sort()).toEqual(['fit-for-a-king', 'kingmaker'])
    expect(newlyEarned(r, ['sworn', 'fit-for-a-king', 'kingmaker'])).toEqual([])
  })
  it('chains the realm honours in one pass', () => {
    const r = play([
      ['whispers', { won: true, guesses: 1 }],
      ['allegiances', { won: true, mistakes: 0 }],
      ['draft', { rating: 95 }],
      ['campaign', { type: 'battle', won: true, duel: true, battleNumber: 8 }],
      ['campaign', { type: 'campaign', won: true, flawless: true }],
    ])
    const earned = newlyEarned(r, [])
    expect(earned).toContain('a-song-of-ice-and-fire')
    // sworn + a-little-bird + silver-tongue + 2 draft + 3 campaign + song = 9, so not yet Lord Paramount
    expect(earned).not.toContain('lord-paramount')
    expect(earned).toHaveLength(9)
  })
  it('reports progress for the account page, capped at the target', () => {
    const h = HONOURS.find((x) => x.id === 'the-long-night')
    const r = play(Array.from({ length: 35 }, () => ['whispers', { won: true, guesses: 3 }]))
    expect(honourProgress(h, r, new Set())).toEqual({ current: 30, target: 30, done: true })
  })
})