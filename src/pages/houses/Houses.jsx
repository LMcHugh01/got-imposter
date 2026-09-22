import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import PageWrapper from '../../components/PageWrapper'
import { fetchAllHouses, fetchAllHouseEras, fetchAllSmallCouncil } from '../../lib/houseService'

// Starts with two points; nothing below assumes exactly two, so a third
// (say, 300 AC) is just another entry here plus matching house_eras rows —
// no component changes needed. title/caption are page-level flavor text
// describing the era itself, not any one house, so they live here rather
// than in the DB.
const TIMELINE_POINTS = [
  {
    year: 282,
    label: '282 AC',
    title: "The Mad King's Reign",
    caption: 'Aerys II Targaryen holds the Iron Throne, paranoid and cruel — while the men who will end his reign grow closer by the day.',
    // No `season` — this era predates the show entirely, so there's
    // nothing to credit it to.
  },
  {
    year: 298,
    label: '298 AC',
    season: 'Game of Thrones: Season 1',
    title: 'The Realm of Robert I',
    caption: 'Seven kingdoms, one crown, and every great house still seated in its ancestral castle.',
  },
  {
    year: 305,
    label: '305 AC',
    season: 'Game of Thrones: Season 8',
    title: 'After the Long Night',
    caption: 'The North breaks free, a council answers for six kingdoms, and two great houses are ash.',
  },
]

// Display/tab order for kingdoms — fixed here rather than derived
// alphabetically or from data order, so tabs don't reshuffle as more
// houses (and possibly more kingdoms) get added later.
const KINGDOM_ORDER = ['Seven Kingdoms', 'Six Kingdoms', 'Kingdom of the North']

// Down to two columns driving all of this now: `status` (three fixed
// values — active, royalty, extinct — plus, for anything fallen-but-alive,
// free text like 'Exiled'/'Restored'/'Diminished' that IS the display
// text, not a separate label) and `tier` (great/vassal, structural, never
// changes per era). Wardens aren't a status at all — that section is
// derived from commanderTitles, which already has the data.
//
// getSectionKey is the single source of truth for "which of the six grid
// sections does this house belong in this era" — used both for the page's
// bucketing and for each card's own styling, so the two can't drift apart.
// royalty/extinct/diminished span both tiers (a diminished vassal sits with
// diminished Great Houses, not off in its own Vassals corner); only
// 'active' status splits further by tier into Wardens/Great Houses/Vassals.
function getSectionKey(house) {
  if (house.status === 'royalty') return 'royalty'
  if (house.status === 'extinct') return 'extinct'
  if (house.status !== 'active') return 'diminished'
  if (house.tier === 'vassal') return 'vassal'
  const hasWarden = house.commanderTitles?.some((key) => key.startsWith('warden_of_'))
  return hasWarden ? 'wardens' : 'active'
}

// The chip text a card shows — derived, not stored. Diminished houses are
// the one case where the actual DB value (status) is shown verbatim,
// since that's exactly where the free text carries real information
// ('Exiled' vs 'Restored' vs plain 'Diminished').
function getBadgeText(house, sectionKey) {
  if (sectionKey === 'royalty') return 'Royalty'
  if (sectionKey === 'extinct') return 'Extinct'
  if (sectionKey === 'diminished') return house.status
  if (sectionKey === 'vassal') return 'Vassal'
  if (sectionKey === 'wardens') {
    const key = house.commanderTitles.find((k) => k.startsWith('warden_of_'))
    return TITLE_META[key]?.label ?? 'Warden'
  }
  return 'Great House' // sectionKey === 'active'
}

// Styling per section — muting only applies to diminished/extinct; royalty
// gets its gold tint (applied via `body` in HouseCard/HouseModal); every
// other section (wardens/active/vassal) renders as an ordinary card.
const SECTION_STYLE = {
  royalty: {
    card: 'border-stone-800 hover:border-got-gold/40',
    image: '',
    body: 'bg-gradient-to-b from-got-gold/10 via-got-gold/5 to-transparent',
  },
  // Purple regardless of which flavor of diminished this is — the chip
  // text (Exiled/Restored/Diminished) is what still distinguishes them.
  diminished: { card: 'border-purple-900/60 opacity-90', image: '' },
  extinct: { card: 'border-stone-800 opacity-45 grayscale', image: 'grayscale' },
}
const FALLEN_SECTIONS = new Set(['diminished', 'extinct'])

// Chip color per *displayed* badge text rather than a stored label — falls
// back to a neutral tone for anything not explicitly listed (a new
// diminished-flavor word you start using, say).
const LABEL_TONE = {
  Royalty: 'text-got-gold border-got-gold/50 bg-got-gold/10',
  'Great House': 'text-got-parchment/70 border-stone-700 bg-stone-900/60',
  Vassal: 'text-got-parchment/70 border-stone-700 bg-stone-900/60',
  Restored: 'text-amber-300/90 border-amber-600/50 bg-amber-950/40',
  Diminished: 'text-amber-400/90 border-amber-700/50 bg-amber-950/40',
  Exiled: 'text-purple-300/80 border-purple-700/40 bg-purple-950/30',
  Extinct: 'text-got-red-bright/80 border-got-red-bright/30 bg-black/40',
}
const WARDEN_TONE = 'text-slate-300/85 border-slate-500/40 bg-slate-900/40'
const DEFAULT_TONE = 'text-got-parchment/60 border-stone-700 bg-stone-900/60'

function toneFor(badgeText) {
  if (badgeText?.startsWith('Warden of')) return WARDEN_TONE
  return LABEL_TONE[badgeText] ?? DEFAULT_TONE
}

