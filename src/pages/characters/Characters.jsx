import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import PageWrapper from '../../components/PageWrapper'
import { fetchAllCharactersForBrowse } from '../../lib/characterAttributesService'
import { allRoleRatings, bestFitRoles } from '../../gameEngine/ratings'
import { ROLES, ROLE_WEIGHTS } from '../../data/roleWeights'
import {
  ATTRIBUTE_CATEGORIES,
  ATTRIBUTE_LABELS,
  ATTRIBUTE_SHORT_LABELS,
  ALL_ATTRIBUTE_KEYS,
} from '../../data/attributes'

const ALL_ROLE_IDS = ROLES.map((r) => r.id)
const ROLE_LABEL = Object.fromEntries(ROLES.map((r) => [r.id, r.label]))

// Short column headers for the 10 role-fit columns — full name on hover.
const ROLE_SHORT_LABEL = {
  king: 'KING',
  consort: 'CONS',
  hand: 'HAND',
  masterOfWhispers: 'WHISP',
  grandMaester: 'MAES',
  masterOfCoin: 'COIN',
  masterOfLaws: 'LAWS',
  commander: 'CMDR',
  kingsguard: 'KG',
  champion: 'CHMP',
}

const ROLE_COLUMNS = ROLES.map((r) => ({
  key: r.id,
  label: ROLE_SHORT_LABEL[r.id] ?? r.id.toUpperCase(),
  fullLabel: r.label,
}))

// Flattened attribute columns, in category order, each tagged with
// whether it's the first attribute in its category — used to draw a
// visual divider between category blocks in the (very wide) table.
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

function SortHeader({ label, sortKey, activeKey, direction, onSort, align = 'left', title, dividerLeft, sticky }) {
  const isActive = activeKey === sortKey
  return (
    <th
      title={title}
      className={[
        'py-3 px-3 whitespace-nowrap select-none cursor-pointer transition-colors',
        align === 'right' ? 'text-right' : 'text-left',
        isActive ? 'text-got-gold' : 'text-stone-500 hover:text-stone-300',
        dividerLeft ? 'border-l border-stone-700' : '',
        sticky ? 'sticky left-0 z-20 bg-stone-900' : '',
      ].join(' ')}
      style={{ fontFamily: 'Cinzel, serif', fontSize: '0.7rem', letterSpacing: '0.08em' }}
      onClick={() => onSort(sortKey)}
    >
      {label}
      {isActive && <span className="ml-1">{direction === 'asc' ? '▲' : '▼'}</span>}
    </th>
  )
}

function AttributeBar({ label, value }) {
  return (
    <div className="flex items-center gap-3">
      <span
        className="w-28 text-xs text-got-parchment/60 shrink-0"
        style={{ fontFamily: 'Cinzel, serif', letterSpacing: '0.05em' }}
      >
        {label}
      </span>
      <div className="flex-1 h-2 rounded-full bg-stone-800 overflow-hidden">
        <div
          className="h-full rounded-full bg-got-gold/70"
          style={{ width: `${Math.max(0, Math.min(100, value ?? 0))}%` }}
        />
      </div>
      <span className="w-8 text-right text-sm text-got-parchment" style={{ fontFamily: 'Cinzel, serif' }}>
        {value ?? '—'}
      </span>
    </div>
  )
}

