import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useGameStore } from '../store/gameStore'
import FlipCard from '../components/FlipCard'
import PageWrapper from '../components/PageWrapper'

// Card back — decorative face-down card
function CardBack() {
  return (
    <div
      className="w-full h-full rounded-2xl flex flex-col items-center justify-center gap-4 border-2 border-got-gold/30"
      style={{
        background: 'linear-gradient(135deg, #1a1a1a 0%, #0d0d0d 100%)',
        boxShadow: '0 0 40px rgba(201,168,76,0.08), inset 0 0 60px rgba(0,0,0,0.5)',
      }}
    >
      {/* Decorative border */}
      <div
        className="absolute inset-3 rounded-xl border border-got-gold/15 pointer-events-none"
        style={{ boxShadow: 'inset 0 0 30px rgba(201,168,76,0.04)' }}
      />

      <div className="text-6xl select-none">🐉</div>
      <p
        className="text-got-gold/60 text-sm tracking-[0.4em] uppercase"
        style={{ fontFamily: 'Cinzel, serif' }}
      >
        Tap to Reveal
      </p>

      {/* Corner ornaments */}
      <span className="absolute top-4 left-4 text-got-gold/20 text-lg">✦</span>
      <span className="absolute top-4 right-4 text-got-gold/20 text-lg">✦</span>
      <span className="absolute bottom-4 left-4 text-got-gold/20 text-lg">✦</span>
      <span className="absolute bottom-4 right-4 text-got-gold/20 text-lg">✦</span>
    </div>
  )
}

// Loyalist card — parchment with character info
function LoyalistCard({ character }) {
  return (
    <div
      className="w-full h-full rounded-2xl flex flex-col items-center justify-center gap-4 overflow-hidden border-2 border-got-gold/40"
      style={{
        background: 'linear-gradient(160deg, #f5e6c8 0%, #e8d5a3 40%, #d4bc82 100%)',
        boxShadow: '0 0 50px rgba(201,168,76,0.15), inset 0 0 40px rgba(0,0,0,0.1)',
      }}
    >
      {/* Parchment texture overlay */}
      <div
        className="absolute inset-0 pointer-events-none opacity-20"
        style={{
          backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.03) 2px, rgba(0,0,0,0.03) 4px)',
        }}
      />

      {/* Corner ornaments */}
      <span className="absolute top-4 left-4 text-got-gold-dark text-xl opacity-50">✦</span>
      <span className="absolute top-4 right-4 text-got-gold-dark text-xl opacity-50">✦</span>
      <span className="absolute bottom-4 left-4 text-got-gold-dark text-xl opacity-50">✦</span>
      <span className="absolute bottom-4 right-4 text-got-gold-dark text-xl opacity-50">✦</span>

      <div className="relative z-10 flex flex-col items-center gap-4 px-6 w-full">
        {/* Loyalist label */}
        <p
          className="text-got-gold-dark text-xs tracking-[0.5em] uppercase"
          style={{ fontFamily: 'Cinzel, serif' }}
        >
          You Know The Secret
        </p>

        <div
          className="w-full"
          style={{ height: '1px', background: 'linear-gradient(to right, transparent, #8b6914, transparent)' }}
        />

        {/* Character image or placeholder */}
        {character?.image_url ? (
          <img
            src={character.image_url}
            alt={character.name}
            className="w-32 h-32 rounded-full object-cover border-4 border-got-gold-dark/40"
          />
        ) : (
          <div
            className="w-32 h-32 rounded-full flex items-center justify-center border-4 border-got-gold-dark/30"
            style={{ background: 'rgba(139,105,20,0.1)' }}
          >
            <span className="text-5xl">⚔️</span>
          </div>
        )}

        {/* Character name */}
        <h2
          className="text-2xl font-bold text-center text-got-gold-dark leading-tight"
          style={{ fontFamily: 'Cinzel, serif' }}
        >
          {character?.name}
        </h2>

        <div
          className="w-full"
          style={{ height: '1px', background: 'linear-gradient(to right, transparent, #8b6914, transparent)' }}
        />

        <p
          className="text-got-gold-dark/60 text-xs tracking-widest uppercase text-center"
          style={{ fontFamily: 'Cinzel, serif' }}
        >
          Remember · Stay Silent
        </p>
      </div>
    </div>
  )
}

