import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import PageWrapper from '../../../components/PageWrapper'
import { GameBackdrop, GamePrimaryButton, CINZEL, GARAMOND, FOCUS } from '../../../components/GameHome'
import { fetchRavensCards, fetchTeamHouses } from '../../../lib/ravensService'
import { loadRavensGame, saveRavensGame, loadRavensSetup, saveRavensSetup } from '../../../lib/ravensStorage'
import { DEFAULT_SETTINGS, TEAM_HOUSE_SLUGS } from '../../../data/ravens'
import {
  createGame,
  currentCardId,
  nextCardId,
  startTurn,
  secondsLeft,
  markCard,
  endTurn,
  setLogResult,
  finishTurn,
  isLastTurn,
  scores,
  standings,
  rematch,
} from '../../../gameEngine/ravens'
import RavensSetup from './RavensSetup'
import { ReadyScreen, TurnScreen, ReviewScreen, FinalScreen } from './RavensScreens'

const MIN_CARDS = 20

/**
 * pages/games/ravens/RavensGame.jsx
 *
 * One page, several phases (setup → ready → turn → review → … → final),
 * like the Draft — so the browser's Back button can't drop you into the
 * middle of a turn. The game is saved after every change, so a refresh
 * resumes it. `?new` opens straight onto the setup screen.
 */
