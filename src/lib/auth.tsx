import { createContext, useContext, useEffect, useState } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from './supabase'

const SESSION_TIMEOUT_MS = 8000
const PROFILE_TIMEOUT_MS = 8000
const LOGIN_TIMEOUT_MS = 10000

const ROLE_VALUES = ['admin', 'dirigeant', 'exploitant', 'mecanicien', 'commercial', 'comptable', 'rh', 'conducteur', 'conducteur_affreteur', 'client', 'affreteur'] as const
const ROLE_SET = new Set<string>(ROLE_VALUES)
const ROLE_ALIASES: Record<string, Role> = {
  administrateur: 'admin',
  administrator: 'admin',
  direction: 'dirigeant',
  exploitation: 'exploitant',
  atelier: 'mecanicien',
  mecanicienne: 'mecanicien',
  mecaniciene: 'mecanicien',
  resources_humaines: 'rh',
  ressources_humaines: 'rh',
  chauffeur: 'conducteur',
  driver: 'conducteur',
  conducteuraffreteur: 'conducteur_affreteur',
  driver_affreteur: 'conducteur_affreteur',
  subcontractor_driver: 'conducteur_affreteur',
  customer: 'client',
  subcontractor: 'affreteur',
  affretement: 'affreteur',
}
const RESERVED_ADMIN_EMAIL_ROLE: Record<string, Role> = {
  'admin@erp-demo.fr': 'admin',
  'direction@erp-demo.fr': 'dirigeant',
  'chabre.florent@gmail.com': 'admin',
}

export type Role = 'admin' | 'dirigeant' | 'exploitant' | 'mecanicien' | 'commercial' | 'comptable' | 'rh' | 'conducteur' | 'conducteur_affreteur' | 'client' | 'affreteur'

export const ROLE_LABELS: Record<Role, string> = {
  admin: 'Administrateur',
  dirigeant: 'Dirigeant',
  exploitant: 'Exploitant',
  mecanicien: 'Mecanicien',
  commercial: 'Commercial',
  comptable: 'Comptable',
  rh: 'Ressources humaines',
  conducteur: 'Conducteur',
  conducteur_affreteur: 'Conducteur affreteur',
  client: 'Client',
  affreteur: 'Affreteur',
}

export const ROLE_ACCESS: Record<Role, string[]> = {
  admin: ['dashboard', 'tasks', 'chauffeurs', 'rh', 'vehicules', 'remorques', 'equipements', 'maintenance', 'transports', 'clients', 'facturation', 'paie', 'frais', 'tachygraphe', 'amendes', 'map-live', 'planning', 'feuille-route', 'prospection', 'demandes-clients', 'espace-client', 'espace-affreteur', 'parametres', 'utilisateurs', 'communication', 'tchat', 'mail', 'coffre', 'mentions-legales'],
  dirigeant: ['dashboard', 'tasks', 'chauffeurs', 'rh', 'vehicules', 'remorques', 'equipements', 'maintenance', 'transports', 'clients', 'facturation', 'paie', 'frais', 'tachygraphe', 'amendes', 'map-live', 'planning', 'feuille-route', 'prospection', 'demandes-clients', 'espace-client', 'espace-affreteur', 'parametres', 'utilisateurs', 'communication', 'tchat', 'mail', 'coffre', 'mentions-legales'],
  exploitant: ['dashboard', 'tasks', 'chauffeurs', 'vehicules', 'remorques', 'equipements', 'maintenance', 'transports', 'frais', 'tachygraphe', 'amendes', 'map-live', 'planning', 'feuille-route', 'demandes-clients', 'parametres', 'communication', 'tchat', 'mail', 'coffre', 'mentions-legales'],
  mecanicien: ['tasks', 'vehicules', 'remorques', 'equipements', 'maintenance', 'frais', 'tachygraphe', 'parametres', 'communication', 'tchat', 'mail', 'coffre', 'mentions-legales'],
  commercial: ['dashboard', 'tasks', 'transports', 'clients', 'facturation', 'frais', 'prospection', 'demandes-clients', 'parametres', 'communication', 'tchat', 'mail', 'coffre', 'mentions-legales'],
  comptable: ['dashboard', 'tasks', 'facturation', 'paie', 'frais', 'clients', 'amendes', 'demandes-clients', 'parametres', 'communication', 'tchat', 'mail', 'coffre', 'mentions-legales'],
  rh: ['tasks', 'chauffeurs', 'rh', 'paie', 'frais', 'parametres', 'communication', 'tchat', 'mail', 'coffre', 'mentions-legales'],
  conducteur: ['tasks', 'feuille-route', 'frais', 'tachygraphe', 'amendes', 'parametres', 'communication', 'tchat', 'mail', 'coffre', 'mentions-legales'],
  conducteur_affreteur: ['tasks', 'feuille-route', 'tachygraphe', 'amendes', 'parametres', 'communication', 'tchat', 'mail', 'coffre', 'mentions-legales'],
  client: ['tasks', 'espace-client', 'communication', 'tchat', 'mail', 'coffre', 'mentions-legales'],
  affreteur: ['tasks', 'espace-affreteur', 'transports', 'planning', 'map-live', 'feuille-route', 'communication', 'tchat', 'mail', 'coffre', 'mentions-legales'],
}