// Grid order within a section: Protector/King-in-the-North first, then the
// four Wardens in compass order. Sections themselves already separate
// Wardens from ordinary Great Houses, so this only matters for ordering
// inside Royalty (usually just one house anyway) and inside Wardens.
const TITLE_RANK = {
  protector_of_the_realm: 0,
  king_in_the_north: 0,
  queen_in_the_north: 0,
  warden_of_the_north: 1,
  warden_of_the_east: 2,
  warden_of_the_south: 3,
  warden_of_the_west: 4,
}

function housePriority(house) {
  if (house.commanderTitles && house.commanderTitles.length > 0) {
    const ranks = house.commanderTitles.map((key) => TITLE_RANK[key] ?? 5)
    return Math.min(...ranks)
  }
  return 5
}

// Shared shield-blob border radius trick — used at small size on cards and
// large size in the modal.
const SHIELD_RADIUS = '6px 6px 46% 46% / 6px 6px 62% 62%'

// Crenellated-banner badge shape, shared by every commander title — a
// single path, castle-top silhouette tapering to a pennant point. Icon and
// color swap inside it per title; the shape itself never changes.
const BADGE_SHAPE_PATH =
  'M4,40 L4,12 L8,12 L8,4 L14,4 L14,12 L18,12 L18,4 L24,4 L24,12 L28,12 L28,4 L34,4 L34,12 L36,12 L36,40 L20,56 Z'
const CROWN_ICON_PATH = 'M12,32 L12,23 L16,27 L20,20 L24,27 L28,23 L28,32 Z'
const COMPASS_ICON_PATH = 'M20,17 L22.5,25 L29,27 L22.5,29 L20,37 L17.5,29 L11,27 L17.5,25 Z'

const GOLD = '#c9a75a' // matches got-gold — Protector of the Realm
const SILVER = '#a9b4bd' // uniform steel tone — all four Wardens

const TITLE_META = {
  protector_of_the_realm: { label: 'Protector of the Realm', icon: 'crown', color: GOLD },
  // Two keys rather than one gendered field — whoever enters the data for
  // a given era just picks the one that matches the ruler, same as any
  // other commander title.
  king_in_the_north: { label: 'King in the North', icon: 'crown', color: GOLD },
  queen_in_the_north: { label: 'Queen in the North', icon: 'crown', color: GOLD },
  warden_of_the_north: { label: 'Warden of the North', icon: 'compass', direction: 'N', color: SILVER },
  warden_of_the_south: { label: 'Warden of the South', icon: 'compass', direction: 'S', color: SILVER },
  warden_of_the_east: { label: 'Warden of the East', icon: 'compass', direction: 'E', color: SILVER },
  warden_of_the_west: { label: 'Warden of the West', icon: 'compass', direction: 'W', color: SILVER },
}

function CommanderBadge({ titleKey, size = 26, showLabel = false }) {
  const meta = TITLE_META[titleKey]
  if (!meta) return null
  return (
    <div className="flex flex-col items-center gap-1" title={meta.label}>
      <svg width={size} height={size * 1.4} viewBox="0 0 40 56" style={{ filter: 'drop-shadow(0 2px 3px rgba(0,0,0,0.5))' }}>
        <path d={BADGE_SHAPE_PATH} fill={meta.color} />
        {meta.icon === 'crown' && <path d={CROWN_ICON_PATH} fill="#1a1610" />}
        {meta.icon === 'compass' && (
          <>
            <path d={COMPASS_ICON_PATH} fill="#1a1610" />
            <text x="20" y="46" textAnchor="middle" fontSize="9" fontWeight="700" fill="#1a1610" fontFamily="Cinzel, serif">
              {meta.direction}
            </text>
          </>
        )}
      </svg>
      {showLabel && (
        <span
          className="text-[9px] uppercase tracking-widest text-got-parchment/50 text-center leading-tight"
          style={{ fontFamily: 'Cinzel, serif' }}
        >
          {meta.label}
        </span>
      )}
    </div>
  )
}

// Priority for the headline "who's in charge" stat: a regent or castellan
// (someone actually running things) beats the titled lord, who drops to a
// caption instead of disappearing. An extinct house gets its own wording —
// there's no "ruling lord" left to name. rulerLabel is a plain label swap
// (e.g. a queen regnant, if that ever comes up) rather than a dual-entity
// case, so it doesn't get the "Nominal Lord" caption the regent/castellan
// cases do. royalty status defaults the label to 'King' without needing
// rulerLabel set explicitly — Bran's row happens to set it anyway, which
// is fine, same value either way.
// Splits "House Stark" into a muted "House" label plus "Stark" as the
// actual display name — so the generic word isn't shouting at the same
// size as the surname that actually matters. Entries that don't follow
// that pattern (Bran) just render as-is, no prefix line.
function splitHouseName(fullName) {
  if (!fullName) return { prefix: null, name: fullName }
  const match = fullName.match(/^House\s+(.+)$/)
  if (!match) return { prefix: null, name: fullName }
  return { prefix: 'House', name: match[1] }
}

function computeAuthority(era) {
  if (!era) return { label: 'Ruling Lord', value: null, caption: null }
  const lord = era.currentLord
  if (era.status === 'extinct') {
    return { label: 'Last of the Line', value: lord || era.regent || era.castellan || null, caption: null }
  }
  if (era.regent) return { label: 'Regent', value: era.regent, caption: lord ? `Nominal Lord: ${lord}` : null }
  if (era.castellan) return { label: 'Castellan', value: era.castellan, caption: lord ? `Nominal Lord: ${lord}` : null }
  const defaultLabel = era.status === 'royalty' ? 'King' : 'Ruling Lord'
  return { label: era.rulerLabel || defaultLabel, value: lord, caption: null }
}

