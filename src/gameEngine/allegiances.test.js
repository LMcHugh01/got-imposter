import { describe, it, expect } from 'vitest'
import { ASSEMBLIES, PATIENCE } from '../data/allegiances'
import { newRound, togglePick, presentPick, groupOf, verdict, recordResult, EMPTY_STATS } from './allegiances'

const A = ASSEMBLIES[0]
const pickAll = (round, names) => names.reduce((r, n) => togglePick(r, n), round)
const group = (i) => A.groups[i].names

describe('assembly data', () => {
  it.each(ASSEMBLIES.map((a) => [a.name, a]))('%s has sixteen distinct names in four groups of four', (_, a) => {
    const names = a.groups.flatMap((g) => g.names)
    expect(a.groups).toHaveLength(4)
    a.groups.forEach((g) => expect(g.names).toHaveLength(4))
    expect(new Set(names).size).toBe(16)
  })
  it('uses unique ids', () => {
    expect(new Set(ASSEMBLIES.map((a) => a.id)).size).toBe(ASSEMBLIES.length)
  })
})

describe('newRound', () => {
  it('lays out all sixteen names', () => {
    const r = newRound(A)
    expect(r.order).toHaveLength(16)
    expect(r.status).toBe('playing')
  })
})

describe('togglePick', () => {
  it('selects, deselects, and caps at four', () => {
    let r = pickAll(newRound(A), group(0))
    expect(r.picked).toHaveLength(4)
    r = togglePick(r, group(1)[0])
    expect(r.picked).toHaveLength(4)
    r = togglePick(r, group(0)[0])
    expect(r.picked).toHaveLength(3)
  })
})

describe('presentPick', () => {
  it('solves a correct group and removes its names from the board', () => {
    const { round, outcome } = presentPick(pickAll(newRound(A), group(2)), A)
    expect(outcome).toBe('correct')
    expect(round.solved).toEqual([2])
    expect(round.order).toHaveLength(12)
    expect(round.picked).toEqual([])
  })

  it('reports one away when three share a group, keeping the pick', () => {
    const names = [...group(0).slice(0, 3), group(1)[0]]
    const { round, outcome } = presentPick(pickAll(newRound(A), names), A)
    expect(outcome).toBe('oneAway')
    expect(round.mistakes).toBe(1)
    expect(round.picked).toHaveLength(4)
  })

  it('reports a plain miss otherwise', () => {
    const names = [group(0)[0], group(1)[0], group(2)[0], group(3)[0]]
    expect(presentPick(pickAll(newRound(A), names), A).outcome).toBe('wrong')
  })

  it('wins when all four groups are found', () => {
    let r = newRound(A)
    let outcome
    for (let i = 0; i < 4; i++) ({ round: r, outcome } = presentPick(pickAll(r, group(i)), A))
    expect(outcome).toBe('won')
    expect(r.status).toBe('won')
  })

  it('loses after running out of patience and reveals every group', () => {
    const bad = [group(0)[0], group(1)[0], group(2)[0], group(3)[0]]
    let r = pickAll(newRound(A), bad)
    let outcome
    for (let i = 0; i < PATIENCE; i++) ({ round: r, outcome } = presentPick(r, A))
    expect(outcome).toBe('lost')
    expect(r.solved.slice().sort()).toEqual([0, 1, 2, 3])
    expect(r.order).toEqual([])
  })

  it('ignores anything but exactly four', () => {
    expect(presentPick(togglePick(newRound(A), group(0)[0]), A).outcome).toBe('invalid')
  })
})

describe('groupOf', () => {
  it('finds a name’s group', () => {
    expect(groupOf(A, 'Osha')).toBe(3)
  })
})

describe('verdict and stats', () => {
  it('titles a flawless win', () => {
    expect(verdict({ status: 'won', mistakes: 0 }).title).toBe('Named Without Error')
  })
  it('counts plays and solves', () => {
    expect(recordResult(recordResult(EMPTY_STATS, true), false)).toEqual({ solved: 1, played: 2 })
  })
})
