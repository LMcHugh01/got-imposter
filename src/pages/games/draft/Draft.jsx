import { useState, useEffect, useMemo, useCallback } from 'react'
import PageWrapper from '../../../components/PageWrapper'
import { fetchDraftablePool } from '../../../lib/characterAttributesService'
import { fetchRandomEnemyHouse } from '../../../lib/enemyHouseService'
import {
  createDraftState,
  offerCharacters,
  assignRole,
  isDraftComplete,
  getFinalRoster,
} from '../../../gameEngine/draftEngine'
import {
  extractCouncilBattleInputs,
  extractCouncilEconomyInputs,
} from '../../../gameEngine/battleEngine'
import { gatherIntelligence } from '../../../gameEngine/intelligence'
import {
  createCampaign,
  getCurrentTier,
  isFinalBattle,
  recordBattleResult,
  summarizeCampaign,
  TOTAL_BATTLES,
} from '../../../gameEngine/campaign'
import RoleGrid from './RoleGrid'
import DraftBoard from './DraftBoard'
import Roster from './Roster'
import CampaignAction from './CampaignAction'
import Battle from './Battle'
import BattleResult from './BattleResult'
import CampaignVictory from './CampaignVictory'

function buildBattleSides(campaign, enemyHouse, scouted) {
  const councilInputs = extractCouncilBattleInputs(campaign.roster)
  const yourSide = {
    armySize: campaign.resources.army,
    armyQuality: campaign.resources.armyQuality,
    morale: campaign.resources.morale,
    supply: campaign.resources.supply,
    ...councilInputs,
    scouted,
  }
  const enemySide = {
    armySize: enemyHouse.armySize,
    armyQuality: enemyHouse.armyQuality,
    morale: enemyHouse.morale,
    supply: enemyHouse.supply,
    rating: enemyHouse.rating,
    gold: enemyHouse.gold,
    name: enemyHouse.name,
    flavorText: enemyHouse.flavorText,
  }
  return { yourSide, enemySide }
}

