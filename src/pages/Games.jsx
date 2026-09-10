import PageWrapper from '../components/PageWrapper'
import GameCard from '../components/GameCard'

const GAMES = [
  { icon: '🎭', title: 'Imposter', description: "Find the imposter before it's too late.", to: '/games/imposter' },
  { icon: '⚔', title: 'Draft', description: 'Build your house. Conquer Westeros.', to: '/games/draft' },
  { icon: '🧠', title: 'Who Am I?', description: 'Identify the character from the clues.', comingSoon: true },
  { icon: '❓', title: 'Trivia', description: 'Test your knowledge of Westeros.', comingSoon: true },
]

export default function Games() {
  return (
    <PageWrapper className="justify-start">
      <div className="w-full max-w-sm flex flex-col gap-8">
        <div className="text-center pt-4">
          <h1
            className="text-3xl font-bold tracking-widest uppercase text-got-gold"
            style={{ fontFamily: 'Cinzel, serif' }}
          >
            Games
          </h1>
          <div className="gold-divider mt-3" />
        </div>

        <div className="flex flex-col gap-4">
          {GAMES.map((game) => (
            <GameCard key={game.title} {...game} />
          ))}
        </div>
      </div>
    </PageWrapper>
  )
}