import { useState, useMemo } from 'react'
import { extractCouncilEconomyInputs } from '../../../gameEngine/battleEngine'
import { canOfferDuelForBattle } from '../../../gameEngine/duelEngine'
import { gatherIntelligence } from '../../../gameEngine/intelligence'
import { TOTAL_BATTLES } from '../../../gameEngine/campaign'
import { buildBattleSides } from './battleSides'
import CouncilOverview from './CouncilOverview'
import ResourcesBar from './ResourcesBar'
import PreBattleActionModal from './PreBattleActionModal'
import EnemyScoutReport from './EnemyScoutReport'
import PrepareForBattleModal from './PrepareForBattleModal'
import DuelOffer from './DuelOffer'

/**
 * pages/games/draft/CampaignDashboard.jsx
 *
 * Replaces the old campaignAction -> duelOffer hop with a single screen:
 * Your Council and Your Resources stay in view the whole time, Council
 * Orders (the pre-battle action — Recruit/Diplomacy/Intelligence/Recover)
 * opens as a modal on top of it, and the Enemy Scout Report — every
 * fogged stat/shortlist your intelligence has turned up — sits right
 * below with the "Prepare for Battle" button that opens the final
 * Formation/Strategy modal.
 *
 * All the "which screen resolves to what" state below (whether an action
 * has been taken this round, a declined duel, the chosen formation) is
 * deliberately local to this component rather than lifted to Draft.jsx:
 * Draft.jsx only renders this component while status === 'dashboard', so
 * it fully unmounts/remounts between battles (and on a retreat) and this
 * state resets for free with it. Only the things that must survive the
 * jump to the separate Battle page — campaign.resources, scouted,
 * intelReport — are still owned by Draft.jsx and passed in as props.
 */
export default function CampaignDashboard({
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

  // When the action was Gather Intelligence, closing the modal isn't the
  // end of it — the player asked to be taken TO the updated report, not
  // just dropped back on the dashboard. A brief timeout lets the modal
  // finish unmounting before scrolling, since scrolling to an element
  // still behind the modal's fixed overlay would look like nothing
  // happened.
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

  // Bug fix: this used to be called directly in the render body, which
  // re-ran gatherIntelligence's Math.random()-driven split on every
  // re-render this component had for ANY reason (e.g. picking a
  // Formation in the modal) — the enemy's displayed army range would
  // visibly shuffle itself just from clicking around. Memoized on
  // `enemyHouse` so the blind default report is computed once per battle
  // round, exactly like the real Gather Intelligence report already was.
  const blindReport = useMemo(
    () => gatherIntelligence({ masterOfWhispersRating: 0, enemyHouse }),
    [enemyHouse]
  )
  const report = scouted && intelReport ? intelReport : blindReport

  // A duel replaces the fight outright — doesn't make sense to offer one
  // when resuming an engagement you already committed to open battle on
  // and retreated from mid-fight.
  const duelAvailable = !engagement && !duelDeclined && canOfferDuelForBattle(yourSide, enemySide)

  const economyInputs = extractCouncilEconomyInputs(campaign.roster)

  const handleGoToBattle = () => {
    if (engagement) {
      onMarch(null, null)
    } else {
      onMarch(formationId, strategyId)
    }
    setShowPrepareModal(false)
  }

  return (
    <div className="w-full max-w-5xl flex flex-col gap-6 pt-2 pb-4">
      <div className="text-center">
        <p className="text-stone-600 text-xs tracking-[0.3em] uppercase" style={{ fontFamily: 'Cinzel, serif' }}>
          Battle {campaign.battleNumber} of {TOTAL_BATTLES}
        </p>
        {engagement && (
          <p className="text-got-gold/60 text-xs mt-1 italic" style={{ fontFamily: 'EB Garamond, serif' }}>
            You have regrouped. Issue another order if you'd like, then return to the field.
          </p>
        )}
      </div>

      <CouncilOverview roster={campaign.roster} />

      <ResourcesBar resources={campaign.resources} />

      <div className="rounded-lg border border-stone-700 bg-stone-900/60 p-5 flex items-center justify-between gap-4">
        <div>
          <p
            className="text-got-parchment/40 text-xs tracking-[0.3em] uppercase"
            style={{ fontFamily: 'Cinzel, serif' }}
          >
            Council Orders
          </p>
          <p className="text-stone-400 text-sm mt-1">
            {actionTaken ? 'An order has been given this round.' : 'No order given yet — one available before this battle.'}
          </p>
        </div>
        <button
          onClick={() => setShowActionModal(true)}
          disabled={actionTaken}
          className="shrink-0 py-2.5 px-5 rounded border border-got-gold/50 text-got-gold text-sm tracking-widest uppercase transition-all duration-200 hover:bg-got-gold/10 disabled:opacity-30 disabled:cursor-not-allowed"
          style={{ fontFamily: 'Cinzel, serif' }}
        >
          {actionTaken ? 'Done' : 'Give an Order'}
        </button>
      </div>

      {duelAvailable ? (
        <DuelOffer
          roster={campaign.roster}
          enemyHouse={enemyHouse}
          enemySide={enemySide}
          onDuel={onDuelResult}
          onDecline={() => setDuelDeclined(true)}
        />
      ) : (
        <EnemyScoutReport
          yourSide={yourSide}
          enemySide={enemySide}
          report={report}
          resuming={Boolean(engagement)}
          onPrepareForBattle={() => setShowPrepareModal(true)}
        />
      )}

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