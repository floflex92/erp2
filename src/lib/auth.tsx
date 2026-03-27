import { createContext, useContext, useEffect, useState } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from './supabase'

const SESSION_TIMEOUT_MS = 8000
const PROFILE_TIMEOUT_MS = 8000

export type Role = 'admin' | 'dirigeant' | 'exploitant' | 'mecanicien' | 'commercial' | 'comptable'

export const ROLE_LABELS: Record<Role, string> = {
  admin: 'Administrateur',
  dirigeant: 'Dirigeant',
  exploitant: 'Exploitant',
  mecanicien: 'Mecanicien',
  commercial: 'Commercial',
  comptable: 'Comptable',
}

export const ROLE_ACCESS: Record<Role, string[]> = {
  admin: ['dashboard', 'chauffeurs', 'vehicules', 'transports', 'clients', 'facturation', 'tachygraphe', 'planning', 'parametres', 'utilisateurs'],
  dirigeant: ['dashboard', 'chauffeurs', 'vehicules', 'transports', 'clients', 'facturation', 'tachygraphe', 'planning', 'parametres', 'utilisateurs'],
  exploitant: ['dashboard', 'chauffeurs', 'vehicules', 'transports', 'tachygraphe', 'planning', 'parametres'],
  mecanicien: ['vehicules', 'tachygraphe', 'parametres'],
  commercial: ['dashboard', 'transports', 'clients', 'facturation', 'parametres'],
  comptable: ['dashboard', 'facturation', 'parametres'],
}

export function canAccess(role: Role | null, page: string): boolean {
  if (!role) return false
  return ROLE_ACCESS[role]?.includes(page) ?? false
}

export function firstPage(role: Role): string {
  return '/' + (ROLE_ACCESS[role]?.[0] ?? 'dashboard')
}

export interface Profil {
  id: string
  role: Role
  nom: string | null
  prenom: string | null
}

function withTimeout<T>(promise: PromiseLike<T>, timeoutMs: number, label: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(() => reject(new Error(`${label} timed out`)), timeoutMs)

    Promise.resolve(promise).then(
      value => {
        window.clearTimeout(timer)
        resolve(value)
      },
      error => {
        window.clearTimeout(timer)
        reject(error)
      },
    )
  })
}

interface AuthContextType {
  session: Session | null
  user: User | null
  profil: Profil | null
  role: Role | null
  sessionRole: Role | null
  isAdmin: boolean
  loading: boolean
  profilLoading: boolean
  authError: string | null
  signIn: (email: string, password: string) => Promise<{ error: string | null }>
  signOut: () => Promise<void>
  reloadProfil: () => Promise<void>
  setSessionRole: (r: Role) => void
  resetSessionRole: () => void
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [profil, setProfil] = useState<Profil | null>(null)
  const [sessionRole, setSessionRoleState] = useState<Role | null>(null)
  const [loading, setLoading] = useState(true)
  const [profilLoading, setProfilLoading] = useState(false)
  const [authError, setAuthError] = useState<string | null>(null)

  async function loadProfil(userId: string) {
    setProfilLoading(true)

    try {
      const { data, error } = await withTimeout(
        supabase
          .from('profils')
          .select('id, role, nom, prenom')
          .eq('user_id', userId)
          .maybeSingle(),
        PROFILE_TIMEOUT_MS,
        'profile load',
      )

      if (error) throw error

      const p = data ? { ...(data as Profil), role: 'admin' as Role } : null
      setProfil(p)
      setAuthError(null)
    } catch {
      setProfil(null)
      setAuthError("Impossible de charger le profil utilisateur.")
    } finally {
      setProfilLoading(false)
    }
  }

  async function reloadProfil() {
    if (session?.user) await loadProfil(session.user.id)
  }

  useEffect(() => {
    let active = true

    void (async () => {
      try {
        const { data } = await withTimeout(supabase.auth.getSession(), SESSION_TIMEOUT_MS, 'session load')
        if (!active) return

        setSession(data.session)

        if (data.session?.user) {
          void loadProfil(data.session.user.id)
        } else {
          setProfil(null)
          setSessionRoleState(null)
          setProfilLoading(false)
        }

        setAuthError(null)
      } catch {
        if (!active) return
        setSession(null)
        setProfil(null)
        setSessionRoleState(null)
        setProfilLoading(false)
        setAuthError("Impossible d'initialiser la session.")
      } finally {
        if (active) setLoading(false)
      }
    })()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      if (!active) return

      setSession(s)
      setAuthError(null)

      if (s?.user) {
        void loadProfil(s.user.id)
      } else {
        setProfil(null)
        setSessionRoleState(null)
        setProfilLoading(false)
      }
    })

    return () => {
      active = false
      subscription.unsubscribe()
    }
  }, [])

  function setSessionRole(r: Role) { setSessionRoleState(r) }
  function resetSessionRole() { setSessionRoleState(null) }

  async function signIn(email: string, password: string) {
    setAuthError(null)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return { error: error?.message ?? null }
  }

  async function signOut() {
    await supabase.auth.signOut()
    setSessionRoleState(null)
    setAuthError(null)
  }

  const isAdmin = Boolean(session?.user)
  const role = session?.user ? (sessionRole ?? 'admin') : null

  return (
    <AuthContext.Provider value={{
      session,
      user: session?.user ?? null,
      profil,
      role,
      sessionRole,
      isAdmin,
      loading,
      profilLoading,
      authError,
      signIn,
      signOut,
      reloadProfil,
      setSessionRole,
      resetSessionRole,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
