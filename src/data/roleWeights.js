/**
 * data/roleWeights.js
 *
 * The 10 fixed Draft roles and the weight each sub-attribute (see
 * data/attributes.js for the full 26-attribute list) carries toward that
 * role's rating (= fit %, see gameEngine/ratings.js).
 *
 * This is config, not logic — rebalancing a role is an edit here, not a
 * code change. Every role's weights should sum to 1.0 (negative weights
 * are fine — they're penalties, e.g. Grand Maester penalizing Family —
 * but the POSITIVE weights need to sum to 1.0 + |penalty total| so the
 * net still lands on 1.0. roleRating() clamps the final result to 1-99
 * regardless, see gameEngine/ratings.js).
 *
 * NOTE: Champion, King, Consort, Hand, Commander, and Master of Coin are
 * NOT in ROLE_WEIGHTS. A single fixed formula for any of these punishes
 * characters who are excellent via a different, equally valid approach
 * (a peak-Strength brawler losing Champion purely for being weak on
 * Speed/Stealth; a Cersei-style ruler losing King for not matching a
 * Ned-style duty/honour formula; Littlefinger losing Master of Coin for
 * being a bad honest steward despite being the show's most effective
 * self-enricher in the role). Each of these six roles is keyed by style
 * instead:
 *   - Champion            -> data/championStyles.js   (fighting_style)
 *   - King / Hand / Consort -> data/leadershipStyles.js (leadership_style)
 *   - Commander           -> data/commandStyles.js    (command_style)
 *   - Master of Coin      -> data/coinStyles.js        (coin_style)
 * ROLES still lists all ten as draftable roles; only the four below
 * (kingsguard, masterOfLaws, masterOfWhispers, grandMaester) are keys in
 * this file.
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
 *
 * v5: King, Consort, Hand, Commander, and Master of Coin split the same
 * way — see data/leadershipStyles.js, data/commandStyles.js, and
 * data/coinStyles.js. No longer flat entries in ROLE_WEIGHTS below.
 * Kingsguard considered the same treatment (a Guard Style: Vow-Bound /
 * Loyalty-Bound / Fear-Enforcer) but it was dropped — the Loyalty-Bound
 * coefficients ended up measuring toughness, not loyalty, and fixing
 * that cleanly wasn't worth it for one role. Kingsguard stays on the
 * single base formula below.
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
  masterOfWhispers: {
    subterfuge: 0.3,
    cunning: 0.3,
    selfPreservation: 0.15,
    stealth: 0.05,
    scholarship: 0.05,
    diplomacy: 0.1,
    etiquette: 0.05,
  },
  grandMaester: {
    scholarship: 0.75,
    duty: 0.1,
    diplomacy: 0.1,
    willpower: 0.1,
    technique: -0.05,
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
  kingsguard: {
    duty: 0.1,
    technique: 0.35,
    strength: 0.25,
    endurance: 0.1,
    willpower: 0.1,
    intimidation: 0.05,
    honour: 0.05,
  },
}