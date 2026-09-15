/**
 * data/championStyles.js
 *
 * Champion is the one role where a single weight formula actively
 * punishes narrow specialists (a peak-Strength brawler like Gregor
 * Clegane loses to well-rounded characters purely because he's weak on
 * Speed/Stealth, which isn't really what "best duelist" should mean).
 * Every other role rewards well-roundedness on purpose — governing well
 * genuinely does require multiple competencies — so styles are
 * deliberately scoped to Champion only.
 *
 * Each character has a fixed `fighting_style` (see characters table
 * migration 006) — not a 0-100 stat, a category, like house. Champion's
 * roleRating() looks up the weight table for that character's style
 * instead of using one fixed table (see gameEngine/ratings.js).
 */

export const CHAMPION_STYLES = ['powerhouse', 'swift', 'versatile', 'basic', 'nonFighter']

export const CHAMPION_STYLE_LABELS = {
  powerhouse: 'Powerhouse',
  swift: 'Swift',
  versatile: 'Versatile',
  basic: 'Basic',
  nonFighter: 'Non-Fighter',
}

// camelCase JS key -> DB text value stored in characters.fighting_style.
export const CHAMPION_STYLE_DB_VALUES = {
  powerhouse: 'powerhouse',
  swift: 'swift',
  versatile: 'versatile',
  basic: 'basic',
  nonFighter: 'non_fighter',
}

export const CHAMPION_STYLE_FROM_DB = Object.fromEntries(
  Object.entries(CHAMPION_STYLE_DB_VALUES).map(([js, db]) => [db, js])
)

export const CHAMPION_STYLE_WEIGHTS = {
  powerhouse: {
    technique: 0.4,
    strength: 0.35,
    speed: 0.15,
    willpower: 0.1,
  },
  swift: {
    technique: 0.4,
    speed: 0.25,
    stealth: 0.25,
    willpower: 0.05,
    strength: 0.025,
    endurance: 0.025,
  },
  versatile: {
    technique: 0.6,
    speed: 0.1,
    stealth: 0.1,
    strength: 0.1,
    willpower: 0.1,
  },
  basic: {
    technique: 0.3,
    speed: 0.2,
    strength: 0.2,
    willpower: 0.2,
    stealth: 0.1,
  },
  // Still a normal weighted rating (a non-fighter can have a perfectly
  // respectable "overall") — the "always loses to a real fighter"
  // behavior belongs to the duel system (Part 2), not this formula.
  // Willpower-dominant on purpose: an untrained character's duel
  // performance is mostly about grit/resolve, not skill they don't have.
  nonFighter: {
    willpower: 0.5,
    speed: 0.125,
    stealth: 0.125,
    strength: 0.125,
    technique: 0.125,
  },
}