function CharacterHero({ character }) {
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
  const ratingsByRole = attributes ? allRoleRatings(attributes) : null
  const roleRatingsList = ratingsByRole
    ? ROLES.map((r) => ({ id: r.id, label: r.label, rating: ratingsByRole[r.id] })).sort(
        (a, b) => b.rating - a.rating
      )
    : []
  const best = attributes ? bestFitRoles(attributes, ALL_ROLE_IDS, 1)[0] : null

  return (
    <motion.div
      key={character.id}
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
          {best && (
            <p className="text-xs text-got-parchment/40 mt-2" style={{ fontFamily: 'Cinzel, serif', letterSpacing: '0.05em' }}>
              Best fit:{' '}
              <span className="text-got-gold">
                {ROLE_LABEL[best.roleId]} {best.rating}%
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
                {cat.attributes.map((key) => (
                  <AttributeBar key={key} label={ATTRIBUTE_LABELS[key]} value={attributes[key]} />
                ))}
              </div>
            ))}
          </div>

          {/* Role fit */}
          <div className="flex flex-col gap-1.5">
            <p className="text-got-gold/70 text-xs tracking-widest uppercase mb-1" style={{ fontFamily: 'Cinzel, serif' }}>
              Role Fit
            </p>
            {roleRatingsList.map((r, i) => (
              <div key={r.id} className="flex items-center justify-between text-sm">
                <span className={i === 0 ? 'text-got-gold' : 'text-got-parchment/70'} style={{ fontFamily: 'EB Garamond, serif' }}>
                  {r.label}
                </span>
                <span className={tierColor(r.rating)} style={{ fontFamily: 'Cinzel, serif' }}>
                  {r.rating}% <span className="text-xs opacity-60">{tierLabel(r.rating)}</span>
                </span>
              </div>
            ))}
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
  const [missingOnly, setMissingOnly] = useState(false)
  const [sortKey, setSortKey] = useState('name')
  const [sortDir, setSortDir] = useState('asc')
  const [showCoefficients, setShowCoefficients] = useState(false)

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
      const roleFits = c.attributes ? allRoleRatings(c.attributes) : null
      return {
        ...c,
        roleFits,
        bestFit: c.attributes ? bestFitRoles(c.attributes, ALL_ROLE_IDS, 1)[0] : null,
      }
    })
  }, [characters])

  const filtered = useMemo(() => {
    return rows.filter((c) => {
      if (missingOnly && c.hasAttributes) return false
      if (houseFilter !== 'all' && c.house !== houseFilter) return false
      if (search.trim() && !c.name?.toLowerCase().includes(search.trim().toLowerCase())) return false
      return true
    })
  }, [rows, missingOnly, houseFilter, search])

  const sorted = useMemo(() => {
    const dir = sortDir === 'asc' ? 1 : -1

    const getValue = (c) => {
      if (sortKey === 'name') return c.name ?? ''
      if (sortKey === 'house') return c.house ?? ''
      if (sortKey === 'bestFit') return c.bestFit?.rating ?? -1
      if (ALL_ROLE_IDS.includes(sortKey)) return c.roleFits?.[sortKey] ?? -1
      if (ALL_ATTRIBUTE_KEYS.includes(sortKey)) return c.attributes?.[sortKey] ?? -1
      return -1
    }

    return [...filtered].sort((a, b) => {
      const va = getValue(a)
      const vb = getValue(b)
      if (typeof va === 'string') return va.localeCompare(vb) * dir
      return (va - vb) * dir
    })
  }, [filtered, sortKey, sortDir])

  const handleSort = (key) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir(key === 'name' || key === 'house' ? 'asc' : 'desc')
    }
  }

  const selectedCharacter = rows.find((c) => c.id === selectedId) ?? null

  const handleRowClick = (c) => {
    setSelectedId((current) => (current === c.id ? null : c.id))
  }

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
          <CharacterHero character={selectedCharacter} />
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

            <button
              onClick={() => setMissingOnly((v) => !v)}
              className={[
                'py-2 px-4 rounded border text-sm tracking-wide transition-all',
                missingOnly
                  ? 'border-got-red bg-got-red/10 text-got-red-bright'
                  : 'border-stone-700 text-stone-400 hover:border-stone-500 hover:text-stone-300',
              ].join(' ')}
              style={{ fontFamily: 'Cinzel, serif' }}
            >
              {missingOnly ? 'Showing: Missing Only' : 'Show Missing Only'}
            </button>

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
            <table className="w-full border-collapse min-w-[2600px]">
              <thead>
                <tr className="border-b border-stone-800 bg-stone-900">
                  <SortHeader label="Name" sortKey="name" activeKey={sortKey} direction={sortDir} onSort={handleSort} sticky />
                  <SortHeader label="House" sortKey="house" activeKey={sortKey} direction={sortDir} onSort={handleSort} />
                  {ATTRIBUTE_COLUMNS.map((col) => (
                    <SortHeader
                      key={col.key}
                      label={col.label}
                      title={`${col.categoryLabel} — ${col.fullLabel}`}
                      sortKey={col.key}
                      activeKey={sortKey}
                      direction={sortDir}
                      onSort={handleSort}
                      align="right"
                      dividerLeft={col.isFirstInCategory}
                    />
                  ))}
                  {ROLE_COLUMNS.map((col, i) => (
                    <SortHeader
                      key={col.key}
                      label={col.label}
                      title={col.fullLabel}
                      sortKey={col.key}
                      activeKey={sortKey}
                      direction={sortDir}
                      onSort={handleSort}
                      align="right"
                      dividerLeft={i === 0}
                    />
                  ))}
                  <SortHeader
                    label="Best Fit"
                    sortKey="bestFit"
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
                      <td
                        className={[
                          'py-2.5 px-3 whitespace-nowrap sticky left-0 z-10',
                          isSelected ? 'text-got-gold bg-got-gold/10' : 'text-got-parchment bg-got-black',
                        ].join(' ')}
                        style={{ fontFamily: 'Cinzel, serif' }}
                      >
                        {c.name}
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap text-got-parchment/50 text-sm" style={{ fontFamily: 'EB Garamond, serif' }}>
                        {c.house || '—'}
                      </td>
                      {ATTRIBUTE_COLUMNS.map((col) => (
                        <td
                          key={col.key}
                          className={[
                            'py-2.5 px-3 text-right text-sm',
                            tierColor(c.attributes?.[col.key] ?? -1),
                            col.isFirstInCategory ? 'border-l border-stone-900' : '',
                          ].join(' ')}
                          style={{ fontFamily: 'Cinzel, serif' }}
                        >
                          {c.attributes ? c.attributes[col.key] ?? '—' : '—'}
                        </td>
                      ))}
                      {ROLE_COLUMNS.map((col, i) => {
                        const value = c.roleFits?.[col.key]
                        const isBest = c.bestFit?.roleId === col.key
                        return (
                          <td
                            key={col.key}
                            className={[
                              'py-2.5 px-3 text-right text-sm',
                              value !== undefined ? tierColor(value) : 'text-stone-800',
                              isBest ? 'bg-got-gold/5 font-bold' : '',
                              i === 0 ? 'border-l border-stone-900' : '',
                            ].join(' ')}
                            style={{ fontFamily: 'Cinzel, serif' }}
                          >
                            {value !== undefined ? `${value}%` : '—'}
                          </td>
                        )
                      })}
                      <td className="py-2.5 px-3 text-right text-sm border-l border-stone-900" style={{ fontFamily: 'Cinzel, serif' }}>
                        {c.bestFit ? (
                          <span className={tierColor(c.bestFit.rating)}>
                            {c.bestFit.rating}% <span className="text-stone-600 text-xs">{ROLE_LABEL[c.bestFit.roleId]}</span>
                          </span>
                        ) : (
                          <span className="text-stone-700">—</span>
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
    </PageWrapper>
  )
}