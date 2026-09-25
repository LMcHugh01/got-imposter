import { useState, useMemo, useCallback } from 'react'
import PageWrapper from '../../../components/PageWrapper'
import { fetchDraftablePool } from '../../../lib/characterAttributesService'
import { fetchRandomEnemyHouse } from '../../../lib/enemyHouseService'
import { recordGameEvent } from '../../../lib/recordSync'
import { ROLES } from '../../../data/roleWeights'
import DraftScreen from '../../../components/draft/DraftScreen'
import CourtSeated from '../../../components/draft/CourtSeated'
import {
  createDraftState,
  offerCharacters,
  assignRole,
  isDraftComplete,
  getFinalRoster,
} from '../../../gameEngine/draftEngine'
import { gatherIntelligence } from '../../../gameEngine/intelligence'
import {
  createCampaign,
  getCurrentTier,
  isFinalBattle,
  recordBattleResult,
  summarizeCampaign,
  TOTAL_BATTLES,
} from '../../../gameEngine/campaign'
import { buildBattleSides } from './battle/battleSides'
import CampaignDashboard from './dashboard/CampaignDashboard'
import Battle from './battle/Battle'
import BattleResult from './battle/BattleResult'
import CampaignVictory from './CampaignVictory'
import DraftIntro from './draft/DraftIntro'

