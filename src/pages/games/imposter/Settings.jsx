import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useGameStore } from '../../../store/gameStore'
import { fetchRandomCharacter } from '../../../lib/characterService'
import { assignImpostors } from '../../../lib/gameLogic'
import PageWrapper from '../../../components/PageWrapper'
import { GameBackdrop } from '../../../components/GameHome'
import {
  DIFFICULTIES,
  SOURCE_GROUPS,
  ALL_SOURCES,
  DEFAULT_SOURCES,
  normalizeDifficulties,
  describeDifficulties,
  difficultyLabels,
} from '../../../data/imposterOptions'

const CINZEL = { fontFamily: 'Cinzel, serif' }
const GARAMOND = { fontFamily: "'EB Garamond', Georgia, serif" }
const FOCUS =
  'focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-4 focus-visible:outline-[#d8b878]'

// Impostors must always be outnumbered, or the game ends before it starts.
const maxImpostorsFor = (players) => Math.max(1, Math.floor((players - 1) / 2))

function SectionLabel({ children, className = '' }) {
  return (
    <div
      className={`text-[11px] uppercase tracking-[0.32em] text-[#9d9484] ${className}`}
      style={CINZEL}
    >
      {children}
    </div>
  )
}

function Diamond({ on, size = 7 }) {
  return (
    <span
      aria-hidden="true"
      className="block shrink-0 rotate-45 transition-all duration-200"
      style={{
        width: size,
        height: size,
        background: on ? '#d8b878' : 'transparent',
        border: on ? '1px solid #d8b878' : '1px solid rgba(216,184,120,.25)',
      }}
    />
  )
}

function Stepper({ label, value, min, max, onChange, color }) {
  const btn = `w-11 h-11 text-[30px] leading-none transition-colors duration-200 text-[#b39a68] enabled:hover:text-[#f1e6cc] enabled:cursor-pointer disabled:text-[rgba(216,184,120,.18)] disabled:cursor-default ${FOCUS}`
  return (
    <div className="flex flex-col items-center">
      <SectionLabel>{label}</SectionLabel>
      <div className="flex items-center gap-2.5 mt-3.5">
        <button
          type="button"
          aria-label={`Fewer ${label.toLowerCase()}`}
          onClick={() => onChange(value - 1)}
          disabled={value <= min}
          className={btn}
          style={GARAMOND}
        >
          −
        </button>
        <div
          className="min-w-[1.4em] text-center leading-none tabular-nums"
          style={{ ...CINZEL, fontSize: 'clamp(64px, 9vw, 96px)', color }}
          aria-live="polite"
        >
          {value}
        </div>
        <button
          type="button"
          aria-label={`More ${label.toLowerCase()}`}
          onClick={() => onChange(value + 1)}
          disabled={value >= max}
          className={btn}
          style={GARAMOND}
        >
          +
        </button>
      </div>
    </div>
  )
}

function SourceRow({ option, on, locked, onToggle }) {
  const soon = !option.available
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={on}
      aria-disabled={soon || locked}
      onClick={soon || locked ? undefined : onToggle}
      className={[
        'w-full flex items-center gap-4 py-3.5 text-left transition-colors duration-200',
        'border-b border-[rgba(216,184,120,.08)]',
        soon ? 'cursor-not-allowed' : locked ? 'cursor-default' : 'cursor-pointer group',
        FOCUS,
      ].join(' ')}
    >
      <Diamond on={on} />
      <span className="flex-1 min-w-0">
        <span
          className={[
            'block text-[20px] leading-tight transition-colors',
            soon ? 'text-[#6b6357]' : on ? 'text-[#f1e6cc]' : 'text-[#a89e8c] group-hover:text-[#f1e6cc]',
          ].join(' ')}
          style={GARAMOND}
        >
          {option.label}
        </span>
        <span
          className={`block text-[15px] italic mt-0.5 ${soon ? 'text-[#5c554b]' : 'text-[#8f8676]'}`}
          style={GARAMOND}
        >
          {option.detail}
        </span>
      </span>
      {soon && (
        <span
          className="shrink-0 px-2 py-1 text-[9px] uppercase tracking-[0.24em] text-[#d98a7c] border border-[rgba(217,138,124,.35)]"
          style={CINZEL}
        >
          Coming soon
        </span>
      )}
    </button>
  )
}

