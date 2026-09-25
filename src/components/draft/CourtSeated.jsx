import {
  computeHouseStats,
  overallHouseRating,
  houseStrengthsWeaknesses,
  ratingLabel,
  STAT_LABELS,
  STAT_CONTRIBUTORS,
} from '../../gameEngine/houseStats'
import { ROLES } from '../../data/roleWeights'
import { BANNER_CLIP } from '../houses/HouseParts'
import { DraftStyles, ArchPortrait, SectionTitle, Diamond, fitColor, useHouseTints, CINZEL, GARAMOND, MUTED, CREAM } from './DraftParts'

const roleLabel = (id) => ROLES.find((r) => r.id === id)?.label ?? id

// "Commander, Kingsguard and Champion": the seats that feed a realm rating,
// straight from houseStats' own contributor list.
function seatsFeeding(statId) {
  const labels = [...new Set((STAT_CONTRIBUTORS[statId] ?? []).map((c) => c.role))].map(roleLabel)
  return labels.length > 1 ? `${labels.slice(0, -1).join(', ')} and ${labels[labels.length - 1]}` : labels[0] ?? ''
}

// Which realm rating a strength or weakness line is about ("Excellent military").
const statOf = (line, stats) => Object.keys(stats).find((id) => line.toLowerCase().endsWith(STAT_LABELS[id].toLowerCase()))

