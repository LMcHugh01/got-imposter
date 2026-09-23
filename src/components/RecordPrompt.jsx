import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { CINZEL, GARAMOND, FOCUS } from './GameHome'

/**
 * A quiet line for guests on game home pages: sign in to keep your record.
 * Returns them to this page afterwards. Shows nothing to signed-in players.
 */
export default function RecordPrompt({ className = '' }) {
  const { signedIn, ready } = useAuth()
  const { pathname } = useLocation()
  if (!ready || signedIn) return null
  const next = encodeURIComponent(pathname)
  const link = `px-1 py-1 text-[11px] uppercase tracking-[0.26em] text-realm-gold hover:text-realm-cream transition-colors ${FOCUS}`
  return (
    <p className={`text-[17px] italic text-realm-muted text-balance ${className}`} style={GARAMOND}>
      <Link to={`/login?next=${next}`} className={link} style={CINZEL}>
        Log In
      </Link>{' '}
      or{' '}
      <Link to={`/signup?next=${next}`} className={link} style={CINZEL}>
        Sign Up
      </Link>{' '}
      to keep your record and earn honours.
    </p>
  )
}
