import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { CINZEL, GARAMOND, FOCUS } from './GameHome'
import { useArchive, housesAt } from '../lib/useArchive'
import {
  MAP_DATA_URL,
  THEME,
  DEFAULT_YEAR,
  regionsFor,
  regionOf,
  holderOf,
  displayName,
  surnameKey,
  matchesRegion,
  unionBox,
  fitViewBox,
} from '../lib/realmMap'

/**
 * components/RealmMap.jsx
 *
 * The map of the realm. At rest every region shows in its colour, a little
 * muted, brightening on hover.
 *
 * Full (the Maps page): one click, on the map or in the list, zooms into a
 * region. Its holdings, castles and castle names appear, the rest of the
 * realm turns grey, and the panel lists its houses as they stood in `year`.
 * Clicking a neighbour glides across; Esc, the sea or "The whole realm" zooms
 * back out. Lands of houses extinct in that year are hatched, and a region
 * that is its own kingdom that year (the North in 305) gets a gold frontier.
 * Pass `region` + `onRegionChange` to keep the zoomed region in the URL.
 *
 * Simple (`simple`, the home page): colours and hover only; choosing a region
 * calls `onPick(regionId)` (the home page sends you to the Maps page).
 *
 * Each region is drawn twice: first its holdings as dark outlines, then the
 * same holdings filled on top. The fills cover every border between two
 * holdings of the same region, leaving only coastlines and region borders.
 */

/* ---------------- data ---------------- */

let mapCache = null

function useMapData() {
  const [data, setData] = useState(mapCache)
  const [error, setError] = useState(null)
  useEffect(() => {
    if (mapCache) return
    let cancelled = false
    fetch(MAP_DATA_URL)
      .then((r) => {
        if (!r.ok) throw new Error(`map data ${r.status}`)
        return r.json()
      })
      .then((json) => {
        mapCache = json
        if (!cancelled) setData(json)
      })
      .catch((err) => !cancelled && setError(err.message))
    return () => {
      cancelled = true
    }
  }, [])
  return { data, error }
}

/* ---------------- zoom ---------------- */

const ZOOM_MS = 650
const easeInOut = (k) => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2)