function SeatCard({ role, character, tint, crown }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        padding: crown ? '14px 16px' : '10px 12px',
        borderRadius: 2,
        border: `1px solid ${crown ? 'rgba(216,184,120,.55)' : 'rgba(216,184,120,.14)'}`,
        background: `linear-gradient(100deg, ${tint}${crown ? '77' : '44'} 0%, ${tint}14 50%, rgba(255,255,255,.012) 100%)`,
        boxShadow: crown ? '0 10px 30px rgba(0,0,0,.3)' : 'none',
      }}
    >
      <ArchPortrait character={character} tint={tint} width={crown ? 52 : 36} height={crown ? 64 : 44} />
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ ...CINZEL, fontSize: crown ? 9.5 : 8.5, letterSpacing: '.2em', textTransform: 'uppercase', color: '#e2c37e' }}>{role.label}</div>
        <div style={{ ...CINZEL, fontWeight: 600, fontSize: crown ? 18 : 14, color: '#f6ecd4', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{character.name}</div>
        <div style={{ ...GARAMOND, fontStyle: 'italic', fontSize: crown ? 17 : 15, color: '#b8ad98', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {character.house ?? 'Unaffiliated'}
        </div>
      </div>
      <span style={{ ...CINZEL, flex: 'none', fontWeight: 600, fontSize: crown ? 30 : 21, color: fitColor(character.fit) }}>{character.fit}</span>
    </div>
  )
}

function Rule({ side }) {
  return <span aria-hidden="true" style={{ width: 64, height: 1, background: `linear-gradient(90deg, ${side === 'left' ? 'transparent, rgba(216,184,120,.45)' : 'rgba(216,184,120,.45), transparent'})` }} />
}

/**
 * components/draft/CourtSeated.jsx
 *
 * The finished council: the house rating, the realm's six ratings with
 * strengths and weaknesses (all from houseStats, as before), and the
 * council, the King or Queen on top and the other nine beneath (3×3 on
 * larger screens, one column on phones). Each game passes its own ending
 * as `children` ("Begin Campaign", "Draft Again").
 */
export default function CourtSeated({ roster, houseName, children }) {
  const tintOf = useHouseTints()
  const stats = computeHouseStats(roster)
  const overall = overallHouseRating(stats)
  const { strengths, weaknesses } = houseStrengthsWeaknesses(stats)
  const averageFit = Math.round(roster.reduce((sum, { character }) => sum + character.fit, 0) / roster.length)
  const crown = roster.find(({ role }) => role.id === 'king')
  const others = roster.filter(({ role }) => role.id !== 'king')

  const lineRow = (line, colour) => (
    <li key={line} style={{ ...GARAMOND, display: 'flex', alignItems: 'center', gap: 10, padding: '2px 0', fontSize: 18, color: '#ece5d6' }}>
      <Diamond color={colour} />
      <span style={{ flex: 1 }}>{line.charAt(0).toUpperCase() + line.slice(1)}</span>
      <span style={{ ...CINZEL, fontSize: 13, color: colour }}>{stats[statOf(line, stats)]}</span>
    </li>
  )

  return (
    <div className="dr dr-done">
      <DraftStyles />

      {/* The court is seated */}
      <header style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', paddingTop: 8 }}>
        <div aria-hidden="true" style={{ position: 'relative', width: 70, height: 91, clipPath: BANNER_CLIP, background: 'rgba(216,184,120,.75)' }}>
          <div
            style={{
              position: 'absolute',
              inset: 2,
              clipPath: BANNER_CLIP,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              paddingBottom: 12,
              background: 'linear-gradient(160deg, #8a1c22, #5a1216 60%, #1a0c0c)',
            }}
          >
            <span style={{ ...CINZEL, fontSize: 30, color: CREAM }}>{(houseName || '?')[0].toUpperCase()}</span>
          </div>
        </div>
        <div style={{ ...CINZEL, display: 'flex', alignItems: 'center', gap: 12, marginTop: 20, fontSize: 10, letterSpacing: '.3em', textTransform: 'uppercase', color: '#e2c37e' }}>
          <Diamond color="#e2c37e" />
          The court is seated
          <Diamond color="#e2c37e" />
        </div>
        <h1 style={{ ...CINZEL, margin: '8px 0 0', fontWeight: 400, fontSize: 'clamp(28px, 5vw, 42px)', letterSpacing: '.08em', color: CREAM }}>House {houseName}</h1>
        <div style={{ ...CINZEL, display: 'flex', alignItems: 'center', gap: 16, marginTop: 16, fontSize: 9.5, letterSpacing: '.26em', textTransform: 'uppercase', color: MUTED }}>
          <Rule side="left" />
          Overall house rating
          <Rule side="right" />
        </div>
        <div className="dr-rating" style={{ ...CINZEL, fontWeight: 600, lineHeight: 1.05, color: '#e2bc5c', textShadow: '0 0 40px rgba(226,188,92,.25)' }}>
          {overall}
        </div>
        <div style={{ ...CINZEL, fontSize: 10, letterSpacing: '.28em', textTransform: 'uppercase', color: '#e2c37e' }}>{ratingLabel(overall)} house</div>
        <p style={{ ...GARAMOND, margin: '8px 0 0', fontStyle: 'italic', fontSize: 18, color: '#b8ad98' }}>Potential, not a prediction — the campaign decides the rest.</p>
      </header>

      {/* The realm's six ratings */}
      <section style={{ marginTop: 40 }}>
        <SectionTitle>The Realm</SectionTitle>
        <div className="dr-realm">
          {Object.entries(stats).map(([statId, value]) => (
            <div key={statId} style={{ padding: '14px 16px', background: 'rgba(255,255,255,.015)' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ ...CINZEL, fontWeight: 600, fontSize: 10.5, letterSpacing: '.18em', textTransform: 'uppercase', color: CREAM }}>{STAT_LABELS[statId]}</div>
                  <div style={{ ...CINZEL, fontSize: 8.5, letterSpacing: '.2em', textTransform: 'uppercase', color: value >= 80 ? '#e2c37e' : MUTED }}>{ratingLabel(value)}</div>
                </div>
                <span style={{ ...CINZEL, flex: 'none', fontWeight: 600, fontSize: 27, lineHeight: 1, color: fitColor(value) }}>{value}</span>
              </div>
              <div style={{ marginTop: 10, height: 3, background: 'rgba(216,184,120,.1)' }}>
                <div style={{ height: '100%', width: `${value}%`, background: value >= 80 ? '#d8b878' : 'rgba(216,184,120,.55)' }} />
              </div>
              <div className="dr-desk" style={{ ...GARAMOND, marginTop: 8, fontStyle: 'italic', fontSize: 16, color: MUTED }}>
                {seatsFeeding(statId)}
              </div>
            </div>
          ))}
        </div>

        <div className="dr-sw">
          <div style={{ padding: '14px 16px', borderRadius: 2, border: '1px solid rgba(216,184,120,.2)', background: 'rgba(216,184,120,.04)' }}>
            <div style={{ ...CINZEL, marginBottom: 8, fontSize: 9.5, letterSpacing: '.24em', textTransform: 'uppercase', color: '#e2c37e' }}>Strengths</div>
            {strengths.length === 0 ? (
              <p style={{ ...GARAMOND, margin: 0, fontStyle: 'italic', fontSize: 18, color: MUTED }}>Nothing the realm would boast of.</p>
            ) : (
              <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>{strengths.map((line) => lineRow(line, '#e2c37e'))}</ul>
            )}
          </div>
          <div style={{ padding: '14px 16px', borderRadius: 2, border: '1px solid rgba(201,118,106,.3)', background: 'rgba(122,28,34,.08)' }}>
            <div style={{ ...CINZEL, marginBottom: 8, fontSize: 9.5, letterSpacing: '.24em', textTransform: 'uppercase', color: '#c9766a' }}>Weaknesses</div>
            {weaknesses.length === 0 ? (
              <p style={{ ...GARAMOND, margin: 0, fontStyle: 'italic', fontSize: 18, color: MUTED }}>No gap in the walls.</p>
            ) : (
              <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>{weaknesses.map((line) => lineRow(line, '#c9766a'))}</ul>
            )}
          </div>
        </div>
      </section>

      {/* The council: the crown on top, the other nine beneath */}
      <section style={{ marginTop: 40 }}>
        <SectionTitle right={<span style={{ ...GARAMOND, fontStyle: 'italic', fontSize: 17, color: MUTED, whiteSpace: 'nowrap' }}>Average fit {averageFit}</span>}>
          The Small Council
        </SectionTitle>
        {crown && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div className="dr-crown">
              <SeatCard role={crown.role} character={crown.character} tint={tintOf(crown.character.house)} crown />
            </div>
            <span aria-hidden="true" style={{ width: 1, height: 20, background: 'rgba(216,184,120,.35)' }} />
          </div>
        )}
        <div className="dr-council">
          {others.map(({ role, character }) => (
            <SeatCard key={role.id} role={role} character={character} tint={tintOf(character.house)} />
          ))}
        </div>
      </section>

      {children && <div className="dr-actions">{children}</div>}
    </div>
  )
}