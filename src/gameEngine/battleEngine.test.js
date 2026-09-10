import { describe, it, expect } from 'vitest'
import {
  computeYourPower,
  computeEnemyPower,
  computeWinProbability,
  resolveStrategyModifiers,
  simulateBattle,
  extractCouncilBattleInputs,
  STRATEGIES,
} from './battleEngine'
import { ROLES } from '../data/roleWeights'

function neutralYourSide(armySize, armyQuality, overrides = {}) {
  return {
    armySize,
    armyQuality,
    morale: 75,
    supply: 80,
    leadership: 50,
    strategy: 50,
    intelligence: 50,
    executionSkill: 0.5,
    scouted: false,
    ...overrides,
  }
}

function neutralEnemySide(armySize, armyQuality, rating, overrides = {}) {
  return { armySize, armyQuality, morale: 75, supply: 80, rating, gold: 5000, ...overrides }
}

function winRateOver(yourSide, enemySide, strategyId, n) {
  let wins = 0
  for (let i = 0; i < n; i++) {
    const result = simulateBattle({ yourSide, enemySide, strategyId })
    if (result.outcome === 'victory') wins++
  }
  return wins / n
}

// --- unit tests -----------------------------------------------------

describe('computeYourPower / computeEnemyPower', () => {
  it('a stat of exactly 50 is neutral (modifier = 1.0)', () => {
    const allNeutral = neutralYourSide(50000, 70, { morale: 50, supply: 50 })
    const withStats50 = computeYourPower(allNeutral)
    const baseArmyPowerOnly = Math.sqrt(50000) * 70
    expect(withStats50).toBeCloseTo(baseArmyPowerOnly, 5)
  })

  it('higher morale/leadership/strategy/supply increases power above baseline', () => {
    const base = computeYourPower(neutralYourSide(50000, 70))
    const boosted = computeYourPower(neutralYourSide(50000, 70, { morale: 100, leadership: 100, strategy: 100, supply: 100 }))
    expect(boosted).toBeGreaterThan(base)
  })

  it('intelligence only applies as a bonus when scouted', () => {
    const unscouted = computeYourPower(neutralYourSide(50000, 70, { intelligence: 100, scouted: false }))
    const scouted = computeYourPower(neutralYourSide(50000, 70, { intelligence: 100, scouted: true }))
    const baseline = computeYourPower(neutralYourSide(50000, 70))
    expect(unscouted).toBeCloseTo(baseline, 5) // no effect when not scouted
    expect(scouted).toBeGreaterThan(baseline) // real bonus when scouted
  })
})

describe('computeWinProbability', () => {
  it('is exactly 0.5 for identical power', () => {
    expect(computeWinProbability(1000, 1000)).toBeCloseTo(0.5)
  })

  it('never returns below the 5% floor or above the 95% ceiling', () => {
    expect(computeWinProbability(1000000, 1)).toBeLessThanOrEqual(0.95)
    expect(computeWinProbability(1, 1000000)).toBeGreaterThanOrEqual(0.05)
  })
})

describe('resolveStrategyModifiers', () => {
  it('applies zero effect when execution skill is 0, regardless of strategy', () => {
    const mods = resolveStrategyModifiers('aggressive', 0, false)
    expect(mods.appliedShift).toBe(0)
    expect(mods.yourCasualtyMultiplier).toBe(1)
    expect(mods.enemyCasualtyMultiplier).toBe(1)
  })

  it('applies close to the full effect when execution skill is 1', () => {
    const mods = resolveStrategyModifiers('aggressive', 1, false)
    expect(mods.appliedShift).toBeCloseTo(STRATEGIES.aggressive.probabilityShift)
    expect(mods.yourCasualtyMultiplier).toBeCloseTo(STRATEGIES.aggressive.yourCasualtyMultiplier)
  })

  it('ambush backfires (negative shift) when not scouted', () => {
    const blind = resolveStrategyModifiers('ambush', 1, false)
    const scouted = resolveStrategyModifiers('ambush', 1, true)
    expect(blind.appliedShift).toBeLessThan(0)
    expect(scouted.appliedShift).toBeGreaterThan(0)
  })

  it('throws on an unknown strategy', () => {
    expect(() => resolveStrategyModifiers('not-a-strategy', 1, false)).toThrow()
  })
})

describe('simulateBattle', () => {
  it('returns a well-formed result', () => {
    const result = simulateBattle({
      yourSide: neutralYourSide(50000, 70),
      enemySide: neutralEnemySide(50000, 70, 50),
      strategyId: 'balanced',
    })

    expect(['victory', 'defeat']).toContain(result.outcome)
    expect(result.probability).toBeGreaterThanOrEqual(5)
    expect(result.probability).toBeLessThanOrEqual(95)
    expect(result.yourCasualties).toBeGreaterThanOrEqual(0)
    expect(result.enemyCasualties).toBeGreaterThanOrEqual(0)
    expect(result.enemySurrendered).toBeGreaterThanOrEqual(0)
  })

  it('never awards gold or surrendered soldiers on a defeat', () => {
    // Force a loss with an rng that always returns just under 1 (fails any probability < 1)
    const result = simulateBattle({
      yourSide: neutralYourSide(1000, 10),
      enemySide: neutralEnemySide(100000, 100, 95),
      strategyId: 'balanced',
      rng: () => 0.999999,
    })
    expect(result.outcome).toBe('defeat')
    expect(result.goldGained).toBe(0)
    expect(result.enemySurrendered).toBe(0)
    expect(result.moraleChange).toBeLessThan(0)
  })

  it('a lopsided win costs the winner a lower casualty rate than the loser', () => {
    const yourSide = neutralYourSide(100000, 90, { leadership: 80, strategy: 80 })
    const enemyArmySize = 5000
    const result = simulateBattle({
      yourSide,
      enemySide: neutralEnemySide(enemyArmySize, 30, 20),
      strategyId: 'balanced',
      rng: () => 0, // always "wins" if probability > 0
    })
    expect(result.outcome).toBe('victory')
    const yourRate = result.yourCasualties / yourSide.armySize
    const enemyRate = (result.enemyCasualties + result.enemySurrendered) / enemyArmySize
    expect(yourRate).toBeLessThan(enemyRate)
  })
})

