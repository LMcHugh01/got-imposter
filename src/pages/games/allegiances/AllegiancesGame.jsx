import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import PageWrapper from '../../../components/PageWrapper'
import {
  GameBackdrop,
  GamePrimaryButton,
  GameStats,
  Diamond,
  Hairline,
  CINZEL,
  GARAMOND,
  FOCUS,
} from '../../../components/GameHome'
import { ASSEMBLIES, ASSEMBLY_BY_ID, PATIENCE, TIER_COLORS } from '../../../data/allegiances'
import {
  newRound,
  togglePick,
  presentPick,
  shuffle,
  verdict,
  recordResult,
  OUTCOME_NOTES,
} from '../../../gameEngine/allegiances'
import { loadAllegiances, saveAllegiances } from '../../../lib/allegiancesStorage'
import { recordGameEvent } from '../../../lib/recordSync'

const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X']
const TEXT_BUTTON = `px-1 py-3 text-[11px] uppercase tracking-[0.3em] transition-colors cursor-pointer ${FOCUS}`

/**
 * pages/games/allegiances/AllegiancesGame.jsx
 *
 * One assembly: sixteen names, four hidden bonds, four mistakes allowed.
 * Every assembly's board is saved, so switching between them (or
 * refreshing) picks up where you left off.
 */
