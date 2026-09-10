/**
 * config/features.js
 *
 * SHOW_DEBUG_NUMBERS controls whether role fit % (draft, role assignment,
 * Roster) and battle win probability % are shown to the player. On by
 * default so testing/tuning has full visibility into the numbers.
 *
 * To go live: set VITE_SHOW_DEBUG_NUMBERS=false in .env. Showing these
 * numbers to players defeats the point of the game (§1 pillar 1 — the
 * player builds potential, the simulation decides outcomes; that's a much
 * weaker premise if you can see the exact odds ahead of time) — so this
 * flag exists specifically to make that switch a one-line change instead
 * of hunting through every screen that displays a percentage.
 *
 * Does NOT affect: House Overview stats (Military/Economy/etc.), army
 * sizes, casualty counts, gold amounts — those read as campaign narrative
 * rather than meta-gaming numbers and stay visible either way.
 */
export const SHOW_DEBUG_NUMBERS = import.meta.env.VITE_SHOW_DEBUG_NUMBERS !== 'false'