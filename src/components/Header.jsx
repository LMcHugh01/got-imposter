import { useState } from 'react'
import { NavLink, Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { FaCrown } from 'react-icons/fa6'
import { useAuth } from '../lib/auth'

const NAV_LINKS = [
  { label: 'Home', to: '/' },
  { label: 'Games', to: '/games' },
  { label: 'Characters', to: '/characters' },
  { label: 'Houses', to: '/houses' },
  { label: 'About', to: '/about' },
]

function NavItem({ to, label, onClick }) {
  return (
    <NavLink
      to={to}
      onClick={onClick}
      end={to === '/'}
      className={({ isActive }) =>
        [
          'text-sm tracking-widest uppercase transition-colors duration-200',
          isActive ? 'text-got-gold' : 'text-got-parchment/60 hover:text-got-parchment',
        ].join(' ')
      }
      style={{ fontFamily: 'Cinzel, serif' }}
    >
      {label}
    </NavLink>
  )
}

// Signed in: your first name with a small diamond, to your account.
// Signed out: Log In. Nothing until the stored session has been checked,
// so it doesn't flicker from "Log In" to a name on load.
function AccountLink({ onClick, className = '' }) {
  const { ready, signedIn, profile } = useAuth()
  if (!ready) return <span className={`inline-block w-16 ${className}`} />
  if (signedIn) {
    const first = profile?.name?.trim().split(/\s+/)[0] ?? 'Account'
    return (
      <NavLink
        to="/account"
        onClick={onClick}
        className={({ isActive }) =>
          [
            'flex items-center gap-2 text-sm tracking-widest uppercase transition-colors duration-200',
            isActive ? 'text-got-gold' : 'text-realm-gold hover:text-got-parchment',
            className,
          ].join(' ')
        }
        style={{ fontFamily: 'Cinzel, serif' }}
      >
        <span className="w-[7px] h-[7px] rotate-45 bg-realm-gold shrink-0" aria-hidden="true" />
        {first}
      </NavLink>
    )
  }
  return <NavItem to="/login" label="Log In" onClick={onClick} />
}

export default function Header() {
  const [open, setOpen] = useState(false)

  return (
    // Transparent and part of the page flow: it sits on the app background
    // and scrolls away with the page (a transparent header can't stay fixed
    // without content scrolling underneath its links).
    <header className="relative z-50">
      <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
        {/* Brand — matches the Home hero's crown + "Westerosi Games" mark */}
        <Link to="/" className="flex items-center gap-2.5 select-none">
          <FaCrown className="text-lg text-got-gold leading-none" />
          <span
            className="text-base tracking-[0.2em] uppercase text-got-gold font-bold hidden sm:inline"
            style={{ fontFamily: 'Cinzel Decorative, serif' }}
          >
            Westerosi Games
          </span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-8">
          {NAV_LINKS.map((link) => (
            <NavItem key={link.to} {...link} />
          ))}
          <span className="w-px h-4 bg-realm-gold/25" aria-hidden="true" />
          <AccountLink />
        </nav>

        {/* Mobile toggle */}
        <button
          onClick={() => setOpen((v) => !v)}
          className="md:hidden w-9 h-9 flex flex-col items-center justify-center gap-1.5"
          aria-label="Toggle menu"
          aria-expanded={open}
        >
          <span
            className="block w-5 h-px bg-got-gold transition-transform duration-200"
            style={{ transform: open ? 'translateY(4px) rotate(45deg)' : 'none' }}
          />
          <span
            className="block w-5 h-px bg-got-gold transition-opacity duration-200"
            style={{ opacity: open ? 0 : 1 }}
          />
          <span
            className="block w-5 h-px bg-got-gold transition-transform duration-200"
            style={{ transform: open ? 'translateY(-4px) rotate(-45deg)' : 'none' }}
          />
        </button>
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {open && (
          <motion.nav
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="md:hidden overflow-hidden"
          >
            <div className="flex flex-col gap-5 px-4 py-6">
              {NAV_LINKS.map((link) => (
                <NavItem key={link.to} {...link} onClick={() => setOpen(false)} />
              ))}
              <div className="h-px bg-realm-gold/15" aria-hidden="true" />
              <AccountLink onClick={() => setOpen(false)} />
            </div>
          </motion.nav>
        )}
      </AnimatePresence>
    </header>
  )
}