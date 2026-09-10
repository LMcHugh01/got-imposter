/**
 * data/roleWeights.js
 *
 * The 10 fixed Draft roles and the weight each of the 8 base attributes
 * carries toward that role's rating (= fit %, see gameEngine/ratings.js).
 *
 * This is config, not logic — rebalancing a role is an edit here, not a
 * code change. Every role's weights should sum to 1.0.
 */

export const ROLES = [
    { id: 'king', label: 'King / Queen' },
    { id: 'consort', label: 'Consort' },
    { id: 'hand', label: 'Hand' },
    { id: 'masterOfWhispers', label: 'Master of Whispers' },
    { id: 'grandMaester', label: 'Grand Maester' },
    { id: 'masterOfCoin', label: 'Master of Coin' },
    { id: 'masterOfLaws', label: 'Master of Laws' },
    { id: 'masterOfWar', label: 'Master of War' },
    { id: 'kingsguard', label: 'Kingsguard' },
    { id: 'commander', label: 'Commander' },
  ]
  
  export const ROLE_WEIGHTS = {
    king: {
      leadership: 0.4,
      politics: 0.25,
      diplomacy: 0.2,
      intelligence: 0.15,
    },
    consort: {
      diplomacy: 0.45,
      politics: 0.25,
      leadership: 0.15,
      loyalty: 0.15,
    },
    hand: {
      leadership: 0.25,
      politics: 0.25,
      intelligence: 0.2,
      economy: 0.2,
      diplomacy: 0.1,
    },
    masterOfWhispers: {
      intelligence: 0.5,
      politics: 0.2,
      diplomacy: 0.1,
      loyalty: 0.1,
      strategy: 0.1,
    },
    grandMaester: {
      intelligence: 0.5,
      loyalty: 0.2,
      diplomacy: 0.15,
      politics: 0.15,
    },
    masterOfCoin: {
      economy: 0.45,
      intelligence: 0.2,
      politics: 0.2,
      diplomacy: 0.15,
    },
    masterOfLaws: {
      politics: 0.3,
      leadership: 0.25,
      loyalty: 0.2,
      intelligence: 0.15,
      combat: 0.1,
    },
    masterOfWar: {
      strategy: 0.4,
      leadership: 0.25,
      combat: 0.2,
      intelligence: 0.15,
    },
    kingsguard: {
      combat: 0.65,
      loyalty: 0.2,
      leadership: 0.1,
      strategy: 0.05,
    },
    commander: {
      combat: 0.4,
      strategy: 0.3,
      leadership: 0.2,
      intelligence: 0.1,
    },
  }