import { useEffect, useMemo, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import PageWrapper from '../../components/PageWrapper'
import { fetchAllHouses, fetchAllHouseEras, fetchAllSmallCouncil } from '../../lib/houseService'
import { TIMELINE_POINTS, DEFAULT_YEAR } from '../../data/timeline'
import {
  COUNCILS,
  NIGHTS_WATCH_SLUG,
  getSectionKey,
  getBadgeText,
  splitHouseName,
  computeAuthority,
  authorityFor,
  royalBranchIndex,
  housesAt,
  houseOrder,
  councilSeats,
  placeOf,
} from '../../lib/houseRules'
import { CINZEL, GARAMOND, FOCUS, INK, HouseBanner, CouncilPanel } from '../../components/houses/HouseParts'
import FamilyTree from '../../components/houses/FamilyTree'

/**
 * pages/houses/House.jsx  (/houses/:slug?era=305)
 *
 * One house's page: its banner, name, seat and words; its standing in each
 * era (tabs); its branches (tabs, when it has them); who rules it, their
 * titles and the houses sworn to it; its heir, seat, liege and founding;
 * the Small Council on the royal branch (the Officers of Castle Black on
 * the Night's Watch's); and its family tree. Previous / next step through
 * every house of the era in the Houses page's order. The era lives in the
 * address, 298 when there's none.
 */

// Loaded once per visit and shared by every house page (stepping between
// houses doesn't reload anything).
let archive = null
function loadArchive() {
  if (!archive) {
    archive = Promise.all([fetchAllHouses(), fetchAllHouseEras(), fetchAllSmallCouncil()]).then(([houses, eras, council]) => ({
      houses,
      eras,
      council,
    }))
    archive.catch(() => {
      archive = null // let a later visit try again
    })
  }
  return archive
}

function useArchive() {
  const [state, setState] = useState({ data: null, error: null })
  useEffect(() => {
    let cancelled = false
    loadArchive()
      .then((data) => !cancelled && setState({ data, error: null }))
      .catch((err) => !cancelled && setState({ data: null, error: err.message || 'Failed to load houses.' }))
    return () => {
      cancelled = true
    }
  }, [])
  return state
}

// "Warden of the North" reads as just "Warden" in the small era tabs.
const shortStanding = (text) => (text?.startsWith('Warden of') ? 'Warden' : text)

// A house's sworn houses, as listed ("Karstark" or "House Karstark"),
// matched to houses in the archive so their chips can link to them.
const surname = (name) => (name ?? '').replace(/^House\s+/i, '').trim().toLowerCase()

const Label = ({ children, className = '', color = INK.muted }) => (
  <div className={`uppercase ${className}`} style={{ ...CINZEL, fontSize: 9.5, letterSpacing: '.24em', color }}>
    {children}
  </div>
)

export default function House() {
  const { slug } = useParams()
  const [params, setParams] = useSearchParams()
  const { data, error } = useArchive()

  const eraParam = Number(params.get('era'))
  const year = TIMELINE_POINTS.some((p) => p.year === eraParam) ? eraParam : DEFAULT_YEAR
  const eraQuery = (y) => (y === DEFAULT_YEAR ? '' : `?era=${y}`)
  const setYear = (y) =>
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        if (y === DEFAULT_YEAR) next.delete('era')
        else next.set('era', String(y))
        return next
      },
      { replace: true }
    )

  const house = data?.houses.find((h) => h.slug === slug) ?? null
  const houseEras = useMemo(() => (house && data ? data.eras.filter((e) => e.houseId === house.id) : []), [house, data])
  const era = houseEras.find((e) => e.year === year) ?? null
  const merged = useMemo(() => (house && era ? { ...house, ...era } : null), [house, era])

  // Branches (the Baratheons' three lines, the Night's Watch's castles). A
  // royal house opens on its royal branch; any other on its first.
  const branches = merged?.branches ?? []
  const [branchIndex, setBranchIndex] = useState(0)
  useEffect(() => {
    setBranchIndex(merged && merged.status === 'royalty' ? royalBranchIndex(merged) : 0)
  }, [slug, year, Boolean(merged)]) // eslint-disable-line react-hooks/exhaustive-deps
  const branch = branches.length > 0 ? branches[Math.min(branchIndex, branches.length - 1)] : null

  // Previous / next: every house of this era, in the Houses page's order.
  const order = useMemo(() => (data ? houseOrder(housesAt(data.houses, data.eras, year)) : []), [data, year])
  const at = order.findIndex((h) => h.slug === slug)
  const prev = order.length > 1 ? order[(at - 1 + order.length) % order.length] : null
  const next = order.length > 1 ? order[(at + 1) % order.length] : null

  if (error) {
    return (
      <PageWrapper className="!p-0 !items-stretch">
        <p className="text-center py-24 text-[18px]" style={{ ...GARAMOND, color: '#c9766a' }}>
          {error}
        </p>
      </PageWrapper>
    )
  }
  if (!data) {
    return (
      <PageWrapper className="!p-0 !items-stretch">
        <p className="text-center italic py-24 text-[18px]" style={{ ...GARAMOND, color: INK.muted }}>
          Consulting the maesters…
        </p>
      </PageWrapper>
    )
  }
  if (!house) {
    return (
      <PageWrapper className="!p-0 !items-stretch">
        <div className="text-center py-24">
          <p className="italic text-[19px]" style={{ ...GARAMOND, color: INK.muted }}>
            No house answers to that name.
          </p>
          <Link to="/houses" className={`inline-block mt-5 uppercase ${FOCUS}`} style={{ ...CINZEL, fontSize: 11, letterSpacing: '.3em', color: INK.gold }}>
            All houses
          </Link>
        </div>
      </PageWrapper>
    )
  }

  const tint = house.tinctFrom ?? '#3a342a'
  const { prefix, name } = splitHouseName(house.name)
  const point = TIMELINE_POINTS.find((p) => p.year === year)
  const sectionKey = merged ? getSectionKey(merged) : null
  const standing = merged ? getBadgeText(merged, sectionKey) : null
  const isOrder = house.tier === 'order'

  // What this era (and branch) says about the house.
  const authority = merged ? authorityFor(merged, branch, branchIndex) : null
  const seat = branch ? branch.seat : merged?.seats?.join(', ')
  const titles = branch ? branch.titles?.join(', ') : merged?.titles?.join(', ')
  const heir = branch ? branch.heir : merged?.heir
  const heroName = branch ? `${name} of ${branch.label}` : name

  // The Small Council on the royal branch (not for the independent North);
  // the Officers of Castle Black on the Night's Watch's first branch.
  const onRoyalBranch = merged?.status === 'royalty' && (branches.length === 0 || branchIndex === royalBranchIndex(merged))
  const council =
    onRoyalBranch && merged.kingdom !== 'Kingdom of the North'
      ? 'small_council'
      : house.slug === NIGHTS_WATCH_SLUG && branchIndex === 0 && merged
        ? 'nights_watch'
        : null

  const sworn = (house.bannermen ?? []).map((b) => ({
    label: b.replace(/^House\s+/i, ''),
    house: data.houses.find((h) => surname(splitHouseName(h.name).name) === surname(b)) ?? null,
  }))

  // An extinct era tells the house's end: its last lord on record (the
  // era's own last member if it names one, else the lord of the latest
  // earlier era), and the seat it held last. Heir and liege no longer apply.
  const extinct = merged?.status === 'extinct'
  const earlier = houseEras
    .filter((e) => e.year < year)
    .sort((a, b) => b.year - a.year)
    .map((e) => ({ ...house, ...e }))
  const lastLord = extinct
    ? authority?.value
      ? { name: authority.value, year: null }
      : (() => {
          const e = earlier.find((x) => computeAuthority(x).value)
          return e ? { name: computeAuthority(e).value, year: e.year } : null
        })()
    : null
  const formerSeat = extinct ? merged?.seats?.[0] ?? earlier.find((e) => e.seats?.length)?.seats[0] ?? null : null

  const facts = extinct
    ? [
        { k: 'Former Seat', v: formerSeat },
        { k: 'Founded', v: house.founded, sub: house.founder ? `by ${house.founder}` : null },
      ]
    : [
        !isOrder && { k: merged?.heirLabel || 'Heir', v: heir },
        { k: 'Seat', v: seat },
        { k: 'Sworn To', v: merged?.overlord },
        { k: 'Founded', v: house.founded, sub: house.founder ? `by ${house.founder}` : null },
      ].filter(Boolean)

  const yearLabel = `${year} AC${point?.season ? ` · ${point.season.replace('Game of Thrones: ', '')}` : ''}`

  return (
    <PageWrapper className="!p-0 !items-stretch">
      <div className="relative w-full text-[#ece5d6]">
        {/* the house's colour, washing down from the top */}
        <div
          className="absolute inset-x-0 top-0 h-[420px] pointer-events-none"
          style={{
            background: extinct
              ? 'linear-gradient(180deg, rgba(120,114,104,.22) 0%, rgba(120,114,104,.07) 55%, transparent 100%)'
              : `linear-gradient(180deg, ${tint}66 0%, ${tint}22 55%, transparent 100%)`,
          }}
          aria-hidden="true"
        />

        <div className="relative max-w-[1240px] mx-auto px-5 sm:px-7 pt-4 pb-12">
          {/* Breadcrumb, and previous / next */}
          <div className="flex items-center justify-between gap-4">
            <nav className="flex items-center gap-3 uppercase min-w-0" aria-label="Breadcrumb" style={{ ...CINZEL, fontSize: 10, letterSpacing: '.24em' }}>
              <Link to={`/houses${eraQuery(year)}`} className={`hover:text-[#eed49b] ${FOCUS}`} style={{ color: INK.gold }}>
                Houses
              </Link>
              {house.region && (
                <>
                  <span style={{ color: INK.muted }}>/</span>
                  <Link
                    to={`/houses?region=${encodeURIComponent(house.region)}${year === DEFAULT_YEAR ? '' : `&era=${year}`}`}
                    className={`truncate hover:text-[#eed49b] ${FOCUS}`}
                    style={{ color: INK.gold }}
                  >
                    {house.region}
                  </Link>
                </>
              )}
            </nav>
            {prev && next && (
              <div className="flex gap-2 shrink-0">
                {[
                  { h: prev, dir: 'prev' },
                  { h: next, dir: 'next' },
                ].map(({ h, dir }) => (
                  <Link
                    key={dir}
                    to={`/houses/${h.slug}${eraQuery(year)}`}
                    aria-label={`${dir === 'prev' ? 'Previous' : 'Next'} house: ${h.name}`}
                    className={`flex items-center gap-2 h-8 px-3 rounded-[2px] border border-[rgba(216,184,120,.3)] uppercase hover:border-[#d8b878] transition-colors ${FOCUS}`}
                    style={{ ...CINZEL, fontSize: 10, letterSpacing: '.2em', color: INK.gold, background: 'rgba(20,18,16,.5)' }}
                  >
                    {dir === 'prev' && <span aria-hidden="true">‹</span>}
                    <span className="hidden sm:inline max-w-[140px] truncate">{splitHouseName(h.name).name}</span>
                    {dir === 'next' && <span aria-hidden="true">›</span>}
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Hero */}
          <header className="flex items-start gap-5 sm:gap-8 mt-8">
            <div style={extinct ? { filter: 'grayscale(1)', opacity: 0.55 } : undefined}>
              <HouseBanner house={house} width={96} />
            </div>
            <div className="min-w-0 pt-1">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 uppercase" style={{ ...CINZEL, fontSize: 11, letterSpacing: '.3em', color: INK.gold }}>
                {prefix && <span>{prefix}</span>}
                {prefix && standing && <span className="w-[6px] h-[6px] rotate-45" style={{ background: INK.gold }} aria-hidden="true" />}
                {standing && <span style={extinct ? { color: '#c9766a' } : undefined}>{standing}</span>}
              </div>
              <h1
                className="mt-2 leading-[1.05] text-balance"
                style={{ ...CINZEL, fontWeight: 600, fontSize: 'clamp(34px, 6vw, 58px)', letterSpacing: '.03em', color: extinct ? '#b9b0a0' : INK.cream }}
              >
                {heroName}
              </h1>
              <div className="mt-3 flex flex-wrap items-baseline gap-x-5 gap-y-1">
                <span className="uppercase" style={{ ...CINZEL, fontSize: 11, letterSpacing: '.2em', color: INK.muted }}>
                  {placeOf(house, branch?.seat ?? merged?.seats?.[0])}
                </span>
                <span className="italic text-[21px]" style={{ ...GARAMOND, color: house.words ? '#e8cf92' : '#b0857a' }}>
                  {house.words ? `\u201c${house.words}\u201d` : 'No recorded words'}
                </span>
              </div>
            </div>
          </header>

          {/* Across the ages: one tab per era */}
          <div className="mt-10 grid border border-[rgba(216,184,120,.16)] rounded-t-[3px]" style={{ gridTemplateColumns: `repeat(${TIMELINE_POINTS.length}, minmax(0, 1fr))` }} role="tablist" aria-label="Era">
            {TIMELINE_POINTS.map((p, i) => {
              const row = houseEras.find((e) => e.year === p.year)
              const on = p.year === year
              const withHouse = row ? { ...house, ...row } : null
              const lords = withHouse
                ? (withHouse.branches?.length ? withHouse.branches.map((b, bi) => authorityFor(withHouse, b, bi).value) : [computeAuthority(withHouse).value])
                    .filter(Boolean)
                    .join(' · ')
                : ''
              const ended = row?.status === 'extinct'
              const EMBER = '#c9766a'
              return (
                <button
                  key={p.year}
                  type="button"
                  role="tab"
                  aria-selected={on}
                  aria-label={`${p.label}${ended ? ', extinct' : ''}`}
                  onClick={() => setYear(p.year)}
                  className={`text-center sm:text-left px-2 sm:px-5 py-2.5 sm:py-3.5 border-t-2 cursor-pointer transition-colors ${i > 0 ? 'border-l border-l-[rgba(216,184,120,.12)]' : ''} ${FOCUS}`}
                  style={{
                    borderTopColor: on ? (ended ? EMBER : INK.gold) : 'transparent',
                    background: on ? (ended ? 'rgba(201,118,106,.08)' : 'rgba(216,184,120,.1)') : 'rgba(0,0,0,.18)',
                    opacity: row ? 1 : 0.55,
                  }}
                >
                  <div className="flex flex-wrap items-baseline justify-center sm:justify-start gap-x-2.5">
                    <span className="text-[15px] sm:text-[18px]" style={{ ...CINZEL, color: on ? (ended ? EMBER : '#e2bc5c') : ended ? '#9a7a72' : '#9d9483' }}>
                      {p.label}
                      {ended && <span aria-hidden="true"> †</span>}
                    </span>
                    {row && (
                      <span className="hidden sm:inline uppercase" style={{ ...CINZEL, fontSize: 8.5, letterSpacing: '.22em', color: ended ? EMBER : INK.muted }}>
                        {shortStanding(getBadgeText(withHouse, getSectionKey(withHouse)))}
                      </span>
                    )}
                  </div>
                  {/* the era's lord: from tablets up; phones show just the year */}
                  <div
                    className="hidden sm:block mt-1 truncate text-[16px]"
                    style={{ ...GARAMOND, color: ended ? '#8f8676' : on ? INK.cream : '#a9a08f', fontStyle: lords && !ended ? 'normal' : 'italic' }}
                  >
                    {!row ? 'No record' : ended ? 'The line has ended' : lords || '—'}
                  </div>
                </button>
              )
            })}
          </div>

          {/* This era */}
          <div
            className="border border-t-0 border-[rgba(216,184,120,.16)] rounded-b-[3px]"
            style={{
              background: extinct
                ? 'repeating-linear-gradient(135deg, rgba(255,255,255,.028) 0 1.5px, transparent 1.5px 9px), rgba(0,0,0,.12)'
                : 'rgba(255,255,255,.015)',
            }}
          >
            {!merged ? (
              <p className="px-6 py-12 text-center italic text-[18px]" style={{ ...GARAMOND, color: INK.muted }}>
                The archive holds no record of {house.name} in {year} AC.
              </p>
            ) : (
              <>
                {branches.length > 1 && (
                  <div className="flex overflow-x-auto border-b border-[rgba(216,184,120,.12)] px-3 sm:px-5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" role="tablist" aria-label="Branch">
                    {branches.map((b, bi) => {
                      const on = bi === branchIndex
                      return (
                        <button
                          key={b.label}
                          type="button"
                          role="tab"
                          aria-selected={on}
                          onClick={() => setBranchIndex(bi)}
                          className={`shrink-0 px-3 sm:px-4 pt-3.5 pb-3 border-b-2 -mb-px uppercase whitespace-nowrap cursor-pointer transition-colors ${FOCUS}`}
                          style={{ ...CINZEL, fontSize: 10.5, letterSpacing: '.2em', color: on ? '#eed49b' : INK.muted, borderBottomColor: on ? INK.gold : 'transparent' }}
                        >
                          {b.label}
                        </button>
                      )
                    })}
                  </div>
                )}

                <div className="flex flex-wrap">
                  {extinct ? (
                    <div className="px-5 sm:px-7 py-7" style={{ flex: '1.4 1 360px' }}>
                      <div className="flex items-center gap-4">
                        <Label>{yearLabel}</Label>
                        <div className="flex-1 h-px" style={{ background: 'rgba(201,118,106,.25)' }} />
                        <Label color="#c9766a">Extinct</Label>
                      </div>
                      <div className="mt-3" style={{ ...CINZEL, fontWeight: 600, fontSize: 'clamp(24px, 3.4vw, 32px)', lineHeight: 1.15, color: '#b9b0a0' }}>
                        The line has ended
                      </div>
                      <p className="mt-2 italic text-[18px] text-pretty" style={{ ...GARAMOND, color: INK.muted }}>
                        {house.name} holds no lands and no lord in {year} AC.
                      </p>
                      {lastLord && (
                        <div className="mt-5 flex items-baseline gap-3 flex-wrap">
                          <Label>Last lord on record</Label>
                          <span className="text-[19px]" style={{ ...GARAMOND, color: '#d3c8b2' }}>
                            {lastLord.name}
                            {lastLord.year && (
                              <span className="italic" style={{ color: INK.muted }}>
                                , {lastLord.year} AC
                              </span>
                            )}
                          </span>
                        </div>
                      )}
                    </div>
                  ) : (
                  /* Who rules, their titles, and the houses sworn to them */
                  <div className="px-5 sm:px-7 py-6" style={{ flex: '1.4 1 360px' }}>
                    <div className="flex items-center gap-4">
                      <Label>{yearLabel}</Label>
                      <div className="flex-1 h-px" style={{ background: 'rgba(216,184,120,.16)' }} />
                      <Label color={INK.gold}>{authority?.label}</Label>
                    </div>
                    <div className="mt-3" style={{ ...CINZEL, fontWeight: 600, fontSize: 'clamp(24px, 3.4vw, 32px)', lineHeight: 1.15, color: authority?.value ? '#f6ecd4' : INK.muted }}>
                      {authority?.value || 'No ruling lord'}
                    </div>
                    {authority?.caption && (
                      <div className="mt-1 italic text-[16px]" style={{ ...GARAMOND, color: INK.muted }}>
                        {authority.caption}
                      </div>
                    )}
                    {titles && (
                      <div className="mt-3 flex items-start gap-2.5 italic text-[19px] leading-snug" style={{ ...GARAMOND, color: '#d9ccb0' }}>
                        <span className="mt-2 w-[7px] h-[7px] rotate-45 border shrink-0" style={{ borderColor: INK.gold }} aria-hidden="true" />
                        <span>{titles}</span>
                      </div>
                    )}
                    {sworn.length > 0 && (
                      <div className="mt-6">
                        <Label color={INK.gold}>Sworn Houses</Label>
                        <div className="mt-2.5 flex flex-wrap gap-2">
                          {sworn.map(({ label, house: h }) => {
                            const chip = (
                              <>
                                {h ? (
                                  <HouseBanner house={h} width={14} />
                                ) : (
                                  <span className="w-[14px] h-[18px] shrink-0" style={{ background: 'rgba(216,184,120,.25)' }} aria-hidden="true" />
                                )}
                                <span>{label}</span>
                              </>
                            )
                            const cls = 'flex items-center gap-2 h-8 px-2.5 rounded-[2px] border uppercase'
                            const style = { ...CINZEL, fontSize: 10.5, letterSpacing: '.16em', color: '#e4dac4' }
                            return h ? (
                              <Link
                                key={label}
                                to={`/houses/${h.slug}${eraQuery(year)}`}
                                className={`${cls} border-[rgba(216,184,120,.22)] hover:border-[#d8b878] transition-colors ${FOCUS}`}
                                style={style}
                              >
                                {chip}
                              </Link>
                            ) : (
                              <span key={label} className={`${cls} border-[rgba(216,184,120,.12)]`} style={style}>
                                {chip}
                              </span>
                            )
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                  )}

                  {/* Heir, seat, liege, founding */}
                  <div
                    className="grid grid-cols-2 border-t min-[760px]:border-t-0 min-[760px]:border-l border-[rgba(216,184,120,.12)]"
                    style={{ flex: '1 1 320px' }}
                  >
                    {facts.map((f, i) => (
                      <div
                        key={f.k}
                        className={`px-5 sm:px-6 py-5 ${i % 2 === 1 ? 'border-l border-[rgba(216,184,120,.12)]' : ''} ${i >= 2 ? 'border-t border-[rgba(216,184,120,.12)]' : ''}`}
                      >
                        <Label>{f.k}</Label>
                        <div className="mt-2 text-[19px] leading-snug" style={{ ...GARAMOND, color: f.v ? '#ece5d6' : '#7d7566' }}>
                          {f.v || '—'}
                        </div>
                        {f.sub && (
                          <div className="mt-0.5 italic text-[15px]" style={{ ...GARAMOND, color: INK.muted }}>
                            {f.sub}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* The royal branch's Small Council, or the Night's Watch's officers */}
          {council && (
            <div className="mt-6 rounded-[3px] border border-[rgba(216,184,120,.16)]" style={{ background: 'rgba(255,255,255,.015)' }}>
              <CouncilPanel council={COUNCILS[council]} seats={councilSeats(data.council, year, council)} standalone />
            </div>
          )}

          <div className="mt-12">
            <FamilyTree house={house} year={year} members={[]} />
          </div>
        </div>
      </div>
    </PageWrapper>
  )
}