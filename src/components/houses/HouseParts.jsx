import { useState } from 'react'
import { splitHouseName } from '../../lib/houseRules'

/**
 * components/houses/HouseParts.jsx
 *
 * The look shared by the Houses page and each house's own page: fonts and
 * colours, the house banner, a house's words, the council panel and the
 * section heading.
 */

export const CINZEL = { fontFamily: "'Cinzel', serif" }
export const GARAMOND = { fontFamily: "'EB Garamond', Georgia, serif" }
export const FOCUS = 'focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-[#d8b878]'
export const INK = { cream: '#f1e6cc', gold: '#d8b878', muted: '#8f8676', words: '#c9b27a', noWords: '#8a5a4e' }

// A hanging banner with a pointed foot (the same shape as the home page's
// Explore banners), in the house's colour, its sigil on it, edged in gold.
export const BANNER_CLIP = 'polygon(0 0, 100% 0, 100% 84%, 50% 100%, 0 84%)'

export function HouseBanner({ house, width }) {
  const height = Math.round(width * 1.3)
  const tint = house.tinctFrom ?? '#3a342a'
  const initial = (splitHouseName(house.name).name ?? '?')[0]
  return (
    <div className="relative shrink-0" style={{ width, height, clipPath: BANNER_CLIP, background: 'rgba(216,184,120,.6)' }} aria-hidden="true">
      <div
        className="absolute flex items-center justify-center"
        style={{
          inset: width > 30 ? 1.5 : 1,
          clipPath: BANNER_CLIP,
          background: `linear-gradient(160deg, ${tint}, ${tint}bb 55%, #0c0b0a)`,
          paddingBottom: height * 0.14,
        }}
      >
        {house.imageUrl ? (
          <img src={house.imageUrl} alt="" className="object-contain" style={{ width: '84%', height: '74%' }} />
        ) : width >= 20 ? (
          <span style={{ ...CINZEL, fontSize: width * 0.42, color: INK.cream }}>{initial}</span>
        ) : null /* too small for a letter: just the house's colour */}
      </div>
    </div>
  )
}

export function Words({ house, faded, className = '' }) {
  return (
    <div className={`italic ${className}`} style={{ ...GARAMOND, color: house.words ? (faded ? INK.muted : INK.words) : INK.noWords }}>
      {house.words ? `\u201c${house.words}\u201d` : 'No recorded words'}
    </div>
  )
}

// Beside a house's card by default (with a dividing line); `standalone` on
// a house's own page, in its own frame.
export function CouncilPanel({ council, seats, standalone = false }) {
  // Below md the council folds away behind its heading, closed at first;
  // from md up it's always open and the heading is just a heading.
  const [open, setOpen] = useState(false)
  if (!seats || seats.length === 0) return null
  // The multi-member seat (Kingsguard) gets its own row below the grid.
  const listSeat = council.listRole ? seats.find((s) => s.role === council.listRole) : null
  const otherSeats = seats.filter((s) => s.role !== council.listRole)
  const total = seats.reduce((sum, s) => sum + s.members.length, 0)

  return (
    <div
      className={`flex flex-col gap-3.5 px-[22px] py-[18px] ${
        standalone ? '' : 'border-t border-[rgba(216,184,120,.12)] min-[860px]:border-t-0 min-[860px]:border-l'
      }`}
      style={standalone ? undefined : { flex: '3 1 520px' }}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className={`flex items-center justify-between gap-3 text-left cursor-pointer md:cursor-default ${FOCUS}`}
      >
        <span className="uppercase" style={{ ...CINZEL, fontSize: 10, letterSpacing: '.34em', color: INK.gold }}>
          {council.title}
        </span>
        <span className="flex items-center gap-3 shrink-0">
          <span className="whitespace-nowrap" style={{ ...CINZEL, fontSize: 10, letterSpacing: '.2em', color: INK.muted }}>
            {total} {council.countWord}
          </span>
          <svg width="10" height="6" viewBox="0 0 10 6" aria-hidden="true" className={`md:hidden transition-transform ${open ? 'rotate-180' : ''}`}>
            <path d="M.5.5 5 5 9.5.5" fill="none" stroke={INK.gold} />
          </svg>
        </span>
      </button>
      <div className={`${open ? 'grid' : 'hidden'} md:grid gap-x-5 gap-y-3`} style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))' }}>
        {otherSeats.map(({ role, members }) => {
          const known = members.length > 0
          return (
            <div key={role} className="flex flex-col gap-[3px] min-w-0">
              <div className="flex items-center gap-[7px] uppercase" style={{ ...CINZEL, fontSize: 9, letterSpacing: '.2em', color: INK.muted }}>
                <span className="shrink-0 w-[5px] h-[5px] rotate-45 border" style={{ borderColor: INK.gold, background: known ? INK.gold : 'transparent' }} />
                <span>{council.labels[role] ?? role}</span>
              </div>
              <span className={`pl-3 text-[16px] ${known ? '' : 'italic'}`} style={{ ...GARAMOND, color: known ? '#ece5d6' : '#7d7566' }}>
                {known ? members.map((m) => m.characterName).join(', ') : 'Unknown'}
              </span>
            </div>
          )
        })}
      </div>
      {council.listRole && (
        <div className={`${open ? 'flex' : 'hidden'} md:flex flex-wrap items-center gap-x-4 gap-y-1.5 pt-3 border-t border-[rgba(216,184,120,.1)]`}>
          <span className="uppercase" style={{ ...CINZEL, fontSize: 9, letterSpacing: '.26em', color: INK.muted }}>
            {council.labels[council.listRole]}
          </span>
          {listSeat && listSeat.members.length > 0 ? (
            listSeat.members.map((m, i) => (
              <span key={m.characterName} className="flex items-center gap-[5px] text-[15px]" style={{ ...GARAMOND, color: '#d3c8b2' }}>
                {i === 0 && (
                  <span className="text-[12px]" style={{ color: INK.gold }} title={council.listLeader}>
                    ★
                  </span>
                )}
                {m.characterName}
              </span>
            ))
          ) : (
            <span className="text-[15px] italic" style={{ ...GARAMOND, color: '#7d7566' }}>
              Unknown
            </span>
          )}
        </div>
      )}
    </div>
  )
}

export function SectionHeading({ label, note, count }) {
  return (
    <div className="flex items-center gap-4 mb-3">
      <span className="uppercase whitespace-nowrap" style={{ ...CINZEL, fontSize: 11, letterSpacing: '.34em', color: INK.gold }}>
        {label}
      </span>
      {note && (
        <span className="italic whitespace-nowrap text-[15px]" style={{ ...GARAMOND, color: INK.muted }}>
          {note}
        </span>
      )}
      <div className="flex-1 h-px" style={{ background: 'linear-gradient(90deg, rgba(216,184,120,.3), rgba(216,184,120,.04))' }} />
      <span style={{ ...CINZEL, fontSize: 11, color: INK.muted }}>{count}</span>
    </div>
  )
}