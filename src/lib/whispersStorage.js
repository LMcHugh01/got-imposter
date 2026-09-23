import { EMPTY_STATS } from '../gameEngine/whispers'

/**
 * lib/whispersStorage.js
 *
 * Whispers keeps its stats and the round in progress in the browser, so a
 * refresh (or leaving and coming back) resumes the same round — and can't
 * be used to dodge a loss and keep a streak alive.
 *
 * Shape: { stats: { streak, best, solved, played }, round: { targetId, guessIds } | null }
 */
const KEY = 'westerosi.whispers.v1'

export function loadWhispers() {
  try {
    const raw = JSON.parse(window.localStorage.getItem(KEY) || 'null')
    return {
      stats: { ...EMPTY_STATS, ...(raw?.stats ?? {}) },
      round: raw?.round && Array.isArray(raw.round.guessIds) ? raw.round : null,
    }
  } catch {
    return { stats: { ...EMPTY_STATS }, round: null }
  }
}

export function saveWhispers(data) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(data))
  } catch {
    // Private mode or storage full — the game still works, it just won't remember.
  }
}
