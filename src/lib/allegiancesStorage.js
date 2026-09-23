import { EMPTY_STATS } from '../gameEngine/allegiances'

/**
 * lib/allegiancesStorage.js
 *
 * Remembers stats and every assembly's board, so you can leave one
 * half-done, try another, and come back to it.
 *
 * Shape: { stats: { solved, played }, rounds: { [assemblyId]: round } }
 */
const KEY = 'westerosi.allegiances.v1'

export function loadAllegiances() {
  try {
    const raw = JSON.parse(window.localStorage.getItem(KEY) || 'null')
    return { stats: { ...EMPTY_STATS, ...(raw?.stats ?? {}) }, rounds: raw?.rounds ?? {} }
  } catch {
    return { stats: { ...EMPTY_STATS }, rounds: {} }
  }
}

export function saveAllegiances(data) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(data))
  } catch {
    // Storage unavailable — play continues, it just won't be remembered.
  }
}
