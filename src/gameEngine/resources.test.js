import { describe, it, expect } from 'vitest'
import {
  createInitialResources,
  applyResourceDeltas,
  addAlliance,
  totalAlliedSoldiers,
} from './resources'

describe('createInitialResources', () => {
  it('matches the starting values from §8', () => {
    const resources = createInitialResources()
    expect(resources.army).toBe(10000)
    expect(resources.gold).toBe(25000)
    expect(resources.morale).toBe(75)
    expect(resources.stability).toBe(75)
    expect(resources.supply).toBe(80)
    expect(resources.alliances).toEqual([])
  })

  it('starts with a troops breakdown that sums exactly to army', () => {
    const resources = createInitialResources()
    const { infantry, archers, cavalry } = resources.troops
    expect(infantry + archers + cavalry).toBe(resources.army)
    // Infantry-heavy starting mix (BATTLE_PLAN.md §5) — no lore/house-specific
    // composition exists yet, so this is one fixed first-draft ratio.
    expect(infantry).toBeGreaterThan(archers)
    expect(infantry).toBeGreaterThan(cavalry)
  })
})

describe('applyResourceDeltas', () => {
  it('applies positive and negative deltas correctly', () => {
    const start = createInitialResources()
    const next = applyResourceDeltas(start, { army: 1400, gold: -5000, morale: 6, supply: -7 })

    expect(next.army).toBe(11400)
    expect(next.gold).toBe(20000)
    expect(next.morale).toBe(81)
    expect(next.supply).toBe(73)
  })

  it('does not mutate the original object', () => {
    const start = createInitialResources()
    applyResourceDeltas(start, { army: 5000 })
    expect(start.army).toBe(10000)
  })

  it('only touches fields present in the delta', () => {
    const start = createInitialResources()
    const next = applyResourceDeltas(start, { gold: -1000 })
    expect(next.army).toBe(start.army)
    expect(next.morale).toBe(start.morale)
    expect(next.gold).toBe(24000)
  })

  it('clamps stat fields to 0-100', () => {
    const start = createInitialResources()
    const overflowed = applyResourceDeltas(start, { morale: 1000, supply: 1000 })
    expect(overflowed.morale).toBe(100)
    expect(overflowed.supply).toBe(100)

    const underflowed = applyResourceDeltas(start, { morale: -1000, supply: -1000 })
    expect(underflowed.morale).toBe(0)
    expect(underflowed.supply).toBe(0)
  })

  it('clamps count fields at 0, never negative', () => {
    const start = createInitialResources()
    const wiped = applyResourceDeltas(start, { army: -50000, gold: -50000 })
    expect(wiped.army).toBe(0)
    expect(wiped.gold).toBe(0)
    expect(wiped.troops.infantry).toBe(0)
    expect(wiped.troops.archers).toBe(0)
    expect(wiped.troops.cavalry).toBe(0)
  })

  // --- v2: troop composition (BATTLE_PLAN.md §5) --------------------

  it('a generic army delta is split proportionally across the current troop mix', () => {
    const start = createInitialResources() // 6000 / 2000 / 2000
    const next = applyResourceDeltas(start, { army: 1000 })
    expect(next.army).toBe(11000)
    // 60/20/20 of the +1000 -> +600/+200/+200, same ratio as before.
    expect(next.troops.infantry).toBe(6600)
    expect(next.troops.archers).toBe(2200)
    expect(next.troops.cavalry).toBe(2200)
    // Always sums exactly, regardless of rounding on the way there.
    expect(next.troops.infantry + next.troops.archers + next.troops.cavalry).toBe(next.army)
  })

  it('an explicit troops delta changes only the named type(s)', () => {
    const start = createInitialResources() // 6000 / 2000 / 2000
    const next = applyResourceDeltas(start, { troops: { cavalry: 3000 } })
    expect(next.troops.infantry).toBe(start.troops.infantry)
    expect(next.troops.archers).toBe(start.troops.archers)
    expect(next.troops.cavalry).toBe(start.troops.cavalry + 3000)
    // army stays in sync as the derived sum — no separate update needed.
    expect(next.army).toBe(start.army + 3000)
  })

  it('an explicit troops delta takes precedence over a simultaneous generic army delta', () => {
    const start = createInitialResources()
    const next = applyResourceDeltas(start, { army: 99999, troops: { infantry: 500 } })
    expect(next.troops.infantry).toBe(start.troops.infantry + 500)
    expect(next.troops.archers).toBe(start.troops.archers)
    expect(next.troops.cavalry).toBe(start.troops.cavalry)
    expect(next.army).toBe(start.army + 500)
  })

  it('falls back to putting a generic delta entirely into infantry when there are no existing troops to split by', () => {
    const start = { ...createInitialResources(), troops: { infantry: 0, archers: 0, cavalry: 0 }, army: 0 }
    const next = applyResourceDeltas(start, { army: 4000 })
    expect(next.troops).toEqual({ infantry: 4000, archers: 0, cavalry: 0 })
  })
})

describe('alliances', () => {
  it('adds an alliance without mutating the original resources', () => {
    const start = createInitialResources()
    const next = addAlliance(start, { houseName: 'House Tully', contribution: 12000 })

    expect(start.alliances).toHaveLength(0)
    expect(next.alliances).toHaveLength(1)
    expect(next.alliances[0].houseName).toBe('House Tully')
  })

  it('sums contributions across multiple alliances', () => {
    let resources = createInitialResources()
    resources = addAlliance(resources, { houseName: 'House Tully', contribution: 12000 })
    resources = addAlliance(resources, { houseName: 'House Arryn', contribution: 8000 })

    expect(totalAlliedSoldiers(resources)).toBe(20000)
  })

  it('returns 0 for no alliances', () => {
    expect(totalAlliedSoldiers(createInitialResources())).toBe(0)
  })
})