function Sigil({ house, size, statusStyle }) {
  return (
    <div
      className={['flex items-center justify-center shrink-0 border border-white/20 bg-black/15 shadow-lg', statusStyle?.image].join(' ')}
      style={{ width: size, height: Math.round(size * 1.16), borderRadius: SHIELD_RADIUS }}
    >
      {house.imageUrl ? (
        <img src={house.imageUrl} alt={house.name} className="w-full h-full object-contain p-1.5" />
      ) : (
        <span style={{ fontSize: size * 0.55 }}>{house.sigil ?? '🏰'}</span>
      )}
    </div>
  )
}

function HouseCard({ house, isSelected, onClick }) {
  const sectionKey = getSectionKey(house)
  const statusStyle = SECTION_STYLE[sectionKey] ?? null
  const badgeText = getBadgeText(house, sectionKey)
  const tone = toneFor(badgeText)
  const authority = computeAuthority(house)
  const seatText = house.seats && house.seats.length > 0 ? house.seats[0] : null
  const gradient = `linear-gradient(150deg, ${house.tinctFrom ?? '#241f14'} 0%, ${house.tinctTo ?? '#0b0a08'} 82%)`
  const { prefix, name } = splitHouseName(house.name)

  return (
    <motion.button
      layout
      onClick={onClick}
      whileHover={{ y: -4 }}
      whileTap={{ scale: 0.98 }}
      className={[
        'relative text-left rounded-lg border overflow-hidden bg-got-charcoal transition-all duration-200',
        isSelected ? 'border-got-gold' : statusStyle ? statusStyle.card : 'border-stone-800 hover:border-got-gold/40',
      ].join(' ')}
    >
      <div className="relative flex items-center justify-center p-6" style={{ background: gradient }}>
        <Sigil house={house} size={60} statusStyle={statusStyle} />
        {house.commanderTitles && house.commanderTitles.length > 0 && (
          <div className="absolute top-2 left-2 flex gap-1">
            {house.commanderTitles.map((key) => (
              <CommanderBadge key={key} titleKey={key} size={16} />
            ))}
          </div>
        )}
        <span
          className={['absolute top-2 right-2 text-[9px] tracking-widest uppercase border rounded px-1.5 py-0.5', tone].join(' ')}
          style={{ fontFamily: 'Cinzel, serif' }}
        >
          {badgeText}
        </span>
      </div>

      <div className={['p-4', statusStyle?.body].filter(Boolean).join(' ')}>
        {prefix && (
          <p className="text-[9px] tracking-[0.25em] uppercase text-got-parchment/35" style={{ fontFamily: 'Cinzel, serif' }}>
            {prefix}
          </p>
        )}
        <h4 className="text-base font-bold text-got-parchment -mt-0.5" style={{ fontFamily: 'Cinzel, serif' }}>
          {name}
        </h4>
        {(house.region || seatText) && (
          <p
            className="hidden lg:block text-[9px] tracking-[0.2em] uppercase text-got-parchment/40 mt-1"
            style={{ fontFamily: 'Cinzel, serif' }}
          >
            {[house.region, seatText].filter(Boolean).join(' · ')}
          </p>
        )}
        <div className="h-px bg-gradient-to-r from-stone-700 to-transparent my-3" />
        {house.words ? (
          <p className="text-sm max-[425px]:text-[10px] italic text-got-gold/70" style={{ fontFamily: 'EB Garamond, serif' }}>
            &ldquo;{house.words}&rdquo;
          </p>
        ) : (
          <p className="text-xs max-[425px]:text-[10px] italic text-got-red-bright/50" style={{ fontFamily: 'EB Garamond, serif' }}>
            No recorded words
          </p>
        )}
      </div>
    </motion.button>
  )
}

function FieldCell({ label, value, caption }) {
  return (
    <div className="border-b border-stone-800/70 pb-4">
      <p className="text-[9px] tracking-[0.22em] uppercase text-got-parchment/40" style={{ fontFamily: 'Cinzel, serif' }}>
        {label}
      </p>
      <p className="text-sm sm:text-base text-got-parchment mt-1.5 leading-snug" style={{ fontFamily: 'EB Garamond, serif' }}>
        {value || '—'}
      </p>
      {caption && (
        <p className="text-xs italic text-got-parchment/40 mt-1" style={{ fontFamily: 'EB Garamond, serif' }}>
          {caption}
        </p>
      )}
    </div>
  )
}

function BranchTabs({ branches, activeIndex, onSelect, tint }) {
  return (
    <div className="flex border-b border-stone-800">
      {branches.map((branch, i) => (
        <button
          key={branch.label}
          onClick={() => onSelect(i)}
          className={[
            'flex-1 min-w-0 truncate px-1 sm:px-3.5 pt-2.5 sm:pt-3 pb-2.5 sm:pb-3',
            'text-[9px] sm:text-[11px] tracking-[0.12em] sm:tracking-[0.22em] uppercase border-b-2 -mb-px transition-colors',
            i === activeIndex ? 'border-got-gold text-got-gold' : 'border-transparent text-got-parchment/45 hover:text-got-parchment/70',
          ].join(' ')}
          style={{
            fontFamily: 'Cinzel, serif',
            background: i === activeIndex ? `linear-gradient(${tint ?? '#241f14'}2e, transparent)` : 'transparent',
          }}
        >
          {branch.label}
        </button>
      ))}
    </div>
  )
}

