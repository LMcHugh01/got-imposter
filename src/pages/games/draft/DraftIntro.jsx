import HouseNameIntro from '../../../components/HouseNameIntro'

/**
 * pages/games/draft/DraftIntro.jsx
 *
 * The standalone Draft game's start screen. Ten seats light up one by
 * one as the player types their house name.
 */
export function TenSeats({ name }) {
  const lit = Math.min(10, name.length)
  return (
    <div className="flex items-center gap-3">
      {Array.from({ length: 10 }, (_, i) => {
        const size = i === 4 || i === 5 ? 13 : 9
        const on = i < lit
        return (
          <div
            key={i}
            className="rotate-45 transition-all duration-300"
            style={{
              width: size,
              height: size,
              background: on ? '#d8b878' : 'transparent',
              border: on ? '1px solid #d8b878' : '1px solid rgba(216,184,120,.4)',
            }}
          />
        )
      })}
    </div>
  )
}

export default function DraftIntro({ onPlay }) {
  return (
    <HouseNameIntro
      renderOrnament={(name) => <TenSeats name={name} />}
      eyebrow="Game of Thrones"
      title="The Draft"
      tagline="Ten Seats"
      description="Ten seats await a ruler. Build the council with the highest average rating you can."
      cta="Play Now"
      onPlay={onPlay}
    />
  )
}