export const CHAT_BLOCKED_PAIRS: [Role, Role][] = [
  ['conducteur', 'client'],
  ['conducteur_affreteur', 'client'],
]

export function canChatWith(roleA: Role, roleB: Role): boolean {
  return !CHAT_BLOCKED_PAIRS.some(
    ([a, b]) => (a === roleA && b === roleB) || (a === roleB && b === roleA)
  )
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
  email?: string | null
  domain?: string | null
  isDemo?: boolean
}

function normalizeRoleToken(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[\s-]+/g, '_')
}

function normalizeRole(value: unknown): Role | null {
  if (typeof value !== 'string') return null
  const token = normalizeRoleToken(value)
  if (ROLE_SET.has(token)) return token as Role
  return ROLE_ALIASES[token] ?? null
}

function fallbackRoleFromEmail(email: string | null | undefined): Role | null {
  if (!email) return null
  const normalized = email.trim().toLowerCase()
  const reservedRole = RESERVED_ADMIN_EMAIL_ROLE[normalized]
  if (reservedRole) return reservedRole

  const localPart = normalized.split('@')[0] ?? ''
  if (localPart === 'admin') return 'admin'
  if (localPart === 'direction' || localPart === 'dirigeant') return 'dirigeant'
  return null
}

function canUseSessionPickerForUser(user: User | null, baseRole: Role | null): boolean {
  if (!user) return false
  if (baseRole === 'admin') return true

  const metadataRole = normalizeRole(user.app_metadata?.role ?? user.user_metadata?.role ?? null)
  if (metadataRole === 'admin') return true

  return fallbackRoleFromEmail(user.email) === 'admin'
}

