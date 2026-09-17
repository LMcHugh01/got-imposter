/**
 * data/attributes.js
 *
 * The 26 base sub-attributes, grouped into 6 categories. This is the
 * single source of truth for attribute metadata — roleWeights.js,
 * characterAttributesService.js, and the Characters page all import from
 * here rather than each hardcoding their own copy of the list.
 *
 * Sub-attributes are the actual role-weight inputs (§6.2-style formulas)
 * — the 6 categories are purely organizational/display groupings, not a
 * computed layer in their own right.
 *
 * v2 changes from the original 23-attribute system:
 *   - Ambition added (Devotion) — offensive counterweight to
 *     Self-Preservation: drive to seek/hold power vs. instinct to survive.
 *   - Willpower moved Presence -> Devotion — it's an internal trait
 *     (mental fortitude), not something projected outward like
 *     Intimidation/Prestige.
 *   - Charisma added (Presence) — innate personal magnetism, distinct
 *     from Prestige (title/reputation) and Etiquette (learned polish).
 *   - Beauty/Appeal added (Presence) — physical attractiveness.
 *   - Cunning (Wits) and Subterfuge (Statecraft) both kept, with
 *     sharpened definitions: Cunning is the trait (native shrewdness,
 *     reading people, devising a plan through deceit/slyness); Subterfuge
 *     is the applied act (running an actual deception, lying convincingly
 *     in the moment, covering tracks).
 */

export const ATTRIBUTE_LABELS = {
  strength: 'Strength',
  speed: 'Speed',
  stealth: 'Stealth',
  technique: 'Technique',
  endurance: 'Endurance',
  strategy: 'Strategy',
  cunning: 'Cunning',
  scholarship: 'Scholarship',
  economy: 'Economy',
  diplomacy: 'Diplomacy',
  etiquette: 'Etiquette',
  subterfuge: 'Subterfuge',
  command: 'Command',
  battleMorale: 'Battle Morale',
  justice: 'Justice',
  recruitment: 'Recruitment',
  family: 'Family',
  duty: 'Duty',
  honour: 'Honour',
  selfPreservation: 'Self-Preservation',
  ambition: 'Ambition',
  willpower: 'Willpower',
  intimidation: 'Intimidation',
  prestige: 'Prestige',
  charisma: 'Charisma',
  beautyAppeal: 'Beauty/Appeal',
}

// Short 3-4 letter codes for tight table columns.
export const ATTRIBUTE_SHORT_LABELS = {
  strength: 'STR',
  speed: 'SPD',
  stealth: 'STL',
  technique: 'TEC',
  endurance: 'END',
  strategy: 'STG',
  cunning: 'CUN',
  scholarship: 'SCH',
  economy: 'ECO',
  diplomacy: 'DIP',
  etiquette: 'ETQ',
  subterfuge: 'SUB',
  command: 'CMD',
  battleMorale: 'MOR',
  justice: 'JUS',
  recruitment: 'REC',
  family: 'FAM',
  duty: 'DUT',
  honour: 'HON',
  selfPreservation: 'SLF',
  ambition: 'AMB',
  willpower: 'WIL',
  intimidation: 'INT',
  prestige: 'PRE',
  charisma: 'CHA',
  beautyAppeal: 'BEA',
}

export const ATTRIBUTE_CATEGORIES = [
  { id: 'combat', label: 'Combat', attributes: ['strength', 'speed', 'stealth', 'technique', 'endurance'] },
  { id: 'wits', label: 'Wits', attributes: ['strategy', 'cunning', 'scholarship', 'economy'] },
  { id: 'statecraft', label: 'Statecraft', attributes: ['diplomacy', 'etiquette', 'subterfuge'] },
  { id: 'leadership', label: 'Leadership', attributes: ['command', 'battleMorale', 'justice', 'recruitment'] },
  { id: 'devotion', label: 'Devotion', attributes: ['family', 'duty', 'honour', 'selfPreservation', 'ambition', 'willpower'] },
  { id: 'presence', label: 'Presence', attributes: ['intimidation', 'prestige', 'charisma', 'beautyAppeal'] },
]

// Flat list of all 26 attribute keys, in category order.
export const ALL_ATTRIBUTE_KEYS = ATTRIBUTE_CATEGORIES.flatMap((c) => c.attributes)

// camelCase JS key -> snake_case DB column name (only keys that differ
// from their JS key need an entry here — kept explicit for all 26 so the
// mapping is one obvious lookup table).
export const ATTRIBUTE_DB_COLUMNS = {
  strength: 'strength',
  speed: 'speed',
  stealth: 'stealth',
  technique: 'technique',
  endurance: 'endurance',
  strategy: 'strategy',
  cunning: 'cunning',
  scholarship: 'scholarship',
  economy: 'economy',
  diplomacy: 'diplomacy',
  etiquette: 'etiquette',
  subterfuge: 'subterfuge',
  command: 'command',
  battleMorale: 'battle_morale',
  justice: 'justice',
  recruitment: 'recruitment',
  family: 'family',
  duty: 'duty',
  honour: 'honour',
  selfPreservation: 'self_preservation',
  ambition: 'ambition',
  willpower: 'willpower',
  intimidation: 'intimidation',
  prestige: 'prestige',
  charisma: 'charisma',
  beautyAppeal: 'beauty_appeal',
}

// Which category a given attribute key belongs to — handy for coloring
// or grouping table columns without re-deriving it from ATTRIBUTE_CATEGORIES.
export const ATTRIBUTE_CATEGORY_ID = Object.fromEntries(
  ATTRIBUTE_CATEGORIES.flatMap((cat) => cat.attributes.map((attr) => [attr, cat.id]))
)