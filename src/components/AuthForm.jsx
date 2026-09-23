import { useId, useState } from 'react'
import { Link } from 'react-router-dom'
import PageWrapper from './PageWrapper'
import { GameBackdrop, DiamondChoice, Diamond, CINZEL, GARAMOND, FOCUS } from './GameHome'
import { ACCOUNT_HOUSES, HOUSE_BY_ID } from '../data/accountHouses'

/**
 * components/AuthForm.jsx
 *
 * Shared pieces for Sign Up, Log In and the other account screens, from
 * the Account design: a narrow centred column, underlined fields, the
 * house picker, and quiet text links.
 */

export function AuthPage({ children }) {
  return (
    <PageWrapper className="relative overflow-hidden justify-start text-realm-ink">
      <GameBackdrop center="260px" />
      <main className="relative z-10 w-full max-w-[440px] mx-auto flex flex-col items-center text-center pt-6 pb-16 animate-[riseIn_.35s_ease_both]">
        {children}
      </main>
    </PageWrapper>
  )
}

export function AuthHeading({ ornament, eyebrow, title, children }) {
  return (
    <>
      {ornament && (
        <div className="flex items-center justify-center min-h-[20px] mb-8" aria-hidden="true">
          {ornament}
        </div>
      )}
      <div className="text-[11px] uppercase tracking-[0.5em] indent-[0.5em] text-realm-muted" style={CINZEL}>
        {eyebrow}
      </div>
      <h1
        className="mt-4 font-normal leading-[1.1] tracking-[0.14em] indent-[0.14em] text-realm-cream text-balance"
        style={{ ...CINZEL, fontSize: 'clamp(32px, 6vw, 46px)' }}
      >
        {title}
      </h1>
      {children && (
        <p className="mt-5 max-w-[34ch] text-[19px] leading-normal italic text-realm-body text-balance" style={GARAMOND}>
          {children}
        </p>
      )}
    </>
  )
}

/** The three-diamond mark used above the auth headings. */
export function AuthMark({ lit = false }) {
  return (
    <div className="flex items-center gap-3">
      <Diamond size={7} fill="rgba(216,184,120,.45)" />
      <Diamond size={12} fill={lit ? '#d8b878' : undefined} line="#d8b878" />
      <Diamond size={7} fill="rgba(216,184,120,.45)" />
    </div>
  )
}

/** An underlined field. `aside` sits at the right of the label (a hint or a link). */
export function AuthField({ label, aside, type = 'text', value, onChange, reveal = false, ...inputProps }) {
  const id = useId()
  const [shown, setShown] = useState(false)
  const isPassword = type === 'password'
  return (
    <div className="w-full text-left">
      <div className="flex items-baseline justify-between gap-4">
        <label htmlFor={id} className="text-[10px] uppercase tracking-[0.32em] text-realm-muted" style={CINZEL}>
          {label}
        </label>
        {aside}
      </div>
      <div className="flex items-center border-b border-realm-gold/30 focus-within:border-realm-gold transition-colors">
        <input
          id={id}
          type={isPassword && shown ? 'text' : type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 min-w-0 bg-transparent border-0 outline-none py-3 text-[19px] text-realm-cream caret-realm-gold placeholder:text-[#5f584d]"
          style={GARAMOND}
          {...inputProps}
        />
        {isPassword && reveal && (
          <button
            type="button"
            onClick={() => setShown((s) => !s)}
            className={`shrink-0 pl-3 py-2 text-[10px] uppercase tracking-[0.24em] text-realm-dim hover:text-realm-cream cursor-pointer ${FOCUS}`}
            style={CINZEL}
            aria-pressed={shown}
          >
            {shown ? 'Hide' : 'Show'}
          </button>
        )}
      </div>
    </div>
  )
}

export function Fields({ children }) {
  return <div className="w-full flex flex-col gap-7 mt-10">{children}</div>
}

export function HousePicker({ value, onChange, label = 'Choose Your House' }) {
  return (
    <div className="w-full mt-10">
      <div className="text-[10px] uppercase tracking-[0.32em] text-realm-muted" style={CINZEL}>
        {label}
      </div>
      <div className="grid grid-cols-3 gap-y-2 mt-4" role="radiogroup" aria-label={label}>
        {ACCOUNT_HOUSES.map((h) => (
          <DiamondChoice key={h.id} on={value === h.id} onClick={() => onChange(h.id)}>
            <span className="text-[13px] sm:text-[14px] tracking-[0.16em]">{h.name}</span>
          </DiamondChoice>
        ))}
      </div>
      <div className="mt-3 text-[17px] italic text-realm-note min-h-[1.5em]" style={GARAMOND} aria-live="polite">
        {HOUSE_BY_ID[value]?.words}
      </div>
    </div>
  )
}

export function FormError({ children }) {
  if (!children) return null
  return (
    <p role="alert" className="w-full mt-6 text-[17px] text-realm-rose text-balance" style={GARAMOND}>
      {children}
    </p>
  )
}

export function FormNote({ children }) {
  return (
    <p className="w-full mt-6 text-[17px] italic text-realm-note text-balance" style={GARAMOND}>
      {children}
    </p>
  )
}

/** "Already sworn? Log In" */
export function AltLine({ prompt, to, onClick, children }) {
  const cls = `px-1 py-2 text-[11px] uppercase tracking-[0.3em] text-realm-gold hover:text-realm-cream transition-colors cursor-pointer ${FOCUS}`
  return (
    <div className="flex items-center justify-center gap-3 mt-6">
      <span className="text-[17px] italic text-realm-muted" style={GARAMOND}>
        {prompt}
      </span>
      {to ? (
        <Link to={to} className={cls} style={CINZEL}>
          {children}
        </Link>
      ) : (
        <button type="button" onClick={onClick} className={cls} style={CINZEL}>
          {children}
        </button>
      )}
    </div>
  )
}

export const smallLinkClass = `text-[10px] uppercase tracking-[0.24em] text-realm-dim hover:text-realm-cream transition-colors ${FOCUS}`
