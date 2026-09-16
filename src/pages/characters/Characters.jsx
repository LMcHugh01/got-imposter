import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import PageWrapper from '../../components/PageWrapper'
import { fetchAllCharactersForBrowse } from '../../lib/characterAttributesService'
import { allRoleRatings, bestFitRoles } from '../../gameEngine/ratings'
import { ROLES, ROLE_WEIGHTS } from '../../data/roleWeights'
import { CHAMPION_STYLES, CHAMPION_STYLE_LABELS, CHAMPION_STYLE_WEIGHTS } from '../../data/championStyles'
import {
  ATTRIBUTE_CATEGORIES,
  ATTRIBUTE_LABELS,
  ATTRIBUTE_SHORT_LABELS,
  ALL_ATTRIBUTE_KEYS,
} from '../../data/attributes'

const ALL_ROLE_IDS = ROLES.map((r) => r.id)
const ROLE_LABEL = Object.fromEntries(ROLES.map((r) => [r.id, r.label]))
const CATEGORY_IDS = ATTRIBUTE_CATEGORIES.map((c) => c.id)

// Short codes for the category-average columns (mirrors the pattern
// already used for ROLE_SHORT_LABEL / ATTRIBUTE_SHORT_LABELS below) —
// needed because these columns are now only ~56px wide.
const CATEGORY_SHORT_LABEL = {
  combat: 'CMB',
  wits: 'WIT',
  statecraft: 'STA',
  leadership: 'LDR',
  devotion: 'DEV',
  presence: 'PRE',
}

const CATEGORY_COLUMNS = ATTRIBUTE_CATEGORIES.map((cat) => ({
  key: cat.id,
  label: CATEGORY_SHORT_LABEL[cat.id] ?? cat.id.toUpperCase(),
  fullLabel: cat.label,
}))

// Flattened attribute columns, in category order — still used by the
// (unabridged) coefficients reference table.
const ATTRIBUTE_COLUMNS = ATTRIBUTE_CATEGORIES.flatMap((cat) =>
  cat.attributes.map((key, i) => ({
    key,
    label: ATTRIBUTE_SHORT_LABELS[key],
    fullLabel: ATTRIBUTE_LABELS[key],
    categoryId: cat.id,
    categoryLabel: cat.label,
    isFirstInCategory: i === 0,
  }))
)

// Fixed pixel widths for every column of the main table. table-layout is
// `fixed` and driven by a <colgroup> using exactly these values, so the
// sticky left-offsets for the first three (frozen) columns below are
// always accurate regardless of content or viewport width.
const NAME_COL_W = 128
const ROLE_COL_W = 52
const STYLE_COL_W = 80
const CATEGORY_COL_W = 56
const ATTRIBUTE_COL_W = 92
const TABLE_W = NAME_COL_W + ROLE_COL_W + STYLE_COL_W + CATEGORY_COL_W * CATEGORY_COLUMNS.length + ATTRIBUTE_COL_W

// Left offset for the one frozen ("sticky") column — Name+House — so it
// stays visible while the rest of the table (including Role and Style)
// scrolls horizontally on narrow/mobile screens.
const STICKY_LEFT = {
  name: 0,
}

// Display-only tiering (Pillar 4: numbers need context). Not part of the
// engine — purely for coloring/labeling this page.
function tierLabel(value) {
  if (value >= 80) return 'Excellent'
  if (value >= 65) return 'Strong'
  if (value >= 50) return 'Solid'
  if (value >= 35) return 'Weak'
  return 'Poor'
}

function tierColor(value) {
  if (value >= 80) return 'text-got-gold'
  if (value >= 65) return 'text-got-parchment'
  if (value >= 50) return 'text-got-parchment/70'
  if (value >= 35) return 'text-stone-500'
  return 'text-got-red-bright/80'
}

function average(values) {
  const nums = values.filter((v) => typeof v === 'number')
  if (!nums.length) return null
  return Math.round(nums.reduce((a, b) => a + b, 0) / nums.length)
}

