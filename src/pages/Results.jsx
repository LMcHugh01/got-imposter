import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useGameStore } from '../store/gameStore'
import PageWrapper from '../components/PageWrapper'

export default function Results() {
  const navigate = useNavigate()
  const { winner, secretCharacter, players, resetGame } = useGameStore()

  const impostors = players.filter((p) => p.isImpostor)
  const loyalistsWon = winner === 'loyalists'

  const handlePlayAgain = () => {
    resetGame()
    navigate('/')
  }

  if (!winner) {
    navigate('/')
    return null
  }

  return (
    <PageWrapper className="justify-center">
      <div className="w-full max-w-sm flex flex-col items-center gap-8">

        {/* Victory header */}
        <motion.div
          className="text-center w-full"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="text-6xl mb-4 select-none">
            {loyalistsWon ? '⚔️' : '🗡️'}
          </div>
          <h2
            className="text-4xl font-black tracking-wider uppercase"
            style={{
              fontFamily: 'Cinzel, serif',
              color: loyalistsWon ? '#c9a84c' : '#c0392b',
              textShadow: loyalistsWon
                ? '0 0 30px rgba(201,168,76,0.4)'
                : '0 0 30px rgba(192,57,43,0.5)',
            }}
          >
            {loyalistsWon ? 'Loyalists Win' : 'Impostor Wins'}
          </h2>
          <div className="gold-divider mt-4" />
        </motion.div>

        {/* Flavor text */}
        <motion.p
          className="text-center text-lg italic text-got-parchment/50 leading-relaxed"
          style={{ fontFamily: 'EB Garamond, serif' }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          {loyalistsWon
            ? 'The realm is safe. The impostor has been unmasked and brought to justice.'
            : 'The impostor has outwitted all. The throne belongs to deception.'}
        </motion.p>

        {/* Secret character reveal */}
        {secretCharacter && (
          <motion.div
            className="w-full rounded-2xl overflow-hidden border border-got-gold/30"
            style={{
              background: 'linear-gradient(160deg, #f5e6c8 0%, #e8d5a3 40%, #d4bc82 100%)',
            }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
          >
            <div className="p-6 flex flex-col items-center gap-4">
              <p
                className="text-got-gold-dark text-xs tracking-[0.5em] uppercase"
                style={{ fontFamily: 'Cinzel, serif' }}
              >
                The Secret Character Was
              </p>

              <div
                style={{ height: '1px', width: '100%', background: 'linear-gradient(to right, transparent, #8b6914, transparent)' }}
              />

              {secretCharacter.image_url ? (
                <img
                  src={secretCharacter.image_url}
                  alt={secretCharacter.name}
                  className="w-28 h-28 rounded-full object-cover border-4 border-got-gold-dark/40"
                />
              ) : (
                <div
                  className="w-28 h-28 rounded-full flex items-center justify-center border-4 border-got-gold-dark/30"
                  style={{ background: 'rgba(139,105,20,0.1)' }}
                >
                  <span className="text-5xl">⚔️</span>
                </div>
              )}

              <h3
                className="text-2xl font-bold text-got-gold-dark text-center"
                style={{ fontFamily: 'Cinzel, serif' }}
              >
                {secretCharacter.name}
              </h3>
            </div>
          </motion.div>
        )}

        {/* Impostor reveal */}
        <motion.div
          className="w-full rounded-xl border border-red-900/40 p-5"
          style={{
            background: 'linear-gradient(160deg, #1a0000, #0d0000)',
          }}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <p
            className="text-red-900/70 text-xs tracking-[0.5em] uppercase text-center mb-3"
            style={{ fontFamily: 'Cinzel, serif' }}
          >
            The Impostor{impostors.length > 1 ? 's Were' : ' Was'}
          </p>
          <div className="flex flex-wrap gap-2 justify-center">
            {impostors.map((imp) => (
              <span
                key={imp.id}
                className="px-4 py-2 rounded border border-red-900/50 text-got-red-bright text-base"
                style={{ fontFamily: 'Cinzel, serif' }}
              >
                Player {imp.id}
              </span>
            ))}
          </div>
        </motion.div>

        {/* Player summary */}
        <motion.div
          className="w-full"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.65 }}
        >
          <div className="flex flex-wrap gap-2 justify-center">
            {players.map((p) => (
              <span
                key={p.id}
                className={[
                  'px-3 py-1 rounded text-sm border',
                  p.isImpostor
                    ? 'border-red-900/40 text-got-red-bright/70 bg-red-900/10'
                    : p.isEliminated
                    ? 'border-stone-800 text-stone-600 line-through'
                    : 'border-stone-700 text-stone-400',
                ].join(' ')}
                style={{ fontFamily: 'Cinzel, serif' }}
              >
                P{p.id}{p.isImpostor ? ' 🗡️' : ''}
              </span>
            ))}
          </div>
        </motion.div>

        {/* Decorative divider */}
        <div className="w-full flex items-center gap-4">
          <div className="flex-1 gold-divider" />
          <span className="text-got-gold text-lg">👑</span>
          <div className="flex-1 gold-divider" />
        </div>

        {/* Play Again */}
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={handlePlayAgain}
          className="w-full py-5 rounded border border-got-gold bg-got-gold/10 text-got-gold text-xl tracking-widest uppercase transition-all hover:bg-got-gold/20"
          style={{ fontFamily: 'Cinzel, serif' }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
        >
          Play Again
        </motion.button>
      </div>
    </PageWrapper>
  )
}
