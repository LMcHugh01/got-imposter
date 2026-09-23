import { useState } from 'react'
import { Link, Navigate, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { GamePrimaryButton, CINZEL } from '../../components/GameHome'
import { AuthPage, AuthHeading, AuthMark, AuthField, Fields, HousePicker, FormError, AltLine } from '../../components/AuthForm'
import { useAuth, safeNext } from '../../lib/auth'
import { DEFAULT_HOUSE, MIN_PASSWORD, isEmail } from '../../data/accountHouses'

/** /signup — name, email, password, house. */
export default function SignUp() {
  const { signUp, signedIn } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [params] = useSearchParams()
  const next = params.get('next')
  const kept = location.state ?? {} // coming back from "Wrong address?"

  const [name, setName] = useState(kept.name ?? '')
  const [email, setEmail] = useState(kept.email ?? '')
  const [password, setPassword] = useState('')
  const [house, setHouse] = useState(kept.house ?? DEFAULT_HOUSE)
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)

  if (signedIn) return <Navigate to={safeNext(next)} replace />

  const pwOk = password.length >= MIN_PASSWORD
  const ready = name.trim().length > 0 && isEmail(email) && pwOk
  const pwHint = password.length === 0 ? '' : pwOk ? 'Strong enough' : `${MIN_PASSWORD - password.length} more`

  const submit = async (e) => {
    e.preventDefault()
    if (!ready || busy) return
    setBusy(true)
    setError(null)
    const { error: err } = await signUp({ name, email: email.trim(), password, house })
    setBusy(false)
    if (err) return setError(err)
    navigate('/signup/sent', { state: { name, email: email.trim(), house } })
  }

  return (
    <AuthPage>
      <AuthHeading ornament={<AuthMark />} eyebrow="Join the Realm" title="Swear Fealty">
        Keep your streaks, high scores and honours across every game in the realm.
      </AuthHeading>

      <form onSubmit={submit} className="w-full flex flex-col items-center" noValidate>
        <Fields>
          <AuthField label="Your Name" value={name} onChange={setName} placeholder="Aegon of the Narrow Sea" autoComplete="name" maxLength={40} />
          <AuthField label="Email" type="email" value={email} onChange={setEmail} placeholder="raven@westeros.com" autoComplete="email" inputMode="email" />
          <AuthField
            label="Password"
            aside={
              <span className={`text-[10px] uppercase tracking-[0.2em] ${pwOk ? 'text-realm-gold' : 'text-realm-muted'}`} style={CINZEL} aria-live="polite">
                {pwHint}
              </span>
            }
            type="password"
            reveal
            value={password}
            onChange={setPassword}
            placeholder={`At least ${MIN_PASSWORD} characters`}
            autoComplete="new-password"
          />
        </Fields>

        <HousePicker value={house} onChange={setHouse} />

        <FormError>{error}</FormError>

        <GamePrimaryButton type="submit" disabled={!ready || busy} className="mt-10 w-full justify-center">
          {busy ? 'Sending a Raven…' : 'Create Account'}
        </GamePrimaryButton>

        <p className="mt-4 text-[15px] italic text-realm-dim" style={{ fontFamily: "'EB Garamond', Georgia, serif" }}>
          We keep your name, email and game record.{' '}
          <Link to="/privacy" className="underline decoration-realm-gold/40 underline-offset-2 hover:text-realm-cream">
            What we store
          </Link>
        </p>
      </form>

      <AltLine prompt="Already sworn?" to={next ? `/login?next=${encodeURIComponent(next)}` : '/login'}>
        Log In
      </AltLine>
    </AuthPage>
  )
}
