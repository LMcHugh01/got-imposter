import SectionHeading from './SectionHeading'

const TROOP_TYPE_INFO = {
  infantry: { label: 'Infantry', color: 'linear-gradient(#c9a75a,#9c7d36)' },
  archers: { label: 'Archers', color: 'linear-gradient(#8d7a4e,#6a5a33)' },
  cavalry: { label: 'Cavalry', color: 'linear-gradient(#5f5439,#3d3626)' },
}

const GAUGES = [
  { key: 'armyQuality', label: 'Quality', note: (v) => (v >= 70 ? 'Seasoned' : 'Green levies') },
  { key: 'morale', label: 'Morale', note: (v) => (v >= 70 ? 'Eager' : 'Wavering') },
  { key: 'supply', label: 'Supply', note: (v) => (v >= 70 ? 'Wagons full' : 'Stretched') },
]

function goldTier(v) {
  if (v >= 85) return '#d9b871'
  if (v >= 72) return '#efe7d7'
  if (v >= 58) return '#c5b89f'
  return '#a89b83'
}

/**
 * pages/games/draft/ResourcesBar.jsx
 *
 * Every value here is read straight off `resources` (campaign.resources)
 * — nothing computed or duplicated, just laid out to match the new
 * design: Treasury + Host-in-the-field (with a composition bar and a
 * troop-type breakdown) on one side, Quality/Morale/Supply as gauge rings
 * on the other.
 */
export default function ResourcesBar({ resources }) {
  const armyTotal = resources.troops.infantry + resources.troops.archers + resources.troops.cavalry

  return (
    <section className="flex flex-col gap-5">
      <SectionHeading label="Your Resources" />

      <div className="flex flex-wrap gap-8">
        {/* Treasury */}
        <div className="flex-1 min-w-[200px]">
          <p className="text-got-parchment/40 text-[11px] tracking-[0.24em] uppercase" style={{ fontFamily: 'Cinzel, serif' }}>
            Treasury
          </p>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-got-gold text-3xl font-bold" style={{ fontFamily: 'Cinzel, serif' }}>
              {resources.gold.toLocaleString()}
            </span>
            <span className="text-stone-500 text-xs tracking-widest uppercase" style={{ fontFamily: 'Cinzel, serif' }}>
              gold
            </span>
          </div>
          {resources.alliances.length > 0 && (
            <p className="text-stone-500 text-sm mt-2 italic">
              {resources.alliances.length} {resources.alliances.length === 1 ? 'ally' : 'allies'}
            </p>
          )}
        </div>

        {/* Host in the field */}
        <div className="flex-[2] min-w-[280px]">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <p className="text-got-parchment/40 text-[11px] tracking-[0.24em] uppercase" style={{ fontFamily: 'Cinzel, serif' }}>
              Host in the Field
            </p>
            <div className="flex items-baseline gap-1.5">
              <span className="text-got-parchment text-xl font-bold" style={{ fontFamily: 'Cinzel, serif' }}>
                {armyTotal.toLocaleString()}
              </span>
              <span className="text-stone-500 text-[10px] tracking-widest uppercase" style={{ fontFamily: 'Cinzel, serif' }}>
                swords
              </span>
            </div>
          </div>

          <div className="flex h-3 mt-3 border border-stone-800 bg-stone-950 overflow-hidden">
            {Object.entries(TROOP_TYPE_INFO).map(([type, info]) => (
              <div
                key={type}
                title={`${info.label}: ${resources.troops[type].toLocaleString()}`}
                style={{
                  width: armyTotal > 0 ? `${(resources.troops[type] / armyTotal) * 100}%` : 0,
                  background: info.color,
                }}
              />
            ))}
          </div>

          <div className="grid grid-cols-3 gap-2 mt-3">
            {Object.entries(TROOP_TYPE_INFO).map(([type, info]) => (
              <div key={type}>
                <p className="text-stone-500 text-[10px] tracking-widest uppercase" style={{ fontFamily: 'Cinzel, serif' }}>
                  {info.label}
                </p>
                <p className="text-got-parchment text-sm" style={{ fontFamily: 'Cinzel, serif' }}>
                  {resources.troops[type].toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Quality / Morale / Supply gauges */}
        <div className="flex-1 min-w-[240px] flex justify-between gap-4">
          {GAUGES.map(({ key, label, note }) => {
            const value = resources[key]
            const color = value >= 70 ? '#c9a75a' : '#8d7a4e'
            return (
              <div key={key} className="text-center flex-1">
                <div
                  className="relative w-[62px] h-[62px] mx-auto rounded-full"
                  style={{ background: `conic-gradient(${color} 0 ${value}%, #221c13 ${value}% 100%)` }}
                >
                  <div className="absolute inset-[7px] rounded-full bg-stone-950" />
                  <span
                    className="relative leading-[62px] font-semibold text-base"
                    style={{ fontFamily: 'Cinzel, serif', color: goldTier(value) }}
                  >
                    {value}
                  </span>
                </div>
                <p
                  className="text-stone-500 text-[10px] tracking-widest uppercase mt-2"
                  style={{ fontFamily: 'Cinzel, serif' }}
                >
                  {label}
                </p>
                <p className="text-stone-600 text-xs italic mt-0.5">{note(value)}</p>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}