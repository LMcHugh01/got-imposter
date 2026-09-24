/**
 * scripts/buildRealmMap.mjs
 *
 * Turns the MapChart export (scripts/westeros-mapchart.svg) into
 * public/map/realm.json, the only thing the site loads.
 *
 *   node scripts/buildRealmMap.mjs
 *
 * What it does:
 *   - keeps every territory shape (one per house's lands), tagged with its
 *     region by fill colour and its 298 AC holder by id ("Stark_of_Winterfell")
 *   - keeps every castle marker (the small circles), with its centre
 *   - splits MapChart's single merged label shape ("Department_Names") into
 *     one label per castle: letters are grouped into words/lines, and each
 *     group goes to the nearest castle marker
 *   - drops the legend, patterns and styling
 *
 * Re-colour or re-export the map on mapchart.net, save it over
 * scripts/westeros-mapchart.svg, and run this again. If you change a region
 * colour there, change it in REGION_BY_FILL below too.
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const SRC = path.join(here, 'westeros-mapchart.svg')
const OUT = path.join(here, '..', 'public', 'map', 'realm.json')

// MapChart fill colour → region id (must match REGIONS in src/lib/realmMap.js)
const REGION_BY_FILL = {
  '#dce7ec': 'beyond-the-wall',
  '#7f9cb0': 'north',
  '#3d8f87': 'iron-islands',
  '#3f6fb5': 'riverlands',
  '#8cc4e8': 'vale',
  '#b8252d': 'westerlands',
  '#c9a75a': 'crownlands',
  '#e8d23a': 'stormlands',
  '#23933a': 'reach',
  '#e0762a': 'dorne',
}
// Shapes MapChart left uncoloured, placed by hand.
const REGION_OVERRIDES = { Ghaston_Grey: 'dorne' }

const LABELS_ID = 'Department_Names'
const MARKER_SIZE = 8.6 // castle circles are 8.6 × 8.6 in map units

/* ---------------- path parsing ---------------- */

const ARGS = { m: 2, l: 2, h: 1, v: 1, c: 6, s: 4, q: 4, t: 2, a: 7, z: 0 }

// Tokenise a path into [{ cmd, args }], one entry per command *segment*
// (implicit repeats are split out, so "l1 2 3 4" becomes two "l" segments;
// extra pairs after "m" become "l" segments, per the SVG spec).
function parsePath(d) {
  const out = []
  let i = 0
  const n = d.length
  const skip = () => {
    while (i < n && /[\s,]/.test(d[i])) i++
  }
  const num = () => {
    skip()
    const m = /^[+-]?(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?/.exec(d.slice(i, i + 40))
    if (!m) throw new Error(`Bad number at ${i}: ${d.slice(i, i + 20)}`)
    i += m[0].length
    return parseFloat(m[0])
  }
  const flag = () => {
    skip()
    const f = d[i++]
    if (f !== '0' && f !== '1') throw new Error(`Bad arc flag at ${i}`)
    return +f
  }
  let cmd = null
  while (true) {
    skip()
    if (i >= n) break
    if (/[a-zA-Z]/.test(d[i])) cmd = d[i++]
    else if (!cmd) throw new Error('Path must start with a command')
    const lower = cmd.toLowerCase()
    if (lower === 'z') {
      out.push({ cmd, args: [] })
      cmd = null
      continue
    }
    const args = []
    for (let k = 0; k < ARGS[lower]; k++) args.push(lower === 'a' && (k === 3 || k === 4) ? flag() : num())
    out.push({ cmd, args })
    if (cmd === 'm') cmd = 'l'
    else if (cmd === 'M') cmd = 'L'
  }
  return out
}

/**
 * Walks segments, tracking absolute position. Returns subpaths, each with its
 * absolute start point, its segments, and the absolute points it touches
 * (end points + control points — good enough for bounds and centres).
 */
function walk(segs) {
  const subpaths = []
  let cur = null
  let x = 0, y = 0, sx = 0, sy = 0
  for (const seg of segs) {
    const { cmd, args } = seg
    const rel = cmd === cmd.toLowerCase()
    const c = cmd.toLowerCase()
    if (c === 'm') {
      x = rel ? x + args[0] : args[0]
      y = rel ? y + args[1] : args[1]
      sx = x; sy = y
      cur = { start: [x, y], segs: [], pts: [[x, y]] }
      subpaths.push(cur)
      continue
    }
    if (!cur) throw new Error('Drawing before moveto')
    cur.segs.push(seg)
    if (c === 'z') { x = sx; y = sy; continue }
    const bx = rel ? x : 0, by = rel ? y : 0
    const P = (px, py) => cur.pts.push([bx + px, by + py])
    if (c === 'h') { x = rel ? x + args[0] : args[0]; cur.pts.push([x, y]); continue }
    if (c === 'v') { y = rel ? y + args[0] : args[0]; cur.pts.push([x, y]); continue }
    if (c === 'a') { x = bx + args[5]; y = by + args[6]; cur.pts.push([x, y]); continue }
    for (let k = 0; k < args.length; k += 2) P(args[k], args[k + 1])
    x = bx + args[args.length - 2]
    y = by + args[args.length - 1]
  }
  return subpaths
}

function bounds(pts) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity
  for (const [x, y] of pts) {
    if (x < x0) x0 = x
    if (y < y0) y0 = y
    if (x > x1) x1 = x
    if (y > y1) y1 = y
  }
  return [x0, y0, x1, y1]
}