// Impostor card — dark and ominous
function ImpostorCard() {
  return (
    <div
      className="w-full h-full rounded-2xl flex flex-col items-center justify-center gap-4 overflow-hidden border-2 border-red-900/60"
      style={{
        background: 'linear-gradient(160deg, #1a0000 0%, #0d0000 50%, #000000 100%)',
        boxShadow: '0 0 60px rgba(139,26,26,0.25), inset 0 0 60px rgba(139,26,26,0.08)',
      }}
    >
      {/* Red glow overlay */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at center, rgba(139,26,26,0.15) 0%, transparent 70%)',
        }}
      />

      {/* Corner ornaments */}
      <span className="absolute top-4 left-4 text-red-900/60 text-lg">✦</span>
      <span className="absolute top-4 right-4 text-red-900/60 text-lg">✦</span>
      <span className="absolute bottom-4 left-4 text-red-900/60 text-lg">✦</span>
      <span className="absolute bottom-4 right-4 text-red-900/60 text-lg">✦</span>

      <div className="relative z-10 flex flex-col items-center gap-5 px-6 w-full">
        {/* Impostor label */}
        <p
          className="text-red-900/70 text-xs tracking-[0.5em] uppercase"
          style={{ fontFamily: 'Cinzel, serif' }}
        >
          Your Role
        </p>

        <div
          className="w-full"
          style={{ height: '1px', background: 'linear-gradient(to right, transparent, rgba(139,26,26,0.6), transparent)' }}
        />

        {/* Sigil */}
        <div className="text-7xl select-none">🗡️</div>

        {/* Title */}
        <h2
          className="text-3xl font-black text-center leading-tight"
          style={{
            fontFamily: 'Cinzel, serif',
            color: '#c0392b',
            textShadow: '0 0 20px rgba(192,57,43,0.5)',
          }}
        >
          You Are The Impostor
        </h2>

        <div
          className="w-full"
          style={{ height: '1px', background: 'linear-gradient(to right, transparent, rgba(139,26,26,0.6), transparent)' }}
        />

        <p
          className="text-red-900/60 text-sm text-center italic leading-relaxed"
          style={{ fontFamily: 'EB Garamond, serif' }}
        >
          You do not know the secret character. Listen carefully and blend in.
        </p>
      </div>
    </div>
  )
}

export default function CardReveal() {
  const navigate = useNavigate()
  const { players, secretCharacter, currentRevealIndex, advanceReveal } = useGameStore()
  const [isFlipped, setIsFlipped] = useState(false)

  const currentPlayer = players[currentRevealIndex]
  const isLastPlayer = currentRevealIndex === players.length - 1

  // Reset flip state when player changes
  useEffect(() => {
    setIsFlipped(false)
  }, [currentRevealIndex])

  if (!currentPlayer || !secretCharacter) {
    navigate('/')
    return null
  }

  const handleReveal = () => setIsFlipped(true)
  const handleHide = () => setIsFlipped(false)

  const handleNext = () => {
    if (isLastPlayer) {
      advanceReveal() // sets phase to 'voting'
      navigate('/voting')
    } else {
      advanceReveal()
    }
  }

  return (
    <PageWrapper>
      <div className="w-full max-w-sm flex flex-col items-center gap-6">
        {/* Header */}
        <div className="text-center w-full pt-2">
          <p
            className="text-got-parchment/50 text-sm tracking-[0.3em] uppercase mb-1"
            style={{ fontFamily: 'Cinzel, serif' }}
          >
            Player {currentRevealIndex + 1} of {players.length}
          </p>
          <h2
            className="text-2xl font-bold text-got-gold tracking-wider"
            style={{ fontFamily: 'Cinzel, serif' }}
          >
            Player {currentPlayer.id}
          </h2>
          <p
            className="text-got-parchment/40 text-sm mt-1 italic"
            style={{ fontFamily: 'EB Garamond, serif' }}
          >
            Keep this secret — others must not see!
          </p>
          <div className="gold-divider mt-3" />
        </div>

        {/* Card */}
        <div
          className="relative w-full"
          style={{ height: '420px' }}
        >
          <FlipCard
            isFlipped={isFlipped}
            front={<CardBack />}
            back={currentPlayer.isImpostor ? <ImpostorCard /> : <LoyalistCard character={secretCharacter} />}
          />
        </div>

        {/* Action buttons */}
        <AnimatePresence mode="wait">
          {!isFlipped ? (
            <motion.button
              key="reveal"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              whileTap={{ scale: 0.97 }}
              onClick={handleReveal}
              className="w-full py-5 rounded border border-got-gold bg-got-gold/10 text-got-gold text-xl tracking-widest uppercase transition-all hover:bg-got-gold/20"
              style={{ fontFamily: 'Cinzel, serif' }}
            >
              Reveal Card
            </motion.button>
          ) : (
            <motion.div
              key="actions"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="w-full flex flex-col gap-3"
            >
              <button
                onClick={handleHide}
                className="w-full py-3 rounded border border-stone-700 text-stone-400 text-base tracking-widest uppercase transition-all hover:border-stone-500 hover:text-stone-300"
                style={{ fontFamily: 'Cinzel, serif' }}
              >
                Hide Card
              </button>
              <button
                onClick={handleNext}
                className="w-full py-5 rounded border border-got-gold bg-got-gold/10 text-got-gold text-xl tracking-widest uppercase transition-all hover:bg-got-gold/20"
                style={{ fontFamily: 'Cinzel, serif' }}
              >
                {isLastPlayer ? "Everyone's Ready" : 'Next Player →'}
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Progress dots */}
        <div className="flex gap-2 pb-4">
          {players.map((_, i) => (
            <div
              key={i}
              className="w-2 h-2 rounded-full transition-all duration-300"
              style={{
                background: i < currentRevealIndex
                  ? '#c9a84c'
                  : i === currentRevealIndex
                  ? '#c9a84c'
                  : '#3a3a3a',
                opacity: i < currentRevealIndex ? 0.4 : 1,
              }}
            />
          ))}
        </div>
      </div>
    </PageWrapper>
  )
}
