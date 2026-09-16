import { useState } from 'react'
import { fetchRandomEnemyHouse } from '../../../lib/enemyHouseService'
import { recruit, recover } from '../../../gameEngine/economy'
import { attemptAlliance, computeAllianceChance } from '../../../gameEngine/diplomacy'
import { gatherIntelligence } from '../../../gameEngine/intelligence'
import { SHOW_DEBUG_NUMBERS } from '../../../config/features'

const RECRUIT_PRESETS = [2000, 5000, 10000]
const RECOVER_PRESETS = [2000, 3000, 5000]
const TROOP_TYPE_LABELS = { infantry: 'Infantry', archers: 'Archers', cavalry: 'Cavalry' }
const SOLDIER_STEP = 500
const GOLD_STEP = 500
const MIN_SOLDIERS_REQUESTED = 500
const MAX_SOLDIERS_REQUESTED = 20000
const MIN_GOLD_OFFERED = 500

export default function CampaignAction({ resources, enemyHouse, economyInputs, onComplete }) {
  const [view, setView] = useState('menu') // menu | recruit | recover | diplomacy | intelligence
  const [diplomacyTarget, setDiplomacyTarget] = useState(null)
  const [diplomacyRange, setDiplomacyRange] = useState(null)
  const [soldiersRequested, setSoldiersRequested] = useState(2000)
  const [goldOffered, setGoldOffered] = useState(2500)
  const [loadingTarget, setLoadingTarget] = useState(false)
  const [resultMessage, setResultMessage] = useState(null)
  const [pendingResources, setPendingResources] = useState(null)
  const [intelReport, setIntelReport] = useState(null)
  const [recruitTroopType, setRecruitTroopType] = useState('infantry')

  const { masterOfCoinRating, diplomacyRating, masterOfWhispersRating, grandMaesterRating, masterOfLawsRating } = economyInputs

  const handleSkip = () => onComplete({ resources, scouted: false, intelReport: null })

  const handleContinueAfterAction = () => {
    onComplete({
      resources: pendingResources ?? resources,
      scouted: view === 'intelligence',
      intelReport,
    })
  }

  const handleRecruit = (amount) => {
    const { resources: next, soldiersGained } = recruit({ resources, goldToSpend: amount, masterOfCoinRating, troopType: recruitTroopType })
    setPendingResources(next)
    setResultMessage(`+${soldiersGained.toLocaleString()} ${TROOP_TYPE_LABELS[recruitTroopType]} recruited.`)
  }

  const handleRecover = (amount) => {
    const { resources: next, soldiersReturned, moraleGained } = recover({
      resources,
      goldToSpend: amount,
      grandMaesterRating,
      masterOfLawsRating,
    })
    setPendingResources(next)
    setResultMessage(`+${soldiersReturned.toLocaleString()} soldiers returned, +${moraleGained} morale.`)
  }

  const handleOpenDiplomacy = async () => {
    setView('diplomacy')
    setLoadingTarget(true)
    try {
      const target = await fetchRandomEnemyHouse(null, [enemyHouse.id])
      setDiplomacyTarget(target)
      // Their army is intel same as any other — a range, never the exact
      // number, scaled by your Master of Whispers.
      setDiplomacyRange(gatherIntelligence({ masterOfWhispersRating, enemyHouse: target }))
      setSoldiersRequested(2000)
      setGoldOffered(Math.min(2500, resources.gold))
    } catch {
      setResultMessage('Could not find a house to approach.')
    } finally {
      setLoadingTarget(false)
    }
  }

  const handleProposeAlliance = () => {
    const result = attemptAlliance({
      resources,
      diplomacyRating,
      goldOffered,
      soldiersRequested,
      targetHouseName: diplomacyTarget.name,
      enemyHouse: diplomacyTarget,
    })
    setPendingResources(result.resources)
    setResultMessage(
      result.accepted
        ? `${diplomacyTarget.name} agrees to your terms. +${soldiersRequested.toLocaleString()} allied soldiers.`
        : `${diplomacyTarget.name} has refused your proposal. "Your cause is not ours."`
    )
  }

  const handleGatherIntelligence = () => {
    const report = gatherIntelligence({ masterOfWhispersRating, enemyHouse })
    setIntelReport(report)
    setView('intelligence')
  }

  if (view === 'menu' && !resultMessage) {
    return (
      <div className="w-full max-w-sm flex flex-col gap-3 pt-4 pb-4">
        <div className="text-center">
          <p
            className="text-got-parchment/40 text-sm tracking-[0.3em] uppercase"
            style={{ fontFamily: 'Cinzel, serif' }}
          >
            Before the Battle
          </p>
          <h2 className="text-2xl font-bold text-got-gold tracking-wide mt-1" style={{ fontFamily: 'Cinzel, serif' }}>
            Choose an Action
          </h2>
          <p className="text-stone-500 text-xs mt-2">{resources.gold.toLocaleString()} gold available</p>
          <div className="gold-divider mt-3" />
        </div>

        <ActionButton title="Recruit" blurb="Spend gold to gain soldiers." onClick={() => setView('recruit')} />
        <ActionButton title="Diplomacy" blurb="Negotiate an alliance on your terms." onClick={handleOpenDiplomacy} />
        <ActionButton title="Gather Intelligence" blurb="Reveal details about your opponent." onClick={handleGatherIntelligence} />
        <ActionButton title="Recover" blurb="Heal wounded soldiers, raise morale." onClick={() => setView('recover')} />

        <button
          onClick={handleSkip}
          className="text-stone-600 text-sm text-center hover:text-stone-400 transition-colors mt-2"
          style={{ fontFamily: 'Cinzel, serif' }}
        >
          Skip — go straight to battle
        </button>
      </div>
    )
  }

  if (view === 'recruit' && !resultMessage) {
    return (
      <ActionSpendScreen
        title="Recruit Soldiers"
        gold={resources.gold}
        presets={RECRUIT_PRESETS}
        onSpend={handleRecruit}
        onBack={() => setView('menu')}
        extra={<TroopTypeSelector value={recruitTroopType} onChange={setRecruitTroopType} />}
      />
    )
  }

  if (view === 'recover' && !resultMessage) {
    return (
      <ActionSpendScreen
        title="Recover"
        gold={resources.gold}
        presets={RECOVER_PRESETS}
        onSpend={handleRecover}
        onBack={() => setView('menu')}
      />
    )
  }

  if (view === 'diplomacy' && !resultMessage) {
    const chance = diplomacyTarget
      ? computeAllianceChance({ diplomacyRating, goldOffered, soldiersRequested, enemyHouse: diplomacyTarget })
      : null

    return (
      <div className="w-full max-w-sm flex flex-col gap-4 pt-4 pb-4">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-got-gold tracking-wide" style={{ fontFamily: 'Cinzel, serif' }}>
            Diplomacy
          </h2>
          <div className="gold-divider mt-3" />
        </div>

        {loadingTarget ? (
          <p className="text-stone-500 text-center">Sending ravens...</p>
        ) : diplomacyTarget ? (
          <>
            <div className="rounded-lg border border-stone-700 bg-stone-900/60 p-4 text-center">
              <p className="text-got-gold text-lg" style={{ fontFamily: 'Cinzel, serif' }}>
                {diplomacyTarget.name}
              </p>
              <p className="text-stone-500 text-sm mt-1">
                Army: {diplomacyRange.armyRangeLow.toLocaleString()}–{diplomacyRange.armyRangeHigh.toLocaleString()}
              </p>
            </div>

            <Stepper
              label="Soldiers Requested"
              value={soldiersRequested}
              min={MIN_SOLDIERS_REQUESTED}
              max={MAX_SOLDIERS_REQUESTED}
              step={SOLDIER_STEP}
              onChange={setSoldiersRequested}
            />

            <Stepper
              label="Gold Offered"
              value={goldOffered}
              min={MIN_GOLD_OFFERED}
              max={resources.gold}
              step={GOLD_STEP}
              onChange={setGoldOffered}
            />

            {SHOW_DEBUG_NUMBERS && chance !== null && (
              <p className="text-stone-600 text-xs text-center">Chance of support: {Math.round(chance * 100)}%</p>
            )}

            <button
              onClick={handleProposeAlliance}
              disabled={resources.gold < goldOffered}
              className="w-full py-3 rounded border border-got-gold bg-got-gold/10 text-got-gold tracking-widest uppercase disabled:opacity-40"
              style={{ fontFamily: 'Cinzel, serif' }}
            >
              Propose Alliance
            </button>
          </>
        ) : null}

        <button
          onClick={() => setView('menu')}
          className="text-stone-600 text-sm text-center hover:text-stone-400"
          style={{ fontFamily: 'Cinzel, serif' }}
        >
          ← Back
        </button>
      </div>
    )
  }

  if (view === 'intelligence') {
    return (
      <div className="w-full max-w-sm flex flex-col gap-4 pt-4 pb-4">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-got-gold tracking-wide" style={{ fontFamily: 'Cinzel, serif' }}>
            Scouting Report
          </h2>
          <div className="gold-divider mt-3" />
        </div>
        <div className="rounded-lg border border-stone-700 bg-stone-900/60 p-4 flex flex-col gap-2">
          <div className="flex justify-between">
            <span className="text-stone-500 text-sm">Enemy army</span>
            <span className="text-got-parchment">
              {intelReport.armyRangeLow.toLocaleString()}–{intelReport.armyRangeHigh.toLocaleString()}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-stone-500 text-sm">Morale</span>
            <span className="text-got-parchment">
              {intelReport.moraleRangeLow}–{intelReport.moraleRangeHigh}
            </span>
          </div>
          <div className="flex justify-between items-start">
            <span className="text-stone-500 text-sm">Could be</span>
            <span className="text-got-parchment capitalize text-right">
              {intelReport.personalityShortlist.join(' / ')}
            </span>
          </div>
        </div>
        <button
          onClick={handleContinueAfterAction}
          className="w-full py-4 rounded border border-got-gold bg-got-gold/10 text-got-gold text-lg tracking-widest uppercase hover:bg-got-gold/20"
          style={{ fontFamily: 'Cinzel, serif' }}
        >
          Continue to Battle
        </button>
      </div>
    )
  }

  if (resultMessage) {
    return (
      <div className="w-full max-w-sm flex flex-col gap-4 pt-4 pb-4 text-center">
        <div className="text-6xl">📜</div>
        <p className="text-got-gold-light text-lg" style={{ fontFamily: 'EB Garamond, serif' }}>
          {resultMessage}
        </p>
        <button
          onClick={handleContinueAfterAction}
          className="w-full py-4 rounded border border-got-gold bg-got-gold/10 text-got-gold text-lg tracking-widest uppercase hover:bg-got-gold/20"
          style={{ fontFamily: 'Cinzel, serif' }}
        >
          Continue to Battle
        </button>
      </div>
    )
  }

  return null
}