function useAnimatedViewBox(target) {
  const [vb, setVb] = useState(target)
  const current = useRef(target)
  const key = target?.join(',')

  useEffect(() => {
    if (!target) return
    const from = current.current
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    if (!from || !from.every(Number.isFinite) || reduce) {
      current.current = target
      setVb(target)
      return
    }
    let raf
    const t0 = performance.now()
    const step = (now) => {
      const k = Math.min(1, (now - t0) / ZOOM_MS)
      const e = easeInOut(k)
      const next = from.map((f, i) => f + (target[i] - f) * e)
      current.current = next
      setVb(next)
      if (k < 1) raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [key]) // eslint-disable-line react-hooks/exhaustive-deps

  return vb
}

/* ---------------- drawing ---------------- */

// A region's colour at rest: mixed 25% toward the page background, so the
// full colour on hover reads as the region lighting up.
const mutedCache = new Map()
function muted(hex) {
  if (!mutedCache.has(hex)) {
    const bg = [0x1f, 0x1d, 0x1a]
    const c = [1, 3, 5].map((i, k) => Math.round(parseInt(hex.slice(i, i + 2), 16) * 0.75 + bg[k] * 0.25))
    mutedCache.set(hex, `rgb(${c.join(', ')})`)
  }
  return mutedCache.get(hex)
}

const NON_SCALING = { vectorEffect: 'non-scaling-stroke' }

// One region: outlines, then fills (see the note at the top). Memoised so hovering one region doesn't
// redraw the other nine.
const RegionLayer = memo(function RegionLayer({ items, fill, dim, border = THEME.border }) {
  return (
    <g style={{ opacity: dim, transition: 'opacity 300ms ease' }}>
      <g fill="none" stroke={border} strokeWidth={3.4} style={NON_SCALING} pointerEvents="none">
        {items.map((t) => (
          <path key={t.id} d={t.d} />
        ))}
      </g>
      {/* a hairline of the fill's own colour closes the anti-aliasing seams
          between neighbouring holdings, so no outline peeks through */}
      <g style={{ fill, stroke: fill, transition: 'fill 200ms ease, stroke 200ms ease' }} strokeWidth={1.2}>
        {items.map((t) => (
          <path key={t.id} d={t.d} data-t={t.index} style={NON_SCALING} />
        ))}
      </g>
    </g>
  )
})

// Holdings borders, castles and names of the zoomed region. `placed` maps
// a castle id to the transform for its name; castles missing from it keep
// their dot but no name (see placeLabels).
const DetailLayer = memo(function DetailLayer({ items, markers, colour, placed, dotScale }) {
  return (
    <g pointerEvents="none" className="realm-detail">
      <g fill="none" stroke={THEME.detail} strokeWidth={0.8} style={NON_SCALING}>
        {items.map((t) => (
          <path key={t.id} d={t.d} />
        ))}
      </g>
      {markers.map((m) => (
        <circle key={m.id} cx={m.x} cy={m.y} r={2.1 * dotScale} fill={colour} stroke={THEME.border} strokeWidth={1} style={NON_SCALING} />
      ))}
      <g strokeWidth={1.6} strokeLinejoin="round" style={{ ...NON_SCALING, paintOrder: 'stroke' }}>
        {markers.map(
          (m) =>
            m.label &&
            placed.has(m.id) && (
              <path
                key={m.id}
                d={m.label}
                transform={placed.get(m.id)}
                fill={m.labelAtSea ? THEME.seaLabel : THEME.label}
                stroke={m.labelAtSea ? THEME.seaLabelHalo : THEME.labelHalo}
              />
            )
        )}
      </g>
    </g>
  )
})

/**
 * Decides which castle names to show in a zoomed region, like a printed map
 * would. Names are enlarged by `scale` around the corner nearest their
 * castle, nudged inside the frame, and placed in order of importance: seats
 * of houses in the archive first, then by the size of the castle's holding.
 * A name that would overlap one already placed (or another castle's dot) is
 * left out; hovering its holding still shows it.
 */
function placeLabels(markers, { scale, view, rank }) {
  const [vx, vy, vw, vh] = view
  const edge = 2
  const pad = 1.1 * scale
  const dotR = 2.6 * Math.sqrt(scale)
  const boxes = []
  const hits = (b) => boxes.some((o) => b[0] < o[2] && b[2] > o[0] && b[1] < o[3] && b[3] > o[1])
  const placed = new Map()

  const order = markers.filter((m) => m.label && m.labelBox).sort((a, b) => rank(a) - rank(b))
  for (const m of order) {
    const [x0, y0, x1, y1] = m.labelBox
    const ax = Math.min(Math.max(m.x, x0), x1)
    const ay = Math.min(Math.max(m.y, y0), y1)
    let b = [ax + (x0 - ax) * scale, ay + (y0 - ay) * scale, ax + (x1 - ax) * scale, ay + (y1 - ay) * scale]
    // keep the name inside the frame
    let dx = 0, dy = 0
    if (b[0] < vx + edge) dx = vx + edge - b[0]
    else if (b[2] > vx + vw - edge) dx = vx + vw - edge - b[2]
    if (b[1] < vy + edge) dy = vy + edge - b[1]
    else if (b[3] > vy + vh - edge) dy = vy + vh - edge - b[3]
    b = [b[0] + dx - pad, b[1] + dy - pad, b[2] + dx + pad, b[3] + dy + pad]
    const otherDots = markers.some((o) => o !== m && Math.hypot(Math.max(b[0] - o.x, 0, o.x - b[2]), Math.max(b[1] - o.y, 0, o.y - b[3])) < dotR)
    if (hits(b) || otherDots) continue
    boxes.push(b)
    placed.set(m.id, `translate(${dx} ${dy}) translate(${ax} ${ay}) scale(${scale}) translate(${-ax} ${-ay})`)
  }
  return placed
}

const MAP_CSS = `
@keyframes realm-fade { from { opacity: 0 } to { opacity: 1 } }
.realm-detail { animation: realm-fade 350ms ease 300ms both }
@media (prefers-reduced-motion: reduce) { .realm-detail { animation: none } }
`

/* ---------------- layout ---------------- */

// The map sits on a stage of fixed height. At rest the frame is tall and
// narrow (the shape of Westeros); zoomed in it widens into a square at the
// same height, pushing the panel right, so the page below never moves.
// On narrow screens the panel goes below and the zoomed square is full width.
const PANEL = 280 // narrowest the side panel gets
const GAP = 40
const WIDE_FROM = 720 // stage width at which the panel sits beside the map
const LABEL_UNITS = 5.5 // height of a castle name, in map units
const ZOOM_CSS_EASE = 'cubic-bezier(0.65, 0, 0.35, 1)' // matches easeInOut

function useStageSize(ref) {
  const [size, setSize] = useState({ width: 0, vh: typeof window === 'undefined' ? 800 : window.innerHeight, ready: false })
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const update = () => setSize({ width: el.clientWidth, vh: window.innerHeight, ready: true })
    const ro = new ResizeObserver(update)
    ro.observe(el)
    window.addEventListener('resize', update)
    update()
    return () => {
      ro.disconnect()
      window.removeEventListener('resize', update)
    }
  }, [ref])
  return { ...size, wide: size.width >= WIDE_FROM }
}

