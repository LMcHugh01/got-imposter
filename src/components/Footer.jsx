import { Link } from 'react-router-dom'

/**
 * components/Footer.jsx
 *
 * The quieter pages (About, Privacy), then what the site is and who made it.
 */

const CINZEL = { fontFamily: 'Cinzel, serif' }
const FOCUS = 'focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-4 focus-visible:outline-[#d8b878]'

const LINKS = [
  { label: 'About', to: '/about' },
  { label: 'Privacy', to: '/privacy' },
]

export default function Footer() {
  return (
    <footer className="flex flex-col items-center gap-[18px] text-center px-6 pt-20 pb-12">
      <span className="w-[7px] h-[7px] rotate-45 bg-[rgba(216,184,120,.5)]" aria-hidden="true" />
      <nav className="flex items-center gap-6" aria-label="Site">
        {LINKS.map((l) => (
          <Link
            key={l.to}
            to={l.to}
            className={`text-[11px] uppercase tracking-[0.3em] text-realm-body hover:text-[#eed49b] transition-colors ${FOCUS}`}
            style={CINZEL}
          >
            {l.label}
          </Link>
        ))}
      </nav>
      <p className="text-[11px] uppercase tracking-[0.32em] text-realm-muted" style={CINZEL}>
        A Song of Ice and Fire · Fan Project
      </p>
      <p className="text-[10px] uppercase tracking-[0.3em] text-realm-faint" style={CINZEL}>
        © {new Date().getFullYear()} DKG Development
      </p>
    </footer>
  )
}