import PageWrapper from '../components/PageWrapper'
import PageHeading from '../components/PageHeading'
import GameGrid from '../components/GameGrid'

/**
 * pages/Games.jsx
 *
 * The games lobby: a compact heading, then the filterable grid.
 */
export default function Games() {
  return (
    <PageWrapper className="justify-start text-realm-ink">
      <PageHeading
        className="pt-4"
        eyebrow="Game of Thrones"
        title="Games"
        subtitle="Choose a game and gather your players."
      />

      <div className="w-full max-w-[1000px] mx-auto mt-10 pb-8">
        <GameGrid />
      </div>
    </PageWrapper>
  )
}