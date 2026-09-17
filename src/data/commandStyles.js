/**
 * data/commandStyles.js
 *
 * Commander's single fixed formula (strategy/command/battleMorale-heavy)
 * doesn't distinguish HOW a character wins battles — a cold tactician
 * (Tywin, Stannis), a front-line inspirer (Jon, Robb), and a ruthless
 * grinder who wins on numbers alone (Roose Bolton) are all "good
 * commanders" but for different reasons. Kept separate from Leadership
 * Style deliberately: ruling style and battlefield style don't always
 * match (Stannis rules by Duty/Example but commands through cold
 * discipline, not charisma).
 *
 * Each character has a fixed `command_style` (characters table, mirroring
 * `fighting_style`) — not a 0-100 stat, a category. Commander's
 * roleRating() looks up COMMAND_STYLE_WEIGHTS[style] instead of a single
 * fixed table (see gameEngine/ratings.js). This REPLACES the `commander`
 * entry that used to live in ROLE_WEIGHTS (data/roleWeights.js) — it is
 * no longer a key there, same way champion isn't.
 */

export const COMMAND_STYLES = ['tactician', 'frontline', 'juggernaut']

export const COMMAND_STYLE_LABELS = {
  tactician: 'Tactician',
  frontline: 'Frontline',
  juggernaut: 'Juggernaut',
}

// camelCase JS key -> DB text value stored in characters.command_style.
export const COMMAND_STYLE_DB_VALUES = {
  tactician: 'tactician',
  frontline: 'frontline',
  juggernaut: 'juggernaut',
}

export const COMMAND_STYLE_FROM_DB = Object.fromEntries(
  Object.entries(COMMAND_STYLE_DB_VALUES).map(([js, db]) => [db, js])
)

export const COMMAND_STYLE_WEIGHTS = {
  // Wins from the map table. (Tywin, Stannis.)
  tactician: {
    strategy: 0.45,
    command: 0.2,
    recruitment: 0.1,
    scholarship: 0.1,
    willpower: 0.1,
    technique: 0.05,
  },
  // Leads from the front, fights alongside troops — inspiring but
  // personally at risk. (Jon Snow, Robb Stark.)
  frontline: {
    battleMorale: 0.25,
    technique: 0.25,
    strength: 0.15,
    command: 0.15,
    willpower: 0.1,
    recruitment: 0.1,
    selfPreservation: -0.1,
  },
  // Wins through overwhelming force and intimidation, accepts heavy
  // losses without much regard for how troops feel about it.
  // (Roose Bolton, Gregor Clegane-as-commander.)
  juggernaut: {
    intimidation: 0.3,
    command: 0.2,
    strength: 0.2,
    technique: 0.15,
    willpower: 0.15,
    recruitment: 0.1,
    honour: -0.1,
  },
}