import { Link } from 'react-router-dom'

export default function CampaignVictory({ houseName, summary }) {
  return (
    <div className="w-full max-w-sm flex flex-col gap-6 pt-4 pb-4 text-center">
      <div>
        <div className="text-6xl mb-2 select-none">👑</div>
        <p className="text-got-gold/60 text-xs tracking-[0.3em] uppercase" style={{ fontFamily: 'Cinzel, serif' }}>
          House {houseName}
        </p>
        <h1
          className="text-3xl font-black tracking-wider uppercase text-got-gold mt-1"
          style={{ fontFamily: 'Cinzel, serif', textShadow: '0 0 30px rgba(201,168,76,0.4)' }}
        >
          Iron Throne Claimed
        </h1>
        <p className="text-got-parchment/60 text-sm mt-2 italic" style={{ fontFamily: 'EB Garamond, serif' }}>
          {summary.battlesWon} of {summary.totalBattles} battles won. The realm is yours.
        </p>
        <div className="gold-divider mt-3" />
      </div>

      <div className="rounded-lg border border-got-gold/40 bg-got-gold/5 p-4 flex flex-col gap-2 text-left">
        <Row label="Final House Rating" value={`${summary.finalHouseRating}/100`} />
        <Row label="Starting Army" value={summary.startingArmy.toLocaleString()} />
        <Row label="Final Army" value={summary.finalArmy.toLocaleString()} />
        <Row label="Gold Earned" value={summary.goldEarned.toLocaleString()} />
        <Row label="Houses Allied" value={summary.alliancesMade} />
        <Row label="Enemy Soldiers Defeated" value={summary.enemySoldiersDefeated.toLocaleString()} />
        <Row label="Soldiers Recruited (Surrender)" value={summary.soldiersRecruitedFromSurrender.toLocaleString()} />
      </div>

      <Link
        to="/games"
        className="w-full text-center py-4 rounded border border-got-gold bg-got-gold/10 text-got-gold text-lg tracking-widest uppercase transition-all duration-200 hover:bg-got-gold/20"
        style={{ fontFamily: 'Cinzel, serif' }}
      >
        Back to Games
      </Link>
    </div>
  )
}

function Row({ label, value }) {
  return (
    <div className="flex justify-between">
      <span className="text-stone-500 text-sm">{label}</span>
      <span className="text-got-parchment font-bold">{value}</span>
    </div>
  )
}