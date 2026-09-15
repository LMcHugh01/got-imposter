/**
 * gameEngine/duelEngine.js
 *
 * A 1v1 duel offer that COMPLETELY REPLACES the normal battle when both
 * sides agree to it — no tick simulation, no casualties from an army
 * fight. Win: enemy surrenders, campaign advances like any other victory.
 * Lose: defeat, campaign ends — same as losing a normal battle (§12.3),
 * just reached a different way.
 *
 * The player can send whoever is filling King/Queen OR Champion — per
 * design, duel skill is ALWAYS the character's Champion-style rating
 * (roleRating(..., 'champion', fightingStyle)), regardless of which
 * council seat they actually hold. A King/Queen who happens to be a
 * trained Powerhouse fighter duels exactly as well as if they'd been
 * drafted Champion.
 *
 * The enemy side works the same way — enemy_house_champions (migration
 * 007) links each enemy_houses row to real, lore-matching roster
 * characters wherever one exists (e.g. House Stark -> Eddard/Robb/Jon
 * Snow/Arya/Benjen), randomly selected at duel time. For the houses with
 * no matching character, getEnemyDuelFighter() falls back to a
 * procedural fighter derived from that house's existing rating/
 * personality — see PERSONALITY_FALLBACK_STYLE below.
 */

import { roleRating } from './ratings'
import { computeYourPower, computeEnemyPower } from './battleEngine'

// Enemy only offers the duel when you're already dominant — this is a
// mercy/pride mechanic from their side, not a fair fight they'd otherwise
// risk. 0.65 = a 65/35-or-better power advantage, using the same yourShare
// calculation battleEngine.js already computes each tick.
export const DUEL_SHARE_THRESHOLD = 0.65

// Small, deliberately modest edge — enough to flip a close matchup,
// not enough to overturn a real skill gap.
const RPS_BONUS = 2

const RPS_BEATS = {
  powerhouse: 'versatile',
  versatile: 'swift',
  swift: 'powerhouse',
}

const SPECIAL_STYLES = new Set(['powerhouse', 'swift', 'versatile'])

function isSpecial(style) {
  return SPECIAL_STYLES.has(style)
}

// Fallback style for enemy houses with no curated champion (see migration
// 007's sanity-check query for the current list — 16 of 28 as of this
// writing). A rough personality -> style mapping, not meant to be
// precise — this only fires when there's no real character to use
// instead. 'diplomatic' only exists on House Tully currently, which does
// have a real champion (Brynden Tully), so that mapping is effectively
// unused today but included for completeness as more enemy_houses rows
// get added.
const PERSONALITY_FALLBACK_STYLE = {
  aggressive: 'powerhouse',
  defensive: 'basic',
  economic: 'basic',
  deceptive: 'swift',
  diplomatic: 'basic',
  unpredictable: 'versatile',
}

/**
 * Whether the enemy would even entertain a duel — call this with the same
 * yourPower/enemyPower your battle tick already computes (see
 * battleEngine.js computeYourPower/computeEnemyPower).
 */
export function canOfferDuel(yourPower, enemyPower) {
  const total = yourPower + enemyPower
  if (total <= 0) return false
  return yourPower / total >= DUEL_SHARE_THRESHOLD
}

/**
 * Convenience wrapper — takes the same yourSide/enemySide shapes
 * buildBattleSides() in Draft.jsx already assembles for the normal
 * battle, computes power the identical way computeYourPower/
 * computeEnemyPower would for tick 1, and checks the threshold. Callers
 * that already have yourSide/enemySide (i.e. Draft.jsx) can use this
 * instead of importing battleEngine's power functions themselves just
 * for this one check.
 */
export function canOfferDuelForBattle(yourSide, enemySide) {
  return computeDuelShare(yourSide, enemySide) >= DUEL_SHARE_THRESHOLD
}

/**
 * Raw power share (0-1) for the same yourSide/enemySide shapes — exported
 * mainly for SHOW_DEBUG_NUMBERS-gated UI so it's possible to SEE why the
 * duel offer did or didn't appear, rather than only inferring it
 * indirectly. DUEL_SHARE_THRESHOLD is exported alongside it so a debug
 * display can show both numbers together.
 */
export function computeDuelShare(yourSide, enemySide) {
  const yourPower = computeYourPower(yourSide)
  const enemyPower = computeEnemyPower(enemySide)
  const total = yourPower + enemyPower
  return total <= 0 ? 0 : yourPower / total
}

/**
 * A character's duel-worthiness: their Champion-style rating using their
 * OWN fighting style, independent of which role they actually hold.
 * Throws if they have no fighting style — same "surface the gap
 * immediately" posture as roleRating() itself for an untagged Champion.
 */
export function getDuelFighter(character) {
  if (!character.fightingStyle) {
    throw new Error(`${character.name} has no fighting style assigned — cannot enter a duel.`)
  }
  return {
    name: character.name,
    rating: roleRating(character.attributes, 'champion', character.fightingStyle),
    style: character.fightingStyle,
  }
}

