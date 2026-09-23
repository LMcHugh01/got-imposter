import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  GameHomePage,
  GameHero,
  GamePrimaryButton,
  GameBackLink,
  Diamond,
  Hairline,
  SectionLabel,
  CINZEL,
  GARAMOND,
  FOCUS,
} from '../../../components/GameHome'
import { loadRavensGame, clearRavensGame } from '../../../lib/ravensStorage'

// A lit candle between the rival houses' embers.
export function Candle() {
  const wick = { background: 'linear-gradient(180deg, transparent, #d8b878)' }
  return (
    <div className="flex items-center gap-4 h-[34px]">
      <Diamond size={8} line="#c9766a" />
      <Diamond size={8} line="#c9766a" />
      <div className="w-px h-[30px]" style={wick} />
      <Diamond size={15} fill="#d8b878" />
      <div className="w-px h-[30px]" style={wick} />
      <Diamond size={8} line="#c9766a" />
      <Diamond size={8} line="#c9766a" />
    </div>
  )
}

const STEPS = [
  'Split into two to four houses. On each turn, one player from the house holds the phone and describes.',
  'Their house guesses as many names as they can before the candle burns out.',
  'The rivals watch the five forbidden words, and no part of the name itself may be spoken.',
  'Got It earns a point. Lost It costs one: a pass, a forbidden word, or a rival calling the answer first.',
  'For a harder game, turn on Three Words Only: every clue must be three words or fewer.',
]
const ROMAN = ['I', 'II', 'III', 'IV', 'V']

export default function RavensHome() {
  const navigate = useNavigate()
  const [inProgress, setInProgress] = useState(false)

  useEffect(() => {
    const g = loadRavensGame()
    setInProgress(Boolean(g && g.phase !== 'final'))
  }, [])

  return (
    <GameHomePage>
      <GameHero
        ornament={<Candle />}
        eyebrow="Pass & Play · 4–20 Players"
        title="Ravens"
        tagline="A Game of Words"
        description="Send your message before the candle burns out. Describe the name, but never speak the forbidden words."
      />

      {inProgress ? (
        <div className="flex flex-col items-center mt-[52px]">
          <GamePrimaryButton type="button" onClick={() => navigate('/games/ravens/play')}>
            Resume Game
          </GamePrimaryButton>
          <button
            type="button"
            onClick={() => {
              clearRavensGame()
              navigate('/games/ravens/play?new')
            }}
            className={`mt-3.5 p-3 text-[11px] uppercase tracking-[0.3em] text-realm-gold hover:text-realm-cream transition-colors cursor-pointer ${FOCUS}`}
            style={CINZEL}
          >
            Start a New Game
          </button>
        </div>
      ) : (
        <GamePrimaryButton type="button" onClick={() => navigate('/games/ravens/play?new')} className="mt-[52px]">
          New Game
        </GamePrimaryButton>
      )}

      <Hairline className="max-w-[560px] mt-[72px]" />

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