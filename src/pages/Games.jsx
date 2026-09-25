import PageWrapper from '../components/PageWrapper'
import GameGrid from '../components/GameGrid'
import { CINZEL, GARAMOND } from '../components/GameHome'

/**
 * pages/Games.jsx
 *
 * The games lobby: a centred heading, then the filterable grid of games.
 */
export default function Games() {
  return (
    <PageWrapper className="justify-start text-realm-ink">
      <header className="w-full flex flex-col items-center text-center pt-4">
        <div className="text-[10px] uppercase tracking-[0.46em] text-realm-muted" style={CINZEL}>
          Game of Thrones
        </div>
        <div className="mt-2 flex items-center gap-5">
          <span aria-hidden="true" className="w-12 sm:w-20 h-px" style={{ background: 'linear-gradient(90deg, transparent, rgba(216,184,120,.5))' }} />
          <h1 className="leading-none font-medium text-realm-cream" style={{ ...CINZEL, fontSize: 'clamp(32px, 5vw, 42px)', letterSpacing: '.1em' }}>
            Games
          </h1>
          <span aria-hidden="true" className="w-12 sm:w-20 h-px" style={{ background: 'linear-gradient(90deg, rgba(216,184,120,.5), transparent)' }} />
        </div>
        <p className="mt-3 text-[18px] italic text-realm-body" style={GARAMOND}>
          Choose a game and gather your players.
        </p>
      </header>

      <div className="w-full max-w-[1120px] mx-auto mt-9 pb-8">
        <GameGrid />
      </div>
    </PageWrapper>
  )
}