import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import PageWrapper from '../../components/PageWrapper'
import { fetchAllCharactersForBrowse } from '../../lib/characterAttributesService'
import { allRoleRatings, weightsFor } from '../../gameEngine/ratings'
import { ROLES } from '../../data/roleWeights'
import { CHAMPION_STYLES, CHAMPION_STYLE_LABELS } from '../../data/championStyles'
import { LEADERSHIP_STYLES, LEADERSHIP_STYLE_LABELS } from '../../data/leadershipStyles'
import { COMMAND_STYLES, COMMAND_STYLE_LABELS } from '../../data/commandStyles'
import { COIN_STYLES, COIN_STYLE_LABELS } from '../../data/coinStyles'
import { ATTRIBUTE_CATEGORIES, ATTRIBUTE_LABELS, ATTRIBUTE_SHORT_LABELS, ALL_ATTRIBUTE_KEYS } from '../../data/attributes'

/* ------------------------------------------------------------------ *
 * Palette — lifted directly from the "Archive" redesign mockup.
 * ------------------------------------------------------------------ */
const PANEL_1 = '#17130e'
const PANEL_2 = '#0c0a09'
const SHEET_TOP = '#15110d'
const SHEET_BOTTOM = '#0b0a09'

const GOLD = '#c9a75a'
const GOLD_SOFT = '#d9b871'
const CHIP_GOLD = '#e8cf96'
const TEXT_BRIGHT = '#f5efe1'
const TEXT_BODY = '#efe7d7'
const TEXT_MUTED = '#9a8f78'
const TEXT_FAINT = '#a09170'
const TEXT_LABEL = '#c0ae84'

const BORDER = '#3a3122'
const BORDER_SOFT = '#2b2419'
const BORDER_FAINT = '#1d1811'
const BORDER_HAIR = '#241e15'
const BORDER_ROW = '#16130e'
const BORDER_GRID = '#33291c'
const TRACK = '#1a1610'
const ACCENT = '#8c6a3c'

const CINZEL = "'Cinzel', serif"
const GARAMOND = "'EB Garamond', Georgia, serif"

/* ------------------------------------------------------------------ *
 * Data helpers
 * ------------------------------------------------------------------ */
const ROLE_LABEL = Object.fromEntries(ROLES.map((r) => [r.id, r.label]))

const CATEGORY_CODE = {
  combat: 'CMB',
  wits: 'WIT',
  statecraft: 'STA',
  leadership: 'LDR',
  devotion: 'DEV',
  presence: 'PRE',
}

const CATEGORIES = ATTRIBUTE_CATEGORIES.map((cat) => ({
  id: cat.id,
  label: cat.label,
  code: CATEGORY_CODE[cat.id] ?? cat.id.slice(0, 3).toUpperCase(),
  keys: cat.attributes,
}))

