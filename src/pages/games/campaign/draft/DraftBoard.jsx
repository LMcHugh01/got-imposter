// Presentational only — takes a character's full name and returns up to
// two initials for the avatar box (first + last name initial).
function getInitials(name) {
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

export default function DraftBoard({ round, offer, selectedCharacterId, onSelect }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="text-center">
        <p
          className="text-got-parchment/40 text-xs tracking-[0.32em] uppercase"
          style={{ fontFamily: 'Cinzel, serif' }}
        >
          Pick {round} of 10
        </p>
        <div className="gold-divider mt-2" />
      </div>

      <div className="flex items-center gap-3">
        <div className="flex-1 h-px bg-stone-800" />
        <p
          className="text-got-parchment/40 text-[11px] tracking-[0.24em] uppercase whitespace-nowrap"
          style={{ fontFamily: 'Cinzel, serif' }}
        >
          {offer.length} present {offer.length === 1 ? 'itself' : 'themselves'}
        </p>
        <div className="flex-1 h-px bg-stone-800" />
      </div>

      <div className="flex flex-col gap-3">
        {offer.map((character) => {
          const selected = character.id === selectedCharacterId
          return (
            <button
              key={character.id}
              onClick={() => onSelect(selected ? null : character)}
              className={[
                'text-left rounded-lg border p-4 transition-all duration-200 active:scale-[0.98]',
                selected
                  ? 'border-got-gold bg-got-gold/10 shadow-lg shadow-got-gold/10'
                  : 'border-stone-700 bg-stone-900/60 hover:border-got-gold/50 hover:bg-stone-900/80',
              ].join(' ')}
            >
              <div className="flex items-stretch gap-4">
                <div
                  className={[
                    'flex w-12 shrink-0 items-center justify-center rounded border text-sm font-semibold',
                    selected ? 'border-got-gold/60 text-got-gold' : 'border-stone-700 text-stone-500',
                  ].join(' ')}
                  style={{ fontFamily: 'Cinzel, serif' }}
                >
                  {getInitials(character.name)}
                </div>

                <div className="min-w-0 flex-1">
                  <p className="text-got-parchment text-lg font-bold truncate" style={{ fontFamily: 'Cinzel, serif' }}>
                    {character.name}
                  </p>
                  <p className="text-stone-500 text-xs mt-0.5">{character.house ?? 'Unaffiliated'}</p>
                </div>

                <p
                  className="self-center shrink-0 text-[11px] tracking-widest uppercase text-stone-600"
                  style={{ fontFamily: 'Cinzel, serif' }}
                >
                  Sealed
                </p>
              </div>
            </button>
          )
        })}
      </div>

      {selectedCharacterId && (
        <p className="text-got-gold/60 text-sm text-center italic" style={{ fontFamily: 'EB Garamond, serif' }}>
          Choose an open seat in your council to swear them in.
        </p>
      )}
    </div>
  )
}