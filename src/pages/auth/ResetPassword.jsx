import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { GamePrimaryButton, CINZEL } from '../../components/GameHome'
import { AuthPage, AuthHeading, AuthMark, AuthField, Fields, FormError, AltLine } from '../../components/AuthForm'
import { useAuth } from '../../lib/auth'
import { MIN_PASSWORD } from '../../data/accountHouses'

/**
 * /reset — opened from the password-reset email, which signs the player in
 * for this one purpose. Choose a new password, then on to the account.
 */
export default function ResetPassword() {
  const { user, ready, setNewPassword } = useAuth()
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)
  const [expired, setExpired] = useState(() => /error/.test(window.location.hash + window.location.search))

  // No session a few seconds after checking means the link didn't work.
  useEffect(() => {
    if (!ready || user) return
    const id = setTimeout(() => setExpired(true), 6000)
    return () => clearTimeout(id)
  }, [ready, user])

  const pwOk = password.length >= MIN_PASSWORD

  const submit = async (e) => {
    e.preventDefault()
    if (!pwOk || busy) return
    setBusy(true)
    const res = await setNewPassword(password)
    setBusy(false)
    if (res.error) return setError(res.error)
    navigate('/account', { replace: true })
  }

  if (expired && !user) {
    return (
      <AuthPage>
        <AuthHeading ornament={<AuthMark />} eyebrow="The Seal Is Broken" title="This Link Has Expired">
          Reset links only work once, and not for long. Ask for a fresh one.
        </AuthHeading>
        <AltLine prompt="Still locked out?" to="/forgot">
          Send a New Link
        </AltLine>
      </AuthPage>
    )
  }

  return (
    <AuthPage>
      <AuthHeading ornament={<AuthMark lit />} eyebrow="New Password" title="Forge a New Key" />
      <form onSubmit={submit} className="w-full flex flex-col items-center" noValidate>
        <Fields>
          <AuthField
            label="New Password"
            aside={
              password.length > 0 && (
                <span className={`text-[10px] uppercase tracking-[0.2em] ${pwOk ? 'text-realm-gold' : 'text-realm-muted'}`} style={CINZEL}>
                  {pwOk ? 'Strong enough' : `${MIN_PASSWORD - password.length} more`}
                </span>
              )
            }
            type="password"
            reveal
            value={password}
            onChange={setPassword}
            placeholder={`At least ${MIN_PASSWORD} characters`}
            autoComplete="new-password"
            autoFocus
          />
        </Fields>
        <FormError>{error}</FormError>
        <GamePrimaryButton type="submit" disabled={!pwOk || busy || !user} className="mt-10 w-full justify-center">
          {busy ? 'Saving…' : 'Save Password'}
        </GamePrimaryButton>
      </form>
    </AuthPage>
  )
}
