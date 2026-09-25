import { ROLES } from '../../data/roleWeights'
import { ATTRIBUTE_LABELS } from '../../data/attributes'
import { weightsFor } from '../../gameEngine/ratings'
import { SectionTitle, ROLE_CODES, ROLE_SHORT, fitColor, CINZEL, GARAMOND, GOLD, MUTED } from './draftParts'

// The three attributes a seat weighs most, for this character (style-driven
// seats weigh according to the character's style).
function seatAsks(roleId, character) {
  const weights = character ? weightsFor(roleId, character) : null
  if (!weights) return []
  return Object.entries(weights)
    .sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))
    .slice(0, 3)
    .map(([attr]) => ATTRIBUTE_LABELS[attr])
}

/**
 * components/draft/CouncilSeats.jsx
 *
 * The council's ten seats. Filled seats show who holds them and their
 * rating; with a character chosen, the open seats become "Swear here" and
 * (on larger screens) show what each weighs most. The seat just sworn is
 * picked out in gold. On phones: no badges, and short seat names.
 */
export default function CouncilSeats({ draftState, selectedCharacter, onAssign, highlightRoleId }) {
  const open = ROLES.filter((r) => !draftState.roleAssignments[r.id]).length
  return (
    <div>
      <SectionTitle className="dr-desk" right={<span style={{ ...GARAMOND, fontStyle: 'italic', fontSize: 17, color: MUTED, whiteSpace: 'nowrap' }}>{open} open</span>}>
        Your Council
      </SectionTitle>

      <ul className="dr-list dr-list-tight">
        {ROLES.map((role) => {
          const filled = draftState.roleAssignments[role.id]
          const clickable = !filled && Boolean(selectedCharacter)
          const lit = role.id === highlightRoleId
          const asks = clickable ? seatAsks(role.id, selectedCharacter) : []
          const active = filled || clickable
          return (
            <li key={role.id}>
              <button
                type="button"
                className={`dr-seat${clickable ? ' is-open' : ''}${lit ? ' is-lit' : ''}`}
                onClick={() => clickable && onAssign(role.id)}
                disabled={!clickable}
                aria-label={`${role.label}: ${filled ? `${filled.name}, ${filled.fit}` : clickable ? 'swear here' : 'open'}`}
                style={{ cursor: clickable ? 'pointer' : 'default', background: lit ? undefined : clickable ? undefined : 'rgba(255,255,255,.012)' }}
              >
                <span
                  className="dr-desk"
                  style={{
                    ...CINZEL,
                    display: 'block',
                    flex: 'none',
                    width: 52,
                    padding: '6px 0',
                    textAlign: 'center',
                    fontSize: 8.5,
                    letterSpacing: '.1em',
                    textTransform: 'uppercase',
                    border: `1px solid ${active ? 'rgba(216,184,120,.45)' : 'rgba(216,184,120,.18)'}`,
                    color: active ? '#d3c8b2' : '#7d7566',
                  }}
                >
                  {ROLE_CODES[role.id] ?? role.label.slice(0, 4)}
                </span>
                <span style={{ minWidth: 0, flex: 1 }}>
                  <span style={{ ...CINZEL, display: 'block', fontSize: 9, letterSpacing: '.2em', textTransform: 'uppercase', color: lit ? '#eed49b' : MUTED, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    <span className="dr-desk">{role.label}</span>
                    <span className="dr-phone">{ROLE_SHORT[role.id] ?? role.label}</span>
                  </span>
                  <span
                    style={{
                      ...GARAMOND,
                      display: 'block',
                      fontSize: 17,
                      lineHeight: 1.3,
                      fontStyle: filled ? 'normal' : 'italic',
                      color: filled ? '#f1e6cc' : clickable ? '#e2c37e' : '#7d7566',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {filled ? filled.name : clickable ? 'Swear here' : 'Open'}
                  </span>
                  {asks.length > 0 && (
                    <span className="dr-desk" style={{ ...CINZEL, display: 'block', marginTop: 2, fontSize: 8, letterSpacing: '.16em', textTransform: 'uppercase', color: MUTED, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {asks.join(' · ')}
                    </span>
                  )}
                </span>
                {filled ? (
                  <span style={{ ...CINZEL, flex: 'none', paddingRight: 4, fontWeight: 600, fontSize: 19, color: fitColor(filled.fit) }}>{filled.fit}</span>
                ) : (
                  <span aria-hidden="true" style={{ flex: 'none', width: 14, height: 1, marginRight: 6, background: 'rgba(216,184,120,.3)' }} />
                )}
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}