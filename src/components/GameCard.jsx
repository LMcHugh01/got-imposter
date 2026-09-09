import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'

/**
 * GameCard — used on Home and Games pages.
 *
 * Props:
 *  - icon: emoji or short glyph
 *  - title: string
 *  - description: string
 *  - to: route path (ignored if comingSoon)
 *  - comingSoon: boolean (default false)
 */
export default function GameCard({ icon, title, description, to, comingSoon = false }) {
  const content = (
    <>
      <div className="flex items-start justify-between">
        <span className="text-3xl leading-none">{icon}</span>
        {comingSoon && (
          <span
            className="text-[10px] tracking-widest uppercase text-stone-600 border border-stone-700 rounded px-2 py-1"
            style={{ fontFamily: 'Cinzel, serif' }}
          >
            Coming Soon
          </span>
        )}
      </div>
      <h3
        className={[
          'text-xl font-bold tracking-wide mt-4',
          comingSoon ? 'text-stone-500' : 'text-got-gold',
        ].join(' ')}
        style={{ fontFamily: 'Cinzel, serif' }}
      >
        {title}
      </h3>
      <p
        className={[
          'text-sm mt-2 leading-relaxed italic',
          comingSoon ? 'text-stone-600' : 'text-got-parchment/60',
        ].join(' ')}
        style={{ fontFamily: 'EB Garamond, serif' }}
      >
        {description}
      </p>
    </>
  )

  if (comingSoon) {
    return (
      <div className="w-full text-left rounded-lg border border-stone-800 bg-stone-900/30 p-6 cursor-not-allowed">
        {content}
      </div>
    )
  }

  return (
    <motion.div whileTap={{ scale: 0.98 }}>
      <Link
        to={to}
        className="block w-full text-left rounded-lg border border-stone-700 bg-stone-900/60 p-6 hover:border-got-gold/50 transition-all duration-200 hover:shadow-lg hover:shadow-got-gold/5"
      >
        {content}
      </Link>
    </motion.div>
  )
}