export default function Settings() {
  const navigate = useNavigate()
  const {
    totalPlayers, impostorCount, difficulty,
    setTotalPlayers, setImpostorCount, setDifficulty,
    startGame,
  } = useGameStore()

  // The store's `difficulty` now holds an array of ids. normalize() also
  // accepts the old single-string value, so nothing else has to change.
  const difficulties = normalizeDifficulties(difficulty)
  const [sources, setSources] = useState(DEFAULT_SOURCES)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const maxImpostors = maxImpostorsFor(totalPlayers)

  // Clamp a stale impostor count carried over from an earlier game.
  useEffect(() => {
    if (impostorCount > maxImpostors) setImpostorCount(maxImpostors)
  }, [impostorCount, maxImpostors, setImpostorCount])

  const changePlayers = (n) => {
    setTotalPlayers(n)
    if (impostorCount > maxImpostorsFor(n)) setImpostorCount(maxImpostorsFor(n))
  }

  const toggleDifficulty = (id) => {
    const on = difficulties.includes(id)
    if (on && difficulties.length === 1) return // keep at least one
    setDifficulty(on ? difficulties.filter((d) => d !== id) : normalizeDifficulties([...difficulties, id]))
  }

  const toggleSource = (id) => {
    setSources((prev) => {
      if (prev.includes(id)) return prev.length === 1 ? prev : prev.filter((s) => s !== id)
      return ALL_SOURCES.filter((s) => s.id === id || prev.includes(s.id)).map((s) => s.id)
    })
  }

  const handleStart = async () => {
    setLoading(true)
    setError(null)
    try {
      const character = await fetchRandomCharacter(difficulties)
      const players = assignImpostors(totalPlayers, impostorCount)
      startGame(character, players)
      navigate('/games/imposter/reveal')
    } catch (err) {
      setError('No character could be drawn. Check your connection and start again.')
    } finally {
      setLoading(false)
    }
  }

  const sourceLabels = ALL_SOURCES.filter((s) => sources.includes(s.id)).map((s) => s.label)
  const summary = [
    `${totalPlayers} players`,
    `${impostorCount} impostor${impostorCount > 1 ? 's' : ''}`,
    difficultyLabels(difficulties).join(' + '),
    sourceLabels.join(' + '),
  ].join(' · ')

  return (
    <PageWrapper className="relative overflow-hidden text-[#ece5d6]">
      <GameBackdrop />

      <div className="relative z-10 w-full max-w-[720px] mx-auto flex flex-col items-center text-center pt-6 pb-16">
        <div
          className="text-[11px] uppercase tracking-[0.5em] indent-[0.5em] text-[#8f8676]"
          style={CINZEL}
        >
          Imposter · Secret Word
        </div>
        <h1
          className="mt-4 font-normal tracking-[0.2em] indent-[0.2em] text-[#f1e6cc]"
          style={{ ...CINZEL, fontSize: 'clamp(34px, 5vw, 52px)' }}
        >
          Game Setup
        </h1>

        {/* Players / impostors */}
        <div className="w-full mt-14 grid grid-cols-1 gap-y-10 sm:grid-cols-[minmax(0,1fr)_1px_minmax(0,1fr)] items-center">
          <Stepper
            label="Number of Players"
            value={totalPlayers}
            min={2}
            max={20}
            onChange={changePlayers}
            color="#f1e6cc"
          />
          <div
            className="hidden sm:block h-[110px]"
            style={{ background: 'linear-gradient(180deg, transparent, rgba(216,184,120,.3), transparent)' }}
          />
          <Stepper
            label="Number of Impostors"
            value={impostorCount}
            min={1}
            max={maxImpostors}
            onChange={setImpostorCount}
            color="#d98a7c"
          />
        </div>

        <div className="flex flex-wrap justify-center gap-3.5 max-w-[420px] mt-10 min-h-[14px]" aria-hidden="true">
          {Array.from({ length: totalPlayers }, (_, i) => {
            const bad = i >= totalPlayers - impostorCount
            return (
              <div
                key={i}
                className="w-[11px] h-[11px] rotate-45 transition-all duration-[250ms]"
                style={{
                  background: bad ? 'transparent' : 'rgba(216,184,120,.75)',
                  border: bad ? '1px solid #d98a7c' : '1px solid transparent',
                }}
              />
            )
          })}
        </div>

        <div className="w-full h-px mt-14" style={{ background: 'linear-gradient(90deg, transparent, rgba(216,184,120,.22), transparent)' }} />

        {/* Difficulty — multi-select */}
        <SectionLabel className="mt-12">Difficulty</SectionLabel>
        <div className="text-[15px] italic text-[#7d7466] mt-2" style={GARAMOND}>
          Pick one or more
        </div>
        <div className="flex flex-wrap justify-center gap-x-12 gap-y-2 mt-4" role="group" aria-label="Difficulty">
          {DIFFICULTIES.map((d) => {
            const on = difficulties.includes(d.id)
            return (
              <button
                key={d.id}
                type="button"
                role="checkbox"
                aria-checked={on}
                onClick={() => toggleDifficulty(d.id)}
                className={[
                  'flex flex-col items-center gap-3 px-1 py-2 text-[17px] uppercase tracking-[0.24em] transition-colors duration-200 cursor-pointer',
                  on ? 'text-[#d8b878]' : 'text-[#7d7466] hover:text-[#f1e6cc]',
                  FOCUS,
                ].join(' ')}
                style={CINZEL}
              >
                <Diamond on={on} />
                <span>{d.label}</span>
              </button>
            )
          })}
        </div>
        <div className="text-[19px] italic text-[#a89e8c] mt-3.5 min-h-[1.5em]" style={GARAMOND}>
          {describeDifficulties(difficulties)}
        </div>

        <div className="w-full h-px mt-14" style={{ background: 'linear-gradient(90deg, transparent, rgba(216,184,120,.22), transparent)' }} />

        {/* Show & lore sources */}
        <SectionLabel className="mt-12">Characters From</SectionLabel>
        <div className="w-full max-w-[460px] mt-6 text-left">
          {SOURCE_GROUPS.map((group) => (
            <div key={group.id} className="mt-8 first:mt-0" role="group" aria-label={group.label}>
              <div
                className="pb-2 text-[10px] uppercase tracking-[0.32em] text-[#7d7466] border-b border-[rgba(216,184,120,.15)]"
                style={CINZEL}
              >
                {group.label}
              </div>
              {group.options.map((option) => {
                const on = sources.includes(option.id)
                return (
                  <SourceRow
                    key={option.id}
                    option={option}
                    on={on}
                    locked={on && sources.length === 1}
                    onToggle={() => toggleSource(option.id)}
                  />
                )
              })}
            </div>
          ))}
        </div>

        {error && (
          <p className="mt-10 text-[17px] text-[#d98a7c]" style={GARAMOND}>
            {error}
          </p>
        )}

        <button
          type="button"
          onClick={handleStart}
          disabled={loading}
          className={`mt-14 flex items-center gap-[18px] px-12 py-5 bg-[#d8b878] text-[#1f1d1a] font-semibold text-[15px] uppercase tracking-[0.34em] transition-all duration-200 enabled:cursor-pointer enabled:hover:bg-[#e9cc90] enabled:hover:-translate-y-px disabled:opacity-60 disabled:cursor-wait ${FOCUS}`}
          style={CINZEL}
        >
          <span>{loading ? 'Preparing…' : 'Start Game'}</span>
          {!loading && <span className="text-lg tracking-normal" aria-hidden="true">→</span>}
        </button>
        <div className="text-[18px] italic text-[#8f8676] mt-[18px] text-balance" style={GARAMOND}>
          {summary}
        </div>

        <button
          type="button"
          onClick={() => navigate('/games/imposter')}
          className={`mt-7 p-2.5 text-[11px] uppercase tracking-[0.3em] text-[#8f8676] hover:text-[#d8b878] transition-colors cursor-pointer ${FOCUS}`}
          style={CINZEL}
        >
          ← Back
        </button>
      </div>
    </PageWrapper>
  )
}