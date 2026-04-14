import { createContext, useContext, useEffect, useState } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from './supabase'
import { type TenantModule, MODULE_TO_PAGES, normalizeEnabledModules } from './tenantAdmin'

const SESSION_TIMEOUT_MS = 8000
const PROFILE_TIMEOUT_MS = 8000
const LOGIN_TIMEOUT_MS = 10000

const ROLE_VALUES = ['admin', 'super_admin', 'dirigeant', 'exploitant', 'mecanicien', 'commercial', 'comptable', 'rh', 'conducteur', 'conducteur_affreteur', 'client', 'affreteur', 'administratif', 'facturation', 'flotte', 'maintenance', 'observateur', 'demo', 'investisseur', 'logisticien'] as const
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
// Source de vérité unique pour les emails réservés → rôle garanti.
// Exporté pour que RequireAuth puisse l'importer sans dupliquer.
export const RESERVED_ADMIN_EMAIL_ROLE: Record<string, Role> = {
  'admin@erp-demo.fr': 'admin',
  'contact@nexora-truck.fr': 'admin',
  'direction@erp-demo.fr': 'dirigeant',
  'chabre.florent@gmail.com': 'super_admin',
}

export type Role = 'admin' | 'super_admin' | 'dirigeant' | 'exploitant' | 'mecanicien' | 'commercial' | 'comptable' | 'rh' | 'conducteur' | 'conducteur_affreteur' | 'client' | 'affreteur' | 'administratif' | 'facturation' | 'flotte' | 'maintenance' | 'observateur' | 'demo' | 'investisseur' | 'logisticien'

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
  logisticien: 'Logisticien',
}

