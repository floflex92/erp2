import { createContext, useContext, useEffect, useState } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from './supabase'

const SESSION_TIMEOUT_MS = 8000
const PROFILE_TIMEOUT_MS = 8000
const LOGIN_TIMEOUT_MS = 10000
const SCREEN_HEARTBEAT_MS = 25000
const SCREEN_LIMIT_ERROR_STORAGE_KEY = 'nexora_screen_limit_error_v1'
const SCREEN_ID_STORAGE_KEY = 'nexora_screen_id_v1'

const ROLE_VALUES = ['admin', 'super_admin', 'dirigeant', 'exploitant', 'mecanicien', 'commercial', 'comptable', 'rh', 'conducteur', 'conducteur_affreteur', 'client', 'affreteur', 'administratif', 'facturation', 'flotte', 'maintenance', 'observateur', 'demo', 'investisseur'] as const
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
  superadmin: 'super_admin',
  finance: 'facturation',
  investor: 'investisseur',
}
const RESERVED_ADMIN_EMAIL_ROLE: Record<string, Role> = {
  'admin@erp-demo.fr': 'admin',
  'contact@nexora-truck.fr': 'admin',
  'direction@erp-demo.fr': 'dirigeant',
  'chabre.florent@gmail.com': 'admin',
}

export type Role = 'admin' | 'super_admin' | 'dirigeant' | 'exploitant' | 'mecanicien' | 'commercial' | 'comptable' | 'rh' | 'conducteur' | 'conducteur_affreteur' | 'client' | 'affreteur' | 'administratif' | 'facturation' | 'flotte' | 'maintenance' | 'observateur' | 'demo' | 'investisseur'

export const ROLE_LABELS: Record<Role, string> = {
  admin: 'Administrateur',
  super_admin: 'Super admin',
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
  administratif: 'Administratif',
  facturation: 'Facturation',
  flotte: 'Flotte',
  maintenance: 'Maintenance',
  observateur: 'Observateur',
  demo: 'Demo',
  investisseur: 'Investisseur',
}

