import { useState } from 'react'
import { motion } from 'framer-motion'

/**
 * FlipCard — a 3D flip card using Framer Motion.
 *
 * Props:
 *  - front: JSX for the card back (face-down state, shown first)
 *  - back: JSX for the card front (revealed state)
 *  - isFlipped: boolean (controlled from parent)
 */
export default function FlipCard({ front, back, isFlipped }) {
  return (
    <div className="perspective w-full h-full" style={{ perspective: '1200px' }}>
      <motion.div
        className="relative w-full h-full"
        style={{ transformStyle: 'preserve-3d' }}
        animate={{ rotateY: isFlipped ? 180 : 0 }}
        transition={{ duration: 0.7, ease: [0.4, 0, 0.2, 1] }}
      >
        {/* Front face (face-down) */}
        <div
          className="absolute inset-0"
          style={{ backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden' }}
        >
          {front}
        </div>

        {/* Back face (revealed) */}
        <div
          className="absolute inset-0"
          style={{
            backfaceVisibility: 'hidden',
            WebkitBackfaceVisibility: 'hidden',
            transform: 'rotateY(180deg)',
          }}
        >
          {back}
        </div>
      </motion.div>
    </div>
  )
}
