import { useEffect, useRef } from 'react'
import { Diamond, GamePrimaryButton, Hairline, CINZEL, GARAMOND, FOCUS } from '../../../components/GameHome'
import { WHISPER_GROUPS, MAX_GUESSES } from '../../../data/whispers'
import { strongestGroup } from '../../../gameEngine/whispers'

/**
 * The reveal sheet shown when a round ends: who it was, their six
 * standings, and the way on to the next name.
 */
export default function WhispersResult({ won, target, guessCount, streak, onNext, onClose }) {
  const nextRef = useRef(null)

  useEffect(() => {
    nextRef.current?.focus()
    const onKey = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const top = strongestGroup(target)

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-[18px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="whispers-result-name"
    >
      <div
        onClick={onClose}
        className="absolute inset-0 bg-[rgba(16,14,12,.86)] backdrop-blur-[4px] animate-[veil_.2s_ease_both]"
      />

      <div
        className="relative w-full max-w-[500px] max-h-[90vh] overflow-y-auto px-6 sm:px-8 pt-11 pb-8 text-center animate-[sheetUp_.28s_ease_both]"
        style={{
          background: 'radial-gradient(500px 260px at 50% 0%, rgba(216,184,120,.12), transparent 70%), #1f1d1a',
          boxShadow: '0 0 0 1px rgba(216,184,120,.14), 0 40px 80px -30px rgba(0,0,0,.9)',
        }}
      >
        <Diamond size={16} fill={won ? '#d8b878' : undefined} line={won ? '#d8b878' : '#c9766a'} className="mx-auto" />
        <div className="mt-[26px] text-[10px] uppercase tracking-[0.4em] text-realm-muted" style={CINZEL}>
          {won ? `Solved in ${guessCount} of ${MAX_GUESSES}` : 'Out of Guesses'}
        </div>
        <h2
          id="whispers-result-name"
          className="mt-3.5 text-[28px] sm:text-[32px] font-normal leading-tight tracking-[0.08em] text-realm-cream"
          style={CINZEL}
        >
          {target.name}
        </h2>
        <div className="mt-1.5 text-[17px] italic text-realm-muted" style={GARAMOND}>
          {target.house}
        </div>
        <p className="mt-[18px] mx-auto max-w-[36ch] text-[18px] leading-normal text-[#c8bda6]" style={GARAMOND}>
          {won
            ? `The birds sang at last${top ? `. Their finest standing is ${top.label.toLowerCase()}` : ''}. Your streak is now ${streak}.`
            : `${MAX_GUESSES} names, none of them theirs. The streak starts again.`}
        </p>

        <Hairline strength={0.3} className="my-7" />

        <div className="text-[10px] uppercase tracking-[0.34em] text-realm-muted mb-3" style={CINZEL}>
          Their Standing
        </div>
        <ul>
          {WHISPER_GROUPS.map((g) => {
            const v = target.groups[g.id]
            const high = v != null && v >= 70
            return (
              <li key={g.id} className="py-2 text-left">
                <div className="flex justify-between items-baseline gap-2.5">
                  <span className="text-[17px] italic text-realm-note" style={GARAMOND}>
                    {g.label}
                  </span>
                  <span
                    className={`text-[17px] tabular-nums ${high ? 'text-realm-gilt' : 'text-realm-body'}`}
                    style={CINZEL}
                  >
                    {v ?? '—'}
                  </span>
                </div>
                <div className="h-px mt-[7px] bg-realm-gold/10">
                  <div
                    className={`h-px ${high ? 'bg-realm-gold' : 'bg-realm-gold/45'}`}
                    style={{ width: `${v ?? 0}%` }}
                  />
                </div>
              </li>
            )
          })}
        </ul>

        <GamePrimaryButton ref={nextRef} type="button" onClick={onNext} className="mt-8 w-full justify-center">
          Next Name
        </GamePrimaryButton>
        <div className="flex justify-center gap-8 mt-3.5">
          <button
            type="button"
            onClick={onClose}
            className={`px-1 py-3 text-[11px] uppercase tracking-[0.3em] text-realm-muted hover:text-realm-cream transition-colors cursor-pointer ${FOCUS}`}
            style={CINZEL}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}