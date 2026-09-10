import { describe, it, expect } from 'vitest'
import {
  computeYourPower,
  computeEnemyPower,
  resolveStrategyModifiers,
  tickBattle,
  runBattleToCompletion,
  finalizeBattleResult,
  extractCouncilBattleInputs,
  extractCouncilEconomyInputs,
  STRATEGIES,
  SURRENDER_RATIO,
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

// --- power ---------------------------------------------------------------

describe('computeYourPower / computeEnemyPower', () => {
  it('a stat of exactly 50 is neutral (modifier = 1.0)', () => {
    const allNeutral = neutralYourSide(50000, 70, { morale: 50, supply: 50 })
    const withStats50 = computeYourPower(allNeutral)
    const baseArmyPowerOnly = Math.pow(50000, 0.65) * 70
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
    expect(unscouted).toBeCloseTo(baseline, 5)
    expect(scouted).toBeGreaterThan(baseline)
  })

  it('power shrinks as army size shrinks — the compounding-spiral property', () => {
    const fullStrength = computeYourPower(neutralYourSide(50000, 70))
    const halved = computeYourPower(neutralYourSide(25000, 70))
    expect(halved).toBeLessThan(fullStrength)
  })
})

// --- strategy execution ---------------------------------------------------

describe('resolveStrategyModifiers', () => {
  it('applies no casualty effect when execution skill is 0', () => {
    const mods = resolveStrategyModifiers('aggressive', 0)
    expect(mods.yourCasualtyMultiplier).toBe(1)
    expect(mods.enemyCasualtyMultiplier).toBe(1)
  })

  it('applies the full effect when execution skill is 1', () => {
    const mods = resolveStrategyModifiers('aggressive', 1)
    expect(mods.yourCasualtyMultiplier).toBeCloseTo(STRATEGIES.aggressive.yourCasualtyMultiplier)
    expect(mods.enemyCasualtyMultiplier).toBeCloseTo(STRATEGIES.aggressive.enemyCasualtyMultiplier)
  })

  it('throws on an unknown strategy', () => {
    expect(() => resolveStrategyModifiers('not-a-strategy', 1)).toThrow()
  })
})

// --- live ticks ------------------------------------------------------------

describe('tickBattle', () => {
  it('reduces both armies and returns null outcome for an ongoing fight', () => {
    const result = tickBattle({
      yourArmy: 50000,
      enemyArmy: 50000,
      yourStats: neutralYourSide(50000, 70),
      enemyStats: neutralEnemySide(50000, 70, 50),
      strategyId: 'balanced',
      scouted: false,
      rng: () => 0.5,
    })
    expect(result.yourArmy).toBeLessThan(50000)
    expect(result.enemyArmy).toBeLessThan(50000)
    expect(result.outcome).toBeNull()
  })

  it('eventually declares victory when hopelessly outmatching the enemy', () => {
    const result = runBattleToCompletion({
      yourArmy: 50000,
      enemyArmy: 100,
      yourStats: neutralYourSide(50000, 90),
      enemyStats: neutralEnemySide(100, 20, 10),
      strategyId: 'balanced',
      scouted: false,
      rng: () => 0.5,
    })
    expect(result.outcome).toBe('victory')
  })

  it('declares victory once your army outnumbers theirs by the surrender ratio', () => {
    const result = tickBattle({
      yourArmy: 40000,
      enemyArmy: 9000,
      yourStats: neutralYourSide(40000, 95, { morale: 100, leadership: 100, strategy: 100, supply: 100 }),
      enemyStats: neutralEnemySide(9000, 20, 10, { morale: 10, supply: 10 }),
      strategyId: 'aggressive',
      scouted: false,
      rng: () => 0.5,
    })
    if (result.outcome !== null) {
      expect(result.outcome).toBe('victory')
      expect(result.yourArmy).toBeGreaterThanOrEqual(result.enemyArmy * SURRENDER_RATIO)
    }
  })

  it('eventually declares defeat when hopelessly outmatched', () => {
    const result = runBattleToCompletion({
      yourArmy: 100,
      enemyArmy: 50000,
      yourStats: neutralYourSide(100, 20),
      enemyStats: neutralEnemySide(50000, 90, 80),
      strategyId: 'balanced',
      scouted: false,
      rng: () => 0.5,
    })
    expect(result.outcome).toBe('defeat')
  })

  it('ambush gives a scouted bonus and an unscouted penalty on the opening exchange', () => {
    const base = { yourArmy: 50000, enemyArmy: 50000, strategyId: 'ambush', rng: () => 0.5 }
    const scoutedResult = tickBattle({
      ...base,
      yourStats: neutralYourSide(50000, 70),
      enemyStats: neutralEnemySide(50000, 70, 50),
      scouted: true,
    })
    const blindResult = tickBattle({
      ...base,
      yourStats: neutralYourSide(50000, 70),
      enemyStats: neutralEnemySide(50000, 70, 50),
      scouted: false,
    })
    expect(scoutedResult.enemyCasualties).toBeGreaterThan(blindResult.enemyCasualties)
  })

  it('throws on an unknown strategy', () => {
    expect(() =>
      tickBattle({
        yourArmy: 1000, enemyArmy: 1000,
        yourStats: neutralYourSide(1000, 50), enemyStats: neutralEnemySide(1000, 50, 50),
        strategyId: 'not-a-strategy', scouted: false,
      })
    ).toThrow()
  })
})

describe('runBattleToCompletion', () => {
  it('always terminates with a definite outcome', () => {
    const result = runBattleToCompletion({
      yourArmy: 50000,
      enemyArmy: 50000,
      yourStats: neutralYourSide(50000, 70),
      enemyStats: neutralEnemySide(50000, 70, 50),
      strategyId: 'balanced',
      scouted: false,
    })
    expect(['victory', 'defeat']).toContain(result.outcome)
    expect(result.ticks).toBeGreaterThan(0)
  })

  it('an overwhelming advantage wins the large majority of the time', () => {
    let wins = 0
    const N = 200
    for (let i = 0; i < N; i++) {
      const result = runBattleToCompletion({
        yourArmy: 100000,
        enemyArmy: 5000,
        yourStats: neutralYourSide(100000, 90, { morale: 85, leadership: 80, strategy: 80, supply: 85 }),
        enemyStats: neutralEnemySide(5000, 30, 20, { morale: 40, supply: 40 }),
        strategyId: 'balanced',
        scouted: false,
      })
      if (result.outcome === 'victory') wins++
    }
    expect(wins / N).toBeGreaterThan(0.9)
  })

  it('a dead-even matchup is close to 50/50 over many runs', () => {
    let wins = 0
    const N = 300
    for (let i = 0; i < N; i++) {
      const result = runBattleToCompletion({
        yourArmy: 50000,
        enemyArmy: 50000,
        yourStats: neutralYourSide(50000, 70),
        enemyStats: neutralEnemySide(50000, 70, 50),
        strategyId: 'balanced',
        scouted: false,
      })
      if (result.outcome === 'victory') wins++
    }
    const winRate = wins / N
    expect(winRate).toBeGreaterThan(0.35)
    expect(winRate).toBeLessThan(0.65)
  })
})

// --- finalizing a result ---------------------------------------------------

describe('finalizeBattleResult', () => {
  it('computes casualties as the difference between starting and final army', () => {
    const result = finalizeBattleResult({
      outcome: 'victory',
      startingYourArmy: 50000, yourArmy: 42000,
      startingEnemyArmy: 40000, enemyArmy: 6000,
      enemyGold: 10000,
    })
    expect(result.yourCasualties).toBe(8000)
    expect(result.enemyCasualties).toBe(34000)
  })

  it('grants soldiers only on a victory where the enemy has survivors left', () => {
    const surrenderVictory = finalizeBattleResult({
      outcome: 'victory', startingYourArmy: 50000, yourArmy: 45000,
      startingEnemyArmy: 40000, enemyArmy: 8000, enemyGold: 5000,
    })
    expect(surrenderVictory.soldiersGained).toBeGreaterThan(0)

    const totalWipeoutVictory = finalizeBattleResult({
      outcome: 'victory', startingYourArmy: 50000, yourArmy: 45000,
      startingEnemyArmy: 40000, enemyArmy: 0, enemyGold: 5000,
    })
    expect(totalWipeoutVictory.soldiersGained).toBe(0)
  })

  it('never grants gold or soldiers on a defeat', () => {
    const result = finalizeBattleResult({
      outcome: 'defeat', startingYourArmy: 10000, yourArmy: 4000,
      startingEnemyArmy: 50000, enemyArmy: 45000, enemyGold: 10000,
    })
    expect(result.goldGained).toBe(0)
    expect(result.soldiersGained).toBe(0)
    expect(result.moraleChange).toBeLessThan(0)
  })

  it('a costlier defeat hurts morale more than a cheap one', () => {
    const cheapDefeat = finalizeBattleResult({
      outcome: 'defeat', startingYourArmy: 10000, yourArmy: 8000,
      startingEnemyArmy: 50000, enemyArmy: 45000, enemyGold: 0,
    })
    const costlyDefeat = finalizeBattleResult({
      outcome: 'defeat', startingYourArmy: 10000, yourArmy: 500,
      startingEnemyArmy: 50000, enemyArmy: 45000, enemyGold: 0,
    })
    expect(costlyDefeat.moraleChange).toBeLessThan(cheapDefeat.moraleChange)
  })
})

// --- roster extraction (unchanged behavior) --------------------------------

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

describe('extractCouncilEconomyInputs', () => {
  it('contributes 0 rather than throwing when a role is missing', () => {
    const inputs = extractCouncilEconomyInputs([])
    expect(inputs.masterOfCoinRating).toBe(0)
    expect(inputs.diplomacyRating).toBe(0)
    expect(inputs.masterOfWhispersRating).toBe(0)
  })
})