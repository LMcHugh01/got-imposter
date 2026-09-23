import { Diamond, Hairline, CINZEL, GARAMOND } from '../../../components/GameHome'
import { compareGuess } from '../../../gameEngine/whispers'

/**
 * One guess, measured against the hidden suspect: shared traits along the
 * top, then a tile per standing with the guess's score, an arrow towards
 * the truth, and a gold underline when it's close or exact.
 */
export default function GuessReport({ number, guess, target }) {
  const solved = guess.id === target.id
  const { traits, tiles } = compareGuess(guess, target)

  return (
    <li className="animate-[riseIn_.34s_ease_both]">
      <div className="py-7">
        <div className="flex flex-wrap items-baseline gap-x-[18px] gap-y-2.5">
          <span
            className={`min-w-7 text-[14px] tracking-[0.1em] ${solved ? 'text-realm-gold' : 'text-realm-faint'}`}
            style={CINZEL}
          >
            {String(number).padStart(2, '0')}
          </span>
          <div className="flex-[1_1_200px] min-w-0">
            <div
              className={`text-[20px] sm:text-[22px] leading-tight tracking-[0.08em] ${solved ? 'text-realm-gilt' : 'text-realm-cream'}`}
              style={CINZEL}
            >
              {guess.name}
            </div>
            <div className="text-[16px] italic text-realm-muted mt-0.5" style={GARAMOND}>
              {guess.house}
            </div>
          </div>
          <ul className="flex flex-wrap gap-x-5 gap-y-2" aria-label="Shared traits">
            {traits.map((t) => (
              <li key={t.id} className="flex items-center gap-[9px]">
                <Diamond
                  size={7}
                  fill={t.hit ? '#d8b878' : undefined}
                  line={t.hit ? '#d8b878' : 'rgba(216,184,120,.3)'}
                />
                <span
                  className={`text-[11px] uppercase tracking-[0.16em] whitespace-nowrap ${t.hit ? 'text-realm-gilt' : 'text-realm-faint'}`}
                  style={CINZEL}
                >
                  {t.label}
                  <span className="sr-only">{t.hit ? ': match' : ': no match'}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>

        <ul className="grid grid-cols-6 gap-1 mt-[22px]">
          {tiles.map((t) => (
            <li key={t.id} title={t.label} className="flex flex-col items-center gap-1.5">
              <span className="text-[10px] tracking-[0.2em] text-realm-dim" style={CINZEL} aria-hidden="true">
                {t.code}
              </span>
              <span className="sr-only">
                {t.label}: {t.value ?? 'unknown'}
                {t.exact
                  ? ', exact'
                  : t.direction === 'up'
                    ? ', theirs is higher'
                    : t.direction === 'down'
                      ? ', theirs is lower'
                      : ''}
                {t.near && !t.exact ? ', close' : ''}
              </span>
              <span className="flex items-baseline gap-1" aria-hidden="true">
                <span
                  className={`text-[20px] sm:text-[22px] tabular-nums ${t.exact ? 'text-realm-gilt' : t.near ? 'text-[#e4d3a8]' : 'text-realm-body'}`}
                  style={CINZEL}
                >
                  {t.value ?? '—'}
                </span>
                {t.direction && (
                  <span className={`text-[15px] ${t.near ? 'text-realm-gold' : 'text-realm-faint'}`}>
                    {t.direction === 'up' ? '↑' : '↓'}
                  </span>
                )}
              </span>
              <span
                aria-hidden="true"
                className={`w-[22px] h-px ${t.exact ? 'bg-realm-gold' : t.near ? 'bg-realm-gold/55' : 'bg-transparent'}`}
              />
            </li>
          ))}
        </ul>
      </div>
      <Hairline strength={0.16} />
    </li>
  )
}
