/**
 * lib/realmMap.js
 *
 * Everything the map needs to know besides the shapes themselves (those live
 * in public/map/realm.json, built by scripts/buildRealmMap.mjs).
 *
 * The shapes never change between eras: a territory is a patch of land with
 * a castle on it. What changes is who holds it and which realm it belongs
 * to, and that is all lookup tables here (see ERAS).
 */

export const MAP_DATA_URL = '/map/realm.json'

// `colour` is the region's lit colour on the site, and also its fill in the
// MapChart export (the build script groups territories by it).
export const REGIONS = [
  { id: 'beyond-the-wall', name: 'Beyond the Wall', colour: '#dce7ec', aliases: ['beyond the wall'] },
  { id: 'north', name: 'The North', colour: '#7f9cb0', aliases: ['north'] },
  { id: 'iron-islands', name: 'The Iron Islands', colour: '#3d8f87', aliases: ['iron islands'] },
  { id: 'riverlands', name: 'The Riverlands', colour: '#3f6fb5', aliases: ['riverlands'] },
  { id: 'vale', name: 'The Vale', colour: '#8cc4e8', aliases: ['vale', 'vale of arryn'] },
  { id: 'westerlands', name: 'The Westerlands', colour: '#b8252d', aliases: ['westerlands'] },
  { id: 'crownlands', name: 'The Crownlands', colour: '#c9a75a', aliases: ['crownlands'] },
  { id: 'stormlands', name: 'The Stormlands', colour: '#e8d23a', aliases: ['stormlands'] },
  { id: 'reach', name: 'The Reach', colour: '#23933a', aliases: ['reach'] },
  { id: 'dorne', name: 'Dorne', colour: '#e0762a', aliases: ['dorne'] },
]

export const THEME = {
  land: '#787268', // every region at rest
  border: '#26221e', // coastlines and region borders
  detail: 'rgba(38, 34, 30, 0.55)', // holdings borders inside a zoomed region
  label: '#241b16',
  labelHalo: 'rgba(241, 230, 204, 0.55)',
  seaLabel: '#d9ceb6', // castle names that sit out on the water
  seaLabelHalo: 'rgba(31, 29, 26, 0.6)',
  highlight: '#d8b878', // --color-realm-gold, outlines a house's lands
}

/**
 * Eras. The map export is 298 AC, so that era needs no overrides: holders come
 * from the territory ids ("Bolton_of_the_Dreadfort" → Bolton) and regions from
 * the export's colours.
 *
 * Another era only lists what differs, keyed by territory id:
 *   holders: { Bolton_of_the_Dreadfort: null }   // lands with no lord, or another surname
 *   regions: { ... }                               // for eras with different realms
 * An era with its own set of realms (Aegon's Conquest) can also give its own
 * `regionList` in the same shape as REGIONS above.
 */
export const ERAS = {
  298: { label: '298 AC' },
}
export const DEFAULT_YEAR = 298

export function eraFor(year) {
  return ERAS[year] ?? ERAS[DEFAULT_YEAR]
}
export function regionsFor(year) {
  return eraFor(year).regionList ?? REGIONS
}
export function regionOf(territory, year) {
  return eraFor(year).regions?.[territory.id] ?? territory.region
}
export function holderOf(territory, year) {
  const overrides = eraFor(year).holders
  return overrides && territory.id in overrides ? overrides[territory.id] : territory.holder
}

/** "Griffin_s_Roost" → "Griffin's Roost", "Bolton_of_the_Dreadfort" → "Bolton of the Dreadfort" */
export function displayName(id) {
  return id.replace(/_s_/g, "'s_").replace(/_s$/, "'s").replace(/_/g, ' ')
}

/** "House Stark" → "stark"; compared against a territory's holder surname */
export function surnameKey(name) {
  return (name ?? '').replace(/^House\s+/i, '').trim().toLowerCase()
}

export function matchesRegion(regionId, houseRegion) {
  if (!houseRegion) return false
  const norm = houseRegion.trim().toLowerCase().replace(/^the\s+/, '')
  return !!REGIONS.find((r) => r.id === regionId)?.aliases.includes(norm)
}

/** Union of boxes [x0, y0, x1, y1] */
export function unionBox(boxes) {
  return boxes.reduce(
    (a, b) => [Math.min(a[0], b[0]), Math.min(a[1], b[1]), Math.max(a[2], b[2]), Math.max(a[3], b[3])],
    [Infinity, Infinity, -Infinity, -Infinity]
  )
}

/**
 * The viewBox that frames `box` inside a frame of the given aspect (w / h),
 * with some padding, never zooming in so far that labels get huge.
 */
export function fitViewBox(box, aspect, { pad = 0.12, minWidth = 230 } = {}) {
  let w = (box[2] - box[0]) * (1 + pad * 2)
  let h = (box[3] - box[1]) * (1 + pad * 2)
  w = Math.max(w, h * aspect, minWidth)
  h = w / aspect
  const cx = (box[0] + box[2]) / 2
  const cy = (box[1] + box[3]) / 2
  return [cx - w / 2, cy - h / 2, w, h]
}