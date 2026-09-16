import { ROLES } from '../../../data/roleWeights'
import RoleScoreBadge from '../../../components/RoleScoreBadge'

// Purely decorative short codes for the council row badges — cosmetic
// only, mirrors the existing ATTRIBUTE_SHORT_LABELS pattern. Not used by
// any game logic.
const ROLE_CODES = {
  king: 'KING',
  consort: 'CONS',
  hand: 'HAND',
  kingsguard: 'KG',
  champion: 'CHMP',
  masterOfWhispers: 'WHISP',
  grandMaester: 'MAES',
  masterOfCoin: 'COIN',
  masterOfLaws: 'LAWS',
  commander: 'CMDR',
}

export default function RoleGrid({ draftState, selectedCharacter, onAssign }) {
  return (
    <div>
      <div className="flex items-center gap-3 mb-3">
        <p
          className="text-got-parchment/40 text-xs tracking-[0.26em] uppercase whitespace-nowrap"
          style={{ fontFamily: 'Cinzel, serif' }}
        >
          Your Council
        </p>
        <div className="flex-1 h-px bg-stone-800" />
      </div>

      <div className="flex flex-col gap-1.5">
        {ROLES.map((role) => {
          const filled = draftState.roleAssignments[role.id]
          const clickable = !filled && Boolean(selectedCharacter)

          return (
            <button
              key={role.id}
              onClick={() => clickable && onAssign(role.id)}
              disabled={!clickable}
              className={[
                'flex items-center gap-3 rounded-lg border p-2.5 text-left transition-all duration-200',
                filled
                  ? 'border-stone-800 bg-stone-900/40'
                  : clickable
                  ? 'border-got-gold/40 bg-got-gold/5 hover:border-got-gold hover:bg-got-gold/10 active:scale-[0.98] cursor-pointer'
                  : 'border-stone-800 bg-transparent cursor-default',
              ].join(' ')}
            >
              <div
                className={[
                  'shrink-0 rounded border px-2 py-1.5 text-center text-[10px] tracking-widest uppercase',
                  filled ? 'border-stone-700 text-got-parchment/60' : 'border-stone-800 text-stone-600',
                ].join(' ')}
                style={{ fontFamily: 'Cinzel, serif', minWidth: '3.25rem' }}
              >
                {ROLE_CODES[role.id] ?? role.label.slice(0, 4)}
              </div>

              <div className="min-w-0 flex-1">
                <p
                  className="text-stone-500 text-[11px] tracking-widest uppercase truncate"
                  style={{ fontFamily: 'Cinzel, serif' }}
                >
                  {role.label}
                </p>
                <p
                  className={[
                    'text-sm mt-0.5 truncate',
                    filled ? 'text-got-parchment' : clickable ? 'text-got-gold italic' : 'text-stone-600 italic',
                  ].join(' ')}
                >
                  {filled ? filled.name : clickable ? 'Choose above' : 'Open'}
                </p>
              </div>

              {filled ? (
                <RoleScoreBadge score={filled.fit} size="sm" />
              ) : (
                <span className="text-stone-700 text-xs shrink-0">—</span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}