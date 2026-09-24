import { Diamond, GameHero } from './GameHome'
import { getGame } from '../data/games'
import { MAX_GUESSES } from '../data/whispers'
import { TIER_COLORS } from '../data/allegiances'

/**
 * components/GameMark.jsx
 *
 * Every game's mark, in one place. The same mark appears on the game's own
 * screen, on the Games page and on the home page. Marks are fixed: they
 * don't animate or react to anything, so a game looks the same everywhere.
 *
 *   <GameMark id="draft" />
 *   <GameHeroFor id="draft" description="…" />   // a game screen's hero
 */

const GOLD = '#d8b878'
const FAINT_LINE = 'rgba(216,184,120,.45)'
const RED = '#c0463e'
const EMBER = '#c9766a'

// Five diamonds, the one in the middle outlined in red: the imposter hiding
// among the loyal.
function Imposter() {
  return (
    <div className="flex items-center gap-3.5">
      <Diamond size={6} fill="rgba(216,184,120,.35)" />
      <Diamond size={9} fill="rgba(216,184,120,.6)" />
      <Diamond size={15} line={RED} className="mx-1" />
      <Diamond size={9} fill="rgba(216,184,120,.6)" />
      <Diamond size={6} fill="rgba(216,184,120,.35)" />
    </div>
  )
}

// A lit candle between the rival houses' embers.
function Ravens() {
  const wick = { background: `linear-gradient(180deg, transparent, ${GOLD})` }
  return (
    <div className="flex items-center gap-4 h-[34px]">
      <Diamond size={8} line={EMBER} />
      <Diamond size={8} line={EMBER} />
      <div className="w-px h-[30px]" style={wick} />
      <Diamond size={15} fill={GOLD} />
      <div className="w-px h-[30px]" style={wick} />
      <Diamond size={8} line={EMBER} />
      <Diamond size={8} line={EMBER} />
    </div>
  )
}

// Six guesses: five open marks, and the last one gilded (the name you draw out).
function Whispers() {
  return (
    <div className="flex items-center gap-3.5">
      {Array.from({ length: MAX_GUESSES }, (_, i) =>
        i === MAX_GUESSES - 1 ? (
          <Diamond key={i} size={14} fill={GOLD} className="ml-1" />
        ) : (
          <Diamond key={i} size={9} line={FAINT_LINE} />
        )
      )}
    </div>
  )
}

// A scrambled 4×4 board in the four bond colours: sixteen names, four bonds.
const BOARD = [0, 1, 2, 3, 2, 3, 0, 1, 1, 0, 3, 2, 3, 2, 1, 0]
function Allegiances() {
  return (
    <div className="grid grid-cols-4 gap-[13px]">
      {BOARD.map((tier, i) => (
        <Diamond key={i} size={9} fill={TIER_COLORS[tier]} />
      ))}
    </div>
  )
}

// Ten seats, the two in the middle larger: five filled, five still to fill.
function Draft() {
  return (
    <div className="flex items-center gap-3">
      {Array.from({ length: 10 }, (_, i) => {
        const size = i === 4 || i === 5 ? 13 : 9
        return i < 5 ? <Diamond key={i} size={size} fill={GOLD} line={GOLD} /> : <Diamond key={i} size={size} line="rgba(216,184,120,.4)" />
      })}
    </div>
  )
}

// The road ahead: eight battles on a line, the first lit, the last larger and
// red (the final battle).
function Campaign() {
  return (
    <div className="relative flex items-center gap-[26px]">
      <div
        className="absolute left-1 right-1 top-1/2 h-px"
        style={{ background: 'linear-gradient(90deg, rgba(216,184,120,.6), rgba(216,184,120,.12))' }}
      />
      {Array.from({ length: 8 }, (_, i) => {
        if (i === 0) return <Diamond key={i} size={11} fill={GOLD} line={GOLD} className="relative" />
        if (i === 7) return <Diamond key={i} size={15} fill="#1f1d1a" line={EMBER} className="relative" />
        return <Diamond key={i} size={9} fill="#1f1d1a" line={FAINT_LINE} className="relative" />
      })}
    </div>
  )
}

const MARKS = {
  imposter: Imposter,
  ravens: Ravens,
  whispers: Whispers,
  allegiances: Allegiances,
  draft: Draft,
  campaign: Campaign,
}

export default function GameMark({ id }) {
  const Mark = MARKS[id]
  return Mark ? <Mark /> : null
}
export { GameMark }

/**
 * A game screen's hero, with everything but the description read from
 * data/games.js: the mark, the tagline above the title ("A Game of
 * Deduction"), the name, and the motto beneath it ("Six Guesses").
 */
export function GameHeroFor({ id, description }) {
  const game = getGame(id)
  return (
    <GameHero
      ornament={<GameMark id={id} />}
      eyebrow={game.description.replace(/\.$/, '')}
      title={game.title}
      tagline={game.motto}
      description={description}
    />
  )
}
