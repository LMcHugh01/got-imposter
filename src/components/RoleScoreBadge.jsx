import { fitLabel } from '../pages/games/draft/fitLabel'

// Same 5 tiers as fitLabel.js, mapped to the app's existing gold/parchment/
// stone/red palette. Color alone carries the "grade" — no % sign, no
// inline text label — so this reads as a score card, not a percentage.
const TIER_STYLES = {
  Excellent: { text: 'text-got-gold', border: 'border-got-gold', bg: 'bg-got-gold/10' },
  Strong: { text: 'text-got-parchment', border: 'border-got-parchment/50', bg: 'bg-got-parchment/5' },
  Solid: { text: 'text-got-parchment/80', border: 'border-stone-500', bg: 'bg-stone-800/40' },
  Weak: { text: 'text-stone-400', border: 'border-stone-700', bg: 'bg-stone-900/40' },
  Poor: { text: 'text-got-red-bright/80', border: 'border-got-red/40', bg: 'bg-got-red/5' },
}

/**
 * Presents a role-fit rating (0-100, same number roleRating() always
 * produced) as a standalone "OVR"-style score badge rather than a
 * percentage. The qualitative tier (Excellent/Strong/etc.) still lives
 * in the border/text color and the hover tooltip, so the number isn't
 * shown without context (Pillar 4) — it's just not spelled out as text
 * anymore.
 *
 * `size`: 'sm' for compact grid cards, 'md' for the final roster screen.
 */
export default function RoleScoreBadge({ score, size = 'md' }) {
  const tier = fitLabel(score)
  const style = TIER_STYLES[tier]

  const sizeClasses = size === 'sm' ? 'w-10 h-10 text-base' : 'w-14 h-14 text-xl'

  return (
    <div
      className={[
        'flex items-center justify-center rounded-lg border-2 font-black shrink-0',
        sizeClasses,
        style.text,
        style.border,
        style.bg,
      ].join(' ')}
      style={{ fontFamily: 'Cinzel, serif' }}
      title={`${tier} fit`}
    >
      {score}
    </div>
  )
}