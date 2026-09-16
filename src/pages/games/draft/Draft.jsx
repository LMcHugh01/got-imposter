import { useState, useEffect, useMemo, useCallback } from 'react'
import PageWrapper from '../../../components/PageWrapper'
import { fetchDraftablePool } from '../../../lib/characterAttributesService'
import { fetchRandomEnemyHouse } from '../../../lib/enemyHouseService'
import { ROLES } from '../../../data/roleWeights'
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
import { canOfferDuelForBattle } from '../../../gameEngine/duelEngine'
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
import DraftOathModal from './DraftOathModal'
import DraftLedger from './DraftLedger'
import Roster from './Roster'
import CampaignAction from './CampaignAction'
import DuelOffer from './DuelOffer'
import Battle from './Battle'
import BattleResult from './BattleResult'
import CampaignVictory from './CampaignVictory'

function troopTotal(troops) {
  return troops.infantry + troops.archers + troops.cavalry
}

function buildBattleSides(campaign, enemyHouse, scouted) {
  const councilInputs = extractCouncilBattleInputs(campaign.roster)
  const yourSide = {
    troops: campaign.resources.troops,
    // Kept alongside `troops` for duelEngine.js's computeDuelShare, which
    // calls computeYourPower/computeEnemyPower directly and reads
    // .armySize itself — tickBattle derives this the same way
    // internally, but that derivation lives inside tickBattle now that
    // composition exists, not on the object passed in.
    armySize: troopTotal(campaign.resources.troops),
    armyQuality: campaign.resources.armyQuality,
    morale: campaign.resources.morale,
    supply: campaign.resources.supply,
    ...councilInputs,
    scouted,
  }
  const enemySide = {
    troops: enemyHouse.troops,
    armySize: troopTotal(enemyHouse.troops),
    armyQuality: enemyHouse.armyQuality,
    morale: enemyHouse.morale,
    supply: enemyHouse.supply,
    rating: enemyHouse.rating,
    gold: enemyHouse.gold,
    name: enemyHouse.name,
    flavorText: enemyHouse.flavorText,
    // BATTLE_PLAN.md §10 — the battle happens on the enemy's terrain;
    // enemyHouseService.js already falls back to a neutral default for
    // any house that predates the terrain migration.
    terrain: enemyHouse.terrain,
    // BATTLE_PLAN.md §12 — resolved into a concrete battle AI profile by
    // Battle.jsx, once per engagement.
    personality: enemyHouse.personality,
  }
  return { yourSide, enemySide }
}

