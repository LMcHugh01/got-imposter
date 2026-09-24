import { useState, useEffect, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import PageWrapper from '../../components/PageWrapper'
import { fetchAllHouses, fetchAllHouseEras, fetchAllSmallCouncil } from '../../lib/houseService'
import { TIMELINE_POINTS } from '../../data/timeline'

// Display/tab order for kingdoms — fixed here rather than derived
// alphabetically or from data order, so tabs don't reshuffle as more
// houses (and possibly more kingdoms) get added later.
const KINGDOM_ORDER = ['Seven Kingdoms', 'Six Kingdoms', 'Kingdom of the North']

// Two columns decide where a house sits in a given era:
//
//   status  active | royalty | exiled | extinct, or free text for anything
//           else fallen-but-alive ('Diminished', 'Restored'). The free text
//           IS the chip text; those houses stay in their tier's section.
//   tier    great | lordly | knightly | unknown (noble rank not known), or
//           order for a sworn order rather than a family (the Night's Watch).
//
// Both live on `houses`, and a house_eras row may override tier (and
// region) for its year, e.g. a house raised in rank, or one that moved.
// Wardens aren't a section: they're Great Houses, listed first, with their
// compass badge (from commanderTitles).
//
// getSectionKey is the single source of truth for "which section does this
// house belong in this era", used both for the page's bucketing and for
// each card's own styling, so the two can't drift apart. Royalty, exiled
// and extinct span every tier; everything else goes by tier.
const TIER_SECTION = {
  great: 'great',
  lordly: 'lordly',
  knightly: 'knightly',
  unknown: 'unknown',
  order: 'order', // sworn orders: the Night's Watch
  vassal: 'lordly', // the old tier, until the SQL update has run
}

function getSectionKey(house) {
  const status = (house.status ?? '').toLowerCase()
  if (status === 'royalty') return 'royalty'
  if (status === 'extinct') return 'extinct'
  if (status === 'exiled') return 'exiled'
  return TIER_SECTION[house.tier] ?? 'unknown'
}

// Free-text statuses ('Diminished', 'Restored'): shown as the chip, in the
// house's own tier section.
function otherStatus(house) {
  const status = (house.status ?? '').toLowerCase()
  return status && !['active', 'royalty', 'exiled', 'extinct'].includes(status) ? house.status : null
}

function wardenTitle(house) {
  return house.commanderTitles?.find((k) => k.startsWith('warden_of_')) ?? null
}

// A house's standing in one era, as words: shown for each era in the house
// window's "Across the Ages" timeline. Derived, not stored.
function getBadgeText(house, sectionKey) {
  if (sectionKey === 'royalty') return 'Royalty'
  if (sectionKey === 'extinct') return 'Extinct'
  if (sectionKey === 'exiled') return 'Exiled'
  const other = otherStatus(house)
  if (other) return other
  if (sectionKey === 'great') {
    const key = wardenTitle(house)
    return key ? TITLE_META[key]?.label ?? 'Warden' : 'Great House'
  }
  if (sectionKey === 'lordly') return 'Lordly'
  if (sectionKey === 'knightly') return 'Knightly'
  if (sectionKey === 'order') return 'Sworn Order'
  return 'Rank Unknown'
}

// Styling per section: royalty gets its gold tint (applied via `body` in
// HouseCard/HouseModal); exiled and extinct are muted; every other section
// renders as an ordinary card.
const SECTION_STYLE = {
  royalty: {
    card: 'border-stone-800 hover:border-got-gold/40',
    image: '',
    body: 'bg-gradient-to-b from-got-gold/10 via-got-gold/5 to-transparent',
  },
  exiled: { card: 'border-purple-900/60 opacity-90', image: '' },
  extinct: { card: 'border-stone-800 opacity-45 grayscale', image: 'grayscale' },
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

/* ---------------- the page's look ---------------- */

const CINZEL = { fontFamily: "'Cinzel', serif" }
const GARAMOND = { fontFamily: "'EB Garamond', Georgia, serif" }
const FOCUS = 'focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-[#d8b878]'
const INK = { cream: '#f1e6cc', gold: '#d8b878', muted: '#8f8676', words: '#c9b27a', noWords: '#8a5a4e' }

// A hanging banner with a pointed foot (the same shape as the home page's
// Explore banners), in the house's colour, its sigil on it, edged in gold.
const BANNER_CLIP = 'polygon(0 0, 100% 0, 100% 84%, 50% 100%, 0 84%)'

function HouseBanner({ house, width }) {
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
        ) : (
          <span style={{ ...CINZEL, fontSize: width * 0.42, color: INK.cream }}>{initial}</span>
        )}
      </div>
    </div>
  )
}

