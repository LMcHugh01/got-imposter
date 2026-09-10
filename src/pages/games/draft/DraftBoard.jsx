export default function DraftBoard({ round, offer, selectedCharacterId, onSelect }) {
  return (
    <div className="flex flex-col gap-3">
      <div className="text-center">
        <p
          className="text-got-parchment/40 text-sm tracking-[0.3em] uppercase"
          style={{ fontFamily: 'Cinzel, serif' }}
        >
          Pick {round} of 10
        </p>
        <div className="gold-divider mt-2" />
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
              <p className="text-got-parchment text-lg font-bold" style={{ fontFamily: 'Cinzel, serif' }}>
                {character.name}
              </p>
              <p className="text-stone-500 text-xs mt-0.5">{character.house ?? 'Unaffiliated'}</p>
            </button>
          )
        })}
      </div>

      {selectedCharacterId && (
        <p className="text-got-gold/60 text-sm text-center italic" style={{ fontFamily: 'EB Garamond, serif' }}>
          Tap an open role above to assign them.
        </p>
      )}
    </div>
  )
}