export default function Draft() {
  const [status, setStatus] = useState('intro') // intro | loading | error | drafting | complete | dashboard | battle | battleResult | campaignVictory
  const [error, setError] = useState(null)
  const [houseName, setHouseName] = useState('')
  const [draftState, setDraftState] = useState(null)
  const [selectedCharacter, setSelectedCharacter] = useState(null)
  // The role the player targeted (by clicking an open seat in the council)
  // for the currently selected character — holds the pick open behind
  // the Take Oath confirmation modal until they confirm or reconsider.
  // Nothing is committed to draftState until handleConfirmOath runs.
  const [pendingRoleId, setPendingRoleId] = useState(null)
  // The most recently sworn-in { role, character } pair, once confirmed —
  // drives the post-assignment ledger view. Cleared when the player
  // dismisses it via "Summon the Next Five" / "Seat the Council".
  const [justSworn, setJustSworn] = useState(null)
  const [campaign, setCampaign] = useState(null)
  const [enemyHouse, setEnemyHouse] = useState(null)
  const [battleResult, setBattleResult] = useState(null)
  const [scouted, setScouted] = useState(false)
  const [intelReport, setIntelReport] = useState(null)
  // Set by CampaignDashboard's Battle Tactics panel the moment the player
  // commits to an opening move — { formationId, strategyId } for a fresh
  // attempt, or null when resuming a retreated engagement (Battle.jsx
  // pulls formation/tick-count from `engagement` in that case instead).
  const [battleStart, setBattleStart] = useState(null)
  // Retreat-and-reattempt (BATTLE_PLAN.md §15) — one continuous engagement
  // you can pause and resume, not two separate battles. `engagement` is
  // null for a fresh fight; once set (via handleRetreat), it carries the
  // live army counts and the enemy's cumulative casualties across a fresh
  // pre-battle action window and back into Battle. Cleared the moment the
  // fight actually resolves (handleBattleComplete) — a win, a surrender,
  // or a failed Rally all end the engagement, not just a retreat.
  const [engagement, setEngagement] = useState(null)
  const [rallyUsedThisEngagement, setRallyUsedThisEngagement] = useState(false)
  // For The Young Wolf honour: has any battle or duel been lost this
  // campaign? A retreat isn't a loss — it's a pause (see handleRetreat).
  const [lostBattle, setLostBattle] = useState(false)

  // Gated behind DraftIntro's "Play Now" instead of firing on mount — the
  // player names their house first, and that's what actually kicks off
  // the pool fetch / draft state creation.
  const handlePlay = useCallback((name) => {
    setHouseName(name)
    setStatus('loading')
    fetchDraftablePool()
      .then((pool) => {
        setDraftState(createDraftState(pool))
        setStatus('drafting')
      })
      .catch((err) => {
        setError(err.message)
        setStatus('error')
      })
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

  // Step 1 of committing a pick: the player has a character selected and
  // taps an open seat in the council. This doesn't touch draftState — it
  // just opens the Take Oath modal. Nothing is drafted until confirmed.
  const handleRequestAssign = useCallback(
    (roleId) => {
      if (!selectedCharacter) return
      setPendingRoleId(roleId)
    },
    [selectedCharacter]
  )

  const handleCancelOath = useCallback(() => {
    setPendingRoleId(null)
  }, [])

  // Step 2: the player confirms in the modal. This is the only place that
  // actually calls draftEngine.assignRole — same call, same engine, just
  // gated behind the confirmation step instead of firing straight off the
  // council click like before.
  const handleConfirmOath = useCallback(() => {
    if (!selectedCharacter || !pendingRoleId) return
    try {
      const roleId = pendingRoleId
      const next = assignRole(draftState, selectedCharacter, roleId)
      const role = ROLES.find((r) => r.id === roleId)
      const swornCharacter = next.roleAssignments[roleId]

      setDraftState(next)
      setJustSworn({ role, character: swornCharacter })
      setSelectedCharacter(null)
      setPendingRoleId(null)
    } catch (err) {
      setPendingRoleId(null)
      setError(err.message)
      setStatus('error')
    }
  }, [draftState, selectedCharacter, pendingRoleId])

  // Step 3: the player dismisses the ledger ("Summon the Next Five" /
  // "Seat the Council"). draftState was already advanced back in
  // handleConfirmOath, so the next offer is already sitting in `offer` —
  // this just switches the visible panel back to picking, or on to the
  // completed-roster screen if that was the last seat.
  const handleDismissLedger = useCallback(() => {
    if (draftState && isDraftComplete(draftState)) {
      setStatus('complete')
    }
    setJustSworn(null)
  }, [draftState])

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
      setBattleStart(null)
      setLostBattle(false)
      setStatus('dashboard')
    } catch (err) {
      setError(err.message)
      setStatus('error')
    }
  }, [draftState])

  // Fired by CampaignDashboard whenever a pre-battle action resolves (or
  // is skipped) inside its modal. No navigation here — the dashboard
  // stays put; it just commits the updated resources/intel into campaign
  // state so the persistent Council/Resources panels and the Battle
  // Tactics power-share numbers immediately reflect it.
  const handleActionComplete = useCallback(({ resources, scouted: didScout, intelReport: report }) => {
    setCampaign((c) => ({ ...c, resources }))
    setScouted(didScout)
    setIntelReport(report)
  }, [])

  // Fired by CampaignDashboard's Battle Tactics panel once the player
  // commits to an opening move (or, when resuming a retreated engagement,
  // just to "Resume Battle" — strategyId is null in that case, and
  // Battle.jsx pulls its formation/tick-count from `engagement` instead).
  const handleMarchToBattle = useCallback((formationId, strategyId) => {
    setBattleStart(strategyId ? { formationId, strategyId } : null)
    setStatus('battle')
  }, [])

  // Battle.jsx now owns the entire live fight internally (ticking army
  // counts, mid-fight strategy switches, surrender) and only calls this
  // once, when the fight is actually decided. The Duel Offer panel on the
  // dashboard calls the exact same handler with the exact same result
  // shape (finalizeDuelResult mirrors finalizeBattleResult, plus
  // viaDuel: true) — this function doesn't need to know which one happened.
  const handleBattleComplete = useCallback((finalResult) => {
    if (finalResult.outcome !== 'victory') setLostBattle(true)
    setBattleResult(finalResult)
    setEngagement(null)
    setRallyUsedThisEngagement(false)
    setStatus('battleResult')
  }, [])

  // Retreat (BATTLE_PLAN.md §15) — deliberately does NOT call
  // recordBattleResult: no battleLog entry, battleNumber doesn't advance,
  // enemyHouse isn't added to usedEnemyHouseIds. It's a pause, not a
  // result. Routes back to the dashboard for a fresh pre-battle action
  // window (using whatever resources are left) rather than straight back
  // to Battle, then resumes from the persisted counts.
  const handleRetreat = useCallback(({ yourTroops, enemyTroops, enemyCumulativeCasualties, rallyUsed, formationId, ticksElapsed, enemyProfile }) => {
    setEngagement({ yourTroops, enemyTroops, enemyCumulativeCasualties, formationId, ticksElapsed, enemyProfile })
    setRallyUsedThisEngagement(rallyUsed)
    setScouted(false)
    setIntelReport(null)
    setBattleStart(null)
    setStatus('dashboard')
  }, [])

  // Campaign/enemyHouse (and any campaign-action spend) are untouched by a
  // failed attempt (results are only committed via handleContinue/
  // handleClaimVictory) — so retrying just goes back to the dashboard to
  // pick tactics again, keeping whatever intel/recruits you already have
  // for this fight. A duel loss also routes here on "Try Again".
  const handleRetry = useCallback(() => {
    setBattleStart(null)
    setStatus('dashboard')
  }, [])

  // Continue and Claim Victory only appear after a win (BattleResult),
  // so both record a won battle — or a won duel, which counts as one too.
  const recordWonBattle = useCallback(() => {
    recordGameEvent('campaign', {
      type: 'battle',
      won: true,
      duel: Boolean(battleResult?.viaDuel),
      battleNumber: campaign.battleNumber,
    })
  }, [battleResult, campaign])

  const handleContinue = useCallback(async () => {
    setStatus('loading')
    try {
      recordWonBattle()
      const nextCampaign = recordBattleResult(campaign, enemyHouse, battleResult)
      const house = await fetchRandomEnemyHouse(getCurrentTier(nextCampaign), nextCampaign.usedEnemyHouseIds)
      setCampaign(nextCampaign)
      setEnemyHouse(house)
      setScouted(false)
      setIntelReport(null)
      setBattleStart(null)
      setStatus('dashboard')
    } catch (err) {
      setError(err.message)
      setStatus('error')
    }
  }, [campaign, enemyHouse, battleResult, recordWonBattle])

  const handleClaimVictory = useCallback(() => {
    recordWonBattle()
    recordGameEvent('campaign', { type: 'campaign', won: true, flawless: !lostBattle })
    const finalCampaign = recordBattleResult(campaign, enemyHouse, battleResult)
    setCampaign(finalCampaign)
    setStatus('campaignVictory')
  }, [campaign, enemyHouse, battleResult, recordWonBattle, lostBattle])

  if (status === 'intro') {
    // DraftIntro renders its own full page (background, backdrop), so it
    // isn't wrapped in PageWrapper here.
    return <DraftIntro onPlay={handlePlay} />
  }

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
        <CourtSeated roster={roster} houseName={houseName}>
          <button type="button" onClick={handleBeginCampaign} className="dr-btn-gold">
            Begin campaign <span aria-hidden="true">&rarr;</span>
          </button>
        </CourtSeated>
      </PageWrapper>
    )
  }

  if (status === 'dashboard') {
    return (
      <PageWrapper className="justify-start">
        <CampaignDashboard
          houseName={houseName}
          campaign={campaign}
          enemyHouse={enemyHouse}
          engagement={engagement}
          scouted={scouted}
          intelReport={intelReport}
          onActionComplete={handleActionComplete}
          onMarch={handleMarchToBattle}
          onDuelResult={handleBattleComplete}
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
            className="text-got-gold/70 text-xs tracking-[0.24em] uppercase text-center"
            style={{ fontFamily: 'Cinzel, serif' }}
          >
            House {houseName}
          </p>
          <p
            className="text-stone-600 text-xs tracking-[0.3em] uppercase text-center mt-1"
            style={{ fontFamily: 'Cinzel, serif' }}
          >
            Battle {campaign.battleNumber} of {TOTAL_BATTLES}
            {scouted && ' · Scouted'}
          </p>
        </div>
        <Battle
          yourSide={yourSide}
          enemySide={enemySide}
          enemyArmyRange={enemyArmyRange}
          onComplete={handleBattleComplete}
          onRetreat={handleRetreat}
          engagement={engagement}
          canRetreat={!engagement}
          rallyAvailable={!rallyUsedThisEngagement}
          initialFormationId={battleStart?.formationId ?? null}
          initialStrategyId={battleStart?.strategyId ?? null}
        />
      </PageWrapper>
    )
  }

  if (status === 'battleResult') {
    return (
      <PageWrapper className="justify-start">
        <BattleResult
          houseName={houseName}
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
        <CampaignVictory houseName={houseName} summary={summarizeCampaign(campaign)} />
      </PageWrapper>
    )
  }

  // status === 'drafting'
  const pendingRole = pendingRoleId ? ROLES.find((r) => r.id === pendingRoleId) : null

  return (
    <PageWrapper className="justify-start">
      <DraftScreen
        houseName={houseName}
        draftState={draftState}
        isComplete={isDraftComplete(draftState)}
        offer={offer}
        selectedCharacter={selectedCharacter}
        onSelect={handleSelectCharacter}
        onRequestAssign={handleRequestAssign}
        justSworn={justSworn}
        onContinue={handleDismissLedger}
        pendingRole={pendingRole}
        onConfirm={handleConfirmOath}
        onCancel={handleCancelOath}
      />
    </PageWrapper>
  )
}