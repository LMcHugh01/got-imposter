import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase environment variables not set.')
}

/*
 * "Keep me signed in": the session is stored in localStorage (survives
 * closing the browser) or sessionStorage (gone when the browser closes),
 * depending on the choice made at log-in. The choice itself is remembered
 * in localStorage so the right store is read after a refresh.
 */
const REMEMBER_KEY = 'westerosi.auth.remember'

export function setRememberMe(remember) {
  try {
    window.localStorage.setItem(REMEMBER_KEY, remember ? '1' : '0')
  } catch {
    // storage unavailable — the default (remembered) applies
  }
}

function sessionStore() {
  try {
    return window.localStorage.getItem(REMEMBER_KEY) === '0' ? window.sessionStorage : window.localStorage
  } catch {
    return null
  }
}

const authStorage = {
  getItem: (key) => sessionStore()?.getItem(key) ?? null,
  setItem: (key, value) => sessionStore()?.setItem(key, value),
  removeItem: (key) => {
    try {
      window.localStorage.removeItem(key)
      window.sessionStorage.removeItem(key)
    } catch {
      // nothing to remove
    }
  },
}

export const supabase = createClient(supabaseUrl || 'https://placeholder.supabase.co', supabaseAnonKey || 'placeholder-key', {
  auth: {
    storage: authStorage,
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
})