import { useEffect, useState } from 'react'
import { fetchAllHouses } from '../../lib/houseService'

/**
 * components/draft/DraftParts.jsx
 *
 * Pieces shared by the draft screens (the standalone Draft game and the
 * Campaign's opening draft): fonts and colours, rating tiers, seat names,
 * portraits, house colours, and the screens' stylesheet.
 *
 * The layout lives in DRAFT_CSS below, plain CSS with its own class names
 * (all starting "dr-"), rather than in Tailwind classes, so it renders
 * the same whatever the Tailwind build picks up. Phones (under 640px) get
 * their own layout: offer and council side by side in two narrow columns,
 * the oath and the reveal as sheets.
 */

export const CINZEL = { fontFamily: "'Cinzel', serif" }
export const GARAMOND = { fontFamily: "'EB Garamond', Georgia, serif" }
export const GOLD = '#d8b878'
export const MUTED = '#8f8676'
export const CREAM = '#f1e6cc'

// Same 5 tiers as pages/games/draft/fitLabel.js (which RoleScoreBadge uses).
export function fitLabel(fit) {
  if (fit >= 80) return 'Excellent'
  if (fit >= 65) return 'Strong'
  if (fit >= 50) return 'Solid'
  if (fit >= 35) return 'Weak'
  return 'Poor'
}

// A rating's colour, by tier.
export function fitColor(fit) {
  if (fit == null) return MUTED
  if (fit >= 80) return '#e2bc5c'
  if (fit >= 65) return '#ece5d6'
  if (fit >= 50) return '#c9bea8'
  if (fit >= 35) return '#b09a7e'
  return '#c08d80'
}

