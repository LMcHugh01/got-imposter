/**
 * gameEngine/modifiers.js
 *
 * Shared helper: turns a 0-100 stat into a multiplier over a given range.
 * Used by battleEngine.js, economy.js, and diplomacy.js so "how good is
 * this stat" always means the same thing across systems.
 */
export function statToModifier(stat, [min, max]) {
  const clamped = Math.max(0, Math.min(100, stat))
  return min + (clamped / 100) * (max - min)
}
