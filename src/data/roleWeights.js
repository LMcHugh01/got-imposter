/**
 * data/roleWeights.js
 *
 * The 10 fixed Draft roles and the weight each sub-attribute (see
 * data/attributes.js for the full 23-attribute list) carries toward that
 * role's rating (= fit %, see gameEngine/ratings.js).
 *
 * This is config, not logic — rebalancing a role is an edit here, not a
 * code change. Every role's weights should sum to 1.0 (negative weights
 * are fine — they're penalties, e.g. Grand Maester penalizing Family —
 * but the POSITIVE weights need to sum to 1.0 + |penalty total| so the
 * net still lands on 1.0. roleRating() clamps the final result to 1-99
 * regardless, see gameEngine/ratings.js).
 *
 * NOTE: Champion is NOT in ROLE_WEIGHTS. Unlike every other role, a
 * single fixed formula for Champion punishes narrow specialists (a
 * peak-Strength brawler loses purely for being weak on Speed/Stealth),
 * which isn't what "best duelist" should mean. Champion's weights are
 * keyed by fighting style instead — see data/championStyles.js. ROLES
 * still lists champion as one of the 10 draftable roles; it just isn't a
 * key in this file.
 *
 * v2 changes from the original 10-role/8-attribute system:
 *   - Heir removed
 *   - Grand Maester added (knowledge/advisor role, Intelligence-driven)
 *   - Master of War merged into Commander
 *   - Champion added (fills the freed slot — Arya/Bronn/Oberyn-style
 *     duelist archetype, Technique/Speed/Stealth-driven)
 *
 * v3: negative-weight penalties added to several roles, reflecting traits
 * that actively undermine that role rather than just being irrelevant to
 * it (e.g. a Maester's vow forswearing family ties). Kingsguard and
 * Champion were independently redesigned on top of this, not just
 * patched with a penalty.
 *
 * v4: Champion split into 5 fighting-style variants — see
 * data/championStyles.js. No longer a flat entry in ROLE_WEIGHTS below.
 */

// Display order (also the draft's seat order) — deliberately NOT the
// order roles were originally designed in. King/Consort/Hand/Kingsguard/
// Champion first, then Commander/Laws/Coin/Whispers/Maester — this is the
// one fixed sequence every "roles in a line" view uses (the draft
// sidebar, the final roster, the dashboard's Council grid in both its
// 5-wide desktop and 2-wide mobile layouts, the draft progress pips).
// Reordering here is safe: nothing elsewhere in the engine keys off array
// position, only role.id.
export const ROLES = [
  { id: 'king', label: 'King / Queen' },
  { id: 'consort', label: 'Consort' },
  { id: 'hand', label: 'Hand' },
  { id: 'kingsguard', label: 'Kingsguard' },
  { id: 'champion', label: 'Champion' },
  { id: 'commander', label: 'Commander' },
  { id: 'masterOfLaws', label: 'Master of Laws' },
  { id: 'masterOfCoin', label: 'Master of Coin' },
  { id: 'masterOfWhispers', label: 'Master of Whispers' },
  { id: 'grandMaester', label: 'Grand Maester' },
]

export const ROLE_WEIGHTS = {
  king: {
    command: 0.2,
    duty: 0.15,
    diplomacy: 0.1,
    justice: 0.1,
    family: 0.1,
    scholarship: 0.1,
    prestige: 0.1,
    honour: 0.05,
    willpower: 0.05,
    recruitment: 0.05,
  },
  consort: {
    diplomacy: 0.3,
    duty: 0.15,
    family: 0.15,
    etiquette: 0.15,
    prestige: 0.15,
    command: 0.05,
    willpower: 0.05,
  },
  hand: {
    command: 0.15,
    scholarship: 0.15,
    selfPreservation: 0.15,
    subterfuge: 0.15,
    economy: 0.1,
    diplomacy: 0.1,
    strategy: 0.1,
    intimidation: 0.1,
  },
  masterOfWhispers: {
    subterfuge: 0.4,
    cunning: 0.3,
    selfPreservation: 0.2,
    stealth: 0.1,
    scholarship: 0.1,
    diplomacy: 0.1,
    intimidation: 0.1,
    honour: -0.3,
  },
  grandMaester: {
    scholarship: 0.7,
    duty: 0.2,
    justice: 0.1,
    etiquette: 0.1,
    diplomacy: 0.1,
    willpower: 0.1,
    technique: -0.1, 
    family: -0.2,
  },
  masterOfCoin: {
    economy: 0.4,
    cunning: 0.15,
    selfPreservation: 0.15,
    diplomacy: 0.1,
    scholarship: 0.1,
    subterfuge: 0.1,
  },
  masterOfLaws: {
    justice: 0.35,
    command: 0.2,
    intimidation: 0.15,
    honour: 0.1,
    duty: 0.1,
    etiquette: 0.1,
    scholarship: 0.1,
    subterfuge: -0.1,
  },
  commander: {
    strategy: 0.35,
    command: 0.25,
    battleMorale: 0.15,
    honour: 0.1,
    duty: 0.1,
    technique: 0.1,
    recruitment: 0.05,
    selfPreservation: -0.1,
  },
  // Redesigned independently of the "add a penalty" pass above — no
  // negative weight here, just a different positive-weight composition.
  kingsguard: {
    duty: 0.1,
    technique: 0.35,
    strength: 0.25,
    endurance: 0.1,
    willpower: 0.1,
    intimidation: 0.05,
    honour: 0.05,
  },
  // champion intentionally omitted — see data/championStyles.js
}