export default function RavensGame() {
  const [params] = useSearchParams()
  const [houses, setHouses] = useState(null)
  const [cardsById, setCardsById] = useState(null)
  const [game, setGame] = useState(() => (params.has('new') ? null : loadRavensGame()))
  const [setupOpen, setSetupOpen] = useState(() => params.has('new') || !loadRavensGame())
  const [loadError, setLoadError] = useState(null)
  const [starting, setStarting] = useState(false)
  const [startError, setStartError] = useState(null)
  const [now, setNow] = useState(() => Date.now())

  // Houses to play as (sigils and names).
  const loadHouses = useCallback(() => {
    setLoadError(null)
    fetchTeamHouses()
      .then(setHouses)
      .catch((err) => setLoadError(err.message))
  }, [])
  useEffect(loadHouses, [loadHouses])

  // Resuming a saved game: fetch its cards, and drop any that have since been retired.
  useEffect(() => {
    if (!game || cardsById) return
    fetchRavensCards(game.settings.difficulties)
      .then((cards) => {
        const map = new Map(cards.map((c) => [c.id, c]))
        setCardsById(map)
        setGame((g) => {
          const deck = g.deck.filter((id) => map.has(id))
          if (deck.length === g.deck.length) return g
          return deck.length ? { ...g, deck, pos: g.pos % deck.length } : null
        })
      })
      .catch((err) => setLoadError(err.message))
  }, [game, cardsById])

  useEffect(() => {
    if (game) saveRavensGame(game)
  }, [game])

  // The candle: tick while a turn is running, and end the turn when it burns out.
  const inTurn = game?.phase === 'turn'
  useEffect(() => {
    if (!inTurn) return
    const tick = () => {
      const t = Date.now()
      setNow(t)
      setGame((g) => {
        if (g?.phase === 'turn' && t >= g.endAt) {
          navigator.vibrate?.([200, 100, 200])
          return endTurn(g)
        }
        return g
      })
    }
    tick()
    const id = setInterval(tick, 200)
    return () => clearInterval(id)
  }, [inTurn])

  // Keep the screen awake during a turn (where the browser supports it).
  useEffect(() => {
    if (!inTurn || !('wakeLock' in navigator)) return
    let lock = null
    let cancelled = false
    const acquire = () =>
      navigator.wakeLock
        .request('screen')
        .then((l) => {
          if (cancelled) l.release()
          else lock = l
        })
        .catch(() => {})
    const onVisible = () => document.visibilityState === 'visible' && acquire()
    acquire()
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      cancelled = true
      document.removeEventListener('visibilitychange', onVisible)
      lock?.release().catch(() => {})
    }
  }, [inTurn])

  // Preload the next card's picture so it's ready when the card appears.
  useEffect(() => {
    if (!inTurn || !cardsById) return
    const next = cardsById.get(nextCardId(game))
    if (next?.imageUrl) new Image().src = next.imageUrl
  }, [inTurn, game, cardsById])

  const housesBySlug = useMemo(() => new Map((houses ?? []).map((h) => [h.slug, h])), [houses])

  const handleStart = async (settings) => {
    setStarting(true)
    setStartError(null)
    try {
      const cards = await fetchRavensCards(settings.difficulties)
      if (cards.length < MIN_CARDS) {
        throw new Error(`Only ${cards.length} cards match those difficulties. Add another level.`)
      }
      saveRavensSetup(settings)
      setCardsById(new Map(cards.map((c) => [c.id, c])))
      setGame(
        createGame(
          settings,
          cards.map((c) => c.id),
        ),
      )
      setSetupOpen(false)
      window.scrollTo(0, 0)
    } catch (err) {
      setStartError(err.message)
    } finally {
      setStarting(false)
    }
  }

  const initialSetup = useMemo(() => {
    const saved = game?.settings ?? loadRavensSetup() ?? DEFAULT_SETTINGS
    const teams = (saved.teams ?? []).filter((t) => TEAM_HOUSE_SLUGS.includes(t))
    return { ...DEFAULT_SETTINGS, ...saved, teams: teams.length >= 2 ? teams : DEFAULT_SETTINGS.teams }
    // Only recomputed when setup is opened.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setupOpen])

  /* ---------------- rendering ---------------- */

  const loading = !houses || (game && !setupOpen && !cardsById)
  let body
  if (loadError) {
    body = (
      <div className="flex flex-col items-center gap-6 text-center pt-16">
        <p className="text-[18px] text-realm-rose" style={GARAMOND}>
          The ravens could not be reached. {loadError}
        </p>
        <GamePrimaryButton type="button" onClick={() => window.location.reload()}>
          Try Again
        </GamePrimaryButton>
      </div>
    )
  } else if (loading) {
    body = (
      <p className="pt-24 text-center text-[20px] italic text-realm-note" style={GARAMOND}>
        Gathering the ravens…
      </p>
    )
  } else if (setupOpen || !game) {
    body = (
      <RavensSetup
        houses={houses}
        initial={initialSetup}
        onStart={handleStart}
        starting={starting}
        error={startError}
      />
    )
  } else {
    const teams = game.settings.teams.map((slug) => housesBySlug.get(slug) ?? { slug, name: slug })
    const house = teams[game.teamIndex]
    if (game.phase === 'ready') {
      body = (
        <ReadyScreen
          game={game}
          teams={teams}
          totals={scores(game)}
          onLight={() => {
            setNow(Date.now())
            setGame((g) => startTurn(g, Date.now()))
          }}
        />
      )
    } else if (game.phase === 'turn') {
      body = (
        <TurnScreen
          game={game}
          house={house}
          card={cardsById.get(currentCardId(game))}
          secondsLeft={secondsLeft(game, now)}
          onMark={(result) => setGame((g) => markCard(g, result, Date.now()))}
        />
      )
    } else if (game.phase === 'review') {
      body = (
        <ReviewScreen
          game={game}
          house={house}
          cardsById={cardsById}
          isLast={isLastTurn(game)}
          nextHouse={teams[(game.teamIndex + 1) % teams.length]}
          onCorrect={(i, result) => setGame((g) => setLogResult(g, i, result))}
          onNext={() => {
            setGame((g) => finishTurn(g))
            window.scrollTo(0, 0)
          }}
        />
      )
    } else {
      body = (
        <FinalScreen
          game={game}
          teams={teams}
          standings={standings(game)}
          onRematch={() => setGame((g) => rematch(g))}
          onSetup={() => setSetupOpen(true)}
        />
      )
    }
  }

  return (
    <PageWrapper className="relative overflow-hidden justify-start text-realm-ink">
      <GameBackdrop center="40%" />
      <div className="relative z-10 w-full max-w-[720px] mx-auto pb-12">
        <nav className="flex items-center justify-between mb-6">
          <Link
            to="/games/ravens"
            className={`py-2.5 text-[11px] uppercase tracking-[0.3em] text-realm-muted hover:text-realm-gold transition-colors ${FOCUS}`}
            style={CINZEL}
          >
            ← Ravens
          </Link>
          {game && !setupOpen && game.phase !== 'final' && (
            <span className="text-[11px] uppercase tracking-[0.3em] text-realm-muted" style={CINZEL}>
              Round {game.round} of {game.settings.rounds}
            </span>
          )}
        </nav>
        {body}
      </div>
    </PageWrapper>
  )
}
