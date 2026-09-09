import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import PageWrapper from '../components/PageWrapper'
import GameCard from '../components/GameCard'

const GAMES = [
  { icon: '🎭', title: 'Imposter', description: "Find the imposter before it's too late.", to: '/games/imposter' },
  { icon: '⚔', title: 'Draft', description: 'Build your house. Conquer Westeros.', comingSoon: true },
  { icon: '🧠', title: 'Who Am I?', description: 'Identify the character from the clues.', comingSoon: true },
  { icon: '❓', title: 'Trivia', description: 'Test your knowledge of Westeros.', comingSoon: true },
]

const EXPLORE = [
  { icon: '📜', title: 'Characters', description: 'The people of Westeros.', comingSoon: true },
  { icon: '🏰', title: 'Houses', description: 'The great houses of the realm.', comingSoon: true },
]

export default function Home() {
  return (
    <PageWrapper className="justify-start">
      <div className="relative z-10 flex flex-col items-center gap-10 max-w-sm w-full">
        {/* Hero */}
        <div className="flex flex-col items-center gap-6 pt-4 text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            className="text-6xl select-none"
          >
            👑
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.15, ease: 'easeOut' }}
          >
            <h1
              className="text-3xl font-black tracking-widest uppercase text-got-gold leading-tight"
              style={{ fontFamily: 'Cinzel Decorative, serif' }}
            >
              Game of Thrones
            </h1>
            <div className="gold-divider my-3" />
            <p
              className="text-lg tracking-[0.2em] uppercase text-got-parchment/70"
              style={{ fontFamily: 'Cinzel, serif' }}
            >
              The World Is Yours To Play
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.35 }}
          >
            <Link
              to="/games/imposter"
              className="inline-block py-4 px-10 rounded border border-got-gold bg-got-gold/10 text-got-gold text-lg tracking-widest uppercase transition-all duration-200 hover:bg-got-gold/20 active:scale-[0.97]"
              style={{ fontFamily: 'Cinzel, serif' }}
            >
              Play Now
            </Link>
          </motion.div>
        </div>

        {/* Games */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="w-full flex flex-col gap-4"
        >
          <p
            className="text-got-gold/80 text-sm tracking-widest uppercase text-center"
            style={{ fontFamily: 'Cinzel, serif' }}
          >
            Games
          </p>
          <div className="flex flex-col gap-4">
            {GAMES.map((game) => (
              <GameCard key={game.title} {...game} />
            ))}
          </div>
        </motion.div>

        {/* Explore */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.65 }}
          className="w-full flex flex-col gap-4 pb-4"
        >
          <p
            className="text-got-gold/80 text-sm tracking-widest uppercase text-center"
            style={{ fontFamily: 'Cinzel, serif' }}
          >
            Explore Westeros
          </p>
          <div className="grid grid-cols-2 gap-4">
            {EXPLORE.map((item) => (
              <GameCard key={item.title} {...item} />
            ))}
          </div>
        </motion.div>
      </div>
    </PageWrapper>
  )
}