function MiniTimeline({ points, houseEras, currentYear, tier, onSelect }) {
  return (
    <div className="flex flex-col">
      {points.map((p, i) => {
        const era = houseEras.find((e) => e.year === p.year)
        const authority = computeAuthority(era)
        const isCurrent = p.year === currentYear
        const isLast = i === points.length - 1
        const badgeText = era ? getBadgeText({ ...era, tier }, getSectionKey({ ...era, tier })) : '—'
        return (
          <button key={p.year} onClick={() => onSelect(p.year)} className="flex gap-4 text-left w-full">
            <div className="flex flex-col items-center w-2.5 shrink-0">
              <span
                className={[
                  'w-2.5 h-2.5 shrink-0 rotate-45 border',
                  isCurrent ? 'bg-got-gold border-got-gold' : 'bg-stone-900 border-stone-600',
                ].join(' ')}
              />
              {!isLast && <div className="flex-1 w-px bg-stone-800 mt-1.5" />}
            </div>
            <div className="min-w-0 pb-6">
              <p
                className={['text-[10px] tracking-[0.24em] uppercase', isCurrent ? 'text-got-gold/80' : 'text-got-parchment/40'].join(' ')}
                style={{ fontFamily: 'Cinzel, serif' }}
              >
                {p.label}
              </p>
              <p
                className={['text-sm sm:text-base mt-1', isCurrent ? 'text-got-parchment' : 'text-got-parchment/60'].join(' ')}
                style={{ fontFamily: 'EB Garamond, serif' }}
              >
                {authority.value || '—'}
              </p>
              <p
                className="text-[10px] tracking-[0.2em] uppercase text-got-parchment/35 mt-1"
                style={{ fontFamily: 'Cinzel, serif' }}
              >
                {badgeText}
              </p>
            </div>
          </button>
        )
      })}
    </div>
  )
}

function HouseModal({ house, houseEras, onClose, onYearSelect }) {
  const sectionKey = getSectionKey(house)
  const statusStyle = SECTION_STYLE[sectionKey] ?? null
  const hasBranches = house.branches && house.branches.length > 0
  const [activeBranchIndex, setActiveBranchIndex] = useState(0)

  const activeBranch = hasBranches ? house.branches[activeBranchIndex] : null
  const seat = activeBranch ? activeBranch.seat : house.seats?.join(', ')
  const titles = activeBranch ? activeBranch.titles?.join(', ') : house.titles?.join(', ')
  const heir = activeBranch ? activeBranch.heir : house.heir

  const authority = activeBranch
    ? { label: 'Ruling Lord', value: activeBranch.lord, caption: null }
    : computeAuthority(house)

  const gradient = `linear-gradient(165deg, ${house.tinctFrom ?? '#241f14'} 0%, ${house.tinctTo ?? '#0b0a08'} 85%)`
  const { prefix, name } = splitHouseName(house.name)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/85"
      />
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 24 }}
        transition={{ duration: 0.24, ease: 'easeOut' }}
        className="relative w-full max-w-4xl max-h-[90vh] border border-got-gold/30 bg-stone-900/95 rounded-lg overflow-y-auto md:overflow-hidden flex flex-col md:flex-row"
      >
        {/* Crest panel — horizontal on mobile (sigil left, name/words
            stacked right) to save vertical space; the original centered
            vertical layout only kicks in from md up. */}
        <div
          className="relative flex flex-row items-center text-left gap-4 p-5 md:flex-col md:items-center md:text-center md:gap-0 md:p-8 md:w-72 md:shrink-0"
          style={{ background: gradient }}
        >
          <button
            onClick={onClose}
            className="absolute top-3 right-3 w-9 h-9 rounded-full flex items-center justify-center text-sm border border-white/20 bg-black/40 text-got-parchment/90 hover:border-got-gold/50 hover:text-got-gold transition-colors z-10"
          >
            ✕
          </button>
          <Sigil house={house} size={72} statusStyle={statusStyle} />
          <div className="min-w-0 md:mt-6">
            {prefix && (
              <p
                className="text-[10px] tracking-[0.28em] uppercase"
                style={{ fontFamily: 'Cinzel, serif', color: 'rgba(255,248,232,0.5)' }}
              >
                {prefix}
              </p>
            )}
            <h3
              className="text-lg md:text-xl font-bold uppercase tracking-wide leading-tight -mt-0.5"
              style={{ fontFamily: 'Cinzel, serif', color: '#fbf5e6', textShadow: '0 2px 12px rgba(0,0,0,0.5)' }}
            >
              {name}
            </h3>
            {activeBranch?.seat && (
              <p
                className="text-xs tracking-[0.15em] uppercase mt-0.5"
                style={{ fontFamily: 'Cinzel, serif', color: 'rgba(255,248,232,0.55)' }}
              >
                of {activeBranch.seat}
              </p>
            )}
            <div className="hidden md:block w-10 h-px bg-white/40 my-4 mx-auto" />
            {house.words && (
              <p
                className="text-sm md:text-base italic mt-1 md:mt-0"
                style={{ fontFamily: 'EB Garamond, serif', color: 'rgba(255,248,232,0.8)' }}
              >
                &ldquo;{house.words}&rdquo;
              </p>
            )}
          </div>
        </div>

        {/* Details panel */}
        <div className={['flex-1 min-w-0 md:overflow-y-auto p-4 sm:p-6 md:p-8', statusStyle?.body].filter(Boolean).join(' ')}>
          <div className="flex items-center gap-3">
            <p
              className="text-xs tracking-widest uppercase text-got-parchment/40 whitespace-nowrap"
              style={{ fontFamily: 'Cinzel, serif' }}
            >
              {`${house.year} AC`}{house.eraLabel ? ` · ${house.eraLabel}` : ''}
            </p>
            <div className="flex-1 h-px bg-gradient-to-r from-stone-700 to-transparent" />
            <p
              className="text-xs tracking-widest uppercase text-got-gold/70 whitespace-nowrap"
              style={{ fontFamily: 'Cinzel, serif' }}
            >
              {activeBranch?.region ?? house.region}
            </p>
          </div>

          {hasBranches && (
            <div className="mt-6">
              <BranchTabs
                branches={house.branches}
                activeIndex={activeBranchIndex}
                onSelect={setActiveBranchIndex}
                tint={house.tinctFrom}
              />
            </div>
          )}

          {/* Ruling Lord hero band — full-width highlighted strip rather
              than another grid cell, since this is the single most
              important fact about the house this era. Titles fold in here
              too (as prose under the name) instead of getting their own
              grid cell. */}
          <div
            className="mt-6 py-4 px-4 sm:py-6 sm:px-5 border-y border-stone-800"
            style={{
              background: `radial-gradient(520px 170px at 0% 0%, ${house.tinctFrom ?? '#241f14'}38, transparent 72%), linear-gradient(#0c0a08, #090807)`,
            }}
          >
            <p className="text-[9px] tracking-[0.28em] uppercase text-got-parchment/40" style={{ fontFamily: 'Cinzel, serif' }}>
              {authority.label}
            </p>
            <p
              className="font-bold leading-tight mt-2"
              style={{
                fontFamily: 'Cinzel, serif',
                color: '#f7efdc',
                textShadow: '0 0 30px rgba(201,167,90,0.2)',
                fontSize: 'clamp(22px, 6vw, 32px)',
              }}
            >
              {authority.value || '—'}
            </p>
            {authority.caption && (
              <p className="text-xs sm:text-sm italic text-got-parchment/50 mt-1.5" style={{ fontFamily: 'EB Garamond, serif' }}>
                {authority.caption}
              </p>
            )}
            {titles && (
              <div className="flex items-start gap-2.5 mt-4">
                <span className="w-1.5 h-1.5 mt-1.5 shrink-0 rotate-45 border border-got-gold/60" />
                <p className="text-sm sm:text-base italic text-got-parchment/70 leading-relaxed" style={{ fontFamily: 'EB Garamond, serif' }}>
                  {titles}
                </p>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-5 sm:gap-x-8 gap-y-4 sm:gap-y-5 mt-6">
            <FieldCell label={house.heirLabel || 'Heir'} value={heir} />
            <FieldCell label="Seat" value={seat} />
            <FieldCell label="Sworn To" value={house.overlord} />
            <FieldCell label="Founded" value={house.founded} caption={house.founder ? `by ${house.founder}` : null} />
          </div>

          {house.bannermen && house.bannermen.length > 0 && (
            <div className="mt-6">
              <p className="text-[10px] tracking-[0.24em] uppercase text-got-parchment/40 mb-2" style={{ fontFamily: 'Cinzel, serif' }}>
                Sworn Houses
              </p>
              <div className="flex flex-wrap gap-1.5">
                {house.bannermen.map((name) => (
                  <span
                    key={name}
                    className="text-xs tracking-wide uppercase text-got-parchment/70 border border-stone-700 bg-stone-950 px-2.5 py-1.5"
                    style={{ fontFamily: 'Cinzel, serif' }}
                  >
                    {name}
                  </span>
                ))}
              </div>
            </div>
          )}

          {houseEras && houseEras.length > 1 && (
            <div className="mt-6">
              <p className="text-[10px] tracking-[0.24em] uppercase text-got-parchment/40 mb-3" style={{ fontFamily: 'Cinzel, serif' }}>
                Across the Ages
              </p>
              <MiniTimeline
                points={TIMELINE_POINTS}
                houseEras={houseEras}
                currentYear={house.year}
                tier={house.tier}
                onSelect={onYearSelect}
              />
            </div>
          )}
        </div>
      </motion.div>
    </div>
  )
}

