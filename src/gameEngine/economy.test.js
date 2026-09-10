import { describe, it, expect } from 'vitest'
import { recruit, recover, recruitmentCostPerSoldier } from './economy'
import { createInitialResources } from './resources'

describe('recruitmentCostPerSoldier', () => {
  it('gets more expensive as the current army grows', () => {
    const cheap = recruitmentCostPerSoldier({ currentArmy: 5000, masterOfCoinRating: 50, stability: 75 })
    const expensive = recruitmentCostPerSoldier({ currentArmy: 50000, masterOfCoinRating: 50, stability: 75 })
    expect(expensive).toBeGreaterThan(cheap)
  })

  it('a better Master of Coin lowers the cost per soldier', () => {
    const weak = recruitmentCostPerSoldier({ currentArmy: 10000, masterOfCoinRating: 20, stability: 75 })
    const strong = recruitmentCostPerSoldier({ currentArmy: 10000, masterOfCoinRating: 90, stability: 75 })
    expect(strong).toBeLessThan(weak)
  })
})

describe('recruit', () => {
  it('increases army and decreases gold', () => {
    const resources = createInitialResources()
    const { resources: next, soldiersGained } = recruit({ resources, goldToSpend: 5000, masterOfCoinRating: 50 })
    expect(soldiersGained).toBeGreaterThan(0)
    expect(next.army).toBe(resources.army + soldiersGained)
    expect(next.gold).toBe(resources.gold - 5000)
  })

  it('throws if spending more gold than available', () => {
    const resources = createInitialResources()
    expect(() => recruit({ resources, goldToSpend: resources.gold + 1, masterOfCoinRating: 50 })).toThrow()
  })

  it('throws on a non-positive spend', () => {
    const resources = createInitialResources()
    expect(() => recruit({ resources, goldToSpend: 0, masterOfCoinRating: 50 })).toThrow()
  })
})

describe('recover', () => {
  it('matches the doc\'s worked example: 3,000 gold -> 2,000 soldiers + 5 morale', () => {
    const resources = createInitialResources()
    const { soldiersReturned, moraleGained } = recover({ resources, goldToSpend: 3000 })
    expect(soldiersReturned).toBe(2000)
    expect(moraleGained).toBe(5)
  })

  it('applies the deltas to resources', () => {
    const resources = createInitialResources()
    const { resources: next } = recover({ resources, goldToSpend: 3000 })
    expect(next.army).toBe(resources.army + 2000)
    expect(next.gold).toBe(resources.gold - 3000)
    expect(next.morale).toBe(resources.morale + 5)
  })

  it('throws if spending more gold than available', () => {
    const resources = createInitialResources()
    expect(() => recover({ resources, goldToSpend: resources.gold + 1 })).toThrow()
  })
})
