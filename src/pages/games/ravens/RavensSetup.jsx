import { useState } from 'react'
import {
  DiamondChoice,
  ToggleRow,
  Sigil,
  SectionLabel,
  Hairline,
  GamePrimaryButton,
  CINZEL,
  GARAMOND,
  FOCUS,
} from '../../../components/GameHome'
import { DIFFICULTIES, normalizeDifficulties, difficultyLabels } from '../../../data/imposterOptions'
import { CANDLE_OPTIONS, ROUND_OPTIONS, MIN_TEAMS, MAX_TEAMS } from '../../../data/ravens'

/**
 * Choose the houses (2–4, in playing order), the candle, the rounds, the
 * card difficulty and the two optional rules.
 */
export default function RavensSetup({ houses, initial, onStart, starting, error }) {
  const [s, setS] = useState(initial)
  const set = (patch) => setS((prev) => ({ ...prev, ...patch }))

  const toggleHouse = (slug) => {
    if (s.teams.includes(slug)) {
      if (s.teams.length > MIN_TEAMS) set({ teams: s.teams.filter((t) => t !== slug) })
    } else if (s.teams.length < MAX_TEAMS) {
      set({ teams: [...s.teams, slug] })
    }
  }

  const toggleDifficulty = (id) => {
    const on = s.difficulties.includes(id)
    if (on && s.difficulties.length === 1) return
    set({
      difficulties: on ? s.difficulties.filter((d) => d !== id) : normalizeDifficulties([...s.difficulties, id]),
    })
  }

  const bySlug = Object.fromEntries(houses.map((h) => [h.slug, h]))
  const summary = [
    s.teams.map((t) => bySlug[t]?.name.replace(/^House /, '')).join(' · '),
    `${s.seconds} sec candle`,
    `${s.rounds} ${s.rounds === 1 ? 'round' : 'rounds'}`,
    difficultyLabels(s.difficulties).join(' + '),
  ].join(' · ')

  return (
    <div className="flex flex-col items-center text-center">
      <div className="text-[11px] uppercase tracking-[0.5em] indent-[0.5em] text-realm-muted" style={CINZEL}>
        Ravens · A Game of Speed
      </div>
      <h1
        className="mt-4 font-normal tracking-[0.2em] indent-[0.2em] text-realm-cream"
        style={{ ...CINZEL, fontSize: 'clamp(34px, 5vw, 52px)' }}
      >
        Game Setup
      </h1>

      {/* Houses */}
      <SectionLabel className="mt-12">Choose Your Houses</SectionLabel>
      <div className="text-[15px] italic text-realm-dim mt-2" style={GARAMOND}>
        Two to four, in the order they will play
      </div>
      <ul className="grid grid-cols-2 sm:grid-cols-4 gap-px w-full max-w-[640px] mt-5 bg-realm-gold/15">
        {houses.map((h) => {
          const order = s.teams.indexOf(h.slug)
          const on = order >= 0
          const full = !on && s.teams.length >= MAX_TEAMS
          return (
            <li key={h.slug} className="bg-realm-bg">
              <button
                type="button"
                role="checkbox"
                aria-checked={on}
                aria-disabled={full}
                onClick={() => toggleHouse(h.slug)}
                className={[
                  'relative w-full flex flex-col items-center gap-2.5 px-2 pt-5 pb-4 transition-colors duration-200',
                  on ? 'bg-realm-gold/10' : full ? 'opacity-40 cursor-default' : 'hover:bg-realm-gold/5 cursor-pointer',
                  FOCUS,
                ].join(' ')}
              >
                {on && (
                  <span
                    className="absolute top-2 right-2.5 text-[11px] tracking-[0.1em] text-realm-gold"
                    style={CINZEL}
                    aria-label={`plays ${order + 1}`}
                  >
                    {['I', 'II', 'III', 'IV'][order]}
                  </span>
                )}
                <span className={on ? '' : 'opacity-70'}>
                  <Sigil house={h} size={44} />
                </span>
                <span
                  className={`text-[12px] sm:text-[13px] uppercase tracking-[0.14em] ${on ? 'text-realm-gold' : 'text-realm-note'}`}
                  style={CINZEL}
                >
                  {h.name.replace(/^House /, '')}
                </span>
              </button>
            </li>
          )
        })}
      </ul>

      <Hairline className="mt-12" />

      {/* Candle and rounds */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-10 w-full mt-10">
        <div>
          <SectionLabel>Candle</SectionLabel>
          <div className="flex justify-center gap-8 sm:gap-10 mt-4" role="radiogroup" aria-label="Candle">
            {CANDLE_OPTIONS.map((sec) => (
              <DiamondChoice key={sec} on={s.seconds === sec} onClick={() => set({ seconds: sec })}>
                {sec} sec
              </DiamondChoice>
            ))}
          </div>
        </div>
        <div>
          <SectionLabel>Rounds</SectionLabel>
          <div className="flex justify-center gap-6 sm:gap-8 mt-4" role="radiogroup" aria-label="Rounds">
            {ROUND_OPTIONS.map((r) => (
              <DiamondChoice key={r} on={s.rounds === r} onClick={() => set({ rounds: r })}>
                {r}
              </DiamondChoice>
            ))}
          </div>
        </div>
      </div>

      {/* Difficulty */}
      <SectionLabel className="mt-12">Cards</SectionLabel>
      <div className="text-[15px] italic text-realm-dim mt-2" style={GARAMOND}>
        Pick one or more
      </div>
      <div className="flex flex-wrap justify-center gap-x-10 gap-y-2 mt-3" role="group" aria-label="Difficulty">
        {DIFFICULTIES.map((d) => (
          <DiamondChoice key={d.id} multi on={s.difficulties.includes(d.id)} onClick={() => toggleDifficulty(d.id)}>
            {d.label}
          </DiamondChoice>
        ))}
      </div>

      {/* Rules */}
      <SectionLabel className="mt-12">Rules</SectionLabel>
      <div className="w-full max-w-[480px] mt-3">
        <ToggleRow
          on={s.stealing}
          onClick={() => set({ stealing: !s.stealing })}
          label="Rivals can steal"
          detail="If a rival calls the answer first, the card is lost."
        />
        <ToggleRow
          on={s.threeWords}
          onClick={() => set({ threeWords: !s.threeWords })}
          label="Three Words Only"
          detail="Each clue may be no more than three words."
        />
      </div>

      {error && (
        <p className="mt-10 text-[17px] text-realm-rose" style={GARAMOND}>
          {error}
        </p>
      )}

      <GamePrimaryButton type="button" className="mt-12" disabled={starting} onClick={() => onStart(s)}>
        {starting ? 'Gathering Ravens…' : 'Start Game'}
      </GamePrimaryButton>
      <div className="text-[17px] italic text-realm-muted mt-[18px] text-balance max-w-[40ch]" style={GARAMOND}>
        {summary}
      </div>
    </div>
  )
}