// The 4 independent style categories a character can be tagged with —
// fightingStyle (Champion), leadershipStyle (King/Hand/Consort),
// commandStyle (Commander), coinStyle (Master of Coin). Each option in
// the style filter dropdown is one of these grouped by category, so
// filtering by e.g. "Tactician" only matches on commandStyle, never
// collides with a same-named value in another category. `key` is the
// character field each one reads.
const STYLE_GROUPS = [
  { key: 'fightingStyle', label: 'Fighting Style', options: CHAMPION_STYLES, labels: CHAMPION_STYLE_LABELS },
  { key: 'leadershipStyle', label: 'Leadership Style', options: LEADERSHIP_STYLES, labels: LEADERSHIP_STYLE_LABELS },
  { key: 'commandStyle', label: 'Command Style', options: COMMAND_STYLES, labels: COMMAND_STYLE_LABELS },
  { key: 'coinStyle', label: 'Coin Style', options: COIN_STYLES, labels: COIN_STYLE_LABELS },
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

// Display-only tiering — colors/labels a rating, doesn't touch the engine.
function tier(v) {
  if (v == null) return { label: '—', color: TEXT_MUTED }
  if (v >= 85) return { label: 'Excellent', color: GOLD_SOFT }
  if (v >= 70) return { label: 'Strong', color: TEXT_BODY }
  if (v >= 55) return { label: 'Solid', color: '#c5b89f' }
  if (v >= 40) return { label: 'Weak', color: '#b09a7e' }
  return { label: 'Poor', color: '#c08d80' }
}

function barColor(v, keyed) {
  if (keyed) return 'linear-gradient(90deg,#8a6f34,#d9b871)'
  return (v ?? 0) >= 70 ? '#8d7a4e' : '#4f462f'
}

// A role's coefficient table, for any role — style-driven (Champion,
// King, Hand, Consort, Commander, Master of Coin) or flat. Reads straight
// off gameEngine/ratings.js's own weightsFor(), the exact same lookup
// roleRating() uses internally, so this can never drift out of sync with
// which roles are style-driven. `character` just needs to be the whole
// character object — weightsFor() reads whichever of fightingStyle/
// leadershipStyle/commandStyle/coinStyle the role actually needs and
// ignores the rest. Only used here to decide which attributes get the
// gold "keyed" highlight — the actual coefficient numbers are never
// displayed (see the Attributes panel below).
function coefficientsForRole(roleId, character) {
  if (!roleId || !character) return null
  return weightsFor(roleId, character)
}

/* ------------------------------------------------------------------ *
 * Small building blocks
 * ------------------------------------------------------------------ */
function SectionLabel({ children, right }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 11, marginBottom: 14 }}>
      <div style={{ width: 8, height: 8, flex: 'none', border: `1px solid ${ACCENT}`, transform: 'rotate(45deg)' }} />
      <div style={{ fontFamily: CINZEL, fontSize: 11, letterSpacing: '.26em', color: TEXT_LABEL, textTransform: 'uppercase' }}>
        {children}
      </div>
      <div style={{ flex: 1, height: 1, background: `linear-gradient(90deg, ${BORDER}, transparent)` }} />
      {right}
    </div>
  )
}

function Chip({ gold, children }) {
  return (
    <div
      style={{
        fontFamily: CINZEL,
        fontSize: 11,
        letterSpacing: '.14em',
        textTransform: 'uppercase',
        padding: '6px 10px',
        border: `1px solid ${gold ? ACCENT : BORDER_SOFT}`,
        background: gold ? 'rgba(201,167,90,.12)' : PANEL_2,
        color: gold ? CHIP_GOLD : TEXT_MUTED,
      }}
    >
      {children}
    </div>
  )
}

function GhostButton({ onClick, small, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        border: `1px solid ${BORDER}`,
        background: 'transparent',
        color: '#c4b696',
        fontFamily: CINZEL,
        fontWeight: 600,
        fontSize: small ? 10 : 11,
        letterSpacing: '.16em',
        textTransform: 'uppercase',
        padding: small ? '8px 11px' : '12px 15px',
        minHeight: small ? 36 : 44,
        cursor: 'pointer',
        borderRadius: 0,
        flex: 'none',
      }}
    >
      {children}
    </button>
  )
}

// Matches Houses.jsx's search/filter treatment — bg-got-charcoal/40 over a
// stone-700 border reads correctly against the app's shared background,
// unlike the old hardcoded INPUT_BG/BORDER_SOFT hex values below, which
// were tuned only for this page's own (now-removed) background override.
const selectClassName =
  'rounded border border-stone-700 bg-got-charcoal/40 text-got-parchment focus:outline-none focus:border-got-gold/50 cursor-pointer'
const selectStyle = {
  flex: '1 1 175px',
  minWidth: 0,
  fontSize: '.72rem',
  letterSpacing: '.14em',
  textTransform: 'uppercase',
  padding: '12px 11px',
  minHeight: 46,
  fontFamily: CINZEL,
}

/* ------------------------------------------------------------------ */

