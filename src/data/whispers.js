/**
 * data/whispers.js
 *
 * Rules and reference data for Whispers.
 *
 * The six "standings" are the attribute categories from data/attributes.js,
 * each given a three-letter code for the compact report tiles. A standing's
 * score is the average of its sub-attributes.
 */
import { ATTRIBUTE_CATEGORIES } from './attributes'

export const MAX_GUESSES = 6

// A standing within this many points of the hidden character's is "close"
// and gets the gilded mark.
export const CLOSE_BAND = 8

const GROUP_CODES = {
  combat: 'CMB',
  wits: 'WIT',
  statecraft: 'STA',
  leadership: 'LDR',
  devotion: 'DEV',
  presence: 'PRE',
}

export const WHISPER_GROUPS = ATTRIBUTE_CATEGORIES.map((cat) => ({
  id: cat.id,
  label: cat.label,
  code: GROUP_CODES[cat.id] ?? cat.label.slice(0, 3).toUpperCase(),
  keys: cat.attributes,
}))

// Exact house strings that need a specific region (seats that differ from
// the family's usual region, and groups that aren't houses at all).
const REGION_BY_HOUSE = {
  'House Baratheon of Dragonstone': 'The Crownlands',
  'House Targaryen of King\u2019s Landing': 'The Crownlands',
  "House Targaryen of King's Landing": 'The Crownlands',
  'Small Council': 'The Crownlands',
}

// Fallback: first keyword found anywhere in the house string wins.
const REGION_KEYWORDS = [
  ['Stark', 'The North'], ['Bolton', 'The North'], ['Mormont', 'The North'],
  ['Karstark', 'The North'], ['Umber', 'The North'], ['Reed', 'The North'],
  ["Night's Watch", 'The North'], ['Night\u2019s Watch', 'The North'],
  ['Lannister', 'The Westerlands'], ['Clegane', 'The Westerlands'], ['Payne', 'The Westerlands'],
  ['Tyrell', 'The Reach'], ['Tarly', 'The Reach'], ['Redwyne', 'The Reach'], ['Hightower', 'The Reach'],
  ['Martell', 'Dorne'], ['Sand', 'Dorne'],
  ['Arryn', 'The Vale'], ['Royce', 'The Vale'],
  ['Tully', 'The Riverlands'], ['Frey', 'The Riverlands'], ['Baelish', 'The Riverlands'],
  ['Greyjoy', 'The Iron Islands'],
  ['Targaryen', 'The Crownlands'], ['Stokeworth', 'The Crownlands'],
  ['Baratheon', 'The Stormlands'], ['Seaworth', 'The Stormlands'], ['Dondarrion', 'The Stormlands'],
  ['Unsullied', 'Essos'], ['Dothraki', 'Essos'], ['Second Sons', 'Essos'], ['Asshai', 'Essos'],
  ['Free Folk', 'Beyond the Wall'],
]

export function regionForHouse(house) {
  if (!house) return null
  if (REGION_BY_HOUSE[house]) return REGION_BY_HOUSE[house]
  const hit = REGION_KEYWORDS.find(([word]) => house.includes(word))
  return hit ? hit[1] : null
}