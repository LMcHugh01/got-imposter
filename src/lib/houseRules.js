/**
 * lib/houseRules.js
 *
 * The rules for houses, shared by the Houses page and each house's own
 * page: which section a house sits in, what its standing reads as, who
 * rules it, the order houses are listed in, and the councils.
 */

// Display/tab order for kingdoms — fixed here rather than derived
// alphabetically or from data order, so tabs don't reshuffle as more
// houses (and possibly more kingdoms) get added later.
export const KINGDOM_ORDER = ['Seven Kingdoms', 'Six Kingdoms', 'Kingdom of the North']


// Two columns decide where a house sits in a given era:
//
//   status  active | royalty | exiled | extinct, or free text for anything
//           else fallen-but-alive ('Diminished', 'Restored'). The free text
//           IS the chip text; those houses stay in their tier's section.
//   tier    great | lordly | knightly | unknown (noble rank not known), or
//           order for a sworn order rather than a family (the Night's Watch).
//
// Both live on `houses`, and a house_eras row may override tier (and
// region) for its year, e.g. a house raised in rank, or one that moved.
// Wardens aren't a section: they're Great Houses, listed first, with their
// compass badge (from commanderTitles).
//
// getSectionKey is the single source of truth for "which section does this
// house belong in this era", used both for the page's bucketing and for
// each card's own styling, so the two can't drift apart. Royalty, exiled
// and extinct span every tier; everything else goes by tier.
export const TIER_SECTION = {
  great: 'great',
  lordly: 'lordly',
  knightly: 'knightly',
  unknown: 'unknown',
  order: 'order', // sworn orders: the Night's Watch
  vassal: 'lordly', // the old tier, until the SQL update has run
}

export function getSectionKey(house) {
  const status = (house.status ?? '').toLowerCase()
  if (status === 'royalty') return 'royalty'
  if (status === 'extinct') return 'extinct'
  if (status === 'exiled') return 'exiled'
  return TIER_SECTION[house.tier] ?? 'unknown'
}

// Free-text statuses ('Diminished', 'Restored'): shown as the chip, in the
// house's own tier section.
export function otherStatus(house) {
  const status = (house.status ?? '').toLowerCase()
  return status && !['active', 'royalty', 'exiled', 'extinct'].includes(status) ? house.status : null
}

export function wardenTitle(house) {
  return house.commanderTitles?.find((k) => k.startsWith('warden_of_')) ?? null
}

// A house's standing in one era, as words: shown for each era in the house
// window's "Across the Ages" timeline. Derived, not stored.
export function getBadgeText(house, sectionKey) {
  if (sectionKey === 'royalty') return 'Royalty'
  if (sectionKey === 'extinct') return 'Extinct'
  if (sectionKey === 'exiled') return 'Exiled'
  const other = otherStatus(house)
  if (other) return other
  if (sectionKey === 'great') {
    const key = wardenTitle(house)
    return key ? TITLE_META[key]?.label ?? 'Warden' : 'Great House'
  }
  if (sectionKey === 'lordly') return 'Lordly'
  if (sectionKey === 'knightly') return 'Knightly'
  if (sectionKey === 'order') return 'Sworn Order'
  return 'Rank Unknown'
}


// Grid order within a section: Protector/King-in-the-North first, then the
// four Wardens in compass order. Sections themselves already separate
// Wardens from ordinary Great Houses, so this only matters for ordering
// inside Royalty (usually just one house anyway) and inside Wardens.
export const TITLE_RANK = {
  protector_of_the_realm: 0,
  king_in_the_north: 0,
  queen_in_the_north: 0,
  warden_of_the_north: 1,
  warden_of_the_east: 2,
  warden_of_the_south: 3,
  warden_of_the_west: 4,
}

export function housePriority(house) {
  if (house.commanderTitles && house.commanderTitles.length > 0) {
    const ranks = house.commanderTitles.map((key) => TITLE_RANK[key] ?? 5)
    return Math.min(...ranks)
  }
  return 5
}


export const GOLD = '#c9a75a' // matches got-gold — Protector of the Realm
export const SILVER = '#a9b4bd' // uniform steel tone — all four Wardens

