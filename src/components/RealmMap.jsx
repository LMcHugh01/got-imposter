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
 * region. Its castles appear (those in the castles table, sized by tier),
 * the rest of the realm turns grey, and the panel lists its houses as they
 * stood in `year`. Pointing at (or tapping) a castle shows who holds it that
 * year, or that it's unoccupied; clicking it picks out its house.
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

/* ---------------- castles ---------------- */

// Icon height on screen, in px, per size tier (castles.icon_size).
const CASTLE_PX = { large: 30, medium: 22, small: 16 }
const CASTLE_NAME_PX = 12

// A castle: towers either side of a crenellated keep, with a gate. Drawn in
// a 24 × 24 box, centred on the castle's spot by CastleLayer.
const CASTLE_PATH = 'M3 22V11h2V7h3v3h2V7h4v3h2V7h3v4h2v11h-7v-5a2 2 0 0 0-4 0v5H3z'

// "The Eyrie", "Eyrie", "Storm_s_End" and "Storm's End" all compare equal.
const placeKey = (name) =>
  (name ?? '')
    .replace(/_s_/g, "'s ")
    .replace(/_/g, ' ')
    .trim()
    .toLowerCase()
    .replace(/^the\s+/, '')

/**
 * Castles from the castles table, placed on the map: at the map's marker
 * of the same name (or `mapMarker`), or at a hand-set x/y. A castle with
 * neither is left out (the map has no spot for it). Its region is its
 * marker's, or else that of the lands it stands in (the smallest holding
 * whose bounds contain it: Driftmark's island, not the whole Crownlands).
 */
function regionAt(x, y, territories) {
  let best = null
  for (const t of territories) {
    const [x0, y0, x1, y1] = t.bbox
    if (x < x0 || x > x1 || y < y0 || y > y1) continue
    const area = (x1 - x0) * (y1 - y0)
    if (!best || area < best.area) best = { area, region: t.region }
  }
  return best?.region ?? null
}

function placeCastles(rows, markers, territories) {
  const markerByKey = new Map(markers.map((m) => [placeKey(m.id), m]))
  const placed = []
  for (const c of rows ?? []) {
    const marker = markerByKey.get(placeKey(c.mapMarker ?? c.name))
    const x = c.x ?? marker?.x
    const y = c.y ?? marker?.y
    if (x == null || y == null) continue
    placed.push({
      ...c,
      x,
      y,
      size: CASTLE_PX[c.iconSize] ? c.iconSize : 'medium',
      region: marker?.region ?? regionAt(x, y, territories),
      keys: [c.name, ...(c.aliases ?? [])].map(placeKey),
    })
  }
  return placed
}

// Exiled and extinct houses hold nothing in that era.
const holdsNothing = (h) => ['exiled', 'extinct'].includes((h.status ?? '').toLowerCase())

/**
 * Who holds a castle in the selected era: a seated house (not exiled or
 * extinct) that lists it among its seats, or among a branch's seats.
 * Nobody: unoccupied.
 */
function occupantOf(castle, houses) {
  for (const h of houses ?? []) {
    if (holdsNothing(h)) continue
    const seats = [...(h.seats ?? []), ...(h.branches ?? []).map((b) => b.seat)].map(placeKey)
    if (castle.keys.some((k) => seats.includes(k))) return h
  }
  return null
}

// The zoomed region's castles: an icon sized by tier and the castle's
// name beneath. `unit` is one screen pixel in map units, so icons and
// names keep their on-screen size whatever the zoom. Castles are white
// with a black border (faded when unoccupied); `lit` castles (pointed at,
// or of the house picked in the panel) turn gold.
/**
 * A house's seats this era, main seat first: its branches' seats in order,
 * then any other seats. Each is { name, branch } (branch: the branch row
 * with its index, or null for a seat outside any branch).
 */
function seatsOf(h) {
  const out = []
  const seen = new Set()
  const add = (name, branch) => {
    const k = placeKey(name)
    if (!name || seen.has(k)) return
    seen.add(k)
    out.push({ name, branch })
  }
  ;(h.branches ?? []).forEach((b, index) => add(b.seat, { ...b, index }))
  ;(h.seats ?? []).forEach((seat) => add(seat, null))
  return out
}

/**
 * Who rules a house's castle this era: the lord of the branch seated there
 * (Commander Cotter Pyke at Eastwatch), or, at the main seat or for a
 * house without branches, the era's own ruler (a regent or castellan
 * running things first). A lesser branch with no lord recorded: unknown.
 */
