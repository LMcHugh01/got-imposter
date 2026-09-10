import { describe, it, expect } from 'vitest'
import { computeAllianceChance, attemptAlliance } from './diplomacy'
import { createInitialResources } from './resources'

const targetHouse = { armySize: 30000, personality: 'diplomatic' }

describe('computeAllianceChance', () => {
  it('is never a guaranteed success or hopeless failure', () => {
    const chance = computeAllianceChance({
      diplomacyRating: 50, goldOffered: 5000, soldiersRequested: 2000, enemyHouse: targetHouse,
    })
    expect(chance).toBeGreaterThan(0.04)
    expect(chance).toBeLessThan(0.91)
  })

  it('a more generous offer (relative to what is requested) increases the chance', () => {
    const stingy = computeAllianceChance({
      diplomacyRating: 50, goldOffered: 500, soldiersRequested: 5000, enemyHouse: targetHouse,
    })
    const generous = computeAllianceChance({
      diplomacyRating: 50, goldOffered: 20000, soldiersRequested: 5000, enemyHouse: targetHouse,
    })
    expect(generous).toBeGreaterThan(stingy)
  })

  it('asking for a huge fraction of their army lowers the chance, all else equal', () => {
    const modest = computeAllianceChance({
      diplomacyRating: 50, goldOffered: 5000, soldiersRequested: 2000, enemyHouse: targetHouse,
    })
    const greedy = computeAllianceChance({
      diplomacyRating: 50, goldOffered: 5000, soldiersRequested: 25000, enemyHouse: targetHouse,
    })
    expect(greedy).toBeLessThan(modest)
  })

  it('personality shifts the chance independent of the offer', () => {
    const diplomatic = computeAllianceChance({
      diplomacyRating: 50, goldOffered: 5000, soldiersRequested: 2000,
      enemyHouse: { ...targetHouse, personality: 'diplomatic' },
    })
    const aggressive = computeAllianceChance({
      diplomacyRating: 50, goldOffered: 5000, soldiersRequested: 2000,
      enemyHouse: { ...targetHouse, personality: 'aggressive' },
    })
    expect(diplomatic).toBeGreaterThan(aggressive)
  })
})

describe('attemptAlliance', () => {
  it('always spends the gold, win or lose', () => {
    const resources = createInitialResources()
    const rejected = attemptAlliance({
      resources, diplomacyRating: 50, goldOffered: 3000, soldiersRequested: 2000,
      targetHouseName: 'House Tully', enemyHouse: targetHouse, rng: () => 0.99,
    })
    expect(rejected.accepted).toBe(false)
    expect(rejected.resources.gold).toBe(resources.gold - 3000)
    expect(rejected.resources.alliances).toHaveLength(0)
  })

  it('on success, adds an alliance for exactly the requested soldiers', () => {
    const resources = createInitialResources()
    const result = attemptAlliance({
      resources, diplomacyRating: 80, goldOffered: 10000, soldiersRequested: 3000,
      targetHouseName: 'House Tully', enemyHouse: targetHouse, rng: () => 0,
    })
    expect(result.accepted).toBe(true)
    expect(result.contribution).toBe(3000)
    expect(result.resources.alliances).toHaveLength(1)
    expect(result.resources.alliances[0].houseName).toBe('House Tully')
    expect(result.resources.army).toBe(resources.army + 3000)
  })

  it('throws if offering more gold than available', () => {
    const resources = createInitialResources()
    expect(() =>
      attemptAlliance({
        resources, diplomacyRating: 50, goldOffered: resources.gold + 1, soldiersRequested: 1000,
        targetHouseName: 'x', enemyHouse: targetHouse,
      })
    ).toThrow()
  })

  it('throws on non-positive terms', () => {
    const resources = createInitialResources()
    expect(() =>
      attemptAlliance({
        resources, diplomacyRating: 50, goldOffered: 0, soldiersRequested: 1000,
        targetHouseName: 'x', enemyHouse: targetHouse,
      })
    ).toThrow()
    expect(() =>
      attemptAlliance({
        resources, diplomacyRating: 50, goldOffered: 1000, soldiersRequested: 0,
        targetHouseName: 'x', enemyHouse: targetHouse,
      })
    ).toThrow()
  })
})