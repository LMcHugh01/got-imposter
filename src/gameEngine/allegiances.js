/**
 * gameEngine/allegiances.js
 *
 * Pure rules for Allegiances — no React, no storage — tested in
 * allegiances.test.js.
 *
 * A round: { order: [name…] (unsolved names, board order), solved: [groupIndex…],
 *            picked: [name…], mistakes, status: 'playing' | 'won' | 'lost' }
 */
import { PATIENCE } from '../data/allegiances'

export function shuffle(items, random = Math.random) {
  const out = items.slice()
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

export function groupOf(assembly, name) {
  return assembly.groups.findIndex((g) => g.names.includes(name))
}

export function newRound(assembly, random = Math.random) {
  return {
    order: shuffle(
      assembly.groups.flatMap((g) => g.names),
      random,
    ),
    solved: [],
    picked: [],
    mistakes: 0,
    status: 'playing',
  }
}

/** Select or deselect a name; at most four can be held at once. */
export function togglePick(round, name) {
  if (round.status !== 'playing' || !round.order.includes(name)) return round
  if (round.picked.includes(name)) return { ...round, picked: round.picked.filter((n) => n !== name) }
  if (round.picked.length >= 4) return round
  return { ...round, picked: [...round.picked, name] }
}

/**
 * Present the four picked names.
 * outcome: 'correct' | 'won' | 'oneAway' | 'wrong' | 'lost' | 'invalid'
 */
export function presentPick(round, assembly) {
  if (round.status !== 'playing' || round.picked.length !== 4) return { round, outcome: 'invalid' }

  const groups = round.picked.map((n) => groupOf(assembly, n))
  if (groups.every((g) => g === groups[0])) {
    const gi = groups[0]
    const solved = [...round.solved, gi]
    const won = solved.length === assembly.groups.length
    return {
      outcome: won ? 'won' : 'correct',
      round: {
        ...round,
        solved,
        picked: [],
        order: round.order.filter((n) => groupOf(assembly, n) !== gi),
        status: won ? 'won' : 'playing',
      },
    }
  }

  const mistakes = round.mistakes + 1
  if (mistakes >= PATIENCE) {
    // Out of patience: reveal the remaining groups in their natural order.
    const rest = assembly.groups.map((_, i) => i).filter((i) => !round.solved.includes(i))
    return {
      outcome: 'lost',
      round: { ...round, mistakes, picked: [], order: [], solved: [...round.solved, ...rest], status: 'lost' },
    }
  }

  const oneAway = assembly.groups.some((_, gi) => groups.filter((g) => g === gi).length === 3)
  return { outcome: oneAway ? 'oneAway' : 'wrong', round: { ...round, mistakes } }
}

export const OUTCOME_NOTES = {
  oneAway: 'One of these belongs elsewhere.',
  wrong: 'No bond between these four.',
}

export function verdict(round) {
  if (round.status === 'lost') {
    return {
      title: 'The Court Rose Early',
      line: 'Patience ran out with names still on the floor. The four bonds are shown above, so you will not be caught out twice.',
    }
  }
  if (round.mistakes === 0) {
    return {
      title: 'Named Without Error',
      line: 'Four bonds, sixteen names, not one wrong word spoken. Someone has been paying attention at the high table.',
    }
  }
  return {
    title: round.mistakes === 1 ? 'A Sound Reading of the Room' : 'Assembled, Barely',
    line: 'The hall is sorted and everyone is standing where they should be, whatever it took to get them there.',
  }
}

export const EMPTY_STATS = { solved: 0, played: 0 }

export function recordResult(stats, won) {
  return { solved: stats.solved + (won ? 1 : 0), played: stats.played + 1 }
}
