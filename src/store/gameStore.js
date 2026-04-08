import { create } from 'zustand'

const initialState = {
  // Settings
  totalPlayers: 4,
  impostorCount: 1,
  difficulty: 'easy',

  // Game data
  secretCharacter: null,
  players: [],

  // Flow
  phase: 'settings',
  currentRevealIndex: 0,
  round: 1,
  winner: null,

  // Elimination tracking
  lastEliminatedId: null,
}

export const useGameStore = create((set, get) => ({
  ...initialState,

  // Settings actions
  setTotalPlayers: (n) =>
    set((state) => ({
      totalPlayers: n,
      // Clamp impostorCount if it exceeds max
      impostorCount: Math.min(state.impostorCount, Math.floor(n / 2)),
    })),

  setImpostorCount: (n) => set({ impostorCount: n }),

  setDifficulty: (d) => set({ difficulty: d }),

  // Game setup
  startGame: (secretCharacter, players) =>
    set({
      secretCharacter,
      players,
      phase: 'reveal',
      currentRevealIndex: 0,
      round: 1,
      winner: null,
      lastEliminatedId: null,
    }),

  // Card reveal flow
  advanceReveal: () =>
    set((state) => {
      const next = state.currentRevealIndex + 1
      if (next >= state.players.length) {
        return { phase: 'voting', currentRevealIndex: 0 }
      }
      return { currentRevealIndex: next }
    }),

  // Voting & elimination
  eliminatePlayer: (playerId) => {
    const { players } = get()
    const updated = players.map((p) =>
      p.id === playerId ? { ...p, isEliminated: true } : p
    )
    set({ players: updated, lastEliminatedId: playerId, phase: 'elimination' })
  },

  setWinner: (winner) => set({ winner, phase: 'results' }),

  advanceRound: () =>
    set((state) => ({
      round: state.round + 1,
      phase: 'voting',
    })),

  // Reset
  resetGame: () => set(initialState),
}))
