import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'

/**
 * GameCard — used on Home and Games pages.
 *
 * Props:
 *  - icon: React Icon Component (e.g., GiShield)
 *  - title: string
 *  - description: string
 *  - to: route path (ignored if comingSoon)
 *  - comingSoon: boolean (default false)
 */
export default function GameCard({ icon: Icon, title, description, to, comingSoon = false }) {
  
  // Custom floating badge with high visibility solid background and gold border details
  const comingSoonBadge = comingSoon && (
    <span
      className="absolute -top-2.5 right-4 text-[9px] tracking-[0.2em] font-extrabold uppercase text-got-gold bg-black border border-got-gold/30 rounded px-2.5 py-0.5 shadow-[0_4px_12px_rgba(0,0,0,0.8)] select-none z-20"
      style={{ fontFamily: 'Cinzel, serif' }}
    >
      Coming Soon
    </span>
  )


  const content = (
    <>
      {/* Row layout putting the Icon and Title directly beside each other */}
      <div className="flex items-center gap-3">
        {Icon && (
          <Icon className={`text-2xl shrink-0 ${comingSoon ? 'text-got-stone' : 'text-got-gold'}`} />
        )}
        <h3
          className={[
            'text-lg font-bold tracking-wide',
            comingSoon ? 'text-got-stone' : 'text-got-gold',
          ].join(' ')}
          style={{ fontFamily: 'Cinzel, serif' }}
        >
          {title}
        </h3>
      </div>

      <p
        className={[
          'text-sm mt-3 leading-relaxed italic',
          comingSoon ? 'text-got-stone/80' : 'text-got-parchment/60',
        ].join(' ')}
        style={{ fontFamily: 'EB Garamond, serif' }}
      >
        {description}
      </p>
    </>
  )

  if (comingSoon) {
    return (
      <div className="relative w-full text-left rounded-lg border border-stone-900 bg-got-charcoal/20 p-5 cursor-not-allowed">
        {comingSoonBadge}
        {content}
      </div>
    )
  }

  return (
    <motion.div whileHover={{ y: -2 }} whileTap={{ scale: 0.98 }} className="relative w-full">
      <Link
        to={to}
        className="block w-full text-left rounded-lg border border-stone-800 bg-got-charcoal/40 p-5 hover:border-got-gold/40 transition-all duration-300 hover:shadow-xl hover:shadow-got-gold/5"
      >
        {content}
      </Link>
    </motion.div>
  )
}