// "The North · Winterfell"
const placeOf = (house) => [house.region, house.seats?.[0]].filter(Boolean).join(' · ')

function Words({ house, faded, className = '' }) {
  return (
    <div className={`italic ${className}`} style={{ ...GARAMOND, color: house.words ? (faded ? INK.muted : INK.words) : INK.noWords }}>
      {house.words ? `\u201c${house.words}\u201d` : 'No recorded words'}
    </div>
  )
}

function WardenTag({ house, className = '' }) {
  const key = wardenTitle(house)
  if (!key) return null
  return (
    <span className={`uppercase ${className}`} title={TITLE_META[key]?.label} style={{ ...CINZEL, fontSize: 8, letterSpacing: '.2em', color: INK.gold }}>
      Warden
    </span>
  )
}

// Extinct houses are shown faded and grey.
const fadedStyle = (sectionKey) => (sectionKey === 'extinct' ? { opacity: 0.55, filter: 'grayscale(1)' } : null)

// Banners view: a card per house.
function HouseTile({ house, sectionKey, isSelected, onClick }) {
  const tint = house.tinctFrom ?? '#3a342a'
  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative w-full text-left flex items-center gap-3.5 min-h-[76px] px-3.5 py-3 rounded-[3px] border transition-colors duration-200 cursor-pointer ${
        isSelected ? 'border-[#d8b878]' : 'border-[rgba(216,184,120,.11)] hover:border-[rgba(216,184,120,.5)]'
      } ${FOCUS}`}
      style={{ background: `linear-gradient(100deg, ${tint}55 0%, ${tint}18 38%, rgba(255,255,255,.012) 70%)`, ...fadedStyle(sectionKey) }}
    >
      <HouseBanner house={house} width={40} />
      <div className="min-w-0 flex-1">
        <div className="truncate pr-12" style={{ ...CINZEL, fontWeight: 600, fontSize: 15, letterSpacing: '.03em', color: INK.cream }}>
          {splitHouseName(house.name).name}
        </div>
        <div className="truncate uppercase mt-[3px]" style={{ ...CINZEL, fontSize: 9, letterSpacing: '.18em', color: INK.muted }}>
          {placeOf(house)}
        </div>
        <Words house={house} faded={sectionKey === 'extinct'} className="truncate mt-[3px] text-[15px]" />
      </div>
      <WardenTag house={house} className="absolute top-2 right-2.5" />
    </button>
  )
}

// Roll view: a line per house; place and words hide on narrow screens.
function HouseRollRow({ house, sectionKey, isSelected, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full text-left grid items-center gap-x-[18px] gap-y-1 px-1.5 py-2 border-b border-[rgba(216,184,120,.08)] transition-colors cursor-pointer grid-cols-[24px_minmax(0,1fr)] min-[820px]:grid-cols-[24px_minmax(0,1fr)_minmax(0,1.2fr)_minmax(0,1.5fr)] ${
        isSelected ? 'bg-[rgba(216,184,120,.09)]' : 'hover:bg-[rgba(216,184,120,.05)]'
      } ${FOCUS}`}
      style={fadedStyle(sectionKey)}
    >
      <HouseBanner house={house} width={24} />
      <div className="flex items-baseline gap-2.5 min-w-0">
        <span className="truncate" style={{ ...CINZEL, fontWeight: 600, fontSize: 14, color: INK.cream }}>
          {splitHouseName(house.name).name}
        </span>
        <WardenTag house={house} />
      </div>
      <span className="hidden min-[820px]:block truncate uppercase" style={{ ...CINZEL, fontSize: 9.5, letterSpacing: '.18em', color: INK.muted }}>
        {placeOf(house)}
      </span>
      <Words house={house} faded={sectionKey === 'extinct'} className="hidden min-[820px]:block truncate text-[15px]" />
    </button>
  )
}

// Royalty and Orders: a house beside its council, in one framed block.
function CrownLabel({ house }) {
  const crown = house.commanderTitles?.find((k) => k === 'king_in_the_north' || k === 'queen_in_the_north')
  return crown ? TITLE_META[crown].label : 'The Iron Throne'
}

