import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useGameStore } from '../store/gameStore'
import PlayerList from '../components/PlayerList'
import PageWrapper from '../components/PageWrapper'

export default function Voting() {
  const navigate = useNavigate()
  const { players, round, eliminatePlayer } = useGameStore()
  const [selectedId, setSelectedId] = useState(null)

  const activePlayers = players.filter((p) => !p.isEliminated)

  if (activePlayers.length === 0) {
    navigate('/')
    return null
  }

  const handleEliminate = () => {
    if (!selectedId) return
    eliminatePlayer(selectedId)
    navigate('/elimination')
  }

  return (
    <PageWrapper>
      <div className="w-full max-w-sm flex flex-col gap-6">
        {/* Header */}
        <div className="text-center pt-2">
          <p
            className="text-got-parchment/40 text-sm tracking-[0.4em] uppercase mb-1"
            style={{ fontFamily: 'Cinzel, serif' }}
          >
            Round {round}
          </p>
          <h2
            className="text-3xl font-bold text-got-gold tracking-wider"
            style={{ fontFamily: 'Cinzel, serif' }}
          >
            The Vote
          </h2>
          <div className="gold-divider mt-3" />
        </div>

        {/* Instructions */}
        <p
          className="text-got-parchment/50 text-center text-base italic leading-relaxed"
          style={{ fontFamily: 'EB Garamond, serif' }}
        >
          Discuss among yourselves. Who gave suspicious clues? Select the player with the most votes.
        </p>

        {/* Active player count */}
        <div className="flex justify-center">
          <span
            className="text-stone-600 text-sm tracking-widest"
            style={{ fontFamily: 'Cinzel, serif' }}
          >
            {activePlayers.length} Players Remain
          </span>
        </div>

        {/* Player list */}
        <PlayerList
          players={players}
          selected={selectedId}
          onSelect={setSelectedId}
          showEliminated={false}
        />

        {/* Eliminate button */}
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={handleEliminate}
          disabled={!selectedId}
          className={[
            'w-full py-5 rounded border text-xl tracking-widest uppercase transition-all duration-200',
            selectedId
              ? 'border-got-red bg-got-red/10 text-got-red-bright hover:bg-got-red/20'
              : 'border-stone-800 text-stone-700 cursor-not-allowed',
          ].join(' ')}
          style={{ fontFamily: 'Cinzel, serif' }}
        >
          {selectedId ? `Eliminate Player ${selectedId}` : 'Select a Player'}
        </motion.button>

        {/* Disclaimer */}
        <p
          className="text-stone-700 text-xs text-center"
          style={{ fontFamily: 'Cinzel, serif' }}
        >
          This action cannot be undone
        </p>
      </div>
    </PageWrapper>
  )
}
