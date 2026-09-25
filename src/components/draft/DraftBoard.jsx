import { ArchPortrait, SectionTitle, Diamond, ROMAN, COUNT_WORDS, CINZEL, GARAMOND, GOLD, MUTED } from './draftParts'

/**
 * components/draft/DraftBoard.jsx
 *
 * This round's offer: the characters who present themselves, their worth
 * sealed until the oath. Clicking one chooses them (clicking again lets
 * go); then the player picks their seat in the council. On phones the
 * cards are compact (name and house only) to sit beside the council.
 */
export default function DraftBoard({ round, total, offer, selectedCharacterId, onSelect, tintOf }) {
  const count = COUNT_WORDS[offer.length] ?? offer.length
  return (
    <div>
      <SectionTitle
        className="dr-desk"
        right={<span style={{ ...GARAMOND, fontStyle: 'italic', fontSize: 17, color: MUTED, whiteSpace: 'nowrap' }}>{count} present {offer.length === 1 ? 'itself' : 'themselves'}</span>}
      >
        Pick {ROMAN[round - 1] ?? round} of {ROMAN[total - 1] ?? total}
      </SectionTitle>

      <ul className="dr-list">
        {offer.map((character) => {
          const selected = character.id === selectedCharacterId
          const tint = tintOf(character.house)
          return (
            <li key={character.id}>
              <button
                type="button"
                className="dr-cand"
                aria-pressed={selected}
                aria-label={`${character.name}, ${character.house ?? 'Unaffiliated'}`}
                onClick={() => onSelect(selected ? null : character)}
                style={{ background: `linear-gradient(100deg, ${tint}${selected ? '66' : '40'} 0%, ${tint}12 45%, rgba(255,255,255,.012) 80%)` }}
              >
                <span className="dr-desk" style={{ display: 'block', flex: 'none' }}>
                  <ArchPortrait character={character} tint={tint} width={48} height={60} />
                </span>
                <span style={{ minWidth: 0, flex: 1 }}>
                  <span className="dr-cand-name" style={{ display: 'block' }}>
                    {character.name}
                  </span>
                  <span className="dr-cand-house" style={{ display: 'block' }}>
                    {character.house ?? 'Unaffiliated'}
                  </span>
                </span>
                <span className="dr-desk" style={{ display: 'block', flex: 'none', width: 64, textAlign: 'center' }}>
                  <Diamond size={10} filled={selected} style={{ display: 'block', margin: '0 auto 7px' }} />
                  <span style={{ ...CINZEL, fontSize: 8.5, letterSpacing: '.2em', textTransform: 'uppercase', color: selected ? '#eed49b' : MUTED }}>
                    {selected ? 'Chosen' : 'Sealed'}
                  </span>
                </span>
              </button>
            </li>
          )
        })}
      </ul>

      <p className="dr-desk" style={{ ...GARAMOND, fontStyle: 'italic', fontSize: 17, textAlign: 'center', margin: '16px 0 0', color: selectedCharacterId ? '#e2c37e' : MUTED }}>
        {selectedCharacterId
          ? 'Now choose an open seat in your council to swear them in.'
          : 'Their worth is sealed until the oath. Choose on name and house alone.'}
      </p>
    </div>
  )
}