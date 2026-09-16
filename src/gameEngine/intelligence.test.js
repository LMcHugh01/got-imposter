import { describe, it, expect } from 'vitest'
import { gatherIntelligence, PERSONALITIES } from './intelligence'
import { TERRAIN_TYPES } from './battleEngine'

// morale/armyQuality/supply deliberately mid-range (not close to the
// 0/100 ceiling) — a value near a boundary combined with a wide
// low-accuracy split can get clamped, silently shrinking the reported
// width and making width-based assertions flaky depending on the random
// draw. See the fixed rng below for the same reason, applied to the
// specific test that checks width.
const enemyHouse = {
  armySize: 40000,
  troops: { infantry: 24000, archers: 8000, cavalry: 8000 },
  morale: 50,
  armyQuality: 50,
  supply: 50,
  personality: 'aggressive',
  terrain: 'forest',
}

describe('gatherIntelligence', () => {
  it('gives a wide army range and a wide morale range at low accuracy', () => {
    const report = gatherIntelligence({ masterOfWhispersRating: 5, enemyHouse, rng: () => 0.5 })
    expect(report.armyRangeHigh - report.armyRangeLow).toBeGreaterThan(30000)
    expect(report.moraleRangeHigh - report.moraleRangeLow).toBeGreaterThan(50)
  })

  it('gives meaningfully tighter army and morale ranges at high accuracy', () => {
    const report = gatherIntelligence({ masterOfWhispersRating: 95, enemyHouse })
    expect(report.armyRangeHigh - report.armyRangeLow).toBeLessThan(10000)
    expect(report.moraleRangeHigh - report.moraleRangeLow).toBeLessThan(15)
  })

  it('never collapses the army range to a single number, even at maximum accuracy', () => {
    const report = gatherIntelligence({ masterOfWhispersRating: 100, enemyHouse })
    expect(report.armyRangeHigh).toBeGreaterThan(report.armyRangeLow)
    expect(report.armyRangeHigh - report.armyRangeLow).toBeGreaterThan(1000)
  })

  it('the true army size always falls within the reported range', () => {
    for (const rating of [0, 10, 40, 70, 100]) {
      const report = gatherIntelligence({ masterOfWhispersRating: rating, enemyHouse })
      expect(enemyHouse.armySize).toBeGreaterThanOrEqual(report.armyRangeLow)
      expect(enemyHouse.armySize).toBeLessThanOrEqual(report.armyRangeHigh)
    }
  })

  it('the true morale always falls within the reported range, clamped to 0-100', () => {
    for (const rating of [0, 10, 40, 70, 100]) {
      const report = gatherIntelligence({ masterOfWhispersRating: rating, enemyHouse })
      expect(enemyHouse.morale).toBeGreaterThanOrEqual(report.moraleRangeLow)
      expect(enemyHouse.morale).toBeLessThanOrEqual(report.moraleRangeHigh)
      expect(report.moraleRangeLow).toBeGreaterThanOrEqual(0)
      expect(report.moraleRangeHigh).toBeLessThanOrEqual(100)
    }
  })

  it('is not centered on the true army size — the split is random, not symmetric', () => {
    // rng() = 0.2 -> only 20% of the total width goes below the true value,
    // 80% goes above -> the true value sits near the LOW end of the range.
    const skewedLow = gatherIntelligence({ masterOfWhispersRating: 50, enemyHouse, rng: () => 0.2 })
    const belowSpan = enemyHouse.armySize - skewedLow.armyRangeLow
    const aboveSpan = skewedLow.armyRangeHigh - enemyHouse.armySize
    expect(belowSpan).toBeLessThan(aboveSpan)

    // rng() = 0.8 -> the reverse: true value sits near the HIGH end.
    const skewedHigh = gatherIntelligence({ masterOfWhispersRating: 50, enemyHouse, rng: () => 0.8 })
    const belowSpan2 = enemyHouse.armySize - skewedHigh.armyRangeLow
    const aboveSpan2 = skewedHigh.armyRangeHigh - enemyHouse.armySize
    expect(belowSpan2).toBeGreaterThan(aboveSpan2)
  })

  // --- personality shortlist ------------------------------------------

  it('shows every personality (no signal at all) at zero accuracy', () => {
    const report = gatherIntelligence({ masterOfWhispersRating: 0, enemyHouse })
    expect(report.personalityShortlist).toHaveLength(PERSONALITIES.length)
    expect(report.personalityShortlist).toContain(enemyHouse.personality)
  })

  it('narrows to exactly the true personality at maximum accuracy', () => {
    const report = gatherIntelligence({ masterOfWhispersRating: 100, enemyHouse })
    expect(report.personalityShortlist).toEqual([enemyHouse.personality])
  })

  it('the true personality is always somewhere in the shortlist, at any accuracy', () => {
    for (const rating of [0, 10, 40, 70, 100]) {
      const report = gatherIntelligence({ masterOfWhispersRating: rating, enemyHouse })
      expect(report.personalityShortlist).toContain(enemyHouse.personality)
    }
  })

  it('the shortlist shrinks as accuracy increases', () => {
    const low = gatherIntelligence({ masterOfWhispersRating: 10, enemyHouse })
    const high = gatherIntelligence({ masterOfWhispersRating: 80, enemyHouse })
    expect(high.personalityShortlist.length).toBeLessThan(low.personalityShortlist.length)
  })

  // --- per-troop-type ranges (new) -------------------------------------

  it('reports an independent range per troop type, each containing its true count', () => {
    for (const rating of [0, 40, 100]) {
      const report = gatherIntelligence({ masterOfWhispersRating: rating, enemyHouse })
      expect(enemyHouse.troops.infantry).toBeGreaterThanOrEqual(report.infantryRangeLow)
      expect(enemyHouse.troops.infantry).toBeLessThanOrEqual(report.infantryRangeHigh)
      expect(enemyHouse.troops.archers).toBeGreaterThanOrEqual(report.archersRangeLow)
      expect(enemyHouse.troops.archers).toBeLessThanOrEqual(report.archersRangeHigh)
      expect(enemyHouse.troops.cavalry).toBeGreaterThanOrEqual(report.cavalryRangeLow)
      expect(enemyHouse.troops.cavalry).toBeLessThanOrEqual(report.cavalryRangeHigh)
    }
  })

  it('narrows every troop-type range at high accuracy', () => {
    const low = gatherIntelligence({ masterOfWhispersRating: 5, enemyHouse, rng: () => 0.5 })
    const high = gatherIntelligence({ masterOfWhispersRating: 95, enemyHouse, rng: () => 0.5 })
    expect(high.infantryRangeHigh - high.infantryRangeLow).toBeLessThan(low.infantryRangeHigh - low.infantryRangeLow)
  })

  // --- armyQuality / supply ranges (new) --------------------------------

  it('reports armyQuality and supply ranges, each containing the true value and clamped to 0-100', () => {
    for (const rating of [0, 40, 100]) {
      const report = gatherIntelligence({ masterOfWhispersRating: rating, enemyHouse })
      expect(enemyHouse.armyQuality).toBeGreaterThanOrEqual(report.armyQualityRangeLow)
      expect(enemyHouse.armyQuality).toBeLessThanOrEqual(report.armyQualityRangeHigh)
      expect(enemyHouse.supply).toBeGreaterThanOrEqual(report.supplyRangeLow)
      expect(enemyHouse.supply).toBeLessThanOrEqual(report.supplyRangeHigh)
      expect(report.armyQualityRangeLow).toBeGreaterThanOrEqual(0)
      expect(report.supplyRangeHigh).toBeLessThanOrEqual(100)
    }
  })

  // --- terrain shortlist (new) ------------------------------------------

  it('shows every terrain (no signal at all) at zero accuracy', () => {
    const report = gatherIntelligence({ masterOfWhispersRating: 0, enemyHouse })
    expect(report.terrainShortlist).toHaveLength(TERRAIN_TYPES.length)
    expect(report.terrainShortlist).toContain(enemyHouse.terrain)
  })

  it('narrows to exactly the true terrain at maximum accuracy', () => {
    const report = gatherIntelligence({ masterOfWhispersRating: 100, enemyHouse })
    expect(report.terrainShortlist).toEqual([enemyHouse.terrain])
  })

  it('the true terrain is always somewhere in the shortlist, at any accuracy', () => {
    for (const rating of [0, 10, 40, 70, 100]) {
      const report = gatherIntelligence({ masterOfWhispersRating: rating, enemyHouse })
      expect(report.terrainShortlist).toContain(enemyHouse.terrain)
    }
  })
})