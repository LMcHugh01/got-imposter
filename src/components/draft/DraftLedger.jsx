import { useState } from 'react'
import { weightsFor } from '../../gameEngine/ratings'
import { CHAMPION_STYLE_LABELS } from '../../data/championStyles'
import { ATTRIBUTE_LABELS, ALL_ATTRIBUTE_KEYS } from '../../data/attributes'
import { ArchPortrait, SectionTitle, Diamond, fitLabel, fitColor, CINZEL, GARAMOND, MUTED } from './DraftParts'

/**
 * components/draft/DraftLedger.jsx
 *
 * The reveal right after a character is sworn in: their rating for the
 * seat, what the seat asked of them (the attributes it weighs most, with
 * their weights), and their full ledger on request. In the left column on
 * larger screens; a sheet over the page on phones. Reads only what the
 * engine already computed: `character.fit` from draftEngine.assignRole,
 * and the seat's weights from the rating engine's own weightsFor(), so
 * every style-driven seat shows the weights that produced the rating.
 */
function topWeighted(roleId, character, count = 6) {
  const weights = weightsFor(roleId, character)
  if (!weights) return []
  return Object.entries(weights)
    .sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))
    .slice(0, count)
    .map(([attr, weight]) => ({ attr, weight }))
}

export default function DraftLedger({ role, character, houseName, tint, isFinal, onContinue }) {
  const [full, setFull] = useState(false)
  const breakdown = topWeighted(role.id, character)
  const tier = fitLabel(character.fit)

  return (
    <>
      <div className="dr-ledger-backdrop" aria-hidden="true" />
      <div className="dr-ledger" role="region" aria-label={`${character.name}, sworn as ${role.label}`}>
        {/* Who was sworn */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 20, padding: '20px 24px', background: `linear-gradient(110deg, ${tint}cc 0%, ${tint}55 45%, #22201c 100%)` }}>
          <ArchPortrait character={character} tint={tint} width={66} height={82} />
          <div style={{ minWidth: 0 }}>
            <div style={{ ...CINZEL, display: 'flex', alignItems: 'center', gap: 8, fontSize: 9.5, letterSpacing: '.26em', textTransform: 'uppercase', color: '#e2c37e' }}>
              <Diamond color="#e2c37e" />
              Sworn to House {houseName}
            </div>
            <div style={{ ...CINZEL, marginTop: 4, fontWeight: 600, fontSize: 25, lineHeight: 1.15, color: '#f6ecd4' }}>{character.name}</div>
            <div style={{ ...GARAMOND, fontStyle: 'italic', fontSize: 18, color: '#d9ccb0' }}>{character.house ?? 'Unaffiliated'}</div>
            {role.id === 'champion' && character.fightingStyle && (
              <div style={{ ...GARAMOND, fontStyle: 'italic', fontSize: 15, color: '#b8ad98' }}>Fighting style: {CHAMPION_STYLE_LABELS[character.fightingStyle]}</div>
            )}
          </div>
        </div>

        {/* Their rating for the seat */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 20, padding: '20px 16px', borderTop: '1px solid rgba(216,184,120,.14)', borderBottom: '1px solid rgba(216,184,120,.14)' }}>
          <span style={{ ...CINZEL, fontWeight: 600, fontSize: 56, lineHeight: 1, color: fitColor(character.fit) }}>{character.fit}</span>
          <span>
            <span style={{ ...CINZEL, display: 'block', fontSize: 9, letterSpacing: '.24em', textTransform: 'uppercase', color: MUTED }}>Fit as</span>
            <span style={{ ...CINZEL, display: 'block', fontSize: 19, color: '#f1e6cc' }}>{role.label}</span>
            <span style={{ ...CINZEL, display: 'block', fontSize: 9, letterSpacing: '.22em', textTransform: 'uppercase', color: '#e2c37e' }}>{tier} fit</span>
          </span>
        </div>

        <div style={{ padding: '20px 24px 24px' }}>
          <SectionTitle>What the seat asked of them</SectionTitle>
          <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
            {breakdown.map(({ attr, weight }) => {
              const value = character.attributes[attr]
              return (
                <li key={attr} style={{ padding: '8px 0', borderBottom: '1px solid rgba(216,184,120,.07)' }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
                    <span style={{ ...GARAMOND, flex: 1, fontSize: 19, color: '#ece5d6' }}>{ATTRIBUTE_LABELS[attr]}</span>
                    <span style={{ ...CINZEL, fontSize: 9.5, letterSpacing: '.08em', color: weight >= 0 ? MUTED : '#c9766a' }}>
                      {weight >= 0 ? '×' : '−'}
                      {Math.round(Math.abs(weight) * 100)}%
                    </span>
                    <span style={{ ...CINZEL, width: 32, textAlign: 'right', fontWeight: 600, fontSize: 16, color: fitColor(value) }}>{value}</span>
                  </div>
                  <div style={{ marginTop: 6, height: 3, background: 'rgba(216,184,120,.1)' }}>
                    <div style={{ height: '100%', width: `${value}%`, background: weight >= 0 ? (value >= 70 ? '#d8b878' : 'rgba(216,184,120,.55)') : 'rgba(201,118,106,.7)' }} />
                  </div>
                </li>
              )
            })}
          </ul>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 20 }}>
            <button type="button" className="dr-btn-quiet" onClick={() => setFull((v) => !v)} aria-expanded={full}>
              {full ? 'Hide full ledger' : `Full ledger · ${ALL_ATTRIBUTE_KEYS.length} attributes`}
            </button>
            {full && (
              <div className="dr-ledger-grid">
                {ALL_ATTRIBUTE_KEYS.map((attr) => (
                  <div key={attr} style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8, padding: '4px 0', borderBottom: '1px solid rgba(216,184,120,.07)' }}>
                    <span style={{ ...GARAMOND, fontSize: 16, color: '#b8ad98', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{ATTRIBUTE_LABELS[attr]}</span>
                    <span style={{ ...CINZEL, fontWeight: 600, fontSize: 13, color: fitColor(character.attributes[attr]) }}>{character.attributes[attr]}</span>
                  </div>
                ))}
              </div>
            )}
            <button type="button" className="dr-btn-gold" onClick={onContinue}>
              {isFinal ? 'Seat the council' : 'Summon the next five'}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}