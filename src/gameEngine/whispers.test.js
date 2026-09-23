import { describe, it, expect } from 'vitest'
import { ALL_ATTRIBUTE_KEYS } from '../data/attributes'
import {
  groupScores,
  buildSuspect,
  pickTarget,
  roundStatus,
  compareGuess,
  whisperFor,
  recordResult,
  EMPTY_STATS,
} from './whispers'

const flat = (n) => Object.fromEntries(ALL_ATTRIBUTE_KEYS.map((k) => [k, n]))
const suspect = (id, n, extra = {}) =>
  buildSuspect({
    id,
    name: `S${id}`,
    house: 'House Stark of Winterfell',
    attributes: flat(n),
    fightingStyle: 'swift',
    ...extra,
  })

describe('groupScores', () => {
  it('averages each standing', () => {
    expect(Object.values(groupScores(flat(40)))).toEqual([40, 40, 40, 40, 40, 40])
  })
  it('skips missing values and returns null for an empty standing', () => {
    const scores = groupScores({ strength: 80, speed: 60 })
    expect(scores.combat).toBe(70)
    expect(scores.wits).toBeNull()
  })
})

describe('buildSuspect', () => {
  it('derives region and style label', () => {
    const s = suspect(1, 50)
    expect(s.region).toBe('The North')
    expect(s.style).toBe('Swift')
  })
})

describe('roundStatus', () => {
  it('is won as soon as the target is guessed', () => {
    expect(roundStatus([3, 7], 7)).toBe('won')
  })
  it('is lost after the last wrong guess', () => {
    expect(roundStatus([1, 2, 3, 4, 5, 6], 9)).toBe('lost')
  })
  it('keeps playing otherwise', () => {
    expect(roundStatus([1], 9)).toBe('playing')
  })
})

describe('compareGuess', () => {
  it('points arrows towards the truth and marks close standings', () => {
    const { tiles } = compareGuess(suspect(1, 50), suspect(2, 55))
    expect(tiles.every((t) => t.direction === 'up' && t.near && !t.exact)).toBe(true)
  })
  it('marks cold standings as not near', () => {
    const { tiles } = compareGuess(suspect(1, 90), suspect(2, 40))
    expect(tiles.every((t) => t.direction === 'down' && !t.near)).toBe(true)
  })
  it('never counts an unknown region or style as a hit', () => {
    const a = suspect(1, 50, { house: 'Nowhere', fightingStyle: null })
    const b = suspect(2, 50, { house: 'Nowhere', fightingStyle: null })
    const traits = compareGuess(a, b).traits
    expect(traits.find((t) => t.id === 'house').hit).toBe(true)
    const noHouse = compareGuess(suspect(3, 50, { house: null }), suspect(4, 50, { house: null })).traits
    expect(noHouse.find((t) => t.id === 'house').hit).toBe(false)
    expect(traits.find((t) => t.id === 'region').hit).toBe(false)
    expect(traits.find((t) => t.id === 'style').hit).toBe(false)
  })
})

describe('pickTarget', () => {
  it('avoids repeating the previous target', () => {
    const roster = [suspect(1, 50), suspect(2, 50)]
    expect(pickTarget(roster, 1, () => 0).id).toBe(2)
  })
})

describe('whisperFor', () => {
  it('stays silent before the second guess', () => {
    expect(whisperFor(suspect(1, 50), 1)).toBeNull()
  })
  it('returns a hint from the second guess on', () => {
    expect(typeof whisperFor(suspect(1, 50), 2)).toBe('string')
  })
})

describe('recordResult', () => {
  it('grows the streak and best on a win', () => {
    expect(recordResult({ streak: 2, best: 2, solved: 5, played: 7 }, true)).toEqual({
      streak: 3,
      best: 3,
      solved: 6,
      played: 8,
    })
  })
  it('resets the streak but keeps best on a loss', () => {
    expect(recordResult({ ...EMPTY_STATS, streak: 4, best: 6 }, false)).toMatchObject({ streak: 0, best: 6 })
  })
})