/**
 * Picks the enemy's duel fighter. If `championCandidates` (from
 * enemyHouseService.fetchEnemyHouseChampions) is non-empty, randomly
 * picks one and rates them exactly like a player character via
 * getDuelFighter(). If empty (no lore-matching roster character for this
 * house), falls back to a procedural fighter: rating taken directly from
 * the house's existing `rating` column, style guessed from `personality`.
 *
 * `enemyHouse` is a raw enemy_houses row (needs `rating`, `personality`,
 * and ideally `commanderName` for the fallback's display name — this
 * expects the NORMALIZED shape from enemyHouseService.fetchRandomEnemyHouse,
 * not a raw Supabase row).
 */
export function getEnemyDuelFighter({ enemyHouse, championCandidates = [], rng = Math.random }) {
  if (championCandidates.length > 0) {
    const pick = championCandidates[Math.floor(rng() * championCandidates.length)]
    return getDuelFighter(pick)
  }

  const style = PERSONALITY_FALLBACK_STYLE[enemyHouse.personality] ?? 'versatile'
  return {
    name: enemyHouse.commanderName ?? enemyHouse.name,
    rating: Math.max(1, Math.min(99, Math.round(enemyHouse.rating))),
    style,
  }
}

/**
 * Resolves who wins the duel. yourFighter/enemyFighter are the shape
 * getDuelFighter() returns: { rating, style }.
 *
 * Order of checks:
 *   1. Hard counters — Non-fighter always loses to a real fighter (any of
 *      Powerhouse/Swift/Versatile/Basic); Basic always loses to a
 *      Special (Powerhouse/Swift/Versatile). Two of the same
 *      non-special tier (both Basic, both Non-fighter) has no hard
 *      counter — falls through to normal rating-diff odds.
 *   2. RPS bonus — only when both sides are DIFFERENT specials.
 *      Powerhouse > Versatile > Swift > Powerhouse.
 *   3. Rating-diff probability: 50% + (diff x 10%), clamped 0-100%.
 *      A 5+ point gap is a certain win; equal ratings is a coin flip.
 */
export function resolveDuel({ yourFighter, enemyFighter, rng = Math.random }) {
  const yourIsNonFighter = yourFighter.style === 'nonFighter'
  const enemyIsNonFighter = enemyFighter.style === 'nonFighter'
  const yourIsBasic = yourFighter.style === 'basic'
  const enemyIsBasic = enemyFighter.style === 'basic'

  // 1. Hard counters
  if (yourIsNonFighter && !enemyIsNonFighter) {
    return { winner: 'enemy', chance: 0, reason: `${yourFighter.name} is untrained and cannot defeat a real fighter.` }
  }
  if (enemyIsNonFighter && !yourIsNonFighter) {
    return { winner: 'you', chance: 1, reason: `${enemyFighter.name ?? 'Their champion'} is untrained — an easy win.` }
  }
  if (yourIsBasic && isSpecial(enemyFighter.style)) {
    return { winner: 'enemy', chance: 0, reason: `${yourFighter.name} is a competent fighter, but no match for a trained specialist.` }
  }
  if (enemyIsBasic && isSpecial(yourFighter.style)) {
    return { winner: 'you', chance: 1, reason: `Your specialist overwhelms their ordinary fighter.` }
  }

  // 2. RPS bonus, only between two different specials
  let yourEffective = yourFighter.rating
  let enemyEffective = enemyFighter.rating
  if (isSpecial(yourFighter.style) && isSpecial(enemyFighter.style) && yourFighter.style !== enemyFighter.style) {
    if (RPS_BEATS[yourFighter.style] === enemyFighter.style) {
      yourEffective += RPS_BONUS
    } else if (RPS_BEATS[enemyFighter.style] === yourFighter.style) {
      enemyEffective += RPS_BONUS
    }
  }

  // 3. Rating-diff probability
  const diff = yourEffective - enemyEffective
  const chance = Math.max(0, Math.min(1, 0.5 + diff * 0.1))
  const winner = rng() < chance ? 'you' : 'enemy'

  return { winner, chance }
}

/**
 * Turns a duel outcome into the same result shape finalizeBattleResult()
 * produces (§10.6/§10.7 in battleEngine.js), so the campaign summary,
 * victory/defeat screens, and progression logic don't need to know a
 * duel happened at all — they just consume {outcome, casualties, ...}
 * identically either way.
 *
 * Numbers here are first-draft, same caveat as the rest of the battle
 * engine (§17 step 12 balancing pass) — flag if these feel wrong:
 *   - Your army takes ZERO casualties either way — the armies never
 *     fought. That's the actual strategic incentive to duel: risk one
 *     character instead of your whole force.
 *   - A duel win nets a BIGGER soldier/gold bonus than a normal battle
 *     (0.5/0.3 here vs. 0.4/0.2 in finalizeBattleResult) — narratively, a
 *     bloodless single-combat victory is a stronger propaganda moment
 *     than a grinding fight.
 *   - Losing the duel is immediate defeat, no partial casualties to
 *     compute — there was no battle, just a loss.
 */
export function finalizeDuelResult({ outcome, enemyArmy, enemyGold }) {
  const won = outcome === 'victory'

  return {
    outcome,
    yourCasualties: 0,
    enemyCasualties: won ? enemyArmy : 0,
    enemySurrendered: won ? enemyArmy : 0,
    soldiersGained: won ? Math.round(enemyArmy * 0.5) : 0,
    goldGained: won ? Math.round((enemyGold ?? 0) * 0.3) : 0,
    moraleChange: won ? 15 : 0,
    supplyChange: 0,
    viaDuel: true,
  }
}