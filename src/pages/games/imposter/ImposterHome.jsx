import { useNavigate } from 'react-router-dom'
import { useGameStore } from '../../../store/gameStore'
import { GameHomePage, GamePrimaryButton, GameBackLink } from '../../../components/GameHome'
import { GameHeroFor } from '../../../components/GameMark'

export default function ImposterHome() {
  const navigate = useNavigate()
  const resetGame = useGameStore((s) => s.resetGame)

  const handleNewGame = () => {
    resetGame()
    navigate('/games/imposter/settings')
  }

  return (
    <GameHomePage>
      <GameHeroFor
        id="imposter"
        description="One among you does not know the secret. Find the imposter before it's too late."
      />
      <GamePrimaryButton type="button" onClick={handleNewGame} className="mt-[52px]">
        New Game
      </GamePrimaryButton>
      <GameBackLink />
    </GameHomePage>
  )
}