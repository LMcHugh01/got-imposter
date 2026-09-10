import { describe, it, expect } from 'vitest'
import { gatherIntelligence } from './intelligence'

const enemyHouse = { armySize: 40000, morale: 70, personality: 'aggressive' }

describe('gatherIntelligence', () => {
  it('gives a wide army range and hides morale/personality at low accuracy', () => {
    const report = gatherIntelligence({ masterOfWhispersRating: 5, enemyHouse })
    expect(report.armyRangeHigh - report.armyRangeLow).toBeGreaterThan(30000)
    expect(report.moraleRevealed).toBe(false)
    expect(report.morale).toBeNull()
    expect(report.personalityRevealed).toBe(false)
  })

  it('gives a meaningfully tighter range and reveals morale/personality at high accuracy', () => {
    const report = gatherIntelligence({ masterOfWhispersRating: 95, enemyHouse })
    expect(report.armyRangeHigh - report.armyRangeLow).toBeLessThan(10000)
    expect(report.moraleRevealed).toBe(true)
    expect(report.morale).toBe(70)
    expect(report.personalityRevealed).toBe(true)
    expect(report.personality).toBe('aggressive')
  })

  it('never collapses to a single number, even at maximum accuracy', () => {
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

  it('is not centered on the true value — the split is random, not symmetric', () => {
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
})