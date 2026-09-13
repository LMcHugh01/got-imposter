/**
 * data/attributes.js
 *
 * The 23 base sub-attributes, grouped into 6 categories. This is the
 * single source of truth for attribute metadata — roleWeights.js,
 * characterAttributesService.js, and the Characters page all import from
 * here rather than each hardcoding their own copy of the list.
 *
 * Sub-attributes are the actual role-weight inputs (§6.2-style formulas)
 * — the 6 categories are purely organizational/display groupings, not a
 * computed layer in their own right.
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
    intimidation: 'Intimidation',
    prestige: 'Prestige',
    willpower: 'Willpower',
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
    intimidation: 'INT',
    prestige: 'PRE',
    willpower: 'WIL',
  }
  
  export const ATTRIBUTE_CATEGORIES = [
    { id: 'combat', label: 'Combat', attributes: ['strength', 'speed', 'stealth', 'technique', 'endurance'] },
    { id: 'wits', label: 'Wits', attributes: ['strategy', 'cunning', 'scholarship', 'economy'] },
    { id: 'statecraft', label: 'Statecraft', attributes: ['diplomacy', 'etiquette', 'subterfuge'] },
    { id: 'leadership', label: 'Leadership', attributes: ['command', 'battleMorale', 'justice', 'recruitment'] },
    { id: 'devotion', label: 'Devotion', attributes: ['family', 'duty', 'honour', 'selfPreservation'] },
    { id: 'presence', label: 'Presence', attributes: ['intimidation', 'prestige', 'willpower'] },
  ]
  
  // Flat list of all 23 attribute keys, in category order.
  export const ALL_ATTRIBUTE_KEYS = ATTRIBUTE_CATEGORIES.flatMap((c) => c.attributes)
  
  // camelCase JS key -> snake_case DB column name (only two differ from
  // their JS key: battleMorale/selfPreservation).
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
    intimidation: 'intimidation',
    prestige: 'prestige',
    willpower: 'willpower',
  }
  
  // Which category a given attribute key belongs to — handy for coloring
  // or grouping table columns without re-deriving it from ATTRIBUTE_CATEGORIES.
  export const ATTRIBUTE_CATEGORY_ID = Object.fromEntries(
    ATTRIBUTE_CATEGORIES.flatMap((cat) => cat.attributes.map((attr) => [attr, cat.id]))
  )