import { useState, useMemo } from 'react'
import { extractCouncilEconomyInputs } from '../../../../gameEngine/battleEngine'
import { canOfferDuelForBattle } from '../../../../gameEngine/duelEngine'
import { gatherIntelligence } from '../../../../gameEngine/intelligence'
import { TOTAL_BATTLES } from '../../../../gameEngine/campaign'
import { buildBattleSides } from '../battle/battleSides'
import CouncilOverview from './CouncilOverview'
import ResourcesBar from './ResourcesBar'
import PreBattleActionModal from './PreBattleActionModal'
import EnemyScoutReport from './EnemyScoutReport'
import PrepareForBattleModal from './PrepareForBattleModal'
import DuelOffer from '../battle/DuelOffer'
import SectionHeading from './SectionHeading'

// Presentational only — battle number as a roman numeral, matching the
// new design's header. Falls back to the plain number past what a
// campaign would realistically reach.
function toRoman(num) {
  const table = [
    [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I'],
  ]
  if (num < 1 || num > 20) return String(num)
  let n = num
  let out = ''
  for (const [value, symbol] of table) {
    while (n >= value) {
      out += symbol
      n -= value
    }
  }
  return out
}

/**
 * pages/games/draft/CampaignDashboard.jsx
 *
 * Your Council, Your Resources, Council Orders, and the Enemy Scout
 * Report (or Duel Offer, when one's on the table) all stay in view at
 * once, with a sticky footer bar holding the two actions that used to
 * live as in-panel buttons: Give an Order (opens PreBattleActionModal,
 * wrapping the unmodified CampaignAction) and Prepare for Battle (opens
 * PrepareForBattleModal). The Duel Offer keeps its own inline
 * accept/decline buttons — there's nothing to "prepare" until it's
 * resolved, so the footer's second button is hidden while it's showing.
 *
 * All the "which screen resolves to what" state below (whether an order
 * has been given this round, a declined duel, the chosen formation) is
 * deliberately local to this component rather than lifted to Draft.jsx:
 * Draft.jsx only renders this component while status === 'dashboard', so
 * it fully unmounts/remounts between battles (and on a retreat) and this
 * state resets for free with it. Only the things that must survive the
 * jump to the separate Battle page — campaign.resources, scouted,
 * intelReport — are still owned by Draft.jsx and passed in as props.
 */
export default function CampaignDashboard({
  houseName,
  campaign,
  enemyHouse,
  engagement,
  scouted,
  intelReport,
  onActionComplete,
  onMarch,
  onDuelResult,
}) {
  const [showActionModal, setShowActionModal] = useState(false)
  const [actionTaken, setActionTaken] = useState(false)
  const [duelDeclined, setDuelDeclined] = useState(false)
  const [showPrepareModal, setShowPrepareModal] = useState(false)
  // Neither preselected — Prepare for Battle's "Go to Battle" only
  // enables once the player has actively chosen both.
  const [formationId, setFormationId] = useState(null)
  const [strategyId, setStrategyId] = useState(null)

  const handleActionComplete = ({ resources: nextResources, scouted: didScout, intelReport: report }) => {
    const tookAction = didScout || nextResources !== campaign.resources
    onActionComplete({ resources: nextResources, scouted: didScout, intelReport: report })
    setActionTaken(tookAction)
    setShowActionModal(false)
    if (didScout) {
      setTimeout(() => {
        document.getElementById('enemy-scout-report')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }, 50)
    }
  }

  const { yourSide, enemySide } = buildBattleSides(campaign, enemyHouse, scouted)

  // Memoized on `enemyHouse` alone — this must NOT recompute on every
  // re-render (picking a Formation, opening a modal, etc.), or the
  // enemy's displayed army range would visibly reshuffle itself from
  // unrelated clicks.
  const blindReport = useMemo(
    () => gatherIntelligence({ masterOfWhispersRating: 0, enemyHouse }),
    [enemyHouse]
  )
  const report = scouted && intelReport ? intelReport : blindReport

  const economyInputs = extractCouncilEconomyInputs(campaign.roster)
  // The real accuracy that produced `report` — economyInputs.masterOfWhispersRating
  // is exactly what CampaignAction's Gather Intelligence action itself
  // passes to gatherIntelligence(); 0 when this round hasn't been
  // scouted, matching the blind report above.
  const intelRating = scouted ? economyInputs.masterOfWhispersRating : 0

  // A duel replaces the fight outright — doesn't make sense to offer one
  // when resuming an engagement you already committed to open battle on
  // and retreated from mid-fight.
  const duelAvailable = !engagement && !duelDeclined && canOfferDuelForBattle(yourSide, enemySide)

  const handleGoToBattle = () => {
    if (engagement) {
      onMarch(null, null)
    } else {
      onMarch(formationId, strategyId)
    }
    setShowPrepareModal(false)
  }

  return (
    <div className="w-full max-w-5xl flex flex-col gap-8 pb-28">
      {/* Header */}
      <header className="text-center pt-2 pb-4">
        <p className="text-stone-500 text-[11px] tracking-[0.38em] uppercase" style={{ fontFamily: 'Cinzel, serif' }}>
          Campaign · Battle {toRoman(campaign.battleNumber)} of {TOTAL_BATTLES}
        </p>
        <div className="flex items-center justify-center gap-4 mt-3">
          <div className="flex-1 max-w-[110px] h-px bg-gradient-to-r from-transparent to-stone-700" />
          <h1 className="text-got-parchment text-2xl font-bold tracking-wide" style={{ fontFamily: 'Cinzel, serif' }}>
            House {houseName}
          </h1>
          <div className="flex-1 max-w-[110px] h-px bg-gradient-to-l from-transparent to-stone-700" />
        </div>
        {engagement && (
          <p className="text-got-gold/60 text-sm mt-2 italic" style={{ fontFamily: 'EB Garamond, serif' }}>
            You have regrouped. Give an order if you'd like, then return to the field.
          </p>
        )}
      </header>

      <CouncilOverview roster={campaign.roster} />

      <div className="pt-1 border-t border-stone-800">
        <ResourcesBar resources={campaign.resources} />
      </div>

      {/* Council Orders — informational only; the action lives in the
          sticky footer below. */}
      <section className="flex flex-col gap-4 pt-1 border-t border-stone-800">
        <SectionHeading label="Council Orders" trailing={actionTaken ? 'Order given' : '1 available'} />
        <div className="flex items-center gap-5">
          <div
            className="w-[52px] h-[52px] shrink-0 rounded-full flex items-center justify-center"
            style={{
              border: `1px solid ${actionTaken ? '#8c6a3c' : '#3a3122'}`,
              background: actionTaken
                ? 'radial-gradient(circle at 40% 35%, rgba(201,167,90,.22), #15110c)'
                : 'radial-gradient(circle at 40% 35%, #17130e, #0b0a08)',
            }}
          >
            <span className="text-xl">{actionTaken ? '📜' : '🕊️'}</span>
          </div>
          <div className="min-w-0">
            <p className="text-got-parchment text-base" style={{ fontFamily: 'Cinzel, serif' }}>
              {actionTaken ? 'An order has been carried out' : 'No order given yet'}
            </p>
            <p className="text-stone-500 text-sm mt-1 max-w-[52ch]">
              {actionTaken
                ? 'The council awaits the field.'
                : 'One order stands between you and the enemy line. Recruit, treat, scout, or rest.'}
            </p>
          </div>
        </div>
      </section>

      {duelAvailable ? (
        <div className="pt-1 border-t border-stone-800">
          <DuelOffer
            roster={campaign.roster}
            enemyHouse={enemyHouse}
            enemySide={enemySide}
            onDuel={onDuelResult}
            onDecline={() => setDuelDeclined(true)}
          />
        </div>
      ) : (
        <EnemyScoutReport yourSide={yourSide} enemySide={enemySide} report={report} intelRating={intelRating} />
      )}

      {/* Sticky footer actions */}
      <div className="fixed left-0 right-0 bottom-0 z-40 border-t border-stone-800 bg-got-black/95 backdrop-blur-sm">
        <div className="max-w-5xl mx-auto px-4 py-3 flex gap-3">
          <button
            onClick={() => setShowActionModal(true)}
            disabled={actionTaken}
            className="flex-1 py-3.5 rounded border border-got-gold/50 text-got-gold text-sm tracking-widest uppercase transition-all duration-200 hover:bg-got-gold/10 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent"
            style={{ fontFamily: 'Cinzel, serif' }}
          >
            {actionTaken ? 'Order Given' : 'Give an Order'}
          </button>
          {!duelAvailable && (
            <button
              onClick={() => setShowPrepareModal(true)}
              className="flex-1 py-3.5 rounded border border-got-red bg-got-red/10 text-got-red-bright text-sm font-bold tracking-widest uppercase transition-all duration-200 hover:bg-got-red/20 active:scale-[0.98]"
              style={{ fontFamily: 'Cinzel, serif' }}
            >
              {engagement ? 'Resume Battle' : 'Prepare for Battle'}
            </button>
          )}
        </div>
      </div>

      {showActionModal && (
        <PreBattleActionModal
          resources={campaign.resources}
          enemyHouse={enemyHouse}
          economyInputs={economyInputs}
          onComplete={handleActionComplete}
        />
      )}

      {showPrepareModal && (
        <PrepareForBattleModal
          yourSide={yourSide}
          enemySide={enemySide}
          terrainShortlist={report.terrainShortlist}
          formationId={formationId}
          strategyId={strategyId}
          onFormationChange={setFormationId}
          onStrategyChange={setStrategyId}
          onBack={() => setShowPrepareModal(false)}
          onGoToBattle={handleGoToBattle}
          resuming={Boolean(engagement)}
        />
      )}
    </div>
  )
}