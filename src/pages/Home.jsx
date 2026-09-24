import { Link, useLocation } from 'react-router-dom'
import PageWrapper from '../components/PageWrapper'
import { CINZEL, GARAMOND, FOCUS } from '../components/GameHome'
import GameMark from '../components/GameMark'
import { EXPLORE, GAMES, FEATURED_GAMES, describeGame } from '../data/games'
import { SITE } from '../data/site'

/**
 * pages/Home.jsx
 *
 * The lobby. The site's name, then three banners hanging from one gilded
 * rod (the Map, Characters, Houses), then four games in a quartered field
 * (two to pass around, two to play alone), and a way to every game.
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

// A centred section title between two fading gold lines.
function SectionTitle({ children, id }) {
  const line = (dir) => ({ background: `linear-gradient(${dir}, transparent, rgba(216,184,120,.5))` })
  return (
    <div className="flex items-center justify-center gap-3 sm:gap-5">
      <span className="w-8 sm:w-20 h-px" style={line('90deg')} aria-hidden="true" />
      <h2
        id={id}
        className="text-[12px] font-normal uppercase whitespace-nowrap tracking-[0.3em] indent-[0.3em] sm:tracking-[0.46em] sm:indent-[0.46em] text-realm-gold"
        style={CINZEL}
      >
        {children}
      </h2>
      <span className="w-8 sm:w-20 h-px" style={line('270deg')} aria-hidden="true" />
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

function GameQuarter({ game, index }) {
  const meta = describeGame(game)
  return (
    <li className="relative">
      <Link
        to={game.to}
        className={`group relative flex flex-col items-center text-center px-6 py-14 sm:py-16 overflow-hidden transition-colors duration-300 ${FOCUS}`}
      >
        <span
          className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
          style={{ background: 'radial-gradient(closest-side, rgba(216,184,120,.08), transparent)' }}
          aria-hidden="true"
        />
        <span
          className="absolute right-5 top-0 text-[120px] sm:text-[160px] leading-none text-[rgba(216,184,120,.05)] pointer-events-none select-none"
          style={CINZEL}
          aria-hidden="true"
        >
          {NUMERALS[index]}
        </span>
        <div className="relative h-[84px] flex items-end justify-center" aria-hidden="true">
          <GameMark id={game.id} />
        </div>
        <h3
          className="relative mt-7 font-normal tracking-[0.12em] indent-[0.12em] text-realm-cream group-hover:text-realm-gilt transition-colors"
          style={{ ...CINZEL, fontSize: 'clamp(26px, 3vw, 34px)' }}
        >
          {game.title}
        </h3>
        <p className="relative mt-1.5 text-[21px] italic text-realm-body" style={GARAMOND}>
          {game.description}
        </p>
        <p className="relative mt-5 text-[10.5px] uppercase tracking-[0.24em] text-realm-muted" style={CINZEL}>
          <span className={game.mode === 'pass' ? 'text-realm-gold' : ''}>{meta.mode}</span>
          <span aria-hidden="true"> · </span>
          {meta.players}
        </p>
      </Link>
    </li>
  )
}

function FeaturedGames() {
  const games = FEATURED_GAMES.map((id) => GAMES.find((g) => g.id === id)).filter(Boolean)
  const rule = (dir) => ({ background: `linear-gradient(${dir}, transparent, rgba(216,184,120,.3) 30%, rgba(216,184,120,.3) 70%, transparent)` })
  return (
    <div className="mt-12 md:mt-14">
      <div className="relative">
        {/* the quartering: a cross of gold lines with a diamond where they meet */}
        <div className="hidden sm:block" aria-hidden="true">
          <span className="absolute left-1/2 top-6 bottom-6 w-px" style={rule('180deg')} />
          <span className="absolute top-1/2 left-6 right-6 h-px" style={rule('90deg')} />
          <Lozenge size={12} fill="#1f1d1a" line={GOLD} className="absolute left-1/2 top-1/2 -ml-[6px] -mt-[6px] z-10" />
        </div>
        <ul className="grid grid-cols-1 sm:grid-cols-2">
          {games.map((g, i) => (
            <GameQuarter key={g.id} game={g} index={i} />
          ))}
        </ul>
      </div>
      <div className="flex justify-center mt-14">
        <Link
          to="/games"
          className={`group flex items-center gap-4 pb-3.5 px-2 border-b border-realm-gold/40 hover:border-realm-gold transition-colors ${FOCUS}`}
        >
          <Lozenge size={7} fill={GOLD} />
          <span className="text-[13px] uppercase tracking-[0.34em] text-realm-gold group-hover:text-[#eed49b] transition-colors" style={CINZEL}>
            All {GAMES.length} games
          </span>
          <span className="text-[18px] text-realm-gold transition-transform duration-200 group-hover:translate-x-1" aria-hidden="true">
            →
          </span>
        </Link>
      </div>
    </div>
  )
}

/* ---------------- page ---------------- */

export default function Home() {
  const farewell = useLocation().state?.farewell

  return (
    <PageWrapper className="relative justify-start text-realm-ink !px-0 overflow-hidden">
      {/* a faint ember glow behind the games */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: 'radial-gradient(900px 700px at 50% 68%, rgba(120,30,28,.10), transparent 70%)' }}
        aria-hidden="true"
      />

      <header className="relative flex flex-col items-center text-center px-6 pt-14 sm:pt-24">
        <p className="text-[11px] uppercase tracking-[0.5em] indent-[0.5em] text-realm-muted" style={CINZEL}>
          Game of Thrones
        </p>
        <h1
          className="mt-5 font-normal leading-[1.05] tracking-[0.12em] indent-[0.12em] text-realm-cream text-balance"
          style={{ ...CINZEL, fontSize: 'clamp(40px, 8.5vw, 100px)' }}
        >
          {SITE.name}
        </h1>
        <p className="mt-4 text-[20px] sm:text-[24px] italic text-realm-body text-balance" style={GARAMOND}>
          {SITE.tagline}
        </p>
        {farewell && (
          <p role="status" className="mt-8 text-[18px] italic text-realm-gold text-balance" style={GARAMOND}>
            Your account has been deleted. Farewell, and may the roads be kind.
          </p>
        )}
      </header>

      <section aria-labelledby="explore-title" className="relative w-full max-w-[1080px] mx-auto mt-24 sm:mt-28 px-6">
        <SectionTitle id="explore-title">Explore Westeros</SectionTitle>
        <Banners />
      </section>

      <section aria-labelledby="games-title" className="relative w-full max-w-[1080px] mx-auto mt-28 sm:mt-36 px-6 pb-8">
        <SectionTitle id="games-title">The Games</SectionTitle>
        <FeaturedGames />
      </section>
    </PageWrapper>
  )
}