function frameSize({ width, vh, wide }, aspect, zoomed) {
  if (!width) return { width: 0, height: 0 }
  if (wide) {
    const height = Math.min(vh * 0.78, 720)
    const room = width - PANEL - GAP
    return zoomed ? { width: Math.min(height, room), height } : { width: Math.min(height * aspect, room), height }
  }
  if (zoomed) return { width, height: width }
  const height = Math.min(vh * 0.7, width / aspect)
  return { width: height * aspect, height }
}

/* ---------------- component ---------------- */

export default function RealmMap({ simple = false, year = DEFAULT_YEAR, region, onRegionChange, onPick }) {
  const { data, error } = useMapData()
  const { houses: allHouses, eras, error: housesError } = useArchive(!simple)
  const houses = useMemo(() => housesAt(allHouses, eras, year), [allHouses, eras, year])
  const regions = regionsFor(year)

  const [hoveredRegion, setHoveredRegion] = useState(null)
  // The zoomed region, or null for the whole realm. Controlled when the page
  // passes `region` (the Maps page keeps it in the URL).
  const [ownSelected, setOwnSelected] = useState(null)
  const controlled = region !== undefined
  const wanted = controlled ? region : ownSelected
  const selected = !simple && regions.some((r) => r.id === wanted) ? wanted : null
  const zoomed = selected !== null
  const [hoveredTerritory, setHoveredTerritory] = useState(null) // { index, x, y }
  const [litHouse, setLitHouse] = useState(null) // surname key
  const frameRef = useRef(null)
  const stageRef = useRef(null)
  const stage = useStageSize(stageRef)

  // Territories for this era, grouped by region.
  const model = useMemo(() => {
    if (!data) return null
    const territories = data.territories.map((t, index) => {
      const holder = holderOf(t, year)
      return { ...t, index, region: regionOf(t, year), holder, holderKey: surnameKey(holder) }
    })
    const byRegion = Object.fromEntries(regions.map((r) => [r.id, []]))
    territories.forEach((t) => byRegion[t.region]?.push(t))
    const markersByRegion = Object.fromEntries(regions.map((r) => [r.id, []]))
    data.markers.forEach((m) => markersByRegion[m.region]?.push(m))
    const boxes = Object.fromEntries(
      regions.map((r) => [r.id, unionBox(byRegion[r.id].map((t) => t.bbox))])
    )
    // The overview starts just above the northernmost castle name (Hardhome),
    // leaving out the empty top of the Land of Always Winter; zooming into
    // Beyond the Wall still shows all of it.
    const all = unionBox(territories.map((t) => t.bbox))
    const top = Math.min(...data.markers.map((m) => m.labelBox?.[1] ?? m.y)) - 25
    const pad = 6
    const overview = [all[0] - pad, top, all[2] - all[0] + pad * 2, all[3] + pad - top]
    return { territories, byRegion, markersByRegion, boxes, overview, aspect: overview[2] / overview[3] }
  }, [data, year, regions])

  const houseByKey = useMemo(() => new Map((houses ?? []).map((h) => [surnameKey(h.name), h])), [houses])

  // Houses extinct in this year: their lands get hatched.
  const fallen = useMemo(
    () => new Set((houses ?? []).filter((h) => h.status === 'extinct').map((h) => surnameKey(h.name))),
    [houses]
  )

  // Which kingdom each region belonged to this year, from its houses' rows.
  // Regions outside the largest kingdom (the North in 305) are frontiers.
  const kingdoms = useMemo(() => {
    const byRegion = {}
    const total = {}
    for (const r of regions) {
      const counts = {}
      for (const h of houses ?? []) {
        if (!h.kingdom || !matchesRegion(r.id, h.region)) continue
        counts[h.kingdom] = (counts[h.kingdom] ?? 0) + 1
        total[h.kingdom] = (total[h.kingdom] ?? 0) + 1
      }
      const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]
      if (top) byRegion[r.id] = top[0]
    }
    const main = Object.entries(total).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null
    const frontier = new Set(Object.keys(byRegion).filter((id) => byRegion[id] !== main))
    return { byRegion, main, frontier, count: Object.keys(total).length }
  }, [houses, regions])

  const frame = useMemo(() => frameSize(stage, model?.aspect ?? 0.45, zoomed), [stage, model, zoomed])

  const target = useMemo(() => {
    if (!model) return null
    if (!(zoomed && selected)) return model.overview
    if (!frame.width || !frame.height) return null // wait until the frame is measured
    // Never zoom so far that castle names pass ~13px (they are ~5.5 map units tall).
    const minWidth = (frame.width * LABEL_UNITS) / 13
    return fitViewBox(model.boxes[selected], frame.width / frame.height, { minWidth })
  }, [model, zoomed, selected, frame.width, frame.height])
  const viewBox = useAnimatedViewBox(target)

  // Aim for ~11px castle names once zoomed; wide regions that can't zoom that
  // far get their names enlarged a little, never enough to crowd them out.
  const labelScale = target ? Math.min(1.5, Math.max(1, 11 / (LABEL_UNITS * (frame.width / target[2])))) : 1

  const placed = useMemo(() => {
    if (!model || !zoomed || !selected || !target) return new Map()
    const byId = new Map(model.territories.map((t) => [t.id, t]))
    const rank = (m) => {
      const t = byId.get(m.territory)
      if (!t) return 1e9
      const area = (t.bbox[2] - t.bbox[0]) * (t.bbox[3] - t.bbox[1])
      return (houseByKey.has(t.holderKey) ? 0 : 1e7) - area
    }
    return placeLabels(model.markersByRegion[selected], { scale: labelScale, view: target, rank })
  }, [model, zoomed, selected, target, labelScale, houseByKey])

  // Choosing a region zooms straight into it (or, simple, hands it to
  // onPick); null returns to the whole realm.
  const select = useCallback(
    (id) => {
      if (simple) {
        if (id) onPick?.(id)
        return
      }
      if (controlled) onRegionChange?.(id)
      else setOwnSelected(id)
      setLitHouse(null)
      setHoveredTerritory(null)
    },
    [simple, controlled, onRegionChange, onPick]
  )

  useEffect(() => {
    if (!zoomed) return
    const onKey = (e) => e.key === 'Escape' && select(null)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [zoomed, select])

  const territoryFromEvent = (e) => {
    const t = e.target?.dataset?.t
    return t === undefined ? null : model.territories[+t]
  }
  const pointIn = (e) => {
    const rect = frameRef.current.getBoundingClientRect()
    return { x: e.clientX - rect.left, y: e.clientY - rect.top }
  }

  const onPointerMove = (e) => {
    if (!model || e.pointerType !== 'mouse') return
    const t = territoryFromEvent(e)
    setHoveredRegion(t?.region ?? null)
    if (zoomed && t && t.region === selected) setHoveredTerritory({ index: t.index, ...pointIn(e) })
    else setHoveredTerritory(null)
  }

  const onPointerLeave = () => {
    setHoveredRegion(null)
    setHoveredTerritory(null)
  }

  const onClick = (e) => {
    if (!model) return
    const t = territoryFromEvent(e)
    if (!t) return zoomed && select(null) // the sea takes you back out
    if (t.region !== selected) return select(t.region) // zoom in, or glide to a neighbour
    // inside the zoomed region: name the holding (taps have no hover), and
    // pick out its house in the panel if the archive has it
    setHoveredTerritory({ index: t.index, ...pointIn(e) })
    if (houseByKey.has(t.holderKey)) setLitHouse((cur) => (cur === t.holderKey ? null : t.holderKey))
  }

  const selectedRegion = regions.find((r) => r.id === selected) ?? null
  const shownRegion = regions.find((r) => r.id === (selected ?? hoveredRegion)) ?? null
  const cursor = simple
    ? hoveredRegion
      ? 'pointer'
      : 'default'
    : hoveredRegion
      ? zoomed && hoveredRegion === selected
        ? 'default'
        : 'zoom-in'
      : zoomed
        ? 'zoom-out'
        : 'default'

  const hovered = hoveredTerritory ? model?.territories[hoveredTerritory.index] : null
  const hoveredHouse = hovered ? houseByKey.get(hovered.holderKey) : null
  const litTerritories = litHouse && model ? model.territories.filter((t) => t.holderKey === litHouse) : []

  return (
    <div ref={stageRef} className={`flex ${stage.wide ? 'flex-row items-start justify-center' : 'flex-col items-center'}`} style={{ gap: GAP }}>
      <div className="shrink-0">
        <div
          ref={frameRef}
          className="relative select-none"
          style={{
            width: frame.width,
            height: frame.height,
            transition: stage.ready ? `width ${ZOOM_MS}ms ${ZOOM_CSS_EASE}, height ${ZOOM_MS}ms ${ZOOM_CSS_EASE}` : 'none',
            // the overview is cropped at the top; let the far north fade out
            maskImage: zoomed ? 'none' : 'linear-gradient(to bottom, transparent, #000 5%)',
            WebkitMaskImage: zoomed ? 'none' : 'linear-gradient(to bottom, transparent, #000 5%)',
          }}
        >
          {!model && !error && (
            <div className="absolute inset-0 grid place-items-center text-realm-muted italic" style={GARAMOND}>
              Unrolling the map…
            </div>
          )}
          {error && (
            <p className="absolute inset-0 grid place-items-center text-realm-muted italic" style={GARAMOND}>
              The map could not be found.
            </p>
          )}
          {model && viewBox && (
            <svg
              viewBox={viewBox.join(' ')}
              preserveAspectRatio="xMidYMid meet"
              className="absolute inset-0 w-full h-full"
              style={{ cursor }}
              role="img"
              aria-label={shownRegion ? `Map of Westeros, ${shownRegion.name} highlighted` : 'Map of Westeros'}
              onPointerMove={onPointerMove}
              onPointerLeave={onPointerLeave}
              onClick={onClick}
            >
              <style>{MAP_CSS}</style>
              <defs>
                <pattern id="realm-fallen" width="4" height="4" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                  <rect width="1.3" height="4" fill="rgba(20, 18, 16, 0.55)" />
                </pattern>
              </defs>
              {[...regions].sort((a, b) => kingdoms.frontier.has(a.id) - kingdoms.frontier.has(b.id)).map((r) => {
                // Whole realm: every region in its colour, a little muted,
                // brightening on hover. Zoomed: the chosen region in full
                // colour, the rest grey, a hovered neighbour hinting its colour.
                let fill, dim
                if (!zoomed) {
                  fill = r.id === hoveredRegion ? r.colour : muted(r.colour)
                  dim = 1
                } else if (r.id === selected) {
                  fill = r.colour
                  dim = 1
                } else {
                  fill = r.id === hoveredRegion ? muted(r.colour) : THEME.land
                  dim = r.id === hoveredRegion ? 0.7 : 0.4
                }
                const border = kingdoms.frontier.has(r.id) ? THEME.highlight : THEME.border
                return <RegionLayer key={r.id} items={model.byRegion[r.id]} fill={fill} dim={dim} border={border} />
              })}

              {/* lands of houses extinct this year */}
              {fallen.size > 0 && (
                <g pointerEvents="none" fill="url(#realm-fallen)">
                  {model.territories
                    .filter((t) => fallen.has(t.holderKey) && (!zoomed || t.region === selected))
                    .map((t) => (
                      <path key={t.id} d={t.d} />
                    ))}
                </g>
              )}

              {/* a house's lands, lit from the panel or by clicking them */}
              {litTerritories.length > 0 && (
                <g pointerEvents="none" fill="rgba(255,248,232,0.16)" stroke={THEME.highlight} strokeWidth={1.6} style={NON_SCALING}>
                  {litTerritories.map((t) => (
                    <path key={t.id} d={t.d} />
                  ))}
                </g>
              )}

              {zoomed && selected && (
                <DetailLayer
                  key={selected}
                  items={model.byRegion[selected]}
                  markers={model.markersByRegion[selected]}
                  colour={selectedRegion.colour}
                  placed={placed}
                  dotScale={Math.sqrt(labelScale)}
                />
              )}

              {hovered && (
                <path d={hovered.d} fill="rgba(255,248,232,0.14)" pointerEvents="none" />
              )}
            </svg>
          )}

          {hovered && hoveredTerritory && (
            <div
              className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-[calc(100%+12px)] whitespace-nowrap border border-realm-gold/30 bg-realm-panel/95 px-3 py-1.5 flex items-center gap-2"
              style={{ left: hoveredTerritory.x, top: hoveredTerritory.y }}
            >
              {hoveredHouse && (
                <img src={hoveredHouse.imageUrl || `/houses/sigils/${hoveredHouse.slug}.svg`} alt="" className="h-5 w-5 object-contain" />
              )}
              <span className="text-[15px] text-realm-cream" style={GARAMOND}>
                {displayName(hovered.id)}
              </span>
            </div>
          )}
        </div>
        <p className="mt-3 text-center text-[13px] italic text-realm-faint" style={GARAMOND}>
          Map adapted from{' '}
          <a href="https://www.mapchart.net/westeros.html" className="underline decoration-realm-faint/40 hover:text-realm-muted" target="_blank" rel="noreferrer">
            MapChart
          </a>
          , CC BY-SA 4.0
        </p>
      </div>

      <aside className="w-full min-w-0 max-w-[380px] flex-1 self-stretch overflow-y-auto" style={stage.wide ? { maxHeight: frame.height } : undefined}>
        {selectedRegion ? (
          <RegionPanel
            region={selectedRegion}
            kingdom={kingdoms.count > 1 ? kingdoms.byRegion[selected] : null}
            onBack={() => select(null)}
            houses={houses}
            housesError={housesError}
            holders={new Set((model?.byRegion[selected] ?? []).map((t) => t.holderKey))}
            litHouse={litHouse}
            onLightHouse={setLitHouse}
          />
        ) : (
          <RegionList regions={regions} hovered={hoveredRegion} onHover={setHoveredRegion} onSelect={select} simple={simple} />
        )}
      </aside>
    </div>
  )
}

