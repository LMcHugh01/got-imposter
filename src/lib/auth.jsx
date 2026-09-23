import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { supabase, setRememberMe } from './supabase'
import { setRecordUser, syncOnSignIn } from './recordSync'

/**
 * lib/auth.jsx
 *
 * The signed-in player (if any) and everything you can do with an account.
 * Wrap the app in <AuthProvider>; read it anywhere with useAuth().
 *
 * Supabase handles passwords, sessions and emails. This file adds the
 * profile (name, house), links sign-in to the record/honours sync, and
 * turns Supabase's errors into plain sentences.
 */
const AuthContext = createContext(null)

const origin = () => window.location.origin

/** Where a link or redirect may send someone after signing in — only paths on this site. */
export function safeNext(next, fallback = '/') {
  return typeof next === 'string' && next.startsWith('/') && !next.startsWith('//') ? next : fallback
}

function friendlyError(error) {
  if (!error) return null
  const code = error.code ?? ''
  const msg = (error.message ?? '').toLowerCase()
  if (code === 'invalid_credentials' || msg.includes('invalid login credentials')) {
    return 'That email and password don’t match.'
  }
  if (code === 'email_not_confirmed' || msg.includes('email not confirmed')) {
    return 'Confirm your email first. Check your inbox for the raven.'
  }
  if (error.status === 429 || code.includes('rate_limit')) {
    return 'Too many attempts. Try again in a few minutes.'
  }
  if (code === 'weak_password' || msg.includes('password should be')) {
    return 'Choose a longer password: at least 8 characters.'
  }
  if (code === 'same_password') return 'That is already your password.'
  if (code === 'email_address_invalid' || msg.includes('invalid email')) return 'That email address doesn’t look right.'
  if (msg.includes('failed to fetch') || msg.includes('network')) {
    return 'The ravens could not get through. Check your connection.'
  }
  return error.message || 'Something went wrong. Try again.'
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [ready, setReady] = useState(false) // true once the stored session has been checked
  const [recovering, setRecovering] = useState(false) // opened from a password-reset link
  const syncedFor = useRef(null)

  const user = session?.user ?? null

  const loadProfile = useCallback(async (userId) => {
    const { data } = await supabase.from('profiles').select('name, house, created_at').eq('id', userId).maybeSingle()
    setProfile(data ?? null)
  }, [])

  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((event, next) => {
      setSession(next)
      setRecordUser(next?.user?.id ?? null)
      if (event === 'PASSWORD_RECOVERY') setRecovering(true)
      if (event === 'INITIAL_SESSION') setReady(true)
      if (!next) {
        setProfile(null)
        syncedFor.current = null
        return
      }
      // Supabase advises against awaiting its own calls inside this
      // callback, so the follow-up work runs just after it.
      const userId = next.user.id
      setTimeout(() => {
        loadProfile(userId)
        if (syncedFor.current !== userId) {
          syncedFor.current = userId
          syncOnSignIn(userId).catch((err) => console.warn(err.message))
        }
      }, 0)
    })
    return () => data.subscription.unsubscribe()
  }, [loadProfile])

  /* ---------------- actions: each returns { error } with a readable message ---------------- */

  const signUp = useCallback(async ({ name, email, password, house }) => {
    setRememberMe(true)
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name: name.trim(), house }, emailRedirectTo: `${origin()}/auth/confirm` },
    })
    // An existing email gets the same "check your inbox" answer as a new one,
    // so this form can't be used to find out who has an account.
    return { error: friendlyError(error), user: data?.user ?? null }
  }, [])

  const resendConfirmation = useCallback(async (email) => {
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email,
      options: { emailRedirectTo: `${origin()}/auth/confirm` },
    })
    return { error: friendlyError(error) }
  }, [])

  const logIn = useCallback(async ({ email, password, remember }) => {
    setRememberMe(remember)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return { error: friendlyError(error), unconfirmed: error?.code === 'email_not_confirmed' }
  }, [])

  const logOut = useCallback(async () => {
    await supabase.auth.signOut()
    setRecovering(false)
  }, [])

  const requestPasswordReset = useCallback(async (email) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${origin()}/reset` })
    // Only rate limits are worth showing; "no such account" must look like success.
    return { error: error?.status === 429 ? friendlyError(error) : null }
  }, [])

  const setNewPassword = useCallback(async (password) => {
    const { error } = await supabase.auth.updateUser({ password })
    if (!error) setRecovering(false)
    return { error: friendlyError(error) }
  }, [])

  const updateProfile = useCallback(
    async ({ name, house }) => {
      if (!user) return { error: 'You are not signed in.' }
      const { error } = await supabase
        .from('profiles')
        .update({ name: name.trim(), house, updated_at: new Date().toISOString() })
        .eq('id', user.id)
      if (!error) await loadProfile(user.id)
      return { error: error ? 'Could not save your profile. Try again.' : null }
    },
    [user, loadProfile]
  )

  const changeEmail = useCallback(async (email) => {
    const { error } = await supabase.auth.updateUser({ email }, { emailRedirectTo: `${origin()}/account` })
    return { error: friendlyError(error) }
  }, [])

  const deleteAccount = useCallback(async () => {
    const { error } = await supabase.functions.invoke('delete-account', { method: 'POST' })
    if (error) return { error: 'Could not delete your account. Try again, or contact us.' }
    await supabase.auth.signOut({ scope: 'local' })
    return { error: null }
  }, [])

  const value = useMemo(
    () => ({
      ready,
      user,
      profile,
      signedIn: Boolean(user),
      recovering,
      signUp,
      resendConfirmation,
      logIn,
      logOut,
      requestPasswordReset,
      setNewPassword,
      updateProfile,
      changeEmail,
      deleteAccount,
    }),
    [ready, user, profile, recovering, signUp, resendConfirmation, logIn, logOut, requestPasswordReset, setNewPassword, updateProfile, changeEmail, deleteAccount]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}
