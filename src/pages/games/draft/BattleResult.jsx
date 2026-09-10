import { Link } from 'react-router-dom'
import { ratingLabel } from '../../../gameEngine/houseStats'

export default function BattleResult({
  result,
  enemyHouse,
  battleNumber,
  totalBattles,
  isFinalBattle,
  campaignSummary,
  onRetry,
  onContinue,
  onClaimVictory,
}) {
  const won = result.outcome === 'victory'

  return (
    <div className="w-full max-w-sm flex flex-col gap-6 pt-4 pb-4">
      <div className="text-center">
        <p className="text-stone-600 text-xs tracking-[0.3em] uppercase" style={{ fontFamily: 'Cinzel, serif' }}>
          Battle {battleNumber} of {totalBattles}
        </p>
        <div className="text-6xl mb-2 mt-1 select-none">{won ? '⚔️' : '🏳️'}</div>
        <h1
          className="text-3xl font-black tracking-wider uppercase"
          style={{
            fontFamily: 'Cinzel, serif',
            color: won ? '#c9a84c' : '#c0392b',
            textShadow: won ? '0 0 30px rgba(201,168,76,0.4)' : '0 0 30px rgba(192,57,43,0.5)',
          }}
        >
          {won ? 'Victory' : 'Defeat'}
        </h1>
        <p className="text-stone-500 text-sm mt-1">vs {enemyHouse.name}</p>
        <div className="gold-divider mt-3" />
      </div>

      {/* Enemy house revealed — hidden during the fight, revealed now that it's over */}
      <div className="rounded-lg border border-got-red/30 bg-got-red/5 p-4 flex flex-col gap-2">
        <p className="text-got-red-bright/80 text-xs tracking-widest uppercase" style={{ fontFamily: 'Cinzel, serif' }}>
          {enemyHouse.name} Revealed
        </p>
        <div className="flex justify-between">
          <span className="text-stone-500 text-sm">Army size</span>
          <span className="text-got-parchment font-bold">{enemyHouse.armySize.toLocaleString()}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-stone-500 text-sm">Army quality</span>
          <span className="text-got-parchment">
            {enemyHouse.armyQuality} · {ratingLabel(enemyHouse.armyQuality)}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-stone-500 text-sm">Morale</span>
          <span className="text-got-parchment">
            {enemyHouse.morale} · {ratingLabel(enemyHouse.morale)}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-stone-500 text-sm">Supply</span>
          <span className="text-got-parchment">
            {enemyHouse.supply} · {ratingLabel(enemyHouse.supply)}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-stone-500 text-sm">Personality</span>
          <span className="text-got-parchment capitalize">{enemyHouse.personality}</span>
        </div>
        {enemyHouse.commanderName && (
          <div className="flex justify-between">
            <span className="text-stone-500 text-sm">Commander</span>
            <span className="text-got-parchment">{enemyHouse.commanderName}</span>
          </div>
        )}
      </div>

      <div className="rounded-lg border border-stone-700 bg-stone-900/60 p-4 flex flex-col gap-2">
        <div className="flex justify-between">
          <span className="text-stone-500 text-sm">Your casualties</span>
          <span className="text-got-parchment font-bold">{result.yourCasualties.toLocaleString()}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-stone-500 text-sm">Enemy casualties</span>
          <span className="text-got-parchment font-bold">{result.enemyCasualties.toLocaleString()}</span>
        </div>
        {result.enemySurrendered > 0 && (
          <div className="flex justify-between">
            <span className="text-stone-500 text-sm">Enemy surrendered</span>
            <span className="text-got-gold-light font-bold">{result.enemySurrendered.toLocaleString()}</span>
          </div>
        )}
      </div>

      <div className="rounded-lg border border-stone-700 bg-stone-900/40 p-4 flex flex-col gap-2">
        {result.soldiersGained > 0 && (
          <p className="text-got-gold-light text-sm">+{result.soldiersGained.toLocaleString()} soldiers joined your army</p>
        )}
        {result.goldGained > 0 && <p className="text-got-gold-light text-sm">+{result.goldGained.toLocaleString()} gold captured</p>}
        <p className={result.moraleChange >= 0 ? 'text-got-gold-light text-sm' : 'text-got-red-bright text-sm'}>
          {result.moraleChange >= 0 ? '+' : ''}
          {result.moraleChange} morale
        </p>
        <p className="text-got-red-bright text-sm">{result.supplyChange} supply</p>
      </div>

      {!won && campaignSummary && (
        <div className="rounded-lg border border-stone-700 bg-stone-900/40 p-4 flex flex-col gap-2">
          <p className="text-stone-500 text-xs tracking-widest uppercase" style={{ fontFamily: 'Cinzel, serif' }}>
            Campaign So Far
          </p>
          <div className="flex justify-between">
            <span className="text-stone-500 text-sm">Battles won</span>
            <span className="text-got-parchment font-bold">
              {campaignSummary.battlesWon} of {campaignSummary.totalBattles}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-stone-500 text-sm">Current army</span>
            <span className="text-got-parchment font-bold">{campaignSummary.finalArmy.toLocaleString()}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-stone-500 text-sm">Houses allied</span>
            <span className="text-got-parchment font-bold">{campaignSummary.alliancesMade}</span>
          </div>
        </div>
      )}

      {won ? (
        <button
          onClick={isFinalBattle ? onClaimVictory : onContinue}
          className="w-full py-4 rounded border border-got-gold bg-got-gold/10 text-got-gold text-lg tracking-widest uppercase transition-all duration-200 hover:bg-got-gold/20 active:scale-[0.98]"
          style={{ fontFamily: 'Cinzel, serif' }}
        >
          {isFinalBattle ? 'Claim the Iron Throne' : `Continue to Battle ${battleNumber + 1}`}
        </button>
      ) : (
        <button
          onClick={onRetry}
          className="w-full py-4 rounded border border-got-gold bg-got-gold/10 text-got-gold text-lg tracking-widest uppercase transition-all duration-200 hover:bg-got-gold/20 active:scale-[0.98]"
          style={{ fontFamily: 'Cinzel, serif' }}
        >
          Try Again
        </button>
      )}

      <Link
        to="/games"
        className="w-full text-center py-4 rounded border border-stone-700 text-stone-400 text-lg tracking-widest uppercase transition-all duration-200 hover:border-stone-500 hover:text-stone-300"
        style={{ fontFamily: 'Cinzel, serif' }}
      >
        Back to Games
      </Link>
    </div>
  )
}