function ActionButton({ title, blurb, onClick }) {
  return (
    <button
      onClick={onClick}
      className="text-left rounded-lg border border-stone-700 bg-stone-900/60 p-4 hover:border-got-gold/50 transition-all duration-200"
    >
      <p className="text-got-gold" style={{ fontFamily: 'Cinzel, serif' }}>
        {title}
      </p>
      <p className="text-stone-500 text-xs mt-0.5 italic" style={{ fontFamily: 'EB Garamond, serif' }}>
        {blurb}
      </p>
    </button>
  )
}

function ActionSpendScreen({ title, gold, presets, onSpend, onBack, extra = null }) {
  return (
    <div className="w-full max-w-sm flex flex-col gap-4 pt-4 pb-4">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-got-gold tracking-wide" style={{ fontFamily: 'Cinzel, serif' }}>
          {title}
        </h2>
        <p className="text-stone-500 text-xs mt-1">{gold.toLocaleString()} gold available</p>
        <div className="gold-divider mt-3" />
      </div>
      {extra}
      <div className="flex flex-col gap-2">
        {presets.map((amount) => (
          <button
            key={amount}
            onClick={() => onSpend(amount)}
            disabled={gold < amount}
            className="w-full py-3 rounded border border-stone-700 bg-stone-900/60 text-got-parchment hover:border-got-gold/50 disabled:opacity-40 transition-all duration-200"
            style={{ fontFamily: 'Cinzel, serif' }}
          >
            Spend {amount.toLocaleString()} gold
          </button>
        ))}
      </div>
      <button
        onClick={onBack}
        className="text-stone-600 text-sm text-center hover:text-stone-400"
        style={{ fontFamily: 'Cinzel, serif' }}
      >
        ← Back
      </button>
    </div>
  )
}

