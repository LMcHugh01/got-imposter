import { useState, useEffect, useMemo, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import PageWrapper from '../../components/PageWrapper'
import { fetchAllCharactersForBrowse } from '../../lib/characterAttributesService'
import { fetchAllHouses } from '../../lib/houseService'
import { allRoleRatings, weightsFor } from '../../gameEngine/ratings'
import { ROLES } from '../../data/roleWeights'
import { CHAMPION_STYLES, CHAMPION_STYLE_LABELS } from '../../data/championStyles'
import { LEADERSHIP_STYLES, LEADERSHIP_STYLE_LABELS } from '../../data/leadershipStyles'
import { COMMAND_STYLES, COMMAND_STYLE_LABELS } from '../../data/commandStyles'
import { COIN_STYLES, COIN_STYLE_LABELS } from '../../data/coinStyles'
import { ATTRIBUTE_CATEGORIES, ATTRIBUTE_LABELS, ATTRIBUTE_SHORT_LABELS, ALL_ATTRIBUTE_KEYS } from '../../data/attributes'
import { CINZEL, GARAMOND, FOCUS, INK } from '../../components/houses/HouseParts'

/**
 * pages/characters/Characters.jsx
 *
 * Every character, ranked by their overall rating (their best council seat)
 * or by one chosen seat. Search, house, role and attribute filters; style
 * tabs for one style group at a time (Fighting by default); Banners (cards)
 * or Roll (a sortable table), remembered on the device. Clicking a
 * character opens their window: styles, attributes, and every council seat
 * they could fill; picking a seat marks the attributes it weighs.
 */

/* ---------------- data helpers ---------------- */

const CATEGORY_CODE = { combat: 'CMB', wits: 'WIT', statecraft: 'STA', leadership: 'LDR', devotion: 'DEV', presence: 'PRE' }

const CATEGORIES = ATTRIBUTE_CATEGORIES.map((cat) => ({
  id: cat.id,
  label: cat.label,
  code: CATEGORY_CODE[cat.id] ?? cat.id.slice(0, 3).toUpperCase(),
  keys: cat.attributes,
}))

// The 4 independent style categories a character can be tagged with —
// fightingStyle (Champion), leadershipStyle (King/Hand/Consort),
// commandStyle (Commander), coinStyle (Master of Coin). The style tabs show
// one group at a time; filtering by e.g. "Tactician" only matches on
// commandStyle, never a same-named value in another group. `key` is the
// character field each one reads.
const STYLE_GROUPS = [
  { key: 'fightingStyle', label: 'Fighting', long: 'Fighting Style', options: CHAMPION_STYLES, labels: CHAMPION_STYLE_LABELS },
  { key: 'leadershipStyle', label: 'Leadership', long: 'Leadership Style', options: LEADERSHIP_STYLES, labels: LEADERSHIP_STYLE_LABELS },
  { key: 'commandStyle', label: 'Command', long: 'Command Style', options: COMMAND_STYLES, labels: COMMAND_STYLE_LABELS },
  { key: 'coinStyle', label: 'Coin', long: 'Coin Style', options: COIN_STYLES, labels: COIN_STYLE_LABELS },
]
const STYLE_GROUP_BY_KEY = Object.fromEntries(STYLE_GROUPS.map((g) => [g.key, g]))

function average(values) {
  const nums = values.filter((v) => typeof v === 'number')
  if (!nums.length) return null
  return Math.round(nums.reduce((a, b) => a + b, 0) / nums.length)
}

function initials(name) {
  const parts = (name || '').trim().split(/\s+/).filter(Boolean)
  if (!parts.length) return '?'
  const first = parts[0][0]
  const last = parts.length > 1 ? parts[parts.length - 1][0] : ''
  return (first + last).toUpperCase()
}

// Display-only tiering: colours and labels a rating, doesn't touch the engine.
function tier(v) {
  if (v == null) return { label: '—', color: INK.muted }
  if (v >= 85) return { label: 'Excellent', color: '#e2bc5c' }
  if (v >= 70) return { label: 'Strong', color: '#ece5d6' }
  if (v >= 55) return { label: 'Solid', color: '#c9bea8' }
  if (v >= 40) return { label: 'Weak', color: '#b09a7e' }
  return { label: 'Poor', color: '#c08d80' }
}

// A role's weights, for any role, style-driven or flat, straight from the
// engine's own weightsFor(). Only used to mark which attributes a seat
// weighs; the numbers themselves aren't shown.
function weightsForRole(roleId, character) {
  if (!roleId || !character) return null
  return weightsFor(roleId, character)
}

// Short forms for a picked filter, where each box is narrow. A house shows
// as its surname ("House Baratheon of Storm's End" → "Baratheon"); roles
// shorten on phones ("Master of Coin" → "Coin", "King / Queen" → "King").
function shortHouse(house) {
  return (house || '').replace(/^House\s+/i, '').replace(/\s+of\s+.*$/i, '')
}
function shortRole(label) {
  if (!label) return label
  return label.replace(/^Master of\s+/i, '').replace(/^Grand\s+/i, '').replace(/\s*\/.*$/, '')
}

// A character's colour: their house's, from the houses in the archive
// ("House Stark of Winterfell" takes House Stark's). Anyone else: a neutral.
const NEUTRAL = '#3a342a'
function tintFinder(houses) {
  const named = houses.filter((h) => h.tinctFrom && h.name).sort((a, b) => b.name.length - a.name.length)
  return (house) => named.find((h) => (house ?? '').startsWith(h.name))?.tinctFrom ?? NEUTRAL
}

/* ---------------- small parts ---------------- */

const ARCH = 'rounded-t-full'

// A portrait in an arched frame, tinted with the character's house colour.
// Portraits are taller than wide, so the image fills the frame's width and
// is anchored to the top, where the face is. No image, or one that fails
// to load: their initials.
function Portrait({ character, tint, width, height }) {
  const [broken, setBroken] = useState(false)
  const src = character.image_url
  return (
    <div
      className={`relative shrink-0 overflow-hidden border ${ARCH} flex items-end justify-center`}
      style={{ width, height, borderColor: 'rgba(216,184,120,.6)', background: `radial-gradient(circle at 50% 35%, ${tint}, #15130f 80%)` }}
      aria-hidden="true"
    >
      {src && !broken ? (
        <img src={src} alt="" loading="lazy" onError={() => setBroken(true)} className="absolute inset-0 w-full h-full object-cover object-top" />
      ) : (
        <span className="mb-[18%]" style={{ ...CINZEL, fontSize: Math.round(width * 0.3), color: INK.cream }}>
          {initials(character.name)}
        </span>
      )}
    </div>
  )
}

const Label = ({ children, className = '', color = INK.muted, style }) => (
  <div className={`uppercase ${className}`} style={{ ...CINZEL, fontSize: 9.5, letterSpacing: '.24em', color, ...style }}>
    {children}
  </div>
)

// One filter: a compact box showing the filter's name at rest ("Houses") and
// the chosen value once one is picked (in gold). The real <select> sits
// invisibly on top, so tapping opens the native picker and screen readers
// announce a normal dropdown; its options can stay descriptive.
function FilterSelect({ label, value, restValue, shown, shownShort, onChange, children, className = '' }) {
  const active = value !== restValue
  return (
    <div
      className={`relative flex items-center justify-center sm:justify-between gap-1 min-w-0 h-10 px-1.5 sm:px-3 rounded-[2px] border transition-colors focus-within:border-[rgba(216,184,120,.6)] ${
        active ? 'border-[rgba(216,184,120,.55)] text-[#eed49b]' : 'border-[rgba(216,184,120,.22)] text-[#ece5d6]'
      } ${className}`}
      style={{ background: '#1f1d1a' }}
    >
      <span className="truncate uppercase text-[9.5px] tracking-[0.06em] sm:text-[11px] sm:tracking-[0.14em]" style={CINZEL}>
        {active ? (
          <>
            <span className="sm:hidden">{shownShort ?? shown}</span>
            <span className="hidden sm:inline">{shown}</span>
          </>
        ) : (
          label
        )}
      </span>
      <svg width="8" height="5" viewBox="0 0 8 5" aria-hidden="true" className="hidden sm:block shrink-0 opacity-60">
        <path d="M.5.5 4 4 7.5.5" fill="none" stroke="currentColor" />
      </svg>
      <select aria-label={label} value={value} onChange={(e) => onChange(e.target.value)} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer">
        {children}
      </select>
    </div>
  )
}

// Banners / Roll.
function Segmented({ options, value, onChange }) {
  return (
    <div className="flex gap-[3px] p-[3px] h-10 rounded-[2px] border border-[rgba(216,184,120,.3)]" role="radiogroup" aria-label="View">
      {options.map(({ value: v, label }) => {
        const on = v === value
        return (
          <button
            key={v}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => onChange(v)}
            className={`uppercase px-3.5 rounded-[1px] cursor-pointer transition-colors ${FOCUS}`}
            style={{ ...CINZEL, fontSize: 10, letterSpacing: '.16em', background: on ? 'rgba(216,184,120,.16)' : 'transparent', color: on ? '#eed49b' : '#9d9483' }}
          >
            {label}
          </button>
        )
      })}
    </div>
  )
}

