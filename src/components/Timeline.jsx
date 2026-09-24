/**
 * components/Timeline.jsx
 *
 * The era picker shared by the Houses and Maps pages: the points from
 * data/timeline.js on a diamond-studded line, with the selected era's ruler
 * (or its title) and caption beneath.
 */
export default function Timeline({ points, selectedYear, onSelect, rulerName }) {
  const current = points.find((p) => p.year === selectedYear)
  return (
    <div className="w-full flex flex-col items-center gap-4 sm:gap-6 py-2">
      <div className="flex items-center gap-2 sm:gap-4 w-full max-w-lg">
        {points.map((p, i) => (
          <div key={p.year} className="flex-1 flex flex-col items-center text-center">
            <button onClick={() => onSelect(p.year)} className="flex flex-col items-center gap-1.5 sm:gap-2">
              <span
                className={['text-lg sm:text-2xl font-bold', selectedYear === p.year ? 'text-got-gold' : 'text-stone-600'].join(' ')}
                style={{ fontFamily: 'Cinzel, serif' }}
              >
                {p.label}
              </span>
              <div className="flex items-center gap-1.5 w-full">
                <div
                  className={['flex-1 h-px', i === 0 ? 'bg-gradient-to-r from-transparent to-stone-700' : 'bg-stone-700'].join(' ')}
                />
                <span
                  className={[
                    'w-2.5 h-2.5 sm:w-3.5 sm:h-3.5 shrink-0 rotate-45 border',
                    selectedYear === p.year ? 'bg-got-gold border-got-gold' : 'bg-stone-900 border-stone-600',
                  ].join(' ')}
                />
                <div
                  className={[
                    'flex-1 h-px',
                    i === points.length - 1 ? 'bg-gradient-to-l from-transparent to-stone-700' : 'bg-stone-700',
                  ].join(' ')}
                />
              </div>
            </button>
          </div>
        ))}
      </div>
      {current && (
        <div className="text-center px-2">
          {current.season && (
            <p
              className="text-[9px] sm:text-[10px] tracking-[0.28em] uppercase text-got-parchment/40 mb-1.5"
              style={{ fontFamily: 'Cinzel, serif' }}
            >
              {current.season}
            </p>
          )}
          <p
            className="font-bold leading-tight"
            style={{
              fontFamily: 'Cinzel, serif',
              color: '#f7efdc',
              textShadow: '0 0 30px rgba(201,167,90,0.2)',
              fontSize: 'clamp(20px, 5vw, 30px)',
            }}
          >
            {rulerName || current.title}
          </p>
          <p className="text-sm sm:text-base italic text-got-parchment/50 mt-1.5 max-w-lg" style={{ fontFamily: 'EB Garamond, serif' }}>
            {current.caption}
          </p>
        </div>
      )}
    </div>
  )
}
