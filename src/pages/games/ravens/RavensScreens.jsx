import { useEffect, useRef } from 'react'
import { Diamond, Sigil, GamePrimaryButton, CINZEL, GARAMOND, FOCUS } from '../../../components/GameHome'
import { KIND_LABELS, RESULTS } from '../../../data/ravens'
import { logScore, nextResult } from '../../../gameEngine/ravens'

const ROMAN = ['I', 'II', 'III', 'IV']
const signed = (n) => (n > 0 ? `+${n}` : n < 0 ? `−${Math.abs(n)}` : '0')
const shortName = (house) => house?.name.replace(/^House /, '') ?? ''

function Flanked({ children, tone = 'gold' }) {
  const color = tone === 'ember' ? 'rgba(201,118,106,.6)' : 'rgba(216,184,120,.6)'
  return (
    <div className="flex items-center justify-center gap-[18px]">
      <div className="w-10 sm:w-14 h-px" style={{ background: `linear-gradient(90deg, transparent, ${color})` }} />
      {children}
      <div className="w-10 sm:w-14 h-px" style={{ background: `linear-gradient(270deg, transparent, ${color})` }} />
    </div>
  )
}

function Scoreboard({ teams, totals, current }) {
  return (
    <dl className="flex flex-wrap justify-center gap-x-10 gap-y-4">
      {teams.map((house, i) => (
        <div key={house.slug} className="flex flex-col-reverse items-center gap-1.5">
          <dd className="text-[26px] leading-none text-realm-cream tabular-nums" style={CINZEL}>
            {totals[i]}
          </dd>
          <dt
            className={`text-[11px] uppercase tracking-[0.2em] ${i === current ? 'text-realm-gold' : 'text-realm-muted'}`}
            style={CINZEL}
          >
            {shortName(house)}
          </dt>
        </div>
      ))}
    </dl>
  )
}

/* ------------------------------------------------------------------ */

