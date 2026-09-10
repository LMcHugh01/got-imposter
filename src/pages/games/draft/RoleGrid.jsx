import { ROLES } from '../../../data/roleWeights'
import { SHOW_DEBUG_NUMBERS } from '../../../config/features'

export default function RoleGrid({ draftState, selectedCharacter, onAssign }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
      {ROLES.map((role) => {
        const filled = draftState.roleAssignments[role.id]

        if (filled) {
          return (
            <div
              key={role.id}
              className="rounded-lg border border-stone-800 bg-stone-900/30 p-3 opacity-50"
            >
              <div className="flex items-center justify-between">
                <p
                  className="text-stone-500 text-xs tracking-widest uppercase"
                  style={{ fontFamily: 'Cinzel, serif' }}
                >
                  {role.label}
                </p>
                <span className="text-stone-600 text-xs">🔒</span>
              </div>
              <p className="text-stone-400 text-sm mt-1 truncate">{filled.name}</p>
              {SHOW_DEBUG_NUMBERS && <p className="text-stone-600 text-xs">{filled.fit}% fit</p>}
            </div>
          )
        }

        const clickable = Boolean(selectedCharacter)

        return (
          <button
            key={role.id}
            onClick={() => clickable && onAssign(role.id)}
            disabled={!clickable}
            className={[
              'text-left rounded-lg border p-3 transition-all duration-200',
              clickable
                ? 'border-got-gold/40 bg-got-gold/5 hover:border-got-gold hover:bg-got-gold/10 active:scale-[0.98] cursor-pointer'
                : 'border-stone-700 bg-stone-900/60 cursor-default',
            ].join(' ')}
          >
            <p
              className={[
                'text-xs tracking-widest uppercase',
                clickable ? 'text-got-gold' : 'text-got-parchment/60',
              ].join(' ')}
              style={{ fontFamily: 'Cinzel, serif' }}
            >
              {role.label}
            </p>
            <p className="text-stone-600 text-xs mt-1">Open</p>
          </button>
        )
      })}
    </div>
  )
}