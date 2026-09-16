import { describe, it, expect } from 'vitest'
import { roleRating, allRoleRatings, bestFitRoles, effectiveAttribute, effectiveAttributes } from './ratings'
import { ALL_ATTRIBUTE_KEYS } from '../data/attributes'

// A flat character (every attribute = 50) should rate exactly 50 in every
// role, since each role's weights sum to 1.0 — a weighted average of a
// constant is that constant. Good sanity check that weights are normalized.
// Built from ALL_ATTRIBUTE_KEYS rather than hardcoded so this test can't
// silently drift out of sync with the real attribute list again.
const FLAT_50 = Object.fromEntries(ALL_ATTRIBUTE_KEYS.map((key) => [key, 50]))

// All-0 and all-100 fixtures specifically to exercise the 1-99 clamp —
// raw weighted sums of 0 and 100 both get pulled inside the range.
const ALL_ZERO = Object.fromEntries(ALL_ATTRIBUTE_KEYS.map((key) => [key, 0]))
const ALL_MAX = Object.fromEntries(ALL_ATTRIBUTE_KEYS.map((key) => [key, 100]))

// Isolates exactly how much a single attribute contributes to each role —
// every other attribute is 0, so a role's rating IS that attribute's weight
// (as a percentage), nothing else in the mix.
function attributeOnly(key) {
  return Object.fromEntries(ALL_ATTRIBUTE_KEYS.map((k) => [k, k === key ? 100 : 0]))
}

// Hand-verified against the current data/roleWeights.js formulas — not
// tied to any live character in the database, so this test stays stable
// even as actual character attribute values get tuned.
const TEST_CHARACTER = {
  strength: 60, speed: 40, stealth: 30, technique: 70, endurance: 50,
  strategy: 80, cunning: 60, scholarship: 90, economy: 40,
  diplomacy: 70, etiquette: 50, subterfuge: 55,
  command: 85, battleMorale: 60, justice: 65, recruitment: 30,
  family: 40, duty: 75, honour: 70, selfPreservation: 45,
  intimidation: 50, prestige: 65, willpower: 80,
}

describe('roleRating', () => {
  it('rates a flat-50 character exactly 50 in every role', () => {
    // A fighting style must be passed for Champion to be computed at all —
    // allRoleRatings deliberately returns null for Champion without one
    // (a "not yet knowable" case for the Characters browse page), which
    // isn't what this test is checking. Any style works here since every
    // one of them sums to 1.0 the same as every other role's weights.
    const ratings = allRoleRatings(FLAT_50, 'versatile')
    Object.values(ratings).forEach((rating) => expect(rating).toBe(50))
  })

  it('clamps ratings to 1-99, never 0 or 100', () => {
    const zeroRatings = allRoleRatings(ALL_ZERO, 'versatile')
    Object.values(zeroRatings).forEach((rating) => expect(rating).toBe(1))

    const maxRatings = allRoleRatings(ALL_MAX, 'versatile')
    Object.values(maxRatings).forEach((rating) => expect(rating).toBe(99))
  })

  it('weights a single attribute correctly per role', () => {
    const techniqueOnly = attributeOnly('technique')
    expect(roleRating(techniqueOnly, 'kingsguard')).toBe(35) // technique 35%
    expect(roleRating(techniqueOnly, 'champion', 'basic')).toBe(30) // basic style: technique 30%
    expect(roleRating(techniqueOnly, 'commander')).toBe(10) // technique 10%
    expect(roleRating(techniqueOnly, 'king')).toBe(1) // technique has no weight here -> clamps up from 0

    const commandOnly = attributeOnly('command')
    expect(roleRating(commandOnly, 'king')).toBe(20) // command 20%
    expect(roleRating(commandOnly, 'commander')).toBe(25) // command 25%
    expect(roleRating(commandOnly, 'kingsguard')).toBe(1) // command has no weight here -> clamps up from 0
  })

  it('matches hand-calculated TEST_CHARACTER fixture', () => {
    expect(roleRating(TEST_CHARACTER, 'king')).toBe(70)
    expect(roleRating(TEST_CHARACTER, 'grandMaester')).toBe(85)
    expect(roleRating(TEST_CHARACTER, 'kingsguard')).toBe(66)
    expect(roleRating(TEST_CHARACTER, 'champion', 'versatile')).toBe(63)
  })

  it('throws on an unknown role id', () => {
    expect(() => roleRating(TEST_CHARACTER, 'not-a-real-role')).toThrow()
  })

  // Regression guard: Master of War was merged into Commander and Heir
  // was removed entirely. If either ever silently "works" again (e.g. from
  // a stale copy of roleWeights.js), that's the exact bug that produced
  // NaN role-fit % across the whole Characters page — this should throw.
  it('throws for roles removed in the v2 rework (masterOfWar, heir)', () => {
    expect(() => roleRating(TEST_CHARACTER, 'masterOfWar')).toThrow()
    expect(() => roleRating(TEST_CHARACTER, 'heir')).toThrow()
  })
})

describe('allRoleRatings', () => {
  it('returns a rating for all 10 roles', () => {
    const ratings = allRoleRatings(TEST_CHARACTER)
    expect(Object.keys(ratings)).toHaveLength(10)
  })

  it('includes the new roles and excludes the removed ones', () => {
    const ratings = allRoleRatings(TEST_CHARACTER)
    expect(ratings).toHaveProperty('grandMaester')
    expect(ratings).toHaveProperty('champion')
    expect(ratings).not.toHaveProperty('masterOfWar')
    expect(ratings).not.toHaveProperty('heir')
  })
})

describe('bestFitRoles', () => {
  it('returns the top N roles by rating, restricted to the given ids', () => {
    const openRoles = ['hand', 'masterOfCoin', 'commander', 'kingsguard']
    const top2 = bestFitRoles(TEST_CHARACTER, openRoles, 2)
    expect(top2).toHaveLength(2)
    // Confirm it's actually sorted descending
    expect(top2[0].rating).toBeGreaterThanOrEqual(top2[1].rating)
    // Confirm it never returns a role outside the given set
    top2.forEach(({ roleId }) => expect(openRoles).toContain(roleId))
  })
})

describe('effectiveAttribute / effectiveAttributes', () => {
  it('scales a single attribute by the role fit %', () => {
    // TEST_CHARACTER as King: fit 70% (0.70), Command 85 -> 59.5
    expect(effectiveAttribute(TEST_CHARACTER, 'king', 'command')).toBeCloseTo(59.5)
  })

  it('scales all 23 attributes by the role fit %', () => {
    const scaled = effectiveAttributes(TEST_CHARACTER, 'king')
    expect(scaled.command).toBeCloseTo(59.5)
    expect(Object.keys(scaled)).toHaveLength(23)
  })

  it("a poor-fit role meaningfully weakens the same character's output", () => {
    // Kingsguard fit (67%) is well below King fit (70%) for this
    // character, so the same Willpower attribute contributes less there.
    const willpowerAsKing = effectiveAttribute(TEST_CHARACTER, 'king', 'willpower')
    const willpowerAsKingsguard = effectiveAttribute(TEST_CHARACTER, 'kingsguard', 'willpower')
    expect(willpowerAsKingsguard).toBeLessThan(willpowerAsKing)
    expect(willpowerAsKing).toBeLessThan(TEST_CHARACTER.willpower)
  })
})