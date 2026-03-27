import { createContext, useContext, useEffect, useState } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from './supabase'

export type Role = 'dirigeant' | 'exploitant' | 'mecanicien' | 'commercial' | 'comptable'

export const ROLE_LABELS: Record<Role, string> = {
  dirigeant:  'Dirigeant',
  exploitant: 'Exploitant',
  mecanicien: 'Mécanicien',
  commercial: 'Commercial',
  comptable:  'Comptable',
}

// Pages accessibles par rôle
export const ROLE_ACCESS: Record<Role, string[]> = {
  dirigeant:  ['dashboard', 'chauffeurs', 'vehicules', 'transports', 'clients', 'facturation', 'tachygraphe', 'planning', 'utilisateurs'],
  exploitant: ['dashboard', 'chauffeurs', 'vehicules', 'transports', 'tachygraphe', 'planning'],
  mecanicien: ['vehicules', 'tachygraphe'],
  commercial: ['dashboard', 'transports', 'clients', 'facturation'],
  comptable:  ['dashboard', 'facturation'],
}

export function canAccess(role: Role | null, page: string): boolean {
  if (!role) return false
  return ROLE_ACCESS[role]?.includes(page) ?? false
}

interface Profil {
  id: string
  role: Role
  nom: string | null
  prenom: string | null
}

interface AuthContextType {
  session: Session | null
  user: User | null
  profil: Profil | null
  role: Role | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<{ error: string | null }>
  signOut: () => Promise<void>
  reloadProfil: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [profil, setProfil] = useState<Profil | null>(null)
  const [loading, setLoading] = useState(true)

  async function loadProfil(userId: string) {
    const { data } = await supabase
      .from('profils')
      .select('id, role, nom, prenom')
      .eq('user_id', userId)
      .maybeSingle()
    setProfil(data as Profil | null)
  }

  async function reloadProfil() {
    if (session?.user) await loadProfil(session.user.id)
  }

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      setSession(data.session)
      if (data.session?.user) await loadProfil(data.session.user.id)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, s) => {
      setSession(s)
      if (s?.user) {
        await loadProfil(s.user.id)
      } else {
        setProfil(null)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  async function signIn(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return { error: error?.message ?? null }
  }

  async function signOut() {
    await supabase.auth.signOut()
  }

  return (
    <AuthContext.Provider value={{
      session,
      user: session?.user ?? null,
      profil,
      role: profil?.role ?? null,
      loading,
      signIn,
      signOut,
      reloadProfil,
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
