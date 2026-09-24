import HouseNameIntro from '../../../components/HouseNameIntro'

/**
 * pages/games/draft/DraftIntro.jsx
 *
 * The standalone Draft game's start screen: name your house, then play.
 * Its mark, name, tagline and motto come from data/games.js.
 */
export default function DraftIntro({ onPlay }) {
  return (
    <HouseNameIntro
      gameId="draft"
      description="Ten seats await a ruler. Build the council with the highest average rating you can."
      cta="Play Now"
      onPlay={onPlay}
    />
  )
}