/**
 * data/coinStyles.js
 *
 * Master of Coin's single fixed formula rewards growing the treasury —
 * but the show's clearest Master of Coin, Littlefinger, was a genuinely
 * poor honest steward (crown debt exploded under him) while being
 * brilliant at converting the position into personal leverage. The base
 * formula can't score that character well without a style split.
 *
 * Each character has a fixed `coin_style` (characters table, mirroring
 * `fighting_style`) — not a 0-100 stat, a category. Master of Coin's
 * roleRating() looks up COIN_STYLE_WEIGHTS[style] instead of a single
 * fixed table (see gameEngine/ratings.js). This REPLACES the
 * `masterOfCoin` entry that used to live in ROLE_WEIGHTS
 * (data/roleWeights.js) — it is no longer a key there, same way champion
 * isn't.
 */

export const COIN_STYLES = ['honest', 'opportunist']

export const COIN_STYLE_LABELS = {
  honest: 'Honest',
  opportunist: 'Opportunist',
}

// camelCase JS key -> DB text value stored in characters.coin_style.
export const COIN_STYLE_DB_VALUES = {
  honest: 'honest',
  opportunist: 'opportunist',
}

export const COIN_STYLE_FROM_DB = Object.fromEntries(
  Object.entries(COIN_STYLE_DB_VALUES).map(([js, db]) => [db, js])
)

export const COIN_STYLE_WEIGHTS = {
  // Grows the treasury for the realm.
  honest: {
    economy: 0.45,
    diplomacy: 0.15,
    scholarship: 0.15,
    duty: 0.15,
    honour: 0.1,
  },
  // Grows personal power through the position — treasury health is
  // secondary. (Littlefinger.)
  opportunist: {
    cunning: 0.35,
    subterfuge: 0.3,
    economy: 0.2,
    selfPreservation: 0.15,
    diplomacy: 0.1,
    honour: -0.1,
  },
}