import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import PageWrapper from '../../../components/PageWrapper'
import {
  GameBackdrop,
  GamePrimaryButton,
  GameStats,
  Diamond,
  CINZEL,
  GARAMOND,
  FOCUS,
} from '../../../components/GameHome'
import { fetchDraftablePool } from '../../../lib/characterAttributesService'
import { loadWhispers, saveWhispers } from '../../../lib/whispersStorage'
import { recordGameEvent } from '../../../lib/recordSync'
import { MAX_GUESSES, WHISPER_GROUPS } from '../../../data/whispers'
import { buildRoster, pickTarget, roundStatus, whisperFor, recordResult } from '../../../gameEngine/whispers'
import SuspectSearch from './SuspectSearch'
import GuessReport from './GuessReport'
import WhispersResult from './WhispersResult'

/**
 * pages/games/whispers/WhispersGame.jsx
 *
 * Endless Whispers: a hidden character, six guesses, then straight on to
 * the next name. Solving grows the streak; running out resets it. The
 * round in progress is saved, so refreshing resumes it rather than
 * offering a way to dodge a loss.
 */
export default function WhispersGame() {
  const [roster, setRoster] = useState(null)
  const [loadState, setLoadState] = useState('loading') // loading | error | ready
  const [error, setError] = useState(null)
  const [stats, setStats] = useState(() => loadWhispers().stats)
  const [round, setRound] = useState(null) // { targetId, guessIds }
  const [resultOpen, setResultOpen] = useState(false)

  const load = useCallback(() => {
    setLoadState('loading')
    setError(null)
    fetchDraftablePool()
      .then((pool) => {
        const suspects = buildRoster(pool)
        if (suspects.length < 2) throw new Error('Not enough characters to play yet.')
        const saved = loadWhispers().round
        const ids = new Set(suspects.map((s) => s.id))
        const resumable = saved && ids.has(saved.targetId)
        setRoster(suspects)
        setRound(
          resumable
            ? { targetId: saved.targetId, guessIds: saved.guessIds.filter((id) => ids.has(id)) }
            : { targetId: pickTarget(suspects).id, guessIds: [] },
        )
        setLoadState('ready')
      })
      .catch((err) => {
        setError(err.message)
        setLoadState('error')
      })
  }, [])

  useEffect(load, [load])

  useEffect(() => {
    if (round) saveWhispers({ stats, round })
  }, [stats, round])

  const byId = useMemo(() => new Map((roster ?? []).map((s) => [s.id, s])), [roster])

  const handleGuess = useCallback(
    (id) => {
      if (!round || roundStatus(round.guessIds, round.targetId) !== 'playing') return
      const guessIds = [...round.guessIds, id]
      const status = roundStatus(guessIds, round.targetId)
      setRound({ ...round, guessIds })
      if (status !== 'playing') {
        setStats((s) => recordResult(s, status === 'won'))
        setResultOpen(true)
        recordGameEvent('whispers', { won: status === 'won', guesses: guessIds.length })
      }
    },
    [round],
  )

  const handleNext = useCallback(() => {
    setRound((r) => ({ targetId: pickTarget(roster, r?.targetId).id, guessIds: [] }))
    setResultOpen(false)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [roster])

  const closeResult = useCallback(() => setResultOpen(false), [])

  if (loadState !== 'ready') {
    return (
      <PageWrapper className="relative overflow-hidden justify-center text-realm-ink">
        <GameBackdrop center="200px" />
        <div className="relative z-10 flex flex-col items-center gap-6 text-center">
          {loadState === 'loading' ? (
            <p className="text-[20px] italic text-realm-note" style={GARAMOND}>
              Gathering the little birds…
            </p>
          ) : (
            <>
              <p className="text-[18px] text-realm-rose" style={GARAMOND}>
                The birds could not be reached. {error}
              </p>
              <GamePrimaryButton type="button" onClick={load}>
                Try Again
              </GamePrimaryButton>
            </>
          )}
        </div>
      </PageWrapper>
    )
  }

  const target = byId.get(round.targetId)
  const guesses = round.guessIds.map((id) => byId.get(id)).filter(Boolean)
  const status = roundStatus(round.guessIds, round.targetId)
  const playing = status === 'playing'
  const won = status === 'won'
  const left = MAX_GUESSES - guesses.length
  const whisper = playing ? whisperFor(target, guesses.length) : null

  return (
    <PageWrapper className="relative overflow-hidden justify-start text-realm-ink">
      <GameBackdrop center="200px" />

      <div className="relative z-10 w-full max-w-[760px] mx-auto pb-12">
        <nav className="flex items-center justify-between">
          <Link
            to="/games/whispers"
            className={`py-2.5 text-[11px] uppercase tracking-[0.3em] text-realm-muted hover:text-realm-gold transition-colors ${FOCUS}`}
            style={CINZEL}
          >
            ← Whispers
          </Link>
          <span
            className="flex items-center gap-2.5 text-[11px] uppercase tracking-[0.3em] text-realm-gold"
            style={CINZEL}
          >
            <Diamond size={6} fill="#d8b878" />
            Streak {stats.streak}
          </span>
        </nav>

        {/* Round header */}
        <header className="flex flex-col items-center text-center pt-9">
          <div className="flex items-center gap-3.5 h-6" aria-hidden="true">
            {Array.from({ length: MAX_GUESSES }, (_, i) => {
              const g = guesses[i]
              if (!g) return <Diamond key={i} size={9} line="rgba(216,184,120,.45)" />
              if (g.id === target.id) return <Diamond key={i} size={14} fill="#d8b878" />
              return <Diamond key={i} size={9} fill="rgba(216,184,120,.28)" />
            })}
            {status === 'lost' && <Diamond size={14} line="#c9766a" className="ml-1.5" />}
          </div>

          <div
            className="mt-[30px] text-[11px] uppercase tracking-[0.44em] indent-[0.44em] text-realm-muted"
            style={CINZEL}
          >
            {playing ? `${left} of ${MAX_GUESSES} guesses left` : `Streak · ${stats.streak}`}
          </div>
          <h1
            className="mt-[18px] font-normal leading-[1.1] tracking-[0.14em] indent-[0.14em] text-realm-cream text-balance"
            style={{ ...CINZEL, fontSize: 'clamp(32px, 6vw, 54px)' }}
          >
            {playing ? 'Who Is Hiding?' : won ? 'The Name Is Yours' : 'The Trail Went Cold'}
          </h1>
          <p
            className="mt-[18px] mx-auto max-w-[40ch] text-[19px] leading-normal italic text-realm-note text-pretty"
            style={GARAMOND}
          >
            {playing
              ? guesses.length === 0
                ? 'Name any character from the realm.'
                : 'Keep narrowing it down.'
              : won
                ? `You drew it out in ${guesses.length} ${guesses.length === 1 ? 'guess' : 'guesses'}.`
                : `They were ${target.name}. The streak starts again.`}
          </p>

          {!playing && (
            <div className="flex flex-col items-center mt-8">
              <GamePrimaryButton type="button" onClick={handleNext}>
                Next Name
              </GamePrimaryButton>
              <button
                type="button"
                onClick={() => setResultOpen(true)}
                className={`mt-4 p-2.5 text-[12px] uppercase tracking-[0.32em] text-realm-gold hover:text-realm-cream transition-colors cursor-pointer ${FOCUS}`}
                style={CINZEL}
              >
                See the Answer
              </button>
            </div>
          )}
        </header>

        {playing && (
          <SuspectSearch key={round.targetId} roster={roster} excludeIds={round.guessIds} onGuess={handleGuess} />
        )}

        {whisper && (
          <div className="max-w-[560px] mx-auto mt-10 text-center" aria-live="polite">
            <div className="flex items-center justify-center gap-3.5">
              <div className="w-7 h-px bg-realm-gold/40" />
              <div className="text-[10px] uppercase tracking-[0.34em] text-realm-gold" style={CINZEL}>
                A Little Bird Says
              </div>
              <div className="w-7 h-px bg-realm-gold/40" />
            </div>
            <p className="mt-3 text-[21px] leading-normal italic text-[#e4d8bd] text-pretty" style={GARAMOND}>
              {whisper}
            </p>
          </div>
        )}

        {/* Reports — only once there is something to report. How to read them lives on the Whispers home page. */}
        {guesses.length > 0 && (
          <section className="mt-16" aria-label="Your guesses">
            <div className="flex items-center gap-[18px]">
              <div
                className="flex-1 h-px"
                style={{ background: 'linear-gradient(90deg, transparent, rgba(216,184,120,.3))' }}
              />
              <h2
                className="text-[11px] font-normal uppercase tracking-[0.34em] text-realm-brass whitespace-nowrap"
                style={CINZEL}
              >
                Reports · {guesses.length} of {MAX_GUESSES}
              </h2>
              <div
                className="flex-1 h-px"
                style={{ background: 'linear-gradient(270deg, transparent, rgba(216,184,120,.3))' }}
              />
            </div>

            <ol>
              {guesses
                .map((g, i) => ({ g, n: i + 1 }))
                .reverse()
                .map(({ g, n }) => (
                  <GuessReport key={g.id} number={n} guess={g} target={target} />
                ))}
            </ol>

            <dl className="flex flex-wrap justify-center gap-x-[26px] gap-y-2.5 mt-9">
              {WHISPER_GROUPS.map((g) => (
                <div key={g.id} className="flex items-baseline gap-2">
                  <dt className="text-[10px] tracking-[0.2em] text-realm-brass" style={CINZEL}>
                    {g.code}
                  </dt>
                  <dd className="text-[16px] italic text-realm-dim" style={GARAMOND}>
                    {g.label}
                  </dd>
                </div>
              ))}
            </dl>
          </section>
        )}

        <GameStats
          className="mt-16"
          items={[
            { label: 'Streak', value: stats.streak },
            { label: 'Best', value: stats.best },
            { label: 'Solved', value: stats.solved },
          ]}
        />
      </div>

      {resultOpen && !playing && (
        <WhispersResult
          won={won}
          target={target}
          guessCount={guesses.length}
          streak={stats.streak}
          onNext={handleNext}
          onClose={closeResult}
        />
      )}
    </PageWrapper>
  )
}