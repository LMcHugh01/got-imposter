import { describe, it, expect } from 'vitest'
import { computeHouseStats, overallHouseRating, houseStrengthsWeaknesses, STAT_LABELS } from './houseStats'
import { ROLES } from '../data/roleWeights'
import { ALL_ATTRIBUTE_KEYS } from '../data/attributes'

// Built from ALL_ATTRIBUTE_KEYS rather than a hand-copied list — this was
// the actual bug behind every NaN failure here: a stale 8-key schema
// (combat/leadership/politics/loyalty/...) that predates the current
// 23-attribute system. Any weighted attribute missing from the object
// reads as undefined, and undefined * weight = NaN poisons the whole
// weighted sum. Since every role's weights sum to 1.0 (net of any
// penalties), a uniform flat value across ALL 23 attributes still rates
// as exactly that value for every role — the test's own hardcoded
// expected numbers (36, 72, 26, 37, 59...) were already correct; they
// just never had a working fixture to actually produce them.
function flatAttributes(value) {
  return Object.fromEntries(ALL_ATTRIBUTE_KEYS.map((key) => [key, value]))
}

function mockRoster(valueByRole, fallback = 50) {
  return ROLES.map((role) => ({
    role,
    character: {
      id: role.id,
      name: `${role.label} Pick`,
      house: null,
      attributes: flatAttributes(valueByRole[role.id] ?? fallback),
      // Champion's contribution to `military` needs a style or it's
      // silently excluded (houseStats.js's own graceful-degradation guard)
      // — any style works here since every one sums to 1.0 the same as
      // every other role, so a flat-value character rates the same value
      // regardless of which style is picked.
      fightingStyle: 'versatile',
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
    // Military = avg(commander/strategy 2.25, commander/battleMorale 2.25,
    // kingsguard/strength 2.25, champion/technique 72.25) = 19.75 -> 20.
    // Three weak contributions + one strong (Champion) drags it down hard.
    expect(stats.military).toBe(20)
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
    // (20 + 72 + 72 + 72 + 72 + 37) / 6 = 57.5 -> rounds to 58
    expect(overallHouseRating(stats)).toBe(58)
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