function Timeline({ points, selectedYear, onSelect }) {
  const current = points.find((p) => p.year === selectedYear)
  return (
    <div className="w-full flex flex-col items-center gap-4 sm:gap-6 py-2">
      <div className="flex items-center gap-2 sm:gap-4 w-full max-w-lg">
        {points.map((p, i) => (
          <div key={p.year} className="flex-1 flex flex-col items-center text-center">
            <button onClick={() => onSelect(p.year)} className="flex flex-col items-center gap-1.5 sm:gap-2">
              <span
                className={['text-lg sm:text-2xl font-bold', selectedYear === p.year ? 'text-got-gold' : 'text-stone-600'].join(' ')}
                style={{ fontFamily: 'Cinzel, serif' }}
              >
                {p.label}
              </span>
              <div className="flex items-center gap-1.5 w-full">
                <div
                  className={['flex-1 h-px', i === 0 ? 'bg-gradient-to-r from-transparent to-stone-700' : 'bg-stone-700'].join(' ')}
                />
                <span
                  className={[
                    'w-2.5 h-2.5 sm:w-3.5 sm:h-3.5 shrink-0 rotate-45 border',
                    selectedYear === p.year ? 'bg-got-gold border-got-gold' : 'bg-stone-900 border-stone-600',
                  ].join(' ')}
                />
                <div
                  className={[
                    'flex-1 h-px',
                    i === points.length - 1 ? 'bg-gradient-to-l from-transparent to-stone-700' : 'bg-stone-700',
                  ].join(' ')}
                />
              </div>
            </button>
          </div>
        ))}
      </div>
      {current && (
        <div className="text-center px-2">
          {current.season && (
            <p
              className="text-[9px] sm:text-[10px] tracking-[0.28em] uppercase text-got-parchment/40 mb-1.5"
              style={{ fontFamily: 'Cinzel, serif' }}
            >
              {current.season}
            </p>
          )}
          <p className="text-xs sm:text-sm tracking-[0.2em] uppercase text-got-gold/80" style={{ fontFamily: 'Cinzel, serif' }}>
            {current.title}
          </p>
          <p className="text-sm sm:text-base italic text-got-parchment/50 mt-1.5 max-w-lg" style={{ fontFamily: 'EB Garamond, serif' }}>
            {current.caption}
          </p>
        </div>
      )}
    </div>
  )
}