export const ROLE_ACCESS: Record<Role, string[]> = {
  admin: ['dashboard', 'tasks', 'chauffeurs', 'rh', 'vehicules', 'remorques', 'equipements', 'maintenance', 'transports', 'clients', 'facturation', 'comptabilite', 'paie', 'frais', 'tachygraphe', 'amendes', 'map-live', 'planning', 'feuille-route', 'prospection', 'demandes-clients', 'espace-client', 'espace-affreteur', 'parametres', 'utilisateurs', 'communication', 'inter-erp', 'tchat', 'mail', 'coffre', 'mentions-legales'],
  super_admin: ['dashboard', 'tasks', 'chauffeurs', 'rh', 'vehicules', 'remorques', 'equipements', 'maintenance', 'transports', 'clients', 'facturation', 'comptabilite', 'paie', 'frais', 'tachygraphe', 'amendes', 'map-live', 'planning', 'feuille-route', 'prospection', 'demandes-clients', 'espace-client', 'espace-affreteur', 'parametres', 'utilisateurs', 'communication', 'inter-erp', 'tchat', 'mail', 'coffre', 'mentions-legales'],
  dirigeant: ['dashboard', 'tasks', 'chauffeurs', 'rh', 'vehicules', 'remorques', 'equipements', 'maintenance', 'transports', 'clients', 'facturation', 'comptabilite', 'paie', 'frais', 'tachygraphe', 'amendes', 'map-live', 'planning', 'feuille-route', 'prospection', 'demandes-clients', 'espace-client', 'espace-affreteur', 'parametres', 'utilisateurs', 'communication', 'inter-erp', 'tchat', 'mail', 'coffre', 'mentions-legales'],
  exploitant: ['dashboard', 'tasks', 'chauffeurs', 'vehicules', 'remorques', 'equipements', 'transports', 'frais', 'tachygraphe', 'amendes', 'map-live', 'planning', 'feuille-route', 'demandes-clients', 'parametres', 'communication', 'inter-erp', 'tchat', 'mail', 'coffre', 'mentions-legales'],
  mecanicien: ['tasks', 'vehicules', 'remorques', 'equipements', 'maintenance', 'frais', 'tachygraphe', 'parametres', 'communication', 'tchat', 'mail', 'coffre', 'mentions-legales'],
  commercial: ['dashboard', 'tasks', 'transports', 'clients', 'facturation', 'frais', 'prospection', 'demandes-clients', 'parametres', 'communication', 'inter-erp', 'tchat', 'mail', 'coffre', 'mentions-legales'],
  comptable: ['dashboard', 'tasks', 'facturation', 'comptabilite', 'paie', 'frais', 'clients', 'amendes', 'demandes-clients', 'parametres', 'communication', 'inter-erp', 'tchat', 'mail', 'coffre', 'mentions-legales'],
  rh: ['tasks', 'chauffeurs', 'rh', 'paie', 'frais', 'parametres', 'communication', 'inter-erp', 'tchat', 'mail', 'coffre', 'mentions-legales'],
  conducteur: ['tasks', 'feuille-route', 'frais', 'tachygraphe', 'amendes', 'parametres', 'communication', 'tchat', 'mail', 'coffre', 'mentions-legales'],
  conducteur_affreteur: ['tasks', 'feuille-route', 'tachygraphe', 'amendes', 'parametres', 'communication', 'tchat', 'mail', 'coffre', 'mentions-legales'],
  client: ['tasks', 'espace-client', 'communication', 'inter-erp', 'tchat', 'mail', 'coffre', 'mentions-legales'],
  affreteur: ['tasks', 'espace-affreteur', 'transports', 'planning', 'map-live', 'feuille-route', 'communication', 'inter-erp', 'tchat', 'mail', 'coffre', 'mentions-legales'],
  administratif: ['dashboard', 'tasks', 'clients', 'facturation', 'comptabilite', 'paie', 'frais', 'parametres', 'communication', 'inter-erp', 'tchat', 'mail', 'coffre', 'mentions-legales'],
  facturation: ['dashboard', 'tasks', 'clients', 'facturation', 'comptabilite', 'frais', 'parametres', 'communication', 'inter-erp', 'tchat', 'mail', 'coffre', 'mentions-legales'],
  flotte: ['dashboard', 'tasks', 'vehicules', 'remorques', 'equipements', 'maintenance', 'planning', 'parametres', 'communication', 'inter-erp', 'tchat', 'mail', 'coffre', 'mentions-legales'],
  maintenance: ['tasks', 'vehicules', 'remorques', 'equipements', 'maintenance', 'frais', 'parametres', 'communication', 'inter-erp', 'tchat', 'mail', 'coffre', 'mentions-legales'],
  observateur: ['dashboard', 'planning', 'transports', 'clients', 'communication', 'inter-erp', 'coffre', 'mentions-legales'],
  demo: ['dashboard', 'tasks', 'chauffeurs', 'vehicules', 'remorques', 'equipements', 'maintenance', 'transports', 'clients', 'facturation', 'comptabilite', 'frais', 'planning', 'feuille-route', 'prospection', 'communication', 'inter-erp', 'tchat', 'mail', 'coffre', 'mentions-legales'],
  investisseur: ['dashboard', 'transports', 'clients', 'facturation', 'communication', 'inter-erp', 'coffre', 'mentions-legales'],
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

export function canAccess(role: Role | null, page: string, tenantAllowedPages?: string[] | null): boolean {
  if (!role) return false
  if (!(ROLE_ACCESS[role]?.includes(page) ?? false)) return false
  if (role === 'admin' || role === 'super_admin') return true
  if (!tenantAllowedPages || tenantAllowedPages.length === 0) return true
  return tenantAllowedPages.includes(page)
}

export function firstPage(role: Role, tenantAllowedPages?: string[] | null): string {
  const allowedPages = (ROLE_ACCESS[role] ?? []).filter(page => canAccess(role, page, tenantAllowedPages))
  return '/' + (allowedPages[0] ?? ROLE_ACCESS[role]?.[0] ?? 'dashboard')
}

export interface Profil {
  id: string
  role: Role
  matricule?: string | null
  nom: string | null
  prenom: string | null
  email?: string | null
  domain?: string | null
  isDemo?: boolean
  tenantKey?: string | null
  tenantAllowedPages?: string[] | null
}

function normalizeAllowedPages(value: unknown): string[] | null {
  if (!Array.isArray(value)) return null
  const items = value
    .filter((item): item is string => typeof item === 'string')
    .map(item => item.trim())
    .filter(Boolean)
  return items.length > 0 ? Array.from(new Set(items)) : null
}

function getOrCreateScreenId(): string {
  const existing = window.sessionStorage.getItem(SCREEN_ID_STORAGE_KEY)
  if (existing) return existing

  const generated = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `screen-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`

  window.sessionStorage.setItem(SCREEN_ID_STORAGE_KEY, generated)
  return generated
}

async function callScreenSessionApi(
  method: 'POST' | 'PUT' | 'DELETE',
  accessToken: string,
  payload: Record<string, unknown>,
): Promise<{ ok: boolean; error: string | null; code?: string | null }> {
  try {
    const response = await fetch('/.netlify/functions/screen-session', {
      method,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      keepalive: method === 'DELETE',
    })

    const body = await response.json().catch(() => ({})) as { error?: string; code?: string }
    if (!response.ok) {
      return {
        ok: false,
        error: body.error ?? 'Controle des ecrans impossible.',
        code: body.code ?? null,
      }
    }

    return { ok: true, error: null }
  } catch {
    return { ok: false, error: 'Controle des ecrans indisponible.', code: null }
  }
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

function fallbackUserMatricule(profileId: string) {
  const token = profileId.replace(/[^a-z0-9]/gi, '').slice(0, 8).toUpperCase() || 'UNKNOWN'
  return `USR-${token}`
}

function canUseSessionPickerForUser(user: User | null, baseRole: Role | null): boolean {
  if (!user) return false
  if (baseRole === 'admin' || baseRole === 'super_admin') return true

  const metadataRole = normalizeRole(user.app_metadata?.role ?? user.user_metadata?.role ?? null)
  if (metadataRole === 'admin') return true

  return fallbackRoleFromEmail(user.email) === 'admin'
}

function privilegedRoleFromMetadata(user: User): Role | null {
  const metadataRole = normalizeRole(user.app_metadata?.role ?? user.user_metadata?.role ?? null)
  return metadataRole === 'admin' || metadataRole === 'super_admin' || metadataRole === 'dirigeant' ? metadataRole : null
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
  screenLimitError: string | null
  tenantAllowedPages: string[] | null
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
  const [screenLimitError, setScreenLimitError] = useState<string | null>(null)

  async function claimScreenSlot(currentSession: Session) {
    const screenId = getOrCreateScreenId()
    const result = await callScreenSessionApi('POST', currentSession.access_token, {
      screen_id: screenId,
      label: `${window.location.pathname}${window.location.search}`,
    })

    if (!result.ok) {
      const message = result.error ?? "Trop d'ecrans ouverts pour ce compte."
      setScreenLimitError(message)
      setAuthError(message)
      window.localStorage.setItem(SCREEN_LIMIT_ERROR_STORAGE_KEY, message)
      await supabase.auth.signOut()
      return { ok: false, error: message }
    }

    setScreenLimitError(null)
    window.localStorage.removeItem(SCREEN_LIMIT_ERROR_STORAGE_KEY)
    return { ok: true, error: null }
  }

  async function releaseScreenSlot(currentSession: Session | null) {
    if (!currentSession) return
    const screenId = window.sessionStorage.getItem(SCREEN_ID_STORAGE_KEY)
    if (!screenId) return

    await callScreenSessionApi('DELETE', currentSession.access_token, {
      screen_id: screenId,
    })
  }

  async function loadProfil(user: User) {
    setProfilLoading(true)

    try {
      const { data, error } = await withTimeout(
        supabase
          .from('profils')
          .select('id, role, matricule, nom, prenom, tenant_key, max_concurrent_screens')
          .eq('user_id', user.id)
          .maybeSingle(),
        PROFILE_TIMEOUT_MS,
        'profile load',
      )

      if (error) throw error

      // Si aucun profil en base, on en crée un via le RPC sécurisé (SECURITY DEFINER).
      // Le RPC détermine le rôle depuis la liste d'emails réservés ou les métadonnées Auth.
      type ProfileRow = { id: string; role: string; matricule: string; nom: string | null; prenom: string | null; tenant_key: string | null; max_concurrent_screens?: number | null }
      let profileData: ProfileRow | null = data
        ? {
            id: data.id,
            role: data.role,
            matricule: data.matricule || fallbackUserMatricule(data.id),
            nom: data.nom,
            prenom: data.prenom,
            tenant_key: data.tenant_key ?? 'default',
            max_concurrent_screens: data.max_concurrent_screens ?? 1,
          }
        : null
      if (!profileData) {
        const rpcClient = supabase as unknown as { rpc: (fn: string) => Promise<{ data: unknown; error: { message?: string } | null }> }
        const { data: rpcResult } = await rpcClient.rpc('upsert_my_profile')
        if (rpcResult && typeof rpcResult === 'object' && 'id' in rpcResult) {
          const raw = rpcResult as { id: string; role: string; matricule?: string | null; nom: string | null; prenom: string | null; tenant_key?: string | null }
          profileData = {
            id: raw.id,
            role: raw.role,
            matricule: raw.matricule?.trim() || fallbackUserMatricule(raw.id),
            nom: raw.nom,
            prenom: raw.prenom,
            tenant_key: raw.tenant_key ?? 'default',
            max_concurrent_screens: 1,
          }
        }
      }

      let tenantAllowedPages: string[] | null = null
      if (profileData?.tenant_key) {
        const { data: tenantData } = await supabase
          .from('erp_v11_tenants')
          .select('allowed_pages')
          .eq('tenant_key', profileData.tenant_key)
          .maybeSingle()
        tenantAllowedPages = normalizeAllowedPages(tenantData?.allowed_pages ?? null)
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
            matricule: profileData.matricule,
            nom: profileData.nom,
            prenom: profileData.prenom,
            tenantKey: profileData.tenant_key ?? 'default',
            tenantAllowedPages,
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

        if (data.session) {
          const claim = await claimScreenSlot(data.session)
          if (!claim.ok) {
            setSession(null)
            setAccountProfil(null)
            setSessionProfilState(null)
            setSessionRoleState(null)
            setProfilLoading(false)
            return
          }
        }

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

      void (async () => {
        if (s) {
          const claim = await claimScreenSlot(s)
          if (!claim.ok) {
            setSession(null)
            setAccountProfil(null)
            setSessionProfilState(null)
            setSessionRoleState(null)
            setProfilLoading(false)
            return
          }
        }

        setSession(s)
      })()
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

  useEffect(() => {
    if (!session) return
    if (screenLimitError) return

    const screenId = getOrCreateScreenId()
    const timer = window.setInterval(() => {
      void callScreenSessionApi('PUT', session.access_token, {
        screen_id: screenId,
      }).then(async result => {
        if (!result.ok && result.code === 'SCREEN_LIMIT_EXCEEDED') {
          const message = result.error ?? "Trop d'ecrans ouverts pour ce compte."
          setScreenLimitError(message)
          setAuthError(message)
          window.localStorage.setItem(SCREEN_LIMIT_ERROR_STORAGE_KEY, message)
          await supabase.auth.signOut()
        }
      })
    }, SCREEN_HEARTBEAT_MS)

    const onBeforeUnload = () => {
      void callScreenSessionApi('DELETE', session.access_token, {
        screen_id: screenId,
      })
    }

    window.addEventListener('beforeunload', onBeforeUnload)

    return () => {
      window.clearInterval(timer)
      window.removeEventListener('beforeunload', onBeforeUnload)
    }
  }, [session, screenLimitError])

  function setSessionRole(r: Role) { setSessionRoleState(r) }
  function resetSessionRole() { setSessionRoleState(null) }
  function setSessionProfil(profil: Profil | null) {
    if (!profil) {
      setSessionProfilState(null)
      return
    }

    // Hard-disable legacy demo sessions to keep a single DB-backed runtime path.
    const sanitizedProfil: Profil = {
      id: profil.id,
      role: profil.role,
      matricule: profil.matricule ?? null,
      nom: profil.nom,
      prenom: profil.prenom,
      email: profil.email ?? null,
      domain: profil.domain ?? null,
      tenantKey: profil.tenantKey ?? null,
      tenantAllowedPages: profil.tenantAllowedPages ?? null,
    }

    setSessionProfilState(sanitizedProfil)
  }
  function resetSessionProfil() { setSessionProfilState(null) }

  async function signIn(email: string, password: string) {
    setAuthError(null)
    setScreenLimitError(null)
    try {
      const { data, error } = await withTimeout(
        supabase.auth.signInWithPassword({ email, password }),
        LOGIN_TIMEOUT_MS,
        'login',
      )

      if (!error && data.session) {
        const claim = await claimScreenSlot(data.session)
        if (!claim.ok) {
          return { error: claim.error }
        }
      }

      return { error: error?.message ?? null }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown auth error'
      return { error: message }
    }
  }

  async function signOut() {
    await releaseScreenSlot(session)
    await supabase.auth.signOut()
    setSessionRoleState(null)
    setSessionProfilState(null)
    setScreenLimitError(null)
    setAuthError(null)
  }

  const profil = session?.user ? (sessionProfil ?? accountProfil) : null
  const metadataRole = normalizeRole(session?.user?.app_metadata?.role ?? session?.user?.user_metadata?.role ?? null)
  const emailRole = fallbackRoleFromEmail(session?.user?.email)
  const privilegedFallbackRole = session?.user ? (emailRole ?? privilegedRoleFromMetadata(session.user)) : null
  const baseRole = (
    accountProfil?.role === 'admin' || accountProfil?.role === 'super_admin' || accountProfil?.role === 'dirigeant'
      ? accountProfil.role
      : (privilegedFallbackRole ?? accountProfil?.role ?? metadataRole ?? emailRole ?? null)
  )
  const isAdmin = baseRole === 'admin' || baseRole === 'super_admin' || baseRole === 'dirigeant'
  const canUseSessionPicker = canUseSessionPickerForUser(session?.user ?? null, baseRole)
  const isDemoSession = false
  const role = session?.user ? (sessionProfil?.role ?? sessionRole ?? baseRole ?? 'admin') : null
  const tenantAllowedPages = profil?.tenantAllowedPages ?? null

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
      screenLimitError,
      tenantAllowedPages,
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
