import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useGameStore } from '../store/gameStore'
import { checkWinCondition } from '../lib/gameLogic'
import PageWrapper from '../components/PageWrapper'

export default function EliminationReveal() {
  const navigate = useNavigate()
  const { players, lastEliminatedId, setWinner, advanceRound } = useGameStore()
  const [revealed, setRevealed] = useState(false)

  const eliminated = players.find((p) => p.id === lastEliminatedId)

  // Guard: if no eliminated player, go home
  useEffect(() => {
    if (!eliminated) navigate('/')
  }, [eliminated, navigate])

  if (!eliminated) return null

  const wasImpostor = eliminated.isImpostor

  const handleReveal = () => setRevealed(true)

  const handleContinue = () => {
    if (wasImpostor) {
      // Check if game is over (all impostors eliminated)
      const result = checkWinCondition(players)
      if (result) {
        setWinner(result)
        navigate('/results')
      } else {
        // More impostors remain, continue
        advanceRound()
        navigate('/voting')
      }
    } else {
      // Not impostor — check win condition for impostor win
      const result = checkWinCondition(players)
      if (result) {
        setWinner(result)
        navigate('/results')
      } else {
        advanceRound()
        navigate('/voting')
      }
    }
  }

  return (
    <PageWrapper className="justify-center">
      <div className="w-full max-w-sm flex flex-col items-center gap-8">
        {/* Header */}
        <div className="text-center w-full">
          <p
            className="text-got-parchment/40 text-sm tracking-[0.4em] uppercase mb-1"
            style={{ fontFamily: 'Cinzel, serif' }}
          >
            The Verdict
          </p>
          <h2
            className="text-3xl font-bold text-got-gold tracking-wider"
            style={{ fontFamily: 'Cinzel, serif' }}
          >
            Player {eliminated.id}
          </h2>
          <div className="gold-divider mt-3" />
        </div>

        {!revealed ? (
          /* Pre-reveal — dramatic suspense */
          <motion.div
            className="flex flex-col items-center gap-8 w-full"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <div className="text-center">
              <p
                className="text-got-parchment/50 text-lg italic leading-relaxed"
                style={{ fontFamily: 'EB Garamond, serif' }}
              >
                The realm holds its breath...
              </p>
              <p
                className="text-got-parchment/30 text-base mt-2 italic"
                style={{ fontFamily: 'EB Garamond, serif' }}
              >
                Was Player {eliminated.id} the Impostor?
              </p>
            </div>

            {/* Big suspense icon */}
            <motion.div
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="text-7xl"
            >
              ⚖️
            </motion.div>

            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={handleReveal}
              className="w-full py-5 rounded border border-got-gold bg-got-gold/10 text-got-gold text-xl tracking-widest uppercase transition-all hover:bg-got-gold/20"
              style={{ fontFamily: 'Cinzel, serif' }}
            >
              Reveal
            </motion.button>
          </motion.div>
        ) : (
          /* Post-reveal */
          <motion.div
            className="flex flex-col items-center gap-8 w-full"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4 }}
          >
            {wasImpostor ? (
              /* IMPOSTOR CAUGHT */
              <div className="flex flex-col items-center gap-6 w-full">
                {/* Red dramatic background */}
                <div
                  className="w-full rounded-2xl p-8 flex flex-col items-center gap-4 border border-got-red/40"
                  style={{
                    background: 'linear-gradient(160deg, #1a0000, #0d0000)',
                    boxShadow: '0 0 60px rgba(139,26,26,0.2)',
                  }}
                >
                  <div className="text-6xl">🗡️</div>
                  <h3
                    className="text-3xl font-black text-center"
                    style={{
                      fontFamily: 'Cinzel, serif',
                      color: '#c0392b',
                      textShadow: '0 0 20px rgba(192,57,43,0.5)',
                    }}
                  >
                    Impostor Found!
                  </h3>
                  <div
                    style={{ height: '1px', width: '100%', background: 'linear-gradient(to right, transparent, rgba(139,26,26,0.6), transparent)' }}
                  />
                  <p
                    className="text-got-parchment/60 text-center italic"
                    style={{ fontFamily: 'EB Garamond, serif' }}
                  >
                    Player {eliminated.id} was indeed the Impostor. The realm is safer.
                  </p>
                </div>

                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={handleContinue}
                  className="w-full py-5 rounded border border-got-gold bg-got-gold/10 text-got-gold text-xl tracking-widest uppercase transition-all hover:bg-got-gold/20"
                  style={{ fontFamily: 'Cinzel, serif' }}
                >
                  Continue
                </motion.button>
              </div>
            ) : (
              /* NOT THE IMPOSTOR */
              <div className="flex flex-col items-center gap-6 w-full">
                <div
                  className="w-full rounded-2xl p-8 flex flex-col items-center gap-4 border border-stone-700"
                  style={{
                    background: 'linear-gradient(160deg, #111111, #0a0a0a)',
                    boxShadow: '0 0 40px rgba(0,0,0,0.4)',
                  }}
                >
                  <div className="text-6xl">😮</div>
                  <h3
                    className="text-3xl font-black text-got-parchment text-center"
                    style={{ fontFamily: 'Cinzel, serif' }}
                  >
                    Innocent!
                  </h3>
                  <div className="gold-divider w-full" />
                  <p
                    className="text-got-parchment/60 text-center italic leading-relaxed"
                    style={{ fontFamily: 'EB Garamond, serif' }}
                  >
                    Player {eliminated.id} was not the Impostor. A loyal subject, wrongfully accused.
                  </p>
                </div>

                <p
                  className="text-got-parchment/40 text-sm text-center"
                  style={{ fontFamily: 'Cinzel, serif' }}
                >
                  Player {eliminated.id} is eliminated. The hunt continues...
                </p>

                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={handleContinue}
                  className="w-full py-5 rounded border border-got-gold bg-got-gold/10 text-got-gold text-xl tracking-widest uppercase transition-all hover:bg-got-gold/20"
                  style={{ fontFamily: 'Cinzel, serif' }}
                >
                  Continue Voting
                </motion.button>
              </div>
            )}
          </motion.div>
        )}
      </div>
    </PageWrapper>
  )
}
