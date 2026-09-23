import { useId, useMemo, useState } from 'react'
import { SectionLabel, CINZEL, GARAMOND } from '../../../components/GameHome'

/**
 * Type-ahead for naming a suspect. Matches on name or house, hides anyone
 * already guessed. Arrow keys move through the list, Enter guesses, Escape
 * clears.
 */
export default function SuspectSearch({ roster, excludeIds, onGuess }) {
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const listId = useId()

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return []
    return roster
      .filter((s) => !excludeIds.includes(s.id))
      .filter((s) => s.name.toLowerCase().includes(q) || s.house.toLowerCase().includes(q))
      .sort((a, b) => Number(!a.name.toLowerCase().startsWith(q)) - Number(!b.name.toLowerCase().startsWith(q)))
      .slice(0, 8)
  }, [query, roster, excludeIds])

  const choose = (suspect) => {
    onGuess(suspect.id)
    setQuery('')
    setActive(0)
  }

  const onKeyDown = (e) => {
    if (e.key === 'ArrowDown' && matches.length) {
      e.preventDefault()
      setActive((i) => (i + 1) % matches.length)
    } else if (e.key === 'ArrowUp' && matches.length) {
      e.preventDefault()
      setActive((i) => (i - 1 + matches.length) % matches.length)
    } else if (e.key === 'Enter' && matches[active]) {
      e.preventDefault()
      choose(matches[active])
    } else if (e.key === 'Escape') {
      setQuery('')
    }
  }

  const open = matches.length > 0

  return (
    <section className="relative w-full max-w-[520px] mx-auto mt-12">
      <label htmlFor={`${listId}-input`} className="block text-center">
        <SectionLabel className="text-[10px] tracking-[0.34em]">Name a Suspect</SectionLabel>
      </label>
      <input
        id={`${listId}-input`}
        value={query}
        onChange={(e) => {
          setQuery(e.target.value)
          setActive(0)
        }}
        onKeyDown={onKeyDown}
        placeholder="Eddard Stark"
        autoComplete="off"
        autoFocus
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-activedescendant={open ? `${listId}-${active}` : undefined}
        className="block w-full mt-2.5 bg-transparent border-0 border-b border-realm-gold/35 focus:border-realm-gold outline-none pt-2.5 pb-3.5 text-center text-[22px] sm:text-[24px] tracking-[0.1em] text-realm-cream caret-realm-gold placeholder:text-[#5f584d] transition-colors"
        style={CINZEL}
      />

      {open && (
        <ul
          id={listId}
          role="listbox"
          className="absolute left-0 right-0 top-full z-20 max-h-[300px] overflow-y-auto bg-realm-panel shadow-[0_30px_50px_-20px_rgba(0,0,0,.8)]"
        >
          {matches.map((s, i) => (
            <li
              key={s.id}
              id={`${listId}-${i}`}
              role="option"
              aria-selected={i === active}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => choose(s)}
              onMouseEnter={() => setActive(i)}
              className={[
                'flex items-baseline justify-between gap-3.5 min-h-[52px] px-[18px] py-3.5 cursor-pointer',
                'border-b border-realm-gold/10 transition-colors',
                i === active ? 'bg-realm-gold/10' : '',
              ].join(' ')}
            >
              <span className="text-[15px] tracking-[0.06em] text-realm-cream" style={CINZEL}>
                {s.name}
              </span>
              <span className="text-[16px] italic text-realm-muted text-right truncate" style={GARAMOND}>
                {s.house}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
