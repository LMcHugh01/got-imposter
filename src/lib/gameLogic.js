/**
 * Randomly assign impostors from the player list.
 * Returns array of player objects with isImpostor boolean.
 */
export function assignImpostors(totalPlayers, impostorCount) {
  const players = Array.from({ length: totalPlayers }, (_, i) => ({
    id: i + 1,
    isImpostor: false,
    isEliminated: false,
  }))

  // Fisher-Yates shuffle to pick random impostors
  const indices = Array.from({ length: totalPlayers }, (_, i) => i)
  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[indices[i], indices[j]] = [indices[j], indices[i]]
  }

  for (let i = 0; i < impostorCount; i++) {
    players[indices[i]].isImpostor = true
  }

  return players
}

/**
 * Check if the game is over after an elimination.
 * Returns "loyalists" | "impostor" | null (game continues)
 *
 * Loyalists win if all impostors are eliminated.
 * Impostor wins if impostors >= remaining loyalists (≤2 players left with impostor still in).
 */
export function checkWinCondition(players) {
  const activePlayers = players.filter((p) => !p.isEliminated)
  const activeImpostors = activePlayers.filter((p) => p.isImpostor)
  const activeLoyalists = activePlayers.filter((p) => !p.isImpostor)

  // All impostors eliminated → loyalists win
  if (activeImpostors.length === 0) {
    return 'loyalists'
  }

  // Impostors equal or outnumber loyalists → impostor wins
  if (activeImpostors.length >= activeLoyalists.length) {
    return 'impostor'
  }

  return null
}