export default function Characters() {
  const [characters, setCharacters] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const [selectedId, setSelectedId] = useState(null)
  const [openCategories, setOpenCategories] = useState({})
  const [query, setQuery] = useState('')
  const [houseFilter, setHouseFilter] = useState('all')
  const [styleFilter, setStyleFilter] = useState('all')
  const [roleFilter, setRoleFilter] = useState('bestFit')
  const [attributeFilter, setAttributeFilter] = useState('')
  const [sortKey, setSortKey] = useState('fit')
  const [sortDir, setSortDir] = useState('desc')

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)

    fetchAllCharactersForBrowse()
      .then((data) => {
        if (!cancelled) setCharacters(data)
      })
      .catch((err) => {
        if (!cancelled) setError(err.message || 'Failed to load characters.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [])

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

  const houses = useMemo(() => {
    const set = new Set(characters.map((c) => c.house).filter(Boolean))
    return Array.from(set).sort()
  }, [characters])

  const activeRole = roleFilter === 'bestFit' ? null : ROLES.find((r) => r.id === roleFilter) ?? null
  const activeStyleGroup = styleFilter !== 'all' ? STYLE_GROUP_BY_KEY[styleFilter.split(':')[0]] : STYLE_GROUP_BY_KEY.fightingStyle

  const fitFor = (c) => (activeRole ? c.roleFits?.[activeRole.id] ?? null : c.best?.rating ?? null)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return rows.filter((c) => {
      if (q && !(c.name?.toLowerCase().includes(q) || c.house?.toLowerCase().includes(q))) return false
      if (houseFilter !== 'all' && c.house !== houseFilter) return false
      if (styleFilter !== 'all') {
        const [key, value] = styleFilter.split(':')
        if (c[key] !== value) return false
      }
      return true
    })
  }, [rows, query, houseFilter, styleFilter])

  const sorted = useMemo(() => {
    const dir = sortDir === 'asc' ? 1 : -1
    const category = CATEGORIES.find((cat) => cat.id === sortKey)

    const getValue = (c) => {
      if (sortKey === 'fit') return fitFor(c) ?? -1
      if (sortKey === 'name') return c.name ?? ''
      if (sortKey === 'style') return activeStyleGroup.options.indexOf(c[activeStyleGroup.key])
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtered, sortKey, sortDir, roleFilter, attributeFilter])

  const handleSort = (key) => {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    else {
      setSortKey(key)
      setSortDir(key === 'name' ? 'asc' : 'desc')
    }
  }

  const headerCellStyle = (key, align) => ({
    fontFamily: CINZEL,
    fontSize: 10.5,
    letterSpacing: '.2em',
    textTransform: 'uppercase',
    color: sortKey === key ? CHIP_GOLD : TEXT_FAINT,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    textAlign: align || 'left',
  })
  const sortArrow = (key) => (sortKey === key ? (sortDir === 'desc' ? ' ↓' : ' ↑') : '')

  const selected = rows.find((c) => c.id === selectedId) ?? null

  // Every category starts collapsed for a newly selected character.
  useEffect(() => {
    setOpenCategories({})
  }, [selectedId])
  const ladderRoleId = activeRole ? activeRole.id : selected?.best?.roleId ?? null
  const highlightedWeights = selected ? coefficientsForRole(ladderRoleId, selected) : null
  const selectedFit = selected ? fitFor(selected) : null
  const rosterTitle = activeRole ? `Ranked as ${activeRole.label}` : 'Ranked by best fit'
  const gridCols = `minmax(196px,1.7fr)${attributeFilter ? ' 70px' : ''} 74px repeat(${CATEGORIES.length},minmax(50px,.62fr)) 128px`

  return (
    <PageWrapper className="!p-0 !items-stretch">
      <div style={{ color: TEXT_BODY, fontFamily: GARAMOND, minHeight: '100vh', width: '100%', paddingBottom: 96, position: 'relative' }}>
        <div
          style={{
            position: 'fixed',
            inset: 0,
            pointerEvents: 'none',
            background:
              'radial-gradient(900px 460px at 50% -8%, rgba(201,167,90,.13), transparent 70%), repeating-linear-gradient(135deg, rgba(201,167,90,.022) 0 1px, transparent 1px 7px)',
          }}
        />

        <div style={{ position: 'relative', maxWidth: 1240, margin: '0 auto', padding: '0 16px' }}>
          <header style={{ padding: '26px 0 20px', textAlign: 'center' }}>
            <div style={{ fontFamily: CINZEL, fontSize: 11, letterSpacing: '.38em', color: TEXT_FAINT, textTransform: 'uppercase' }}>
              The Archive
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14, marginTop: 13 }}>
              <div style={{ flex: 1, maxWidth: 140, height: 1, background: 'linear-gradient(90deg, transparent, #4a3f28)' }} />
              <h1 style={{ margin: 0, fontFamily: CINZEL, fontWeight: 700, fontSize: 29, lineHeight: 1.15, letterSpacing: '.06em', color: TEXT_BRIGHT }}>
                Characters
              </h1>
              <div style={{ flex: 1, maxWidth: 140, height: 1, background: 'linear-gradient(270deg, transparent, #4a3f28)' }} />
            </div>
            <div style={{ fontSize: 16, color: TEXT_MUTED, marginTop: 8, fontStyle: 'italic' }}>
              The people of Westeros, and how well they fit each seat on the council.
            </div>
          </header>

          {loading && (
            <p style={{ textAlign: 'center', color: TEXT_MUTED, fontStyle: 'italic', padding: '48px 0' }}>Loading the archives...</p>
          )}
          {error && <p style={{ textAlign: 'center', color: '#c08d80', padding: '48px 0' }}>{error}</p>}

          {!loading && !error && (
            <section style={{ padding: '22px 0 0' }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 9, alignItems: 'center' }}>
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search by name or house"
                  className="rounded border border-stone-700 bg-got-charcoal/40 text-got-parchment placeholder:text-stone-600 focus:outline-none focus:border-got-gold/50"
                  style={{
                    flex: '2 1 220px',
                    minWidth: 0,
                    fontSize: 13,
                    letterSpacing: '.08em',
                    padding: '12px 13px',
                    minHeight: 46,
                    fontFamily: GARAMOND,
                  }}
                />
                <select value={houseFilter} onChange={(e) => setHouseFilter(e.target.value)} className={selectClassName} style={selectStyle}>
                  <option value="all">All houses</option>
                  {houses.map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </select>
                <select value={styleFilter} onChange={(e) => setStyleFilter(e.target.value)} className={selectClassName} style={selectStyle}>
                  <option value="all">All styles</option>
                  {STYLE_GROUPS.map((group) => (
                    <optgroup key={group.key} label={group.label}>
                      {group.options.map((s) => (
                        <option key={`${group.key}:${s}`} value={`${group.key}:${s}`}>
                          {group.labels[s]}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
                <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} className={selectClassName} style={selectStyle}>
                  <option value="bestFit">Role · Best fit</option>
                  {ROLES.map((r) => (
                    <option key={r.id} value={r.id}>
                      Role · {r.label}
                    </option>
                  ))}
                </select>
                <select value={attributeFilter} onChange={(e) => setAttributeFilter(e.target.value)} className={selectClassName} style={selectStyle}>
                  <option value="">Attribute · none</option>
                  {ALL_ATTRIBUTE_KEYS.map((key) => (
                    <option key={key} value={key}>
                      Attribute · {ATTRIBUTE_LABELS[key]}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 16 }}>
                <div style={{ width: 8, height: 8, flex: 'none', border: `1px solid ${ACCENT}`, transform: 'rotate(45deg)' }} />
                <div style={{ fontFamily: CINZEL, fontSize: 11, letterSpacing: '.26em', color: TEXT_LABEL, textTransform: 'uppercase' }}>
                  {rosterTitle}
                </div>
                <div style={{ flex: 1, height: 1, background: `linear-gradient(90deg, ${BORDER}, transparent)` }} />
                <div style={{ fontFamily: CINZEL, fontSize: 11, letterSpacing: '.16em', color: TEXT_MUTED, textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
                  {sorted.length} of {characters.length}
                </div>
              </div>

              <div style={{ overflowX: 'auto', marginTop: 6 }}>
                <div style={{ minWidth: 730 }}>
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: gridCols,
                      gap: 10,
                      alignItems: 'end',
                      padding: '12px 8px 9px',
                      borderBottom: `1px solid ${BORDER_GRID}`,
                    }}
                  >
                    <div onClick={() => handleSort('name')} title="Sort by name" style={headerCellStyle('name')}>
                      Name{sortArrow('name')}
                    </div>
                    {attributeFilter && (
                      <div
                        onClick={() => handleSort('attribute')}
                        title={ATTRIBUTE_LABELS[attributeFilter]}
                        style={headerCellStyle('attribute', 'right')}
                      >
                        {ATTRIBUTE_SHORT_LABELS[attributeFilter] ?? 'ATTR'}
                        {sortArrow('attribute')}
                      </div>
                    )}
                    <div onClick={() => handleSort('fit')} title="Role fit" style={headerCellStyle('fit', 'center')}>
                      OVR{sortArrow('fit')}
                    </div>
                    {CATEGORIES.map((cat) => (
                      <div key={cat.id} onClick={() => handleSort(cat.id)} title={cat.label} style={headerCellStyle(cat.id, 'center')}>
                        {cat.code}
                        {sortArrow(cat.id)}
                      </div>
                    ))}
                    <div onClick={() => handleSort('style')} title={activeStyleGroup.label} style={headerCellStyle('style', 'right')}>
                      {styleFilter === 'all' ? 'Style' : activeStyleGroup.label}{sortArrow('style')}
                    </div>
                  </div>

                  {sorted.map((c) => {
                    const on = c.id === selectedId
                    const fit = fitFor(c)
                    return (
                      <div
                        key={c.id}
                        onClick={() => setSelectedId((current) => (current === c.id ? null : c.id))}
                        style={{
                          display: 'grid',
                          gridTemplateColumns: gridCols,
                          gap: 10,
                          alignItems: 'center',
                          padding: '11px 8px',
                          cursor: 'pointer',
                          borderBottom: `1px solid ${BORDER_ROW}`,
                          borderLeft: on ? `2px solid ${GOLD}` : '2px solid transparent',
                          background: on ? 'linear-gradient(90deg,rgba(201,167,90,.13),transparent 65%)' : 'transparent',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 11, minWidth: 0 }}>
                          <div
                            style={{
                              width: 9,
                              height: 9,
                              flex: 'none',
                              transform: 'rotate(45deg)',
                              border: '1px solid ' + ((fit ?? 0) >= 85 ? ACCENT : '#2f281c'),
                              background: (fit ?? 0) >= 85 ? GOLD : 'transparent',
                            }}
                          />
                          <div style={{ minWidth: 0 }}>
                            <div
                              style={{
                                fontFamily: CINZEL,
                                fontSize: 15.5,
                                lineHeight: 1.25,
                                color: on ? TEXT_BRIGHT : '#e8dcc2',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                              }}
                            >
                              {c.name}
                            </div>
                            <div
                              style={{
                                fontSize: 14,
                                lineHeight: 1.3,
                                color: '#8f8571',
                                fontStyle: 'italic',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                              }}
                            >
                              {c.house}
                            </div>
                          </div>
                        </div>
                        {attributeFilter && (
                          <div style={{ fontFamily: CINZEL, fontSize: 15, textAlign: 'right', color: tier(c.attributes?.[attributeFilter]).color }}>
                            {c.attributes?.[attributeFilter] ?? '—'}
                          </div>
                        )}
                        <div style={{ fontFamily: CINZEL, fontWeight: 700, fontSize: 18, textAlign: 'center', color: tier(fit).color }}>
                          {fit ?? '—'}
                        </div>
                        {CATEGORIES.map((cat) => {
                          const v = c.categoryAverages?.[cat.id]
                          return (
                            <div key={cat.id} style={{ fontFamily: CINZEL, fontSize: 15, textAlign: 'center', color: tier(v).color }}>
                              {v ?? '—'}
                            </div>
                          )
                        })}
                        <div
                          style={{
                            fontFamily: CINZEL,
                            fontSize: 10.5,
                            letterSpacing: '.14em',
                            textTransform: 'uppercase',
                            textAlign: 'right',
                            color: TEXT_MUTED,
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                        >
                          {c[activeStyleGroup.key] ? activeStyleGroup.labels[c[activeStyleGroup.key]] : 'Unset'}
                        </div>
                      </div>
                    )
                  })}

                  {sorted.length === 0 && (
                    <div style={{ padding: '34px 8px', fontSize: 16, color: TEXT_MUTED, fontStyle: 'italic' }}>
                      No one in the archive answers to that.
                    </div>
                  )}
                </div>
              </div>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 20px', padding: '16px 8px 0' }}>
                {CATEGORIES.map((cat) => (
                  <div key={cat.id} style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                    <span style={{ fontFamily: CINZEL, fontSize: 11, letterSpacing: '.14em', color: TEXT_LABEL, textTransform: 'uppercase' }}>
                      {cat.code}
                    </span>
                    <span style={{ fontSize: 15, color: TEXT_MUTED }}>{cat.label}</span>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>

        <AnimatePresence>
          {selected && (
            <div style={{ position: 'fixed', inset: 0, zIndex: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                onClick={() => setSelectedId(null)}
                style={{ position: 'absolute', inset: 0, background: 'rgba(4,4,4,.86)' }}
              />
              <motion.div
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 24 }}
                transition={{ duration: 0.24, ease: 'easeOut' }}
                style={{
                  position: 'relative',
                  width: '100%',
                  maxWidth: 1180,
                  maxHeight: '90vh',
                  overflowY: 'auto',
                  border: `1px solid ${BORDER}`,
                  background: `linear-gradient(${SHEET_TOP}, ${SHEET_BOTTOM})`,
                  padding: '22px 26px 30px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 10 }}>
                  <GhostButton small onClick={() => setSelectedId(null)}>
                    Close
                  </GhostButton>
                </div>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '26px 34px' }}>
                  <div style={{ flex: '1 1 236px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 16 }}>
                    {/* Top: image + name/house */}
                    <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
                      <div
                        style={{
                          width: 74,
                          height: 92,
                          flex: 'none',
                          border: `1px solid ${BORDER}`,
                          background: `linear-gradient(${PANEL_1}, ${PANEL_2})`,
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 6,
                          overflow: 'hidden',
                        }}
                      >
                        {selected.image_url ? (
                          <img src={selected.image_url} alt={selected.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          <>
                            <span style={{ fontFamily: CINZEL, fontWeight: 600, fontSize: 19, color: GOLD }}>{initials(selected.name)}</span>
                            <span style={{ fontFamily: CINZEL, fontSize: 8.5, letterSpacing: '.16em', color: '#6d6352', textTransform: 'uppercase' }}>
                              Portrait
                            </span>
                          </>
                        )}
                      </div>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <h2 style={{ margin: 0, fontFamily: CINZEL, fontWeight: 700, fontSize: 25, lineHeight: 1.15, color: TEXT_BRIGHT }}>
                          {selected.name}
                        </h2>
                        <div style={{ fontSize: 16, color: TEXT_MUTED, fontStyle: 'italic', marginTop: 3 }}>{selected.house || '—'}</div>
                      </div>
                    </div>

                    {/* Below: styles, full width — fills the space the
                        short image leaves under it */}
                    <div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 18px' }}>
                        {STYLE_GROUPS.map((group) =>
                          selected[group.key] ? (
                            <div key={group.key} style={{ fontSize: 14 }}>
                              <div
                                style={{
                                  fontFamily: CINZEL,
                                  fontSize: 10.5,
                                  letterSpacing: '.12em',
                                  color: TEXT_FAINT,
                                  textTransform: 'uppercase',
                                }}
                              >
                                {group.label}:
                              </div>
                              <div style={{ color: TEXT_BODY }}>{group.labels[selected[group.key]]}</div>
                            </div>
                          ) : null
                        )}
                        {STYLE_GROUPS.every((group) => !selected[group.key]) && (
                          <div style={{ gridColumn: '1 / -1', fontSize: 14, fontStyle: 'italic', color: TEXT_MUTED }}>No style set</div>
                        )}
                      </div>
                      {!selected.attributes && (
                        <p style={{ margin: '12px 0 0', fontSize: 15, fontStyle: 'italic', color: '#c08d80' }}>
                          No attributes have been entered for this character yet.
                        </p>
                      )}
                    </div>
                  </div>

                  {selected.attributes && (
                    <div style={{ flex: '3 1 480px', minWidth: 0 }}>
                      <SectionLabel>Attributes</SectionLabel>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(228px,1fr))', gap: '18px 30px' }}>
                        {CATEGORIES.map((cat) => {
                          const avg = selected.categoryAverages?.[cat.id]
                          const isOpen = !!openCategories[cat.id]
                          return (
                            <div key={cat.id}>
                              <div
                                onClick={() => setOpenCategories((prev) => ({ ...prev, [cat.id]: !prev[cat.id] }))}
                                style={{
                                  display: 'flex',
                                  justifyContent: 'space-between',
                                  alignItems: 'baseline',
                                  gap: 10,
                                  paddingBottom: 7,
                                  borderBottom: `1px solid ${BORDER_HAIR}`,
                                  cursor: 'pointer',
                                  userSelect: 'none',
                                }}
                              >
                                <span style={{ display: 'flex', alignItems: 'baseline', gap: 8, fontFamily: CINZEL, fontSize: 10.5, letterSpacing: '.24em', color: TEXT_FAINT, textTransform: 'uppercase' }}>
                                  <span style={{ display: 'inline-block', width: 9, color: ACCENT }}>{isOpen ? '▾' : '▸'}</span>
                                  {cat.label}
                                </span>
                                <span style={{ fontFamily: CINZEL, fontWeight: 600, fontSize: 15, color: tier(avg).color }}>{avg ?? '—'}</span>
                              </div>
                              {isOpen &&
                                cat.keys.map((key) => {
                                const value = selected.attributes[key]
                                const coef = highlightedWeights ? highlightedWeights[key] : undefined
                                const keyed = coef !== undefined
                                return (
                                  <div
                                    key={key}
                                    style={{
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: 9,
                                      padding: '6px 6px 6px 8px',
                                      borderLeft: keyed ? `2px solid ${ACCENT}` : '2px solid transparent',
                                      background: keyed ? 'linear-gradient(90deg,rgba(201,167,90,.09),transparent 70%)' : 'transparent',
                                    }}
                                  >
                                    <span
                                      style={{
                                        fontSize: 15.5,
                                        flex: '0 0 108px',
                                        minWidth: 0,
                                        whiteSpace: 'nowrap',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        color: keyed ? '#e8dcc2' : TEXT_MUTED,
                                      }}
                                    >
                                      {ATTRIBUTE_LABELS[key]}
                                    </span>
                                    <div style={{ flex: 1, height: 4, background: TRACK, minWidth: 34 }}>
                                      <div style={{ width: `${value ?? 0}%`, height: '100%', background: barColor(value, keyed) }} />
                                    </div>
                                    <span style={{ fontFamily: CINZEL, fontWeight: 600, fontSize: 14, flex: 'none', width: 26, textAlign: 'right', color: tier(value).color }}>
                                      {value ?? '—'}
                                    </span>
                                  </div>
                                )
                              })}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {selected.attributes && (
                    <div style={{ flex: '1 1 262px', minWidth: 0 }}>
                      <SectionLabel>Seats</SectionLabel>
                      <div style={{ fontSize: 15, color: TEXT_MUTED, fontStyle: 'italic', marginBottom: 10 }}>
                        Weighted against {activeRole ? `${activeRole.label}\u2019s` : 'each seat\u2019s'} key attributes.
                      </div>
                      {selected.ladder.map((l) => {
                        const on = l.roleId === ladderRoleId
                        const clickable = l.rating != null
                        return (
                          <div
                            key={l.roleId}
                            onClick={() => clickable && setRoleFilter(l.roleId)}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 10,
                              padding: '8px 9px',
                              cursor: clickable ? 'pointer' : 'default',
                              borderBottom: `1px solid ${BORDER_ROW}`,
                              borderLeft: on ? `2px solid ${GOLD}` : '2px solid transparent',
                              background: on ? 'linear-gradient(90deg,rgba(201,167,90,.12),transparent)' : 'transparent',
                            }}
                          >
                            <span
                              style={{
                                fontFamily: CINZEL,
                                fontSize: 12.5,
                                flex: '1 1 0',
                                minWidth: 0,
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                color: on ? TEXT_BRIGHT : '#d6cbb4',
                              }}
                            >
                              {l.label}
                            </span>
                            <div style={{ flex: 1, height: 3, background: TRACK, minWidth: 26 }}>
                              <div style={{ width: `${l.rating ?? 0}%`, height: '100%', background: barColor(l.rating, false) }} />
                            </div>
                            {l.rating != null ? (
                              <>
                                <span style={{ fontFamily: CINZEL, fontWeight: 600, fontSize: 15, flex: 'none', width: 28, textAlign: 'right', color: tier(l.rating).color }}>
                                  {l.rating}
                                </span>
                                <span
                                  style={{
                                    fontFamily: CINZEL,
                                    fontSize: 10,
                                    letterSpacing: '.14em',
                                    textTransform: 'uppercase',
                                    flex: 'none',
                                    width: 68,
                                    color: tier(l.rating).color,
                                  }}
                                >
                                  {tier(l.rating).label}
                                </span>
                              </>
                            ) : (
                              <span style={{ fontSize: 11, fontStyle: 'italic', color: TEXT_MUTED, flex: 'none' }}>no style set</span>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </PageWrapper>
  )
}