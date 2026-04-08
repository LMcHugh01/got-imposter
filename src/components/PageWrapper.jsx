import { motion } from 'framer-motion'

const variants = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -16 },
}

export default function PageWrapper({ children, className = '' }) {
  return (
    <motion.div
      variants={variants}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={{ duration: 0.35, ease: 'easeOut' }}
      className={[
        'min-h-screen w-full flex flex-col items-center',
        'bg-got-black px-4 py-8',
        className,
      ].join(' ')}
    >
      {children}
    </motion.div>
  )
}
