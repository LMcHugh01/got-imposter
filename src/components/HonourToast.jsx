import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Diamond, CINZEL, FOCUS } from './GameHome'

/**
 * A small notice when an honour is earned, wherever the player is.
 * Listens for the 'westerosi:honour' event from lib/recordSync.js.
 */
export default function HonourToast() {
  const [queue, setQueue] = useState([])

  useEffect(() => {
    const onHonour = (e) => setQueue((q) => [...q, e.detail])
    window.addEventListener('westerosi:honour', onHonour)
    return () => window.removeEventListener('westerosi:honour', onHonour)
  }, [])

  const current = queue[0]
  useEffect(() => {
    if (!current) return
    const id = setTimeout(() => setQueue((q) => q.slice(1)), 4500)
    return () => clearTimeout(id)
  }, [current])

  if (!current) return null
  return (
    <div className="fixed left-1/2 -translate-x-1/2 bottom-[max(20px,env(safe-area-inset-bottom))] z-[70] w-[calc(100%-32px)] max-w-[380px]" role="status" aria-live="polite">
      <Link
        key={current.id}
        to="/account"
        className={`flex items-center gap-4 px-5 py-4 bg-realm-panel border border-realm-gold/35 shadow-[0_20px_40px_-15px_rgba(0,0,0,.8)] animate-[riseIn_.3s_ease_both] ${FOCUS}`}
      >
        <Diamond size={14} fill="#d8b878" style={{ boxShadow: '0 0 16px rgba(216,184,120,.4)' }} />
        <span className="text-left">
          <span className="block text-[9px] uppercase tracking-[0.3em] text-realm-muted" style={CINZEL}>
            Honour Earned
          </span>
          <span className="block mt-1 text-[14px] uppercase tracking-[0.16em] text-realm-cream" style={CINZEL}>
            {current.title}
          </span>
        </span>
      </Link>
    </div>
  )
}