// One kingdom this era (298, before the split) → a plain label, nothing to
// click. More than one (305, once the North secedes) → tabs, each filtering
// the grid to just that kingdom's houses. Scales to a third kingdom later
// without changing this component, only KINGDOM_ORDER and the data.
function KingdomNav({ kingdoms, current, onSelect }) {
  if (kingdoms.length === 0) return null

  if (kingdoms.length === 1) {
    return (
      <p
        className="text-center text-xs sm:text-sm tracking-[0.3em] uppercase text-got-parchment/50"
        style={{ fontFamily: 'Cinzel, serif' }}
      >
        {kingdoms[0]}
      </p>
    )
  }

  return (
    <div className="flex items-center justify-center gap-2 sm:gap-3">
      {kingdoms.map((k) => (
        <button
          key={k}
          onClick={() => onSelect(k)}
          className={[
            'py-1.5 px-3 sm:py-2 sm:px-5 rounded border text-xs sm:text-sm tracking-widest uppercase transition-colors',
            k === current
              ? 'border-got-gold bg-got-gold/10 text-got-gold'
              : 'border-stone-700 text-got-parchment/50 hover:border-got-gold/30 hover:text-got-parchment/80',
          ].join(' ')}
          style={{ fontFamily: 'Cinzel, serif' }}
        >
          {k}
        </button>
      ))}
    </div>
  )
}

// Fixed display order for council seats — independent of whatever order
// rows happen to be inserted in. A role with no row for the selected year
// (most of them, for 305, since a lot is genuinely unconfirmed) just
// doesn't render rather than showing an empty slot.
// King/Consort dropped — that's the same info the Royalty card already
// shows. Commander/Champion dropped too — never had confident data for
// either across any era. Master of Ships added now that it has a slot.
const ROLE_ORDER = [
  'hand',
  'grand_maester',
  'master_of_coin',
  'master_of_laws',
  'master_of_ships',
  'master_of_whispers',
  'kingsguard',
]
const ROLE_LABEL = {
  hand: 'Hand of the King',
  grand_maester: 'Grand Maester',
  master_of_coin: 'Master of Coin',
  master_of_laws: 'Master of Laws',
  master_of_ships: 'Master of Ships',
  master_of_whispers: 'Master of Whispers',
  kingsguard: 'Kingsguard',
}

function CouncilPanel({ seats, ruler }) {
  if (!seats || seats.length === 0) return null

  // Kingsguard (or any future multi-member role) gets its own row below
  // the grid, matching the mockup — everything else is a single name per
  // seat and fits the 3-column grid fine.
  const kingsguard = seats.find((s) => s.role === 'kingsguard')
  const otherSeats = seats.filter((s) => s.role !== 'kingsguard')
  const totalMembers = seats.reduce((sum, s) => sum + s.members.length, 0)

  // "King Robert I Baratheon's Small Council" when there's a ruler to
  // name, otherwise just the plain label — computeAuthority already
  // handles King vs Queen vs Regent vs whatever else the label ends up
  // being, so this doesn't need its own gender/title logic.
  const headingLabel =
    ruler && ruler.value ? `${ruler.label} ${ruler.value}'s Small Council` : 'Small Council'

  return (
    <div className="col-span-2 sm:col-span-3 rounded-lg border border-stone-800 bg-got-charcoal p-4 sm:p-6">
      <SectionHeading label={headingLabel} count={totalMembers} />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-5 sm:gap-x-8 gap-y-4 sm:gap-y-5">
        {otherSeats.map(({ role, members }) => (
          <div key={role} className="border-b border-stone-800/70 pb-4">
            <div className="flex items-center gap-2">
              <span className={members.length > 0 ? 'text-got-gold text-xs' : 'text-got-gold/30 text-xs'}>
                {members.length > 0 ? '◆' : '◇'}
              </span>
              <span
                className="text-[10px] tracking-[0.22em] uppercase text-got-parchment/40"
                style={{ fontFamily: 'Cinzel, serif' }}
              >
                {ROLE_LABEL[role] ?? role}
              </span>
            </div>
            {members.length > 0 ? (
              <p className="text-sm text-got-parchment mt-1.5 leading-tight" style={{ fontFamily: 'EB Garamond, serif' }}>
                {members.map((m) => m.characterName).join(', ')}
              </p>
            ) : (
              <p className="text-sm italic text-got-parchment/30 mt-1.5" style={{ fontFamily: 'EB Garamond, serif' }}>
                Unknown
              </p>
            )}
          </div>
        ))}
      </div>

      <div className="mt-2 pt-4 flex flex-wrap items-baseline gap-x-6 gap-y-2">
        <span
          className="text-[10px] tracking-[0.22em] uppercase text-got-parchment/40 shrink-0"
          style={{ fontFamily: 'Cinzel, serif' }}
        >
          {ROLE_LABEL.kingsguard}
        </span>
        {kingsguard && kingsguard.members.length > 0 ? (
          kingsguard.members.map((m, i) => (
            <span
              key={m.characterName}
              className="flex items-center gap-1.5 text-sm text-got-parchment border-b border-stone-700 pb-0.5"
              style={{ fontFamily: 'EB Garamond, serif' }}
            >
              {i === 0 && (
                <span className="text-got-gold text-xs" title="Lord Commander">
                  ★
                </span>
              )}
              {m.characterName}
            </span>
          ))
        ) : (
          <span className="text-sm italic text-got-parchment/30" style={{ fontFamily: 'EB Garamond, serif' }}>
            Unknown
          </span>
        )}
      </div>
    </div>
  )
}

// Four tiers, top to bottom. Vassals are deliberately left out for now —
// they need real house rows decided first. Skipping a tier with no
// members this era (e.g. no "Dead" section at 298) is handled where
// SECTIONS is consumed, not here.
const SECTIONS = [
  { key: 'royalty', label: 'Royalty' },
  { key: 'wardens', label: 'Wardens' },
  { key: 'active', label: 'Great Houses' },
  { key: 'diminished', label: 'Diminished' },
  { key: 'vassal', label: 'Vassals' },
  { key: 'extinct', label: 'Dead' },
]