export const TITLE_META = {
  protector_of_the_realm: { label: 'Protector of the Realm', icon: 'crown', color: GOLD },
  // Two keys rather than one gendered field — whoever enters the data for
  // a given era just picks the one that matches the ruler, same as any
  // other commander title.
  king_in_the_north: { label: 'King in the North', icon: 'crown', color: GOLD },
  queen_in_the_north: { label: 'Queen in the North', icon: 'crown', color: GOLD },
  warden_of_the_north: { label: 'Warden of the North', icon: 'compass', direction: 'N', color: SILVER },
  warden_of_the_south: { label: 'Warden of the South', icon: 'compass', direction: 'S', color: SILVER },
  warden_of_the_east: { label: 'Warden of the East', icon: 'compass', direction: 'E', color: SILVER },
  warden_of_the_west: { label: 'Warden of the West', icon: 'compass', direction: 'W', color: SILVER },
}


// Priority for the headline "who's in charge" stat: a regent or castellan
// (someone actually running things) beats the titled lord, who drops to a
// caption instead of disappearing. An extinct house gets its own wording —
// there's no "ruling lord" left to name. rulerLabel is a plain label swap
// (e.g. a queen regnant, if that ever comes up) rather than a dual-entity
// case, so it doesn't get the "Nominal Lord" caption the regent/castellan
// cases do. royalty status defaults the label to 'King' without needing
// rulerLabel set explicitly — Bran's row happens to set it anyway, which
// is fine, same value either way.
// Splits "House Stark" into a muted "House" label plus "Stark" as the
// actual display name — so the generic word isn't shouting at the same
// size as the surname that actually matters. Entries that don't follow
// that pattern (Bran) just render as-is, no prefix line.
export function splitHouseName(fullName) {
  if (!fullName) return { prefix: null, name: fullName }
  const match = fullName.match(/^House\s+(.+)$/)
  if (!match) return { prefix: null, name: fullName }
  return { prefix: 'House', name: match[1] }
}

export function computeAuthority(era) {
  if (!era) return { label: 'Ruling Lord', value: null, caption: null }
  const lord = era.currentLord
  if (era.status === 'extinct') {
    return { label: 'Last of the Line', value: lord || era.regent || era.castellan || null, caption: null }
  }
  if (era.regent) return { label: 'Regent', value: era.regent, caption: lord ? `Nominal Lord: ${lord}` : null }
  if (era.castellan) return { label: 'Castellan', value: era.castellan, caption: lord ? `Nominal Lord: ${lord}` : null }
  const defaultLabel = era.status === 'royalty' ? 'King' : 'Ruling Lord'
  return { label: era.rulerLabel || defaultLabel, value: lord, caption: null }
}


// The councils shown beside a house's card. Seats are listed in a fixed
// order, independent of the order rows were inserted in; a seat with no
// row for the selected year shows "Unknown", so a panel keeps its shape
// across eras. `listRole` is a seat with several members, shown as a row
// of names under the grid, the first starred (the Kingsguard's Lord
// Commander).
//
// Rows live in the small_council table; its `council` column says which
// council a row belongs to ('small_council' or 'nights_watch').
//
// Small Council: King/Consort left out (the Royalty card already shows
// them); Commander/Champion left out (never confident data in any era).
export const COUNCILS = {
  small_council: {
    title: 'Small Council',
    roles: ['hand', 'grand_maester', 'master_of_coin', 'master_of_laws', 'master_of_ships', 'master_of_whispers'],
    labels: {
      hand: 'Hand of the King',
      grand_maester: 'Grand Maester',
      master_of_coin: 'Master of Coin',
      master_of_laws: 'Master of Laws',
      master_of_ships: 'Master of Ships',
      master_of_whispers: 'Master of Whispers',
      kingsguard: 'Kingsguard',
    },
    listRole: 'kingsguard',
    listLeader: 'Lord Commander',
    countWord: 'seated',
  },
  nights_watch: {
    // Castle Black's officers. The commanders of Eastwatch and the Shadow
    // Tower are the Watch's other branches, shown in the house window.
    title: 'Officers of Castle Black',
    countWord: 'known',
    roles: ['lord_commander', 'first_ranger', 'first_builder', 'first_steward', 'maester'],
    labels: {
      lord_commander: 'Lord Commander',
      first_ranger: 'First Ranger',
      first_builder: 'First Builder',
      first_steward: 'First Steward',
      maester: 'Maester of Castle Black',
    },
  },
}

// The house whose card the Night's Watch officers sit beside.
export const NIGHTS_WATCH_SLUG = 'nights-watch'