export const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X']
export const COUNT_WORDS = ['None', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten']

// Short codes for the council's seat badges (desktop). Cosmetic only.
export const ROLE_CODES = {
  king: 'King',
  consort: 'Consort',
  hand: 'Hand',
  masterOfWhispers: 'Whisp',
  grandMaester: 'Maes',
  masterOfCoin: 'Coin',
  masterOfLaws: 'Laws',
  commander: 'Cmdr',
  kingsguard: 'KG',
  champion: 'Chmp',
}

// Seat names that fit a phone's narrow council column.
export const ROLE_SHORT = {
  hand: 'Hand',
  masterOfLaws: 'Laws',
  masterOfCoin: 'Coin',
  masterOfWhispers: 'Whispers',
  grandMaester: 'Maester',
}

export function initials(name) {
  const parts = (name ?? '').trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

// A character's colour: their house's, from the houses in the archive
// ("House Stark of Winterfell" takes House Stark's). Loaded once per visit;
// until then, or for anyone without a house in the archive, a neutral.
const NEUTRAL = '#3a342a'
let housesPromise = null
export function useHouseTints() {
  const [houses, setHouses] = useState([])
  useEffect(() => {
    let cancelled = false
    housesPromise ??= fetchAllHouses().catch(() => [])
    housesPromise.then((data) => !cancelled && setHouses(data))
    return () => {
      cancelled = true
    }
  }, [])
  const named = houses.filter((h) => h.tinctFrom && h.name).sort((a, b) => b.name.length - a.name.length)
  return (house) => named.find((h) => (house ?? '').startsWith(h.name))?.tinctFrom ?? NEUTRAL
}

// A portrait in an arched frame, tinted with the house colour. The image
// fills the frame's width, anchored to the top where the face is; with no
// image (or one that fails to load), the character's initials.
export function ArchPortrait({ character, tint, width, height }) {
  const [broken, setBroken] = useState(false)
  const src = character.image_url
  return (
    <div
      aria-hidden="true"
      style={{
        position: 'relative',
        flex: 'none',
        width,
        height,
        overflow: 'hidden',
        border: '1px solid rgba(216,184,120,.6)',
        borderRadius: `${width}px ${width}px 0 0`,
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
        background: `radial-gradient(circle at 50% 35%, ${tint}, #15130f 80%)`,
      }}
    >
      {src && !broken ? (
        <img
          src={src}
          alt=""
          onError={() => setBroken(true)}
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top' }}
        />
      ) : (
        <span style={{ ...CINZEL, fontSize: Math.round(width * 0.3), color: CREAM, marginBottom: '16%' }}>{initials(character.name)}</span>
      )}
    </div>
  )
}

export function SectionTitle({ children, right, className = '' }) {
  return (
    <div className={className} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
      <span style={{ ...CINZEL, fontSize: 10, letterSpacing: '.28em', textTransform: 'uppercase', color: GOLD, whiteSpace: 'nowrap' }}>{children}</span>
      <span style={{ flex: 1, height: 1, background: 'linear-gradient(90deg, rgba(216,184,120,.3), rgba(216,184,120,.04))' }} />
      {right}
    </div>
  )
}

export const Diamond = ({ size = 5, color = GOLD, filled = true, style }) => (
  <span
    aria-hidden="true"
    style={{
      display: 'inline-block',
      flex: 'none',
      width: size,
      height: size,
      transform: 'rotate(45deg)',
      background: filled ? color : 'transparent',
      border: filled ? 'none' : `1px solid ${color}`,
      ...style,
    }}
  />
)

/* ---------------- the stylesheet ---------------- */

const DRAFT_CSS = `
.dr, .dr * { box-sizing: border-box; }
/* the button reset has no weight (:where), so every class below wins over it */
:where(.dr) button { font: inherit; color: inherit; background: none; border: none; padding: 0; margin: 0; text-align: inherit; }
.dr button:focus-visible { outline: 1px solid ${GOLD}; outline-offset: 2px; }
.dr-wrap { width: 100%; max-width: 1120px; margin: 0 auto; padding: 8px 0 24px; }
.dr-phone { display: none; }

.dr-btn-gold { display: block; width: 100%; padding: 15px 18px; border-radius: 2px; cursor: pointer; font-family: 'Cinzel', serif; font-size: 11px; font-weight: 600; letter-spacing: .24em; text-transform: uppercase; text-align: center; color: #1a1712 !important; background: linear-gradient(180deg, #e2c37e, #c9a45c) !important; transition: filter .2s; }
.dr-btn-gold:hover { filter: brightness(1.08); }
.dr-btn-quiet { display: block; width: 100%; padding: 15px 18px; border-radius: 2px; cursor: pointer; font-family: 'Cinzel', serif; font-size: 11px; letter-spacing: .22em; text-transform: uppercase; text-align: center; color: #d3c8b2 !important; border: 1px solid rgba(216,184,120,.35) !important; transition: border-color .2s, color .2s; }
.dr-btn-quiet:hover { border-color: ${GOLD} !important; color: #eed49b !important; }

/* header */
.dr-title { font-size: 36px; }
.dr-steps { display: flex; margin-top: 20px; border-top: 1px solid rgba(216,184,120,.18); border-bottom: 1px solid rgba(216,184,120,.18); }
.dr-step { flex: 1; display: flex; align-items: center; justify-content: center; gap: 12px; padding: 11px 6px; border-bottom: 2px solid transparent; margin-bottom: -1px; font-family: 'Cinzel', serif; font-size: 10px; letter-spacing: .24em; text-transform: uppercase; white-space: nowrap; }

/* the two columns: the offer (or the reveal) and the council */
.dr-main { display: grid; grid-template-columns: minmax(0, 3fr) minmax(0, 2fr); gap: 32px; align-items: start; margin-top: 24px; }
.dr-list { display: flex; flex-direction: column; gap: 8px; list-style: none; margin: 0; padding: 0; }
.dr-list-tight { gap: 6px; }

.dr-cand { width: 100%; display: flex; align-items: center; gap: 16px; padding: 12px 14px; border: 1px solid rgba(216,184,120,.14) !important; border-radius: 2px; cursor: pointer; text-align: left; transition: border-color .2s, box-shadow .2s; }
.dr-cand:hover { border-color: rgba(216,184,120,.5) !important; }
.dr-cand[aria-pressed="true"] { border-color: ${GOLD} !important; box-shadow: 0 0 0 1px rgba(216,184,120,.35), 0 8px 24px rgba(0,0,0,.25); }
.dr-cand-name { font-family: 'Cinzel', serif; font-weight: 600; font-size: 17px; color: #f6ecd4; }
.dr-cand-house { font-family: 'EB Garamond', Georgia, serif; font-style: italic; font-size: 17px; color: #b8ad98; }

.dr-seat { width: 100%; display: flex; align-items: center; gap: 12px; min-height: 56px; padding: 8px 10px; border: 1px solid rgba(216,184,120,.12) !important; border-radius: 2px; text-align: left; transition: border-color .2s; }
.dr-seat.is-open { border-color: rgba(216,184,120,.4) !important; background: rgba(216,184,120,.05); cursor: pointer; }
.dr-seat.is-open:hover { border-color: ${GOLD} !important; }
.dr-seat.is-lit { border-color: ${GOLD} !important; background: rgba(216,184,120,.12); }

/* the oath: a centred card; a sheet from the bottom on phones */
.dr-overlay { position: fixed; inset: 0; z-index: 60; display: flex; align-items: center; justify-content: center; padding: 16px; }
.dr-backdrop { position: absolute; inset: 0; background: rgba(8,7,6,.82); }
.dr-sheet { position: relative; width: 100%; max-width: 440px; overflow: hidden; border: 1px solid rgba(216,184,120,.3); border-radius: 3px; background: #1f1d1a; }

/* the reveal: in the left column; a sheet over the page on phones */
.dr-ledger { border: 1px solid rgba(216,184,120,.25); border-radius: 3px; overflow: hidden; background: #211f1b; }
.dr-ledger-backdrop { display: none; }
.dr-ledger-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); column-gap: 20px; padding: 8px 0; }

/* the finished council */
.dr-done { width: 100%; max-width: 1000px; margin: 0 auto; padding: 0 4px 24px; }
.dr-realm { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); border-top: 1px solid rgba(216,184,120,.14); border-left: 1px solid rgba(216,184,120,.14); }
.dr-realm > div { border-right: 1px solid rgba(216,184,120,.14); border-bottom: 1px solid rgba(216,184,120,.14); }
.dr-sw { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 12px; }
.dr-crown { width: 100%; max-width: 440px; }
.dr-council { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; }
.dr-actions { display: flex; justify-content: center; gap: 8px; margin: 40px auto 0; max-width: 560px; }
.dr-actions > * { width: auto; flex: 1 1 0; max-width: 300px; }
.dr-rating { font-size: 92px; }

@media (max-width: 899px) {
  .dr-realm { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .dr-council { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}

@media (max-width: 639px) {
  .dr-desk { display: none !important; }
  .dr-phone { display: block; }
  .dr-title { font-size: 25px; }
  .dr-step { gap: 8px; font-size: 9px; letter-spacing: .14em; padding: 10px 4px; }

  .dr-main { grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 8px; margin-top: 12px; }
  .dr-cand { align-items: flex-start; min-height: 86px; padding: 10px 11px; gap: 0; }
  .dr-cand-name { font-size: 13px; }
  .dr-cand-house { font-size: 14px; line-height: 1.2; }
  .dr-seat { min-height: 45px; padding: 6px 9px; gap: 6px; }

  .dr-overlay { align-items: flex-end; padding: 0; }
  .dr-sheet { max-width: none; border-radius: 10px 10px 0 0; border-bottom: none; }

  .dr-ledger { position: fixed; left: 0; right: 0; top: 96px; bottom: 0; z-index: 40; overflow-y: auto; border-radius: 10px 10px 0 0; border-bottom: none; }
  .dr-ledger-backdrop { display: block; position: fixed; inset: 0; z-index: 39; background: rgba(8,7,6,.78); }
  .dr-ledger-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }

  .dr-sw { grid-template-columns: 1fr; }
  .dr-crown { max-width: none; }
  .dr-council { grid-template-columns: 1fr; }
  .dr-actions { flex-direction: column; }
  .dr-actions > * { width: 100%; max-width: none; flex: none; }
  .dr-rating { font-size: 68px; }
}
`

// Renders the stylesheet once per screen (repeats are harmless).
export function DraftStyles() {
  return <style>{DRAFT_CSS}</style>
}