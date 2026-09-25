import { ROLES } from '../../data/roleWeights'
import DraftBoard from './DraftBoard'
import CouncilSeats from './CouncilSeats'
import DraftLedger from './DraftLedger'
import DraftOathModal from './DraftOathModal'
import { DraftStyles, ROMAN, useHouseTints, CINZEL, GOLD, MUTED, CREAM } from './DraftParts'

/**
 * components/draft/DraftScreen.jsx
 *
 * The draft in progress, shared by the standalone Draft game and the
 * Campaign's opening draft: the house and its progress, the two steps
 * (choose a character, then their seat), this round's offer or the reveal
 * of whoever was just sworn, the council, and the oath. Pure presentation:
 * each game keeps its own draft state and passes the handlers in.
 */
function Step({ numeral, label, active, dim }) {
  return (
    <div
      className="dr-step"
      aria-current={active ? 'step' : undefined}
      style={{
        borderBottomColor: active ? GOLD : 'transparent',
        background: active ? 'rgba(216,184,120,.08)' : 'transparent',
        color: active ? '#eed49b' : dim ? '#6f6758' : MUTED,
      }}
    >
      <span style={{ color: active ? GOLD : 'inherit' }}>{numeral}</span>
      {label}
    </div>
  )
}

export default function DraftScreen({
  houseName,
  draftState,
  isComplete,
  offer,
  selectedCharacter,
  onSelect,
  onRequestAssign,
  justSworn,
  onContinue,
  pendingRole,
  onConfirm,
  onCancel,
}) {
  const tintOf = useHouseTints()
  const seated = Object.values(draftState.roleAssignments).filter(Boolean)
  const overall = seated.length > 0 ? Math.round(seated.reduce((sum, c) => sum + c.fit, 0) / seated.length) : null
  const remaining = ROLES.length - seated.length
  const phase = justSworn ? 'sworn' : selectedCharacter ? 'seat' : 'pick'

  return (
    <div className="dr dr-wrap">
      <DraftStyles />

      {/* The house, its overall, and its progress */}
      <header>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 24 }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ ...CINZEL, fontSize: 10, letterSpacing: '.4em', textTransform: 'uppercase', color: MUTED }}>The Draft</div>
            <h1 className="dr-title" style={{ ...CINZEL, margin: '6px 0 0', fontWeight: 400, letterSpacing: '.06em', color: CREAM, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              House {houseName}
            </h1>
          </div>
          <div style={{ flex: 'none', textAlign: 'right' }}>
            <div style={{ ...CINZEL, fontSize: 9.5, letterSpacing: '.28em', textTransform: 'uppercase', color: MUTED }}>Overall</div>
            {overall !== null ? (
              <div style={{ ...CINZEL, fontWeight: 600, fontSize: 34, lineHeight: 1.1, color: '#e2bc5c' }}>{overall}</div>
            ) : (
              <div aria-label="No one sworn yet" style={{ width: 32, height: 2, margin: '18px 0 8px auto', background: GOLD }} />
            )}
          </div>
        </div>
        <div aria-hidden="true" style={{ display: 'flex', gap: 5, marginTop: 12 }}>
          {ROLES.map((role) => (
            <div key={role.id} title={role.label} style={{ flex: 1, height: 3, background: draftState.roleAssignments[role.id] ? GOLD : 'rgba(216,184,120,.16)' }} />
          ))}
        </div>
        <div style={{ ...CINZEL, display: 'flex', justifyContent: 'space-between', marginTop: 8, fontSize: 9.5, letterSpacing: '.22em', textTransform: 'uppercase', color: MUTED }}>
          <span>{seated.length} sworn</span>
          <span>
            {remaining} {remaining === 1 ? 'seat remains' : 'seats remain'}
          </span>
        </div>
      </header>

      {/* The two steps */}
      <div className="dr-steps">
        <Step numeral={ROMAN[0]} label={phase === 'seat' ? 'Chosen' : 'Choose a character'} active={phase === 'pick'} dim={phase !== 'pick'} />
        <Step numeral={ROMAN[1]} label={phase === 'sworn' ? 'Sworn' : 'Choose their seat'} active={phase === 'seat'} dim={phase === 'pick'} />
      </div>

      {/* The offer (or the reveal) beside the council */}
      <div className="dr-main">
        <div style={{ minWidth: 0 }}>
          {justSworn ? (
            <DraftLedger
              role={justSworn.role}
              character={justSworn.character}
              houseName={houseName}
              tint={tintOf(justSworn.character.house)}
              isFinal={isComplete}
              onContinue={onContinue}
            />
          ) : (
            <DraftBoard
              round={draftState.round}
              total={ROLES.length}
              offer={offer}
              selectedCharacterId={selectedCharacter?.id ?? null}
              onSelect={onSelect}
              tintOf={tintOf}
            />
          )}
        </div>
        <aside style={{ minWidth: 0 }}>
          <CouncilSeats
            draftState={draftState}
            selectedCharacter={justSworn ? null : selectedCharacter}
            onAssign={onRequestAssign}
            highlightRoleId={justSworn?.role.id ?? null}
          />
        </aside>
      </div>

      {pendingRole && selectedCharacter && (
        <DraftOathModal
          role={pendingRole}
          character={selectedCharacter}
          tint={tintOf(selectedCharacter.house)}
          onConfirm={onConfirm}
          onCancel={onCancel}
        />
      )}
    </div>
  )
}