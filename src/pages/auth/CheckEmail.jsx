import { useEffect, useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { CINZEL, FOCUS } from '../../components/GameHome'
import { AuthPage, AuthHeading, AuthMark, FormError, FormNote, AltLine } from '../../components/AuthForm'
import { useAuth } from '../../lib/auth'

const COOLDOWN = 60

/** /signup/sent — "A raven has been sent." Resend after a minute; fix a wrong address. */
export default function CheckEmail() {
  const { resendConfirmation } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const form = location.state
  const [wait, setWait] = useState(COOLDOWN)
  const [note, setNote] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (wait <= 0) return
    const id = setTimeout(() => setWait((w) => w - 1), 1000)
    return () => clearTimeout(id)
  }, [wait])

  if (!form?.email) return <Navigate to="/signup" replace />

  const resend = async () => {
    setError(null)
    setNote(null)
    const { error: err } = await resendConfirmation(form.email)
    if (err) return setError(err)
    setNote('Another raven is on its way.')
    setWait(COOLDOWN)
  }

  return (
    <AuthPage>
      <AuthHeading ornament={<AuthMark lit />} eyebrow="Check Your Email" title="A Raven Has Been Sent">
        We sent a link to <span className="not-italic text-realm-cream">{form.email}</span>. Open it to confirm your
        account and take your seat.
      </AuthHeading>

      <FormNote>No sign of it? Check your spam folder, or send another.</FormNote>
      <FormError>{error}</FormError>
      {note && <FormNote>{note}</FormNote>}

      <button
        type="button"
        onClick={resend}
        disabled={wait > 0}
        className={`mt-8 px-2 py-3 text-[11px] uppercase tracking-[0.3em] transition-colors ${
          wait > 0 ? 'text-realm-faint cursor-default' : 'text-realm-gold hover:text-realm-cream cursor-pointer'
        } ${FOCUS}`}
        style={CINZEL}
      >
        {wait > 0 ? `Send Again in ${wait}s` : 'Send Again'}
      </button>

      <AltLine prompt="Wrong address?" onClick={() => navigate('/signup', { state: form })}>
        Go Back
      </AltLine>
    </AuthPage>
  )
}