const r2 = (v) => Math.round(v * 100) / 100
const fmt = (v) => String(r2(v)).replace(/^0\./, '.').replace(/^-0\./, '-.')

// Re-serialise one subpath as a standalone path: absolute M, then the
// original (mostly relative) segments unchanged.
function subpathToD(sp) {
  let d = `M${fmt(sp.start[0])} ${fmt(sp.start[1])}`
  for (const { cmd, args } of sp.segs) d += cmd + args.map(fmt).join(' ').replace(/ -/g, '-')
  return d
}

/* ---------------- read the export ---------------- */

const svg = fs.readFileSync(SRC, 'utf8')
const viewBox = /id="map"[^>]*viewBox="([^"]+)"/.exec(svg)[1].split(/\s+/).map(Number)

const territories = []
const polygons = [] // rough outlines, only used to tell land from sea below
const markers = []
let labelD = null

for (const m of svg.matchAll(/<path id="([^"]+)"([^>]*)>/g)) {
  const [, id, attrs] = m
  if (id.startsWith('pattern')) continue
  const d = / d="([^"]*)"/.exec(attrs)[1]
  if (id === LABELS_ID) { labelD = d; continue }
  const fill = /fill="(#[0-9a-fA-F]{6})"/.exec(attrs)?.[1].toLowerCase()
  const region = REGION_OVERRIDES[id] ?? REGION_BY_FILL[fill]
  if (!region) { console.warn(`! ${id}: unknown fill ${fill}, skipped`); continue }
  const subpaths = walk(parsePath(d))
  const bb = bounds(subpaths.flatMap((sp) => sp.pts))
  const w = bb[2] - bb[0], h = bb[3] - bb[1]
  const isMarker = Math.abs(w - MARKER_SIZE) < 0.6 && Math.abs(h - MARKER_SIZE) < 0.6
  if (isMarker) {
    markers.push({ id, region, x: r2((bb[0] + bb[2]) / 2), y: r2((bb[1] + bb[3]) / 2) })
  } else {
    // "Stark_of_Winterfell" → holder "Stark"; "The_Gift" → no holder
    const holder = id.includes('_of_') ? id.split('_of_')[0].replace(/_/g, ' ') : null
    territories.push({ id, region, holder, bbox: bb.map(r2), d })
    polygons.push({ bb, rings: subpaths.map((sp) => sp.pts) })
  }
}

// Even-odd ray cast against the territories' outlines (end and control
// points, which is close enough to decide land or sea for a point).
function inPolygon(x, y, { bb, rings }) {
  if (x < bb[0] || x > bb[2] || y < bb[1] || y > bb[3]) return false
  let inside = false
  for (const ring of rings)
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const [xi, yi] = ring[i], [xj, yj] = ring[j]
      if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside
    }
  return inside
}
const onLand = (x, y) => polygons.some((p) => inPolygon(x, y, p))

// Which holding each castle stands in (the site ranks castle names by it).
// Coastal castles sit right on the shoreline, so also try a ring of points
// around them, keeping to holdings of the castle's own region.
for (const mk of markers) {
  const probes = [[0, 0]]
  for (const r of [2, 4, 6]) for (let a = 0; a < 8; a++) probes.push([r * Math.cos((a * Math.PI) / 4), r * Math.sin((a * Math.PI) / 4)])
  for (const [dx, dy] of probes) {
    const i = polygons.findIndex((p, k) => territories[k].region === mk.region && inPolygon(mk.x + dx, mk.y + dy, p))
    if (i >= 0) { mk.territory = territories[i].id; break }
  }
}

/* ---------------- split the labels ---------------- */

// 1. every glyph piece is a subpath. Letters (and i-dots, apostrophes) that
//    nearly touch form words; words on the same line a space apart form
//    label lines.
const glyphs = walk(parsePath(labelD)).map((sp) => ({ sp, bb: bounds(sp.pts) }))
const union = (n) => {
  const p = Array.from({ length: n }, (_, i) => i)
  const find = (i) => (p[i] === i ? i : (p[i] = find(p[i])))
  return { find, unite: (i, j) => { p[find(i)] = find(j) } }
}
const merge = (a, b) => [Math.min(a[0], b[0]), Math.min(a[1], b[1]), Math.max(a[2], b[2]), Math.max(a[3], b[3])]
const sameLine = (a, b) => Math.min(a[3], b[3]) - Math.max(a[1], b[1]) >= Math.min(a[3] - a[1], b[3] - b[1]) * 0.6
const gapX = (a, b) => Math.max(a[0] - b[2], b[0] - a[2])