export default function AllegiancesGame() {
  const { assemblyId } = useParams()
  const assembly = ASSEMBLY_BY_ID[Number(assemblyId)]
  const navigate = useNavigate()

  const [saved, setSaved] = useState(() => loadAllegiances())
  const [note, setNote] = useState('')
  const boardRef = useRef(null)

  // A fresh board for an assembly you haven't touched yet — made once per
  // assembly so it doesn't reshuffle on every render before your first tap.
  const freshRound = useMemo(() => (assembly ? newRound(assembly) : null), [assembly])
  const round = assembly ? (saved.rounds[assembly.id] ?? freshRound) : null

  useEffect(() => {
    saveAllegiances(saved)
  }, [saved])

  // Clear the warning when switching assemblies.
  useEffect(() => setNote(''), [assemblyId])

  const setRound = useCallback(
    (next, statsUpdate) =>
      setSaved((s) => ({
        stats: statsUpdate ? statsUpdate(s.stats) : s.stats,
        rounds: { ...s.rounds, [assembly.id]: next },
      })),
    [assembly],
  )

  const shakeBoard = () => {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return
    boardRef.current?.animate?.(
      [
        { transform: 'translateX(0)' },
        { transform: 'translateX(-5px)' },
        { transform: 'translateX(4px)' },
        { transform: 'translateX(-2px)' },
        { transform: 'translateX(0)' },
      ],
      { duration: 400, easing: 'ease' },
    )
  }

  if (!assembly) return <Navigate to={`/games/allegiances/${ASSEMBLIES[0].id}`} replace />

  const playing = round.status === 'playing'
  const won = round.status === 'won'
  const ready = round.picked.length === 4
  const patienceLeft = PATIENCE - round.mistakes
  const index = ASSEMBLIES.indexOf(assembly)
  const nextAssembly = ASSEMBLIES[(index + 1) % ASSEMBLIES.length]

  const handlePresent = () => {
    const { round: next, outcome } = presentPick(round, assembly)
    if (outcome === 'invalid') return
    const finished = outcome === 'won' || outcome === 'lost'
    setRound(next, finished ? (stats) => recordResult(stats, outcome === 'won') : null)
    if (finished) recordGameEvent('allegiances', { won: outcome === 'won', mistakes: next.mistakes })
    setNote(OUTCOME_NOTES[outcome] ?? '')
    if (outcome === 'oneAway' || outcome === 'wrong') shakeBoard()
  }

  const handlePlayAgain = () => {
    setRound(newRound(assembly))
    setNote('')
  }

  const { title: endTitle, line: endLine } = verdict(round)

  return (
    <PageWrapper className="relative overflow-hidden justify-start text-realm-ink">
      <GameBackdrop center="520px" />

      <div className="relative z-10 w-full max-w-[760px] mx-auto pb-12">
        <nav className="flex items-center justify-between gap-4">
          <Link
            to="/games/allegiances"
            className={`py-2.5 text-[11px] uppercase tracking-[0.3em] text-realm-muted hover:text-realm-gold transition-colors ${FOCUS}`}
            style={CINZEL}
          >
            ← Allegiances
          </Link>
          <ul className="flex gap-5 sm:gap-[22px]" aria-label="Assemblies">
            {ASSEMBLIES.map((a, i) => {
              const on = a.id === assembly.id
              return (
                <li key={a.id}>
                  <button
                    type="button"
                    onClick={() => navigate(`/games/allegiances/${a.id}`)}
                    aria-current={on ? 'page' : undefined}
                    aria-label={a.name}
                    className={`flex items-center gap-2 py-2.5 px-0.5 text-[13px] tracking-[0.14em] transition-colors cursor-pointer ${
                      on ? 'text-realm-gold' : 'text-realm-dim hover:text-realm-cream'
                    } ${FOCUS}`}
                    style={CINZEL}
                  >
                    <Diamond
                      size={6}
                      fill={on ? '#d8b878' : undefined}
                      line={on ? '#d8b878' : 'rgba(216,184,120,.3)'}
                    />
                    {ROMAN[i] ?? i + 1}
                  </button>
                </li>
              )
            })}
          </ul>
        </nav>

        <header className="flex flex-col items-center text-center pt-8">
          <div className="text-[11px] uppercase tracking-[0.44em] indent-[0.44em] text-realm-muted" style={CINZEL}>
            A Game of Diplomacy
          </div>
          <h1
            className="mt-[18px] font-normal leading-[1.1] tracking-[0.14em] indent-[0.14em] text-realm-cream text-balance"
            style={{ ...CINZEL, fontSize: 'clamp(30px, 6vw, 52px)' }}
          >
            {assembly.name}
          </h1>
          <div className="flex items-center gap-[18px] mt-[26px]">
            <div
              className="w-8 sm:w-12 h-px"
              style={{ background: 'linear-gradient(90deg, transparent, rgba(216,184,120,.5))' }}
            />
            <div className="text-[10px] uppercase tracking-[0.34em] text-realm-muted" style={CINZEL}>
              Patience
            </div>
            <div className="flex gap-3" role="img" aria-label={`${patienceLeft} of ${PATIENCE} patience left`}>
              {Array.from({ length: PATIENCE }, (_, i) =>
                i < patienceLeft ? (
                  <Diamond key={i} size={9} fill="#d8b878" />
                ) : (
                  <Diamond key={i} size={9} line="rgba(201,118,106,.7)" />
                ),
              )}
            </div>
            <div
              className="w-8 sm:w-12 h-px"
              style={{ background: 'linear-gradient(270deg, transparent, rgba(216,184,120,.5))' }}
            />
          </div>
        </header>

        {/* Bonds found so far (or all of them, once the round is over) */}
        {round.solved.length > 0 && (
          <ol className="mt-10" aria-label="Bonds found">
            {round.solved.map((gi) => {
              const g = assembly.groups[gi]
              const ink = TIER_COLORS[g.tier]
              return (
                <li key={gi} className="animate-[riseIn_.34s_ease_both]">
                  <div className="px-3 py-6 text-center">
                    <div className="flex items-center justify-center gap-3">
                      <Diamond size={7} fill={ink} />
                      <div
                        className="text-[12px] sm:text-[13px] uppercase tracking-[0.22em]"
                        style={{ ...CINZEL, color: ink }}
                      >
                        {g.label}
                      </div>
                      <Diamond size={7} fill={ink} />
                    </div>
                    <div
                      className="mt-2 text-[18px] sm:text-[19px] italic leading-[1.45] text-[#c8bda6] text-balance"
                      style={GARAMOND}
                    >
                      {g.names.join(' · ')}
                    </div>
                  </div>
                  <Hairline strength={0.16} />
                </li>
              )
            })}
          </ol>
        )}

        {/* The board */}
        {round.order.length > 0 && (
          <div
            ref={boardRef}
            className={`grid grid-cols-4 gap-px bg-realm-gold/15 ${round.solved.length ? 'mt-7' : 'mt-10'}`}
            role="group"
            aria-label="Names on the floor"
          >
            {round.order.map((name) => {
              const on = round.picked.includes(name)
              return (
                <button
                  key={name}
                  type="button"
                  aria-pressed={on}
                  onClick={() => {
                    setRound(togglePick(round, name))
                    setNote('')
                  }}
                  className={[
                    'min-h-[76px] sm:min-h-[92px] px-1.5 sm:px-2.5 py-3 flex items-center justify-center text-center',
                    'text-[12px] sm:text-[13.5px] tracking-[0.04em] sm:tracking-[0.06em] leading-[1.3] text-balance',
                    'transition-colors duration-150 cursor-pointer',
                    FOCUS,
                    on
                      ? 'bg-realm-gold text-realm-bg font-semibold hover:bg-realm-gold-hover'
                      : 'bg-realm-bg text-[#ddd3bf] hover:bg-[#28251f] hover:text-realm-cream',
                  ].join(' ')}
                  style={CINZEL}
                >
                  {name}
                </button>
              )
            })}
          </div>
        )}

        {playing ? (
          <div className="flex flex-col items-center mt-[34px]">
            <GamePrimaryButton type="button" disabled={!ready} onClick={handlePresent}>
              {ready ? 'Present the Four' : `Choose Four · ${round.picked.length}`}
            </GamePrimaryButton>
            <div className="flex gap-9 mt-3.5">
              <button
                type="button"
                onClick={() => {
                  setRound({ ...round, order: shuffle(round.order) })
                  setNote('')
                }}
                className={`${TEXT_BUTTON} text-realm-gold hover:text-realm-cream`}
                style={CINZEL}
              >
                Shuffle
              </button>
              <button
                type="button"
                onClick={() => {
                  setRound({ ...round, picked: [] })
                  setNote('')
                }}
                className={`${TEXT_BUTTON} text-realm-muted hover:text-realm-cream`}
                style={CINZEL}
              >
                Clear
              </button>
            </div>
            <p
              className="min-h-[1.5em] mt-3.5 text-[19px] italic text-realm-rose animate-[fadeIn_.25s_ease_both]"
              style={GARAMOND}
              aria-live="polite"
              key={`${round.mistakes}-${note}`}
            >
              {note}
            </p>
          </div>
        ) : (
          <section
            className="flex flex-col items-center text-center mt-14 animate-[riseIn_.35s_ease_both]"
            aria-live="polite"
          >
            <Diamond size={16} fill={won ? '#d8b878' : undefined} line={won ? '#d8b878' : '#c9766a'} />
            <div className="mt-[26px] text-[10px] uppercase tracking-[0.4em] text-realm-muted" style={CINZEL}>
              {assembly.name} · {won ? 'Cleared' : 'Lost'}
            </div>
            <h2
              className="mt-3.5 font-normal leading-[1.15] tracking-[0.1em] text-realm-cream text-balance"
              style={{ ...CINZEL, fontSize: 'clamp(26px, 4.5vw, 36px)' }}
            >
              {endTitle}
            </h2>
            <p
              className="mt-4 mx-auto max-w-[40ch] text-[19px] leading-[1.55] italic text-realm-body text-pretty"
              style={GARAMOND}
            >
              {endLine}
            </p>
            <GamePrimaryButton
              type="button"
              className="mt-9"
              onClick={() => navigate(`/games/allegiances/${nextAssembly.id}`)}
            >
              Next Assembly
            </GamePrimaryButton>
            <button
              type="button"
              onClick={handlePlayAgain}
              className={`mt-3.5 ${TEXT_BUTTON} text-realm-gold hover:text-realm-cream`}
              style={CINZEL}
            >
              Play This Assembly Again
            </button>
          </section>
        )}

        <GameStats
          className="mt-16"
          items={[
            { label: 'Solved', value: saved.stats.solved },
            { label: 'Played', value: saved.stats.played },
          ]}
        />
      </div>
    </PageWrapper>
  )
}