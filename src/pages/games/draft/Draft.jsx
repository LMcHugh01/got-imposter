import { useState, useMemo, useCallback } from 'react'
import PageWrapper from '../../../components/PageWrapper'
import { fetchDraftablePool } from '../../../lib/characterAttributesService'
import { ROLES } from '../../../data/roleWeights'
import {
  createDraftState,
  offerCharacters,
  assignRole,
  isDraftComplete,
  getFinalRoster,
} from '../../../gameEngine/draftEngine'
import RoleGrid from './RoleGrid'
import DraftBoard from './DraftBoard'
import DraftOathModal from './DraftOathModal'
import DraftLedger from './DraftLedger'
import Roster from './Roster'
import DraftIntro from './DraftIntro'
import { recordGameEvent } from '../../../lib/recordSync'

/**
 * pages/games/draft/Draft.jsx
 *
 * The standalone Draft game — build the highest-average-rating council
 * you can, from the same pool/engine/UI as the Campaign game's drafting
 * phase, just without anything past the roster reveal: no
 * campaign/battle, no "Begin Campaign" step. The game ends the moment
 * the 10th role is filled.
 */
export default function Draft() {
  const [status, setStatus] = useState('intro') // intro | loading | error | drafting | complete
  const [error, setError] = useState(null)
  const [houseName, setHouseName] = useState('')
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
  // this just switches the visible panel back to picking. On the 10th
  // and final seat, the game is over — straight to the roster reveal,
  // there's nothing past it in this game.
  const handleDismissLedger = useCallback(() => {
    if (draftState && isDraftComplete(draftState)) {
      setStatus('complete')
      // The council's rating is the average fit across every seat, the same
      // "Overall" figure shown in the draft header.
      const seated = Object.values(draftState.roleAssignments).filter(Boolean)
      const rating = seated.reduce((sum, c) => sum + c.fit, 0) / seated.length
      recordGameEvent('draft', { rating })
    }
    setJustSworn(null)
  }, [draftState])

  // "Draft Again" — a full reset back to naming a new house, so the
  // player can try to beat their average rating with a fresh pool.
  const handlePlayAgain = useCallback(() => {
    setDraftState(null)
    setSelectedCharacter(null)
    setPendingRoleId(null)
    setJustSworn(null)
    setHouseName('')
    setError(null)
    setStatus('intro')
  }, [])

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
        <Roster roster={roster} houseName={houseName} />
        <div className="w-full max-w-sm pb-4">
          <button
            onClick={handlePlayAgain}
            className="w-full py-4 rounded border border-got-gold bg-got-gold/10 text-got-gold text-lg tracking-widest uppercase transition-all duration-200 hover:bg-got-gold/20 active:scale-[0.98]"
            style={{ fontFamily: 'Cinzel, serif' }}
          >
            Draft Again
          </button>
        </div>
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
                House {houseName}
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