export const ROLE_ACCESS: Record<Role, string[]> = {
  admin: ['dashboard', 'tasks', 'chauffeurs', 'rh', 'entretiens-salaries', 'vehicules', 'remorques', 'equipements', 'maintenance', 'transports', 'entrepots', 'clients', 'facturation', 'comptabilite', 'paie', 'frais', 'tachygraphe', 'amendes', 'map-live', 'planning', 'feuille-route', 'prospection', 'demandes-clients', 'espace-client', 'espace-affreteur', 'parametres', 'utilisateurs', 'communication', 'inter-erp', 'tchat', 'mail', 'coffre', 'mentions-legales', 'tenant-admin', 'super-admin', 'reglements', 'tresorerie', 'analytique-transport', 'ops-center', 'compte-client-db'],
  super_admin: ['dashboard', 'tasks', 'chauffeurs', 'rh', 'entretiens-salaries', 'vehicules', 'remorques', 'equipements', 'maintenance', 'transports', 'entrepots', 'clients', 'facturation', 'comptabilite', 'paie', 'frais', 'tachygraphe', 'amendes', 'map-live', 'planning', 'feuille-route', 'prospection', 'demandes-clients', 'espace-client', 'espace-affreteur', 'parametres', 'utilisateurs', 'communication', 'inter-erp', 'tchat', 'mail', 'coffre', 'mentions-legales', 'tenant-admin', 'super-admin', 'reglements', 'tresorerie', 'analytique-transport', 'ops-center', 'compte-client-db'],
  dirigeant: ['dashboard', 'tasks', 'chauffeurs', 'rh', 'entretiens-salaries', 'vehicules', 'remorques', 'equipements', 'maintenance', 'transports', 'entrepots', 'clients', 'facturation', 'comptabilite', 'paie', 'frais', 'tachygraphe', 'amendes', 'map-live', 'planning', 'feuille-route', 'prospection', 'demandes-clients', 'espace-client', 'espace-affreteur', 'parametres', 'utilisateurs', 'communication', 'inter-erp', 'tchat', 'mail', 'coffre', 'mentions-legales', 'tenant-admin', 'reglements', 'tresorerie', 'analytique-transport', 'ops-center', 'compte-client-db'],
  exploitant: ['dashboard', 'ops-center', 'tasks', 'chauffeurs', 'rh', 'entretiens-salaries', 'vehicules', 'remorques', 'equipements', 'maintenance', 'transports', 'entrepots', 'clients', 'facturation', 'reglements', 'analytique-transport', 'compte-client-db', 'espace-client', 'espace-affreteur', 'frais', 'tachygraphe', 'amendes', 'map-live', 'planning', 'feuille-route', 'demandes-clients', 'parametres', 'communication', 'inter-erp', 'tchat', 'mail', 'coffre', 'mentions-legales'],
  mecanicien: ['tasks', 'vehicules', 'remorques', 'equipements', 'maintenance', 'frais', 'tachygraphe', 'parametres', 'communication', 'tchat', 'mail', 'coffre', 'mentions-legales'],
  commercial: ['dashboard', 'tasks', 'transports', 'clients', 'facturation', 'frais', 'prospection', 'demandes-clients', 'parametres', 'communication', 'inter-erp', 'tchat', 'mail', 'coffre', 'mentions-legales', 'reglements', 'analytique-transport'],
  comptable: ['dashboard', 'tasks', 'facturation', 'comptabilite', 'paie', 'frais', 'clients', 'amendes', 'demandes-clients', 'parametres', 'communication', 'inter-erp', 'tchat', 'mail', 'coffre', 'mentions-legales', 'reglements', 'tresorerie', 'analytique-transport'],
  rh: ['tasks', 'chauffeurs', 'rh', 'entretiens-salaries', 'paie', 'frais', 'parametres', 'communication', 'inter-erp', 'tchat', 'mail', 'coffre', 'mentions-legales'],
  conducteur: ['dashboard-conducteur', 'tasks', 'feuille-route', 'frais', 'frais-rapide', 'tachygraphe', 'amendes', 'planning-conducteur', 'parametres', 'communication', 'tchat', 'mail', 'coffre', 'mentions-legales'],
  conducteur_affreteur: ['dashboard-conducteur', 'tasks', 'feuille-route', 'frais-rapide', 'tachygraphe', 'amendes', 'planning-conducteur', 'parametres', 'communication', 'tchat', 'mail', 'coffre', 'mentions-legales'],
  client: ['tasks', 'espace-client', 'communication', 'inter-erp', 'tchat', 'mail', 'coffre', 'mentions-legales'],
  affreteur: ['tasks', 'espace-affreteur', 'transports', 'entrepots', 'planning', 'map-live', 'feuille-route', 'communication', 'inter-erp', 'tchat', 'mail', 'coffre', 'mentions-legales'],
  administratif: ['dashboard', 'tasks', 'clients', 'facturation', 'comptabilite', 'paie', 'frais', 'parametres', 'communication', 'inter-erp', 'tchat', 'mail', 'coffre', 'mentions-legales', 'reglements', 'tresorerie', 'analytique-transport'],
  facturation: ['dashboard', 'tasks', 'clients', 'facturation', 'comptabilite', 'frais', 'parametres', 'communication', 'inter-erp', 'tchat', 'mail', 'coffre', 'mentions-legales', 'reglements', 'tresorerie', 'analytique-transport'],
  flotte: ['dashboard', 'tasks', 'vehicules', 'remorques', 'equipements', 'maintenance', 'planning', 'parametres', 'communication', 'inter-erp', 'tchat', 'mail', 'coffre', 'mentions-legales'],
  maintenance: ['tasks', 'vehicules', 'remorques', 'equipements', 'maintenance', 'frais', 'parametres', 'communication', 'inter-erp', 'tchat', 'mail', 'coffre', 'mentions-legales'],
  observateur: ['dashboard', 'planning', 'transports', 'clients', 'communication', 'inter-erp', 'coffre', 'mentions-legales'],
  demo: ['dashboard', 'tasks', 'chauffeurs', 'vehicules', 'remorques', 'equipements', 'maintenance', 'transports', 'entrepots', 'clients', 'facturation', 'comptabilite', 'frais', 'planning', 'feuille-route', 'prospection', 'communication', 'inter-erp', 'tchat', 'mail', 'coffre', 'mentions-legales', 'reglements', 'tresorerie', 'analytique-transport'],
  investisseur: ['dashboard', 'transports', 'clients', 'facturation', 'communication', 'inter-erp', 'coffre', 'mentions-legales', 'analytique-transport'],
  logisticien: ['dashboard', 'ops-center', 'tasks', 'entrepots', 'transports', 'planning', 'map-live', 'communication', 'inter-erp', 'tchat', 'mail', 'coffre', 'mentions-legales'],
}

export const ALL_ROLE_ACCESS_PAGES = Array.from(new Set(Object.values(ROLE_ACCESS).flat()))

ROLE_ACCESS.dirigeant = [...ALL_ROLE_ACCESS_PAGES]

