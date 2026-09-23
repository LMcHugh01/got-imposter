/**
 * data/honours.js
 *
 * Every honour, and how far a player is towards it. `progress` returns
 * [current, target]; an honour is earned once current reaches target.
 * Honours are only awarded to signed-in players. To add one, add an entry
 * here — no database change needed.
 */

export const HONOURS = [
  // Whispers
  { id: 'a-little-bird', game: 'whispers', title: 'A Little Bird', desc: 'Solve a name on the first guess.', progress: (r) => [r.whispers.firstGuess, 1] },
  { id: 'unbroken', game: 'whispers', title: 'Unbroken', desc: 'Solve ten in a row.', progress: (r) => [r.whispers.best, 10] },
  { id: 'the-long-night', game: 'whispers', title: 'The Long Night', desc: 'Solve thirty in a row.', progress: (r) => [r.whispers.best, 30] },
  { id: 'by-a-thread', game: 'whispers', title: 'By a Thread', desc: 'Solve a name on your sixth and final guess.', progress: (r) => [r.whispers.lastGuess, 1] },
  { id: 'master-of-whispers', game: 'whispers', title: 'Master of Whispers', desc: 'Solve 100 names.', progress: (r) => [r.whispers.solved, 100] },
  // Allegiances
  { id: 'silver-tongue', game: 'allegiances', title: 'Silver Tongue', desc: 'Clear an assembly without a single mistake.', progress: (r) => [r.allegiances.flawless, 1] },
  { id: 'not-today', game: 'allegiances', title: 'Not Today', desc: 'Clear an assembly with one patience left.', progress: (r) => [r.allegiances.lastPatience, 1] },
  // Draft
  { id: 'fit-for-a-king', game: 'draft', title: 'Fit for a King', desc: 'Seat a council rated 80 or higher.', progress: (r) => [r.draft.best, 80] },
  { id: 'kingmaker', game: 'draft', title: 'Kingmaker', desc: 'Seat a council rated 90 or higher.', progress: (r) => [r.draft.best, 90] },
  // Campaign
  { id: 'iron-throne', game: 'campaign', title: 'Iron Throne', desc: 'Win a Campaign.', progress: (r) => [r.campaign.won, 1] },
  { id: 'the-young-wolf', game: 'campaign', title: 'The Young Wolf', desc: 'Win a Campaign without losing a battle.', progress: (r) => [r.campaign.flawlessWins, 1] },
  { id: 'trial-by-combat', game: 'campaign', title: 'Trial by Combat', desc: 'Win a duel.', progress: (r) => [r.campaign.duelsWon, 1] },
  { id: 'battle-hardened', game: 'campaign', title: 'Battle-Hardened', desc: 'Win fifty battles.', progress: (r) => [r.campaign.battlesWon, 50] },
  // Across the realm
  { id: 'sworn', game: null, title: 'Sworn', desc: 'Create an account.', progress: () => [1, 1] },
  {
    id: 'a-song-of-ice-and-fire',
    game: null,
    title: 'A Song of Ice and Fire',
    desc: 'Earn an honour in all four games.',
    progress: (_r, earned) => {
      const games = new Set(HONOURS.filter((h) => h.game && earned.has(h.id)).map((h) => h.game))
      return [games.size, 4]
    },
  },
  {
    id: 'lord-paramount',
    game: null,
    title: 'Lord Paramount',
    desc: 'Earn ten honours.',
    progress: (_r, earned) => [[...earned].filter((id) => id !== 'lord-paramount').length, 10],
  },
]

export const HONOUR_BY_ID = Object.fromEntries(HONOURS.map((h) => [h.id, h]))

/** [current (capped at target), target, earned?] for one honour. */
export function honourProgress(honour, record, earnedIds) {
  const [current, target] = honour.progress(record, earnedIds)
  return { current: Math.min(current, target), target, done: current >= target }
}

/**
 * Honours newly earned by this record, given those already held. Repeats
 * until nothing changes, because honours like Lord Paramount depend on the
 * others.
 */
export function newlyEarned(record, alreadyEarned) {
  const earned = new Set(alreadyEarned)
  const fresh = []
  let changed = true
  while (changed) {
    changed = false
    for (const h of HONOURS) {
      if (earned.has(h.id)) continue
      if (honourProgress(h, record, earned).done) {
        earned.add(h.id)
        fresh.push(h.id)
        changed = true
      }
    }
  }
  return fresh
}
