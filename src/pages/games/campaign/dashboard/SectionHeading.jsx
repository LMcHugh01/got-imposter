/**
 * pages/games/draft/SectionHeading.jsx
 *
 * The small diamond-bullet + tracked-caps label + fading rule used to
 * introduce every section of the Campaign Dashboard. Pulled into one
 * component since the same markup was about to be repeated four times
 * (Council, Resources, Orders, Scout Report) with only the label/color/
 * trailing content differing.
 */
export default function SectionHeading({ label, tone = 'gold', trailing = null }) {
  const diamondBorder = tone === 'red' ? 'border-got-red/60' : 'border-got-gold/50'
  const textColor = tone === 'red' ? 'text-got-red-bright/80' : 'text-got-gold/80'
  const lineFrom = tone === 'red' ? 'from-got-red/40' : 'from-got-gold/40'

  return (
    <div className="flex items-center gap-3">
      <div className={['w-[9px] h-[9px] shrink-0 border rotate-45', diamondBorder].join(' ')} />
      <p className={['text-xs tracking-[0.3em] uppercase whitespace-nowrap', textColor].join(' ')} style={{ fontFamily: 'Cinzel, serif' }}>
        {label}
      </p>
      <div className={['flex-1 h-px bg-gradient-to-r to-transparent', lineFrom].join(' ')} />
      {trailing && (
        <p className="text-stone-500 text-xs tracking-widest uppercase whitespace-nowrap" style={{ fontFamily: 'Cinzel, serif' }}>
          {trailing}
        </p>
      )}
    </div>
  )
}