export const CHAT_BLOCKED_PAIRS: [Role, Role][] = [
  ['conducteur', 'client'],
  ['conducteur_affreteur', 'client'],
]

export function canChatWith(roleA: Role, roleB: Role): boolean {
  return !CHAT_BLOCKED_PAIRS.some(
    ([a, b]) => (a === roleA && b === roleB) || (a === roleB && b === roleA)
  )
}

export function canAccess(
  role: Role | null,
  page: string,
  tenantAllowedPages?: string[] | null,
  enabledModules?: TenantModule[] | null,
): boolean {
  if (!role) return false
  if (!(ROLE_ACCESS[role]?.includes(page) ?? false)) return false
  if (role === 'admin' || role === 'super_admin' || role === 'dirigeant' || role === 'exploitant') return true
  // Verifie que le module auquel appartient la page est actif pour le tenant
  if (enabledModules && enabledModules.length > 0) {
    const moduleForPage = (Object.entries(MODULE_TO_PAGES) as [TenantModule, string[]][]).find(
      ([, pages]) => pages.includes(page),
    )?.[0] ?? null
    // Si la page appartient a un module desactive → acces refuse
    if (moduleForPage && !enabledModules.includes(moduleForPage)) return false
  }
  if (!tenantAllowedPages || tenantAllowedPages.length === 0) return true
  return tenantAllowedPages.includes(page)
}

export function firstPage(role: Role, tenantAllowedPages?: string[] | null, enabledModules?: TenantModule[] | null): string {
  if (role === 'admin' || role === 'super_admin') return '/parametres'

  // Page d'accueil préférée par rôle — expérience terrain optimisée
  const ROLE_FIRST_PAGE: Partial<Record<Role, string>> = {
    conducteur:           'dashboard-conducteur',
    conducteur_affreteur: 'dashboard-conducteur',
    exploitant:           'ops-center',
    comptable:            'facturation',
    facturation:          'facturation',
    administratif:        'facturation',
    commercial:           'dashboard',
    dirigeant:            'dashboard',
    observateur:          'dashboard',
    investisseur:         'dashboard',
    mecanicien:           'maintenance',
    maintenance:          'maintenance',
    flotte:               'vehicules',
    rh:                   'rh',
    affreteur:            'espace-affreteur',
    client:               'espace-client',
    logisticien:          'entrepots',
  }

  const preferred = ROLE_FIRST_PAGE[role]
  if (preferred && canAccess(role, preferred, tenantAllowedPages, enabledModules)) return `/${preferred}`

  const allowedPages = (ROLE_ACCESS[role] ?? []).filter(page => canAccess(role, page, tenantAllowedPages, enabledModules))
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
  // true pour les profils créés via le système de démo local (demoUsers.ts)
  isDemo?: boolean
  tenantKey?: string | null
  tenantAllowedPages?: string[] | null
  // MULTI-TENANT Phase 1 : company_id isole les donnees par tenant.
  // Vaut 1 pour toutes les donnees historiques (tenant_test / migration).
  companyId?: number | null
  // TENANT ADMIN SETTINGS : modules actifs pour ce tenant (null = tous actifs).
  enabledModules?: TenantModule[] | null
}

function normalizeAllowedPages(value: unknown): string[] | null {
  if (!Array.isArray(value)) return null
  const items = value
    .filter((item): item is string => typeof item === 'string')
    .map(item => item.trim())
    .filter(Boolean)
  if (items.length === 0) return null

  const normalized = new Set(items)
  // Compatibilite ascendante: les tenants historiques pouvaient autoriser les vues
  // generiques sans inclure les vues dediees conducteur ajoutees plus tard.
  if (normalized.has('dashboard')) normalized.add('dashboard-conducteur')
  if (normalized.has('planning')) normalized.add('planning-conducteur')
  if (normalized.has('frais')) normalized.add('frais-rapide')

  return Array.from(normalized)
}

function normalizeRoleToken(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[\s-]+/g, '_')
}

// Exporté — utilisé par SessionPicker et RequireAuth (plus de copie locale nécessaire)
export function normalizeRole(value: unknown): Role | null {
  if (typeof value !== 'string') return null
  const token = normalizeRoleToken(value)
  if (ROLE_SET.has(token)) return token as Role
  return ROLE_ALIASES[token] ?? null
}

