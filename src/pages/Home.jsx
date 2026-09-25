import { useLayoutEffect, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import PageWrapper from '../components/PageWrapper'
import { CINZEL, GARAMOND, FOCUS } from '../components/GameHome'
import GameMark from '../components/GameMark'
import { EXPLORE, GAMES, FEATURED_GAMES, describeGame } from '../data/games'
import { SITE } from '../data/site'

/**
 * pages/Home.jsx
 *
 * The lobby. The tagline and a way in (the games, or the map); then four
 * featured games, each a card in its own colour; then three banners
 * hanging from one gilded rod (the Map, Characters, Houses).
 */

const GOLD = '#d8b878'
const PALE_GOLD = '#eed49b'
const BLOOD = '#c0463e'

/* ---------------- small pieces ---------------- */

function Lozenge({ size, fill, line, className = '', style }) {
  return (
    <span
      aria-hidden="true"
      className={`block shrink-0 rotate-45 ${className}`}
      style={{ width: size, height: size, background: fill, border: line ? `1px solid ${line}` : undefined, ...style }}
    />
  )
}

// A section title on the left, a fading gold rule, and an optional link on the right.
function SectionTitle({ children, id, link }) {
  return (
    <div className="flex items-center gap-4">
      <h2 id={id} className="text-[11px] font-normal uppercase whitespace-nowrap tracking-[0.3em] text-realm-gold" style={CINZEL}>
        {children}
      </h2>
      <span className="flex-1 h-px" style={{ background: 'linear-gradient(90deg, rgba(216,184,120,.35), rgba(216,184,120,.06))' }} aria-hidden="true" />
      {link}
    </div>
  )
}

/* ---------------- banners ---------------- */

// A compass rose: the four points of the realm around a red heart.
function MapEmblem() {
  return (
    <div className="relative w-[130px] h-[130px]">
      <span className="absolute left-[64px] top-0 w-px h-[130px]" style={{ background: 'linear-gradient(180deg, transparent, rgba(216,184,120,.7), transparent)' }} />
      <span className="absolute top-[64px] left-0 h-px w-[130px]" style={{ background: 'linear-gradient(90deg, transparent, rgba(216,184,120,.7), transparent)' }} />
      <Lozenge size={40} line={GOLD} className="absolute left-[45px] top-[45px]" />
      <Lozenge size={12} fill={BLOOD} className="absolute left-[59px] top-[59px]" />
      <Lozenge size={12} fill={PALE_GOLD} className="absolute left-[59px] top-[4px]" />
      <Lozenge size={8} fill="rgba(216,184,120,.6)" className="absolute left-[61px] top-[116px]" />
      <Lozenge size={8} fill="rgba(216,184,120,.6)" className="absolute left-[4px] top-[61px]" />
      <Lozenge size={8} fill="rgba(216,184,120,.6)" className="absolute left-[118px] top-[61px]" />
    </div>
  )
}

// One bright figure between two in shadow.
function CharactersEmblem() {
  return (
    <div className="relative w-[150px] h-[130px]">
      <Lozenge size={34} fill="rgba(216,184,120,.35)" className="absolute left-[14px] top-[46px]" />
      <Lozenge size={34} fill="rgba(216,184,120,.35)" className="absolute left-[102px] top-[46px]" />
      <Lozenge size={56} fill={GOLD} className="absolute left-[47px] top-[31px]" style={{ boxShadow: '0 0 40px rgba(238,212,155,.35)' }} />
      <span className="absolute left-[40px] top-[112px] w-[70px] h-px" style={{ background: 'linear-gradient(90deg, transparent, rgba(216,184,120,.7), transparent)' }} />
    </div>
  )
}

// A gilded shield with a red charge.
function HousesEmblem() {
  const shield = 'polygon(0 0, 100% 0, 100% 55%, 50% 100%, 0 55%)'
  return (
    <div className="w-[130px] h-[130px] flex justify-center">
      <div className="w-[100px] h-[124px] flex items-center justify-center pb-[22px]" style={{ clipPath: shield, background: `linear-gradient(180deg, ${GOLD}, #9c7f45)` }}>
        <div className="w-[88px] h-[110px] mt-[22px] flex items-center justify-center" style={{ clipPath: shield, background: '#2a2112' }}>
          <Lozenge size={22} fill={BLOOD} className="mb-[18px]" />
        </div>
      </div>
    </div>
  )
}

// Each banner's cloth (top to bottom), the colour of its words, and emblem.
const BANNER_LOOK = {
  map: { cloth: ['#1d3b40', '#16292d', '#10191b'], ink: '#b9c4c2', emblem: <MapEmblem /> },
  characters: { cloth: ['#5c1c1d', '#3e1415', '#240c0d'], ink: '#d6b9b2', emblem: <CharactersEmblem /> },
  houses: { cloth: ['#4a3b1f', '#302614', '#1c160c'], ink: '#d3c6a8', emblem: <HousesEmblem /> },
}

const ROD = { background: `linear-gradient(90deg, #6e5a33, ${GOLD} 20%, ${PALE_GOLD} 50%, ${GOLD} 80%, #6e5a33)` }

function Banner({ item }) {
  const look = BANNER_LOOK[item.id]
  return (
    <Link to={item.to} className={`group block text-inherit ${FOCUS}`}>
      {/* on narrow screens each banner hangs from its own short rod */}
      <div className="relative h-1 -mx-3 rounded-sm md:hidden" style={ROD} aria-hidden="true" />
      <div
        className="relative flex flex-col items-center text-center px-7 pt-12 md:pt-14 h-[440px] md:h-[540px] transition-transform duration-[400ms] ease-out group-hover:translate-y-2 motion-reduce:transition-none"
        style={{
          clipPath: 'polygon(0 0, 100% 0, 100% 86%, 50% 100%, 0 86%)',
          background: `linear-gradient(180deg, ${look.cloth[0]} 0%, ${look.cloth[1]} 60%, ${look.cloth[2]} 100%)`,
        }}
      >
        {/* gold edging down both sides */}
        {['left-[14px]', 'right-[14px]'].map((side) => (
          <span
            key={side}
            className={`absolute ${side} top-0 bottom-0 w-px`}
            style={{ background: 'linear-gradient(180deg, rgba(216,184,120,.5), rgba(216,184,120,.08))' }}
            aria-hidden="true"
          />
        ))}
        <div className="mt-4 md:mt-8 flex items-center justify-center h-[130px]" aria-hidden="true">
          {look.emblem}
        </div>
        <h3
          className="mt-10 md:mt-12 font-normal tracking-[0.1em] indent-[0.1em] text-realm-cream whitespace-nowrap"
          style={{ ...CINZEL, fontSize: 'clamp(24px, 2.6vw, 32px)' }}
        >
          {item.title}
        </h3>
        <p className="mt-2.5 text-[19px] md:text-[20px] leading-snug italic text-balance" style={{ ...GARAMOND, color: look.ink }}>
          {item.description}
        </p>
        <Lozenge size={7} fill={GOLD} className="mt-8 md:mt-9 transition-transform duration-300 group-hover:scale-125" />
      </div>
    </Link>
  )
}

function Banners() {
  return (
    <div className="relative mt-14 md:mt-16">
      {/* one gilded rod across all three, with diamond finials */}
      <div className="hidden md:block" aria-hidden="true">
        <div className="absolute -left-3 -right-3 top-0 h-1 rounded-sm" style={ROD} />
        <Lozenge size={14} fill={GOLD} className="absolute -left-6 -top-[5px]" />
        <Lozenge size={14} fill={GOLD} className="absolute -right-6 -top-[5px]" />
      </div>
      <ul className="grid grid-cols-1 md:grid-cols-3 gap-12 md:gap-10 max-w-[340px] md:max-w-none mx-auto md:px-5">
        {EXPLORE.map((item) => (
          <li key={item.id}>
            <Banner item={item} />
          </li>
        ))}
      </ul>
    </div>
  )
}

/* ---------------- games ---------------- */

const NUMERALS = ['I', 'II', 'III', 'IV']

// A small boxed detail: how it's played (Pass & Play in gold), how many play.
function Chip({ gold, children }) {
  return (
    <span
      className="px-2 py-[5px] border text-[9px] uppercase tracking-[0.18em] whitespace-nowrap"
      style={{ ...CINZEL, borderColor: gold ? 'rgba(216,184,120,.6)' : 'rgba(216,184,120,.2)', color: gold ? GOLD : '#9d9483' }}
    >
      {children}
    </span>
  )
}

// A game's mark, scaled to sit inside its card's panel with room to spare,
// whatever its natural width (Allegiances' is 77px, Campaign's 265px): at
// most 120px wide on larger screens and 84px on phones, never enlarged
// past 0.85. Measured once, when it first renders.
const MARK_CSS = `.home-mark { transform: scale(var(--fit-phone, .5)); transition: transform .2s; }
@media (min-width: 640px) { .home-mark { transform: scale(var(--fit-desk, .6)); } }`

function FittedMark({ id }) {
  const ref = useRef(null)
  const [width, setWidth] = useState(null)
  useLayoutEffect(() => {
    if (ref.current) setWidth(ref.current.scrollWidth)
  }, [id])
  const fit = (room, cap) => (width ? Math.min(cap, room / width) : cap)
  return (
    <div ref={ref} className="home-mark relative" style={{ '--fit-desk': fit(120, 0.85), '--fit-phone': fit(84, 0.7) }}>
      <GameMark id={id} />
    </div>
  )
}

// A featured game: a panel in its colour with its mark and numeral, then
// its name, tagline and how it's played. The whole card is the link.
function GameCard({ game, index }) {
  const meta = describeGame(game)
  const tint = game.tint ?? '#3a342a'
  return (
    <li>
      <Link
        to={game.to}
        className={`group h-full flex rounded-[3px] border border-[rgba(216,184,120,.16)] hover:border-[rgba(216,184,120,.5)] overflow-hidden transition-colors duration-200 ${FOCUS}`}
        style={{ background: '#22201c' }}
      >
        <div
          className="relative shrink-0 w-[118px] sm:w-[174px] flex items-center justify-center overflow-hidden border-r"
          style={{ borderColor: `${tint}`, background: `linear-gradient(160deg, ${tint}cc 0%, ${tint}55 55%, #22201c 100%)` }}
          aria-hidden="true"
        >
          <span
            className="absolute right-3 -top-2 leading-none pointer-events-none select-none text-[92px] sm:text-[112px]"
            style={{ ...CINZEL, color: 'rgba(255,255,255,.07)' }}
          >
            {NUMERALS[index]}
          </span>
          <FittedMark id={game.id} />
        </div>
        <div className="min-w-0 flex-1 px-4 sm:px-6 py-5 sm:py-7">
          <h3
            className="font-normal tracking-[0.1em] text-realm-cream group-hover:text-realm-gilt transition-colors text-[20px] sm:text-[24px]"
            style={CINZEL}
          >
            {game.title}
          </h3>
          <p className="mt-0.5 text-[17px] sm:text-[19px] italic text-realm-body" style={GARAMOND}>
            {game.description}
          </p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            <Chip gold={game.mode === 'pass'}>{meta.mode}</Chip>
            <Chip>{meta.players}</Chip>
          </div>
        </div>
      </Link>
    </li>
  )
}

function FeaturedGames() {
  const games = FEATURED_GAMES.map((id) => GAMES.find((g) => g.id === id)).filter(Boolean)
  return (
    <ul className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-3">
      <style>{MARK_CSS}</style>
      {games.map((g, i) => (
        <GameCard key={g.id} game={g} index={i} />
      ))}
    </ul>
  )
}

function AllGamesLink() {
  return (
    <Link to="/games" className={`group flex items-center gap-2.5 whitespace-nowrap ${FOCUS}`}>
      <span className="text-[10px] uppercase tracking-[0.26em] text-realm-gold group-hover:text-[#eed49b] transition-colors" style={CINZEL}>
        All {GAMES.length} games
      </span>
      <span className="text-[15px] text-realm-gold transition-transform duration-200 group-hover:translate-x-1" aria-hidden="true">
        →
      </span>
    </Link>
  )
}

/* ---------------- page ---------------- */

export default function Home() {
  const farewell = useLocation().state?.farewell
  // "Explore the realm. Play for the throne." over two lines
  const tagline = SITE.tagline.split(/(?<=\.)\s+/)
  const rule = (dir) => ({ background: `linear-gradient(${dir}, transparent, rgba(216,184,120,.45))` })

  return (
    <PageWrapper className="relative justify-start text-realm-ink !px-0 overflow-hidden">
      <header className="relative flex flex-col items-center text-center px-6 pt-12 sm:pt-20">
        <p className="text-[10px] uppercase tracking-[0.46em] indent-[0.46em] text-realm-muted" style={CINZEL}>
          Game of Thrones Fan Project
        </p>
        <div className="mt-4 flex items-center justify-center gap-4 sm:gap-7">
          <span className="hidden sm:block w-20 h-px" style={rule('90deg')} aria-hidden="true" />
          <h1
            className="font-normal leading-[1.2] tracking-[0.08em] text-realm-cream text-balance"
            style={{ ...CINZEL, fontSize: 'clamp(30px, 4.6vw, 46px)' }}
          >
            {tagline.map((line, i) => (
              <span key={i} className="block">
                {line}
              </span>
            ))}
          </h1>
          <span className="hidden sm:block w-20 h-px" style={rule('270deg')} aria-hidden="true" />
        </div>
        <p className="mt-4 max-w-[520px] text-[19px] sm:text-[21px] italic text-realm-body text-balance" style={GARAMOND}>
          Games to play with friends or alone, and a guide to the lands, lords and houses of Westeros.
        </p>
        {farewell && (
          <p role="status" className="mt-8 text-[18px] italic text-realm-gold text-balance" style={GARAMOND}>
            Your account has been deleted. Farewell, and may the roads be kind.
          </p>
        )}
      </header>

      <section aria-labelledby="games-title" className="relative w-full max-w-[1120px] mx-auto mt-16 sm:mt-20 px-5 sm:px-6">
        <SectionTitle id="games-title" link={<AllGamesLink />}>
          The Games
        </SectionTitle>
        <FeaturedGames />
      </section>

      <section aria-labelledby="explore-title" className="relative w-full max-w-[1120px] mx-auto mt-16 sm:mt-20 px-5 sm:px-6 pb-8">
        <SectionTitle id="explore-title">Explore Westeros</SectionTitle>
        <div className="mt-2">
          <Banners />
        </div>
      </section>
    </PageWrapper>
  )
}