import { forwardRef } from 'react'
import { Link } from 'react-router-dom'
import PageWrapper from './PageWrapper'

/**
 * components/GameHome.jsx
 *
 * Shared pieces for every game's home screen (Imposter, Draft, Campaign)
 * so they stay visually identical. Each game only supplies its ornament,
 * wording and what happens when the player starts.
 */

export const CINZEL = { fontFamily: 'Cinzel, serif' }
export const GARAMOND = { fontFamily: "'EB Garamond', Georgia, serif" }
export const FOCUS =
  'focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-4 focus-visible:outline-[#d8b878]'

/**
 * Two faint rings behind the hero. The glow itself now comes from the app
 * background (index.css), so it's shared by every page. The rings fade out
 * towards the bottom so they never end in a hard line above the footer.
 * `center` is where the rings are centred vertically (default: 34% down).
 * Parent must be `relative overflow-hidden`.
 */
export function GameBackdrop({ center = '34%' }) {
  return (
    <div
      className="absolute inset-0 pointer-events-none"
      style={{
        maskImage: 'linear-gradient(to bottom, black 55%, transparent 100%)',
        WebkitMaskImage: 'linear-gradient(to bottom, black 55%, transparent 100%)',
      }}
    >
      <div
        className="absolute left-1/2 w-[760px] h-[760px] -ml-[380px] -mt-[380px] rounded-full"
        style={{ top: center, border: '1px solid rgba(216,184,120,.07)' }}
      />
      <div
        className="absolute left-1/2 w-[1120px] h-[1120px] -ml-[560px] -mt-[560px] rounded-full"
        style={{ top: center, border: '1px solid rgba(216,184,120,.04)' }}
      />
    </div>
  )
}

/** Full page: backdrop rings, content centred. */
export function GameHomePage({ children }) {
  return (
    <PageWrapper className="relative overflow-hidden justify-center text-[#ece5d6]">
      <GameBackdrop />
      <div className="relative z-10 w-full flex flex-col items-center text-center px-2 py-12 sm:py-16">
        {children}
      </div>
    </PageWrapper>
  )
}

/** Ornament, eyebrow, big title, flanked tagline and italic description. */
export function GameHero({ ornament, eyebrow, title, tagline, description }) {
  return (
    <>
      <div className="flex items-center justify-center min-h-[34px]" aria-hidden="true">
        {ornament}
      </div>

      <div
        className="mt-10 text-[11px] uppercase tracking-[0.5em] indent-[0.5em] text-[#8f8676]"
        style={CINZEL}
      >
        {eyebrow}
      </div>

      <h1
        className="mt-[22px] font-normal leading-none tracking-[0.16em] indent-[0.16em] text-[#f1e6cc]"
        style={{ ...CINZEL, fontSize: 'clamp(48px, 9vw, 104px)' }}
      >
        {title}
      </h1>

      <div className="flex items-center gap-[22px] mt-[26px]">
        <div className="w-10 sm:w-16 h-px" style={{ background: 'linear-gradient(90deg, transparent, rgba(216,184,120,.6))' }} />
        <div className="text-[15px] uppercase tracking-[0.6em] indent-[0.6em] text-[#d8b878]" style={CINZEL}>
          {tagline}
        </div>
        <div className="w-10 sm:w-16 h-px" style={{ background: 'linear-gradient(270deg, transparent, rgba(216,184,120,.6))' }} />
      </div>

      <p
        className="mt-[34px] mx-auto max-w-[30ch] text-[22px] leading-normal italic text-[#b8ad98] text-balance"
        style={GARAMOND}
      >
        {description}
      </p>
    </>
  )
}

/** Solid gold call to action; greys out when disabled. */
export const GamePrimaryButton = forwardRef(function GamePrimaryButton(
  { children, disabled, className = '', ...props },
  ref
) {
  return (
    <button
      ref={ref}
      disabled={disabled}
      className={[
        'flex items-center gap-4 sm:gap-[18px] px-8 sm:px-11 py-5 font-semibold text-[14px] sm:text-[15px] uppercase tracking-[0.26em] sm:tracking-[0.34em] whitespace-nowrap',
        'transition-all duration-200',
        disabled
          ? 'bg-[rgba(216,184,120,.12)] text-[#6f6758] cursor-default'
          : 'bg-[#d8b878] text-[#1f1d1a] cursor-pointer hover:bg-[#e9cc90] hover:-translate-y-px active:translate-y-0',
        FOCUS,
        className,
      ].join(' ')}
      style={CINZEL}
      {...props}
    >
      <span>{children}</span>
      <span className="text-lg tracking-normal" aria-hidden="true">→</span>
    </button>
  )
})

export function GameBackLink({ to = '/games', children = '← Back to Games' }) {
  return (
    <Link
      to={to}
      className={`mt-[30px] text-[11px] uppercase tracking-[0.3em] text-[#8f8676] hover:text-[#d8b878] transition-colors ${FOCUS}`}
      style={CINZEL}
    >
      {children}
    </Link>
  )
}

