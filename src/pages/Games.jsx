import PageWrapper from '../components/PageWrapper'
import GameCard from '../components/GameCard'
import { GiCrossedSwords, GiScrollQuill, GiExecutionerHood, GiQuillInk } from 'react-icons/gi'
import { FaMasksTheater } from "react-icons/fa6";

const GAMES = [
  { 
    icon: FaMasksTheater, 
    title: 'Imposter', 
    description: "Find the imposter before it's too late.", 
    to: '/games/imposter' 
  },
  { 
    icon: GiCrossedSwords, 
    title: 'Campaign', 
    description: 'Build your house. Conquer Westeros.', 
    to: '/games/campaign' 
  },
  { 
    icon: GiQuillInk, 
    title: 'Draft', 
    description: 'Draft the highest-rated council you can.', 
    to: '/games/draft' 
  },
  { 
    icon: GiExecutionerHood, 
    title: 'Who Am I?', 
    description: 'Identify the character from the clues.', 
    comingSoon: true 
  },
  { 
    icon: GiScrollQuill, 
    title: 'Trivia', 
    description: 'Test your knowledge of Westeros.', 
    comingSoon: true 
  },
]

export default function Games() {
  return (
    /* bg-got-black applies your top-center ambient gold radial glow overlay */
    <div className="bg-got-black min-h-screen text-got-parchment flex flex-col justify-between overflow-x-hidden">
      <PageWrapper className="justify-start pt-12 pb-16 flex-grow z-10">
        <div className="w-full max-w-xl flex flex-col gap-8 mx-auto px-4">
          
          {/* Header Block with House Branding */}
          <div className="text-center pt-4">
            <span 
              className="text-[10px] uppercase tracking-[0.4em] text-got-gold/50 block mb-1"
              style={{ fontFamily: 'Cinzel, serif' }}
            >
              GAME OF THRONES
            </span>
            <h1
                className="text-4xl md:text-5xl font-black tracking-[0.2em] uppercase text-got-gold leading-tight drop-shadow-md"
                style={{ fontFamily: 'Cinzel Decorative, serif' }}
              >
              Westerosi Games
            </h1>
            <div className="gold-divider mt-4 h-[1px] w-24 mx-auto bg-gradient-to-r from-transparent via-got-gold/40 to-transparent" />
          </div>

          {/* Grid Layout Container replacing the narrow single column list */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
            {GAMES.map((game) => (
              <GameCard key={game.title} {...game} />
            ))}
          </div>

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