// Recruit-only (BATTLE_PLAN.md §5) — the one pre-battle action where the
// player actively picks composition. Not passed to Recover's
// ActionSpendScreen, which stays untouched — Recover reinforces whatever
// mix you already have, proportionally, via resources.js's generic
// army-delta split.
function TroopTypeSelector({ value, onChange }) {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-got-gold/80 text-xs tracking-widest uppercase" style={{ fontFamily: 'Cinzel, serif' }}>
        Troop Type
      </p>
      <div className="grid grid-cols-3 gap-2">
        {Object.keys(TROOP_TYPE_LABELS).map((type) => {
          const selected = type === value
          return (
            <button
              key={type}
              onClick={() => onChange(type)}
              className={[
                'rounded-lg border py-2 text-sm transition-all duration-200',
                selected
                  ? 'border-got-gold bg-got-gold/10 text-got-gold'
                  : 'border-stone-700 bg-stone-900/60 text-got-parchment hover:border-got-gold/50',
              ].join(' ')}
              style={{ fontFamily: 'Cinzel, serif' }}
            >
              {TROOP_TYPE_LABELS[type]}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function Stepper({ label, value, min, max, step, onChange }) {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-got-gold/80 text-xs tracking-widest uppercase" style={{ fontFamily: 'Cinzel, serif' }}>
        {label}
      </p>
      <div className="flex items-center gap-3">
        <button
          onClick={() => onChange(Math.max(min, value - step))}
          disabled={value <= min}
          className="w-10 h-10 rounded border border-stone-700 text-got-parchment text-xl flex items-center justify-center disabled:opacity-30 hover:border-got-gold/50 hover:text-got-gold active:scale-95 transition-all"
        >
          −
        </button>
        <span className="flex-1 text-center text-lg text-got-gold font-bold" style={{ fontFamily: 'Cinzel, serif' }}>
          {value.toLocaleString()}
        </span>
        <button
          onClick={() => onChange(Math.min(max, value + step))}
          disabled={value >= max}
          className="w-10 h-10 rounded border border-stone-700 text-got-parchment text-xl flex items-center justify-center disabled:opacity-30 hover:border-got-gold/50 hover:text-got-gold active:scale-95 transition-all"
        >
          +
        </button>
      </div>
    </div>
  )
}