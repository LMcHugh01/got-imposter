import { useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import PageWrapper from '../../components/PageWrapper'
import PageHeading from '../../components/PageHeading'
import Timeline from '../../components/Timeline'
import RealmMap from '../../components/RealmMap'
import { TIMELINE_POINTS, DEFAULT_YEAR } from '../../data/timeline'
import { useArchive } from '../../lib/useArchive'

/**
 * pages/maps/Maps.jsx
 *
 * The full map of the realm with the same timeline as the Houses page. The
 * year and the zoomed region live in the URL (/maps?year=305&region=north),
 * so the home page can link straight into a region, views can be shared, and
 * the browser's back button zooms back out.
 */
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

  // Whoever holds the Iron Throne this year, as on the Houses page: a regent
  // or castellan running things wins over the titled ruler.
  const { eras } = useArchive()
  const rulerName = useMemo(() => {
    const royal = eras?.find((e) => e.year === year && e.status === 'royalty')
    return royal ? royal.regent || royal.castellan || royal.currentLord || null : null
  }, [eras, year])

  return (
    <PageWrapper className="justify-start text-realm-ink">
      <PageHeading
        className="pt-4"
        eyebrow="Game of Thrones"
        title="The Map"
        subtitle="The lands of the realm, and who held them."
      />

      <div className="w-full mt-8">
        <Timeline
          points={TIMELINE_POINTS}
          selectedYear={year}
          onSelect={(y) => update({ year: y }, { replace: true })}
          rulerName={rulerName}
        />
      </div>

      <section className="w-full max-w-[1060px] mx-auto mt-10 pb-8">
        <RealmMap year={year} region={region} onRegionChange={(id) => update({ region: id })} />
      </section>
    </PageWrapper>
  )
}