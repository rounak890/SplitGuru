'use client'

import { createContext, useContext, useEffect, useMemo, useState } from 'react'

export type Tokens = { access: string; refresh: string }
type AuthValue = { tokens: Tokens | null; userId: number | null; setTokens: (tokens: Tokens) => void; clearTokens: () => void }
const STORAGE_KEY = 'splitmate_tokens'
const AUTH_EVENT = 'splitmate:tokens'
const AuthContext = createContext<AuthValue | null>(null)

function parseTokens(value: string | null): Tokens | null {
  if (!value) return null
  try {
    const parsed = JSON.parse(value) as Partial<Tokens>
    return typeof parsed.access === 'string' && typeof parsed.refresh === 'string'
      ? { access: parsed.access, refresh: parsed.refresh }
      : null
  } catch { return null }
}

export function publishTokens(tokens: Tokens | null) {
  if (typeof window === 'undefined') return
  if (tokens) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(tokens))
  else window.localStorage.removeItem(STORAGE_KEY)
  window.dispatchEvent(new CustomEvent(AUTH_EVENT, { detail: tokens }))
}

function getUserId(token: string | undefined): number | null {
  if (!token) return null
  try {
    const payload = token.split('.')[1]?.replace(/-/g, '+').replace(/_/g, '/')
    if (!payload) return null
    const decoded = JSON.parse(atob(payload)) as { user_id?: number; userId?: number; sub?: string }
    const id = decoded.user_id ?? decoded.userId ?? (decoded.sub ? Number(decoded.sub) : NaN)
    return Number.isFinite(id) ? id : null
  } catch { return null }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [tokens, updateTokens] = useState<Tokens | null>(null)

  useEffect(() => {
    updateTokens(parseTokens(window.localStorage.getItem(STORAGE_KEY)))
    const onStorage = (event: StorageEvent) => {
      if (event.key === STORAGE_KEY) updateTokens(parseTokens(event.newValue))
    }
    const onAuth = (event: Event) => updateTokens((event as CustomEvent<Tokens | null>).detail)
    window.addEventListener('storage', onStorage)
    window.addEventListener(AUTH_EVENT, onAuth)
    return () => {
      window.removeEventListener('storage', onStorage)
      window.removeEventListener(AUTH_EVENT, onAuth)
    }
  }, [])

  const value = useMemo<AuthValue>(() => ({
    tokens,
    userId: getUserId(tokens?.access),
    setTokens: next => { publishTokens(next); updateTokens(next) },
    clearTokens: () => { publishTokens(null); updateTokens(null) },
  }), [tokens])
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const value = useContext(AuthContext)
  if (!value) throw new Error('useAuth must be used within AuthProvider')
  return value
}
