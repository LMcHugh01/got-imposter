import { Link } from 'react-router-dom'
import { CINZEL, GARAMOND, FOCUS } from './GameHome'

/**
 * components/MenuList.jsx
 *
 * The ruled list used on the Home and Games pages: a centred gold section
 * title, then rows separated by fading gold hairlines.
 */

const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X']

function Rule({ strong = false }) {
  return (
    <div
      className="h-px"
      style={{
        background: `linear-gradient(90deg, transparent, rgba(216,184,120,${strong ? 0.28 : 0.2}), transparent)`,
      }}
    />
  )
}

export function SectionTitle({ children, className = '' }) {
  return (
    <h2
      className={`text-center text-[12px] font-normal uppercase tracking-[0.42em] indent-[0.42em] text-[#d8b878] mb-7 ${className}`}
      style={CINZEL}
    >
      {children}
    </h2>
  )
}

function MenuRow({ marker, title, description, to }) {
  return (
    <Link
      to={to}
      className={`group grid grid-cols-[40px_minmax(0,1fr)_auto] sm:grid-cols-[56px_minmax(0,1fr)_auto] items-center gap-4 sm:gap-5 px-2 py-5 sm:py-6 transition-colors duration-[250ms] hover:bg-[rgba(216,184,120,.05)] ${FOCUS}`}
    >
      <span className="text-[13px] tracking-[0.1em] text-[#8f8676]" style={CINZEL} aria-hidden="true">
        {marker}
      </span>
      <span className="flex flex-col gap-1">
        <span
          className="tracking-[0.14em] text-[#f1e6cc]"
          style={{ ...CINZEL, fontSize: 'clamp(19px, 2.4vw, 23px)' }}
        >
          {title}
        </span>
        <span className="text-[16px] sm:text-[17px] italic text-[#b8ad98]" style={GARAMOND}>
          {description}
        </span>
      </span>
      <span
        className="text-[20px] text-[#d8b878] transition-transform duration-200 group-hover:translate-x-1"
        aria-hidden="true"
      >
        →
      </span>
    </Link>
  )
}

/**
 * items: [{ title, description, to }]
 * marker: 'roman' numbers the rows I, II, III…; any other string is used as-is.
 */
export function MenuList({ items, marker = 'roman' }) {
  return (
    <nav>
      <Rule strong />
      {items.map((item, i) => (
        <div key={item.title}>
          <MenuRow {...item} marker={marker === 'roman' ? ROMAN[i] : marker} />
          <Rule strong={i === items.length - 1} />
        </div>
      ))}
    </nav>
  )
}

export function ComingSoonList({ items }) {
  if (!items.length) return null
  return (
    <section className="mt-16">
      <div className="flex items-center justify-center gap-[18px]">
        <div className="w-10 h-px bg-[rgba(216,184,120,.25)]" />
        <h3
          className="text-[11px] font-normal uppercase tracking-[0.42em] indent-[0.42em] text-[#8f8676]"
          style={CINZEL}
        >
          Coming Soon
        </h3>
        <div className="w-10 h-px bg-[rgba(216,184,120,.25)]" />
      </div>
      <div className="grid gap-8 mt-9 text-center grid-cols-[repeat(auto-fit,minmax(220px,1fr))]">
        {items.map((item) => (
          <div key={item.title} className="flex flex-col items-center gap-1.5">
            <div className="text-[19px] tracking-[0.14em] text-[#8a8171]" style={CINZEL}>
              {item.title}
            </div>
            <div className="text-[16px] italic text-[#7d7466]" style={GARAMOND}>
              {item.description}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}