/** A rotated-square marker. `fill` for solid, `line` for an outline. */
export function Diamond({ size = 9, fill, line, className = '', style }) {
  return (
    <span
      aria-hidden="true"
      className={`block shrink-0 rotate-45 transition-all duration-300 ${className}`}
      style={{
        width: size,
        height: size,
        background: fill ?? 'transparent',
        border: `1px solid ${line ?? fill ?? 'transparent'}`,
        ...style,
      }}
    />
  )
}

/** Horizontal gold hairline that fades out at both ends. */
export function Hairline({ strength = 0.22, className = '' }) {
  return (
    <div
      className={`h-px w-full ${className}`}
      style={{ background: `linear-gradient(90deg, transparent, rgba(216,184,120,${strength}), transparent)` }}
    />
  )
}

/** Small tracked-out caps label above a section or control. */
export function SectionLabel({ children, className = '' }) {
  return (
    <div className={`text-[11px] uppercase tracking-[0.32em] text-realm-muted ${className}`} style={CINZEL}>
      {children}
    </div>
  )
}

/** Row of numbers split by fading vertical rules, e.g. Streak | Best | Solved. */
export function GameStats({ items, className = '' }) {
  return (
    <dl
      className={`flex items-center justify-center w-full mx-auto text-center ${className}`}
      style={{ maxWidth: items.length * 140 }}
    >
      {items.map((item, i) => (
        <div key={item.label} className="contents">
          {i > 0 && (
            <div
              aria-hidden="true"
              className="w-px h-[52px] shrink-0"
              style={{ background: 'linear-gradient(180deg, transparent, rgba(216,184,120,.3), transparent)' }}
            />
          )}
          <div className="flex-1 min-w-0 flex flex-col-reverse">
            <dd className="mt-2 text-[30px] leading-none text-realm-cream tabular-nums" style={CINZEL}>
              {item.value}
            </dd>
            <dt className="text-[10px] uppercase tracking-[0.3em] text-realm-muted" style={CINZEL}>
              {item.label}
            </dt>
          </div>
        </div>
      ))}
    </dl>
  )
}

/**
 * A diamond-and-label option, as used for difficulty, candle length and
 * rounds. `multi` makes it a checkbox; otherwise it's one of a radio set.
 */
export function DiamondChoice({ on, onClick, children, multi = false, disabled = false }) {
  return (
    <button
      type="button"
      role={multi ? 'checkbox' : 'radio'}
      aria-checked={on}
      disabled={disabled}
      onClick={onClick}
      className={[
        'flex flex-col items-center gap-3 px-1 py-2 text-[16px] sm:text-[17px] uppercase tracking-[0.2em] transition-colors duration-200',
        on ? 'text-realm-gold' : 'text-realm-dim enabled:hover:text-realm-cream',
        disabled ? 'cursor-default' : 'cursor-pointer',
        FOCUS,
      ].join(' ')}
      style={CINZEL}
    >
      <Diamond size={7} fill={on ? '#d8b878' : undefined} line={on ? '#d8b878' : 'rgba(216,184,120,.25)'} />
      <span>{children}</span>
    </button>
  )
}

/** A full-width on/off rule with a one-line explanation. */
export function ToggleRow({ on, onClick, label, detail }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={onClick}
      className={`group w-full flex items-center gap-4 py-3.5 text-left border-b border-realm-gold/10 cursor-pointer ${FOCUS}`}
    >
      <Diamond size={8} fill={on ? '#d8b878' : undefined} line={on ? '#d8b878' : 'rgba(216,184,120,.3)'} />
      <span className="flex-1 min-w-0">
        <span
          className={`block text-[19px] leading-tight transition-colors ${
            on ? 'text-realm-cream' : 'text-realm-note group-hover:text-realm-cream'
          }`}
          style={GARAMOND}
        >
          {label}
        </span>
        <span className="block text-[15px] italic text-realm-muted mt-0.5" style={GARAMOND}>
          {detail}
        </span>
      </span>
      <span className={`text-[10px] uppercase tracking-[0.24em] ${on ? 'text-realm-gold' : 'text-realm-faint'}`} style={CINZEL}>
        {on ? 'On' : 'Off'}
      </span>
    </button>
  )
}

/** A house's sigil image, falling back to its emoji. */
export function Sigil({ house, size = 44 }) {
  if (house?.imageUrl) {
    return <img src={house.imageUrl} alt="" className="object-contain shrink-0" style={{ width: size, height: size }} />
  }
  return (
    <span aria-hidden="true" className="shrink-0 flex items-center justify-center" style={{ width: size, height: size, fontSize: size * 0.6 }}>
      {house?.emoji ?? '🏰'}
    </span>
  )
}