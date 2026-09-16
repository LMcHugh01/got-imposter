import { motion } from 'framer-motion'
import PageWrapper from '../components/PageWrapper'
import GameCard from '../components/GameCard'
import { FaMasksTheater, FaCrown } from "react-icons/fa6";
import { 
  GiCrossedSwords, 
  GiSpy,
  GiScrollUnfurled, 
  GiScrollQuill,
  GiQuillInk, 
  GiCastle 
} from 'react-icons/gi'

export default function Home() {
  return (
    /* bg-got-black loads your top-center golden ambient radial glow overlay */
    <div className="bg-got-black min-h-screen text-got-parchment flex flex-col justify-between overflow-x-hidden selection:bg-got-gold/30 selection:text-white">
      
      <PageWrapper className="justify-start pt-12 pb-16 flex-grow z-10">
        <div className="relative z-10 flex flex-col items-center gap-12 max-w-2xl w-full mx-auto px-4">
          
          {/* Hero Header */}
          <div className="flex flex-col items-center gap-4 pt-4 text-center">
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
              className="text-4xl text-got-gold select-none filter drop-shadow-[0_0_12px_rgba(201,168,76,0.3)]"
            >
              <FaCrown />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.15, ease: 'easeOut' }}
            >
              <h1
                className="text-4xl md:text-5xl font-black tracking-[0.2em] uppercase text-got-gold leading-tight drop-shadow-md"
                style={{ fontFamily: 'Cinzel Decorative, serif' }}
              >
                Westerosi Games
              </h1>
              <div className="gold-divider my-4 h-[1px] w-32 mx-auto bg-gradient-to-r from-transparent via-got-gold/40 to-transparent" />
              <p
                className="text-xs md:text-sm tracking-[0.3em] uppercase text-got-parchment/60 font-medium"
                style={{ fontFamily: 'Cinzel, serif' }}
              >
                The World Is Yours To Play
              </p>
            </motion.div>
          </div>

          {/* Games Category Container */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="w-full flex flex-col gap-5"
          >
            <p
              className="text-got-gold/70 text-xs tracking-[0.25em] uppercase text-center font-bold"
              style={{ fontFamily: 'Cinzel, serif' }}
            >
              Games
            </p>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 w-full">
              <GameCard 
                icon={FaMasksTheater} 
                title="Imposter" 
                description="Find the imposter before it's too late." 
                to="/games/imposter" 
              />
              <GameCard 
                icon={GiCrossedSwords} 
                title="Campaign" 
                description="Build your house. Conquer Westeros." 
                to="/games/campaign" 
              />
              <GameCard 
                icon={GiScrollQuill} 
                title="Draft" 
                description="Draft the highest-rated council you can." 
                to="/games/draft" 
              />
              <GameCard 
                icon={GiSpy} 
                title="Who Am I?" 
                description="Identify the character from the clues." 
                comingSoon={true} 
              />
              <GameCard 
                icon={GiScrollUnfurled} 
                title="Trivia" 
                description="Test your knowledge of Westeros." 
                comingSoon={true} 
              />
            </div>
          </motion.div>

          {/* Explore Category Container */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.45 }}
            className="w-full flex flex-col gap-5 pb-4"
          >
            <p
              className="text-got-gold/70 text-xs tracking-[0.25em] uppercase text-center font-bold"
              style={{ fontFamily: 'Cinzel, serif' }}
            >
              Explore Westeros
            </p>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 w-full">
              <GameCard 
                icon={GiQuillInk} 
                title="Characters" 
                description="The people of Westeros." 
                comingSoon={false} 
                to="/characters" 
              />
              <GameCard 
                icon={GiCastle} 
                title="Houses" 
                description="The great houses of the realm." 
                comingSoon={true} 
              />
            </div>
          </motion.div>

        </div>
      </PageWrapper>

      {/* Subtle Immersive Footer */}
      <footer className="w-full text-center py-6 text-[10px] tracking-widest uppercase text-got-stone border-t border-stone-900/40 bg-black/10 z-10">
        <p style={{ fontFamily: 'Cinzel, serif' }}>
          &copy; {new Date().getFullYear()} DKG Development
        </p>
      </footer>
    </div>
  )
}