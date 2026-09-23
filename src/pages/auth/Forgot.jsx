import { useState } from 'react'
import { useLocation } from 'react-router-dom'
import { GamePrimaryButton } from '../../components/GameHome'
import { AuthPage, AuthHeading, AuthMark, AuthField, Fields, FormError, FormNote, AltLine } from '../../components/AuthForm'
import { useAuth } from '../../lib/auth'
import { isEmail } from '../../data/accountHouses'

/** /forgot — ask for a reset link. The answer never reveals whether an account exists. */
export default function Forgot() {
  const { requestPasswordReset } = useAuth()
  const location = useLocation()
  const [email, setEmail] = useState(location.state?.email ?? '')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    if (!isEmail(email) || busy) return
    setBusy(true)
    const res = await requestPasswordReset(email.trim())
    setBusy(false)
    if (res.error) return setError(res.error)
    setSent(true)
  }

  return (
    <AuthPage>
      <AuthHeading ornament={<AuthMark />} eyebrow="Forgotten Password" title="Send for a New Key">
        {sent
          ? null
          : 'Enter the email you swore with, and we’ll send a link to choose a new password.'}
      </AuthHeading>

      {sent ? (
        <FormNote>
          If <span className="not-italic text-realm-cream">{email.trim()}</span> has an account, a raven is on its way
          with a link. It only works once, and not for long.
        </FormNote>
      ) : (
        <form onSubmit={submit} className="w-full flex flex-col items-center" noValidate>
          <Fields>
            <AuthField label="Email" type="email" value={email} onChange={setEmail} placeholder="raven@westeros.com" autoComplete="email" />
          </Fields>
          <FormError>{error}</FormError>
          <GamePrimaryButton type="submit" disabled={!isEmail(email) || busy} className="mt-10 w-full justify-center">
            {busy ? 'Sending…' : 'Send the Link'}
          </GamePrimaryButton>
        </form>
      )}

      <AltLine prompt="Remembered it?" to="/login">
        Log In
      </AltLine>
    </AuthPage>
  )
}
