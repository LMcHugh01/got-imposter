import { describe, it, expect } from 'vitest'
import {
  createCampaign,
  getCurrentTier,
  isFinalBattle,
  isCampaignOver,
  recordBattleResult,
  summarizeCampaign,
  BATTLE_TIER_CURVE,
  TOTAL_BATTLES,
} from './campaign'

function mockEnemyHouse(id, name = 'House Test') {
  return { id, name }
}

function mockResult(overrides = {}) {
  return {
    outcome: 'victory',
    probability: 70,
    yourCasualties: 500,
    enemyCasualties: 1200,
    enemySurrendered: 300,
    soldiersGained: 300,
    goldGained: 2000,
    moraleChange: 6,
    supplyChange: -5,
    ...overrides,
  }
}

describe('createCampaign', () => {
  it('starts at battle 1, active, with fresh resources', () => {
    const campaign = createCampaign([])
    expect(campaign.battleNumber).toBe(1)
    expect(campaign.status).toBe('active')
    expect(campaign.resources.army).toBe(10000)
    expect(campaign.battleLog).toEqual([])
    expect(campaign.usedEnemyHouseIds).toEqual([])
  })
})

describe('getCurrentTier / isFinalBattle', () => {
  it('matches the 8-battle tier curve exactly', () => {
    const campaign = createCampaign([])
    expect(getCurrentTier(campaign)).toBe(BATTLE_TIER_CURVE[0])
    expect(isFinalBattle(campaign)).toBe(false)
  })

  it('recognizes the 8th battle as final', () => {
    let campaign = createCampaign([])
    for (let i = 0; i < TOTAL_BATTLES - 1; i++) {
      campaign = recordBattleResult(campaign, mockEnemyHouse(i), mockResult())
    }
    expect(campaign.battleNumber).toBe(TOTAL_BATTLES)
    expect(isFinalBattle(campaign)).toBe(true)
  })
})

describe('recordBattleResult', () => {
  it('applies resource deltas correctly on a victory', () => {
    const campaign = createCampaign([])
    const next = recordBattleResult(campaign, mockEnemyHouse(1), mockResult({
      yourCasualties: 500, soldiersGained: 300, goldGained: 2000, moraleChange: 6, supplyChange: -5,
    }))

    expect(next.resources.army).toBe(10000 - 500 + 300) // 9800
    expect(next.resources.gold).toBe(25000 + 2000)
    expect(next.resources.morale).toBe(75 + 6)
    expect(next.resources.supply).toBe(80 - 5)
  })

  it('does not mutate the original campaign', () => {
    const campaign = createCampaign([])
    recordBattleResult(campaign, mockEnemyHouse(1), mockResult())
    expect(campaign.battleNumber).toBe(1)
    expect(campaign.resources.army).toBe(10000)
  })

  it('advances battleNumber and stays active after a non-final victory', () => {
    const campaign = createCampaign([])
    const next = recordBattleResult(campaign, mockEnemyHouse(1), mockResult({ outcome: 'victory' }))
    expect(next.battleNumber).toBe(2)
    expect(next.status).toBe('active')
  })

  it('reaches victory status after winning the final (8th) battle', () => {
    let campaign = createCampaign([])
    for (let i = 0; i < TOTAL_BATTLES; i++) {
      campaign = recordBattleResult(campaign, mockEnemyHouse(i), mockResult({ outcome: 'victory' }))
    }
    expect(campaign.status).toBe('victory')
    expect(campaign.battleNumber).toBe(TOTAL_BATTLES) // does not advance past the last battle
    expect(isCampaignOver(campaign)).toBe(true)
  })

  it('ends the campaign on defeat without advancing battleNumber', () => {
    const campaign = createCampaign([])
    const next = recordBattleResult(campaign, mockEnemyHouse(1), mockResult({ outcome: 'defeat', goldGained: 0, soldiersGained: 0 }))
    expect(next.status).toBe('defeat')
    expect(next.battleNumber).toBe(1) // unchanged
    expect(isCampaignOver(next)).toBe(true)
  })

  it('tracks used enemy house ids', () => {
    const campaign = createCampaign([])
    const next = recordBattleResult(campaign, mockEnemyHouse('house-1'), mockResult())
    expect(next.usedEnemyHouseIds).toEqual(['house-1'])
  })
})

describe('summarizeCampaign', () => {
  it('totals gold, surrendered soldiers, and enemy casualties across the log', () => {
    let campaign = createCampaign([])
    campaign = recordBattleResult(campaign, mockEnemyHouse(1), mockResult({ goldGained: 1000, soldiersGained: 200, enemyCasualties: 500 }))
    campaign = recordBattleResult(campaign, mockEnemyHouse(2), mockResult({ goldGained: 1500, soldiersGained: 100, enemyCasualties: 700 }))

    const summary = summarizeCampaign(campaign)
    expect(summary.battlesWon).toBe(2)
    expect(summary.totalBattles).toBe(TOTAL_BATTLES)
    expect(summary.goldEarned).toBe(2500)
    expect(summary.soldiersRecruitedFromSurrender).toBe(300)
    expect(summary.enemySoldiersDefeated).toBe(1200)
    expect(summary.startingArmy).toBe(10000)
  })

  it('includes alliances made and a final house rating', () => {
    const campaign = createCampaign([]) // empty roster -> house rating computes to 0, not a throw
    const summary = summarizeCampaign(campaign)
    expect(summary.alliancesMade).toBe(0)
    expect(summary.finalHouseRating).toBe(0)
  })
})