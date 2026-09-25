import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { CINZEL, GARAMOND, FOCUS } from './GameHome'
import {
  GAMES,
  UPCOMING_GAMES,
  MODE_FILTERS,
  PLAYER_FILTERS,
  LENGTH_FILTERS,
  NO_FILTERS,
  filterGames,
  describeGame,
} from '../data/games'
import GameMark from './GameMark'

/**
 * components/GameGrid.jsx
 *
 * Every game as a card: its colour and mark, its numeral, name, tagline and
 * how it's played, with filters for mode, player count and length. Games
 * keep their numeral when filtered (Whispers is always IV). Trivia, coming
 * soon, shows only when nothing is filtered.
 */

const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII']

// One filter: its label, then its options as a segmented control.
function FilterGroup({ label, options, value, onChange }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-[10px] uppercase tracking-[0.3em] text-realm-dim" style={CINZEL}>
        {label}
      </span>
      <div className="flex gap-[3px] p-[3px] rounded-[2px] border border-[rgba(216,184,120,.3)]" role="radiogroup" aria-label={label}>
        {options.map((o) => {
          const on = o.id === value
          return (
            <button
              key={o.id}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => onChange(o.id)}
              className={`px-3 py-[7px] rounded-[1px] text-[10px] uppercase tracking-[0.16em] whitespace-nowrap transition-colors cursor-pointer ${
                on ? '' : 'hover:text-realm-cream'
              } ${FOCUS}`}
              style={{ ...CINZEL, background: on ? 'rgba(216,184,120,.16)' : 'transparent', color: on ? '#eed49b' : '#9d9483' }}
            >
              {o.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function Chip({ gold, children }) {
  return (
    <span
      className="px-2 py-[5px] rounded-[1px] border text-[9px] uppercase tracking-[0.18em] whitespace-nowrap"
      style={{ ...CINZEL, borderColor: gold ? 'rgba(216,184,120,.6)' : 'rgba(216,184,120,.2)', color: gold ? '#d8b878' : '#9d9483' }}
    >
      {children}
    </span>
  )
}

// The card's top: the game's colour, its mark, and a large faded numeral.
function CardTop({ tint, numeral, children, hatched }) {
  return (
    <div
      className="relative h-[168px] flex items-center justify-center overflow-hidden border-b"
      style={{
        borderColor: hatched ? 'rgba(216,184,120,.2)' : tint ? `${tint}` : 'rgba(216,184,120,.15)',
        background: hatched
          ? 'repeating-linear-gradient(135deg, rgba(216,184,120,.035) 0 10px, transparent 10px 20px)'
          : `linear-gradient(165deg, ${tint}cc 0%, ${tint}44 55%, #22201c 100%)`,
      }}
    >
      <span
        aria-hidden="true"
        className="absolute right-4 -top-3 leading-none pointer-events-none select-none"
        style={{ ...CINZEL, fontSize: 124, color: 'rgba(255,255,255,.06)' }}
      >
        {numeral}
      </span>
      <div className="relative">{children}</div>
    </div>
  )
}

function GameCard({ game, numeral }) {
  const meta = describeGame(game)
  return (
    <li>
      <Link
        to={game.to}
        className={`group h-full flex flex-col rounded-[3px] border border-[rgba(216,184,120,.16)] overflow-hidden transition-colors duration-200 hover:border-[rgba(216,184,120,.5)] ${FOCUS}`}
        style={{ background: '#22201c' }}
      >
        <CardTop tint={game.tint ?? '#3a342a'} numeral={numeral}>
          <div className="scale-[0.85]" aria-hidden="true">
            <GameMark id={game.id} />
          </div>
        </CardTop>
        <div className="flex-1 flex flex-col items-center text-center px-5 pt-5 pb-5">
          <h3 className="text-[23px] font-normal tracking-[0.1em] text-realm-cream group-hover:text-realm-gilt transition-colors" style={CINZEL}>
            {game.title}
          </h3>
          <p className="mt-0.5 text-[18px] italic text-realm-body" style={GARAMOND}>
            {game.description}
          </p>
          <div className="mt-3.5 flex flex-wrap justify-center gap-1.5">
            <Chip gold={game.mode === 'pass'}>{meta.mode}</Chip>
            <Chip>{meta.players}</Chip>
            <Chip>{meta.minutes}</Chip>
          </div>
          <div className="flex-1 min-h-4" />
          <span className="mt-4 flex items-center gap-2.5 text-[10px] uppercase tracking-[0.28em] text-realm-gold" style={CINZEL}>
            <span aria-hidden="true" className="w-[5px] h-[5px] rotate-45 bg-realm-gold" />
            Enter
            <span aria-hidden="true" className="text-[14px] transition-transform duration-200 group-hover:translate-x-1">
              →
            </span>
          </span>
        </div>
      </Link>
    </li>
  )
}

function ComingSoonCard({ game, numeral }) {
  return (
    <li>
      <div className="h-full flex flex-col rounded-[3px] border border-dashed border-[rgba(216,184,120,.25)] overflow-hidden">
        <CardTop numeral={numeral} hatched>
          <div className="flex flex-col items-center gap-2.5">
            <span aria-hidden="true" className="w-3.5 h-3.5 rotate-45 border border-[rgba(216,184,120,.5)]" />
            <span className="text-[9.5px] uppercase tracking-[0.3em] text-realm-rose" style={CINZEL}>
              Coming Soon
            </span>
          </div>
        </CardTop>
        <div className="flex-1 flex flex-col items-center text-center px-5 pt-5 pb-6 opacity-70">
          <h3 className="text-[23px] font-normal tracking-[0.1em] text-[#a09584]" style={CINZEL}>
            {game.title}
          </h3>
          <p className="mt-0.5 text-[18px] italic text-realm-dim" style={GARAMOND}>
            {game.description}
          </p>
        </div>
      </div>
    </li>
  )
}

export default function GameGrid() {
  const [filters, setFilters] = useState(NO_FILTERS)
  const set = (key) => (value) => setFilters((f) => ({ ...f, [key]: value }))
  const games = useMemo(() => filterGames(GAMES, filters), [filters])
  const filtered = Object.keys(NO_FILTERS).some((k) => filters[k] !== NO_FILTERS[k])
  const numeralOf = (g) => ROMAN[GAMES.findIndex((x) => x.id === g.id)]

  return (
    <section aria-label="Games">
      <div className="flex flex-wrap justify-center gap-x-8 gap-y-3 py-4 border-y border-[rgba(216,184,120,.16)]">
        <FilterGroup label="How" options={MODE_FILTERS} value={filters.mode} onChange={set('mode')} />
        <FilterGroup label="Players" options={PLAYER_FILTERS} value={filters.players} onChange={set('players')} />
        <FilterGroup label="Length" options={LENGTH_FILTERS} value={filters.length} onChange={set('length')} />
      </div>

      <div className="flex items-center justify-center gap-4 mt-3 min-h-9" aria-live="polite">
        <span className="text-[10px] uppercase tracking-[0.26em] text-realm-muted" style={CINZEL}>
          {games.length} of {GAMES.length} games
        </span>
        {filtered && (
          <button
            type="button"
            onClick={() => setFilters(NO_FILTERS)}
            className={`px-2 py-2 text-[10px] uppercase tracking-[0.26em] text-realm-gold hover:text-realm-cream transition-colors cursor-pointer ${FOCUS}`}
            style={CINZEL}
          >
            Clear
          </button>
        )}
      </div>

      {games.length > 0 ? (
        <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-3">
          {games.map((g) => (
            <GameCard key={g.id} game={g} numeral={numeralOf(g)} />
          ))}
          {!filtered &&
            UPCOMING_GAMES.map((g, i) => <ComingSoonCard key={g.id} game={g} numeral={ROMAN[GAMES.length + i]} />)}
        </ul>
      ) : (
        <p className="mt-10 text-center text-[18px] italic text-realm-muted" style={GARAMOND}>
          No game in the realm fits all of that.
        </p>
      )}
    </section>
  )
}