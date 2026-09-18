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
    year: 298,
    label: '298 AC',
    sublabel: 'Season 1',
    title: 'The Realm of Robert I',
    caption: 'Seven kingdoms held under one crown, and every great house still seated in its castle.',
  },
  {
    year: 305,
    label: '305 AC',
    sublabel: 'Season 8',
    title: 'After the Long Night',
    caption: 'Six kingdoms answer a council, the North goes free, and two great houses are ash.',
  },
]

// Display/tab order for kingdoms — fixed here rather than derived
// alphabetically or from data order, so tabs don't reshuffle as more
// houses (and possibly more kingdoms) get added later.
const KINGDOM_ORDER = ['Seven Kingdoms', 'Six Kingdoms', 'Kingdom of the North']

// diminished: battered but standing — full color, just a slightly tarnished
// border, no grayscale. extinct: actually gone — heavy grayscale and low
// opacity. Structural (drives muting), independent of the flavor-text
// statusLabel below.
const STATUS_STYLE = {
  // No border override — same as an ordinary card. Royalty reads instead
  // through a gold tint on the details section beneath the crest (applied
  // via `body` in HouseCard/HouseModal), which turned out to read as more
  // deliberate than an all-around border.
  royalty: {
    card: 'border-stone-800 hover:border-got-gold/40',
    image: '',
    body: 'bg-gradient-to-b from-got-gold/10 via-got-gold/5 to-transparent',
  },
  // Purple to match the Exiled chip's tone — Targaryen (both eras) and any
  // other "diminished" house share this border regardless of which
  // flavor-text statusLabel it's paired with; only that label's own chip
  // color (below) still distinguishes "Exiled" from "Diminished" from
  // "Restored" at the text level.
  diminished: { card: 'border-purple-900/60 opacity-90', image: '' },
  extinct: { card: 'border-stone-800 opacity-45 grayscale', image: 'grayscale' },
}

// Chip color per flavor-text statusLabel (the richer vocabulary — "Sovereign",
// "Royal House", "Restored", "Exiled", etc.) rather than the 3-value
// structural enum. Falls back to a neutral tone for any label not listed.
const LABEL_TONE = {
  Sovereign: 'text-got-gold border-got-gold/50 bg-got-gold/10',
  'Royalty': 'text-got-gold border-got-gold/50 bg-got-gold/10',
  'Great House': 'text-got-parchment/70 border-stone-700 bg-stone-900/60',
  Restored: 'text-amber-300/90 border-amber-600/50 bg-amber-950/40',
  Diminished: 'text-amber-400/90 border-amber-700/50 bg-amber-950/40',
  Exiled: 'text-purple-300/80 border-purple-700/40 bg-purple-950/30',
  Extinct: 'text-got-red-bright/80 border-got-red-bright/30 bg-black/40',
}
const DEFAULT_TONE = 'text-got-parchment/60 border-stone-700 bg-stone-900/60'

// Grid order: Protector of the Realm first, then the four Wardens in
// compass order (N/E/S/W), then ordinary Great Houses, then Exiled, then
// Extinct last. Recomputed per era since who holds which office — and who's
// fallen — changes between timeline points.
const TITLE_RANK = {
  protector_of_the_realm: 0,
  king_in_the_north: 0,
  queen_in_the_north: 0,
  warden_of_the_north: 1,
  warden_of_the_east: 2,
  warden_of_the_south: 3,
  warden_of_the_west: 4,
}
const LABEL_RANK = {
  Sovereign: 5,
  'Royalty': 5,
  'Great House': 5,
  Restored: 5,
  Diminished: 5,
  Exiled: 6,
  Extinct: 7,
}

