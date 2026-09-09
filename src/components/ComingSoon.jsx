import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'

/**
 * ComingSoon — shared placeholder for not-yet-built game/explore pages.
 *
 * Props:
 *  - icon: emoji
 *  - title: string
 *  - description: string
 */
export default function ComingSoon({ icon = '🗺️', title, description }) {
  return (
    <div className="w-full max-w-sm flex flex-col items-center gap-6 text-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.85 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="text-6xl select-none"
      >
        {icon}
      </motion.div>

      <div>
        <h2
          className="text-3xl font-bold tracking-widest uppercase text-got-gold"
          style={{ fontFamily: 'Cinzel, serif' }}
        >
          {title}
        </h2>
        <div className="gold-divider mt-3 mb-4" />
        <p
          className="text-got-parchment/50 text-base italic leading-relaxed"
          style={{ fontFamily: 'EB Garamond, serif' }}
        >
          {description}
        </p>
      </div>

      <Link
        to="/games"
        className="text-stone-500 text-sm tracking-widest uppercase hover:text-got-gold transition-colors"
        style={{ fontFamily: 'Cinzel, serif' }}
      >
        ← Back to Games
      </Link>
    </div>
  )
}