export default function Draft() {
  const [status, setStatus] = useState('loading') // loading | error | drafting | complete | campaignAction | duelOffer | battle | battleResult | campaignVictory
  const [error, setError] = useState(null)
  const [draftState, setDraftState] = useState(null)
  const [selectedCharacter, setSelectedCharacter] = useState(null)
  // The role the player targeted (by clicking an open seat in RoleGrid)
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
  // Retreat-and-reattempt (BATTLE_PLAN.md §15) — one continuous engagement
  // you can pause and resume, not two separate battles. `engagement` is
  // null for a fresh fight; once set (via handleRetreat), it carries the
  // live army counts and the enemy's cumulative casualties across a fresh
  // pre-battle action window and back into Battle. Cleared the moment the
  // fight actually resolves (handleBattleComplete) — a win, a surrender,
  // or a failed Rally all end the engagement, not just a retreat.
  const [engagement, setEngagement] = useState(null)
  const [rallyUsedThisEngagement, setRallyUsedThisEngagement] = useState(false)

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

  // Step 1 of committing a pick: the player has a character selected and
  // taps an open seat in RoleGrid. This doesn't touch draftState — it
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
  // RoleGrid click like before.
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
      setStatus('campaignAction')
    } catch (err) {
      setError(err.message)
      setStatus('error')
    }
  }, [draftState])

  // Decides whether the duel offer is even reachable — canOfferDuelForBattle
  // checks the same power-share threshold the enemy would need to be
  // dominated by before considering single combat instead of open battle.
  // Uses `resources` straight from the campaign-action result rather than
  // waiting on the setCampaign() above to land, since React state updates
  // aren't synchronous and the duel check needs this battle's real numbers
  // immediately.
  const handleCampaignActionComplete = useCallback(
    ({ resources, scouted: didScout, intelReport: report }) => {
      const updatedCampaign = { ...campaign, resources }
      setCampaign(updatedCampaign)
      setScouted(didScout)
      setIntelReport(report)

      // A duel replaces the fight outright — doesn't make sense to offer
      // one when resuming an engagement you already committed to open
      // battle on and retreated from mid-fight.
      if (engagement) {
        setStatus('battle')
        return
      }

      const { yourSide, enemySide } = buildBattleSides(updatedCampaign, enemyHouse, didScout)
      setStatus(canOfferDuelForBattle(yourSide, enemySide) ? 'duelOffer' : 'battle')
    },
    [campaign, enemyHouse, engagement]
  )

  // Battle.jsx now owns the entire live fight internally (ticking army
  // counts, mid-fight strategy switches, surrender) and only calls this
  // once, when the fight is actually decided. DuelOffer calls the exact
  // same handler with the exact same result shape (finalizeDuelResult
  // mirrors finalizeBattleResult) — this function doesn't need to know
  // which one happened.
  const handleBattleComplete = useCallback((finalResult) => {
    setBattleResult(finalResult)
    setEngagement(null)
    setRallyUsedThisEngagement(false)
    setStatus('battleResult')
  }, [])

  // Retreat (BATTLE_PLAN.md §15) — deliberately does NOT call
  // recordBattleResult: no battleLog entry, battleNumber doesn't advance,
  // enemyHouse isn't added to usedEnemyHouseIds. It's a pause, not a
  // result. Routes to a fresh campaignAction window (a real second
  // pre-battle action, using whatever resources are left) rather than
  // straight back to Battle, then resumes from the persisted counts.
  const handleRetreat = useCallback(({ yourTroops, enemyTroops, enemyCumulativeCasualties, rallyUsed, formationId, ticksElapsed, enemyProfile }) => {
    setEngagement({ yourTroops, enemyTroops, enemyCumulativeCasualties, formationId, ticksElapsed, enemyProfile })
    setRallyUsedThisEngagement(rallyUsed)
    setScouted(false)
    setIntelReport(null)
    setStatus('campaignAction')
  }, [])

  // Campaign/enemyHouse (and any campaign-action spend) are untouched by a
  // failed attempt (results are only committed via handleContinue/
  // handleClaimVictory) — so retrying just goes back to the battle screen,
  // keeping whatever intel/recruits you already have for this fight. A
  // duel loss also routes here on "Try Again" — retrying always goes to
  // the normal Battle screen, not back to the duel offer, since the whole
  // point of a retry is falling back to the safer option.
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
          {engagement && (
            <p className="text-got-gold/60 text-xs text-center mt-1 italic" style={{ fontFamily: 'EB Garamond, serif' }}>
              You have regrouped. Choose another action before returning to the field.
            </p>
          )}
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

  if (status === 'duelOffer') {
    const { enemySide } = buildBattleSides(campaign, enemyHouse, scouted)
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
        <DuelOffer
          roster={campaign.roster}
          enemyHouse={enemyHouse}
          enemySide={enemySide}
          onDuel={handleBattleComplete}
          onDecline={() => setStatus('battle')}
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
        <Battle
          yourSide={yourSide}
          enemySide={enemySide}
          enemyArmyRange={enemyArmyRange}
          onComplete={handleBattleComplete}
          onRetreat={handleRetreat}
          engagement={engagement}
          canRetreat={!engagement}
          rallyAvailable={!rallyUsedThisEngagement}
        />
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

  // status === 'drafting'
  const filledCount = Object.values(draftState.roleAssignments).filter(Boolean).length
  const filledEntries = Object.values(draftState.roleAssignments).filter(Boolean)
  const overallFit =
    filledEntries.length > 0
      ? Math.round(filledEntries.reduce((sum, c) => sum + c.fit, 0) / filledEntries.length)
      : null
  const pendingRole = pendingRoleId ? ROLES.find((r) => r.id === pendingRoleId) : null

  return (
    <PageWrapper className="justify-start">
      <div className="w-full max-w-5xl flex flex-col gap-6 pt-2 pb-4">
        {/* House progress header */}
        <div className="border-b border-stone-800 pb-4">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p
                className="text-got-parchment/40 text-xs tracking-[0.3em] uppercase"
                style={{ fontFamily: 'Cinzel, serif' }}
              >
                The Draft
              </p>
              <h1 className="text-got-parchment text-xl font-semibold mt-1" style={{ fontFamily: 'Cinzel, serif' }}>
                Your Council
              </h1>
            </div>
            {overallFit !== null && (
              <div className="text-right">
                <p
                  className="text-got-parchment/40 text-xs tracking-[0.24em] uppercase"
                  style={{ fontFamily: 'Cinzel, serif' }}
                >
                  Overall
                </p>
                <p className="text-got-gold text-2xl font-bold" style={{ fontFamily: 'Cinzel, serif' }}>
                  {overallFit}
                </p>
              </div>
            )}
          </div>

          <div className="flex gap-1 mt-4">
            {ROLES.map((role) => (
              <div
                key={role.id}
                title={role.label}
                className={[
                  'flex-1 h-[3px] rounded-full',
                  draftState.roleAssignments[role.id] ? 'bg-got-gold' : 'bg-stone-800',
                ].join(' ')}
              />
            ))}
          </div>
          <div
            className="flex justify-between mt-2 text-[11px] tracking-[0.2em] uppercase text-stone-500"
            style={{ fontFamily: 'Cinzel, serif' }}
          >
            <span>{filledCount} Sworn</span>
            <span>{ROLES.length - filledCount} Seats Remain</span>
          </div>
        </div>

        {/* Main content: pick list / ledger, plus council sidebar */}
        <div className="flex flex-col lg:flex-row gap-6 items-start">
          <div className="flex-1 min-w-0 w-full">
            {justSworn ? (
              <DraftLedger
                role={justSworn.role}
                character={justSworn.character}
                isFinal={isDraftComplete(draftState)}
                onContinue={handleDismissLedger}
              />
            ) : (
              <DraftBoard
                round={draftState.round}
                offer={offer}
                selectedCharacterId={selectedCharacter?.id ?? null}
                onSelect={handleSelectCharacter}
              />
            )}
          </div>

          <aside className="w-full lg:w-[360px] lg:flex-none">
            <RoleGrid draftState={draftState} selectedCharacter={selectedCharacter} onAssign={handleRequestAssign} />
          </aside>
        </div>
      </div>

      {pendingRole && selectedCharacter && (
        <DraftOathModal
          role={pendingRole}
          character={selectedCharacter}
          onConfirm={handleConfirmOath}
          onCancel={handleCancelOath}
        />
      )}
    </PageWrapper>
  )
}