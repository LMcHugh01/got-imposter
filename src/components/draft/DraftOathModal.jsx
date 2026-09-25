import { useEffect } from 'react'
import { DraftStyles, CINZEL, GARAMOND } from './draftParts'

/**
 * components/draft/DraftOathModal.jsx
 *
 * The confirmation before a pick is committed: this character, this seat.
 * A centred card; on phones, a sheet from the bottom. Pure presentation: it
 * only asks the game to confirm or cancel. Escape reconsiders.
 */
export default function DraftOathModal({ role, character, tint, onConfirm, onCancel }) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onCancel()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onCancel])

  return (
    <div className="dr dr-overlay" role="dialog" aria-modal="true" aria-label={`Swear ${character.name} in as ${role.label}`}>
      <DraftStyles />
      <div className="dr-backdrop" onClick={onCancel} />
      <div className="dr-sheet">
        <div
          style={{
            padding: '18px 24px',
            textAlign: 'center',
            borderBottom: '1px solid rgba(216,184,120,.2)',
            background: `linear-gradient(110deg, ${tint}cc 0%, ${tint}66 55%, #22201c 100%)`,
          }}
        >
          <div style={{ ...CINZEL, fontSize: 9.5, letterSpacing: '.3em', textTransform: 'uppercase', color: '#e4dac4' }}>Swear them in as</div>
          <div style={{ ...CINZEL, marginTop: 6, fontSize: 19, letterSpacing: '.12em', textTransform: 'uppercase', color: '#eed49b' }}>{role.label}</div>
        </div>
        <div style={{ padding: '20px 24px 26px', textAlign: 'center' }}>
          <div style={{ ...CINZEL, fontWeight: 600, fontSize: 23, color: '#f6ecd4' }}>{character.name}</div>
          <div style={{ ...GARAMOND, fontStyle: 'italic', fontSize: 18, color: '#b8ad98' }}>{character.house ?? 'Unaffiliated'}</div>
          <p style={{ ...GARAMOND, margin: '16px auto 0', maxWidth: 360, fontSize: 18, lineHeight: 1.5, color: '#d3c8b2' }}>
            Once sworn, this seat is closed and the rest of today&rsquo;s offer moves on. Their fit for this role is revealed only after the oath.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 24 }}>
            <button type="button" className="dr-btn-gold" onClick={onConfirm} autoFocus>
              Take the oath
            </button>
            <button type="button" className="dr-btn-quiet" onClick={onCancel}>
              Reconsider
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}