// Exporté — utilisé par RequireAuth pour le bootstrap du profil
export function fallbackRoleFromEmail(email: string | null | undefined): Role | null {
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

type ProfileRow = {
  id: string
  role: string
  matricule?: string | null
  nom: string | null
  prenom: string | null
  tenant_key?: string | null
  max_concurrent_screens?: number | null
  company_id?: number | null
}

const PROFILE_REQUIRED_COLUMNS = ['id', 'role', 'nom', 'prenom'] as const
const PROFILE_OPTIONAL_COLUMNS = ['matricule', 'tenant_key', 'max_concurrent_screens', 'company_id'] as const

function findMissingProfileColumn(error: { code?: string | null; message?: string | null; details?: string | null; hint?: string | null } | null): string | null {
  if (!error) return null
  const raw = [error.code, error.message, error.details, error.hint].filter(Boolean).join(' ').toLowerCase()
  if (!raw) return null
  return PROFILE_OPTIONAL_COLUMNS.find(column => raw.includes(column)) ?? null
}

function normalizeProfileRow(data: ProfileRow): ProfileRow {
  return {
    id: data.id,
    role: data.role,
    matricule: data.matricule?.trim() || fallbackUserMatricule(data.id),
    nom: data.nom ?? null,
    prenom: data.prenom ?? null,
    tenant_key: data.tenant_key?.trim() || 'default',
    max_concurrent_screens: typeof data.max_concurrent_screens === 'number' ? data.max_concurrent_screens : 1,
    company_id: typeof data.company_id === 'number' ? data.company_id : 1,
  }
}

async function fetchProfileRow(userId: string): Promise<ProfileRow | null> {
  let optionalColumns = [...PROFILE_OPTIONAL_COLUMNS]

  for (;;) {
    const selectColumns = [...PROFILE_REQUIRED_COLUMNS, ...optionalColumns].join(', ')
    const { data, error } = await supabase
      .from('profils')
      .select(selectColumns)
      .eq('user_id', userId)
      .maybeSingle()

    if (!error) {
      return data ? normalizeProfileRow(data as unknown as ProfileRow) : null
    }

    const missingColumn = findMissingProfileColumn(error)
    if (!missingColumn || !optionalColumns.includes(missingColumn as typeof PROFILE_OPTIONAL_COLUMNS[number])) {
      throw error
    }

    optionalColumns = optionalColumns.filter(column => column !== missingColumn)
  }
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
  // true quand l'utilisateur connecté a le rôle 'demo'
  isDemoSession: boolean
  loading: boolean
  profilLoading: boolean
  authError: string | null
  tenantAllowedPages: string[] | null
  // MULTI-TENANT Phase 1 : company_id de l'utilisateur courant.
  companyId: number | null
  // TENANT ADMIN SETTINGS : modules actifs pour le tenant courant.
  enabledModules: TenantModule[] | null
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
      const data = await withTimeout(fetchProfileRow(user.id), PROFILE_TIMEOUT_MS, 'profile load')
          // MULTI-TENANT Phase 1 : company_id ajouté au select

      // Si aucun profil en base, on en crée un via le RPC sécurisé (SECURITY DEFINER).
      // Le RPC détermine le rôle depuis la liste d'emails réservés ou les métadonnées Auth.
      let profileData: ProfileRow | null = data
      if (!profileData) {
        const rpcClient = supabase as unknown as { rpc: (fn: string) => Promise<{ data: unknown; error: { message?: string } | null }> }
        const { data: rpcResult, error: rpcError } = await rpcClient.rpc('upsert_my_profile')
        if (rpcError) {
          console.warn('[auth] upsert_my_profile RPC error:', rpcError)
        }
        if (rpcResult && typeof rpcResult === 'object' && 'id' in rpcResult) {
          const raw = rpcResult as { id: string; role: string; matricule?: string | null; nom: string | null; prenom: string | null; tenant_key?: string | null }
          profileData = normalizeProfileRow({
            id: raw.id,
            role: raw.role,
            matricule: raw.matricule ?? null,
            nom: raw.nom,
            prenom: raw.prenom,
            tenant_key: raw.tenant_key ?? 'default',
            max_concurrent_screens: 1,
            company_id: 1, // defaut migration : tenant_test
          })
        }
      }

      let tenantAllowedPages: string[] | null = null
      let enabledModules: TenantModule[] | null = null

      if (profileData?.tenant_key) {
        const { data: tenantData } = await supabase
          .from('erp_v11_tenants')
          .select('allowed_pages')
          .eq('tenant_key', profileData.tenant_key)
          .maybeSingle()
        tenantAllowedPages = normalizeAllowedPages(tenantData?.allowed_pages ?? null)
      }

      // Charge les modules actifs depuis companies (cached : lecture seule, pas de mise a jour)
      const companyIdForLoad = profileData?.company_id ?? 1
      if (companyIdForLoad) {
        const { data: companyData } = await supabase
          .from('companies')
          .select('enabled_modules')
          .eq('id', companyIdForLoad)
          .maybeSingle()
        enabledModules = normalizeEnabledModules(companyData?.enabled_modules)
      }

      const metadataRole = normalizeRole(user.app_metadata?.role ?? user.user_metadata?.role ?? null)
      const emailRole = fallbackRoleFromEmail(user.email)
      const storedRole = normalizeRole(profileData?.role)
      const privilegedFallbackRole = emailRole ?? privilegedRoleFromMetadata(user)
      // emailRole (liste RESERVED_ADMIN_EMAIL_ROLE) prime toujours — permet les upgrades explicites (ex: admin → super_admin).
      // privilegedFallbackRole (métadonnées) ne prime que si le rôle stocké n'est pas déjà admin/dirigeant (anti-downgrade).
      const normalizedRole = (
        emailRole
          ? emailRole
          : privilegedFallbackRole && (!storedRole || (storedRole !== 'admin' && storedRole !== 'dirigeant'))
            ? privilegedFallbackRole
            : (storedRole ?? metadataRole ?? null)
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
            // MULTI-TENANT Phase 1 : company_id expose dans le profil
            companyId: profileData.company_id ?? 1,
            // TENANT ADMIN SETTINGS : modules actifs (null = tous actifs)
            enabledModules,
          }
        : null
      setAccountProfil(p)
      setAuthError(null)
    } catch (err) {
      const msg = err instanceof Error ? err.message : (typeof err === 'object' && err !== null && 'message' in err ? String((err as { message: unknown }).message) : String(err))
      console.error('[auth] loadProfil error:', msg, err)
      setAccountProfil(null)
      setAuthError(`Impossible de charger le profil utilisateur. (${msg})`)
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

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, s) => {
      if (!active) return

      // INITIAL_SESSION : déjà géré par getSession() ci-dessus → pas de double loadProfil
      if (event === 'INITIAL_SESSION') return

      // TOKEN_REFRESHED : même utilisateur, juste mettre à jour le token.
      // Vérifier que session est encore active pour éviter la race avec signOut().
      if (event === 'TOKEN_REFRESHED') {
        if (s) setSession(s)
        return
      }

      // SIGNED_IN, SIGNED_OUT, USER_UPDATED, etc.
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
      // MULTI-TENANT : preserve le company_id lors du changement de session
      companyId: profil.companyId ?? null,
      enabledModules: profil.enabledModules ?? null,
    }

    setSessionProfilState(sanitizedProfil)
  }
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
    // Vider l'état immédiatement — l'UI réagit sans attendre la réponse réseau
    setSession(null)
    setAccountProfil(null)
    setSessionProfilState(null)
    setSessionRoleState(null)
    setAuthError(null)
    setProfilLoading(false)
    // scope:'local' — supprime le token localStorage immédiatement, sans appel réseau.
    // Évite la race condition où un TOKEN_REFRESHED en cours restaurerait la session.
    try {
      await supabase.auth.signOut({ scope: 'local' })
    } catch {
      // Ignoré — la session locale est déjà effacée
    }
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
  // role : jamais nullé vers 'admin' — si le profil ne peut pas se charger, role reste null
  const role = session?.user ? (sessionProfil?.role ?? sessionRole ?? baseRole ?? null) : null
  // isDemoSession : dérivé du rôle réel (plus jamais hardcodé à false)
  const isDemoSession = role === 'demo'
  const tenantAllowedPages = profil?.tenantAllowedPages ?? null
  // MULTI-TENANT Phase 1 : company_id de l'utilisateur courant (priorite : session > account > defaut)
  const companyId = profil?.companyId ?? accountProfil?.companyId ?? null
  // TENANT ADMIN SETTINGS : modules actifs (null = tous les modules actifs)
  const enabledModules: TenantModule[] | null = profil?.enabledModules ?? accountProfil?.enabledModules ?? null

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
      tenantAllowedPages,
      companyId,
      enabledModules,
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
