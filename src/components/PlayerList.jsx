/**
 * PlayerList — reusable list of active players for voting.
 *
 * Props:
 *  - players: array of player objects
 *  - selected: currently selected player id (or null)
 *  - onSelect: (id) => void
 *  - showEliminated: boolean (default false)
 */
export default function PlayerList({ players, selected, onSelect, showEliminated = false }) {
  const visible = showEliminated ? players : players.filter((p) => !p.isEliminated)

  return (
    <div className="flex flex-col gap-3 w-full">
      {visible.map((player) => {
        const isSelected = selected === player.id
        const isElim = player.isEliminated

        return (
          <button
            key={player.id}
            onClick={() => !isElim && onSelect(player.id)}
            disabled={isElim}
            className={[
              'relative w-full py-4 px-6 rounded border text-left transition-all duration-200',
              'font-cinzel text-lg tracking-wide',
              isElim
                ? 'border-stone-700 bg-stone-900/40 text-stone-600 line-through cursor-not-allowed'
                : isSelected
                ? 'border-got-gold bg-got-gold/10 text-got-gold shadow-lg shadow-got-gold/20'
                : 'border-stone-700 bg-stone-900/60 text-got-parchment hover:border-got-gold/50 hover:text-got-gold active:scale-[0.98]',
            ].join(' ')}
            style={{ fontFamily: 'Cinzel, serif' }}
          >
            <span className="flex items-center gap-3">
              {isSelected && !isElim && (
                <span className="text-got-gold text-xl leading-none">⚔</span>
              )}
              <span>Player {player.id}</span>
              {isElim && <span className="ml-auto text-sm text-stone-600 font-normal">Eliminated</span>}
            </span>

            {isSelected && !isElim && (
              <span
                className="absolute inset-0 rounded border border-got-gold/30 pointer-events-none"
                style={{
                  boxShadow: 'inset 0 0 20px rgba(201,168,76,0.08)',
                }}
              />
            )}
          </button>
        )
      })}
    </div>
  )
}