function housePriority(house) {
  if (house.commanderTitles && house.commanderTitles.length > 0) {
    const ranks = house.commanderTitles.map((key) => TITLE_RANK[key] ?? 5)
    return Math.min(...ranks)
  }
  return LABEL_RANK[house.statusLabel] ?? 5
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
  const statusStyle = house.status && house.status !== 'active' ? STATUS_STYLE[house.status] : null
  const tone = LABEL_TONE[house.statusLabel] ?? DEFAULT_TONE
  const authority = computeAuthority(house)
  const seatText = house.seats && house.seats.length > 0 ? house.seats[0] : null
  const gradient = `linear-gradient(150deg, ${house.tinctFrom ?? '#241f14'} 0%, ${house.tinctTo ?? '#0b0a08'} 82%)`

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
        {house.statusLabel && (
          <span
            className={['absolute top-2 right-2 text-[9px] tracking-widest uppercase border rounded px-1.5 py-0.5', tone].join(' ')}
            style={{ fontFamily: 'Cinzel, serif' }}
          >
            {house.statusLabel}
          </span>
        )}
      </div>

      <div className={['p-4', statusStyle?.body].filter(Boolean).join(' ')}>
        <h4 className="text-base font-bold text-got-parchment" style={{ fontFamily: 'Cinzel, serif' }}>
          {house.name}
        </h4>
        {(house.region || seatText) && (
          <p
            className="text-[10px] tracking-[0.2em] uppercase text-got-parchment/40 mt-1"
            style={{ fontFamily: 'Cinzel, serif' }}
          >
            {[house.region, seatText].filter(Boolean).join(' · ')}
          </p>
        )}
        <div className="h-px bg-gradient-to-r from-stone-700 to-transparent my-3" />
        {house.words ? (
          <p className="text-sm italic text-got-gold/70" style={{ fontFamily: 'EB Garamond, serif' }}>
            &ldquo;{house.words}&rdquo;
          </p>
        ) : (
          <p className="text-xs italic text-got-red-bright/50" style={{ fontFamily: 'EB Garamond, serif' }}>
            No recorded words
          </p>
        )}
        <div className="flex items-end justify-between gap-3 mt-4">
          <div className="min-w-0">
            <p className="text-[9px] tracking-[0.22em] uppercase text-got-parchment/40" style={{ fontFamily: 'Cinzel, serif' }}>
              {authority.label}
            </p>
            <p className="text-sm text-got-parchment mt-0.5 truncate" style={{ fontFamily: 'EB Garamond, serif' }}>
              {authority.value ?? 'None remain'}
            </p>
          </div>
          <span className="text-[9px] tracking-widest uppercase text-got-gold/70 shrink-0" style={{ fontFamily: 'Cinzel, serif' }}>
            Record →
          </span>
        </div>
      </div>
    </motion.button>
  )
}

function FieldCell({ label, value, caption }) {
  return (
    <div className="bg-stone-950 p-4">
      <p className="text-[9px] tracking-[0.22em] uppercase text-got-parchment/40" style={{ fontFamily: 'Cinzel, serif' }}>
        {label}
      </p>
      <p className="text-base text-got-parchment mt-1.5 leading-snug" style={{ fontFamily: 'EB Garamond, serif' }}>
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

function BranchTabs({ branches, activeIndex, onSelect }) {
  return (
    <div className="flex flex-wrap gap-2">
      {branches.map((branch, i) => (
        <button
          key={branch.label}
          onClick={() => onSelect(i)}
          className={[
            'py-1.5 px-3 rounded border text-xs tracking-widest uppercase transition-colors',
            i === activeIndex
              ? 'border-got-gold bg-got-gold/10 text-got-gold'
              : 'border-stone-700 text-got-parchment/50 hover:border-got-gold/30 hover:text-got-parchment/80',
          ].join(' ')}
          style={{ fontFamily: 'Cinzel, serif' }}
        >
          {branch.label}
        </button>
      ))}
    </div>
  )
}

function MiniTimeline({ points, houseEras, currentYear, onSelect }) {
  return (
    <div className="flex items-start gap-3">
      {points.map((p, i) => {
        const era = houseEras.find((e) => e.year === p.year)
        const authority = computeAuthority(era)
        const isCurrent = p.year === currentYear
        return (
          <button
            key={p.year}
            onClick={() => onSelect(p.year)}
            className="flex-1 min-w-0 flex flex-col items-center text-center gap-2"
          >
            <span
              className={['text-sm font-bold', isCurrent ? 'text-got-gold' : 'text-stone-500'].join(' ')}
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
                  'w-2.5 h-2.5 shrink-0 rotate-45 border',
                  isCurrent ? 'bg-got-gold border-got-gold' : 'bg-stone-900 border-stone-600',
                ].join(' ')}
              />
              <div
                className={[
                  'flex-1 h-px',
                  i === points.length - 1 ? 'bg-gradient-to-l from-transparent to-stone-700' : 'bg-stone-700',
                ].join(' ')}
              />
            </div>
            <span
              className={['text-[9px] tracking-[0.24em] uppercase', isCurrent ? 'text-got-parchment/70' : 'text-stone-600'].join(' ')}
              style={{ fontFamily: 'Cinzel, serif' }}
            >
              {p.sublabel}
            </span>
            <p className="text-sm text-got-parchment mt-1 truncate w-full" style={{ fontFamily: 'EB Garamond, serif' }}>
              {authority.value || '—'}
            </p>
            <p
              className="text-[10px] tracking-widest uppercase text-got-parchment/40"
              style={{ fontFamily: 'Cinzel, serif' }}
            >
              {era?.statusLabel || '—'}
            </p>
          </button>
        )
      })}
    </div>
  )
}

