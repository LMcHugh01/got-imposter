import { useState } from 'react'
import { NavLink, Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '../lib/auth'
import { SITE } from '../data/site'

/**
 * components/Header.jsx
 *
 * A gold diamond and the site's name on the left; the sections of the site
 * on the right, then your account. Transparent and part of the page flow:
 * it sits on the app background and scrolls away with the page. About and
 * Privacy live in the footer.
 */

const NAV_LINKS = [
  { label: 'Home', to: '/' },
  { label: 'Games', to: '/games' },
  { label: 'Map', to: '/maps' },
  { label: 'Characters', to: '/characters' },
  { label: 'Houses', to: '/houses' },
]

const CINZEL = { fontFamily: 'Cinzel, serif' }
const FOCUS = 'focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-4 focus-visible:outline-[#d8b878]'

function NavItem({ to, label, onClick, large = false }) {
  return (
    <NavLink
      to={to}
      onClick={onClick}
      end={to === '/'}
      className={({ isActive }) =>
        [
          large ? 'text-[15px] py-1' : 'text-[12px]',
          'uppercase tracking-[0.2em] whitespace-nowrap transition-colors duration-200',
          isActive ? 'text-realm-gold' : 'text-[#9d9483] hover:text-[#eed49b]',
          FOCUS,
        ].join(' ')
      }
      style={CINZEL}
    >
      {label}
    </NavLink>
  )
}

// Signed in: your first name with a small diamond, to your account.
// Signed out: Log In. Nothing until the stored session has been checked,
// so it doesn't flicker from "Log In" to a name on load.
function AccountLink({ onClick, large = false }) {
  const { ready, signedIn, profile } = useAuth()
  if (!ready) return <span className="inline-block w-16" />
  if (signedIn) {
    const first = profile?.name?.trim().split(/\s+/)[0] ?? 'Account'
    return (
      <NavLink
        to="/account"
        onClick={onClick}
        className={({ isActive }) =>
          [
            large ? 'text-[15px] py-1' : 'text-[12px]',
            'flex items-center gap-2 uppercase tracking-[0.2em] whitespace-nowrap transition-colors duration-200',
            isActive ? 'text-[#eed49b]' : 'text-realm-gold hover:text-[#eed49b]',
            FOCUS,
          ].join(' ')
        }
        style={CINZEL}
      >
        <span className="w-[6px] h-[6px] rotate-45 bg-realm-gold shrink-0" aria-hidden="true" />
        {first}
      </NavLink>
    )
  }
  return <NavItem to="/login" label="Log In" onClick={onClick} large={large} />
}

export default function Header() {
  const [open, setOpen] = useState(false)
  const close = () => setOpen(false)

  return (
    <header className="relative z-50">
      <div className="max-w-[1200px] mx-auto px-5 sm:px-7 py-6 flex items-center justify-between gap-8">
        <Link to="/" onClick={close} className={`flex items-center gap-3 select-none shrink-0 ${FOCUS}`}>
          <span className="w-[9px] h-[9px] rotate-45 bg-realm-gold" aria-hidden="true" />
          <span className="text-[17px] font-semibold tracking-[0.16em] text-realm-gold whitespace-nowrap" style={CINZEL}>
            {SITE.name}
          </span>
        </Link>

        {/* Desktop */}
        <nav className="hidden lg:flex items-center gap-[30px]" aria-label="Main">
          {NAV_LINKS.map((link) => (
            <NavItem key={link.to} {...link} />
          ))}
          <span className="w-px h-[14px] bg-realm-gold/30" aria-hidden="true" />
          <AccountLink />
        </nav>

        {/* Mobile and tablet toggle */}
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className={`lg:hidden w-10 h-10 -mr-2 flex flex-col items-center justify-center gap-1.5 ${FOCUS}`}
          aria-label={open ? 'Close menu' : 'Open menu'}
          aria-expanded={open}
          aria-controls="site-menu"
        >
          <span
            className="block w-5 h-px bg-realm-gold transition-transform duration-200"
            style={{ transform: open ? 'translateY(7px) rotate(45deg)' : 'none' }}
          />
          <span className="block w-5 h-px bg-realm-gold transition-opacity duration-200" style={{ opacity: open ? 0 : 1 }} />
          <span
            className="block w-5 h-px bg-realm-gold transition-transform duration-200"
            style={{ transform: open ? 'translateY(-7px) rotate(-45deg)' : 'none' }}
          />
        </button>
      </div>

      <AnimatePresence>
        {open && (
          <motion.nav
            id="site-menu"
            aria-label="Main"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="lg:hidden overflow-hidden"
          >
            <div className="flex flex-col items-center gap-5 px-5 pt-2 pb-8">
              {NAV_LINKS.map((link) => (
                <NavItem key={link.to} {...link} onClick={close} large />
              ))}
              <span className="w-[5px] h-[5px] rotate-45 bg-realm-gold/40 my-1" aria-hidden="true" />
              <AccountLink onClick={close} large />
            </div>
          </motion.nav>
        )}
      </AnimatePresence>
    </header>
  )
}