// Top to bottom. A section with no houses this era (no Extinct Houses at
// 298, say) is skipped where SECTIONS is consumed, not here.
export const SECTIONS = [
  { key: 'royalty', label: 'Royalty' },
  { key: 'great', label: 'Great Houses' },
  { key: 'lordly', label: 'Lordly Houses' },
  { key: 'knightly', label: 'Knightly Houses' },
  { key: 'unknown', label: 'Other Houses', note: 'Noble rank unknown' },
  { key: 'exiled', label: 'Exiled Houses' },
  { key: 'extinct', label: 'Extinct Houses' },
  { key: 'order', label: 'Orders' },
]



/** Each house merged with its row for `year` (a house with no row that year is left out). */
export function housesAt(houses, eras, year) {
  return houses
    .map((house) => {
      const era = eras.find((e) => e.houseId === house.id && e.year === year)
      return era ? { ...house, ...era } : null
    })
    .filter(Boolean)
}

/**
 * The houses of a year in the Houses page's order: section by section
 * (royalty, great, lordly … orders), Protector and Wardens first within
 * each. Used for a house page's previous / next.
 */
export function houseOrder(housesAtYear) {
  const sorted = [...housesAtYear].sort((a, b) => housePriority(a) - housePriority(b) || a.name.localeCompare(b.name))
  return SECTIONS.flatMap(({ key }) => sorted.filter((h) => getSectionKey(h) === key))
}

/**
 * Who leads a house (or one of its branches) in its era row. A branch names
 * its own leader, under its own title if it has one ('Commander' at
 * Eastwatch). The main branch (the first) may leave its lord empty, and then
 * shows the era's own ruler, so that isn't recorded twice.
 */
export function authorityFor(house, branch, branchIndex) {
  if (branch && !(branchIndex === 0 && branch.lord == null)) {
    // the branch led by the era's ruler (Robert's) takes the ruler's title: King
    const ruler = computeAuthority(house)
    const label = branch.rulerLabel ?? (ruler.value && branch.lord === ruler.value ? ruler.label : 'Ruling Lord')
    return { label, value: branch.lord, caption: null }
  }
  return computeAuthority(house)
}

/**
 * The branch that holds the crown, for a royal house with branches: the
 * branch led by the era's ruler (Robert's, at King's Landing), else the
 * first. Its page shows the Small Council.
 */
export function royalBranchIndex(house) {
  const branches = house.branches ?? []
  if (branches.length === 0) return 0
  const ruler = computeAuthority(house).value
  const i = branches.findIndex((b) => b.lord && ruler && b.lord === ruler)
  return i >= 0 ? i : 0
}

/** "The North · Winterfell" */
export const placeOf = (house, seat) => [house.region, seat ?? house.seats?.[0]].filter(Boolean).join(' · ')

/**
 * A council's seats for a year, in the council's fixed order, every seat
 * present (an empty one has no members and shows as "Unknown"). Rows come
 * from the small_council table; `key` is 'small_council' or 'nights_watch'.
 */
export function councilSeats(rows, year, key) {
  const def = COUNCILS[key]
  const byRole = new Map()
  rows
    .filter((c) => c.year === year && (c.council ?? 'small_council') === key)
    .forEach((c) => {
      if (!byRole.has(c.role)) byRole.set(c.role, [])
      byRole.get(c.role).push(c)
    })
  const order = def.listRole ? [...def.roles, def.listRole] : def.roles
  return order.map((role) => ({ role, members: byRole.get(role) ?? [] }))
}

/**
 * "The Reign of King Robert I Baratheon": the ruler of `kingdom` in a year
 * (houses merged with that year's rows). Without a kingdom, the crown of the
 * Seven or Six Kingdoms rather than the independent North (Bran, not Sansa,
 * at 305). Queen for a queen: a queen's crown title, or a ruler label saying
 * so. A name that already starts with its title ("King Bran the Broken")
 * keeps it. Null when there's no ruler to name.
 */
export function reignOf(housesAtYear, kingdom = null) {
  const royals = housesAtYear.filter((h) => h.status === 'royalty')
  const royal =
    (kingdom && royals.find((h) => h.kingdom === kingdom)) ?? royals.find((h) => h.kingdom !== 'Kingdom of the North') ?? royals[0]
  if (!royal) return null
  const name = computeAuthority(royal).value
  if (!name) return null
  const queen = royal.commanderTitles?.includes('queen_in_the_north') || /queen/i.test(royal.rulerLabel ?? '')
  return /^(king|queen)\s/i.test(name) ? `The Reign of ${name}` : `The Reign of ${queen ? 'Queen' : 'King'} ${name}`
}