function rulerOf(h, castle) {
  const branch = seatsOf(h).find((s) => s.branch && castle.keys.includes(placeKey(s.name)))?.branch
  if (branch?.lord) return { name: branch.lord, title: branch.rulerLabel ?? null }
  if (branch && branch.index > 0) return null
  const name = h.regent || h.castellan || h.currentLord || null
  return name ? { name, title: branch?.rulerLabel ?? h.rulerLabel ?? null } : null
}

// A castle name's width in px at CASTLE_NAME_PX, measured in the real font
// (with a fallback estimate before fonts are ready or without a canvas).
let measureCtx = null
function nameWidthPx(name) {
  if (typeof document !== 'undefined') {
    measureCtx ??= document.createElement('canvas').getContext('2d')
    if (measureCtx) {
      measureCtx.font = `${CASTLE_NAME_PX}px Cinzel, serif`
      return measureCtx.measureText(name).width + name.length * CASTLE_NAME_PX * 0.06
    }
  }
  return name.length * CASTLE_NAME_PX * 0.72
}

// Where each castle's name tag goes: below its icon, or else above, to the
// right or to the left, whichever is first clear of every other name and
// every other castle's icon (Dragonstone and Driftmark sit close together).
// Larger castles choose first. Returns id -> tag box [x, y, width, height].
const SIZE_RANK = { large: 0, medium: 1, small: 2 }
function placeCastleNames(castles, unit) {
  const nameSize = CASTLE_NAME_PX * unit
  const tagH = nameSize + 7 * unit
  const iconBox = (c) => {
    const h = (CASTLE_PX[c.size] / 2) * unit
    return [c.x - h, c.y - h, c.x + h, c.y + h]
  }
  const taken = []
  const hits = (b, self) =>
    taken.some((o) => b[0] < o[2] && b[2] > o[0] && b[1] < o[3] && b[3] > o[1]) ||
    castles.some((o) => o !== self && (([x0, y0, x1, y1]) => b[0] < x1 && b[2] > x0 && b[1] < y1 && b[3] > y0)(iconBox(o)))
  const placed = new Map()
  for (const c of [...castles].sort((a, b) => SIZE_RANK[a.size] - SIZE_RANK[b.size])) {
    const w = (nameWidthPx(c.name) + 12) * unit
    const gap = (CASTLE_PX[c.size] / 2 + 4) * unit
    const options = [
      [c.x - w / 2, c.y + gap], // below
      [c.x - w / 2, c.y - gap - tagH], // above
      [c.x + gap, c.y - tagH / 2], // right
      [c.x - gap - w, c.y - tagH / 2], // left
    ].map(([x, y]) => [x, y, x + w, y + tagH])
    const box = options.find((o) => !hits(o, c)) ?? options[0]
    taken.push(box)
    placed.set(c.id, [box[0], box[1], w, tagH])
  }
  return placed
}

