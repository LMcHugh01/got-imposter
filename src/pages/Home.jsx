import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useGameStore } from '../store/gameStore'
import PageWrapper from '../components/PageWrapper'

export default function Home() {
  const navigate = useNavigate()
  const resetGame = useGameStore((s) => s.resetGame)

  const handleNewGame = () => {
    resetGame()
    navigate('/settings')
  }

  return (
    <PageWrapper className="justify-center">
      {/* Background texture */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse at center top, rgba(139,26,26,0.08) 0%, transparent 60%), radial-gradient(ellipse at center bottom, rgba(201,168,76,0.04) 0%, transparent 60%)',
        }}
      />

      <div className="relative z-10 flex flex-col items-center gap-8 max-w-sm w-full">
        {/* Crown icon */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className="text-7xl select-none"
        >
          👑
        </motion.div>

        {/* Title */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.15, ease: 'easeOut' }}
          className="text-center"
        >
          <h1
            className="text-4xl font-black tracking-widest uppercase text-got-gold leading-tight"
            style={{ fontFamily: 'Cinzel Decorative, serif' }}
          >
            Game of
          </h1>
          <h1
            className="text-4xl font-black tracking-widest uppercase text-got-gold leading-tight"
            style={{ fontFamily: 'Cinzel Decorative, serif' }}
          >
            Thrones
          </h1>
          <div className="gold-divider my-3" />
          <p
            className="text-xl tracking-[0.3em] uppercase text-got-parchment/70"
            style={{ fontFamily: 'Cinzel, serif' }}
          >
            Secret Word
          </p>
        </motion.div>

        {/* Tagline */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="text-center text-got-parchment/50 text-lg italic leading-relaxed"
          style={{ fontFamily: 'EB Garamond, serif' }}
        >
          One among you does not know the secret. Find the impostor before it's too late.
        </motion.p>

        {/* Decorative separator */}
        <motion.div
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="w-full flex items-center gap-4"
        >
          <div className="flex-1 gold-divider" />
          <span className="text-got-gold text-lg">⚔</span>
          <div className="flex-1 gold-divider" />
        </motion.div>

        {/* New Game Button */}
        <motion.button
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.5 }}
          whileTap={{ scale: 0.97 }}
          onClick={handleNewGame}
          className="w-full py-5 rounded border border-got-gold bg-got-gold/10 text-got-gold text-xl tracking-widest uppercase transition-all duration-200 hover:bg-got-gold/20 active:scale-[0.97]"
          style={{ fontFamily: 'Cinzel, serif' }}
        >
          New Game
        </motion.button>

        {/* Footer */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="text-got-parchment/20 text-sm text-center"
          style={{ fontFamily: 'Cinzel, serif' }}
        >
          Pass & Play · 2–20 Players
        </motion.p>
      </div>
    </PageWrapper>
  )
}