// The Role column shows either "Best Fit" (whichever role rates highest)
// or the rating for one specific role, depending on the Role filter.
function roleColumnValue(c, roleFilter) {
  if (roleFilter === 'bestFit') return c.bestFit?.rating ?? null
  return c.roleFits?.[roleFilter] ?? null
}

function roleColumnDisplay(c, roleFilter) {
  if (roleFilter === 'bestFit') {
    if (!c.bestFit) return null
    return { rating: c.bestFit.rating, roleId: c.bestFit.roleId }
  }
  const rating = c.roleFits?.[roleFilter]
  return rating != null ? { rating, roleId: roleFilter } : null
}

// The Attribute column only shows a value once the user picks an
// attribute in the filter; otherwise it's blank.
function attributeColumnValue(c, attributeFilter) {
  if (!attributeFilter) return null
  return c.attributes?.[attributeFilter] ?? null
}

// A role's coefficient table — Champion is keyed by fighting style
// instead of ROLE_WEIGHTS, same special-case as gameEngine/ratings.js.
function coefficientsForRole(roleId, fightingStyle) {
  if (!roleId) return null
  if (roleId === 'champion') {
    return fightingStyle ? CHAMPION_STYLE_WEIGHTS[fightingStyle] : null
  }
  return ROLE_WEIGHTS[roleId] ?? null
}

function SortHeader({ label, sortKey, activeKey, direction, onSort, align = 'left', title, dividerLeft, sticky, leftOffset }) {
  const isActive = activeKey === sortKey
  return (
    <th
      title={title}
      className={[
        'py-2 px-2 whitespace-nowrap select-none cursor-pointer transition-colors overflow-hidden',
        align === 'right' ? 'text-right' : 'text-left',
        isActive ? 'text-got-gold' : 'text-stone-500 hover:text-stone-300',
        dividerLeft ? 'border-l border-stone-700' : '',
        sticky ? 'sticky z-20 bg-stone-900' : '',
      ].join(' ')}
      style={{ fontFamily: 'Cinzel, serif', fontSize: '0.7rem', letterSpacing: '0.08em', ...(sticky ? { left: leftOffset } : {}) }}
      onClick={() => onSort(sortKey)}
    >
      <span className="truncate block">
        {label}
        {isActive && <span className="ml-1">{direction === 'asc' ? '▲' : '▼'}</span>}
      </span>
    </th>
  )
}

function AttributeBar({ label, value, highlighted, dimmed, weight }) {
  return (
    <div
      className={[
        'flex items-center gap-3 rounded transition-all',
        highlighted ? '-mx-2 px-2 py-0.5 bg-got-gold/10 ring-1 ring-got-gold/40' : '',
        dimmed ? 'opacity-30' : '',
      ].join(' ')}
    >
      <span
        className={['w-28 text-xs shrink-0', highlighted ? 'text-got-gold' : 'text-got-parchment/60'].join(' ')}
        style={{ fontFamily: 'Cinzel, serif', letterSpacing: '0.05em' }}
      >
        {label}
      </span>
      <div className="flex-1 h-2 rounded-full bg-stone-800 overflow-hidden">
        <div
          className={['h-full rounded-full', highlighted ? 'bg-got-gold' : 'bg-got-gold/70'].join(' ')}
          style={{ width: `${Math.max(0, Math.min(100, value ?? 0))}%` }}
        />
      </div>
      <span
        className={['w-8 text-right text-sm', highlighted ? 'text-got-gold' : 'text-got-parchment'].join(' ')}
        style={{ fontFamily: 'Cinzel, serif' }}
      >
        {value ?? '—'}
      </span>
      {weight != null && (
        <span
          className="w-10 text-right text-[0.65rem] text-got-gold/70"
          style={{ fontFamily: 'Cinzel, serif' }}
          title="Weight this attribute carries toward the highlighted role"
        >
          ×{weight.toFixed(2)}
        </span>
      )}
    </div>
  )
}

