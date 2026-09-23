/**
 * data/accountHouses.js
 *
 * The houses a player can swear to. Ids must match the check constraint on
 * profiles.house in accounts.sql.
 */
export const ACCOUNT_HOUSES = [
  { id: 'stark', name: 'Stark', words: 'Winter is Coming.' },
  { id: 'lannister', name: 'Lannister', words: 'Hear Me Roar!' },
  { id: 'targaryen', name: 'Targaryen', words: 'Fire and Blood.' },
  { id: 'baratheon', name: 'Baratheon', words: 'Ours is the Fury.' },
  { id: 'greyjoy', name: 'Greyjoy', words: 'We Do Not Sow.' },
  { id: 'martell', name: 'Martell', words: 'Unbowed, Unbent, Unbroken.' },
]

export const HOUSE_BY_ID = Object.fromEntries(ACCOUNT_HOUSES.map((h) => [h.id, h]))
export const DEFAULT_HOUSE = 'baratheon'

export const MIN_PASSWORD = 8
export const isEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())
