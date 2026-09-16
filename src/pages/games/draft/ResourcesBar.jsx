const TROOP_TYPE_INFO = {
  infantry: { label: 'Infantry', icon: '⚔' },
  archers: { label: 'Archers', icon: '🏹' },
  cavalry: { label: 'Cavalry', icon: '🐎' },
}

/**
 * pages/games/draft/ResourcesBar.jsx
 *
 * A compact, always-visible strip of the campaign's current resources —
 * gold, troop composition/total, morale, supply, army quality. Every
 * value is read straight off `resources` (campaign.resources, the same
 * object gameEngine/resources.js already owns and CampaignAction.jsx
 * already reads/writes); nothing here is computed or duplicated.
 */
export default function ResourcesBar({ resources }) {
  const armyTotal = resources.troops.infantry + resources.troops.archers + resources.troops.cavalry

  return (
    <div className="rounded-lg border border-stone-700 bg-stone-900/60 p-4 flex flex-wrap items-center gap-x-6 gap-y-3">
      <Stat label="Gold" value={resources.gold.toLocaleString()} />
      <Stat label="Army" value={armyTotal.toLocaleString()} />
      {Object.keys(TROOP_TYPE_INFO).map((type) => (
        <Stat
          key={type}
          label={TROOP_TYPE_INFO[type].label}
          value={resources.troops[type].toLocaleString()}
          icon={TROOP_TYPE_INFO[type].icon}
        />
      ))}
      <Stat label="Army Quality" value={resources.armyQuality} />
      <Stat label="Morale" value={resources.morale} />
      <Stat label="Supply" value={resources.supply} />
      {resources.alliances.length > 0 && <Stat label="Allies" value={resources.alliances.length} />}
    </div>
  )
}

function Stat({ label, value, icon }) {
  return (
    <div className="flex flex-col">
      <p
        className="text-got-parchment/40 text-[10px] tracking-[0.18em] uppercase whitespace-nowrap"
        style={{ fontFamily: 'Cinzel, serif' }}
      >
        {icon ? `${icon} ` : ''}
        {label}
      </p>
      <p className="text-got-parchment text-base font-bold" style={{ fontFamily: 'Cinzel, serif' }}>
        {value}
      </p>
    </div>
  )
}