describe('extractCouncilBattleInputs', () => {
  it('pulls leadership/strategy/intelligence from the right roles', () => {
    const roster = ROLES.map((role) => ({
      role,
      character: {
        id: role.id,
        name: role.label,
        attributes: {
          combat: 50, leadership: 50, strategy: 50, intelligence: 50,
          politics: 50, diplomacy: 50, loyalty: 50, economy: 50,
        },
        fit: 50,
      },
    }))

    const inputs = extractCouncilBattleInputs(roster)
    // Flat 50 attributes -> role rating 50 -> effectiveAttribute = 50 * 0.5 = 25 everywhere
    expect(inputs.leadership).toBeCloseTo(25)
    expect(inputs.strategy).toBeCloseTo(25)
    expect(inputs.intelligence).toBeCloseTo(25)
    expect(inputs.executionSkill).toBeCloseTo(0.25)
  })

  it('contributes 0 rather than throwing when a role is missing', () => {
    const inputs = extractCouncilBattleInputs([])
    expect(inputs.leadership).toBe(0)
    expect(inputs.strategy).toBe(0)
    expect(inputs.intelligence).toBe(0)
  })
})

// --- §15.2 statistical matrix -----------------------------------------
// Each matchup runs 2000 simulated battles. Tolerances are generous
// (well beyond normal binomial variance at n=2000) to avoid flaky tests
// while still catching a genuinely broken formula.

describe('§15.2 battle distribution matrix', () => {
  it('50k vs 50k, equal quality -> roughly 50/50', () => {
    const yourSide = neutralYourSide(50000, 70)
    const enemySide = neutralEnemySide(50000, 70, 50)

    const expectedProbability = computeWinProbability(computeYourPower(yourSide), computeEnemyPower(enemySide))
    expect(expectedProbability).toBeCloseTo(0.5, 2)

    const empirical = winRateOver(yourSide, enemySide, 'balanced', 2000)
    expect(empirical).toBeGreaterThan(0.44)
    expect(empirical).toBeLessThan(0.56)
  })

  it('100k weak army vs 60k elite army -> larger army favored, elite keeps a real chance', () => {
    // "Weak" = bigger army, lower quality/morale/supply. "Elite" = smaller,
    // higher quality. Neither side dominates — that's the point.
    const yourSide = neutralYourSide(100000, 62, { morale: 78, supply: 82 })
    const enemySide = neutralEnemySide(60000, 68, 55, { morale: 70, supply: 72 })

    const expectedProbability = computeWinProbability(computeYourPower(yourSide), computeEnemyPower(enemySide))
    expect(expectedProbability).toBeGreaterThan(0.5) // larger army favored...
    expect(expectedProbability).toBeLessThan(0.7) // ...but not overwhelmingly

    const empirical = winRateOver(yourSide, enemySide, 'balanced', 2000)
    expect(empirical).toBeGreaterThan(0.45)
    expect(empirical).toBeLessThan(0.65)
    // The elite underdog's implied win rate is a "real chance", not token
    expect(1 - empirical).toBeGreaterThan(0.25)
  })

  it('100k elite army vs 5k weak army -> the 5k side should almost never win', () => {
    const yourSide = neutralYourSide(100000, 90, { morale: 80, supply: 85, leadership: 70, strategy: 70, intelligence: 70, executionSkill: 0.7 })
    const enemySide = neutralEnemySide(5000, 40, 30, { morale: 60, supply: 60 })

    const expectedProbability = computeWinProbability(computeYourPower(yourSide), computeEnemyPower(enemySide))
    expect(expectedProbability).toBeGreaterThan(0.85)

    const empirical = winRateOver(yourSide, enemySide, 'balanced', 2000)
    expect(empirical).toBeGreaterThan(0.85) // the 100k side wins the vast majority
    expect(1 - empirical).toBeLessThan(0.15) // the 5k side "almost never" wins
  })

  it('a displayed ~70/30 matchup produces roughly 700/300 results across 1000+ runs', () => {
    const yourSide = neutralYourSide(60000, 75, { morale: 82, supply: 85, leadership: 65, strategy: 65, intelligence: 60, executionSkill: 0.65, scouted: true })
    const enemySide = neutralEnemySide(40000, 55, 45, { morale: 65, supply: 65 })

    const expectedProbability = computeWinProbability(computeYourPower(yourSide), computeEnemyPower(enemySide))
    expect(expectedProbability).toBeGreaterThan(0.65)
    expect(expectedProbability).toBeLessThan(0.75)

    const empirical = winRateOver(yourSide, enemySide, 'balanced', 3000)
    // The core claim: displayed probability and actual simulated outcomes
    // must track each other, not just "trend the right direction".
    expect(Math.abs(empirical - expectedProbability)).toBeLessThan(0.07)
  })
})