export default function Draft() {
  const [status, setStatus] = useState('loading') // loading | error | drafting | complete | campaignAction | battle | battleResult | campaignVictory
  const [error, setError] = useState(null)
  const [draftState, setDraftState] = useState(null)
  const [selectedCharacter, setSelectedCharacter] = useState(null)
  const [campaign, setCampaign] = useState(null)
  const [enemyHouse, setEnemyHouse] = useState(null)
  const [battleResult, setBattleResult] = useState(null)
  const [scouted, setScouted] = useState(false)
  const [intelReport, setIntelReport] = useState(null)

  useEffect(() => {
    let cancelled = false
    fetchDraftablePool()
      .then((pool) => {
        if (cancelled) return
        setDraftState(createDraftState(pool))
        setStatus('drafting')
      })
      .catch((err) => {
        if (cancelled) return
        setError(err.message)
        setStatus('error')
      })
    return () => {
      cancelled = true
    }
  }, [])

  // Recomputes only when draftState actually changes (i.e. once per round),
  // not on every re-render — so the offer stays stable while a character is
  // selected but not yet assigned.
  const offer = useMemo(() => {
    if (!draftState || isDraftComplete(draftState)) return []
    return offerCharacters(draftState)
  }, [draftState])

  const handleSelectCharacter = useCallback((character) => {
    setSelectedCharacter(character)
  }, [])

  const handleAssignRole = useCallback(
    (roleId) => {
      if (!selectedCharacter) return
      try {
        const next = assignRole(draftState, selectedCharacter, roleId)
        setDraftState(next)
        setSelectedCharacter(null)
        if (isDraftComplete(next)) setStatus('complete')
      } catch (err) {
        setError(err.message)
        setStatus('error')
      }
    },
    [draftState, selectedCharacter]
  )

  const handleBeginCampaign = useCallback(async () => {
    setStatus('loading')
    try {
      const roster = getFinalRoster(draftState)
      const newCampaign = createCampaign(roster)
      const house = await fetchRandomEnemyHouse(getCurrentTier(newCampaign), newCampaign.usedEnemyHouseIds)
      setCampaign(newCampaign)
      setEnemyHouse(house)
      setScouted(false)
      setIntelReport(null)
      setStatus('campaignAction')
    } catch (err) {
      setError(err.message)
      setStatus('error')
    }
  }, [draftState])

  const handleCampaignActionComplete = useCallback(
    ({ resources, scouted: didScout, intelReport: report }) => {
      setCampaign((prev) => ({ ...prev, resources }))
      setScouted(didScout)
      setIntelReport(report)
      setStatus('battle')
    },
    []
  )

  // Battle.jsx now owns the entire live fight internally (ticking army
  // counts, mid-fight strategy switches, surrender) and only calls this
  // once, when the fight is actually decided.
  const handleBattleComplete = useCallback((finalResult) => {
    setBattleResult(finalResult)
    setStatus('battleResult')
  }, [])

  // Campaign/enemyHouse (and any campaign-action spend) are untouched by a
  // failed attempt (results are only committed via handleContinue/
  // handleClaimVictory) — so retrying just goes back to the battle screen,
  // keeping whatever intel/recruits you already have for this fight.
  const handleRetry = useCallback(() => {
    setStatus('battle')
  }, [])

  const handleContinue = useCallback(async () => {
    setStatus('loading')
    try {
      const nextCampaign = recordBattleResult(campaign, enemyHouse, battleResult)
      const house = await fetchRandomEnemyHouse(getCurrentTier(nextCampaign), nextCampaign.usedEnemyHouseIds)
      setCampaign(nextCampaign)
      setEnemyHouse(house)
      setScouted(false)
      setIntelReport(null)
      setStatus('campaignAction')
    } catch (err) {
      setError(err.message)
      setStatus('error')
    }
  }, [campaign, enemyHouse, battleResult])

  const handleClaimVictory = useCallback(() => {
    const finalCampaign = recordBattleResult(campaign, enemyHouse, battleResult)
    setCampaign(finalCampaign)
    setStatus('campaignVictory')
  }, [campaign, enemyHouse, battleResult])

  if (status === 'loading') {
    return (
      <PageWrapper className="justify-center">
        <p className="text-got-parchment/50 text-lg italic" style={{ fontFamily: 'EB Garamond, serif' }}>
          Gathering the realm's finest...
        </p>
      </PageWrapper>
    )
  }

  if (status === 'error') {
    return (
      <PageWrapper className="justify-center">
        <div className="max-w-sm text-center flex flex-col gap-4">
          <p className="text-got-red-bright text-lg">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="py-3 px-6 rounded border border-got-gold text-got-gold hover:bg-got-gold/10 transition-colors"
            style={{ fontFamily: 'Cinzel, serif' }}
          >
            Try Again
          </button>
        </div>
      </PageWrapper>
    )
  }

  if (status === 'complete') {
    const roster = getFinalRoster(draftState)
    return (
      <PageWrapper className="justify-start">
        <Roster roster={roster} />
        <div className="w-full max-w-sm pb-4">
          <button
            onClick={handleBeginCampaign}
            className="w-full py-4 rounded border border-got-red bg-got-red/10 text-got-red-bright text-lg tracking-widest uppercase transition-all duration-200 hover:bg-got-red/20 active:scale-[0.98]"
            style={{ fontFamily: 'Cinzel, serif' }}
          >
            Begin Campaign
          </button>
        </div>
      </PageWrapper>
    )
  }

  if (status === 'campaignAction') {
    const economyInputs = extractCouncilEconomyInputs(campaign.roster)
    return (
      <PageWrapper className="justify-start">
        <div className="w-full max-w-sm pt-4">
          <p
            className="text-stone-600 text-xs tracking-[0.3em] uppercase text-center"
            style={{ fontFamily: 'Cinzel, serif' }}
          >
            Battle {campaign.battleNumber} of {TOTAL_BATTLES}
          </p>
        </div>
        <CampaignAction
          resources={campaign.resources}
          enemyHouse={enemyHouse}
          economyInputs={economyInputs}
          onComplete={handleCampaignActionComplete}
        />
      </PageWrapper>
    )
  }

  if (status === 'battle') {
    const { yourSide, enemySide } = buildBattleSides(campaign, enemyHouse, scouted)
    // Never show the exact enemy army size — use the real gathered report
    // if Intelligence was used this round, otherwise a worst-case blind
    // range (masterOfWhispersRating: 0) computed the same way.
    const displayReport =
      scouted && intelReport ? intelReport : gatherIntelligence({ masterOfWhispersRating: 0, enemyHouse })
    const enemyArmyRange = { low: displayReport.armyRangeLow, high: displayReport.armyRangeHigh }
    return (
      <PageWrapper className="justify-start">
        <div className="w-full max-w-sm pt-4">
          <p
            className="text-stone-600 text-xs tracking-[0.3em] uppercase text-center"
            style={{ fontFamily: 'Cinzel, serif' }}
          >
            Battle {campaign.battleNumber} of {TOTAL_BATTLES}
            {scouted && ' · Scouted'}
          </p>
        </div>
        <Battle yourSide={yourSide} enemySide={enemySide} enemyArmyRange={enemyArmyRange} onComplete={handleBattleComplete} />
      </PageWrapper>
    )
  }

  if (status === 'battleResult') {
    return (
      <PageWrapper className="justify-start">
        <BattleResult
          result={battleResult}
          enemyHouse={enemyHouse}
          battleNumber={campaign.battleNumber}
          totalBattles={TOTAL_BATTLES}
          isFinalBattle={isFinalBattle(campaign)}
          campaignSummary={summarizeCampaign(campaign)}
          onRetry={handleRetry}
          onContinue={handleContinue}
          onClaimVictory={handleClaimVictory}
        />
      </PageWrapper>
    )
  }

  if (status === 'campaignVictory') {
    return (
      <PageWrapper className="justify-start">
        <CampaignVictory summary={summarizeCampaign(campaign)} />
      </PageWrapper>
    )
  }

  return (
    <PageWrapper className="justify-start">
      <div className="w-full max-w-2xl flex flex-col gap-6 pt-4 pb-4">
        <div>
          <p
            className="text-got-parchment/40 text-sm tracking-[0.3em] uppercase text-center mb-2"
            style={{ fontFamily: 'Cinzel, serif' }}
          >
            Your Council
          </p>
          <RoleGrid draftState={draftState} selectedCharacter={selectedCharacter} onAssign={handleAssignRole} />
        </div>

        <div className="gold-divider" />

        <DraftBoard
          round={draftState.round}
          offer={offer}
          selectedCharacterId={selectedCharacter?.id ?? null}
          onSelect={handleSelectCharacter}
        />
      </div>
    </PageWrapper>
  )
}