function HouseModal({ house, houseEras, onClose, onYearSelect }) {
  const statusStyle = house.status && house.status !== 'active' ? STATUS_STYLE[house.status] : null
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
        className="relative w-full max-w-4xl max-h-[90vh] border border-got-gold/30 bg-stone-900/95 rounded-lg overflow-hidden flex flex-col md:flex-row"
      >
        {/* Crest panel */}
        <div
          className="relative flex flex-col items-center text-center p-8 md:w-72 shrink-0"
          style={{ background: gradient }}
        >
          <Sigil house={house} size={92} statusStyle={statusStyle} />
          <h3
            className="text-xl font-bold uppercase tracking-wide leading-tight mt-6"
            style={{ fontFamily: 'Cinzel, serif', color: '#fbf5e6', textShadow: '0 2px 12px rgba(0,0,0,0.5)' }}
          >
            {house.name}
          </h3>
          <div className="w-10 h-px bg-white/40 my-4" />
          {house.words && (
            <p className="text-base italic" style={{ fontFamily: 'EB Garamond, serif', color: 'rgba(255,248,232,0.92)' }}>
              &ldquo;{house.words}&rdquo;
            </p>
          )}
          {house.statusLabel && (
            <span
              className="mt-6 text-[10px] tracking-widest uppercase border rounded px-2.5 py-1"
              style={{
                fontFamily: 'Cinzel, serif',
                color: 'rgba(255,248,232,0.9)',
                borderColor: 'rgba(255,245,225,.32)',
                background: 'rgba(0,0,0,.4)',
              }}
            >
              {house.statusLabel}
            </span>
          )}
        </div>

        {/* Details panel */}
        <div className={['flex-1 min-w-0 overflow-y-auto p-6 md:p-8', statusStyle?.body].filter(Boolean).join(' ')}>
          <div className="flex justify-between items-start gap-4 mb-2">
            <div>
              <p className="text-xs tracking-widest uppercase text-got-parchment/40" style={{ fontFamily: 'Cinzel, serif' }}>
                {house.eraLabel ?? `${house.year} AC`}
              </p>
              <p className="text-lg text-got-parchment mt-1" style={{ fontFamily: 'Cinzel, serif' }}>
                {house.region}
              </p>
            </div>
            <button
              onClick={onClose}
              className="py-1.5 px-3 rounded border border-stone-700 text-xs tracking-widest uppercase text-got-parchment/60 hover:border-got-gold/40 hover:text-got-gold transition-colors shrink-0"
              style={{ fontFamily: 'Cinzel, serif' }}
            >
              Close
            </button>
          </div>

          {house.commanderTitles && house.commanderTitles.length > 0 && (
            <div className="flex gap-5 mt-4">
              {house.commanderTitles.map((key) => (
                <CommanderBadge key={key} titleKey={key} size={36} showLabel />
              ))}
            </div>
          )}

          {hasBranches && (
            <div className="mt-6">
              <p className="text-[10px] tracking-[0.24em] uppercase text-got-parchment/40 mb-2" style={{ fontFamily: 'Cinzel, serif' }}>
                Branches of the house
              </p>
              <BranchTabs branches={house.branches} activeIndex={activeBranchIndex} onSelect={setActiveBranchIndex} />
            </div>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-px bg-stone-800 border border-stone-800 mt-6">
            <FieldCell label={authority.label} value={authority.value} caption={authority.caption} />
            <FieldCell label={house.heirLabel || 'Heir'} value={heir} />
            <FieldCell label="Seat" value={seat} />
            <FieldCell label="Sworn To" value={house.overlord} />
            <FieldCell label="Titles" value={titles} />
            <FieldCell label="Founded" value={house.founded} caption={house.founder ? `by ${house.founder}` : null} />
          </div>

          {houseEras && houseEras.length > 1 && (
            <div className="mt-6">
              <p className="text-[10px] tracking-[0.24em] uppercase text-got-parchment/40 mb-3" style={{ fontFamily: 'Cinzel, serif' }}>
                Across the Ages
              </p>
              <MiniTimeline
                points={TIMELINE_POINTS}
                houseEras={houseEras}
                currentYear={house.year}
                onSelect={onYearSelect}
              />
            </div>
          )}

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
        </div>
      </motion.div>
    </div>
  )
}

function Timeline({ points, selectedYear, onSelect }) {
  const current = points.find((p) => p.year === selectedYear)
  return (
    <div className="w-full flex flex-col items-center gap-6 py-2">
      <div className="flex items-center gap-4 w-full max-w-lg">
        {points.map((p, i) => (
          <div key={p.year} className="flex-1 flex flex-col items-center text-center">
            <button onClick={() => onSelect(p.year)} className="flex flex-col items-center gap-2">
              <span
                className={['text-2xl font-bold', selectedYear === p.year ? 'text-got-gold' : 'text-stone-600'].join(' ')}
                style={{ fontFamily: 'Cinzel, serif' }}
              >
                {p.label}
              </span>
              <div className="flex items-center gap-2 w-full">
                <div
                  className={['flex-1 h-px', i === 0 ? 'bg-gradient-to-r from-transparent to-stone-700' : 'bg-stone-700'].join(' ')}
                />
                <span
                  className={[
                    'w-3.5 h-3.5 shrink-0 rotate-45 border',
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
              <span
                className={['text-[10px] tracking-[0.28em] uppercase', selectedYear === p.year ? 'text-got-parchment/70' : 'text-stone-600'].join(' ')}
                style={{ fontFamily: 'Cinzel, serif' }}
              >
                {p.sublabel}
              </span>
            </button>
          </div>
        ))}
      </div>
      {current && (
        <div className="text-center">
          <p className="text-sm tracking-[0.2em] uppercase text-got-gold/80" style={{ fontFamily: 'Cinzel, serif' }}>
            {current.title}
          </p>
          <p className="text-base italic text-got-parchment/50 mt-1.5 max-w-lg" style={{ fontFamily: 'EB Garamond, serif' }}>
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
        className="text-center text-sm tracking-[0.3em] uppercase text-got-parchment/50"
        style={{ fontFamily: 'Cinzel, serif' }}
      >
        {kingdoms[0]}
      </p>
    )
  }

  return (
    <div className="flex items-center justify-center gap-3">
      {kingdoms.map((k) => (
        <button
          key={k}
          onClick={() => onSelect(k)}
          className={[
            'py-2 px-5 rounded border text-sm tracking-widest uppercase transition-colors',
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
const ROLE_ORDER = [
  'king',
  'consort',
  'hand',
  'master_of_whispers',
  'grand_maester',
  'master_of_coin',
  'master_of_laws',
  'commander',
  'kingsguard',
  'champion',
]
const ROLE_LABEL = {
  king: 'King',
  consort: 'Consort',
  hand: 'Hand of the King',
  master_of_whispers: 'Master of Whispers',
  grand_maester: 'Grand Maester',
  master_of_coin: 'Master of Coin',
  master_of_laws: 'Master of Laws',
  commander: 'Commander',
  kingsguard: 'Kingsguard',
  champion: 'Champion',
}

function CouncilPanel({ seats }) {
  if (!seats || seats.length === 0) return null
  return (
    <div className="sm:col-span-2 rounded-lg border border-stone-800 bg-got-charcoal p-5">
      <SectionHeading label="Small Council" count={seats.length} />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
        {seats.map(({ role, members }) => (
          <div key={role}>
            <p
              className="text-[10px] tracking-[0.22em] uppercase text-got-parchment/40"
              style={{ fontFamily: 'Cinzel, serif' }}
            >
              {ROLE_LABEL[role] ?? role}
            </p>
            <p className="text-sm text-got-parchment mt-0.5" style={{ fontFamily: 'EB Garamond, serif' }}>
              {members.map((m) => (m.house ? `${m.characterName} (${m.house})` : m.characterName)).join(', ')}
            </p>
          </div>
        ))}
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
  { key: 'active', label: 'Great Houses' },
  { key: 'diminished', label: 'Diminished' },
  { key: 'vassal', label: 'Vassals' },
  { key: 'extinct', label: 'Dead' },
]

function SectionHeading({ label, count }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <span className="text-sm tracking-[0.3em] uppercase text-got-gold/80" style={{ fontFamily: 'Cinzel, serif' }}>
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

  const [selectedYear, setSelectedYear] = useState(TIMELINE_POINTS[0].year)
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
        if (standingFilter === 'power' && h.status !== 'active' && h.status !== 'royalty') return false
        if (standingFilter === 'fallen' && (h.status === 'active' || h.status === 'royalty')) return false
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
    const buckets = { royalty: [], active: [], diminished: [], extinct: [], vassal: [] }
    filtered.forEach((h) => {
      if (h.tier === 'vassal') {
        buckets.vassal.push(h)
        return
      }
      const key = buckets[h.status] ? h.status : 'active'
      buckets[key].push(h)
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
    return ROLE_ORDER.filter((role) => byRole.has(role)).map((role) => ({
      role,
      members: byRole.get(role),
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
          <p className="text-[11px] tracking-[0.4em] uppercase text-got-parchment/40" style={{ fontFamily: 'Cinzel, serif' }}>
            A Chronicle of the Seven Kingdoms
          </p>
          <h1
            className="text-4xl sm:text-5xl font-black tracking-wider uppercase text-got-gold mt-3"
            style={{ fontFamily: 'Cinzel, serif', textShadow: '0 0 40px rgba(201,168,76,0.3)' }}
          >
            Great Houses
          </h1>
          <div className="flex items-center justify-center gap-3 mt-4 max-w-xs mx-auto">
            <div className="flex-1 h-px bg-gradient-to-r from-transparent to-stone-700" />
            <div className="w-2 h-2 border border-got-gold/60 rotate-45" />
            <div className="flex-1 h-px bg-gradient-to-l from-transparent to-stone-700" />
          </div>
          <p className="text-base italic text-got-parchment/50 mt-4" style={{ fontFamily: 'EB Garamond, serif' }}>
            Nine banners, two ages. Choose a house to read its record.
          </p>
        </div>

        {!loading && !error && (
          <>
            <Timeline points={TIMELINE_POINTS} selectedYear={selectedYear} onSelect={setSelectedYear} />
            <KingdomNav kingdoms={kingdoms} current={effectiveKingdom} onSelect={setKingdomFilter} />
          </>
        )}

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3 border-t border-b border-stone-800/60 py-5">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search houses, seats, words"
            className="flex-[2_1_240px] min-w-0 py-3 px-4 rounded border border-stone-700 bg-got-charcoal/40 text-got-parchment text-sm placeholder:text-stone-600 focus:outline-none focus:border-got-gold/50"
            style={{ fontFamily: 'EB Garamond, serif' }}
          />
          <select
            value={regionFilter}
            onChange={(e) => setRegionFilter(e.target.value)}
            className="flex-1 min-w-[160px] py-3 px-4 rounded border border-stone-700 bg-got-charcoal/40 text-got-parchment text-xs tracking-widest uppercase focus:outline-none focus:border-got-gold/50"
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
            className="flex-1 min-w-[160px] py-3 px-4 rounded border border-stone-700 bg-got-charcoal/40 text-got-parchment text-xs tracking-widest uppercase focus:outline-none focus:border-got-gold/50"
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
                  <motion.div layout className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                    {items.map((house) => (
                      <HouseCard
                        key={house.id}
                        house={house}
                        isSelected={selectedId === house.id}
                        onClick={() => handleCardClick(house)}
                      />
                    ))}
                    {/* Council sits beside Royalty, filling the columns the
                        royalty card(s) don't use — sm:col-span-2 assumes one
                        royalty house, which is all the data has today; a
                        second simultaneous royalty house would need this
                        adjusted. Hidden under the North's own tab: this
                        council governs the Six/Seven Kingdoms, not the
                        independent North, which has no tracked council of
                        its own yet. */}
                    {key === 'royalty' && effectiveKingdom !== 'Kingdom of the North' && (
                      <CouncilPanel seats={councilSeats} />
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