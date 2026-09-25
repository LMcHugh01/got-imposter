import { useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import PageWrapper from '../../components/PageWrapper'
import RealmMap from '../../components/RealmMap'
import { TIMELINE_POINTS, DEFAULT_YEAR } from '../../data/timeline'
import { useArchive, housesAt } from '../../lib/useArchive'
import { reignOf } from '../../lib/houseRules'
import { CINZEL, FOCUS } from '../../components/houses/HouseParts'

/**
 * pages/maps/Maps.jsx
 *
 * The map of the realm through the eras. The year and the zoomed region
 * live in the address (/maps?year=305&region=north), so the home page can
 * link straight into a region, views can be shared, and the browser's back
 * button zooms back out.
 */

// The eras: years on a gold line, each with its season above, the chosen
// one lit.
function EraPicker({ selectedYear, onSelect }) {
  return (
    <div className="flex justify-center">
    <div className="relative inline-flex" role="radiogroup" aria-label="Era">
      <div
        className="absolute left-[6%] right-[6%] bottom-[9px] h-px"
        style={{ background: 'linear-gradient(90deg, rgba(216,184,120,.08), rgba(216,184,120,.45), rgba(216,184,120,.08))' }}
      />
      {TIMELINE_POINTS.map((p) => {
        const on = p.year === selectedYear
        return (
          <button
            key={p.year}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => onSelect(p.year)}
            className={`relative flex flex-col items-center w-[112px] sm:w-[180px] cursor-pointer ${FOCUS}`}
          >
            {/* the era's season ("Season 1"); an era before the show has none, and keeps the space */}
            <span className="uppercase whitespace-nowrap" style={{ ...CINZEL, fontSize: 8.5, letterSpacing: '.24em', color: on ? '#d8b878' : '#6f6758' }}>
              {p.season ? p.season.replace(/^Game of Thrones:\s*/i, '') : '\u00a0'}
            </span>
            <span className="mt-1" style={{ ...CINZEL, fontWeight: 600, fontSize: 'clamp(20px, 3.2vw, 25px)', color: on ? '#e2bc5c' : '#7d7566' }}>
              {p.label}
            </span>
            <span
              className="mt-2.5 rotate-45 border"
              style={{
                width: on ? 13 : 8,
                height: on ? 13 : 8,
                margin: on ? '8px 0 0' : '10px 0 2px',
                background: on ? '#e2bc5c' : '#1f1d1a',
                borderColor: on ? '#e2bc5c' : 'rgba(216,184,120,.45)',
                boxShadow: on ? '0 0 16px rgba(226,188,92,.5)' : 'none',
              }}
            />
          </button>
        )
      })}
    </div>
    </div>
  )
}

export default function Maps() {
  const [params, setParams] = useSearchParams()

  const year = useMemo(() => {
    const y = Number(params.get('year'))
    return TIMELINE_POINTS.some((p) => p.year === y) ? y : DEFAULT_YEAR
  }, [params])
  const region = params.get('region')

  const update = useCallback(
    (changes, { replace = false } = {}) => {
      setParams(
        (prev) => {
          const next = new URLSearchParams(prev)
          for (const [k, v] of Object.entries(changes)) {
            if (v === null || v === undefined) next.delete(k)
            else next.set(k, String(v))
          }
          if (next.get('year') === String(DEFAULT_YEAR)) next.delete('year')
          return next
        },
        { replace }
      )
    },
    [setParams]
  )

  // "The Reign of King Robert I Baratheon", as on the Houses page: the crown
  // of the Seven (or Six) Kingdoms rather than the independent North.
  const { houses, eras } = useArchive()
  const reign = useMemo(() => (houses && eras ? reignOf(housesAt(houses, eras, year)) : null), [houses, eras, year])
  const point = TIMELINE_POINTS.find((p) => p.year === year)

  return (
    <PageWrapper className="justify-start text-realm-ink">
      <header className="w-full flex flex-col items-center text-center pt-4">
        <div className="uppercase" style={{ ...CINZEL, fontSize: 10, letterSpacing: '.46em', color: '#8f8676' }}>
          Game of Thrones
        </div>
        <div className="mt-2 flex items-center gap-5">
          <span aria-hidden="true" className="w-12 sm:w-20 h-px" style={{ background: 'linear-gradient(90deg, transparent, rgba(216,184,120,.5))' }} />
          <h1 className="leading-none" style={{ ...CINZEL, fontWeight: 500, fontSize: 'clamp(32px, 5vw, 42px)', letterSpacing: '.1em', color: '#f1e6cc' }}>
            The Map
          </h1>
          <span aria-hidden="true" className="w-12 sm:w-20 h-px" style={{ background: 'linear-gradient(90deg, rgba(216,184,120,.5), transparent)' }} />
        </div>

        <div className="mt-8 w-full">
          <EraPicker selectedYear={year} onSelect={(y) => update({ year: y }, { replace: true })} />
        </div>

        <div className="mt-7 min-h-[58px]">
          {point?.season && (
            <div className="uppercase" style={{ ...CINZEL, fontSize: 9.5, letterSpacing: '.3em', color: '#8f8676' }}>
              {point.season}
            </div>
          )}
          <div className="mt-1.5 flex items-center justify-center gap-3">
            <span aria-hidden="true" className="w-1.5 h-1.5 rotate-45" style={{ background: '#d8b878' }} />
            <span style={{ ...CINZEL, fontWeight: 600, fontSize: 'clamp(19px, 2.6vw, 24px)', letterSpacing: '.04em', color: '#f6ecd4' }}>
              {reign || point?.title}
            </span>
            <span aria-hidden="true" className="w-1.5 h-1.5 rotate-45" style={{ background: '#d8b878' }} />
          </div>
        </div>
      </header>

      <section className="w-full max-w-[1120px] mx-auto mt-10 pb-8">
        <RealmMap year={year} region={region} onRegionChange={(id) => update({ region: id })} />
      </section>
    </PageWrapper>
  )
}