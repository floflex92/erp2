import { createContext, useContext, useEffect, useState } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from './supabase'

export type Role = 'admin' | 'dirigeant' | 'exploitant' | 'mecanicien' | 'commercial' | 'comptable'

export const ROLE_LABELS: Record<Role, string> = {
  admin:      'Administrateur',
  dirigeant:  'Dirigeant',
  exploitant: 'Exploitant',
  mecanicien: 'Mécanicien',
  commercial: 'Commercial',
  comptable:  'Comptable',
}

export const ROLE_ACCESS: Record<Role, string[]> = {
  admin:      ['dashboard', 'chauffeurs', 'vehicules', 'transports', 'clients', 'facturation', 'tachygraphe', 'planning', 'utilisateurs'],
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

export interface Profil {
  id: string
  role: Role
  nom: string | null
  prenom: string | null
}

interface AuthContextType {
  session: Session | null
  user: User | null
  profil: Profil | null
  role: Role | null          // rôle réel en base
  sessionRole: Role | null   // rôle actif (admin peut simuler un autre rôle)
  isAdmin: boolean
  loading: boolean
  signIn: (email: string, password: string) => Promise<{ error: string | null }>
  signOut: () => Promise<void>
  reloadProfil: () => Promise<void>
  setSessionRole: (r: Role) => void
  resetSessionRole: () => void  // revient au rôle réel
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [profil, setProfil] = useState<Profil | null>(null)
  const [sessionRole, setSessionRoleState] = useState<Role | null>(null)
  const [loading, setLoading] = useState(true)

  async function loadProfil(userId: string) {
    const { data } = await supabase
      .from('profils')
      .select('id, role, nom, prenom')
      .eq('user_id', userId)
      .maybeSingle()
    const p = data as Profil | null
    setProfil(p)
    // Un admin démarre sans sessionRole → déclenche le sélecteur
    if (p?.role !== 'admin') setSessionRoleState(p?.role ?? null)
    else setSessionRoleState(null)
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
      if (s?.user) await loadProfil(s.user.id)
      else { setProfil(null); setSessionRoleState(null) }
    })

    return () => subscription.unsubscribe()
  }, [])

  function setSessionRole(r: Role) { setSessionRoleState(r) }
  function resetSessionRole() { setSessionRoleState(null) } // repasse au sélecteur

  async function signIn(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return { error: error?.message ?? null }
  }

  async function signOut() {
    await supabase.auth.signOut()
    setSessionRoleState(null)
  }

  const isAdmin = profil?.role === 'admin'
  // Le rôle effectif : pour un admin qui simule, c'est sessionRole ; sinon le rôle réel
  const role = isAdmin ? sessionRole : (profil?.role ?? null)

  return (
    <AuthContext.Provider value={{
      session,
      user: session?.user ?? null,
      profil,
      role,
      sessionRole,
      isAdmin,
      loading,
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