function CharacterHero({ character }) {
  const [highlightedRoleId, setHighlightedRoleId] = useState(null)

  if (!character) {
    return (
      <div className="w-full rounded-lg border border-stone-800 bg-stone-900/40 p-8 flex flex-col items-center gap-3 text-center">
        <span className="text-4xl select-none">📜</span>
        <p className="text-got-parchment/40 text-base italic" style={{ fontFamily: 'EB Garamond, serif' }}>
          Select a character from the table to see their full attribute and role-fit breakdown.
        </p>
      </div>
    )
  }

  const attributes = character.attributes
  const style = character.fightingStyle
  const ratingsByRole = attributes ? allRoleRatings(attributes, style) : null
  const roleRatingsList = ratingsByRole
    ? ROLES.map((r) => ({ id: r.id, label: r.label, rating: ratingsByRole[r.id] })).sort(
        (a, b) => (b.rating ?? -1) - (a.rating ?? -1)
      )
    : []
  const best = attributes ? bestFitRoles(attributes, ALL_ROLE_IDS, 1, style)[0] : null

  const highlightedWeights = highlightedRoleId ? coefficientsForRole(highlightedRoleId, style) : null

  const handleRoleClick = (roleId, rating) => {
    if (rating == null) return // e.g. Champion with no fighting style set — nothing to highlight
    setHighlightedRoleId((current) => (current === roleId ? null : roleId))
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="w-full rounded-lg border border-got-gold/30 bg-stone-900/60 p-6 flex flex-col md:flex-row gap-6"
    >
      {/* Identity */}
      <div className="flex flex-row md:flex-col items-center md:items-start gap-4 md:w-48 shrink-0">
        {character.image_url ? (
          <img
            src={character.image_url}
            alt={character.name}
            className="w-20 h-20 md:w-24 md:h-24 rounded-full object-cover border-2 border-got-gold/40"
          />
        ) : (
          <div
            className="w-20 h-20 md:w-24 md:h-24 rounded-full flex items-center justify-center border-2 border-got-gold/20"
            style={{ background: 'rgba(201,168,76,0.06)' }}
          >
            <span className="text-3xl">⚔️</span>
          </div>
        )}
        <div>
          <h3 className="text-xl font-bold text-got-gold leading-tight" style={{ fontFamily: 'Cinzel, serif' }}>
            {character.name}
          </h3>
          {character.house && (
            <p className="text-sm text-got-parchment/50 italic mt-1" style={{ fontFamily: 'EB Garamond, serif' }}>
              House {character.house}
            </p>
          )}
          {style ? (
            <p className="text-xs text-got-parchment/40 mt-1" style={{ fontFamily: 'Cinzel, serif', letterSpacing: '0.05em' }}>
              Style: <span className="text-got-parchment/70">{CHAMPION_STYLE_LABELS[style]}</span>
            </p>
          ) : (
            <p className="text-xs text-got-red-bright/50 mt-1 italic" style={{ fontFamily: 'EB Garamond, serif' }}>
              No fighting style set
            </p>
          )}
          {best && (
            <p className="text-xs text-got-parchment/40 mt-2" style={{ fontFamily: 'Cinzel, serif', letterSpacing: '0.05em' }}>
              Best fit:{' '}
              <span className="text-got-gold">
                {ROLE_LABEL[best.roleId]} {best.rating}
              </span>
            </p>
          )}
        </div>
      </div>

      {!attributes ? (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-got-red-bright/70 text-sm italic text-center" style={{ fontFamily: 'EB Garamond, serif' }}>
            No attributes have been entered for this character yet.
          </p>
        </div>
      ) : (
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Attributes, grouped by category */}
          <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
            {ATTRIBUTE_CATEGORIES.map((cat) => (
              <div key={cat.id} className="flex flex-col gap-1.5">
                <p
                  className="text-got-gold/70 text-xs tracking-widest uppercase mb-0.5"
                  style={{ fontFamily: 'Cinzel, serif' }}
                >
                  {cat.label}
                </p>
                {cat.attributes.map((key) => {
                  const weight = highlightedWeights ? highlightedWeights[key] : undefined
                  const isHighlighted = Boolean(highlightedWeights) && weight !== undefined
                  const isDimmed = Boolean(highlightedWeights) && weight === undefined
                  return (
                    <AttributeBar
                      key={key}
                      label={ATTRIBUTE_LABELS[key]}
                      value={attributes[key]}
                      highlighted={isHighlighted}
                      dimmed={isDimmed}
                      weight={isHighlighted ? weight : null}
                    />
                  )
                })}
              </div>
            ))}
          </div>

          {/* Role list — click a role to highlight the attributes that feed its score */}
          <div className="flex flex-col gap-1.5">
            <p className="text-got-gold/70 text-xs tracking-widest uppercase mb-1" style={{ fontFamily: 'Cinzel, serif' }}>
              Role
            </p>
            {highlightedRoleId && (
              <p className="text-got-parchment/40 text-xs italic -mt-1 mb-0.5" style={{ fontFamily: 'EB Garamond, serif' }}>
                Highlighting {ROLE_LABEL[highlightedRoleId]}'s key attributes
              </p>
            )}
            {roleRatingsList.map((r, i) => {
              const isTop = i === 0
              const isSelected = highlightedRoleId === r.id
              const clickable = r.rating != null
              return (
                <button
                  key={r.id}
                  type="button"
                  disabled={!clickable}
                  onClick={() => handleRoleClick(r.id, r.rating)}
                  className={[
                    'flex items-center justify-between text-sm text-left rounded px-2 py-1 -mx-2 transition-colors',
                    clickable ? 'cursor-pointer' : 'cursor-default',
                    isSelected ? 'bg-got-gold/10 ring-1 ring-got-gold/40' : clickable ? 'hover:bg-stone-800/60' : '',
                  ].join(' ')}
                >
                  <span
                    className={isSelected || isTop ? 'text-got-gold' : 'text-got-parchment/70'}
                    style={{ fontFamily: 'EB Garamond, serif' }}
                  >
                    {r.label}
                  </span>
                  {r.rating != null ? (
                    <span className={tierColor(r.rating)} style={{ fontFamily: 'Cinzel, serif' }}>
                      {r.rating} <span className="text-xs opacity-60">{tierLabel(r.rating)}</span>
                    </span>
                  ) : (
                    <span className="text-stone-700 text-xs italic">no style set</span>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </motion.div>
  )
}

function CoefficientsTable() {
  return (
    <div className="w-full overflow-x-auto rounded-lg border border-stone-800">
      <table className="w-full border-collapse min-w-[1400px]">
        <thead>
          <tr className="border-b border-stone-800 bg-stone-900/60">
            <th
              className="py-3 px-3 text-left whitespace-nowrap text-stone-500 sticky left-0 z-10 bg-stone-900"
              style={{ fontFamily: 'Cinzel, serif', fontSize: '0.7rem', letterSpacing: '0.08em' }}
            >
              ROLE
            </th>
            {ATTRIBUTE_COLUMNS.map((col) => (
              <th
                key={col.key}
                title={col.fullLabel}
                className={[
                  'py-3 px-3 text-right whitespace-nowrap text-stone-500',
                  col.isFirstInCategory ? 'border-l border-stone-700' : '',
                ].join(' ')}
                style={{ fontFamily: 'Cinzel, serif', fontSize: '0.7rem', letterSpacing: '0.08em' }}
              >
                {col.label}
              </th>
            ))}
            <th
              className="py-3 px-3 text-right whitespace-nowrap text-got-gold/70 border-l border-stone-700"
              style={{ fontFamily: 'Cinzel, serif', fontSize: '0.7rem', letterSpacing: '0.08em' }}
            >
              TOTAL
            </th>
          </tr>
        </thead>
        <tbody>
          {ROLES.map((role) => {
            const weights = ROLE_WEIGHTS[role.id] ?? {}
            const total = Object.values(weights).reduce((a, b) => a + b, 0)
            return (
              <tr key={role.id} className="border-b border-stone-900">
                <td
                  className="py-2.5 px-3 whitespace-nowrap text-got-parchment sticky left-0 z-10 bg-got-black"
                  style={{ fontFamily: 'Cinzel, serif' }}
                >
                  {role.label}
                </td>
                {ATTRIBUTE_COLUMNS.map((col) => {
                  const weight = weights[col.key]
                  const hasWeight = weight !== undefined
                  const isNegative = hasWeight && weight < 0
                  return (
                    <td
                      key={col.key}
                      className={[
                        'py-2.5 px-3 text-right text-sm',
                        !hasWeight ? 'text-stone-800' : isNegative ? 'text-got-red-bright/90 font-bold' : 'text-got-parchment/80',
                        col.isFirstInCategory ? 'border-l border-stone-900' : '',
                      ].join(' ')}
                      style={{ fontFamily: 'Cinzel, serif' }}
                    >
                      {hasWeight ? weight.toFixed(2) : '—'}
                    </td>
                  )
                })}
                <td
                  className="py-2.5 px-3 text-right text-sm text-got-gold/80 border-l border-stone-900"
                  style={{ fontFamily: 'Cinzel, serif' }}
                >
                  {total.toFixed(2)}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

export default function Characters() {
  const [characters, setCharacters] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const [selectedId, setSelectedId] = useState(null)
  const [search, setSearch] = useState('')
  const [houseFilter, setHouseFilter] = useState('all')
  const [styleFilter, setStyleFilter] = useState('all')
  const [roleFilter, setRoleFilter] = useState('bestFit')
  const [attributeFilter, setAttributeFilter] = useState('')
  const [sortKey, setSortKey] = useState('name')
  const [sortDir, setSortDir] = useState('asc')
  const [showCoefficients, setShowCoefficients] = useState(false)

  // Click-to-reveal popover for the Role column: { rowId, label, x, y } | null.
  // Positioned with `fixed` (viewport) coordinates captured at click time so
  // it always renders on top, unclipped by the table's horizontal-scroll
  // container.
  const [rolePopover, setRolePopover] = useState(null)

  useEffect(() => {
    if (!rolePopover) return
    const close = () => setRolePopover(null)
    window.addEventListener('scroll', close, true)
    window.addEventListener('resize', close)
    document.addEventListener('click', close)
    return () => {
      window.removeEventListener('scroll', close, true)
      window.removeEventListener('resize', close)
      document.removeEventListener('click', close)
    }
  }, [rolePopover])

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

  const houses = useMemo(() => {
    const set = new Set(characters.map((c) => c.house).filter(Boolean))
    return ['all', ...Array.from(set).sort()]
  }, [characters])

  const rows = useMemo(() => {
    return characters.map((c) => {
      const roleFits = c.attributes ? allRoleRatings(c.attributes, c.fightingStyle) : null
      const categoryAverages = c.attributes
        ? Object.fromEntries(
            ATTRIBUTE_CATEGORIES.map((cat) => [cat.id, average(cat.attributes.map((key) => c.attributes[key]))])
          )
        : null
      return {
        ...c,
        roleFits,
        categoryAverages,
        bestFit: c.attributes ? bestFitRoles(c.attributes, ALL_ROLE_IDS, 1, c.fightingStyle)[0] : null,
      }
    })
  }, [characters])

  const filtered = useMemo(() => {
    return rows.filter((c) => {
      if (houseFilter !== 'all' && c.house !== houseFilter) return false
      if (styleFilter !== 'all' && c.fightingStyle !== styleFilter) return false
      if (search.trim() && !c.name?.toLowerCase().includes(search.trim().toLowerCase())) return false
      return true
    })
  }, [rows, houseFilter, styleFilter, search])

  const sorted = useMemo(() => {
    const dir = sortDir === 'asc' ? 1 : -1

    const getValue = (c) => {
      if (sortKey === 'name') return c.name ?? ''
      if (sortKey === 'style') return c.fightingStyle ? CHAMPION_STYLE_LABELS[c.fightingStyle] : ''
      if (sortKey === 'role') return roleColumnValue(c, roleFilter) ?? -1
      if (sortKey === 'attribute') return attributeColumnValue(c, attributeFilter) ?? -1
      if (CATEGORY_IDS.includes(sortKey)) return c.categoryAverages?.[sortKey] ?? -1
      return -1
    }

    return [...filtered].sort((a, b) => {
      const va = getValue(a)
      const vb = getValue(b)
      if (typeof va === 'string') return va.localeCompare(vb) * dir
      return (va - vb) * dir
    })
  }, [filtered, sortKey, sortDir, roleFilter, attributeFilter])

  const handleSort = (key) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir(key === 'name' ? 'asc' : 'desc')
    }
  }

  const selectedCharacter = rows.find((c) => c.id === selectedId) ?? null

  const handleRowClick = (c) => {
    setSelectedId((current) => (current === c.id ? null : c.id))
  }

  const handleRoleNumberClick = (e, rowId, label) => {
    e.stopPropagation()
    if (!label) return
    const rect = e.currentTarget.getBoundingClientRect()
    setRolePopover((current) =>
      current?.rowId === rowId ? null : { rowId, label, x: rect.left + rect.width / 2, y: rect.top }
    )
  }

  const attributeColumnLabel = attributeFilter ? ATTRIBUTE_SHORT_LABELS[attributeFilter] : 'ATTR'
  const roleHeaderTitle =
    roleFilter === 'bestFit'
      ? 'Best Fit rating — tap a number to see which role'
      : `${ROLE_LABEL[roleFilter]} rating — tap a number to see the role name`

  return (
    <PageWrapper className="justify-start max-w-6xl">
      <div className="w-full flex flex-col gap-6">
        {/* Header */}
        <div className="text-center pt-2">
          <h1 className="text-3xl font-bold tracking-widest uppercase text-got-gold" style={{ fontFamily: 'Cinzel, serif' }}>
            Characters
          </h1>
          <div className="gold-divider mt-3" />
          <p className="text-got-parchment/40 text-sm mt-3 italic" style={{ fontFamily: 'EB Garamond, serif' }}>
            The people of Westeros, and how well they fit each seat on the council.
          </p>
        </div>

        {/* Hero / profile */}
        <AnimatePresence mode="wait">
          <CharacterHero key={selectedCharacter?.id ?? 'none'} character={selectedCharacter} />
        </AnimatePresence>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name…"
            className="w-full sm:w-56 py-2 px-3 rounded border border-stone-700 bg-stone-900/60 text-got-parchment text-sm placeholder:text-stone-600 focus:outline-none focus:border-got-gold/50"
            style={{ fontFamily: 'EB Garamond, serif' }}
          />

          <div className="flex flex-wrap items-center gap-3">
            <select
              value={houseFilter}
              onChange={(e) => setHouseFilter(e.target.value)}
              className="py-2 px-3 rounded border border-stone-700 bg-stone-900/60 text-got-parchment text-sm focus:outline-none focus:border-got-gold/50"
              style={{ fontFamily: 'Cinzel, serif' }}
            >
              {houses.map((h) => (
                <option key={h} value={h}>
                  {h === 'all' ? 'All Houses' : h}
                </option>
              ))}
            </select>

            <select
              value={styleFilter}
              onChange={(e) => setStyleFilter(e.target.value)}
              className="py-2 px-3 rounded border border-stone-700 bg-stone-900/60 text-got-parchment text-sm focus:outline-none focus:border-got-gold/50"
              style={{ fontFamily: 'Cinzel, serif' }}
            >
              <option value="all">All Styles</option>
              {CHAMPION_STYLES.map((s) => (
                <option key={s} value={s}>
                  {CHAMPION_STYLE_LABELS[s]}
                </option>
              ))}
            </select>

            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              title="Which role the Role column shows"
              className="py-2 px-3 rounded border border-stone-700 bg-stone-900/60 text-got-parchment text-sm focus:outline-none focus:border-got-gold/50"
              style={{ fontFamily: 'Cinzel, serif' }}
            >
              <option value="bestFit">Role: Best Fit</option>
              {ROLES.map((r) => (
                <option key={r.id} value={r.id}>
                  Role: {r.label}
                </option>
              ))}
            </select>

            <select
              value={attributeFilter}
              onChange={(e) => setAttributeFilter(e.target.value)}
              title="Which attribute the Attribute column shows"
              className="py-2 px-3 rounded border border-stone-700 bg-stone-900/60 text-got-parchment text-sm focus:outline-none focus:border-got-gold/50"
              style={{ fontFamily: 'Cinzel, serif' }}
            >
              <option value="">Attribute: none</option>
              {ALL_ATTRIBUTE_KEYS.map((key) => (
                <option key={key} value={key}>
                  Attribute: {ATTRIBUTE_LABELS[key]}
                </option>
              ))}
            </select>

            <button
              onClick={() => setShowCoefficients((v) => !v)}
              className={[
                'py-2 px-4 rounded border text-sm tracking-wide transition-all',
                showCoefficients
                  ? 'border-got-gold bg-got-gold/10 text-got-gold'
                  : 'border-stone-700 text-stone-400 hover:border-stone-500 hover:text-stone-300',
              ].join(' ')}
              style={{ fontFamily: 'Cinzel, serif' }}
            >
              {showCoefficients ? 'Hide Coefficients' : 'Show Coefficients'}
            </button>

            <span className="text-stone-600 text-xs" style={{ fontFamily: 'Cinzel, serif' }}>
              {sorted.length} / {characters.length}
            </span>
          </div>
        </div>

        {/* Role weight coefficients (reference table) */}
        <AnimatePresence>
          {showCoefficients && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.25 }}
              className="overflow-hidden"
            >
              <p className="text-got-gold/70 text-xs tracking-widest uppercase mb-2" style={{ fontFamily: 'Cinzel, serif' }}>
                Role Weight Coefficients
              </p>
              <CoefficientsTable />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Table */}
        {loading && (
          <p className="text-center text-got-parchment/50 italic py-12" style={{ fontFamily: 'EB Garamond, serif' }}>
            Loading the archives...
          </p>
        )}

        {error && (
          <p className="text-center text-got-red-bright py-12" style={{ fontFamily: 'EB Garamond, serif' }}>
            {error}
          </p>
        )}

        {!loading && !error && (
          <div className="w-full overflow-x-auto rounded-lg border border-stone-800">
            <table
              className="table-fixed"
              style={{ width: TABLE_W, borderCollapse: 'separate', borderSpacing: 0 }}
            >
              <colgroup>
                <col style={{ width: NAME_COL_W }} />
                <col style={{ width: ROLE_COL_W }} />
                <col style={{ width: STYLE_COL_W }} />
                {CATEGORY_COLUMNS.map((col) => (
                  <col key={col.key} style={{ width: CATEGORY_COL_W }} />
                ))}
                <col style={{ width: ATTRIBUTE_COL_W }} />
              </colgroup>
              <thead>
                <tr className="border-b border-stone-800 bg-stone-900">
                  <SortHeader
                    label="Name"
                    sortKey="name"
                    activeKey={sortKey}
                    direction={sortDir}
                    onSort={handleSort}
                    sticky
                    leftOffset={STICKY_LEFT.name}
                  />
                  <SortHeader
                    label="Role"
                    title={roleHeaderTitle}
                    sortKey="role"
                    activeKey={sortKey}
                    direction={sortDir}
                    onSort={handleSort}
                    align="right"
                    dividerLeft
                  />
                  <SortHeader
                    label="Style"
                    sortKey="style"
                    activeKey={sortKey}
                    direction={sortDir}
                    onSort={handleSort}
                    title="Champion fighting style"
                  />
                  {CATEGORY_COLUMNS.map((col, i) => (
                    <SortHeader
                      key={col.key}
                      label={col.label}
                      title={`Average of the ${col.fullLabel} attributes`}
                      sortKey={col.key}
                      activeKey={sortKey}
                      direction={sortDir}
                      onSort={handleSort}
                      align="right"
                      dividerLeft={i === 0}
                    />
                  ))}
                  <SortHeader
                    label={attributeColumnLabel}
                    title={attributeFilter ? ATTRIBUTE_LABELS[attributeFilter] : 'Choose an attribute in the filters above'}
                    sortKey="attribute"
                    activeKey={sortKey}
                    direction={sortDir}
                    onSort={handleSort}
                    align="right"
                    dividerLeft
                  />
                </tr>
              </thead>
              <tbody>
                {sorted.map((c) => {
                  const isSelected = selectedId === c.id
                  const roleDisplay = roleColumnDisplay(c, roleFilter)
                  const attrValue = attributeColumnValue(c, attributeFilter)
                  const frozenBg = isSelected ? 'bg-got-gold/10' : 'bg-got-black'
                  return (
                    <tr
                      key={c.id}
                      onClick={() => handleRowClick(c)}
                      className={[
                        'border-b border-stone-900 cursor-pointer transition-colors',
                        isSelected ? 'bg-got-gold/10' : 'hover:bg-stone-900/50',
                        !c.hasAttributes ? 'opacity-50' : '',
                      ].join(' ')}
                    >
                      {/* Name + House (frozen col 1) */}
                      <td
                        className={['py-2 px-2 sticky z-10 overflow-hidden bg-got-charcoal', frozenBg].join(' ')}
                        style={{ left: STICKY_LEFT.name }}
                      >
                        <div className="flex flex-col leading-tight">
                          <span
                            className={['truncate', isSelected ? 'text-got-gold' : 'text-got-parchment'].join(' ')}
                            title={c.name}
                            style={{ fontFamily: 'Cinzel, serif' }}
                          >
                            {c.name}
                          </span>
                          {c.house && (
                            <span
                              className="truncate text-[0.65rem] text-got-parchment/40 italic"
                              title={c.house}
                              style={{ fontFamily: 'EB Garamond, serif' }}
                            >
                              {c.house}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Role rating — tap the number to see which role it is */}
                      <td className="py-2 px-2 text-right text-sm border-l border-stone-900">
                        {roleDisplay ? (
                          <button
                            type="button"
                            onClick={(e) => handleRoleNumberClick(e, c.id, ROLE_LABEL[roleDisplay.roleId])}
                            className={['w-full text-right', tierColor(roleDisplay.rating)].join(' ')}
                            style={{ fontFamily: 'Cinzel, serif' }}
                          >
                            {roleDisplay.rating}
                          </button>
                        ) : (
                          <span className="text-stone-700">—</span>
                        )}
                      </td>

                      {/* Style */}
                      <td className="py-2 px-2 text-sm">
                        {c.fightingStyle ? (
                          <span
                            className="truncate block text-got-parchment/70"
                            title={CHAMPION_STYLE_LABELS[c.fightingStyle]}
                            style={{ fontFamily: 'EB Garamond, serif' }}
                          >
                            {CHAMPION_STYLE_LABELS[c.fightingStyle]}
                          </span>
                        ) : (
                          <span className="text-got-red-bright/50 italic text-xs">unset</span>
                        )}
                      </td>

                      {CATEGORY_COLUMNS.map((col, i) => {
                        const value = c.categoryAverages?.[col.key]
                        return (
                          <td
                            key={col.key}
                            className={[
                              'py-2 px-2 text-right text-sm',
                              value != null ? tierColor(value) : 'text-stone-800',
                              i === 0 ? 'border-l border-stone-900' : '',
                            ].join(' ')}
                            style={{ fontFamily: 'Cinzel, serif' }}
                          >
                            {value ?? '—'}
                          </td>
                        )
                      })}

                      <td className="py-2 px-2 text-right text-sm border-l border-stone-900" style={{ fontFamily: 'Cinzel, serif' }}>
                        {attributeFilter ? (
                          attrValue != null ? (
                            <span className={tierColor(attrValue)}>{attrValue}</span>
                          ) : (
                            <span className="text-stone-700">—</span>
                          )
                        ) : (
                          <span className="text-stone-800">—</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>

            {sorted.length === 0 && (
              <p className="text-center text-stone-600 italic py-8" style={{ fontFamily: 'EB Garamond, serif' }}>
                No characters match these filters.
              </p>
            )}
          </div>
        )}
      </div>

      {/* Role-name popover for the Role column — fixed/viewport-positioned so it
          always renders above the table regardless of horizontal scroll. */}
      {rolePopover && (
        <div
          className="fixed z-50 -translate-x-1/2 -translate-y-full px-2 py-1 rounded border border-got-gold/40 bg-stone-800 text-got-gold text-xs whitespace-nowrap shadow-lg pointer-events-none"
          style={{ left: rolePopover.x, top: rolePopover.y - 6, fontFamily: 'Cinzel, serif' }}
        >
          {rolePopover.label}
        </div>
      )}
    </PageWrapper>
  )
}