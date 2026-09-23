import { useState } from 'react'
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { GamePrimaryButton, Diamond, CINZEL, GARAMOND, FOCUS } from '../../components/GameHome'
import { AuthPage, AuthHeading, AuthField, Fields, FormError, FormNote, AltLine, smallLinkClass } from '../../components/AuthForm'
import { useAuth, safeNext } from '../../lib/auth'
import { isEmail } from '../../data/accountHouses'

function Ornament() {
  return <Diamond size={15} line="#d8b878" />
}

/**
 * /login — email, password, keep me signed in. Goes to the home page
 * afterwards, or back to wherever sent you here (?next=).
 */
export default function LogIn() {
  const { logIn, resendConfirmation, signedIn } = useAuth()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const next = safeNext(params.get('next'))

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [remember, setRemember] = useState(true)
  const [error, setError] = useState(null)
  const [unconfirmed, setUnconfirmed] = useState(false)
  const [note, setNote] = useState(null)
  const [busy, setBusy] = useState(false)

  if (signedIn && !busy) return <Navigate to={next} replace />

  const ready = isEmail(email) && password.length > 0

  const submit = async (e) => {
    e.preventDefault()
    if (busy) return
    if (!ready) return setError('Enter your email and password.')
    setBusy(true)
    setError(null)
    setNote(null)
    const res = await logIn({ email: email.trim(), password, remember })
    setBusy(false)
    if (res.error) {
      setUnconfirmed(res.unconfirmed)
      return setError(res.error)
    }
    navigate(next, { replace: true })
  }

  const resend = async () => {
    const res = await resendConfirmation(email.trim())
    setNote(res.error ?? 'A new confirmation raven is on its way.')
    setUnconfirmed(false)
  }

  return (
    <AuthPage>
      <AuthHeading ornament={<Ornament />} eyebrow="Welcome Back" title="Return to Court" />

      <form onSubmit={submit} className="w-full flex flex-col items-center" noValidate>
        <Fields>
          <AuthField
            label="Email"
            type="email"
            value={email}
            onChange={(v) => {
              setEmail(v)
              setError(null)
            }}
            placeholder="raven@westeros.com"
            autoComplete="email"
            inputMode="email"
          />
          <AuthField
            label="Password"
            aside={
              <Link to="/forgot" state={{ email }} className={smallLinkClass} style={CINZEL}>
                Forgotten?
              </Link>
            }
            type="password"
            reveal
            value={password}
            onChange={(v) => {
              setPassword(v)
              setError(null)
            }}
            placeholder="••••••••"
            autoComplete="current-password"
          />
        </Fields>

        <button
          type="button"
          role="checkbox"
          aria-checked={remember}
          onClick={() => setRemember((r) => !r)}
          className={`self-start flex items-center gap-3 mt-7 py-2 cursor-pointer ${FOCUS}`}
        >
          <Diamond size={9} fill={remember ? '#d8b878' : undefined} line={remember ? '#d8b878' : 'rgba(216,184,120,.4)'} />
          <span className="text-[17px] text-realm-note" style={GARAMOND}>
            Keep me signed in
          </span>
        </button>

        <FormError>{error}</FormError>
        {unconfirmed && (
          <button
            type="button"
            onClick={resend}
            className={`mt-2 px-2 py-2 text-[11px] uppercase tracking-[0.3em] text-realm-gold hover:text-realm-cream cursor-pointer ${FOCUS}`}
            style={CINZEL}
          >
            Send the Link Again
          </button>
        )}
        {note && <FormNote>{note}</FormNote>}

        <GamePrimaryButton type="submit" disabled={!ready || busy} className="mt-9 w-full justify-center">
          {busy ? 'Opening the Gates…' : 'Log In'}
        </GamePrimaryButton>
      </form>

      <AltLine prompt="New to the realm?" to={params.get('next') ? `/signup?next=${encodeURIComponent(next)}` : '/signup'}>
        Sign Up
      </AltLine>
    </AuthPage>
  )
}
