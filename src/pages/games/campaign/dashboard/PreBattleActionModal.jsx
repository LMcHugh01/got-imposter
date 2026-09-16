import CampaignAction from './CampaignAction'

/**
 * pages/games/draft/PreBattleActionModal.jsx
 *
 * Wraps the existing CampaignAction component (completely unmodified —
 * same Recruit/Diplomacy/Intelligence/Recover flow, same economy logic)
 * in modal chrome so it opens as an overlay on the Campaign Dashboard
 * instead of taking over the whole screen. Backdrop click behaves exactly
 * like CampaignAction's own "Skip" — no resources spent, nothing scouted.
 */
export default function PreBattleActionModal({ resources, enemyHouse, economyInputs, onComplete }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
      <div
        onClick={() => onComplete({ resources, scouted: false, intelReport: null })}
        className="absolute inset-0 bg-black/80"
      />
      <div
        className="relative w-full max-w-md max-h-[85vh] overflow-y-auto border-t border-got-gold/30 bg-got-charcoal p-6 sm:rounded-lg sm:border"
        style={{ background: 'linear-gradient(#15110c, #0e0c0a)' }}
      >
        <CampaignAction resources={resources} enemyHouse={enemyHouse} economyInputs={economyInputs} onComplete={onComplete} />
      </div>
    </div>
  )
}
