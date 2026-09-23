import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { GamePrimaryButton } from '../../components/GameHome'
import { AuthPage, AuthHeading, AuthMark, AuthField, Fields, FormError, FormNote, AltLine } from '../../components/AuthForm'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../lib/auth'
import { isEmail } from '../../data/accountHouses'

/**
 * /auth/confirm — where the confirmation email's link lands. Supabase signs
 * the player in from the link; we then send them to their account for the
 * welcome. Expired or used links get a way to ask for a new one.
 */
function linkError() {
  const params = new URLSearchParams(window.location.hash.slice(1) || window.location.search)
  return params.get('error_description') || params.get('error')
}

export default function AuthConfirm() {
  const { user, ready, resendConfirmation } = useAuth()
  const [failed, setFailed] = useState(() => Boolean(linkError()))
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    // Newer Supabase links carry a one-time ?code= to exchange for a session.
    const code = new URLSearchParams(window.location.search).get('code')
    if (code) {
      supabase.auth.exchangeCodeForSession(code).then(({ error: err }) => err && setFailed(true))
    }
  }, [])

  // If no session has appeared a few seconds after the stored session was
  // checked, the link didn't work.
  useEffect(() => {
    if (!ready || user) return
    const id = setTimeout(() => setFailed(true), 6000)
    return () => clearTimeout(id)
  }, [ready, user])

  if (user) return <Navigate to="/account?welcome" replace />

  if (!failed) {
    return (
      <AuthPage>
        <AuthHeading ornament={<AuthMark lit />} eyebrow="One Moment" title="Breaking the Seal" />
      </AuthPage>
    )
  }

  const resend = async (e) => {
    e.preventDefault()
    if (!isEmail(email)) return
    setError(null)
    const { error: err } = await resendConfirmation(email.trim())
    if (err) return setError(err)
    setSent(true)
  }

  return (
    <AuthPage>
      <AuthHeading ornament={<AuthMark />} eyebrow="The Seal Is Broken" title="This Link Has Expired">
        Confirmation links only work once, and not for long. Enter your email and we’ll send a fresh one.
      </AuthHeading>
      {sent ? (
        <FormNote>A new raven is on its way. Open the latest email.</FormNote>
      ) : (
        <form onSubmit={resend} className="w-full flex flex-col items-center" noValidate>
          <Fields>
            <AuthField label="Email" type="email" value={email} onChange={setEmail} placeholder="raven@westeros.com" autoComplete="email" />
          </Fields>
          <FormError>{error}</FormError>
          <GamePrimaryButton type="submit" disabled={!isEmail(email)} className="mt-10 w-full justify-center">
            Send a New Link
          </GamePrimaryButton>
        </form>
      )}
      <AltLine prompt="Already confirmed?" to="/login">
        Log In
      </AltLine>
    </AuthPage>
  )
}
