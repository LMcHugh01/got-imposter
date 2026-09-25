import { useState, useMemo, useCallback } from 'react'
import PageWrapper from '../../../components/PageWrapper'
import { fetchDraftablePool } from '../../../lib/characterAttributesService'
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
  // The role the player targeted (by clicking an open seat in the council)
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
        <CourtSeated roster={roster} houseName={houseName}>
          <button type="button" onClick={handlePlayAgain} className="dr-btn-gold">
            Draft again
          </button>
        </CourtSeated>
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