function FeatureBlock({ house, label, council, seats, isSelected, onClick, dark }) {
  const tint = house.tinctFrom ?? '#3a342a'
  return (
    <div
      className={`flex flex-wrap rounded-[3px] overflow-hidden border ${isSelected ? 'border-[#d8b878]' : 'border-[rgba(216,184,120,.2)]'}`}
      style={{ background: dark ? 'linear-gradient(90deg, rgba(0,0,0,.35), rgba(255,255,255,.01) 40%)' : 'rgba(255,255,255,.015)' }}
    >
      <button
        type="button"
        onClick={onClick}
        className={`relative flex items-center gap-[18px] px-[22px] py-5 text-left cursor-pointer ${FOCUS}`}
        style={{ flex: '1 1 280px', background: dark ? undefined : `linear-gradient(100deg, ${tint}55 0%, ${tint}18 45%, transparent 80%)` }}
      >
        <HouseBanner house={house} width={dark ? 44 : 58} />
        <div className="min-w-0">
          {label && (
            <div className="flex items-center gap-2 uppercase" style={{ ...CINZEL, fontSize: 9.5, letterSpacing: '.3em', color: INK.gold }}>
              <span className="w-1.5 h-1.5 rotate-45 shrink-0" style={{ background: INK.gold }} />
              <span>{label}</span>
            </div>
          )}
          <div className={label ? 'mt-1.5' : ''} style={{ ...CINZEL, fontWeight: 600, fontSize: dark ? 17 : 20, lineHeight: 1.15, color: INK.cream }}>
            {house.name}
          </div>
          <div className="uppercase mt-1.5" style={{ ...CINZEL, fontSize: 9.5, letterSpacing: '.2em', color: INK.muted }}>
            {placeOf(house)}
          </div>
          <Words house={house} className="mt-1.5 text-[16px]" />
        </div>
      </button>
      {council && <CouncilPanel council={council} seats={seats} />}
    </div>
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
        const badgeText = era ? getBadgeText({ tier, ...era }, getSectionKey({ tier, ...era })) : '—'
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

  // A branch names its own leader, under its own title if it has one
  // ('Commander' at Eastwatch). The main branch (the first tab) may leave its
  // lord empty, and then shows the era's own ruler, so that isn't recorded
  // twice (the Night's Watch's Lord Commander at Castle Black).
  const branchLeadsItself = activeBranch && !(activeBranchIndex === 0 && activeBranch.lord == null)
  const authority = branchLeadsItself
    ? { label: activeBranch.rulerLabel ?? 'Ruling Lord', value: activeBranch.lord, caption: null }
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
              className="text-[10px] tracking-widest uppercase text-got-parchment/40 whitespace-nowrap"
              style={{ fontFamily: 'Cinzel, serif' }}
            >
              {`${house.year} AC`}{house.eraLabel ? ` · ${house.eraLabel}` : ''}
            </p>
            <div className="flex-1 h-px bg-gradient-to-r from-stone-700 to-transparent" />
            <p
              className="text-[10px] tracking-widest uppercase text-got-gold/70 whitespace-nowrap"
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
            className="mt-6 py-3 px-4 sm:px-5 border-y border-stone-800"
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
              <div className="flex items-start gap-2.5">
                <span className="w-1.5 h-1.5 mt-1.5 shrink-0 rotate-45 border border-got-gold/60" />
                <p className="text-sm sm:text-base italic text-got-parchment/70 leading-relaxed" style={{ fontFamily: 'EB Garamond, serif' }}>
                  {titles}
                </p>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-5 sm:gap-x-8 gap-y-4 sm:gap-y-5 mt-6">
            {/* A sworn order (the Night's Watch) has no heirs: its brothers
                take no wives and father no children. */}
            {house.tier !== 'order' && <FieldCell label={house.heirLabel || 'Heir'} value={heir} />}
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

// The councils shown beside a house's card. Seats are listed in a fixed
// order, independent of the order rows were inserted in; a seat with no
// row for the selected year shows "Unknown", so a panel keeps its shape
// across eras. `listRole` is a seat with several members, shown as a row
// of names under the grid, the first starred (the Kingsguard's Lord
// Commander).
//
// Rows live in the small_council table; its `council` column says which
// council a row belongs to ('small_council' or 'nights_watch').
//
// Small Council: King/Consort left out (the Royalty card already shows
// them); Commander/Champion left out (never confident data in any era).
const COUNCILS = {
  small_council: {
    title: 'Small Council',
    roles: ['hand', 'grand_maester', 'master_of_coin', 'master_of_laws', 'master_of_ships', 'master_of_whispers'],
    labels: {
      hand: 'Hand of the King',
      grand_maester: 'Grand Maester',
      master_of_coin: 'Master of Coin',
      master_of_laws: 'Master of Laws',
      master_of_ships: 'Master of Ships',
      master_of_whispers: 'Master of Whispers',
      kingsguard: 'Kingsguard',
    },
    listRole: 'kingsguard',
    listLeader: 'Lord Commander',
    countWord: 'seated',
  },
  nights_watch: {
    // Castle Black's officers. The commanders of Eastwatch and the Shadow
    // Tower are the Watch's other branches, shown in the house window.
    title: 'Officers of Castle Black',
    countWord: 'known',
    roles: ['lord_commander', 'first_ranger', 'first_builder', 'first_steward', 'maester'],
    labels: {
      lord_commander: 'Lord Commander',
      first_ranger: 'First Ranger',
      first_builder: 'First Builder',
      first_steward: 'First Steward',
      maester: 'Maester of Castle Black',
    },
  },
}

// The house whose card the Night's Watch officers sit beside.
const NIGHTS_WATCH_SLUG = 'nights-watch'

function CouncilPanel({ council, seats }) {
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
      className="flex flex-col gap-3.5 px-[22px] py-[18px] border-t border-[rgba(216,184,120,.12)] min-[860px]:border-t-0 min-[860px]:border-l"
      style={{ flex: '3 1 520px' }}
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

// Top to bottom. A section with no houses this era (no Extinct Houses at
// 298, say) is skipped where SECTIONS is consumed, not here.
const SECTIONS = [
  { key: 'royalty', label: 'Royalty' },
  { key: 'great', label: 'Great Houses' },
  { key: 'lordly', label: 'Lordly Houses' },
  { key: 'knightly', label: 'Knightly Houses' },
  { key: 'unknown', label: 'Other Houses', note: 'Noble rank unknown' },
  { key: 'exiled', label: 'Exiled Houses' },
  { key: 'extinct', label: 'Extinct Houses' },
  { key: 'order', label: 'Orders' },
]

function SectionHeading({ label, note, count }) {
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

// A segmented control: realm tabs at 305, and Banners / Roll.
function Segmented({ options, value, onChange, size = 11, height }) {
  return (
    <div className="flex gap-[3px] p-[3px] rounded-[2px] border border-[rgba(216,184,120,.3)]" style={{ height }} role="radiogroup">
      {options.map(({ value: v, label }) => {
        const on = v === value
        return (
          <button
            key={v}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => onChange(v)}
            className={`uppercase px-3.5 rounded-[1px] cursor-pointer transition-colors ${height ? '' : 'py-[9px]'} ${FOCUS}`}
            style={{ ...CINZEL, fontSize: size, letterSpacing: '.16em', background: on ? 'rgba(216,184,120,.16)' : 'transparent', color: on ? '#eed49b' : '#9d9483' }}
          >
            {label}
          </button>
        )
      })}
    </div>
  )
}

// The era picker: years on a gold line, the chosen one lit.
function EraPicker({ points, selectedYear, onSelect }) {
  return (
    <div className="relative flex" role="radiogroup" aria-label="Era">
      <div
        className="absolute left-[16%] right-[16%] bottom-[9px] h-px"
        style={{ background: 'linear-gradient(90deg, rgba(216,184,120,.1), rgba(216,184,120,.4), rgba(216,184,120,.1))' }}
      />
      {points.map((p) => {
        const on = p.year === selectedYear
        return (
          <button
            key={p.year}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => onSelect(p.year)}
            className={`relative flex flex-col items-center gap-2.5 w-[92px] sm:w-[108px] cursor-pointer ${FOCUS}`}
          >
            <span style={{ ...CINZEL, fontWeight: 500, fontSize: 22, letterSpacing: '.02em', color: on ? '#e2bc5c' : '#7d7566' }}>{p.label}</span>
            <span
              className="rotate-45 border border-[rgba(216,184,120,.55)]"
              style={{ width: on ? 12 : 8, height: on ? 12 : 8, margin: on ? 0 : '2px 0', background: on ? '#e2bc5c' : '#1f1d1a' }}
            />
          </button>
        )
      })}
    </div>
  )
}

const VIEW_KEY = 'houses-view'
function useRememberedView() {
  const [view, setView] = useState(() => {
    try {
      return localStorage.getItem(VIEW_KEY) === 'roll' ? 'roll' : 'banners'
    } catch {
      return 'banners'
    }
  })
  const choose = (v) => {
    setView(v)
    try {
      localStorage.setItem(VIEW_KEY, v)
    } catch {
      // private browsing: the choice just isn't remembered
    }
  }
  return [view, choose]
}

// Short names for the jump links under the toolbar.
const JUMP_LABEL = {
  royalty: 'Royalty',
  great: 'Great',
  lordly: 'Lordly',
  knightly: 'Knightly',
  unknown: 'Other',
  exiled: 'Exiled',
  extinct: 'Extinct',
  order: 'Orders',
}

export default function Houses() {
  const [houses, setHouses] = useState([])
  const [eras, setEras] = useState([])
  const [council, setCouncil] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // 298 is deliberately hardcoded rather than TIMELINE_POINTS[0].year — the
  // show starts there, and that should stay the default no matter where a
  // new era (281, House of the Dragon eras, whatever) lands in the array.
  const [selectedYear, setSelectedYear] = useState(298)
  const [selectedId, setSelectedId] = useState(null)
  const [search, setSearch] = useState('')
  // ?region= and ?house= arrive from the map's panel links
  const [params] = useSearchParams()
  const [regionFilter, setRegionFilter] = useState(params.get('region') ?? 'all')
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

  // Open the house named in ?house= once the data is in.
  useEffect(() => {
    const slug = params.get('house')
    const match = slug && houses.find((h) => h.slug === slug)
    if (match) setSelectedId(match.id)
  }, [houses]) // eslint-disable-line react-hooks/exhaustive-deps

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
        if (search.trim()) {
          const q = search.trim().toLowerCase()
          const haystack = [h.name, h.region, h.words, h.seats?.join(' ')].filter(Boolean).join(' ').toLowerCase()
          if (!haystack.includes(q)) return false
        }
        return true
      })
      .sort((a, b) => housePriority(a) - housePriority(b) || a.name.localeCompare(b.name))
  }, [housesAtYear, effectiveKingdom, regionFilter, search])

  // "The Reign of King Robert Baratheon": the ruler of the kingdom being
  // shown (at 305, Bran for the Six Kingdoms, Sansa for the North). Queen
  // for a queen: a queen's crown title, or a ruler label saying so. A name
  // that already starts with its title ("King Bran the Broken") keeps it.
  const reign = useMemo(() => {
    const royals = housesAtYear.filter((h) => h.status === 'royalty')
    const royal = royals.find((h) => h.kingdom === effectiveKingdom) ?? royals[0]
    if (!royal) return null
    const name = computeAuthority(royal).value
    if (!name) return null
    const queen =
      royal.commanderTitles?.includes('queen_in_the_north') || /queen/i.test(royal.rulerLabel ?? '')
    const title = queen ? 'Queen' : 'King'
    return /^(king|queen)\s/i.test(name) ? `The Reign of ${name}` : `The Reign of ${title} ${name}`
  }, [housesAtYear, effectiveKingdom])

  // filtered is already priority-sorted (Protector and Wardens first) —
  // splitting it into sections preserves that order within each one rather
  // than needing a second sort. A house with an unknown tier value lands in
  // Other Houses rather than silently vanishing from the grid.
  const sections = useMemo(() => {
    const buckets = Object.fromEntries(SECTIONS.map(({ key }) => [key, []]))
    filtered.forEach((h) => {
      buckets[getSectionKey(h)].push(h)
    })
    return buckets
  }, [filtered])

  // Group this era's council rows by role — most roles have one member,
  // kingsguard can have several, hence grouping rather than one row per
  // role. Roles with no row this year (most of them, at 305) just don't
  // appear, rather than the panel showing an empty slot.
  // One entry per council: its seats for this year, in the council's fixed
  // order, every seat present (an empty one renders as "Unknown").
  const councilSeats = useMemo(() => {
    const seatsFor = (key) => {
      const def = COUNCILS[key]
      const byRole = new Map()
      council
        .filter((c) => c.year === selectedYear && (c.council ?? 'small_council') === key)
        .forEach((c) => {
          if (!byRole.has(c.role)) byRole.set(c.role, [])
          byRole.get(c.role).push(c)
        })
      const order = def.listRole ? [...def.roles, def.listRole] : def.roles
      return order.map((role) => ({ role, members: byRole.get(role) ?? [] }))
    }
    return Object.fromEntries(Object.keys(COUNCILS).map((key) => [key, seatsFor(key)]))
  }, [council, selectedYear])

  // Static — doesn't change with the selected era or kingdom tab, only
  // search, since that's the one filter that still makes sense without
  // any era data to key off.
  const selected = housesAtYear.find((h) => h.id === selectedId) ?? null
  const selectedEras = selectedId ? eras.filter((e) => e.houseId === selectedId) : []

  const handleCardClick = (house) => {
    setSelectedId((current) => (current === house.id ? null : house.id))
  }

  const [view, setView] = useRememberedView()
  const point = TIMELINE_POINTS.find((p) => p.year === selectedYear)
  const ruledNorth = effectiveKingdom === 'Kingdom of the North'
  const shownSections = SECTIONS.filter(({ key }) => sections[key]?.length > 0)

  return (
    <PageWrapper className="!p-0 !items-stretch">
      <div className="w-full text-[#ece5d6]">
        {/* Title, and the era picker */}
        <header className="max-w-[1240px] mx-auto px-5 sm:px-7 pt-[18px] flex flex-wrap items-end justify-between gap-x-12 gap-y-6">
          <div className="min-w-0">
            <div className="uppercase" style={{ ...CINZEL, fontSize: 10, letterSpacing: '.46em', color: INK.muted }}>
              Game of Thrones
            </div>
            <h1 className="mt-2 leading-none" style={{ ...CINZEL, fontWeight: 500, fontSize: 40, letterSpacing: '.1em', color: INK.cream }}>
              Houses
            </h1>
          </div>
          <EraPicker points={TIMELINE_POINTS} selectedYear={selectedYear} onSelect={setSelectedYear} />
        </header>

        {/* The era: who rules, and its realms */}
        {!loading && !error && point && (
          <section className="max-w-[1240px] mx-auto mt-[22px] px-5 sm:px-7">
            <div className="flex flex-wrap items-center justify-between gap-x-8 gap-y-4 py-4 border-y border-[rgba(216,184,120,.16)]">
              <div className="flex flex-wrap items-baseline gap-x-[18px] gap-y-1.5 min-w-0" style={{ flex: '1 1 420px' }}>
                <div className="flex flex-col gap-1">
                  {point.season && (
                    <span className="uppercase" style={{ ...CINZEL, fontSize: 9.5, letterSpacing: '.34em', color: INK.muted }}>
                      {point.season}
                    </span>
                  )}
                  <span style={{ ...CINZEL, fontWeight: 600, fontSize: 21, letterSpacing: '.04em', color: INK.cream }}>
                    {reign || point.title}
                  </span>
                </div>
              </div>
              {kingdoms.length > 1 ? (
                <Segmented
                  options={kingdoms.map((k) => ({ value: k, label: k }))}
                  value={effectiveKingdom}
                  onChange={setKingdomFilter}
                />
              ) : (
                kingdoms[0] && (
                  <span className="uppercase" style={{ ...CINZEL, fontSize: 11, letterSpacing: '.34em', color: '#9d9483' }}>
                    {kingdoms[0]}
                  </span>
                )
              )}
            </div>
          </section>
        )}

        {/* Search, region and view, with links to each section; stays at the top while scrolling */}
        <div className="sticky top-0 z-[5] mt-3 border-b border-[rgba(216,184,120,.1)] backdrop-blur-md" style={{ background: 'rgba(31,29,26,.94)' }}>
          <div className="max-w-[1240px] mx-auto px-5 sm:px-7 py-3 flex flex-col gap-2.5">
            <div className="flex flex-wrap gap-2">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search houses, seats, words"
                aria-label="Search houses, seats, words"
                className="h-10 min-w-0 px-3.5 rounded-[2px] border border-[rgba(216,184,120,.22)] bg-[rgba(255,255,255,.02)] text-[17px] text-[#ece5d6] outline-none focus:border-[rgba(216,184,120,.5)] placeholder:italic placeholder:text-[#7d7566]"
                style={{ ...GARAMOND, flex: '1 1 240px' }}
              />
              <select
                value={regionFilter}
                onChange={(e) => setRegionFilter(e.target.value)}
                aria-label="Region"
                className="h-10 min-w-0 px-3 rounded-[2px] border border-[rgba(216,184,120,.22)] bg-[#1f1d1a] text-[#ece5d6] uppercase outline-none focus:border-[rgba(216,184,120,.5)] cursor-pointer sm:max-w-[220px]"
                style={{ ...CINZEL, fontSize: 11, letterSpacing: '.14em', flex: '1 1 150px' }}
              >
                {regions.map((r) => (
                  <option key={r} value={r}>
                    {r === 'all' ? 'All regions' : r}
                  </option>
                ))}
              </select>
              <Segmented
                options={[
                  { value: 'banners', label: 'Banners' },
                  { value: 'roll', label: 'Roll' },
                ]}
                value={view}
                onChange={setView}
                size={10}
                height={40}
              />
            </div>
            {shownSections.length > 0 && (
              <nav className="flex gap-x-5 gap-y-1.5 overflow-x-auto whitespace-nowrap pb-0.5 uppercase [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" aria-label="Sections" style={{ ...CINZEL, fontSize: 10, letterSpacing: '.22em' }}>
                {shownSections.map(({ key }) => (
                  <a key={key} href={`#sec-${key}`} className={`flex items-center gap-2 py-1 text-[#9d9483] hover:text-[#eed49b] transition-colors ${FOCUS}`}>
                    <span>{JUMP_LABEL[key] ?? key}</span>
                    <span style={{ color: INK.gold }}>{sections[key].length}</span>
                  </a>
                ))}
              </nav>
            )}
          </div>
        </div>

        <main className="max-w-[1240px] mx-auto px-5 sm:px-7 pt-2 pb-10">
          {loading && (
            <p className="text-center italic py-12 text-[18px]" style={{ ...GARAMOND, color: INK.muted }}>
              Consulting the maesters…
            </p>
          )}
          {error && (
            <p className="text-center py-12 text-[18px]" style={{ ...GARAMOND, color: '#c9766a' }}>
              {error}
            </p>
          )}

          {!loading &&
            !error &&
            shownSections.map(({ key, label, note }) => {
              const items = sections[key]
              const open = (house) => handleCardClick(house)
              return (
                <section key={key} id={`sec-${key}`} className="pt-[30px] scroll-mt-[120px]">
                  <SectionHeading label={label} note={note} count={items.length} />

                  {key === 'royalty' || key === 'order' ? (
                    // the royal house beside the Small Council (not under the
                    // independent North's tab); the Night's Watch beside its officers
                    <div className="flex flex-col gap-2">
                      {items.map((house, i) => {
                        const nightsWatch = house.slug === NIGHTS_WATCH_SLUG
                        const council =
                          key === 'royalty' ? (i === 0 && !ruledNorth ? COUNCILS.small_council : null) : nightsWatch ? COUNCILS.nights_watch : null
                        return (
                          <FeatureBlock
                            key={house.id}
                            house={house}
                            label={key === 'royalty' ? <CrownLabel house={house} /> : null}
                            council={council}
                            seats={council === COUNCILS.small_council ? councilSeats.small_council : councilSeats.nights_watch}
                            isSelected={selectedId === house.id}
                            onClick={() => open(house)}
                            dark={key === 'order'}
                          />
                        )
                      })}
                    </div>
                  ) : view === 'roll' ? (
                    <div className="flex flex-col border-t border-[rgba(216,184,120,.1)]">
                      {items.map((house) => (
                        <HouseRollRow key={house.id} house={house} sectionKey={key} isSelected={selectedId === house.id} onClick={() => open(house)} />
                      ))}
                    </div>
                  ) : (
                    <div className="grid gap-2" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(236px, 1fr))' }}>
                      {items.map((house) => (
                        <HouseTile key={house.id} house={house} sectionKey={key} isSelected={selectedId === house.id} onClick={() => open(house)} />
                      ))}
                    </div>
                  )}
                </section>
              )
            })}

          {!loading && !error && filtered.length === 0 && (
            <p className="py-[60px] text-center text-[19px] italic" style={{ ...GARAMOND, color: INK.muted }}>
              No house answers to that name.
            </p>
          )}
        </main>
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