const VIEW_KEY = 'characters-view'
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

/* ---------------- the page ---------------- */

export default function Characters() {
  const [characters, setCharacters] = useState([])
  const [houses, setHouses] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const [selectedId, setSelectedId] = useState(null)
  const [query, setQuery] = useState('')
  const [houseFilter, setHouseFilter] = useState('all')
  const [styleGroupKey, setStyleGroupKey] = useState('fightingStyle')
  const [styleFilter, setStyleFilter] = useState('all') // 'all' or 'group:value'
  const [roleFilter, setRoleFilter] = useState('bestFit')
  const [attributeFilter, setAttributeFilter] = useState('')
  const [sortKey, setSortKey] = useState('fit')
  const [sortDir, setSortDir] = useState('desc')
  const [view, setView] = useRememberedView()

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    fetchAllCharactersForBrowse()
      .then((data) => !cancelled && setCharacters(data))
      .catch((err) => !cancelled && setError(err.message || 'Failed to load characters.'))
      .finally(() => !cancelled && setLoading(false))
    // house colours only tint the cards; without them everything shows neutral
    fetchAllHouses()
      .then((data) => !cancelled && setHouses(data))
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [])

  const tintOf = useMemo(() => tintFinder(houses), [houses])

  const rows = useMemo(() => {
    return characters.map((c) => {
      const roleFits = c.attributes ? allRoleRatings(c.attributes, c) : null
      const ladder = ROLES.map((r) => ({
        roleId: r.id,
        label: r.label,
        rating: roleFits ? roleFits[r.id] ?? null : null,
      })).sort((a, b) => (b.rating ?? -1) - (a.rating ?? -1))
      const best = ladder.find((l) => l.rating != null) ?? null
      const categoryAverages = c.attributes
        ? Object.fromEntries(CATEGORIES.map((cat) => [cat.id, average(cat.keys.map((k) => c.attributes[k]))]))
        : null
      return { ...c, roleFits, ladder, best, categoryAverages }
    })
  }, [characters])

  useEffect(() => {
    if (!attributeFilter && sortKey === 'attribute') {
      setSortKey('fit')
      setSortDir('desc')
    }
  }, [attributeFilter, sortKey])

  const houseNames = useMemo(() => Array.from(new Set(characters.map((c) => c.house).filter(Boolean))).sort(), [characters])

  const activeRole = roleFilter === 'bestFit' ? null : ROLES.find((r) => r.id === roleFilter) ?? null
  const styleGroup = STYLE_GROUP_BY_KEY[styleGroupKey]

  const fitFor = useCallback((c) => (activeRole ? c.roleFits?.[activeRole.id] ?? null : c.best?.rating ?? null), [activeRole])

  // The whole roster by the current ranking (overall, or the chosen seat), for the top three.
  const ranking = useMemo(() => [...rows].sort((a, b) => (fitFor(b) ?? -1) - (fitFor(a) ?? -1)), [rows, fitFor])
  const podium = ranking.filter((c) => fitFor(c) != null).slice(0, 3)

  // Search and house first (the style tabs count within these), then style.
  const base = useMemo(() => {
    const q = query.trim().toLowerCase()
    return rows.filter((c) => {
      if (q && !(c.name?.toLowerCase().includes(q) || c.house?.toLowerCase().includes(q))) return false
      if (houseFilter !== 'all' && c.house !== houseFilter) return false
      return true
    })
  }, [rows, query, houseFilter])

  const filtered = useMemo(() => {
    if (styleFilter === 'all') return base
    const [key, value] = styleFilter.split(':')
    return base.filter((c) => c[key] === value)
  }, [base, styleFilter])

  const sorted = useMemo(() => {
    const dir = sortDir === 'asc' ? 1 : -1
    const category = CATEGORIES.find((cat) => cat.id === sortKey)
    const getValue = (c) => {
      if (sortKey === 'fit') return fitFor(c) ?? -1
      if (sortKey === 'name') return c.name ?? ''
      if (sortKey === 'style') return styleGroup.options.indexOf(c[styleGroup.key])
      if (sortKey === 'attribute') return c.attributes?.[attributeFilter] ?? -1
      if (category) return c.categoryAverages?.[category.id] ?? -1
      return -1
    }
    return [...filtered].sort((a, b) => {
      const va = getValue(a)
      const vb = getValue(b)
      if (typeof va === 'string') return va.localeCompare(vb) * dir
      return (va - vb) * dir
    })
  }, [filtered, sortKey, sortDir, fitFor, attributeFilter, styleGroup])

  const handleSort = (key) => {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    else {
      setSortKey(key)
      setSortDir(key === 'name' ? 'asc' : 'desc')
    }
  }

  const chooseAttribute = (v) => {
    setAttributeFilter(v)
    if (v) {
      setSortKey('attribute')
      setSortDir('desc')
    }
  }

  const chooseStyleGroup = (key) => {
    setStyleGroupKey(key)
    setStyleFilter('all')
  }

  const selected = rows.find((c) => c.id === selectedId) ?? null
  const order = sorted.map((c) => c.id)
  const step = (d) => {
    if (!order.length) return
    const i = order.indexOf(selectedId)
    setSelectedId(order[(i + d + order.length) % order.length])
  }

  const rankLabel = activeRole ? activeRole.label : 'Overall'

  const styleCount = (value) => base.filter((c) => c[styleGroup.key] === value).length
  const styleTabs = [{ value: 'all', label: 'All', count: base.length }].concat(
    styleGroup.options.map((o) => ({ value: `${styleGroup.key}:${o}`, label: styleGroup.labels[o], count: styleCount(o) }))
  )

  const hasAttr = Boolean(attributeFilter)
  const rollCols = `28px minmax(210px,2.6fr) 56px repeat(${CATEGORIES.length + (hasAttr ? 1 : 0)},minmax(42px,1fr)) 104px`

  return (
    <PageWrapper className="!p-0 !items-stretch">
      <div className="w-full text-[#ece5d6]">
        {/* Title, and the top three */}
        <header className="max-w-[1240px] mx-auto px-5 sm:px-7 pt-[18px] flex flex-wrap items-end justify-between gap-x-12 gap-y-6">
          <div className="min-w-0">
            <div className="uppercase" style={{ ...CINZEL, fontSize: 10, letterSpacing: '.46em', color: INK.muted }}>
              Game of Thrones
            </div>
            <h1 className="mt-2 leading-none" style={{ ...CINZEL, fontWeight: 500, fontSize: 40, letterSpacing: '.1em', color: INK.cream }}>
              Characters
            </h1>
          </div>
          {podium.length > 0 && (
            <ol className="hidden md:flex border-b border-[rgba(216,184,120,.25)] pb-3" aria-label={`Top three, ${rankLabel}`}>
              {podium.map((c, i) => (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(c.id)}
                    className={`flex flex-col items-center gap-0.5 px-5 cursor-pointer ${FOCUS}`}
                  >
                    <span style={{ ...CINZEL, fontSize: 9, letterSpacing: '.2em', color: INK.muted }}>{['I', 'II', 'III'][i]}</span>
                    <span style={{ ...CINZEL, fontWeight: 600, fontSize: 22, color: i === 0 ? '#e2bc5c' : '#ece5d6' }}>{fitFor(c)}</span>
                    <span className="text-[16px] whitespace-nowrap" style={{ ...GARAMOND, color: '#d3c8b2' }}>
                      {c.name}
                    </span>
                  </button>
                </li>
              ))}
            </ol>
          )}
        </header>

        {/* Ranked by */}
        <section className="max-w-[1240px] mx-auto mt-[22px] px-5 sm:px-7">
          <div className="flex flex-wrap items-baseline justify-between gap-x-8 gap-y-2 py-3.5 border-y border-[rgba(216,184,120,.16)]">
            <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 min-w-0">
              <Label style={{ fontSize: 9.5, letterSpacing: '.34em' }}>Ranked by</Label>
              <span style={{ ...CINZEL, fontWeight: 600, fontSize: 20, color: INK.cream }}>{rankLabel}</span>
            </div>
            <span className="uppercase" style={{ ...CINZEL, fontSize: 10, letterSpacing: '.24em', color: INK.muted }}>
              {sorted.length} of {rows.length}
            </span>
          </div>
        </section>

        {/* Search, filters and view; stays at the top while scrolling */}
        <div className="sticky top-0 z-[5] mt-3 border-b border-[rgba(216,184,120,.1)] backdrop-blur-md" style={{ background: 'rgba(31,29,26,.94)' }}>
          <div className="max-w-[1240px] mx-auto px-5 sm:px-7 py-3 flex flex-col gap-2.5">
            <div className="flex flex-col md:flex-row gap-2">
              <div className="flex gap-2 md:contents">
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by name or house"
                aria-label="Search by name or house"
                className="h-10 min-w-0 flex-1 px-3.5 rounded-[2px] border border-[rgba(216,184,120,.22)] bg-[rgba(255,255,255,.02)] text-[17px] text-[#ece5d6] outline-none focus:border-[rgba(216,184,120,.5)] placeholder:italic placeholder:text-[#7d7566] md:flex-[1.3]"
                style={GARAMOND}
              />
              {/* on phones the view toggle sits beside the search, leaving the style tabs the full width */}
              <div className="sm:hidden shrink-0">
                <Segmented
                  options={[
                    { value: 'banners', label: 'Banners' },
                    { value: 'roll', label: 'Roll' },
                  ]}
                  value={view}
                  onChange={setView}
                />
              </div>
              </div>
              <div className="flex gap-1.5 sm:gap-2 md:flex-[3]">
                <div className="grid grid-cols-3 gap-1.5 sm:gap-2 flex-1 min-w-0">
                  <FilterSelect label="Houses" value={houseFilter} restValue="all" shown={shortHouse(houseFilter)} onChange={setHouseFilter}>
                    <option value="all">All houses</option>
                    {houseNames.map((h) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </FilterSelect>
                  <FilterSelect
                    label="Role"
                    value={roleFilter}
                    restValue="bestFit"
                    shown={activeRole?.label}
                    shownShort={shortRole(activeRole?.label)}
                    onChange={setRoleFilter}
                  >
                    <option value="bestFit">Overall</option>
                    {ROLES.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.label}
                      </option>
                    ))}
                  </FilterSelect>
                  <FilterSelect
                    label="Attribute"
                    value={attributeFilter}
                    restValue=""
                    shown={ATTRIBUTE_LABELS[attributeFilter]}
                    shownShort={ATTRIBUTE_SHORT_LABELS[attributeFilter]}
                    onChange={chooseAttribute}
                  >
                    <option value="">None</option>
                    {ALL_ATTRIBUTE_KEYS.map((key) => (
                      <option key={key} value={key}>
                        {ATTRIBUTE_LABELS[key]}
                      </option>
                    ))}
                  </FilterSelect>
                </div>
                <div className="hidden sm:block">
                  <Segmented
                    options={[
                      { value: 'banners', label: 'Banners' },
                      { value: 'roll', label: 'Roll' },
                    ]}
                    value={view}
                    onChange={setView}
                  />
                </div>
              </div>
            </div>

            {/* Style tabs: one style group at a time, chosen by the switcher */}
            <div className="flex items-center gap-3 min-w-0">
              <div className="relative shrink-0 flex items-center gap-1.5 pr-3 border-r border-[rgba(216,184,120,.2)]">
                <span className="uppercase" style={{ ...CINZEL, fontSize: 10, letterSpacing: '.22em', color: INK.gold }}>
                  {styleGroup.label}
                </span>
                <svg width="8" height="5" viewBox="0 0 8 5" aria-hidden="true" style={{ color: INK.gold }}>
                  <path d="M.5.5 4 4 7.5.5" fill="none" stroke="currentColor" />
                </svg>
                <select
                  aria-label="Style group"
                  value={styleGroupKey}
                  onChange={(e) => chooseStyleGroup(e.target.value)}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                >
                  {STYLE_GROUPS.map((g) => (
                    <option key={g.key} value={g.key}>
                      {g.long}
                    </option>
                  ))}
                </select>
              </div>
              <div
                className="flex gap-x-5 overflow-x-auto whitespace-nowrap min-w-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                role="radiogroup"
                aria-label={`${styleGroup.long} filter`}
              >
                {styleTabs.map((t) => {
                  const on = styleFilter === t.value
                  return (
                    <button
                      key={t.value}
                      type="button"
                      role="radio"
                      aria-checked={on}
                      onClick={() => setStyleFilter(t.value)}
                      className={`flex items-center gap-2 py-1 border-b uppercase cursor-pointer transition-colors ${FOCUS}`}
                      style={{ ...CINZEL, fontSize: 10, letterSpacing: '.2em', color: on ? '#eed49b' : '#9d9483', borderBottomColor: on ? INK.gold : 'transparent' }}
                    >
                      <span>{t.label}</span>
                      <span style={{ color: INK.gold }}>{t.count}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        </div>

        <main className="max-w-[1240px] mx-auto px-5 sm:px-7 pt-6 pb-16">
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

          {!loading && !error && view === 'banners' && (
            <div className="grid gap-2" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(268px, 1fr))' }}>
              {sorted.map((c) => {
                const tint = tintOf(c.house)
                const fit = fitFor(c)
                // the chosen attribute, when there is one: what the cards are sorted by
                const meta = hasAttr && c.attributes ? `${ATTRIBUTE_LABELS[attributeFilter]} ${c.attributes[attributeFilter] ?? '—'}` : null
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setSelectedId(c.id)}
                    className={`w-full text-left flex items-center gap-3.5 min-h-[98px] px-3 py-2.5 rounded-[3px] border border-[rgba(216,184,120,.11)] hover:border-[rgba(216,184,120,.5)] transition-colors cursor-pointer ${FOCUS}`}
                    style={{ background: `linear-gradient(100deg, ${tint}44 0%, ${tint}12 40%, rgba(255,255,255,.012) 75%)` }}
                  >
                    <Portrait character={c} tint={tint} width={52} height={62} />
                    <div className="min-w-0 flex-1">
                      <div className="leading-tight" style={{ ...CINZEL, fontWeight: 600, fontSize: 15, color: INK.cream }}>
                        {c.name}
                      </div>
                      <div className="italic text-[16px] leading-snug" style={{ ...GARAMOND, color: '#b8ad98' }}>
                        {c.house || '—'}
                      </div>
                      {meta && (
                        <div className="mt-0.5 truncate uppercase" style={{ ...CINZEL, fontSize: 8.5, letterSpacing: '.18em', color: INK.muted }}>
                          {meta}
                        </div>
                      )}
                    </div>
                    <span className="shrink-0 pl-1" style={{ ...CINZEL, fontWeight: 600, fontSize: 27, color: tier(fit).color }}>
                      {fit ?? '—'}
                    </span>
                  </button>
                )
              })}
            </div>
          )}

          {!loading && !error && view === 'roll' && (
            <>
              <div className="overflow-x-auto [scrollbar-width:thin]">
                <div className="min-w-[860px]" role="table" aria-label="Characters">
                  {/* sortable heads */}
                  <div className="grid items-end gap-x-3 px-2 pb-2 border-b border-[rgba(216,184,120,.18)]" style={{ gridTemplateColumns: rollCols }} role="row">
                    {[
                      { key: 'fit', label: '#', align: 'start', sortTo: 'fit' },
                      { key: 'name', label: 'Name', align: 'start' },
                      { key: 'fit', label: 'Ovr', align: 'center' },
                      ...CATEGORIES.map((cat) => ({ key: cat.id, label: cat.code, align: 'center', title: cat.label })),
                      ...(hasAttr ? [{ key: 'attribute', label: ATTRIBUTE_SHORT_LABELS[attributeFilter] ?? 'Attr', align: 'center', title: ATTRIBUTE_LABELS[attributeFilter] }] : []),
                      { key: 'style', label: 'Style', align: 'end', title: styleGroup.long },
                    ].map((h, i) => {
                      const on = sortKey === h.key && !(h.label === '#')
                      return (
                        <button
                          key={`${h.key}-${i}`}
                          type="button"
                          role="columnheader"
                          aria-sort={on ? (sortDir === 'desc' ? 'descending' : 'ascending') : 'none'}
                          title={h.title ? `Sort by ${h.title}` : `Sort by ${h.label === 'Ovr' ? 'overall' : h.label.toLowerCase()}`}
                          onClick={() => (h.label === '#' ? (setSortKey('fit'), setSortDir('desc')) : handleSort(h.key))}
                          className={`uppercase whitespace-nowrap cursor-pointer ${h.align === 'center' ? 'text-center' : h.align === 'end' ? 'text-right' : 'text-left'} ${FOCUS}`}
                          style={{ ...CINZEL, fontSize: 9.5, letterSpacing: '.18em', color: on ? '#eed49b' : INK.muted }}
                        >
                          {h.label}
                          {on && <span aria-hidden="true">{sortDir === 'desc' ? ' ▾' : ' ▴'}</span>}
                        </button>
                      )
                    })}
                  </div>

                  {sorted.map((c, i) => {
                    const tint = tintOf(c.house)
                    const fit = fitFor(c)
                    const styleValue = c[styleGroup.key]
                    return (
                      <button
                        key={c.id}
                        type="button"
                        role="row"
                        onClick={() => setSelectedId(c.id)}
                        className={`w-full grid items-center gap-x-3 px-2 py-1.5 border-b border-[rgba(216,184,120,.08)] hover:bg-[rgba(216,184,120,.05)] text-left cursor-pointer transition-colors ${FOCUS}`}
                        style={{ gridTemplateColumns: rollCols }}
                      >
                        <span style={{ ...CINZEL, fontSize: 11, color: INK.muted }}>{i + 1}</span>
                        <span className="flex items-center gap-3 min-w-0">
                          <Portrait character={c} tint={tint} width={30} height={36} />
                          <span className="min-w-0">
                            <span className="block truncate" style={{ ...CINZEL, fontWeight: 600, fontSize: 13.5, color: INK.cream }}>
                              {c.name}
                            </span>
                            <span className="block truncate italic text-[15px] leading-tight" style={{ ...GARAMOND, color: '#a9a08f' }}>
                              {c.house || '—'}
                            </span>
                          </span>
                        </span>
                        <span className="text-center" style={{ ...CINZEL, fontWeight: 600, fontSize: 18, color: tier(fit).color }}>
                          {fit ?? '—'}
                        </span>
                        {CATEGORIES.map((cat) => {
                          const v = c.categoryAverages?.[cat.id]
                          return (
                            <span
                              key={cat.id}
                              className="text-center"
                              style={{ ...GARAMOND, fontSize: 17, color: tier(v).color, fontWeight: sortKey === cat.id ? 600 : 400 }}
                            >
                              {v ?? '—'}
                            </span>
                          )
                        })}
                        {hasAttr && (
                          <span className="text-center" style={{ ...GARAMOND, fontSize: 17, fontWeight: 600, color: tier(c.attributes?.[attributeFilter]).color }}>
                            {c.attributes?.[attributeFilter] ?? '—'}
                          </span>
                        )}
                        <span className="text-right truncate uppercase" style={{ ...CINZEL, fontSize: 9, letterSpacing: '.16em', color: INK.muted }}>
                          {styleValue ? styleGroup.labels[styleValue] : 'Unset'}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>
              {/* what the column codes mean */}
              <div className="flex flex-wrap gap-x-5 gap-y-1.5 pt-4 px-2">
                {CATEGORIES.map((cat) => (
                  <span key={cat.id} className="flex items-baseline gap-2">
                    <span style={{ ...CINZEL, fontSize: 10, letterSpacing: '.16em', color: INK.gold }}>{cat.code}</span>
                    <span className="italic text-[15px]" style={{ ...GARAMOND, color: INK.muted }}>
                      {cat.label}
                    </span>
                  </span>
                ))}
              </div>
            </>
          )}

          {!loading && !error && sorted.length === 0 && (
            <p className="py-[60px] text-center text-[19px] italic" style={{ ...GARAMOND, color: INK.muted }}>
              No one in the archive answers to that.
            </p>
          )}
        </main>
      </div>

      <AnimatePresence>
        {selected && (
          <CharacterWindow
            key="window"
            character={selected}
            tint={tintOf(selected.house)}
            activeRole={activeRole}
            onClose={() => setSelectedId(null)}
            onStep={step}
          />
        )}
      </AnimatePresence>
    </PageWrapper>
  )
}

/* ---------------- the character window ---------------- */

function CharacterWindow({ character: c, tint, activeRole, onClose, onStep }) {
  // The seat being looked at: picked in the ladder, else the page's chosen
  // role, else their best. Resets when stepping to another character.
  const defaultSeat = activeRole ? activeRole.id : c.best?.roleId ?? null
  const [seatId, setSeatId] = useState(defaultSeat)
  const [openGroups, setOpenGroups] = useState({}) // phones: groups fold, closed at first
  useEffect(() => {
    setSeatId(defaultSeat)
    setOpenGroups({})
  }, [c.id]) // eslint-disable-line react-hooks/exhaustive-deps

  // Esc closes; the arrow keys step through the characters shown.
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowRight') onStep(1)
      if (e.key === 'ArrowLeft') onStep(-1)
    }
    window.addEventListener('keydown', onKey)
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = overflow
    }
  }, [onClose, onStep])

  const seat = c.ladder.find((l) => l.roleId === seatId) ?? null
  const rating = seat?.rating ?? null
  const weights = weightsForRole(seatId, c)
  const rated = c.ladder.filter((l) => l.rating != null)
  const strongest = rated[0]
  const weakest = rated[rated.length - 1]
  const isBest = seatId === c.best?.roleId

  return (
    <div className="fixed inset-0 z-[60] flex items-start sm:items-center justify-center sm:p-4" role="dialog" aria-modal="true" aria-label={c.name}>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        onClick={onClose}
        className="absolute inset-0"
        style={{ background: 'rgba(8,7,6,.86)' }}
      />
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 24 }}
        transition={{ duration: 0.24, ease: 'easeOut' }}
        className="relative w-full max-w-[1040px] h-full sm:h-auto sm:max-h-[92vh] overflow-y-auto sm:rounded-[3px] border border-[rgba(216,184,120,.25)]"
        style={{ background: '#1d1b18' }}
      >
        {/* Header: portrait, name and house, and the seat's rating */}
        <div className="relative px-5 sm:px-7 pt-6 pb-5" style={{ background: `linear-gradient(110deg, ${tint}dd 0%, ${tint}66 42%, #22201c 92%)` }}>
          <div className="absolute top-3 right-3 flex gap-2">
            {[
              { label: 'Previous character', glyph: '‹', on: () => onStep(-1) },
              { label: 'Next character', glyph: '›', on: () => onStep(1) },
              { label: 'Close', glyph: '✕', on: onClose },
            ].map((b) => (
              <button
                key={b.label}
                type="button"
                onClick={b.on}
                aria-label={b.label}
                className={`w-9 h-9 flex items-center justify-center rounded-[2px] border border-[rgba(216,184,120,.35)] hover:border-[#d8b878] cursor-pointer transition-colors ${FOCUS}`}
                style={{ ...CINZEL, fontSize: b.glyph === '✕' ? 13 : 18, color: '#eed49b', background: 'rgba(20,18,16,.55)' }}
              >
                {b.glyph}
              </button>
            ))}
          </div>

          {/* phones: portrait and rating side by side, name and house beneath;
              wider: portrait, name, rating in one row */}
          <div className="grid items-center gap-x-6 gap-y-4 grid-cols-[auto_1fr] [grid-template-areas:'portrait_rating'_'name_name'] sm:grid-cols-[auto_1fr_auto] sm:[grid-template-areas:'portrait_name_rating'] sm:pr-36">
            <div style={{ gridArea: 'portrait' }}>
              <Portrait character={c} tint={tint} width={88} height={110} />
            </div>
            <div className="min-w-0" style={{ gridArea: 'name' }}>
              <h2 className="leading-tight" style={{ ...CINZEL, fontWeight: 600, fontSize: 'clamp(24px, 4vw, 32px)', letterSpacing: '.03em', color: INK.cream }}>
                {c.name}
              </h2>
              <div className="italic text-[19px]" style={{ ...GARAMOND, color: '#d9ccb0' }}>
                {c.house || '—'}
              </div>
            </div>
            {rating != null && (
              <div
                className="flex items-center gap-4 px-4 py-3 border border-[rgba(216,184,120,.35)] justify-self-start self-end sm:self-center"
                style={{ gridArea: 'rating', background: 'rgba(20,18,16,.55)' }}
              >
                <span style={{ ...CINZEL, fontWeight: 600, fontSize: 40, lineHeight: 1, color: tier(rating).color }}>{rating}</span>
                <span>
                  <Label color={INK.muted} style={{ fontSize: 8.5 }}>
                    {isBest ? 'Overall' : 'Seat rating'}
                  </Label>
                  <span className="block text-[16px]" style={{ ...GARAMOND, color: INK.cream }}>
                    {seat.label}
                  </span>
                  <Label color={tier(rating).color} style={{ fontSize: 8.5 }}>
                    {tier(rating).label}
                  </Label>
                </span>
              </div>
            )}
          </div>
        </div>

        {/* The four styles */}
        <div className="grid grid-cols-2 md:grid-cols-4 border-y border-[rgba(216,184,120,.14)]">
          {STYLE_GROUPS.map((g, i) => (
            <div
              key={g.key}
              className={`px-5 py-3 ${i % 2 === 1 ? 'border-l' : ''} ${i >= 2 ? 'border-t md:border-t-0' : ''} ${i === 2 ? 'md:border-l' : ''} border-[rgba(216,184,120,.12)]`}
            >
              <Label>{g.long}</Label>
              <div className="mt-1 text-[18px]" style={{ ...GARAMOND, color: c[g.key] ? '#ece5d6' : '#7d7566', fontStyle: c[g.key] ? 'normal' : 'italic' }}>
                {c[g.key] ? g.labels[c[g.key]] : 'Unset'}
              </div>
            </div>
          ))}
        </div>

        {!c.attributes ? (
          <p className="px-7 py-10 italic text-[18px]" style={{ ...GARAMOND, color: '#c08d80' }}>
            No attributes have been entered for this character yet.
          </p>
        ) : (
          <div className="flex flex-wrap">
            {/* Attributes, by group; those the chosen seat weighs are marked */}
            <div className="px-5 sm:px-7 py-6 min-w-0" style={{ flex: '1.7 1 440px' }}>
              <div className="flex items-center gap-4">
                <Label color={INK.gold}>Attributes</Label>
                <div className="flex-1 h-px" style={{ background: 'rgba(216,184,120,.16)' }} />
                {seat && (
                  <span className="italic text-[15px] text-right" style={{ ...GARAMOND, color: INK.muted }}>
                    Marked attributes weigh on {seat.label}
                  </span>
                )}
              </div>
              <div className="mt-4 grid gap-x-8 gap-y-5" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))' }}>
                {CATEGORIES.map((cat) => {
                  const avg = c.categoryAverages?.[cat.id]
                  const open = !!openGroups[cat.id]
                  return (
                    <div key={cat.id}>
                      <button
                        type="button"
                        onClick={() => setOpenGroups((p) => ({ ...p, [cat.id]: !p[cat.id] }))}
                        aria-expanded={open}
                        className={`w-full flex items-baseline justify-between gap-3 pb-1.5 border-b border-[rgba(216,184,120,.16)] cursor-pointer md:cursor-default ${FOCUS}`}
                      >
                        <span className="flex items-center gap-2">
                          <svg width="8" height="5" viewBox="0 0 8 5" aria-hidden="true" className={`md:hidden transition-transform ${open ? 'rotate-180' : ''}`} style={{ color: INK.gold }}>
                            <path d="M.5.5 4 4 7.5.5" fill="none" stroke="currentColor" />
                          </svg>
                          <Label color="#c9bea8" style={{ letterSpacing: '.26em' }}>
                            {cat.label}
                          </Label>
                        </span>
                        <span style={{ ...CINZEL, fontWeight: 600, fontSize: 16, color: tier(avg).color }}>{avg ?? '—'}</span>
                      </button>
                      <div className={`${open ? 'block' : 'hidden'} md:block`}>
                        {cat.keys.map((key) => {
                          const v = c.attributes[key]
                          const keyed = weights ? weights[key] !== undefined : false
                          return (
                            <div
                              key={key}
                              className="flex items-center gap-3 pl-2 pr-1.5 py-[5px] border-l-2"
                              style={{ borderLeftColor: keyed ? INK.gold : 'transparent', background: keyed ? 'rgba(216,184,120,.08)' : 'transparent' }}
                            >
                              <span className="flex-none w-[118px] truncate text-[16px]" style={{ ...GARAMOND, color: keyed ? INK.cream : '#b8ad98' }}>
                                {ATTRIBUTE_LABELS[key]}
                              </span>
                              <span className="flex-1 h-[3px] min-w-[30px]" style={{ background: 'rgba(216,184,120,.12)' }}>
                                <span className="block h-full" style={{ width: `${v ?? 0}%`, background: keyed ? INK.gold : 'rgba(216,184,120,.35)' }} />
                              </span>
                              <span className="flex-none w-7 text-right" style={{ ...CINZEL, fontWeight: 600, fontSize: 14, color: tier(v).color }}>
                                {v ?? '—'}
                              </span>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Every council seat, strongest first; pick one to see what it weighs */}
            <div className="px-5 sm:px-7 py-6 border-t min-[900px]:border-t-0 min-[900px]:border-l border-[rgba(216,184,120,.12)] min-w-0" style={{ flex: '1 1 300px' }}>
              <div className="flex items-center gap-4">
                <Label color={INK.gold}>Council Seats</Label>
                <div className="flex-1 h-px" style={{ background: 'rgba(216,184,120,.16)' }} />
              </div>
              {strongest && (
                <p className="mt-2 italic text-[16px] text-pretty" style={{ ...GARAMOND, color: INK.muted }}>
                  Strongest as {strongest.label} at {strongest.rating}.
                  {weakest && weakest !== strongest && ` Weakest as ${weakest.label} at ${weakest.rating}.`} Select a seat to see what it weighs.
                </p>
              )}
              <ul className="mt-3 border-t border-[rgba(216,184,120,.1)]">
                {c.ladder.map((l) => {
                  const on = l.roleId === seatId
                  const rated = l.rating != null
                  return (
                    <li key={l.roleId}>
                      <button
                        type="button"
                        disabled={!rated}
                        aria-pressed={on}
                        onClick={() => setSeatId(l.roleId)}
                        className={`w-full text-left px-2.5 py-2 border-b border-[rgba(216,184,120,.08)] border-l-2 transition-colors ${rated ? 'cursor-pointer hover:bg-[rgba(216,184,120,.05)]' : 'cursor-default'} ${FOCUS}`}
                        style={{ borderLeftColor: on ? INK.gold : 'transparent', background: on ? 'rgba(216,184,120,.1)' : undefined }}
                      >
                        <span className="flex items-baseline justify-between gap-3">
                          <span className="flex items-baseline gap-2 min-w-0">
                            <span className="truncate" style={{ ...CINZEL, fontSize: 12.5, color: on ? '#f6ecd4' : '#d3c8b2' }}>
                              {l.label}
                            </span>
                            {rated && (
                              <span className="uppercase shrink-0" style={{ ...CINZEL, fontSize: 8, letterSpacing: '.18em', color: tier(l.rating).color }}>
                                {tier(l.rating).label}
                              </span>
                            )}
                          </span>
                          {rated ? (
                            <span style={{ ...CINZEL, fontWeight: 600, fontSize: 17, color: tier(l.rating).color }}>{l.rating}</span>
                          ) : (
                            <span className="italic text-[14px]" style={{ ...GARAMOND, color: INK.muted }}>
                              no style set
                            </span>
                          )}
                        </span>
                        <span className="mt-1.5 block h-[2px]" style={{ background: 'rgba(216,184,120,.1)' }}>
                          <span className="block h-full" style={{ width: `${l.rating ?? 0}%`, background: on ? '#e2bc5c' : 'rgba(216,184,120,.45)' }} />
                        </span>
                      </button>
                    </li>
                  )
                })}
              </ul>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  )
}