import HouseNameIntro from '../../../../components/HouseNameIntro'

/**
 * pages/games/campaign/draft/DraftIntro.jsx
 *
 * The Campaign game's start screen. The ornament is the road ahead:
 * eight battles on a line, the first lit once the house is named and
 * the last, larger and red, the final battle.
 */
export function EightBattles({ ready }) {
  return (
    <div className="relative flex items-center gap-[26px]">
      <div
        className="absolute left-1 right-1 top-1/2 h-px"
        style={{ background: 'linear-gradient(90deg, rgba(216,184,120,.6), rgba(216,184,120,.12))' }}
      />
      {Array.from({ length: 8 }, (_, i) => {
        const first = i === 0
        const last = i === 7
        const size = last ? 15 : first ? 11 : 9
        const on = first && ready
        return (
          <div
            key={i}
            className="relative rotate-45 transition-all duration-300"
            style={{
              width: size,
              height: size,
              background: on ? '#d8b878' : '#1f1d1a',
              border: last
                ? '1px solid #c9766a'
                : on
                  ? '1px solid #d8b878'
                  : '1px solid rgba(216,184,120,.45)',
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
      renderOrnament={(name) => <EightBattles ready={name.length > 0} />}
      eyebrow="Game of Thrones"
      title="The Campaign"
      tagline="Eight Battles"
      description="Draft your council, then lead your house through eight battles. Lose too many and your banners fall."
      cta="Begin Campaign"
      onPlay={onPlay}
    />
  )
}