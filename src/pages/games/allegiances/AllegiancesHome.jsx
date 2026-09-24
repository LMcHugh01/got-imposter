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
import { MenuList } from '../../../components/MenuList'
import { loadAllegiances } from '../../../lib/allegiancesStorage'
import RecordPrompt from '../../../components/RecordPrompt'
import { ASSEMBLIES, PATIENCE } from '../../../data/allegiances'
import { GameHeroFor } from '../../../components/GameMark'

const STEPS = [
  'Sixteen names share four hidden bonds: a house, a place, a cause, a fate.',
  'Choose four you believe belong together and present them to the court.',
  `A wrong four costs patience. Lose it ${PATIENCE} times and the court rises.`,
  'Three of the right four earns a warning that one name belongs elsewhere.',
]
const ROMAN = ['I', 'II', 'III', 'IV']

function assemblyStatus(round) {
  if (!round) return 'Not yet attended.'
  if (round.status === 'won') return round.mistakes === 0 ? 'Cleared without error.' : 'Cleared.'
  if (round.status === 'lost') return 'The court rose early.'
  if (round.solved.length || round.mistakes) return `In session · ${round.solved.length} of 4 bonds found.`
  return 'Not yet attended.'
}

export default function AllegiancesHome() {
  const navigate = useNavigate()
  const [saved, setSaved] = useState(null)

  useEffect(() => {
    setSaved(loadAllegiances())
  }, [])

  // "Enter the Court" goes to the first assembly that isn't finished yet.
  const next =
    ASSEMBLIES.find((a) => {
      const r = saved?.rounds?.[a.id]
      return !r || r.status === 'playing'
    }) ?? ASSEMBLIES[0]

  return (
    <GameHomePage>
      <GameHeroFor
        id="allegiances"
        description="Sixteen names, four bonds between them. Find the four who belong together before the court loses patience."
      />

      <GamePrimaryButton type="button" onClick={() => navigate(`/games/allegiances/${next.id}`)} className="mt-[52px]">
        Enter the Court
      </GamePrimaryButton>

      {saved && (
        <GameStats
          className="mt-14"
          items={[
            { label: 'Solved', value: saved.stats.solved },
            { label: 'Played', value: saved.stats.played },
          ]}
        />
      )}

      <RecordPrompt className="mt-8" />

      <Hairline className="max-w-[560px] mt-16" />

      <SectionLabel className="mt-12 tracking-[0.42em] indent-[0.42em]">The Assemblies</SectionLabel>
      <div className="w-full max-w-[560px] mt-6 text-left">
        <MenuList
          items={ASSEMBLIES.map((a) => ({
            title: a.name,
            description: assemblyStatus(saved?.rounds?.[a.id]),
            to: `/games/allegiances/${a.id}`,
          }))}
        />
      </div>

      <SectionLabel className="mt-16 tracking-[0.42em] indent-[0.42em]">How It Works</SectionLabel>
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