/**
 * lib/ravensStorage.js
 *
 * Saves the game in progress (so a refresh or a stray Back doesn't lose it)
 * and the last setup (so "New Game" starts where you left off).
 */
const GAME_KEY = 'westerosi.ravens.game.v1'
const SETUP_KEY = 'westerosi.ravens.setup.v1'

const read = (key) => {
  try {
    return JSON.parse(window.localStorage.getItem(key) || 'null')
  } catch {
    return null
  }
}
const write = (key, value) => {
  try {
    if (value == null) window.localStorage.removeItem(key)
    else window.localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // Storage unavailable — the game still works, it just won't survive a refresh.
  }
}

export const loadRavensGame = () => read(GAME_KEY)
export const saveRavensGame = (game) => write(GAME_KEY, game)
export const clearRavensGame = () => write(GAME_KEY, null)

export const loadRavensSetup = () => read(SETUP_KEY)
export const saveRavensSetup = (settings) => write(SETUP_KEY, settings)
