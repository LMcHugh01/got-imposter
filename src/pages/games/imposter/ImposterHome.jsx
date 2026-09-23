import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useGameStore } from '../../../store/gameStore'
import { GameHomePage, GameHero, GamePrimaryButton, GameBackLink } from '../../../components/GameHome'

// Seven diamonds: three loyalists either side of the raised, outlined imposter.
const ORNAMENT = [0.35, 0.55, 0.8, 'imposter', 0.8, 0.55, 0.35]

export function ImposterOrnament() {
  return (
    <div className="flex items-end gap-3.5 h-[34px]">
      {ORNAMENT.map((o, i) =>
        o === 'imposter' ? (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.5, ease: 'easeOut' }}
            className="w-[15px] h-[15px] rotate-45 mx-1 mb-4"
            style={{ border: '1px solid #c9766a' }}
          />
        ) : (
          <motion.div
            key={i}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4, delay: 0.1 + Math.abs(i - 3) * 0.08 }}
            className="w-[9px] h-[9px] rotate-45"
            style={{ background: `rgba(216,184,120,${o})` }}
          />
        )
      )}
    </div>
  )
}

export default function ImposterHome() {
  const navigate = useNavigate()
  const resetGame = useGameStore((s) => s.resetGame)

  const handleNewGame = () => {
    resetGame()
    navigate('/games/imposter/settings')
  }

  return (
    <GameHomePage>
      <GameHero
        ornament={<ImposterOrnament />}
        eyebrow="Pass & Play · 2–20 Players"
        title="Imposter"
        tagline="Secret Word"
        description="One among you does not know the secret. Find the imposter before it's too late."
      />
      <GamePrimaryButton type="button" onClick={handleNewGame} className="mt-[52px]">
        New Game
      </GamePrimaryButton>
      <GameBackLink />
    </GameHomePage>
  )
}