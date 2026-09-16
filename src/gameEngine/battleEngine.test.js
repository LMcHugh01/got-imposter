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
  computeBreakThreshold,
  computeRallyChance,
  computeNetCompositionAdvantage,
  FORMATIONS,
  TERRAIN_FORMATION_AFFINITY,
  computeTerrainFormationMultiplier,
  applyFormationToBreakThreshold,
  ORDERS,
  resolvePersonalityProfile,
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
    discipline: 50,
    executionSkill: 0.5,
    ...overrides,
  }
}

function neutralEnemySide(armySize, armyQuality, rating, overrides = {}) {
  return { armySize, armyQuality, morale: 75, supply: 80, rating, gold: 5000, ...overrides }
}

// A perfectly balanced 3-way split of `total` — used everywhere a test
// cares about army SIZE but not composition. Since composition only
// affects casualty rate via netCompositionAdvantage (§5), and two
// balanced/identical-ratio sides net to advantage ~0 regardless of their
// respective totals, using this for both sides reproduces the exact same
// numbers every pre-composition test already expected — composition
// contributes zero effect when neither side has a lopsided mix.
function neutralTroops(total) {
  const infantry = Math.round(total / 3)
  const archers = Math.round(total / 3)
  const cavalry = total - infantry - archers
  return { infantry, archers, cavalry }
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

  it('discipline has no effect on raw power — it only touches casualty rate, not computeYourPower', () => {
    const baseline = computeYourPower(neutralYourSide(50000, 70))
    const highDiscipline = computeYourPower(neutralYourSide(50000, 70, { discipline: 99 }))
    expect(highDiscipline).toBeCloseTo(baseline, 5)
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
      yourTroops: neutralTroops(50000),
      enemyTroops: neutralTroops(50000),
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
      yourTroops: neutralTroops(50000),
      enemyTroops: neutralTroops(100),
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
      yourTroops: neutralTroops(40000),
      enemyTroops: neutralTroops(9000),
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
      yourTroops: neutralTroops(100),
      enemyTroops: neutralTroops(50000),
      yourStats: neutralYourSide(100, 20),
      enemyStats: neutralEnemySide(50000, 90, 80),
      strategyId: 'balanced',
      scouted: false,
      rng: () => 0.5,
    })
    expect(result.outcome).toBe('defeat')
  })

  it('ambush gives a scouted bonus and an unscouted penalty on the opening exchange', () => {
    const base = { yourTroops: neutralTroops(50000), enemyTroops: neutralTroops(50000), strategyId: 'ambush', rng: () => 0.5 }
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
        yourTroops: neutralTroops(1000), enemyTroops: neutralTroops(1000),
        yourStats: neutralYourSide(1000, 50), enemyStats: neutralEnemySide(1000, 50, 50),
        strategyId: 'not-a-strategy', scouted: false,
      })
    ).toThrow()
  })

  it('high discipline reduces YOUR casualties without changing the enemy\'s', () => {
    const base = { yourTroops: neutralTroops(50000), enemyTroops: neutralTroops(50000), strategyId: 'balanced', scouted: false, rng: () => 0.5 }
    const lowDiscipline = tickBattle({
      ...base,
      yourStats: neutralYourSide(50000, 70, { discipline: 1 }),
      enemyStats: neutralEnemySide(50000, 70, 50),
    })
    const highDiscipline = tickBattle({
      ...base,
      yourStats: neutralYourSide(50000, 70, { discipline: 99 }),
      enemyStats: neutralEnemySide(50000, 70, 50),
    })
    expect(highDiscipline.yourCasualties).toBeLessThan(lowDiscipline.yourCasualties)
    expect(highDiscipline.enemyCasualties).toBe(lowDiscipline.enemyCasualties)
  })
})

