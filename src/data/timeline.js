/**
 * data/timeline.js
 *
 * The points in time shared by the Houses and Maps pages. Adding an era is
 * just another entry here (plus matching house_eras rows); both pages pick it
 * up. title/caption are page-level flavour text about the era itself, not any
 * one house, so they live here rather than in the DB.
 */

// The show starts in 298, so that's where both pages open, wherever new eras
// land in the list.
export const DEFAULT_YEAR = 298

export const TIMELINE_POINTS = [
  {
    year: 282,
    label: '282 AC',
    title: "The Mad King's Reign",
    caption: 'Aerys II Targaryen holds the Iron Throne, paranoid and cruel — while the men who will end his reign grow closer by the day.',
    // No `season` — this era predates the show entirely, so there's
    // nothing to credit it to.
  },
  {
    year: 298,
    label: '298 AC',
    season: 'Game of Thrones: Season 1',
    title: 'The Realm of Robert I',
    caption: 'Seven kingdoms, one crown, and every great house still seated in its ancestral castle.',
  },
  {
    year: 305,
    label: '305 AC',
    season: 'Game of Thrones: Season 8',
    title: 'After the Long Night',
    caption: 'The North breaks free, a council answers for six kingdoms, and two great houses are ash.',
  },
]