function groupBy(items, joins) {
  const u = union(items.length)
  for (let i = 0; i < items.length; i++)
    for (let j = i + 1; j < items.length; j++) if (joins(items[i].bb, items[j].bb)) u.unite(i, j)
  const m = new Map()
  items.forEach((it, i) => {
    const k = u.find(i)
    const g = m.get(k)
    if (g) { g.items.push(it); g.bb = merge(g.bb, it.bb) } else m.set(k, { items: [it], bb: [...it.bb] })
  })
  return [...m.values()]
}

// letters → words: boxes within 1.2 vertically and 2.6 horizontally
let words = groupBy(glyphs, (a, b) =>
  !(a[0] - 2.6 > b[2] || b[0] - 2.6 > a[2] || a[1] - 1.2 > b[3] || b[1] - 1.2 > a[3]))
words = words.map((w) => ({ glyphs: w.items, bb: w.bb }))
// words → lines: same line, at most a word space apart
const WORD_SPACE = 5.5
const lines = groupBy(words, (a, b) => sameLine(a, b) && gapX(a, b) < WORD_SPACE).map((l) => ({ words: l.items, bb: l.bb }))

// 2. each line goes to the nearest castle (distance from the castle to the
//    line's box). Crowded spots can run two castles' labels together
//    ("Hornvale Pinkmaiden"), so a castle left without a label then claims
//    the words that are nearer to it than to the castle that took them.
const distToBox = (x, y, bb) => Math.hypot(Math.max(bb[0] - x, 0, x - bb[2]), Math.max(bb[1] - y, 0, y - bb[3]))
const nearest = (bb) => {
  let best = null, bestD = Infinity
  for (const mk of markers) {
    const dd = distToBox(mk.x, mk.y, bb)
    if (dd < bestD) { bestD = dd; best = mk }
  }
  return { mk: best, d: bestD }
}
const wordsByMarker = new Map(markers.map((mk) => [mk.id, []]))
let dropped = 0
for (const line of lines) {
  const { mk, d } = nearest(line.bb)
  if (d > 30) { dropped++; continue }
  wordsByMarker.get(mk.id).push(...line.words)
}
for (const mk of markers) {
  if (wordsByMarker.get(mk.id).length) continue
  let best = null
  for (const [otherId, ws] of wordsByMarker) {
    const other = markers.find((m) => m.id === otherId)
    for (const w of ws) {
      const mine = distToBox(mk.x, mk.y, w.bb)
      if (mine < distToBox(other.x, other.y, w.bb) && (!best || mine < best.d)) best = { w, otherId, d: mine }
    }
  }
  if (!best) continue
  // take that word plus any words of the same line on its side
  const taken = wordsByMarker.get(best.otherId).filter((w) =>
    distToBox(mk.x, mk.y, w.bb) < distToBox(markers.find((m) => m.id === best.otherId).x, markers.find((m) => m.id === best.otherId).y, w.bb))
  wordsByMarker.set(best.otherId, wordsByMarker.get(best.otherId).filter((w) => !taken.includes(w)))
  wordsByMarker.set(mk.id, taken)
}
for (const mk of markers) {
  const ws = wordsByMarker.get(mk.id)
  if (!ws.length) { console.warn(`! no label found for castle ${mk.id}`); continue }
  const gs = ws.flatMap((w) => w.glyphs)
  mk.label = gs.map((g) => subpathToD(g.sp)).join('')
  mk.labelBox = ws.map((w) => w.bb).reduce(merge).map(r2)
  // Labels mostly out at sea get light ink on the site (sampled along the
  // name's middle line, since a name can start on land and end on water).
  const [x0, y0, x1, y1] = mk.labelBox
  const samples = [0.1, 0.3, 0.5, 0.7, 0.9].map((f) => onLand(x0 + (x1 - x0) * f, (y0 + y1) / 2))
  if (samples.filter(Boolean).length < 3) mk.labelAtSea = true
}
if (dropped) console.warn(`! ${dropped} label lines far from any castle, dropped`)
const clusters = lines

/* ---------------- write ---------------- */

const out = { source: 'MapChart (mapchart.net), CC BY-SA 4.0', viewBox, territories, markers }
fs.mkdirSync(path.dirname(OUT), { recursive: true })
fs.writeFileSync(OUT, JSON.stringify(out))
const perRegion = {}
for (const t of territories) perRegion[t.region] = (perRegion[t.region] ?? 0) + 1
console.log(`✓ ${territories.length} territories, ${markers.length} castles, ${clusters.length} label lines (${markers.filter((m) => m.labelAtSea).length} at sea)`)
console.log('  per region:', perRegion)
console.log(`  wrote ${path.relative(process.cwd(), OUT)} (${(fs.statSync(OUT).size / 1024).toFixed(0)} KB)`)