const CastleLayer = memo(function CastleLayer({ castles, unit, lit }) {
  const tags = useMemo(() => placeCastleNames(castles, unit), [castles, unit])
  return (
    <g className="realm-detail">
      {castles.map((c) => {
        const on = lit.has(c.id)
        const px = CASTLE_PX[c.size] * (on ? 1.15 : 1)
        const s = (px * unit) / 24
        const nameSize = CASTLE_NAME_PX * unit
        const [tagX, tagY, tagW, tagH] = tags.get(c.id)
        return (
          <g key={c.id} data-castle={c.id} style={{ cursor: 'pointer' }}>
            {/* a generous invisible hit area, so small icons are easy to tap */}
            <circle cx={c.x} cy={c.y} r={Math.max(px, 26) * 0.6 * unit} fill="transparent" />
            {/* white with a black border; gold when selected; faded when unoccupied */}
            <path
              d={CASTLE_PATH}
              transform={`translate(${c.x - 12 * s} ${c.y - 12 * s}) scale(${s})`}
              fill={on ? '#d8b878' : '#f4efe4'}
              fillOpacity={c.occupant || on ? 1 : 0.5}
              stroke="#141210"
              strokeWidth={1.25}
              strokeLinejoin="round"
              style={{ ...NON_SCALING, filter: on ? 'drop-shadow(0 0 4px rgba(238,212,155,.8))' : undefined }}
            />
            {/* the name on a small dark tag, readable on any region's colour */}
            <rect
              x={tagX}
              y={tagY}
              width={tagW}
              height={tagH}
              rx={2 * unit}
              fill="rgba(20, 18, 16, 0.78)"
              pointerEvents="none"
            />
            <text
              x={tagX + tagW / 2}
              y={tagY + tagH / 2}
              textAnchor="middle"
              dominantBaseline="central"
              fontSize={nameSize}
              fill={on ? '#eed49b' : c.occupant ? '#f1e6cc' : '#a89e8c'}
              pointerEvents="none"
              style={{ fontFamily: "'Cinzel', serif", letterSpacing: '0.06em' }}
            >
              {c.name}
            </text>
          </g>
        )
      })}
    </g>
  )
})

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
  const { houses: allHouses, eras, castles: castleRows, error: housesError } = useArchive(!simple)
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
  // The castle pointed at, and the castle selected (by clicking it, or one of
  // its house's seats in the panel). The selected one's card stays open.
  const [hoverCastle, setHoverCastle] = useState(null)
  const [pinnedCastle, setPinnedCastle] = useState(null)
  const shownCastle = hoverCastle ?? pinnedCastle
  // A house picked out in the panel (by surname key): hovered previews it,
  // clicking pins it. Its castles turn gold.
  const [hoverHouse, setHoverHouse] = useState(null)
  const [pinnedHouse, setPinnedHouse] = useState(null)
  const litHouse = hoverHouse ?? pinnedHouse
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
    // Frame the region's land and its castles together: castles on its edge
    // (the Wall's, at the foot of Beyond the Wall) keep room for their names.
    const margin = 18
    const box = placeCastles(castleRows, data.markers, model.territories)
      .filter((c) => c.region === selected)
      .reduce(
        (b, c) => [Math.min(b[0], c.x - margin), Math.min(b[1], c.y - margin), Math.max(b[2], c.x + margin), Math.max(b[3], c.y + margin * 1.6)],
        model.boxes[selected]
      )
    return fitViewBox(box, frame.width / frame.height, { minWidth })
  }, [model, data, castleRows, zoomed, selected, frame.width, frame.height])
  const viewBox = useAnimatedViewBox(target)

  // One screen pixel in map units at the zoom being shown (castle icons and
  // names are sized in screen pixels).
  const unit = target && frame.width ? target[2] / frame.width : 1

  // Every castle placed on the map, with who holds it this era.
  const castles = useMemo(() => {
    if (!model || !data) return []
    return placeCastles(castleRows, data.markers, model.territories).map((c) => ({ ...c, occupant: occupantOf(c, houses) }))
  }, [model, data, castleRows, houses])

  const regionCastles = useMemo(
    () => (zoomed ? castles.filter((c) => c.region === selected) : []),
    [castles, zoomed, selected]
  )

  // Castles to glow: the one pointed at, and those of the house lit in the panel.
  const litCastles = useMemo(() => {
    const ids = new Set()
    if (shownCastle != null) ids.add(shownCastle)
    if (litHouse) regionCastles.forEach((c) => c.occupant && surnameKey(c.occupant.name) === litHouse && ids.add(c.id))
    return ids
  }, [shownCastle, litHouse, regionCastles])

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
      setHoverHouse(null)
      setPinnedHouse(null)
      setHoverCastle(null)
      setPinnedCastle(null)
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
  const castleFromEvent = (e) => {
    const id = e.target?.closest?.('[data-castle]')?.dataset.castle
    return id === undefined ? null : regionCastles.find((c) => String(c.id) === id) ?? null
  }

  const onPointerMove = (e) => {
    if (!model || e.pointerType !== 'mouse') return
    const castle = zoomed ? castleFromEvent(e) : null
    if (castle) {
      setHoveredRegion(selected)
      setHoverCastle(castle.id)
      return
    }
    const t = territoryFromEvent(e)
    setHoveredRegion(t?.region ?? null)
    setHoverCastle(null)
  }

  const onPointerLeave = () => {
    setHoveredRegion(null)
    setHoverCastle(null)
  }

  // Select a castle, gliding to its region first if it's elsewhere (Storm's
  // End, picked from the Baratheons' seats in the Crownlands).
  const pickCastle = (castle) => {
    if (castle.region !== selected) select(castle.region)
    setPinnedCastle(castle.id)
    setPinnedHouse(castle.occupant ? surnameKey(castle.occupant.name) : null)
    setHoverHouse(null)
  }

  const onClick = (e) => {
    if (!model) return
    const castle = zoomed ? castleFromEvent(e) : null
    if (castle) {
      if (pinnedCastle === castle.id) {
        setPinnedCastle(null)
        setPinnedHouse(null)
      } else pickCastle(castle)
      return
    }
    const t = territoryFromEvent(e)
    if (!t) return zoomed && select(null) // the sea takes you back out
    if (t.region !== selected) return select(t.region) // zoom in, or glide to a neighbour
    // elsewhere in the zoomed region: let go of the selected castle
    setPinnedCastle(null)
    setPinnedHouse(null)
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

  const tipCastle = shownCastle != null ? regionCastles.find((c) => c.id === shownCastle) ?? null : null
  const tipRuler = tipCastle?.occupant ? rulerOf(tipCastle.occupant, tipCastle) : null

  // Where a map point is on screen, inside the frame (the card sits above
  // its castle and follows it while the map glides).
  const toScreen = (x, y) => {
    const [vx, vy, vw, vh] = viewBox
    const sc = Math.min(frame.width / vw, frame.height / vh)
    return { left: (frame.width - vw * sc) / 2 + (x - vx) * sc, top: (frame.height - vh * sc) / 2 + (y - vy) * sc }
  }
  const tipAt = tipCastle && viewBox ? toScreen(tipCastle.x, tipCastle.y) : null

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


              {zoomed && selected && regionCastles.length > 0 && (
                <CastleLayer key={selected} castles={regionCastles} unit={unit} lit={litCastles} />
              )}
            </svg>
          )}

          {tipCastle && tipAt && (
            <div
              className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full whitespace-nowrap border border-realm-gold/30 bg-realm-panel/95 px-3.5 py-2.5"
              style={{ left: tipAt.left, top: tipAt.top - CASTLE_PX[tipCastle.size] / 2 - 10 }}
            >
              <p className="text-[13px] uppercase tracking-[0.18em] text-realm-gold" style={CINZEL}>
                {tipCastle.name}
              </p>
              {tipCastle.occupant ? (
                <div className="mt-1.5 flex items-center gap-2.5">
                  <img
                    src={tipCastle.occupant.imageUrl || `/houses/sigils/${tipCastle.occupant.slug}.svg`}
                    alt=""
                    className="h-7 w-7 object-contain"
                  />
                  <span>
                    <span className="block text-[16px] text-realm-cream leading-tight" style={GARAMOND}>
                      {tipCastle.occupant.name}
                    </span>
                    {tipRuler && (
                      <span className="block text-[14px] italic text-realm-muted leading-tight" style={GARAMOND}>
                        {tipRuler.title ? `${tipRuler.title} ${tipRuler.name}` : tipRuler.name}
                      </span>
                    )}
                  </span>
                </div>
              ) : (
                <p className="mt-1 text-[15px] italic text-realm-muted" style={GARAMOND}>
                  Unoccupied
                </p>
              )}
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
            castles={regionCastles}
            allCastles={castles}
            housesError={housesError}
            litHouse={litHouse}
            pinnedHouse={pinnedHouse}
            pinnedCastle={pinnedCastle}
            onHoverHouse={setHoverHouse}
            onPinHouse={(key) => {
              setPinnedHouse((cur) => (cur === key ? null : key))
              setPinnedCastle(null)
            }}
            onPickCastle={pickCastle}
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

// The panel's groups, top to bottom, by tier. The royal house sits with the
// Great Houses; houses still on the old 'vassal' tier count as lordly.
const TIER_GROUPS = [
  { tier: 'great', label: 'Great Houses' },
  { tier: 'lordly', label: 'Lordly Houses' },
  { tier: 'knightly', label: 'Knightly Houses' },
  { tier: 'unknown', label: 'Other Houses' },
  { tier: 'order', label: 'Orders' },
]
const tierGroupOf = (h) => (h.tier === 'vassal' ? 'lordly' : TIER_GROUPS.some((g) => g.tier === h.tier) ? h.tier : 'unknown')

function RegionPanel({
  region,
  kingdom,
  onBack,
  houses,
  castles,
  allCastles,
  housesError,
  litHouse,
  pinnedHouse,
  pinnedCastle,
  onHoverHouse,
  onPinHouse,
  onPickCastle,
}) {
  // Houses holding a castle in this region this era.
  const holdsHere = useMemo(
    () => new Set((castles ?? []).filter((c) => c.occupant).map((c) => surnameKey(c.occupant.name))),
    [castles]
  )

  // Who's here this era: houses holding a castle in the region (the
  // Baratheons at King's Landing), and the region's own houses that are
  // seated (whose castles may have no spot on the map, like Driftmark).
  // Exiled and extinct houses hold nothing, so they're left out.
  const groups = useMemo(() => {
    const here = (houses ?? []).filter(
      (h) => !holdsNothing(h) && (holdsHere.has(surnameKey(h.name)) || matchesRegion(region.id, h.region))
    )
    const royalFirst = (a, b) =>
      ((b.status ?? '').toLowerCase() === 'royalty') - ((a.status ?? '').toLowerCase() === 'royalty') || a.name.localeCompare(b.name)
    return TIER_GROUPS.map((g) => ({ ...g, houses: here.filter((h) => tierGroupOf(h) === g.tier).sort(royalFirst) })).filter(
      (g) => g.houses.length > 0
    )
  }, [houses, region.id, holdsHere])

  // A seat's castle on the map, if it has one (matched by name or alias).
  const castleFor = (seat) => (allCastles ?? []).find((c) => c.keys.includes(placeKey(seat))) ?? null

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

      <div className="mt-5" onMouseLeave={() => onHoverHouse(null)}>
        {housesError && <p className="text-realm-ember italic" style={GARAMOND}>{housesError}</p>}
        {!houses && !housesError && <p className="text-realm-muted italic" style={GARAMOND}>Consulting the maesters…</p>}
        {houses && groups.length === 0 && (
          <p className="text-[17px] italic text-realm-body" style={GARAMOND}>
            No house in the archive holds these lands.
          </p>
        )}

        {groups.map((g) => (
          <section key={g.tier} className="mb-5">
            <h4 className="mb-1.5 text-[11px] uppercase tracking-[0.28em] text-realm-gold/70" style={CINZEL}>
              {g.label}
            </h4>
            <ul className="border-t border-realm-gold/15">
              {g.houses.map((h) => {
                const key = surnameKey(h.name)
                const lit = litHouse === key
                // a free-text status ('Diminished') still shows
                const standing = h.status && !['active', 'royalty'].includes(h.status.toLowerCase()) ? h.status : null
                return (
                  <li key={h.id} className={`border-b border-realm-gold/15 py-2.5 transition-colors ${lit ? 'bg-[rgba(216,184,120,.07)]' : ''}`}>
                    <button
                      type="button"
                      aria-pressed={pinnedHouse === key}
                      onClick={() => onPinHouse(key)}
                      onMouseEnter={() => onHoverHouse(key)}
                      onFocus={() => onHoverHouse(key)}
                      onBlur={() => onHoverHouse(null)}
                      className={`w-full text-left flex items-center gap-3 px-1 group cursor-pointer ${FOCUS}`}
                    >
                      <img src={h.imageUrl || `/houses/sigils/${h.slug}.svg`} alt="" className="h-9 w-9 object-contain shrink-0" loading="lazy" />
                      <span className="min-w-0">
                        <span
                          className={`block text-[17px] transition-colors ${lit ? 'text-realm-gold' : 'text-realm-ink group-hover:text-realm-gold'}`}
                          style={GARAMOND}
                        >
                          {h.name}
                        </span>
                        {standing && (
                          <span className="block text-[14px] italic text-realm-muted" style={GARAMOND}>
                            {standing}
                          </span>
                        )}
                      </span>
                    </button>

                    {/* every seat, main seat first; seats on the map take you to their castle */}
                    <ul className="mt-1 ml-[52px] flex flex-col">
                      {seatsOf(h).map(({ name }) => {
                        const castle = castleFor(name)
                        const on = castle && pinnedCastle === castle.id
                        return (
                          <li key={name}>
                            {castle ? (
                              <button
                                type="button"
                                onClick={() => onPickCastle(castle)}
                                className={`flex items-center gap-2 py-0.5 text-[14px] italic transition-colors cursor-pointer ${
                                  on ? 'text-realm-gold' : 'text-realm-muted hover:text-realm-gold'
                                } ${FOCUS}`}
                                style={GARAMOND}
                              >
                                <span aria-hidden="true" className={`w-[5px] h-[5px] rotate-45 shrink-0 ${on ? 'bg-realm-gold' : 'bg-realm-gold/45'}`} />
                                {castle.name}
                              </button>
                            ) : (
                              <span className="flex items-center gap-2 py-0.5 text-[14px] italic text-realm-faint" style={GARAMOND}>
                                <span aria-hidden="true" className="w-[5px] h-[5px] rotate-45 shrink-0 border border-realm-gold/30" />
                                {name}
                              </span>
                            )}
                          </li>
                        )
                      })}
                    </ul>
                  </li>
                )
              })}
            </ul>
          </section>
        ))}
      </div>
    </div>
  )
}