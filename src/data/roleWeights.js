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
 */

export const ROLES = [
    { id: 'king', label: 'King / Queen' },
    { id: 'consort', label: 'Consort' },
    { id: 'hand', label: 'Hand' },
    { id: 'masterOfWhispers', label: 'Master of Whispers' },
    { id: 'grandMaester', label: 'Grand Maester' },
    { id: 'masterOfCoin', label: 'Master of Coin' },
    { id: 'masterOfLaws', label: 'Master of Laws' },
    { id: 'commander', label: 'Commander' },
    { id: 'kingsguard', label: 'Kingsguard' },
    { id: 'champion', label: 'Champion' },
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
      // Honour -10%: a spymaster too honorable to blackmail, deceive, or
      // betray isn't an effective one — Varys works because he isn't
      // burdened by it.
      subterfuge: 0.3,
      cunning: 0.25,
      selfPreservation: 0.15,
      stealth: 0.1,
      scholarship: 0.1,
      diplomacy: 0.1,
      intimidation: 0.1,
      honour: -0.1,
    },
    grandMaester: {
      // Family -10%: the Maester's vow forswears family ties in service of
      // the realm/order — a strong pull toward family undermines that.
      scholarship: 0.45,
      diplomacy: 0.15,
      subterfuge: 0.15,
      justice: 0.15,
      willpower: 0.2,
      family: -0.1,
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
      // Subterfuge -10%: justice enforced through backroom scheming and
      // manipulation undermines the rule of law itself — the law should be
      // applied, not maneuvered.
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
      // Self-Preservation -10%: a commander too worried about his own
      // safety won't lead from the front, and troops notice — Robb/Jon
      // inspire because they share the risk.
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
    // Also redesigned independently — no negative weight.
    champion: {
      technique: 0.5,
      speed: 0.15,
      stealth: 0.1,
      strength: 0.15,
      willpower: 0.1,
    },
  }