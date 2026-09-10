import { describe, it, expect } from 'vitest'
import { roleRating, allRoleRatings, bestFitRoles, effectiveAttribute, effectiveAttributes } from './ratings'

// A flat character (every attribute = 50) should rate exactly 50 in every
// role, since each role's weights sum to 1.0 — a weighted average of a
// constant is that constant. Good sanity check that weights are normalized.
const FLAT_50 = {
  combat: 50, leadership: 50, strategy: 50, intelligence: 50,
  politics: 50, diplomacy: 50, loyalty: 50, economy: 50,
}

// Pure combat, everything else zero — isolates exactly how much each role
// weights the combat attribute.
const COMBAT_ONLY = {
  combat: 100, leadership: 0, strategy: 0, intelligence: 0,
  politics: 0, diplomacy: 0, loyalty: 0, economy: 0,
}

// Hand-verified against GOT-DRAFT-CONTEXT.md §6.4's Daenerys example.
const DAENERYS = {
  combat: 65, leadership: 95, strategy: 70, intelligence: 78,
  politics: 88, diplomacy: 90, loyalty: 60, economy: 40,
}

describe('roleRating', () => {
  it('rates a flat-50 character exactly 50 in every role', () => {
    const ratings = allRoleRatings(FLAT_50)
    Object.values(ratings).forEach((rating) => expect(rating).toBe(50))
  })

  it('weights pure combat correctly per role', () => {
    expect(roleRating(COMBAT_ONLY, 'kingsguard')).toBe(65) // combat 65%
    expect(roleRating(COMBAT_ONLY, 'commander')).toBe(40) // combat 40%
    expect(roleRating(COMBAT_ONLY, 'king')).toBe(0) // combat has no weight here
  })

  it('matches hand-calculated Daenerys fixture from the design doc', () => {
    expect(roleRating(DAENERYS, 'king')).toBe(90)
    expect(roleRating(DAENERYS, 'grandMaester')).toBe(78)
    expect(roleRating(DAENERYS, 'masterOfCoin')).toBe(65)
    expect(roleRating(DAENERYS, 'kingsguard')).toBe(67)
  })

  it('throws on an unknown role id', () => {
    expect(() => roleRating(DAENERYS, 'not-a-real-role')).toThrow()
  })
})

describe('allRoleRatings', () => {
  it('returns a rating for all 10 roles', () => {
    const ratings = allRoleRatings(DAENERYS)
    expect(Object.keys(ratings)).toHaveLength(10)
  })
})

describe('bestFitRoles', () => {
  it('returns the top N roles by rating, restricted to the given ids', () => {
    const openRoles = ['hand', 'masterOfCoin', 'masterOfWar', 'kingsguard']
    const top2 = bestFitRoles(DAENERYS, openRoles, 2)
    expect(top2).toHaveLength(2)
    // Confirm it's actually sorted descending
    expect(top2[0].rating).toBeGreaterThanOrEqual(top2[1].rating)
    // Confirm it never returns a role outside the given set
    top2.forEach(({ roleId }) => expect(openRoles).toContain(roleId))
  })
})

describe('effectiveAttribute / effectiveAttributes', () => {
  it('scales a single attribute by the role fit %', () => {
    // Daenerys as King/Queen: fit 90% (0.90), Leadership 95 -> 85.5
    expect(effectiveAttribute(DAENERYS, 'king', 'leadership')).toBeCloseTo(85.5)
  })

  it('scales all 8 attributes by the role fit %', () => {
    const scaled = effectiveAttributes(DAENERYS, 'king')
    expect(scaled.leadership).toBeCloseTo(85.5)
    expect(Object.keys(scaled)).toHaveLength(8)
  })

  it('a poor-fit role meaningfully weakens the same character\'s output', () => {
    const asKing = effectiveAttribute(DAENERYS, 'king', 'leadership')
    const asKingsguard = effectiveAttribute(DAENERYS, 'kingsguard', 'combat')
    // Not a direct comparison of the same stat, but both should reflect
    // their respective fit % (90% vs 67%) scaling down from raw values.
    expect(asKing).toBeLessThan(DAENERYS.leadership)
    expect(asKingsguard).toBeLessThan(DAENERYS.combat)
  })
})