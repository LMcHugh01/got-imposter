import { roleRating, isRoleRatable, ROLE_STYLE_KEY, STYLE_MISSING_REASON } from '../../../../gameEngine/ratings'
import { STAT_CONTRIBUTORS, STAT_LABELS, ratingLabel } from '../../../../gameEngine/houseStats'
import { ATTRIBUTE_LABELS } from '../../../../data/attributes'
import { CHAMPION_STYLE_LABELS } from '../../../../data/championStyles'
import { LEADERSHIP_STYLE_LABELS } from '../../../../data/leadershipStyles'
import { COMMAND_STYLE_LABELS } from '../../../../data/commandStyles'
import { COIN_STYLE_LABELS } from '../../../../data/coinStyles'

// Which label map to read a character's assigned style from, per style
// field — lets the "sub-label under the name" row below stay generic
// instead of one more hardcoded champion-only check.
const STYLE_LABELS_FOR_KEY = {
  fightingStyle: CHAMPION_STYLE_LABELS,
  leadershipStyle: LEADERSHIP_STYLE_LABELS,
  commandStyle: COMMAND_STYLE_LABELS,
  coinStyle: COIN_STYLE_LABELS,
}

/**
 * pages/games/draft/HouseStatModal.jsx
 *
 * Opened by clicking one of the 6 house-stat cards on CouncilOverview.
 * Shows exactly which role/character/attribute fed that stat and the
 * fit%-scaled number each one actually contributed — reading straight off
 * STAT_CONTRIBUTORS (the same config computeHouseStats() itself uses) and
 * calling roleRating() the same way effectiveAttribute() does internally,
 * so nothing here can drift from the number shown on the card. `value` is
 * passed in from the parent's already-computed `stats[statId]` rather
 * than recalculated here, for the same reason.
 */
export default function HouseStatModal({ statId, value, roster, onClose }) {
  const contributors = STAT_CONTRIBUTORS[statId]
  const byRole = Object.fromEntries(roster.map(({ role, character }) => [role.id, { role, character }]))

  // Grouped by role for display (a role can feed a stat with more than
  // one attribute, e.g. Commander's Strategy + Battle Morale for
  // Military) — but note the AVERAGE shown at the bottom is the flat
  // average across every individual row, exactly matching
  // computeHouseStats's own math, not an average-of-role-averages.
  const groups = []
  const excluded = []
  const byRoleGroup = new Map()

  for (const { role: roleId, attr } of contributors) {
    const entry = byRole[roleId]
    if (!entry) {
      excluded.push({ roleId, reason: 'Seat not filled' })
      continue
    }
    const { role, character } = entry
    if (!isRoleRatable(roleId, character)) {
      const styleKey = ROLE_STYLE_KEY[roleId]
      excluded.push({ roleId, role, character, reason: STYLE_MISSING_REASON[styleKey] })
      continue
    }
    const fit = roleRating(character.attributes, roleId, character)
    const rawValue = character.attributes[attr]
    const effective = rawValue * (fit / 100)

    if (!byRoleGroup.has(roleId)) {
      const group = { role, character, fit, rows: [] }
      byRoleGroup.set(roleId, group)
      groups.push(group)
    }
    byRoleGroup.get(roleId).rows.push({ attr, rawValue, effective })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
      <div onClick={onClose} className="absolute inset-0 bg-black/80" />
      <div
        className="relative w-full max-w-md max-h-[85vh] overflow-y-auto border-t border-got-gold/30 bg-got-charcoal p-6 sm:rounded-lg sm:border flex flex-col gap-5"
        style={{ background: 'linear-gradient(#15110c, #0e0c0a)' }}
      >
        <div className="text-center">
          <p
            className="text-got-parchment/40 text-xs tracking-[0.3em] uppercase"
            style={{ fontFamily: 'Cinzel, serif' }}
          >
            House Stat Breakdown
          </p>
          <h2 className="text-2xl font-bold text-got-gold tracking-wide mt-1" style={{ fontFamily: 'Cinzel, serif' }}>
            {STAT_LABELS[statId]}
          </h2>
          <p className="text-got-gold text-4xl font-black mt-2" style={{ fontFamily: 'Cinzel, serif' }}>
            {value}
          </p>
          <p className="text-stone-500 text-xs mt-1 italic" style={{ fontFamily: 'EB Garamond, serif' }}>
            {ratingLabel(value)} — average of every contribution below
          </p>
        </div>

        <div className="gold-divider" />

        <div className="flex flex-col gap-3">
          {groups.map(({ role, character, fit, rows }) => (
            <div key={role.id} className="rounded-lg border border-stone-700 bg-stone-900/60 p-4">
              <div className="flex items-baseline justify-between gap-3">
                <div className="min-w-0">
                  <p
                    className="text-stone-500 text-[10px] tracking-widest uppercase truncate"
                    style={{ fontFamily: 'Cinzel, serif' }}
                  >
                    {role.label}
                  </p>
                  <p className="text-got-parchment text-base truncate" style={{ fontFamily: 'Cinzel, serif' }}>
                    {character.name}
                  </p>
                  {(() => {
                    const styleKey = ROLE_STYLE_KEY[role.id]
                    const styleValue = styleKey && character[styleKey]
                    if (!styleValue) return null
                    return (
                      <p className="text-stone-600 text-xs italic mt-0.5">
                        {STYLE_LABELS_FOR_KEY[styleKey][styleValue]}
                      </p>
                    )
                  })()}
                </div>
                <span className="text-got-gold/70 text-xs shrink-0" style={{ fontFamily: 'Cinzel, serif' }}>
                  {fit}% fit
                </span>
              </div>

              <div className="flex flex-col gap-1.5 mt-3">
                {rows.map(({ attr, rawValue, effective }) => (
                  <div key={attr} className="flex items-center justify-between gap-2 text-sm">
                    <span className="text-stone-400">{ATTRIBUTE_LABELS[attr]}</span>
                    <span className="text-stone-500 text-xs tabular-nums">
                      {rawValue} × {fit}%
                    </span>
                    <span className="text-got-parchment font-semibold tabular-nums" style={{ fontFamily: 'Cinzel, serif' }}>
                      {effective.toFixed(1)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {excluded.length > 0 && (
            <div className="rounded-lg border border-stone-800 bg-stone-900/30 p-3">
              {excluded.map(({ roleId, role, reason }) => (
                <p key={roleId} className="text-stone-600 text-xs italic">
                  {role?.label ?? roleId}: excluded — {reason}
                </p>
              ))}
            </div>
          )}
        </div>

        <button
          onClick={onClose}
          className="w-full py-3.5 rounded border border-stone-700 text-stone-400 text-sm tracking-widest uppercase transition-colors hover:border-got-gold/40 hover:text-got-gold"
          style={{ fontFamily: 'Cinzel, serif' }}
        >
          Close
        </button>
      </div>
    </div>
  )
}