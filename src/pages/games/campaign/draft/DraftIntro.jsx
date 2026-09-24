import HouseNameIntro from '../../../../components/HouseNameIntro'

/**
 * pages/games/campaign/draft/DraftIntro.jsx
 *
 * The Campaign game's start screen: name your house, then begin. Its mark,
 * name, tagline and motto come from data/games.js.
 */
export default function DraftIntro({ onPlay }) {
  return (
    <HouseNameIntro
      gameId="campaign"
      description="Draft your council, then lead your house through eight battles. Lose too many and your banners fall."
      cta="Begin Campaign"
      onPlay={onPlay}
    />
  )
}