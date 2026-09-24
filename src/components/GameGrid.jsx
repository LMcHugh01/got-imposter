import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Diamond, CINZEL, GARAMOND, FOCUS } from './GameHome'
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
 * Every game as a tile — its own ornament, name, tagline and how it's
 * played — with filters for mode, player count and length. Used on the
 * Home and Games pages.
 */

function FilterGroup({ label, options, value, onChange }) {
  return (
    <div className="flex flex-col items-center gap-2.5">
      <div className="text-[10px] uppercase tracking-[0.34em] text-realm-dim" style={CINZEL}>
        {label}
      </div>
      <div className="flex flex-wrap justify-center gap-1" role="radiogroup" aria-label={label}>
        {options.map((o) => {
          const on = o.id === value
          return (
            <button
              key={o.id}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => onChange(o.id)}
              className={[
                'flex items-center gap-2 px-3 py-2 text-[11px] uppercase tracking-[0.18em] whitespace-nowrap transition-colors cursor-pointer',
                on ? 'text-realm-gold' : 'text-realm-muted hover:text-realm-cream',
                FOCUS,
              ].join(' ')}
              style={CINZEL}
            >
              <Diamond size={5} fill={on ? '#d8b878' : undefined} line={on ? '#d8b878' : 'rgba(216,184,120,.3)'} />
              {o.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function GameTile({ game }) {
  const meta = describeGame(game)
  return (
    <li className="-ml-px -mt-px border border-realm-gold/15">
      <Link
        to={game.to}
        className={`group h-full flex flex-col items-center text-center px-5 pt-7 pb-6 transition-colors duration-200 hover:bg-[#25221d] ${FOCUS}`}
      >
        <div className="h-16 flex items-center justify-center scale-[0.8]" aria-hidden="true">
          <GameMark id={game.id} />
        </div>
        <h3
          className="mt-4 text-[21px] sm:text-[22px] font-normal tracking-[0.12em] text-realm-cream group-hover:text-realm-gilt transition-colors"
          style={CINZEL}
        >
          {game.title}
        </h3>
        <p className="mt-1 text-[16px] italic text-realm-body" style={GARAMOND}>
          {game.description}
        </p>
        <div className="flex-1 min-h-4" />
        <p className="text-[10px] uppercase tracking-[0.2em] text-realm-muted leading-relaxed" style={CINZEL}>
          <span className={game.mode === 'pass' ? 'text-realm-gold' : ''}>{meta.mode}</span>
          <span aria-hidden="true"> · </span>
          {meta.players}
          <span aria-hidden="true"> · </span>
          {meta.minutes}
        </p>
      </Link>
    </li>
  )
}

function ComingSoonTile({ game }) {
  return (
    <li className="-ml-px -mt-px border border-realm-gold/15">
      <div className="h-full flex flex-col items-center justify-center text-center px-5 py-8 opacity-60">
        <div className="text-[10px] uppercase tracking-[0.34em] text-realm-rose" style={CINZEL}>
          Coming Soon
        </div>
        <h3 className="mt-4 text-[21px] font-normal tracking-[0.12em] text-[#8a8171]" style={CINZEL}>
          {game.title}
        </h3>
        <p className="mt-1 text-[16px] italic text-realm-dim" style={GARAMOND}>
          {game.description}
        </p>
      </div>
    </li>
  )
}

export default function GameGrid() {
  const [filters, setFilters] = useState(NO_FILTERS)
  const set = (key) => (value) => setFilters((f) => ({ ...f, [key]: value }))
  const games = useMemo(() => filterGames(GAMES, filters), [filters])
  const filtered = Object.keys(NO_FILTERS).some((k) => filters[k] !== NO_FILTERS[k])

  return (
    <section aria-label="Games">
      <div className="flex flex-wrap justify-center gap-x-10 gap-y-5">
        <FilterGroup label="How" options={MODE_FILTERS} value={filters.mode} onChange={set('mode')} />
        <FilterGroup label="Players" options={PLAYER_FILTERS} value={filters.players} onChange={set('players')} />
        <FilterGroup label="Length" options={LENGTH_FILTERS} value={filters.length} onChange={set('length')} />
      </div>

      <div className="flex items-center justify-center gap-4 mt-6 min-h-9" aria-live="polite">
        <span className="text-[11px] uppercase tracking-[0.24em] text-realm-muted" style={CINZEL}>
          {games.length} of {GAMES.length} games
        </span>
        {filtered && (
          <button
            type="button"
            onClick={() => setFilters(NO_FILTERS)}
            className={`px-2 py-2 text-[11px] uppercase tracking-[0.24em] text-realm-gold hover:text-realm-cream transition-colors cursor-pointer ${FOCUS}`}
            style={CINZEL}
          >
            Clear
          </button>
        )}
      </div>

      {games.length > 0 ? (
        <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 mt-4 pl-px pt-px">
          {games.map((g) => (
            <GameTile key={g.id} game={g} />
          ))}
          {!filtered && UPCOMING_GAMES.map((g) => <ComingSoonTile key={g.id} game={g} />)}
        </ul>
      ) : (
        <p className="mt-10 text-center text-[18px] italic text-realm-muted" style={GARAMOND}>
          No game in the realm fits all of that.
        </p>
      )}
    </section>
  )
}