export function ReadyScreen({ game, teams, totals, onLight }) {
  const house = teams[game.teamIndex]
  return (
    <div className="flex flex-col items-center text-center pt-6 animate-[riseIn_.35s_ease_both]">
      <div className="text-[11px] uppercase tracking-[0.5em] indent-[0.5em] text-realm-muted" style={CINZEL}>
        Pass the Phone To
      </div>
      <div className="mt-7">
        <Sigil house={house} size={64} />
      </div>
      <h1
        className="mt-5 font-normal leading-[1.05] tracking-[0.12em] indent-[0.12em] text-realm-cream text-balance"
        style={{ ...CINZEL, fontSize: 'clamp(36px, 7vw, 72px)' }}
      >
        {house.name}
      </h1>
      <div className="mt-6">
        <Flanked>
          <div
            className="text-[12px] sm:text-[13px] uppercase tracking-[0.4em] indent-[0.4em] text-realm-gold"
            style={CINZEL}
          >
            Round {game.round} of {game.settings.rounds}
          </div>
        </Flanked>
      </div>
      <p
        className="mt-7 mx-auto max-w-[34ch] text-[20px] leading-normal italic text-realm-body text-balance"
        style={GARAMOND}
      >
        Choose one of you to describe. The rest of the house guesses; the rivals watch every word.
      </p>
      <GamePrimaryButton type="button" onClick={onLight} className="mt-10">
        Light the Candle
      </GamePrimaryButton>
      <div className="mt-14">
        <Scoreboard teams={teams} totals={totals} current={game.teamIndex} />
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */

function CardImage({ card }) {
  if (!card.imageUrl) return null
  return card.imageKind === 'portrait' ? (
    <img src={card.imageUrl} alt="" className="w-[76px] h-[96px] object-cover mb-5 border border-realm-gold/25" />
  ) : (
    <img src={card.imageUrl} alt="" className="w-16 h-16 object-contain mb-5" />
  )
}

export function TurnScreen({ game, house, card, secondsLeft, onMark }) {
  const { seconds, stealing, threeWords } = game.settings
  const low = secondsLeft <= 10
  const turnScore = logScore(game.log)
  const lostCovers = ['Pass', 'Forbidden', ...(stealing ? ['Stolen'] : [])].join(' · ')

  return (
    <div className="flex flex-col items-center text-center min-h-[calc(100svh-140px)]">
      <div className="flex items-baseline justify-between w-full">
        <div className="text-[12px] uppercase tracking-[0.24em] text-realm-gold" style={CINZEL}>
          {house.name}
        </div>
        <div className="text-[12px] uppercase tracking-[0.24em] text-realm-muted whitespace-nowrap" style={CINZEL}>
          Turn · {signed(turnScore)}
        </div>
      </div>

      {/* The candle */}
      <div className="flex flex-col items-center mt-7" role="timer" aria-live={low ? 'polite' : 'off'}>
        <div
          className={`leading-none tabular-nums transition-colors ${low ? 'text-realm-rose' : 'text-realm-cream'}`}
          style={{ ...CINZEL, fontSize: 'clamp(44px, 9vw, 64px)' }}
        >
          {secondsLeft}
        </div>
        <div className="relative w-[min(420px,80vw)] h-px bg-realm-gold/15 mt-4">
          <div
            className={`absolute left-0 top-0 h-px transition-[width] duration-200 ease-linear ${low ? 'bg-realm-rose' : 'bg-realm-gold'}`}
            style={{ width: `${(secondsLeft / seconds) * 100}%` }}
          />
        </div>
      </div>

      {/* The card */}
      <div key={card.id} className="flex flex-col items-center mt-10 animate-[riseIn_.25s_ease_both]">
        <CardImage card={card} />
        <div className="text-[11px] uppercase tracking-[0.44em] indent-[0.44em] text-realm-muted" style={CINZEL}>
          Describe · {KIND_LABELS[card.kind] ?? 'Card'}
        </div>
        <h2
          className="mt-3.5 font-normal leading-[1.1] tracking-[0.06em] text-realm-cream text-balance"
          style={{ ...CINZEL, fontSize: 'clamp(30px, 7vw, 60px)' }}
        >
          {card.answer}
        </h2>
        <div className="mt-8">
          <Flanked tone="ember">
            <div className="text-[11px] uppercase tracking-[0.4em] indent-[0.4em] text-realm-ember" style={CINZEL}>
              Do Not Say
            </div>
          </Flanked>
        </div>
        <ul className="flex flex-wrap justify-center gap-x-6 gap-y-1 mt-4 max-w-[520px]">
          {card.forbidden.map((w) => (
            <li key={w} className="text-[23px] sm:text-[26px] italic text-[#e0a597]" style={GARAMOND}>
              {w}
            </li>
          ))}
        </ul>
        {threeWords && (
          <div className="mt-4 text-[10px] uppercase tracking-[0.34em] text-realm-gold" style={CINZEL}>
            Three words per clue
          </div>
        )}
      </div>

      <div className="flex-1 min-h-10" />

      {/* Two equal buttons, far enough apart that a hurried thumb can't hit the wrong one. */}
      <div className="grid grid-cols-2 gap-3 w-full max-w-[460px]">
        <button
          type="button"
          onClick={() => onMark('lost')}
          className={`flex flex-col items-center justify-center gap-1.5 min-h-[112px] px-2 border border-realm-ember/60 text-realm-rose hover:bg-realm-ember/10 active:translate-y-px cursor-pointer transition-colors ${FOCUS}`}
          style={CINZEL}
        >
          <span className="text-[16px] sm:text-[17px] font-semibold uppercase tracking-[0.2em] sm:tracking-[0.28em]">
            Lost It <span className="tracking-[0.05em]">−1</span>
          </span>
          <span className="text-[9px] sm:text-[10px] uppercase tracking-[0.06em] sm:tracking-[0.16em] whitespace-nowrap text-realm-rose/75">{lostCovers}</span>
        </button>
        <button
          type="button"
          onClick={() => onMark('got')}
          className={`flex flex-col items-center justify-center gap-1.5 min-h-[112px] px-2 border border-realm-gold bg-realm-gold text-realm-bg hover:bg-realm-gold-hover active:translate-y-px cursor-pointer transition-colors ${FOCUS}`}
          style={CINZEL}
        >
          <span className="text-[16px] sm:text-[17px] font-semibold uppercase tracking-[0.2em] sm:tracking-[0.28em]">
            Got It <span className="tracking-[0.05em]">+1</span>
          </span>
          <span className="text-[9px] sm:text-[10px] uppercase tracking-[0.06em] sm:tracking-[0.16em] text-realm-bg/70">Guessed</span>
        </button>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */

export function ReviewScreen({ game, house, cardsById, isLast, nextHouse, onCorrect, onNext }) {
  const turnScore = logScore(game.log)
  const nextRef = useRef(null)
  useEffect(() => nextRef.current?.focus(), [])

  return (
    <div className="flex flex-col items-center text-center max-w-[620px] mx-auto pt-4 animate-[riseIn_.35s_ease_both]">
      <Diamond size={15} line="#c9766a" />
      <div className="mt-7 text-[11px] uppercase tracking-[0.5em] indent-[0.5em] text-realm-muted" style={CINZEL}>
        The Candle Is Out
      </div>
      <h1
        className="mt-4 font-normal leading-[1.1] tracking-[0.12em] indent-[0.12em] text-realm-cream text-balance"
        style={{ ...CINZEL, fontSize: 'clamp(30px, 6vw, 50px)' }}
      >
        {house.name}
      </h1>
      <div
        className="mt-5 leading-none text-realm-gold tabular-nums"
        style={{ ...CINZEL, fontSize: 'clamp(52px, 9vw, 80px)' }}
      >
        {signed(turnScore)}
      </div>
      <div className="mt-2 text-[18px] italic text-realm-muted" style={GARAMOND}>
        points this turn
      </div>

      {game.log.length > 0 ? (
        <>
          <div className="mt-10 text-[10px] uppercase tracking-[0.34em] text-realm-dim" style={CINZEL}>
            Tap a card to switch it
          </div>
          <ul className="w-full mt-3 text-left">
            {game.log.map((entry, i) => {
              const card = cardsById.get(entry.cardId)
              const got = entry.result === 'got'
              const result = got ? RESULTS.got : RESULTS.lost // older saved games used pass/forbidden/stolen
              return (
                <li key={i} className="border-b border-realm-gold/10">
                  <button
                    type="button"
                    onClick={() => onCorrect(i, nextResult(entry.result))}
                    className={`w-full grid grid-cols-[22px_minmax(0,1fr)_auto] items-center gap-3.5 px-1 py-3.5 text-left cursor-pointer hover:bg-realm-gold/5 transition-colors ${FOCUS}`}
                  >
                    <Diamond
                      size={8}
                      fill={got ? '#d8b878' : undefined}
                      line={got ? '#d8b878' : '#c9766a'}
                      className="mx-auto"
                    />
                    <span
                      className="text-[16px] sm:text-[17px] tracking-[0.05em] text-[#e8dec8] truncate"
                      style={CINZEL}
                    >
                      {card?.answer ?? 'A lost card'}
                    </span>
                    <span
                      className={`text-[10px] sm:text-[11px] uppercase tracking-[0.2em] whitespace-nowrap ${got ? 'text-realm-gold' : 'text-realm-rose'}`}
                      style={CINZEL}
                    >
                      {result.short} {signed(result.points)}
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        </>
      ) : (
        <div className="mt-10 text-[18px] italic text-realm-muted" style={GARAMOND}>
          No cards this turn.
        </div>
      )}

      <GamePrimaryButton ref={nextRef} type="button" onClick={onNext} className="mt-11">
        {isLast ? 'See the Standings' : `Pass to ${shortName(nextHouse)}`}
      </GamePrimaryButton>
    </div>
  )
}

/* ------------------------------------------------------------------ */

export function FinalScreen({ game, teams, standings, onRematch, onSetup }) {
  const top = standings.filter((s) => s.rank === 1)
  const tie = top.length > 1
  const winner = teams[top[0].teamIndex]

  return (
    <div className="flex flex-col items-center text-center max-w-[620px] mx-auto pt-6 animate-[riseIn_.35s_ease_both]">
      {tie ? <Diamond size={15} line="#d8b878" /> : <Sigil house={winner} size={64} />}
      <div className="mt-7 text-[11px] uppercase tracking-[0.5em] indent-[0.5em] text-realm-muted" style={CINZEL}>
        After {game.settings.rounds} {game.settings.rounds === 1 ? 'Round' : 'Rounds'}
      </div>
      <h1
        className="mt-4 font-normal leading-[1.1] tracking-[0.12em] indent-[0.12em] text-realm-cream text-balance"
        style={{ ...CINZEL, fontSize: 'clamp(32px, 6.5vw, 60px)' }}
      >
        {tie ? 'The Realm Is Divided' : `${winner.name} Prevails`}
      </h1>
      <p
        className="mt-5 mx-auto max-w-[34ch] text-[20px] leading-normal italic text-realm-body text-balance"
        style={GARAMOND}
      >
        {tie
          ? `${top.map((t) => teams[t.teamIndex].name).join(' and ')} share the honours. Settle it with another game.`
          : 'Their ravens flew truest. The rest of the realm will hear of it.'}
      </p>

      <ol className="w-full mt-11">
        {standings.map((row) => {
          const house = teams[row.teamIndex]
          const first = row.rank === 1
          return (
            <li
              key={house.slug}
              className="grid grid-cols-[40px_44px_minmax(0,1fr)_auto] items-center gap-3 px-2 py-4 border-b border-realm-gold/10 text-left"
            >
              <span className="text-[14px] text-realm-gold" style={CINZEL}>
                {ROMAN[row.rank - 1]}
              </span>
              <Sigil house={house} size={32} />
              <span
                className={`text-[18px] sm:text-[20px] tracking-[0.08em] ${first ? 'text-realm-cream' : 'text-realm-note'}`}
                style={CINZEL}
              >
                {house.name}
              </span>
              <span className="text-[26px] text-realm-cream tabular-nums" style={CINZEL}>
                {row.score}
              </span>
            </li>
          )
        })}
      </ol>

      <GamePrimaryButton type="button" onClick={onRematch} className="mt-12">
        Play Again
      </GamePrimaryButton>
      <button
        type="button"
        onClick={onSetup}
        className={`mt-3.5 p-3 text-[11px] uppercase tracking-[0.3em] text-realm-muted hover:text-realm-gold transition-colors cursor-pointer ${FOCUS}`}
        style={CINZEL}
      >
        Change Setup
      </button>
    </div>
  )
}