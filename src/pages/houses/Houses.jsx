import { useState, useEffect, useMemo } from 'react'
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import PageWrapper from '../../components/PageWrapper'
import { fetchAllHouses, fetchAllHouseEras, fetchAllSmallCouncil } from '../../lib/houseService'
import { TIMELINE_POINTS, DEFAULT_YEAR } from '../../data/timeline'
import {
  KINGDOM_ORDER,
  SECTIONS,
  COUNCILS,
  NIGHTS_WATCH_SLUG,
  TITLE_META,
  getSectionKey,
  wardenTitle,
  housePriority,
  splitHouseName,
  computeAuthority,
  housesAt,
  councilSeats as seatsForCouncil,
  placeOf,
} from '../../lib/houseRules'
import { CINZEL, GARAMOND, FOCUS, INK, HouseBanner, Words, CouncilPanel, SectionHeading } from '../../components/houses/HouseParts'

/**
 * pages/houses/Houses.jsx
 *
 * Every house of the selected era, section by section, with the royal
 * house beside the Small Council and the Night's Watch beside its
 * officers. Clicking a house opens its own page (/houses/<slug>?era=<year>).
 * The era is kept in the address (?era=), so coming back from a house
 * returns to the same era.
 */

/* ---------------- the page's look ---------------- */

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

  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  // The era lives in the address (?era=305), so a house's page can link
  // back to the same era; 298 when there's none, where the show starts.
  const eraParam = Number(params.get('era'))
  const selectedYear = TIMELINE_POINTS.some((p) => p.year === eraParam) ? eraParam : DEFAULT_YEAR
  const setSelectedYear = (year) =>
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        if (year === DEFAULT_YEAR) next.delete('era')
        else next.set('era', String(year))
        return next
      },
      { replace: true }
    )
  const [search, setSearch] = useState('')
  // ?region= arrives from a house page's breadcrumb
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


  // Each house merged with its row for the selected year (pure client-side,
  // so switching eras needs no refetch). A house with no row that year
  // (Bran before 305) simply doesn't appear.
  const housesAtYear = useMemo(() => housesAt(houses, eras, selectedYear), [houses, eras, selectedYear])

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
  const councilSeats = useMemo(
    () => Object.fromEntries(Object.keys(COUNCILS).map((key) => [key, seatsForCouncil(council, selectedYear, key)])),
    [council, selectedYear]
  )

  // A house opens its own page, in the era being viewed.
  const openHouse = (house) => navigate(`/houses/${house.slug}${selectedYear === DEFAULT_YEAR ? '' : `?era=${selectedYear}`}`)


  const [view, setView] = useRememberedView()
  const point = TIMELINE_POINTS.find((p) => p.year === selectedYear)
  const ruledNorth = effectiveKingdom === 'Kingdom of the North'
  const shownSections = SECTIONS.filter(({ key }) => sections[key]?.length > 0)

  // Old links to a house (/houses?house=stark) now go to its page.
  const oldHouseLink = params.get('house')
  if (oldHouseLink) return <Navigate to={`/houses/${oldHouseLink}${params.get('era') ? `?era=${params.get('era')}` : ''}`} replace />

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
              const open = openHouse
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
                            isSelected={false}
                            onClick={() => open(house)}
                            dark={key === 'order'}
                          />
                        )
                      })}
                    </div>
                  ) : view === 'roll' ? (
                    <div className="flex flex-col border-t border-[rgba(216,184,120,.1)]">
                      {items.map((house) => (
                        <HouseRollRow key={house.id} house={house} sectionKey={key} isSelected={false} onClick={() => open(house)} />
                      ))}
                    </div>
                  ) : (
                    <div className="grid gap-2" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(236px, 1fr))' }}>
                      {items.map((house) => (
                        <HouseTile key={house.id} house={house} sectionKey={key} isSelected={false} onClick={() => open(house)} />
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

    </PageWrapper>
  )
}