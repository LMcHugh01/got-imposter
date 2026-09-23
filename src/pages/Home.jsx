import { useLocation } from 'react-router-dom'
import PageWrapper from '../components/PageWrapper'
import PageHeading from '../components/PageHeading'
import { Diamond, GARAMOND } from '../components/GameHome'
import { MenuList, SectionTitle } from '../components/MenuList'
import GameGrid from '../components/GameGrid'
import { EXPLORE } from '../data/games'

// Five diamonds with an outlined gold centre — the site's small mark.
function HomeOrnament() {
  return (
    <div className="flex items-center gap-3">
      <Diamond size={6} fill="rgba(216,184,120,.35)" />
      <Diamond size={8} fill="rgba(216,184,120,.6)" />
      <Diamond size={12} line="#d8b878" className="mx-1" />
      <Diamond size={8} fill="rgba(216,184,120,.6)" />
      <Diamond size={6} fill="rgba(216,184,120,.35)" />
    </div>
  )
}

/**
 * pages/Home.jsx
 *
 * The lobby: a compact heading, the archive (Characters, Houses), then
 * every game as a filterable grid.
 */
export default function Home() {
  const farewell = useLocation().state?.farewell
  return (
    <PageWrapper className="justify-start text-realm-ink">
      <PageHeading
        className="pt-4"
        ornament={<HomeOrnament />}
        eyebrow="Game of Thrones"
        title="Westerosi Games"
        subtitle="The world is yours to play."
      />

      {farewell && (
        <p role="status" className="mt-8 text-[18px] italic text-realm-gold text-center text-balance" style={GARAMOND}>
          Your account has been deleted. Farewell, and may the roads be kind.
        </p>
      )}

      <section className="w-full max-w-[760px] mx-auto mt-12">
        <SectionTitle>Explore Westeros</SectionTitle>
        <MenuList items={EXPLORE} marker="✦" />
      </section>

      <section className="w-full max-w-[1000px] mx-auto mt-20 pb-8">
        <SectionTitle>Games</SectionTitle>
        <GameGrid />
      </section>
    </PageWrapper>
  )
}