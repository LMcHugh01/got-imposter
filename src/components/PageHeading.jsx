import { CINZEL, GARAMOND } from './GameHome'

/**
 * components/PageHeading.jsx
 *
 * The compact heading from the Characters and Houses pages, for lobby and
 * archive pages (Home, Games, Characters, Houses). Big enough to anchor
 * the page, small enough that the content starts on the first screen of a
 * phone. Game front doors keep their large GameHero instead.
 *
 *   ornament  — optional small decoration above everything
 *   eyebrow   — tiny tracked label above the title
 *   title     — the page name, framed by fading hairlines
 *   subtitle  — optional single italic line
 *
 * Outer spacing is left to the page via className.
 */
export default function PageHeading({ ornament, eyebrow, title, subtitle, className = '' }) {
  return (
    <header className={`w-full text-center ${className}`}>
      {ornament && (
        <div className="flex justify-center mb-5" aria-hidden="true">
          {ornament}
        </div>
      )}

      {eyebrow && (
        <p className="text-[10px] sm:text-[11px] uppercase tracking-[0.38em] text-realm-muted" style={CINZEL}>
          {eyebrow}
        </p>
      )}

      <div className="flex items-center justify-center gap-2.5 sm:gap-3.5 mt-3">
        <div
          className="flex-1 max-w-[80px] sm:max-w-[140px] h-px"
          style={{ background: 'linear-gradient(90deg, transparent, #4a3f28)' }}
        />
        <h1
          className="m-0 font-bold leading-[1.15] tracking-[0.06em] text-realm-cream"
          style={{ ...CINZEL, fontSize: 'clamp(22px, 6vw, 29px)' }}
        >
          {title}
        </h1>
        <div
          className="flex-1 max-w-[80px] sm:max-w-[140px] h-px"
          style={{ background: 'linear-gradient(270deg, transparent, #4a3f28)' }}
        />
      </div>

      {subtitle && (
        <p className="mt-2 text-[16px] italic text-realm-muted text-balance" style={GARAMOND}>
          {subtitle}
        </p>
      )}
    </header>
  )
}
