import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  GameHomePage,
  GamePrimaryButton,
  GameBackLink,
  GameStats,
  Hairline,
  SectionLabel,
  CINZEL,
  GARAMOND,
} from '../../../components/GameHome'
import { loadWhispers } from '../../../lib/whispersStorage'
import RecordPrompt from '../../../components/RecordPrompt'
import { CLOSE_BAND } from '../../../data/whispers'
import { GameHeroFor } from '../../../components/GameMark'

const STEPS = [
  'Name any character from the realm.',
  'Each name is measured against theirs across six standings, their house, their region and how they fight.',
  `Arrows point towards their score. An underline means you are within ${CLOSE_BAND} points; a bright gold underline is an exact match.`,
  'From your second guess, a little bird whispers a hint.',
  'Solve it and your streak grows. Run out of guesses and it starts again.',
]
const ROMAN = ['I', 'II', 'III', 'IV', 'V']

export default function WhispersHome() {
  const navigate = useNavigate()
  const [stats, setStats] = useState(null)

  useEffect(() => {
    setStats(loadWhispers().stats)
  }, [])

  return (
    <GameHomePage>
      <GameHeroFor
        id="whispers"
        description="Your little birds have a name they will not say. Six guesses to draw it out of them."
      />

      <GamePrimaryButton type="button" onClick={() => navigate('/games/whispers/play')} className="mt-[52px]">
        Play Now
      </GamePrimaryButton>

      {stats && (
        <GameStats
          className="mt-14"
          items={[
            { label: 'Streak', value: stats.streak },
            { label: 'Best', value: stats.best },
            { label: 'Solved', value: stats.solved },
          ]}
        />
      )}

      <RecordPrompt className="mt-8" />

      <Hairline className="max-w-[560px] mt-16" />

      <SectionLabel className="mt-12 tracking-[0.42em] indent-[0.42em]">How It Works</SectionLabel>
      <ol className="flex flex-col gap-[22px] max-w-[480px] mt-7 text-left">
        {STEPS.map((step, i) => (
          <li key={i} className="grid grid-cols-[40px_minmax(0,1fr)] gap-3.5 items-baseline">
            <span className="text-[14px] text-realm-gold" style={CINZEL} aria-hidden="true">
              {ROMAN[i]}
            </span>
            <span className="text-[19px] leading-normal text-realm-body" style={GARAMOND}>
              {step}
            </span>
          </li>
        ))}
      </ol>

      <div className="mt-14">
        <GameBackLink />
      </div>
    </GameHomePage>
  )
}