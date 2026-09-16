import { describe, it, expect } from 'vitest'
import {
  createDraftState,
  getOpenRoles,
  getUndraftedCharacters,
  offerCharacters,
  getRoleOptionsForCharacter,
  assignRole,
  isDraftComplete,
  getFinalRoster,
} from './draftEngine'
import { ROLES } from '../data/roleWeights'
import { ALL_ATTRIBUTE_KEYS } from '../data/attributes'
import { CHAMPION_STYLES } from '../data/championStyles'

// Deterministic "random" for reproducible tests — not realistic shuffling,
// just a fixed, valid permutation every time.
const fixedRng = () => 0

// Built from ALL_ATTRIBUTE_KEYS rather than a hand-copied list — a stale
// 8-key schema here (combat/leadership/politics/loyalty/...) was the
// actual cause of the NaN fit values below: any weighted attribute
// missing from the object reads as undefined, and undefined * weight =
// NaN poisons roleRating's whole sum. Every mock character also needs a
// fightingStyle now — assignRole is deliberately strict about Champion
// needing one (a real data gap should surface immediately, per its own
// comment), and a real, fully-tagged roster always has one — a mock pool
// without one was silently relying on the draft loop never landing a
// character on Champion, which broke the moment it did.
function mockPool(size) {
  return Array.from({ length: size }, (_, i) => ({
    id: `char-${i}`,
    name: `Character ${i}`,
    house: i % 2 === 0 ? 'House Test' : null,
    attributes: Object.fromEntries(ALL_ATTRIBUTE_KEYS.map((key, j) => [key, (i * (7 + j * 4)) % 100])),
    fightingStyle: CHAMPION_STYLES[i % CHAMPION_STYLES.length],
  }))
}

describe('createDraftState', () => {
  it('throws if the pool is smaller than the number of roles', () => {
    expect(() => createDraftState(mockPool(9))).toThrow()
  })

  it('succeeds with exactly 10 eligible characters', () => {
    const state = createDraftState(mockPool(10))
    expect(state.round).toBe(1)
    expect(getOpenRoles(state)).toHaveLength(10)
  })
})

describe('offerCharacters', () => {
  it('offers 5 characters when plenty remain', () => {
    const state = createDraftState(mockPool(20))
    const offer = offerCharacters(state, fixedRng)
    expect(offer).toHaveLength(5)
  })

  it('never offers a character twice, and never an already-drafted one', () => {
    let state = createDraftState(mockPool(20))
    const seen = new Set()

    for (let round = 0; round < 10; round++) {
      const offer = offerCharacters(state, fixedRng)
      offer.forEach((c) => {
        expect(seen.has(c.id)).toBe(false)
        expect(state.draftedCharacterIds.has(c.id)).toBe(false)
      })
      const [pick] = offer
      const [openRole] = getOpenRoles(state)
      state = assignRole(state, pick, openRole.id)
      seen.add(pick.id)
    }
  })

  it('offers fewer than 5 once the pool is nearly exhausted, minimum 1', () => {
    // Pool of exactly 10: by round 10, only 1 undrafted character remains.
    let state = createDraftState(mockPool(10))
    for (let round = 0; round < 9; round++) {
      const offer = offerCharacters(state, fixedRng)
      const [pick] = offer
      const [openRole] = getOpenRoles(state)
      state = assignRole(state, pick, openRole.id)
    }
    const finalOffer = offerCharacters(state, fixedRng)
    expect(finalOffer).toHaveLength(1)
  })
})

describe('getRoleOptionsForCharacter', () => {
  it('only returns still-open roles, sorted best fit first', () => {
    const state = createDraftState(mockPool(20))
    const [character] = offerCharacters(state, fixedRng)
    const options = getRoleOptionsForCharacter(state, character)

    expect(options).toHaveLength(10) // nothing drafted yet, all roles open
    for (let i = 1; i < options.length; i++) {
      expect(options[i - 1].fit).toBeGreaterThanOrEqual(options[i].fit)
    }
  })

  it('shrinks as roles get filled', () => {
    let state = createDraftState(mockPool(20))
    const offer = offerCharacters(state, fixedRng)
    state = assignRole(state, offer[0], 'king')

    const nextOffer = offerCharacters(state, fixedRng)
    const options = getRoleOptionsForCharacter(state, nextOffer[0])
    expect(options).toHaveLength(9)
    expect(options.find((o) => o.roleId === 'king')).toBeUndefined()
  })
})

describe('assignRole', () => {
  it('throws when assigning an already-drafted character', () => {
    const state = createDraftState(mockPool(20))
    const [character] = offerCharacters(state, fixedRng)
    const next = assignRole(state, character, 'king')
    expect(() => assignRole(next, character, 'consort')).toThrow()
  })

  it('throws when assigning to an already-filled role', () => {
    const state = createDraftState(mockPool(20))
    const offer = offerCharacters(state, fixedRng)
    const next = assignRole(state, offer[0], 'king')
    expect(() => assignRole(next, offer[1], 'king')).toThrow()
  })

  it('throws on an unknown role id', () => {
    const state = createDraftState(mockPool(20))
    const [character] = offerCharacters(state, fixedRng)
    expect(() => assignRole(state, character, 'not-a-role')).toThrow()
  })

  it('does not mutate the state object passed in', () => {
    const state = createDraftState(mockPool(20))
    const [character] = offerCharacters(state, fixedRng)
    assignRole(state, character, 'king')
    expect(state.round).toBe(1) // original untouched
    expect(state.draftedCharacterIds.size).toBe(0)
  })
})

describe('full draft simulation', () => {
  it('completes in exactly 10 rounds with all roles filled, no repeats', () => {
    let state = createDraftState(mockPool(30))
    const draftedIds = []

    while (!isDraftComplete(state)) {
      const offer = offerCharacters(state, fixedRng)
      const [pick] = offer
      const [openRole] = getOpenRoles(state)
      state = assignRole(state, pick, openRole.id)
      draftedIds.push(pick.id)
    }

    expect(state.round).toBe(11) // incremented past the 10th pick
    expect(draftedIds).toHaveLength(10)
    expect(new Set(draftedIds).size).toBe(10) // no duplicates

    const roster = getFinalRoster(state)
    expect(roster).toHaveLength(10)
    roster.forEach(({ character }) => expect(character).not.toBeNull())

    // Every role from the config got filled exactly once
    const filledRoleIds = roster.map((r) => r.role.id).sort()
    expect(filledRoleIds).toEqual([...ROLES.map((r) => r.id)].sort())
  })
})