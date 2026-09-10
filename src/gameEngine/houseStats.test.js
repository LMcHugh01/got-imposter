import { describe, it, expect } from 'vitest'
import { computeHouseStats, overallHouseRating, houseStrengthsWeaknesses, STAT_LABELS } from './houseStats'
import { ROLES } from '../data/roleWeights'

function flatAttributes(value) {
  return {
    combat: value, leadership: value, strategy: value, intelligence: value,
    politics: value, diplomacy: value, loyalty: value, economy: value,
  }
}

function mockRoster(valueByRole, fallback = 50) {
  return ROLES.map((role) => ({
    role,
    character: {
      id: role.id,
      name: `${role.label} Pick`,
      house: null,
      attributes: flatAttributes(valueByRole[role.id] ?? fallback),
    },
  }))
}

describe('computeHouseStats', () => {
  it('gives every stat the same value for a fully flat council', () => {
    // Flat 60 attributes -> role rating is exactly 60 for every role (weights
    // sum to 1) -> effectiveAttribute = 60 * 0.60 = 36 for every contributor.
    const roster = mockRoster({}, 60)
    const stats = computeHouseStats(roster)
    Object.values(stats).forEach((value) => expect(value).toBe(36))
  })

  it('reflects a council that is strong everywhere except two weak roles', () => {
    // Strong characters (flat 85) -> effectiveAttribute = 85 * 0.85 = 72.25
    // Weak characters (flat 15, in Kingsguard/Commander) -> 15 * 0.15 = 2.25
    const roster = mockRoster({ kingsguard: 15, commander: 15 }, 85)
    const stats = computeHouseStats(roster)

    expect(stats.economy).toBe(72)
    expect(stats.diplomacy).toBe(72)
    expect(stats.intelligence).toBe(72)
    expect(stats.stability).toBe(72)
    // Military pulls from the two weak roles + one strong one -> drags down
    expect(stats.military).toBe(26)
    // Morale pulls from King (strong) + Kingsguard (weak) -> drags down
    expect(stats.morale).toBe(37)
  })

  it('returns a value for every stat in STAT_LABELS', () => {
    const stats = computeHouseStats(mockRoster({}, 50))
    expect(Object.keys(stats).sort()).toEqual(Object.keys(STAT_LABELS).sort())
  })
})

describe('overallHouseRating', () => {
  it('averages the 6 stats', () => {
    const roster = mockRoster({ kingsguard: 15, commander: 15 }, 85)
    const stats = computeHouseStats(roster)
    // (26 + 72 + 72 + 72 + 72 + 37) / 6 = 58.5 -> rounds to 59
    expect(overallHouseRating(stats)).toBe(59)
  })

  it('matches the flat-council value when every stat is identical', () => {
    const stats = computeHouseStats(mockRoster({}, 60))
    expect(overallHouseRating(stats)).toBe(36)
  })
})

describe('houseStrengthsWeaknesses', () => {
  it('classifies strong stats as strengths and weak ones as weaknesses', () => {
    const roster = mockRoster({ kingsguard: 15, commander: 15 }, 85)
    const stats = computeHouseStats(roster)
    const { strengths, weaknesses } = houseStrengthsWeaknesses(stats)

    expect(strengths).toContain('Strong economy')
    expect(strengths).toContain('Strong diplomacy')
    expect(weaknesses).toContain('Low military')
    expect(weaknesses).toContain('Low morale')
  })

  it('produces no strengths and all weaknesses for a uniformly weak council', () => {
    const stats = computeHouseStats(mockRoster({}, 20)) // effectiveAttribute = 20*0.2 = 4
    const { strengths, weaknesses } = houseStrengthsWeaknesses(stats)
    expect(strengths).toHaveLength(0)
    expect(weaknesses).toHaveLength(6)
  })
})