function SectionHeading({ label, count }) {
  return (
    <div className="flex items-center gap-2 sm:gap-3 mb-4">
      <span className="text-xs sm:text-sm tracking-[0.2em] sm:tracking-[0.3em] uppercase text-got-gold/80" style={{ fontFamily: 'Cinzel, serif' }}>
        {label}
      </span>
      <div className="flex-1 h-px bg-gradient-to-r from-stone-700 to-transparent" />
      <span className="text-xs text-stone-600" style={{ fontFamily: 'Cinzel, serif' }}>
        {count}
      </span>
    </div>
  )
}

export default function Houses() {
  const [houses, setHouses] = useState([])
  const [eras, setEras] = useState([])
  const [council, setCouncil] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // 298 is deliberately hardcoded rather than TIMELINE_POINTS[0].year — the
  // show starts there, and that should stay the default no matter where a
  // new era (282, House of the Dragon eras, whatever) lands in the array.
  const [selectedYear, setSelectedYear] = useState(298)
  const [selectedId, setSelectedId] = useState(null)
  const [search, setSearch] = useState('')
  const [regionFilter, setRegionFilter] = useState('all')
  const [standingFilter, setStandingFilter] = useState('all')
  const [kingdomFilter, setKingdomFilter] = useState(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)

    Promise.all([fetchAllHouses(), fetchAllHouseEras(), fetchAllSmallCouncil()])
      .then(([houseData, eraData, councilData]) => {
        if (!cancelled) {
          setHouses(houseData)
          setEras(eraData)
          setCouncil(councilData)
        }
      })
      .catch((err) => {
        if (!cancelled) setError(err.message || 'Failed to load houses.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [])

  // Merge each static house with its era row for the selected year — pure
  // client-side lookup, so switching timeline points needs no refetch. A
  // house with no row for this year (e.g. Bran, who only exists at 305)
  // simply doesn't appear rather than rendering with every field blank.
  const housesAtYear = useMemo(() => {
    return houses
      .map((house) => {
        const era = eras.find((e) => e.houseId === house.id && e.year === selectedYear)
        return era ? { ...house, ...era } : null
      })
      .filter(Boolean)
  }, [houses, eras, selectedYear])

  const regions = useMemo(() => {
    const set = new Set(houses.map((h) => h.region).filter(Boolean))
    return ['all', ...Array.from(set).sort()]
  }, [houses])

  // Which polities exist at this timeline point — one at 298 ("Seven
  // Kingdoms"), two at 305 once the North secedes. Ordered by KINGDOM_ORDER
  // rather than however they happen to appear in the data, so the tab order
  // doesn't jump around as houses are added. kingdomFilter can be stale
  // right after switching eras (holding a kingdom that doesn't exist this
  // year) — effectiveKingdom falls back to the first available one instead
  // of needing an effect to reset state.
  const kingdoms = useMemo(() => {
    const set = new Set(housesAtYear.map((h) => h.kingdom).filter(Boolean))
    return KINGDOM_ORDER.filter((k) => set.has(k))
  }, [housesAtYear])
  const effectiveKingdom = kingdoms.includes(kingdomFilter) ? kingdomFilter : kingdoms[0] ?? null

  const filtered = useMemo(() => {
    return housesAtYear
      .filter((h) => {
        if (effectiveKingdom && h.kingdom !== effectiveKingdom) return false
        if (regionFilter !== 'all' && h.region !== regionFilter) return false
        if (standingFilter === 'power' && FALLEN_SECTIONS.has(getSectionKey(h))) return false
        if (standingFilter === 'fallen' && !FALLEN_SECTIONS.has(getSectionKey(h))) return false
        if (search.trim()) {
          const q = search.trim().toLowerCase()
          const haystack = [h.name, h.region, h.words, h.seats?.join(' ')].filter(Boolean).join(' ').toLowerCase()
          if (!haystack.includes(q)) return false
        }
        return true
      })
      .sort((a, b) => housePriority(a) - housePriority(b) || a.name.localeCompare(b.name))
  }, [housesAtYear, effectiveKingdom, regionFilter, standingFilter, search])

  const kingdomTotal = useMemo(
    () => housesAtYear.filter((h) => h.kingdom === effectiveKingdom).length,
    [housesAtYear, effectiveKingdom]
  )

  // filtered is already priority-sorted (Protector/Wardens first, etc.) —
  // splitting it by status preserves that order within each bucket rather
  // than needing a second sort. Anything with a status outside the known
  // four (shouldn't happen, but data typos happen) falls back to "active"
  // rather than silently vanishing from the grid.
  const sections = useMemo(() => {
    const buckets = { royalty: [], wardens: [], active: [], diminished: [], extinct: [], vassal: [] }
    filtered.forEach((h) => {
      buckets[getSectionKey(h)].push(h)
    })
    return buckets
  }, [filtered])

  // Group this era's council rows by role — most roles have one member,
  // kingsguard can have several, hence grouping rather than one row per
  // role. Roles with no row this year (most of them, at 305) just don't
  // appear, rather than the panel showing an empty slot.
  const councilSeats = useMemo(() => {
    const byRole = new Map()
    council
      .filter((c) => c.year === selectedYear)
      .forEach((c) => {
        if (!byRole.has(c.role)) byRole.set(c.role, [])
        byRole.get(c.role).push(c)
      })
    // Every seat always appears now, even with no data for this era — an
    // empty members array renders as "Unknown" rather than the seat
    // disappearing, so the panel's shape stays consistent across eras.
    return ROLE_ORDER.map((role) => ({
      role,
      members: byRole.get(role) ?? [],
    }))
  }, [council, selectedYear])

  // Static — doesn't change with the selected era or kingdom tab, only
  // search, since that's the one filter that still makes sense without
  // any era data to key off.
  const selected = housesAtYear.find((h) => h.id === selectedId) ?? null
  const selectedEras = selectedId ? eras.filter((e) => e.houseId === selectedId) : []

  const handleCardClick = (house) => {
    setSelectedId((current) => (current === house.id ? null : house.id))
  }

  return (
    <PageWrapper>
      <div className="w-full max-w-6xl flex flex-col gap-8">
        {/* Header */}
        <div className="text-center pt-4">
          <p className="text-[10px] sm:text-[11px] tracking-[0.38em] uppercase text-got-parchment/40" style={{ fontFamily: 'Cinzel, serif' }}>
            Game of Thrones
          </p>
          <div className="flex items-center justify-center gap-2.5 sm:gap-3.5 mt-3">
            <div className="flex-1 max-w-[80px] sm:max-w-[140px] h-px bg-gradient-to-r from-transparent to-stone-700" />
            <h1
              className="font-bold leading-[1.15] tracking-[0.06em] text-got-parchment"
              style={{ fontFamily: 'Cinzel, serif', fontSize: 'clamp(22px, 6vw, 29px)' }}
            >
              Westerosi Houses
            </h1>
            <div className="flex-1 max-w-[80px] sm:max-w-[140px] h-px bg-gradient-to-l from-transparent to-stone-700" />
          </div>
        </div>

        {!loading && !error && (
          <>
            <Timeline points={TIMELINE_POINTS} selectedYear={selectedYear} onSelect={setSelectedYear} />
            <KingdomNav kingdoms={kingdoms} current={effectiveKingdom} onSelect={setKingdomFilter} />
          </>
        )}

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3 border-t border-b border-stone-800/60 py-4 sm:py-5">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search houses, seats, words"
            className="flex-[2_1_240px] min-w-0 py-2.5 px-3 sm:py-3 sm:px-4 rounded border border-stone-700 bg-got-charcoal/40 text-got-parchment text-sm placeholder:text-stone-600 focus:outline-none focus:border-got-gold/50"
            style={{ fontFamily: 'EB Garamond, serif' }}
          />
          <select
            value={regionFilter}
            onChange={(e) => setRegionFilter(e.target.value)}
            className="flex-1 min-w-[140px] py-2.5 px-3 sm:py-3 sm:px-4 rounded border border-stone-700 bg-got-charcoal/40 text-got-parchment text-xs tracking-widest uppercase focus:outline-none focus:border-got-gold/50"
            style={{ fontFamily: 'Cinzel, serif' }}
          >
            {regions.map((r) => (
              <option key={r} value={r}>
                {r === 'all' ? 'All Regions' : r}
              </option>
            ))}
          </select>
          <select
            value={standingFilter}
            onChange={(e) => setStandingFilter(e.target.value)}
            className="flex-1 min-w-[140px] py-2.5 px-3 sm:py-3 sm:px-4 rounded border border-stone-700 bg-got-charcoal/40 text-got-parchment text-xs tracking-widest uppercase focus:outline-none focus:border-got-gold/50"
            style={{ fontFamily: 'Cinzel, serif' }}
          >
            <option value="all">All Standings</option>
            <option value="power">Still in Power</option>
            <option value="fallen">Fallen or Diminished</option>
          </select>
          <span
            className="text-stone-600 text-xs whitespace-nowrap ml-auto"
            style={{ fontFamily: 'Cinzel, serif' }}
          >
            {filtered.length} / {kingdomTotal}
          </span>
        </div>

        {/* Grid */}
        {loading && (
          <p className="text-center text-got-parchment/50 italic py-12" style={{ fontFamily: 'EB Garamond, serif' }}>
            Consulting the maesters...
          </p>
        )}

        {error && (
          <p className="text-center text-got-red-bright py-12" style={{ fontFamily: 'EB Garamond, serif' }}>
            {error}
          </p>
        )}

        {!loading && !error && (
          <div className="flex flex-col gap-10">
            {SECTIONS.map(({ key, label }) => {
              const items = sections[key]
              if (!items || items.length === 0) return null
              return (
                <div key={key}>
                  <SectionHeading label={label} count={items.length} />
                  <motion.div layout className="grid grid-cols-2 sm:grid-cols-4 gap-5">
                    {items.map((house) => (
                      <HouseCard
                        key={house.id}
                        house={house}
                        isSelected={selectedId === house.id}
                        onClick={() => handleCardClick(house)}
                      />
                    ))}
                    {/* Council sits beside Royalty, filling the columns the
                        royalty card(s) don't use — col-span-2/sm:col-span-3
                        assumes one royalty house, which is all the data has
                        today; a second simultaneous royalty house would
                        need this adjusted. Hidden under the North's own
                        tab: this council governs the Six/Seven Kingdoms,
                        not the independent North, which has no tracked
                        council of its own yet. */}
                    {key === 'royalty' && effectiveKingdom !== 'Kingdom of the North' && (
                      <CouncilPanel seats={councilSeats} ruler={computeAuthority(items[0])} />
                    )}
                  </motion.div>
                </div>
              )
            })}
          </div>
        )}

        {!loading && !error && filtered.length === 0 && (
          <p className="text-center text-stone-600 italic py-8" style={{ fontFamily: 'EB Garamond, serif' }}>
            No house in the realm answers to that.
          </p>
        )}
      </div>

      <AnimatePresence>
        {selected && (
          <HouseModal
            key={`${selected.id}-${selectedYear}`}
            house={selected}
            houseEras={selectedEras}
            onClose={() => setSelectedId(null)}
            onYearSelect={setSelectedYear}
          />
        )}
      </AnimatePresence>
    </PageWrapper>
  )
}