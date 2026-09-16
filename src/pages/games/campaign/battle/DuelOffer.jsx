import { useState, useEffect } from 'react'
import { fetchEnemyHouseChampions } from '../../../../lib/enemyHouseService'
import { getDuelFighter, getEnemyDuelFighter, resolveDuel, finalizeDuelResult } from '../../../../gameEngine/duelEngine'
import { CHAMPION_STYLE_LABELS } from '../../../../data/championStyles'

/**
 * Sits between Campaign Action and Battle, only reachable when
 * duelEngine.canOfferDuelForBattle() says your power advantage clears the
 * threshold (Draft.jsx decides that, not this component). Ends by calling
 * either onDuel(result) — same result shape finalizeBattleResult()
 * produces, so it plugs into the exact same handleBattleComplete Draft.jsx
 * already has — or onDecline(), which sends the player to the normal
 * Battle screen instead.
 */
export default function DuelOffer({ roster, enemyHouse, enemySide, onDuel, onDecline }) {
  const [champions, setChampions] = useState([])
  const [loadingChampions, setLoadingChampions] = useState(true)
  const [selectedRole, setSelectedRole] = useState(null) // 'king' | 'champion'
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false
    fetchEnemyHouseChampions(enemyHouse.id)
      .then((rows) => {
        if (!cancelled) setChampions(rows)
      })
      .catch(() => {
        // A fetch hiccup here shouldn't block the duel offer — it just
        // means getEnemyDuelFighter() falls back to a procedural fighter,
        // same as a house with no curated champions at all.
        if (!cancelled) setChampions([])
      })
      .finally(() => {
        if (!cancelled) setLoadingChampions(false)
      })
    return () => {
      cancelled = true
    }
  }, [enemyHouse.id])

  const kingEntry = roster.find((r) => r.role.id === 'king')
  const championEntry = roster.find((r) => r.role.id === 'champion')

  const fighterOptions = [
    kingEntry && { role: 'king', label: kingEntry.role.label, character: kingEntry.character },
    championEntry && { role: 'champion', label: championEntry.role.label, character: championEntry.character },
  ].filter(Boolean)

  const handleConfirm = () => {
    const chosen = fighterOptions.find((f) => f.role === selectedRole)
    if (!chosen) return

    try {
      const yourFighter = getDuelFighter(chosen.character)
      const enemyFighter = getEnemyDuelFighter({ enemyHouse, championCandidates: champions })
      const duel = resolveDuel({ yourFighter, enemyFighter })
      const finalResult = finalizeDuelResult({
        outcome: duel.winner === 'you' ? 'victory' : 'defeat',
        enemyArmy: enemySide.armySize,
        enemyGold: enemySide.gold,
      })

      onDuel({
        ...finalResult,
        duelYourFighter: yourFighter.name,
        duelEnemyFighter: enemyFighter.name,
        duelReason: duel.reason ?? null,
      })
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <div className="w-full max-w-sm flex flex-col gap-6 pt-4 pb-4">
      <div className="text-center">
        <p
          className="text-got-parchment/40 text-sm tracking-[0.3em] uppercase"
          style={{ fontFamily: 'Cinzel, serif' }}
        >
          Offer of Single Combat
        </p>
        <h1 className="text-2xl font-bold tracking-wide text-got-gold mt-1" style={{ fontFamily: 'Cinzel, serif' }}>
          {enemyHouse.name}
        </h1>
        <div className="gold-divider mt-3" />
      </div>

      <p className="text-stone-400 text-sm text-center italic leading-relaxed" style={{ fontFamily: 'EB Garamond, serif' }}>
        Your position is overwhelming. {enemyHouse.name} would rather settle this with steel than lose their whole
        army — win the duel and they surrender outright; lose, and the battle is lost with them.
      </p>

      {error && (
        <p className="text-got-red-bright text-sm text-center">{error}</p>
      )}

      <div className="flex flex-col gap-2">
        <p className="text-got-gold/80 text-xs tracking-widest uppercase" style={{ fontFamily: 'Cinzel, serif' }}>
          Choose Your Champion
        </p>
        {fighterOptions.map((f) => {
          const selected = f.role === selectedRole
          return (
            <button
              key={f.role}
              onClick={() => setSelectedRole(f.role)}
              className={[
                'text-left rounded-lg border p-4 transition-all duration-200 active:scale-[0.98]',
                selected
                  ? 'border-got-gold bg-got-gold/10 shadow-lg shadow-got-gold/10'
                  : 'border-stone-700 bg-stone-900/60 hover:border-got-gold/50 hover:bg-stone-900/80',
              ].join(' ')}
            >
              <p
                className="text-stone-500 text-xs tracking-widest uppercase"
                style={{ fontFamily: 'Cinzel, serif' }}
              >
                {f.label}
              </p>
              <p className="text-got-parchment text-lg font-bold" style={{ fontFamily: 'Cinzel, serif' }}>
                {f.character.name}
              </p>
              {f.character.fightingStyle && (
                <p className="text-stone-500 text-xs mt-0.5">
                  {CHAMPION_STYLE_LABELS[f.character.fightingStyle]}
                </p>
              )}
            </button>
          )
        })}
      </div>

      <button
        onClick={handleConfirm}
        disabled={!selectedRole || loadingChampions}
        className="w-full py-4 rounded border border-got-red bg-got-red/10 text-got-red-bright text-lg tracking-widest uppercase transition-all duration-200 hover:bg-got-red/20 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed"
        style={{ fontFamily: 'Cinzel, serif' }}
      >
        {loadingChampions ? 'Scouting their champion...' : 'Confirm Single Combat'}
      </button>

      <button
        onClick={onDecline}
        className="text-stone-600 text-sm text-center hover:text-stone-400 transition-colors"
        style={{ fontFamily: 'Cinzel, serif' }}
      >
        Decline — proceed to open battle
      </button>
    </div>
  )
}