/* ---------------- panel ---------------- */

function Diamond({ colour, size = 'h-2.5 w-2.5' }) {
  return <span aria-hidden className={`${size} rotate-45 shrink-0 transition-colors`} style={{ background: colour }} />
}

function RegionList({ regions, hovered, onHover, onSelect, simple }) {
  return (
    <div>
      <p className="text-[17px] italic text-realm-body mb-5" style={GARAMOND}>
        {simple ? 'Choose a region to explore its lands.' : 'Choose a region to see its houses and castles.'}
      </p>
      <ul className="border-t border-realm-gold/15" onMouseLeave={() => onHover(null)}>
        {regions.map((r) => (
          <li key={r.id} className="border-b border-realm-gold/15">
            <button
              type="button"
              onMouseEnter={() => onHover(r.id)}
              onFocus={() => onHover(r.id)}
              onBlur={() => onHover(null)}
              onClick={() => onSelect(r.id)}
              className={`w-full flex items-center gap-3 px-1 py-2.5 text-left text-[17px] transition-colors ${
                hovered === r.id ? 'text-realm-cream' : 'text-realm-body'
              } ${FOCUS}`}
              style={GARAMOND}
            >
              <Diamond colour={hovered === r.id ? r.colour : muted(r.colour)} />
              {r.name}
            </button>
          </li>
        ))}
      </ul>
      {simple && (
        <Link to="/maps" className={`mt-5 inline-block text-[16px] italic text-realm-gold hover:text-realm-gold-hover ${FOCUS}`} style={GARAMOND}>
          The realm through the ages
        </Link>
      )}
    </div>
  )
}