function privilegedRoleFromMetadata(user: User): Role | null {
  const metadataRole = normalizeRole(user.app_metadata?.role ?? user.user_metadata?.role ?? null)
  return metadataRole === 'admin' || metadataRole === 'dirigeant' ? metadataRole : null
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
  accountProfil: Profil | null
  sessionProfil: Profil | null
  role: Role | null
  sessionRole: Role | null
  isAdmin: boolean
  canUseSessionPicker: boolean
  isDemoSession: boolean
  loading: boolean
  profilLoading: boolean
  authError: string | null
  signIn: (email: string, password: string) => Promise<{ error: string | null }>
  signOut: () => Promise<void>
  reloadProfil: () => Promise<void>
  setSessionRole: (r: Role) => void
  resetSessionRole: () => void
  setSessionProfil: (profil: Profil | null) => void
  resetSessionProfil: () => void
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [accountProfil, setAccountProfil] = useState<Profil | null>(null)
  const [sessionProfil, setSessionProfilState] = useState<Profil | null>(null)
  const [sessionRole, setSessionRoleState] = useState<Role | null>(null)
  const [loading, setLoading] = useState(true)
  const [profilLoading, setProfilLoading] = useState(false)
  const [authError, setAuthError] = useState<string | null>(null)

  async function loadProfil(user: User) {
    setProfilLoading(true)

    try {
      const { data, error } = await withTimeout(
        supabase
          .from('profils')
          .select('id, role, nom, prenom')
          .eq('user_id', user.id)
          .maybeSingle(),
        PROFILE_TIMEOUT_MS,
        'profile load',
      )

      if (error) throw error

      // Si aucun profil en base, on en crée un via le RPC sécurisé (SECURITY DEFINER).
      // Le RPC détermine le rôle depuis la liste d'emails réservés ou les métadonnées Auth.
      let profileData = data
      if (!profileData) {
        const rpcClient = supabase as unknown as { rpc: (fn: string) => Promise<{ data: unknown; error: { message?: string } | null }> }
        const { data: rpcResult } = await rpcClient.rpc('upsert_my_profile')
        if (rpcResult && typeof rpcResult === 'object' && 'id' in rpcResult) {
          profileData = rpcResult as { id: string; role: string; nom: string | null; prenom: string | null }
        }
      }

      const metadataRole = normalizeRole(user.app_metadata?.role ?? user.user_metadata?.role ?? null)
      const emailRole = fallbackRoleFromEmail(user.email)
      const storedRole = normalizeRole(profileData?.role)
      const privilegedFallbackRole = emailRole ?? privilegedRoleFromMetadata(user)
      const normalizedRole = (
        privilegedFallbackRole && (!storedRole || (storedRole !== 'admin' && storedRole !== 'dirigeant'))
          ? privilegedFallbackRole
          : (storedRole ?? metadataRole ?? emailRole)
      )

      if (profileData && !normalizedRole) {
        setAccountProfil(null)
        setAuthError("Role utilisateur non reconnu dans 'profils'.")
        return
      }

      const p = profileData
        ? {
            id: profileData.id,
            role: normalizedRole as Role,
            nom: profileData.nom,
            prenom: profileData.prenom,
          }
        : null
      setAccountProfil(p)
      setAuthError(null)
    } catch {
      setAccountProfil(null)
      setAuthError("Impossible de charger le profil utilisateur.")
    } finally {
      setProfilLoading(false)
    }
  }

  async function reloadProfil() {
    if (session?.user) await loadProfil(session.user)
  }

  useEffect(() => {
    let active = true

    void (async () => {
      try {
        const { data } = await withTimeout(supabase.auth.getSession(), SESSION_TIMEOUT_MS, 'session load')
        if (!active) return

        setSession(data.session)

        if (data.session?.user) {
          void loadProfil(data.session.user)
        } else {
          setAccountProfil(null)
          setSessionProfilState(null)
          setSessionRoleState(null)
          setProfilLoading(false)
        }

        setAuthError(null)
      } catch {
        if (!active) return
        setSession(null)
        setAccountProfil(null)
        setSessionProfilState(null)
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
        void loadProfil(s.user)
      } else {
        setAccountProfil(null)
        setSessionProfilState(null)
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
  function setSessionProfil(profil: Profil | null) { setSessionProfilState(profil) }
  function resetSessionProfil() { setSessionProfilState(null) }

  async function signIn(email: string, password: string) {
    setAuthError(null)
    try {
      const { error } = await withTimeout(
        supabase.auth.signInWithPassword({ email, password }),
        LOGIN_TIMEOUT_MS,
        'login',
      )
      return { error: error?.message ?? null }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown auth error'
      return { error: message }
    }
  }

  async function signOut() {
    await supabase.auth.signOut()
    setSessionRoleState(null)
    setSessionProfilState(null)
    setAuthError(null)
  }

  const profil = session?.user ? (sessionProfil ?? accountProfil) : null
  const metadataRole = normalizeRole(session?.user?.app_metadata?.role ?? session?.user?.user_metadata?.role ?? null)
  const emailRole = fallbackRoleFromEmail(session?.user?.email)
  const privilegedFallbackRole = session?.user ? (emailRole ?? privilegedRoleFromMetadata(session.user)) : null
  const baseRole = (
    accountProfil?.role === 'admin' || accountProfil?.role === 'dirigeant'
      ? accountProfil.role
      : (privilegedFallbackRole ?? accountProfil?.role ?? metadataRole ?? emailRole ?? null)
  )
  const isAdmin = baseRole === 'admin' || baseRole === 'dirigeant'
  const canUseSessionPicker = canUseSessionPickerForUser(session?.user ?? null, baseRole)
  const isDemoSession = Boolean(sessionProfil?.isDemo)
  const role = session?.user ? (sessionProfil?.role ?? sessionRole ?? baseRole ?? 'admin') : null

  return (
    <AuthContext.Provider value={{
      session,
      user: session?.user ?? null,
      profil,
      accountProfil,
      sessionProfil,
      role,
      sessionRole,
      isAdmin,
      canUseSessionPicker,
      isDemoSession,
      loading,
      profilLoading,
      authError,
      signIn,
      signOut,
      reloadProfil,
      setSessionRole,
      resetSessionRole,
      setSessionProfil,
      resetSessionProfil,
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