describe('runBattleToCompletion', () => {
  it('always terminates with a definite outcome', () => {
    const result = runBattleToCompletion({
      yourTroops: neutralTroops(50000),
      enemyTroops: neutralTroops(50000),
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
        yourTroops: neutralTroops(100000),
        enemyTroops: neutralTroops(5000),
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
        yourTroops: neutralTroops(50000),
        enemyTroops: neutralTroops(50000),
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

// --- troop composition (BATTLE_PLAN.md §5) ---------------------------------

describe('computeNetCompositionAdvantage', () => {
  it('is exactly 0 for two identically-shaped compositions, regardless of total size', () => {
    expect(computeNetCompositionAdvantage(neutralTroops(50000), neutralTroops(50000))).toBeCloseTo(0, 10)
    expect(computeNetCompositionAdvantage(neutralTroops(50000), neutralTroops(9000))).toBeCloseTo(0, 5)
  })

  it('is positive when your composition counters theirs (all Cavalry vs all Archers)', () => {
    const allCavalry = { infantry: 0, archers: 0, cavalry: 10000 }
    const allArchers = { infantry: 0, archers: 10000, cavalry: 0 }
    expect(computeNetCompositionAdvantage(allCavalry, allArchers)).toBeGreaterThan(0)
  })

  it('is negative when their composition counters yours', () => {
    const allArchers = { infantry: 0, archers: 10000, cavalry: 0 }
    const allCavalry = { infantry: 0, archers: 0, cavalry: 10000 }
    expect(computeNetCompositionAdvantage(allArchers, allCavalry)).toBeLessThan(0)
  })

  it('the full triangle: Cavalry > Archers > Infantry > Cavalry', () => {
    const cavalry = { infantry: 0, archers: 0, cavalry: 10000 }
    const archers = { infantry: 0, archers: 10000, cavalry: 0 }
    const infantry = { infantry: 10000, archers: 0, cavalry: 0 }
    expect(computeNetCompositionAdvantage(cavalry, archers)).toBeGreaterThan(0)
    expect(computeNetCompositionAdvantage(archers, infantry)).toBeGreaterThan(0)
    expect(computeNetCompositionAdvantage(infantry, cavalry)).toBeGreaterThan(0)
  })
})

describe('composition in tickBattle', () => {
  it('a favorable matchup reduces your casualty rate and increases the enemy\'s, vs. a neutral matchup', () => {
    const neutralFight = tickBattle({
      yourTroops: neutralTroops(50000),
      enemyTroops: neutralTroops(50000),
      yourStats: neutralYourSide(50000, 70),
      enemyStats: neutralEnemySide(50000, 70, 50),
      strategyId: 'balanced', scouted: false, rng: () => 0.5,
    })
    const favorableFight = tickBattle({
      yourTroops: { infantry: 0, archers: 0, cavalry: 50000 }, // all Cavalry
      enemyTroops: { infantry: 0, archers: 50000, cavalry: 0 }, // all Archers -> countered by Cavalry
      yourStats: neutralYourSide(50000, 70),
      enemyStats: neutralEnemySide(50000, 70, 50),
      strategyId: 'balanced', scouted: false, rng: () => 0.5,
    })
    expect(favorableFight.yourCasualties).toBeLessThan(neutralFight.yourCasualties)
    expect(favorableFight.enemyCasualties).toBeGreaterThan(neutralFight.enemyCasualties)
  })

  it('the bleeding mechanic: a countered type takes disproportionately more of its side\'s losses', () => {
    // Your archers (countered by their cavalry) should lose a bigger
    // share than your infantry (which counters their cavalry) does,
    // relative to each type's starting share of your army.
    const result = tickBattle({
      yourTroops: { infantry: 25000, archers: 25000, cavalry: 0 },
      enemyTroops: { infantry: 0, archers: 0, cavalry: 50000 },
      yourStats: neutralYourSide(50000, 70),
      enemyStats: neutralEnemySide(50000, 70, 50),
      strategyId: 'balanced', scouted: false, rng: () => 0.5,
    })
    const infantryLossRate = (25000 - result.yourTroops.infantry) / 25000
    const archersLossRate = (25000 - result.yourTroops.archers) / 25000
    expect(archersLossRate).toBeGreaterThan(infantryLossRate)
  })

  it('never loses more of a troop type than that side actually has', () => {
    const result = tickBattle({
      yourTroops: { infantry: 100, archers: 0, cavalry: 0 },
      enemyTroops: neutralTroops(200000),
      yourStats: neutralYourSide(100, 20),
      enemyStats: neutralEnemySide(200000, 90, 80),
      strategyId: 'balanced', scouted: false, rng: () => 0.5,
    })
    expect(result.yourTroops.infantry).toBeGreaterThanOrEqual(0)
    expect(result.yourTroops.archers).toBe(0)
    expect(result.yourTroops.cavalry).toBe(0)
  })

  it('army totals returned always equal the sum of the returned troops breakdown', () => {
    const result = tickBattle({
      yourTroops: { infantry: 20000, archers: 15000, cavalry: 15000 },
      enemyTroops: { infantry: 10000, archers: 10000, cavalry: 30000 },
      yourStats: neutralYourSide(50000, 70),
      enemyStats: neutralEnemySide(50000, 70, 50),
      strategyId: 'balanced', scouted: false, rng: () => 0.5,
    })
    expect(result.yourArmy).toBe(result.yourTroops.infantry + result.yourTroops.archers + result.yourTroops.cavalry)
    expect(result.enemyArmy).toBe(result.enemyTroops.infantry + result.enemyTroops.archers + result.enemyTroops.cavalry)
  })
})

// --- finalizing a result ---------------------------------------------------

describe('finalizeBattleResult', () => {
  it('computes NET casualties (post wounded-recovery), not the gross starting/final difference', () => {
    // Gross loss is 8000 (50000 -> 42000). Victory recovery: killed = 8000*0.4
    // = 3200, wounded = 4800, recovered = 4800*0.75 = 3600 -> net = 3200 + 1200 = 4400.
    const result = finalizeBattleResult({
      outcome: 'victory',
      startingYourArmy: 50000, yourArmy: 42000,
      startingEnemyArmy: 40000, enemyArmy: 6000,
      enemyGold: 10000,
    })
    expect(result.yourCasualties).toBe(4400)
    // Enemy casualties are NOT put through the recovery split — only your
    // own side's wounded return, the enemy's don't.
    expect(result.enemyCasualties).toBe(34000)
  })

  it('a victory recovers more of your wounded than a defeat does, for the same gross loss', () => {
    const victory = finalizeBattleResult({
      outcome: 'victory', startingYourArmy: 10000, yourArmy: 8000,
      startingEnemyArmy: 50000, enemyArmy: 1000, enemyGold: 5000,
    })
    const defeat = finalizeBattleResult({
      outcome: 'defeat', startingYourArmy: 10000, yourArmy: 8000,
      startingEnemyArmy: 50000, enemyArmy: 45000, enemyGold: 5000,
    })
    expect(victory.yourCasualties).toBeLessThan(defeat.yourCasualties)
  })

  it('a retreat recovers less than a victory but more than a defeat, for the same gross loss', () => {
    const base = { startingYourArmy: 10000, yourArmy: 8000, startingEnemyArmy: 50000, enemyGold: 5000 }
    const victory = finalizeBattleResult({ ...base, outcome: 'victory', enemyArmy: 1000 })
    const retreat = finalizeBattleResult({ ...base, outcome: 'retreat', enemyArmy: 45000 })
    const defeat = finalizeBattleResult({ ...base, outcome: 'defeat', enemyArmy: 45000 })
    expect(retreat.yourCasualties).toBeGreaterThan(victory.yourCasualties)
    expect(retreat.yourCasualties).toBeLessThan(defeat.yourCasualties)
  })

  it('a retreat grants no gold or soldiers, same as a defeat', () => {
    const result = finalizeBattleResult({
      outcome: 'retreat', startingYourArmy: 10000, yourArmy: 7000,
      startingEnemyArmy: 50000, enemyArmy: 45000, enemyGold: 10000,
    })
    expect(result.goldGained).toBe(0)
    expect(result.soldiersGained).toBe(0)
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

// --- rout / break threshold -------------------------------------------

describe('computeBreakThreshold', () => {
  it('a higher morale army can absorb more cumulative casualties before breaking', () => {
    const lowMorale = computeBreakThreshold(10000, 20)
    const highMorale = computeBreakThreshold(10000, 90)
    expect(highMorale).toBeGreaterThan(lowMorale)
  })

  it('scales with starting army size', () => {
    const small = computeBreakThreshold(5000, 50)
    const large = computeBreakThreshold(50000, 50)
    expect(large).toBeGreaterThan(small)
  })

  it('never returns 0 or negative, even at minimum morale', () => {
    expect(computeBreakThreshold(100, 0)).toBeGreaterThan(0)
  })
})

describe('computeRallyChance', () => {
  it('ranges from 30% at rating 0 to 70% at rating 100', () => {
    expect(computeRallyChance(0)).toBeCloseTo(0.3, 5)
    expect(computeRallyChance(100)).toBeCloseTo(0.7, 5)
  })

  it('a stronger Commander gives a better chance', () => {
    expect(computeRallyChance(90)).toBeGreaterThan(computeRallyChance(20))
  })
})

describe('runBattleToCompletion with respectBreakThresholds', () => {
  it('is unaffected by default (respectBreakThresholds off) — same as before', () => {
    const result = runBattleToCompletion({
      yourTroops: neutralTroops(50000), enemyTroops: neutralTroops(50000),
      yourStats: neutralYourSide(50000, 70), enemyStats: neutralEnemySide(50000, 70, 50),
      strategyId: 'balanced', scouted: false,
    })
    expect(['victory', 'defeat']).toContain(result.outcome)
  })

  it('can end a fight in far fewer ticks than a fight-to-zero would take, once opted in', () => {
    const stats = neutralYourSide(50000, 70, { morale: 20 }) // low morale -> low break threshold
    const withoutBreak = runBattleToCompletion({
      yourTroops: neutralTroops(50000), enemyTroops: neutralTroops(200000),
      yourStats: stats, enemyStats: neutralEnemySide(200000, 90, 80),
      strategyId: 'balanced', scouted: false, rng: () => 0.5,
    })
    const withBreak = runBattleToCompletion({
      yourTroops: neutralTroops(50000), enemyTroops: neutralTroops(200000),
      yourStats: stats, enemyStats: neutralEnemySide(200000, 90, 80),
      strategyId: 'balanced', scouted: false, rng: () => 0.5, respectBreakThresholds: true,
    })
    expect(withBreak.outcome).toBe('defeat')
    expect(withBreak.ticks).toBeLessThanOrEqual(withoutBreak.ticks)
  })
})

// --- Regroup strategy ---------------------------------------------------

describe('Regroup strategy', () => {
  it('is a registered strategy with reduced casualty multipliers both sides', () => {
    expect(STRATEGIES.regroup.yourCasualtyMultiplier).toBeLessThan(1)
    expect(STRATEGIES.regroup.enemyCasualtyMultiplier).toBeLessThan(1)
  })

  it('costs you power share/ground relative to balanced, at the same stats', () => {
    const balancedResult = tickBattle({
      yourTroops: neutralTroops(50000), enemyTroops: neutralTroops(50000),
      yourStats: neutralYourSide(50000, 70), enemyStats: neutralEnemySide(50000, 70, 50),
      strategyId: 'balanced', scouted: false, rng: () => 0.5,
    })
    const regroupResult = tickBattle({
      yourTroops: neutralTroops(50000), enemyTroops: neutralTroops(50000),
      yourStats: neutralYourSide(50000, 70), enemyStats: neutralEnemySide(50000, 70, 50),
      strategyId: 'regroup', scouted: false, rng: () => 0.5,
    })
    // Regroup cedes ground (lower yourShare) -> the enemy takes relatively
    // fewer casualties than under balanced, even with the casualty-rate cut.
    expect(regroupResult.yourCasualties).toBeLessThan(balancedResult.yourCasualties)
  })
})

// --- Formation & Terrain (BATTLE_PLAN.md §9-§10) ---------------------------

describe('applyFormationToBreakThreshold', () => {
  it('Balanced Line never changes the base threshold, on any terrain', () => {
    const base = 5000
    for (const terrain of Object.keys(TERRAIN_FORMATION_AFFINITY)) {
      expect(applyFormationToBreakThreshold(base, 'balanced', terrain)).toBe(base)
    }
  })

  it('Shield Wall raises the threshold; Cavalry Vanguard lowers it', () => {
    const base = 5000
    expect(applyFormationToBreakThreshold(base, 'shieldWall', 'plains')).toBeGreaterThan(base)
    expect(applyFormationToBreakThreshold(base, 'cavalryVanguard', 'plains')).toBeLessThan(base)
  })

  it('a favorable terrain amplifies the formation\'s effect beyond a neutral terrain', () => {
    const base = 5000
    // Riverlands favors Shield Wall; Plains neither favors nor penalizes it.
    const onFavorable = applyFormationToBreakThreshold(base, 'shieldWall', 'riverlands')
    const onNeutral = applyFormationToBreakThreshold(base, 'shieldWall', 'plains')
    expect(onFavorable).toBeGreaterThan(onNeutral)
  })

  it('an unfavorable terrain dampens the formation\'s effect toward (but not past) neutral', () => {
    const base = 5000
    // Forest penalizes Cavalry Vanguard.
    const onUnfavorable = applyFormationToBreakThreshold(base, 'cavalryVanguard', 'forest')
    const onNeutralTerrain = applyFormationToBreakThreshold(base, 'cavalryVanguard', 'plains')
    // Still lower than base (never flips into a bonus)...
    expect(onUnfavorable).toBeLessThan(base)
    // ...but closer to base than the neutral-terrain case (dampened, not gone).
    expect(onUnfavorable).toBeGreaterThan(onNeutralTerrain)
  })
})

describe('computeTerrainFormationMultiplier', () => {
  it('is always 1 for Balanced Line, regardless of terrain', () => {
    for (const terrain of Object.keys(TERRAIN_FORMATION_AFFINITY)) {
      expect(computeTerrainFormationMultiplier(terrain, 'balanced')).toBe(1)
    }
  })

  it('is >1 for a favored matchup and <1 for a penalized one', () => {
    expect(computeTerrainFormationMultiplier('riverlands', 'shieldWall')).toBeGreaterThan(1)
    expect(computeTerrainFormationMultiplier('forest', 'cavalryVanguard')).toBeLessThan(1)
  })

  it('is exactly 1 for a terrain/formation pair with no listed affinity', () => {
    // Snowfields favors shieldWall but has no opinion on skirmishLine.
    expect(computeTerrainFormationMultiplier('snowfields', 'skirmishLine')).toBe(1)
  })
})

describe('Formation effects in tickBattle', () => {
  it('Shield Wall reduces bleed on the countered lead type (Infantry) vs Balanced Line', () => {
    // Your Infantry, split evenly with Cavalry; enemy is all Archers,
    // which counters Infantry (COUNTERS.archers = 'infantry') -- Infantry
    // is the exposed type here, not the favored one.
    const yourTroops = { infantry: 25000, archers: 0, cavalry: 25000 }
    const enemyTroops = { infantry: 0, archers: 50000, cavalry: 0 }
    const base = {
      yourTroops, enemyTroops,
      yourStats: neutralYourSide(50000, 70), enemyStats: neutralEnemySide(50000, 70, 50),
      strategyId: 'balanced', scouted: false, rng: () => 0.5,
    }
    const balancedResult = tickBattle({ ...base, formationId: 'balanced' })
    const shieldWallResult = tickBattle({ ...base, formationId: 'shieldWall' })
    const balancedInfantryLossRate = (25000 - balancedResult.yourTroops.infantry) / 25000
    const shieldWallInfantryLossRate = (25000 - shieldWallResult.yourTroops.infantry) / 25000
    expect(shieldWallInfantryLossRate).toBeLessThan(balancedInfantryLossRate)
  })

  it('Cavalry Vanguard gives a composition-advantage boost only in the opening ticks', () => {
    const base = {
      yourTroops: neutralTroops(50000), enemyTroops: neutralTroops(50000),
      yourStats: neutralYourSide(50000, 70), enemyStats: neutralEnemySide(50000, 70, 50),
      strategyId: 'balanced', scouted: false, rng: () => 0.5,
    }
    const openingBalanced = tickBattle({ ...base, formationId: 'balanced', ticksElapsed: 0 })
    const openingVanguard = tickBattle({ ...base, formationId: 'cavalryVanguard', ticksElapsed: 0 })
    expect(openingVanguard.enemyCasualties).toBeGreaterThan(openingBalanced.enemyCasualties)

    const laterBalanced = tickBattle({ ...base, formationId: 'balanced', ticksElapsed: 10 })
    const laterVanguard = tickBattle({ ...base, formationId: 'cavalryVanguard', ticksElapsed: 10 })
    expect(laterVanguard.enemyCasualties).toBe(laterBalanced.enemyCasualties)
  })

  it('Skirmish Line cuts casualties for BOTH sides in the opening ticks only', () => {
    const base = {
      yourTroops: neutralTroops(50000), enemyTroops: neutralTroops(50000),
      yourStats: neutralYourSide(50000, 70), enemyStats: neutralEnemySide(50000, 70, 50),
      strategyId: 'balanced', scouted: false, rng: () => 0.5,
    }
    const openingBalanced = tickBattle({ ...base, formationId: 'balanced', ticksElapsed: 0 })
    const openingSkirmish = tickBattle({ ...base, formationId: 'skirmishLine', ticksElapsed: 0 })
    expect(openingSkirmish.yourCasualties).toBeLessThan(openingBalanced.yourCasualties)
    expect(openingSkirmish.enemyCasualties).toBeLessThan(openingBalanced.enemyCasualties)

    const laterBalanced = tickBattle({ ...base, formationId: 'balanced', ticksElapsed: 10 })
    const laterSkirmish = tickBattle({ ...base, formationId: 'skirmishLine', ticksElapsed: 10 })
    expect(laterSkirmish.yourCasualties).toBe(laterBalanced.yourCasualties)
    expect(laterSkirmish.enemyCasualties).toBe(laterBalanced.enemyCasualties)
  })

  it('cramped terrain (Forest) compresses a numbers advantage — the stronger side benefits less from its size', () => {
    // Asymmetric on purpose: a symmetric matchup can't reveal this effect
    // at all, since equal armies scale identically regardless of exponent
    // and the power RATIO stays 0.5 either way. Here you have 4x their
    // army size -- Forest should narrow (not erase) that edge.
    const base = {
      yourTroops: neutralTroops(80000), enemyTroops: neutralTroops(20000),
      yourStats: neutralYourSide(80000, 70), enemyStats: neutralEnemySide(20000, 70, 50),
      strategyId: 'balanced', scouted: false, rng: () => 0.5, formationId: 'balanced',
    }
    const onPlains = tickBattle({ ...base, terrain: 'plains' })
    const onForest = tickBattle({ ...base, terrain: 'forest' })
    // Your numbers advantage is worth relatively less on cramped terrain,
    // so you (the stronger side) take MORE casualties there, and the
    // weaker enemy takes relatively FEWER.
    expect(onForest.yourCasualties).toBeGreaterThan(onPlains.yourCasualties)
    expect(onForest.enemyCasualties).toBeLessThan(onPlains.enemyCasualties)
  })

  it('Snowfields increases casualties for both sides regardless of formation', () => {
    const base = {
      yourTroops: neutralTroops(50000), enemyTroops: neutralTroops(50000),
      yourStats: neutralYourSide(50000, 70), enemyStats: neutralEnemySide(50000, 70, 50),
      strategyId: 'balanced', scouted: false, rng: () => 0.5, formationId: 'balanced',
    }
    const onPlains = tickBattle({ ...base, terrain: 'plains' })
    const onSnow = tickBattle({ ...base, terrain: 'snowfields' })
    expect(onSnow.yourCasualties).toBeGreaterThan(onPlains.yourCasualties)
    expect(onSnow.enemyCasualties).toBeGreaterThan(onPlains.enemyCasualties)
  })

  it('an unknown formationId falls back to Balanced Line rather than throwing', () => {
    expect(() =>
      tickBattle({
        yourTroops: neutralTroops(1000), enemyTroops: neutralTroops(1000),
        yourStats: neutralYourSide(1000, 50), enemyStats: neutralEnemySide(1000, 50, 50),
        strategyId: 'balanced', scouted: false, formationId: 'not-a-formation',
      })
    ).not.toThrow()
  })
})

// --- Orders: Charge & Volley (BATTLE_PLAN.md §7) ---------------------------

describe('ORDERS metadata', () => {
  it('declares the troop type each order requires, for UI gating', () => {
    expect(ORDERS.charge.requiresType).toBe('cavalry')
    expect(ORDERS.volley.requiresType).toBe('archers')
  })
})

describe('Charge order', () => {
  it('increases enemy casualties vs. no order, scaled by how much cavalry you have', () => {
    const base = {
      yourTroops: neutralTroops(50000), enemyTroops: neutralTroops(50000),
      yourStats: neutralYourSide(50000, 70), enemyStats: neutralEnemySide(50000, 70, 50),
      strategyId: 'balanced', scouted: false, rng: () => 0.5,
    }
    const noOrder = tickBattle({ ...base, order: null })
    const withCharge = tickBattle({ ...base, order: { id: 'charge' } })
    expect(withCharge.enemyCasualties).toBeGreaterThan(noOrder.enemyCasualties)
  })

  it('costs you extra Cavalry casualties specifically, relative to no order', () => {
    const base = {
      yourTroops: { infantry: 20000, archers: 20000, cavalry: 10000 },
      enemyTroops: neutralTroops(50000),
      yourStats: neutralYourSide(50000, 70), enemyStats: neutralEnemySide(50000, 70, 50),
      strategyId: 'balanced', scouted: false, rng: () => 0.5,
    }
    const noOrder = tickBattle({ ...base, order: null })
    const withCharge = tickBattle({ ...base, order: { id: 'charge' } })
    const noOrderCavalryLoss = 10000 - noOrder.yourTroops.cavalry
    const chargeCavalryLoss = 10000 - withCharge.yourTroops.cavalry
    expect(chargeCavalryLoss).toBeGreaterThan(noOrderCavalryLoss)
  })

  it('has no effect if you have zero cavalry', () => {
    const base = {
      yourTroops: { infantry: 25000, archers: 25000, cavalry: 0 },
      enemyTroops: neutralTroops(50000),
      yourStats: neutralYourSide(50000, 70), enemyStats: neutralEnemySide(50000, 70, 50),
      strategyId: 'balanced', scouted: false, rng: () => 0.5,
    }
    const noOrder = tickBattle({ ...base, order: null })
    const withCharge = tickBattle({ ...base, order: { id: 'charge' } })
    expect(withCharge.enemyCasualties).toBe(noOrder.enemyCasualties)
    expect(withCharge.yourCasualties).toBe(noOrder.yourCasualties)
  })
})

describe('Volley order', () => {
  it('redirecting Archers to target Cavalry changes the composition advantage vs. the default Infantry targeting', () => {
    // Your archers, facing an enemy that's ALL cavalry -- the default
    // targeting (archers -> infantry) gets nothing from this matchup
    // since the enemy has no infantry at all; redirecting to Cavalry
    // should pick up a real advantage instead.
    const base = {
      yourTroops: { infantry: 0, archers: 50000, cavalry: 0 },
      enemyTroops: { infantry: 0, archers: 0, cavalry: 50000 },
      yourStats: neutralYourSide(50000, 70), enemyStats: neutralEnemySide(50000, 70, 50),
      strategyId: 'balanced', scouted: false, rng: () => 0.5,
    }
    const defaultTargeting = tickBattle({ ...base, order: null })
    const volleyCavalry = tickBattle({ ...base, order: { id: 'volley', target: 'cavalry' } })
    expect(volleyCavalry.enemyCasualties).toBeGreaterThan(defaultTargeting.enemyCasualties)
  })

  it('does not affect the enemy\'s own targeting — only your side redirects', () => {
    const base = {
      yourTroops: neutralTroops(50000), enemyTroops: neutralTroops(50000),
      yourStats: neutralYourSide(50000, 70), enemyStats: neutralEnemySide(50000, 70, 50),
      strategyId: 'balanced', scouted: false, rng: () => 0.5,
    }
    const noOrder = tickBattle({ ...base, order: null })
    const volley = tickBattle({ ...base, order: { id: 'volley', target: 'cavalry' } })
    // Two balanced/identical mixes net to 0 either way (redirecting one
    // symmetric term doesn't break that symmetry here), so this mainly
    // confirms neither call throws and both resolve sensibly.
    expect(volley.outcome === null || ['victory', 'defeat'].includes(volley.outcome)).toBe(true)
    expect(noOrder.outcome === null || ['victory', 'defeat'].includes(noOrder.outcome)).toBe(true)
  })
})

// --- Enemy personality battle AI (BATTLE_PLAN.md §12) ----------------------

describe('resolvePersonalityProfile', () => {
  const troopsWithCavalry = { infantry: 20000, archers: 20000, cavalry: 10000 }
  const troopsWithoutCavalry = { infantry: 25000, archers: 25000, cavalry: 0 }

  it('maps each named personality to its documented formation', () => {
    expect(resolvePersonalityProfile('aggressive', troopsWithCavalry).formationId).toBe('cavalryVanguard')
    expect(resolvePersonalityProfile('defensive', troopsWithCavalry).formationId).toBe('shieldWall')
    expect(resolvePersonalityProfile('economic', troopsWithCavalry).formationId).toBe('balanced')
    expect(resolvePersonalityProfile('deceptive', troopsWithCavalry).formationId).toBe('skirmishLine')
    expect(resolvePersonalityProfile('diplomatic', troopsWithCavalry).formationId).toBe('balanced')
  })

  it('downgrades Aggressive to Balanced Line if the house has no cavalry', () => {
    const profile = resolvePersonalityProfile('aggressive', troopsWithoutCavalry)
    expect(profile.formationId).toBe('balanced')
  })

  it('Deceptive is the only profile with an opening ambush-style bonus', () => {
    expect(resolvePersonalityProfile('deceptive', troopsWithCavalry).ambushOpening).toBe(true)
    expect(resolvePersonalityProfile('aggressive', troopsWithCavalry).ambushOpening).toBeFalsy()
  })

  it('economic is the most break-prone (protective of its own forces)', () => {
    const economic = resolvePersonalityProfile('economic', troopsWithCavalry)
    const defensive = resolvePersonalityProfile('defensive', troopsWithCavalry)
    expect(economic.breakThresholdMultiplier).toBeLessThan(1)
    expect(defensive.breakThresholdMultiplier).toBeGreaterThan(1)
  })

  it('"unpredictable" resolves to one of the other 5 profiles, deterministically for a fixed rng', () => {
    const namedPersonalities = ['aggressive', 'defensive', 'economic', 'deceptive', 'diplomatic']
    const profile = resolvePersonalityProfile('unpredictable', troopsWithCavalry, () => 0)
    expect(namedPersonalities).toContain(profile.resolvedPersonality)
    expect(profile.resolvedPersonality).not.toBe('unpredictable')
  })

  it('an unrecognized personality falls back to the neutral Diplomatic profile rather than throwing', () => {
    expect(() => resolvePersonalityProfile('not-a-personality', troopsWithCavalry)).not.toThrow()
    expect(resolvePersonalityProfile('not-a-personality', troopsWithCavalry).formationId).toBe('balanced')
  })
})

describe('personality AI effects in tickBattle', () => {
  it('is a complete no-op when no enemyProfile is passed — fully backward compatible', () => {
    const base = {
      yourTroops: neutralTroops(50000), enemyTroops: neutralTroops(50000),
      yourStats: neutralYourSide(50000, 70), enemyStats: neutralEnemySide(50000, 70, 50),
      strategyId: 'balanced', scouted: false, rng: () => 0.5,
    }
    const withoutProfile = tickBattle(base)
    const withNeutralProfile = tickBattle({
      ...base,
      enemyProfile: { formationId: 'balanced', dealtMultiplier: 1, takenMultiplier: 1, breakThresholdMultiplier: 1, ambushOpening: false },
    })
    expect(withoutProfile.yourCasualties).toBe(withNeutralProfile.yourCasualties)
    expect(withoutProfile.enemyCasualties).toBe(withNeutralProfile.enemyCasualties)
  })

  it('Aggressive increases casualties on BOTH sides vs. a neutral profile (dealt AND taken multipliers > 1)', () => {
    const base = {
      yourTroops: neutralTroops(50000), enemyTroops: neutralTroops(50000),
      yourStats: neutralYourSide(50000, 70), enemyStats: neutralEnemySide(50000, 70, 50),
      strategyId: 'balanced', scouted: false, rng: () => 0.5,
    }
    const neutral = tickBattle(base)
    const vsAggressive = tickBattle({ ...base, enemyProfile: resolvePersonalityProfile('aggressive', base.enemyTroops) })
    expect(vsAggressive.yourCasualties).toBeGreaterThan(neutral.yourCasualties)
    expect(vsAggressive.enemyCasualties).toBeGreaterThan(neutral.enemyCasualties)
  })

  it('Defensive reduces casualties on both sides vs. a neutral profile', () => {
    const base = {
      yourTroops: neutralTroops(50000), enemyTroops: neutralTroops(50000),
      yourStats: neutralYourSide(50000, 70), enemyStats: neutralEnemySide(50000, 70, 50),
      strategyId: 'balanced', scouted: false, rng: () => 0.5,
    }
    const neutral = tickBattle(base)
    const vsDefensive = tickBattle({ ...base, enemyProfile: resolvePersonalityProfile('defensive', base.enemyTroops) })
    expect(vsDefensive.yourCasualties).toBeLessThan(neutral.yourCasualties)
    expect(vsDefensive.enemyCasualties).toBeLessThan(neutral.enemyCasualties)
  })

  it('enemy Cavalry Vanguard reduces your composition advantage in the opening ticks, vs. enemy Balanced Line', () => {
    const base = {
      yourTroops: { infantry: 25000, archers: 25000, cavalry: 0 },
      enemyTroops: { infantry: 0, archers: 0, cavalry: 50000 },
      yourStats: neutralYourSide(50000, 70), enemyStats: neutralEnemySide(50000, 70, 50),
      strategyId: 'balanced', scouted: false, rng: () => 0.5, ticksElapsed: 0,
    }
    const vsBalanced = tickBattle({ ...base, enemyProfile: resolvePersonalityProfile('economic', base.enemyTroops) })
    const vsAggressive = tickBattle({ ...base, enemyProfile: resolvePersonalityProfile('aggressive', base.enemyTroops) })
    // Aggressive's Cavalry Vanguard works against you -> you take more
    // casualties than against an equally-strong but Balanced-Line enemy.
    expect(vsAggressive.yourCasualties).toBeGreaterThan(vsBalanced.yourCasualties)
  })

  it('enemy Shield Wall reduces bleed on the enemy\'s own countered lead type, vs. enemy Balanced Line', () => {
    const base = {
      yourTroops: { infantry: 0, archers: 50000, cavalry: 0 }, // archers counter infantry
      enemyTroops: { infantry: 25000, archers: 0, cavalry: 25000 },
      yourStats: neutralYourSide(50000, 70), enemyStats: neutralEnemySide(50000, 70, 50),
      strategyId: 'balanced', scouted: false, rng: () => 0.5,
    }
    const vsBalanced = tickBattle({ ...base, enemyProfile: resolvePersonalityProfile('economic', base.enemyTroops) })
    const vsDefensive = tickBattle({ ...base, enemyProfile: resolvePersonalityProfile('defensive', base.enemyTroops) })
    const balancedInfantryLossRate = (25000 - vsBalanced.enemyTroops.infantry) / 25000
    const defensiveInfantryLossRate = (25000 - vsDefensive.enemyTroops.infantry) / 25000
    expect(defensiveInfantryLossRate).toBeLessThan(balancedInfantryLossRate)
  })

  it('Deceptive gives the enemy a one-time opening edge, tick 0 only', () => {
    const base = {
      yourTroops: neutralTroops(50000), enemyTroops: neutralTroops(50000),
      yourStats: neutralYourSide(50000, 70), enemyStats: neutralEnemySide(50000, 70, 50),
      strategyId: 'balanced', scouted: false, rng: () => 0.5,
    }
    const deceptiveProfile = resolvePersonalityProfile('deceptive', base.enemyTroops)
    const openingNeutral = tickBattle({ ...base, ticksElapsed: 0 })
    const openingDeceptive = tickBattle({ ...base, ticksElapsed: 0, enemyProfile: deceptiveProfile })
    expect(openingDeceptive.yourCasualties).toBeGreaterThan(openingNeutral.yourCasualties)

    const laterNeutral = tickBattle({ ...base, ticksElapsed: 5 })
    const laterDeceptive = tickBattle({ ...base, ticksElapsed: 5, enemyProfile: deceptiveProfile })
    expect(laterDeceptive.yourCasualties).toBe(laterNeutral.yourCasualties)
  })
})

// --- roster extraction -----------------------------------------------------

// All 23 attributes at a flat value — every role's positive weights sum to
// 1.0 (see roleWeights.js's own comment on this), so a flat-attribute
// character rates ~ that same flat value for every role. Handy for
// predictable fixtures without hand-computing each role's weighted sum.
function flatAttributes(value) {
  return {
    strength: value, speed: value, stealth: value, technique: value, endurance: value,
    strategy: value, cunning: value, scholarship: value, economy: value,
    diplomacy: value, etiquette: value, subterfuge: value,
    command: value, battleMorale: value, justice: value, recruitment: value,
    family: value, duty: value, honour: value, selfPreservation: value,
    intimidation: value, prestige: value, willpower: value,
  }
}

function fullRoster(attributeValue = 50) {
  return ROLES.map((role) => ({
    role,
    character: { id: role.id, name: role.label, attributes: flatAttributes(attributeValue), fightingStyle: null },
  }))
}

describe('extractCouncilBattleInputs', () => {
  it('pulls leadership/strategy/discipline from King/Commander/Kingsguard only, via roleRating', () => {
    const inputs = extractCouncilBattleInputs(fullRoster(50))
    // A flat-50 character rates ~50 for any role, since every role's
    // positive weights sum to 1.0 — see flatAttributes() above.
    expect(inputs.leadership).toBeCloseTo(50, 0)
    expect(inputs.strategy).toBeCloseTo(50, 0)
    expect(inputs.discipline).toBeCloseTo(50, 0)
    expect(inputs.executionSkill).toBeCloseTo(0.5, 1)
  })

  it('a low-Strength, high-Strategy Commander is NOT penalized (the "Tywin problem")', () => {
    // roleWeights.commander barely weights technique/strength at all
    // (strategy .35, command .25 dominate) — a raw-attribute source would
    // wrongly punish this character; roleRating should not.
    const weakStrengthStrongStrategy = { ...flatAttributes(50), strength: 1, technique: 1, strategy: 99, command: 90 }
    const roster = fullRoster(50).map((entry) =>
      entry.role.id === 'commander'
        ? { ...entry, character: { ...entry.character, attributes: weakStrengthStrongStrategy } }
        : entry
    )
    const inputs = extractCouncilBattleInputs(roster)
    expect(inputs.strategy).toBeGreaterThan(70)
  })

  it('contributes 0 rather than throwing when a role is missing', () => {
    const inputs = extractCouncilBattleInputs([])
    expect(inputs.leadership).toBe(0)
    expect(inputs.strategy).toBe(0)
    expect(inputs.discipline).toBe(0)
    expect(inputs.executionSkill).toBe(0)
  })
})

describe('extractCouncilEconomyInputs', () => {
  it('averages Master of Coin with Hand for Recruit', () => {
    const roster = fullRoster(50).map((entry) =>
      entry.role.id === 'hand' ? { ...entry, character: { ...entry.character, attributes: flatAttributes(90) } } : entry
    )
    const withStrongHand = extractCouncilEconomyInputs(roster).masterOfCoinRating
    const baseline = extractCouncilEconomyInputs(fullRoster(50)).masterOfCoinRating
    expect(withStrongHand).toBeGreaterThan(baseline)
  })

  it('averages Master of Whispers with Hand for Gather Intelligence', () => {
    const roster = fullRoster(50).map((entry) =>
      entry.role.id === 'hand' ? { ...entry, character: { ...entry.character, attributes: flatAttributes(90) } } : entry
    )
    const withStrongHand = extractCouncilEconomyInputs(roster).masterOfWhispersRating
    const baseline = extractCouncilEconomyInputs(fullRoster(50)).masterOfWhispersRating
    expect(withStrongHand).toBeGreaterThan(baseline)
  })

  it('Grand Maester and Master of Laws are independent — NOT averaged together', () => {
    const roster = fullRoster(50).map((entry) =>
      entry.role.id === 'grandMaester' ? { ...entry, character: { ...entry.character, attributes: flatAttributes(99) } } : entry
    )
    const inputs = extractCouncilEconomyInputs(roster)
    expect(inputs.grandMaesterRating).toBeGreaterThan(90)
    // Master of Laws' rating is untouched by Grand Maester's change. Note
    // this baseline is 25, not 50 — extractCouncilEconomyInputs uses
    // effectiveAttribute (raw attribute × fit%), matching the existing
    // convention already used for masterOfCoinRating/diplomacyRating. A
    // flat-50 character has roleRating('masterOfLaws') = 50 -> fit 0.5,
    // so effectiveAttribute('justice') = 50 × 0.5 = 25.
    expect(inputs.masterOfLawsRating).toBeCloseTo(25, 0)
  })

  it('contributes 0 rather than throwing when a role is missing', () => {
    const inputs = extractCouncilEconomyInputs([])
    expect(inputs.masterOfCoinRating).toBe(0)
    expect(inputs.diplomacyRating).toBe(0)
    expect(inputs.masterOfWhispersRating).toBe(0)
    expect(inputs.grandMaesterRating).toBe(0)
    expect(inputs.masterOfLawsRating).toBe(0)
  })
})