function RegionPanel({ region, kingdom, onBack, houses, housesError, holders, litHouse, onLightHouse }) {
  const inRegion = useMemo(
    () =>
      (houses ?? [])
        .filter((h) => matchesRegion(region.id, h.region))
        .sort((a, b) => (a.tier === 'great' ? 0 : 1) - (b.tier === 'great' ? 0 : 1) || a.name.localeCompare(b.name)),
    [houses, region.id]
  )

  return (
    <div>
      <button
        type="button"
        onClick={onBack}
        className={`text-[15px] italic text-realm-muted hover:text-realm-gold mb-4 ${FOCUS}`}
        style={GARAMOND}
      >
        ← The whole realm
      </button>
      <h3 className="flex items-center gap-3 text-[22px] text-realm-cream" style={CINZEL}>
        <Diamond colour={region.colour} size="h-3 w-3" />
        {region.name}
      </h3>
      {kingdom && (
        <p className="mt-1.5 text-[15px] italic text-realm-gold" style={GARAMOND}>
          {kingdom}
        </p>
      )}

      <div className="mt-5">
        {housesError && <p className="text-realm-ember italic" style={GARAMOND}>{housesError}</p>}
        {!houses && !housesError && <p className="text-realm-muted italic" style={GARAMOND}>Consulting the maesters…</p>}
        {houses && inRegion.length === 0 && (
          <p className="text-[17px] italic text-realm-body" style={GARAMOND}>
            No house in the archive holds these lands.
          </p>
        )}

        <ul className="border-t border-realm-gold/15" onMouseLeave={() => onLightHouse(null)}>
          {inRegion.map((h) => {
            const key = surnameKey(h.name)
            const hasLands = holders.has(key)
            const lit = litHouse === key
            const fallenHouse = h.status === 'extinct'
            const standing = fallenHouse ? 'Extinct' : h.status && h.status !== 'active' && h.status !== 'royalty' ? h.status : null
            return (
              <li key={h.id} className="border-b border-realm-gold/15">
                <Link
                  to={`/houses?region=${encodeURIComponent(h.region)}&house=${encodeURIComponent(h.slug)}`}
                  onMouseEnter={() => onLightHouse(hasLands ? key : null)}
                  onFocus={() => onLightHouse(hasLands ? key : null)}
                  className={`flex items-center gap-3 px-1 py-2.5 group transition-colors ${
                    lit ? 'bg-[rgba(216,184,120,.07)]' : ''
                  } ${FOCUS}`}
                >
                  <img
                    src={h.imageUrl || `/houses/sigils/${h.slug}.svg`}
                    alt=""
                    className={`h-9 w-9 object-contain shrink-0 ${fallenHouse ? 'opacity-45 grayscale' : ''}`}
                    loading="lazy"
                  />
                  <span className="min-w-0">
                    <span
                      className={`block text-[17px] transition-colors ${lit ? 'text-realm-gold' : 'text-realm-ink group-hover:text-realm-gold'}`}
                      style={GARAMOND}
                    >
                      {h.name}
                    </span>
                    {(standing || h.currentLord) && (
                      <span
                        className={`block text-[14px] italic truncate ${fallenHouse ? 'text-realm-ember/80' : 'text-realm-muted'}`}
                        style={GARAMOND}
                      >
                        {standing ?? h.currentLord}
                      </span>
                    )}
                  </span>
                </Link>
              </li>
            )
          })}
        </ul>
      </div>
    </div>
  )
}