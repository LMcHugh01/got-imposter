import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useGameStore } from '../store/gameStore'
import { fetchRandomCharacter } from '../lib/supabase'
import { assignImpostors } from '../lib/gameLogic'
import PageWrapper from '../components/PageWrapper'

function Stepper({ label, value, min, max, onChange }) {
  return (
    <div className="flex flex-col gap-2">
      <label
        className="text-got-gold/80 text-sm tracking-widest uppercase"
        style={{ fontFamily: 'Cinzel, serif' }}
      >
        {label}
      </label>
      <div className="flex items-center gap-4">
        <button
          onClick={() => onChange(Math.max(min, value - 1))}
          disabled={value <= min}
          className="w-12 h-12 rounded border border-stone-700 text-got-parchment text-2xl flex items-center justify-center disabled:opacity-30 hover:border-got-gold/50 hover:text-got-gold active:scale-95 transition-all"
        >
          −
        </button>
        <span
          className="text-3xl text-got-gold font-bold min-w-[3rem] text-center"
          style={{ fontFamily: 'Cinzel, serif' }}
        >
          {value}
        </span>
        <button
          onClick={() => onChange(Math.min(max, value + 1))}
          disabled={value >= max}
          className="w-12 h-12 rounded border border-stone-700 text-got-parchment text-2xl flex items-center justify-center disabled:opacity-30 hover:border-got-gold/50 hover:text-got-gold active:scale-95 transition-all"
        >
          +
        </button>
      </div>
    </div>
  )
}

const DIFFICULTIES = ['easy', 'medium', 'hard']
const DIFFICULTY_LABELS = { easy: 'Easy', medium: 'Medium', hard: 'Hard' }
const DIFFICULTY_DESC = {
  easy: 'Well-known characters',
  medium: 'Familiar characters',
  hard: 'Deep lore characters',
}

export default function Settings() {
  const navigate = useNavigate()
  const {
    totalPlayers, impostorCount, difficulty,
    setTotalPlayers, setImpostorCount, setDifficulty,
    startGame,
  } = useGameStore()

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const maxImpostors = Math.max(1, Math.floor(totalPlayers / 2))

  const handleStart = async () => {
    setLoading(true)
    setError(null)
    try {
      const character = await fetchRandomCharacter(difficulty)
      const players = assignImpostors(totalPlayers, impostorCount)
      startGame(character, players)
      navigate('/reveal')
    } catch (err) {
      setError('Failed to load character. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <PageWrapper>
      <div className="w-full max-w-sm flex flex-col gap-8">
        {/* Header */}
        <div className="text-center pt-4">
          <h2
            className="text-3xl font-bold tracking-widest uppercase text-got-gold"
            style={{ fontFamily: 'Cinzel, serif' }}
          >
            Game Setup
          </h2>
          <div className="gold-divider mt-3" />
        </div>

        {/* Players stepper */}
        <div className="bg-stone-900/60 border border-stone-800 rounded-lg p-6 flex flex-col gap-6">
          <Stepper
            label="Number of Players"
            value={totalPlayers}
            min={2}
            max={20}
            onChange={(n) => {
              setTotalPlayers(n)
              if (impostorCount > Math.floor(n / 2)) {
                setImpostorCount(Math.max(1, Math.floor(n / 2)))
              }
            }}
          />

          <div className="gold-divider" />

          <Stepper
            label="Number of Impostors"
            value={impostorCount}
            min={1}
            max={maxImpostors}
            onChange={setImpostorCount}
          />
        </div>

        {/* Difficulty */}
        <div className="flex flex-col gap-3">
          <label
            className="text-got-gold/80 text-sm tracking-widest uppercase"
            style={{ fontFamily: 'Cinzel, serif' }}
          >
            Difficulty
          </label>
          <div className="flex gap-2">
            {DIFFICULTIES.map((d) => (
              <button
                key={d}
                onClick={() => setDifficulty(d)}
                className={[
                  'flex-1 py-3 rounded border text-sm tracking-wide transition-all duration-200',
                  difficulty === d
                    ? 'border-got-gold bg-got-gold/15 text-got-gold'
                    : 'border-stone-700 text-stone-400 hover:border-stone-500 hover:text-stone-300',
                ].join(' ')}
                style={{ fontFamily: 'Cinzel, serif' }}
              >
                {DIFFICULTY_LABELS[d]}
              </button>
            ))}
          </div>
          <p className="text-got-parchment/40 text-sm text-center italic" style={{ fontFamily: 'EB Garamond, serif' }}>
            {DIFFICULTY_DESC[difficulty]}
          </p>
        </div>

        {/* Summary */}
        <div className="text-center text-got-parchment/50 text-base italic" style={{ fontFamily: 'EB Garamond, serif' }}>
          {totalPlayers} players · {impostorCount} impostor{impostorCount > 1 ? 's' : ''} · {DIFFICULTY_LABELS[difficulty]}
        </div>

        {error && (
          <p className="text-got-red-bright text-center text-sm">{error}</p>
        )}

        {/* Start Button */}
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={handleStart}
          disabled={loading}
          className="w-full py-5 rounded border border-got-gold bg-got-gold/10 text-got-gold text-xl tracking-widest uppercase transition-all duration-200 hover:bg-got-gold/20 disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ fontFamily: 'Cinzel, serif' }}
        >
          {loading ? 'Preparing...' : 'Start Game'}
        </motion.button>

        {/* Back */}
        <button
          onClick={() => navigate('/')}
          className="text-stone-600 text-sm text-center hover:text-stone-400 transition-colors"
          style={{ fontFamily: 'Cinzel, serif' }}
        >
          ← Back
        </button>
      </div>
    </PageWrapper>
  )
}
