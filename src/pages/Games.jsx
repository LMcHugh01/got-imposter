import PageWrapper from '../components/PageWrapper'
import GameCard from '../components/GameCard'
import { GiCrossedSwords, GiScrollQuill, GiSpy, GiQuillInk } from 'react-icons/gi'
import { FaMasksTheater } from "react-icons/fa6";

const GAMES = [
  { 
    icon: FaMasksTheater, 
    title: 'Imposter', 
    description: "A Game of Subterfuge.", 
    to: '/games/imposter' 
  },
  { 
    icon: GiCrossedSwords, 
    title: 'Campaign', 
    description: 'A Game of Strategy.', 
    to: '/games/campaign' 
  },
  { 
    icon: GiQuillInk, 
    title: 'Draft', 
    description: 'A Game of Counsel.', 
    to: '/games/draft' 
  },
  { 
    icon: GiSpy, 
    title: 'Whispers', 
    description: 'A Game of Deduction.', 
    comingSoon: true 
  },
  { 
    icon: GiScrollQuill, 
    title: 'Trivia', 
    description: 'A Game of Scholarship.', 
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
      <footer className="w-full text-center text-[10px] tracking-widest uppercase text-got-parchment z-10">
        <p style={{ fontFamily: 'Cinzel, serif' }}>
          &copy; {new Date().getFullYear()} DKG Development
        </p>
      </footer>
    </div>
  )
}