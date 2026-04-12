/**
 * tenantAdmin.ts
 * Hooks et utilitaires pour le panel d'administration tenant.
 *
 * PERIMETRE :
 *   - useTenantSettings()    : charge les settings du tenant courant
 *   - useEnabledModules()    : retourne la liste des modules actifs
 *   - useModuleEnabled(slug) : retourne true si un module est actif
 *
 * SECURITE :
 *   - Toutes les operations passent par Supabase directement
 *   - Le company_id est dérivé côté serveur via my_company_id() SECURITY DEFINER
 *   - Les RLS garantissent l'isolation stricte par tenant
 *   - createTenantUser reste via la Netlify function (creation auth user service-role)
 */

import { useCallback, useEffect, useState } from 'react'
import { supabase } from './supabase'

// ─── Types ────────────────────────────────────────────────────────────────────

export type TenantModule =
  | 'dashboard'
  | 'planning'
  | 'fleet'
  | 'workshop'
  | 'hr'
  | 'accounting'
  | 'documents'
  | 'settings'

export const ALL_TENANT_MODULES: TenantModule[] = [
  'dashboard', 'planning', 'fleet', 'workshop',
  'hr', 'accounting', 'documents', 'settings',
]

export const TENANT_MODULE_LABELS: Record<TenantModule, string> = {
  dashboard:  'Tableau de bord',
  planning:   'Planning',
  fleet:      'Flotte',
  workshop:   'Atelier',
  hr:         'RH',
  accounting: 'Comptabilite',
  documents:  'Documents',
  settings:   'Parametres',
}

// Mappe les slugs modules ERP (routes App.tsx) vers les modules tenant
// Un module tenant peut couvrir plusieurs routes ERP.
export const MODULE_TO_PAGES: Record<TenantModule, string[]> = {
  dashboard:  ['dashboard'],
  planning:   ['planning', 'map-live', 'feuille-route'],
  fleet:      ['vehicules', 'remorques', 'equipements'],
  workshop:   ['maintenance'],
  hr:         ['chauffeurs', 'rh', 'paie', 'tachygraphe', 'amendes', 'frais'],
  accounting: ['facturation', 'comptabilite'],
  documents:  ['coffre'],
  settings:   ['parametres', 'utilisateurs', 'mentions-legales'],
}

export type TenantCompany = {
  id: number
  name: string
  slug: string
  status: 'active' | 'suspended' | 'trial' | 'cancelled'
  subscription_plan: 'starter' | 'pro' | 'enterprise'
  max_users: number
  max_screens: number
  email_domain: string | null
  enabled_modules: TenantModule[]
  created_at: string
  updated_at: string
}

export type TenantUser = {
  id: string
  user_id: string
  role: string
  matricule: string | null
  nom: string | null
  prenom: string | null
  tenant_key: string | null
  login_enabled: boolean
  force_password_reset: boolean
  created_at: string
  updated_at: string
}

// ─── Helper interne : company_id du user courant ─────────────────────────────

async function fetchMyCompanyId(): Promise<number | null> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data } = await supabase
    .from('profils' as any)
    .select('company_id')
    .eq('user_id', user.id)
    .single()
  return (data as { company_id: number | null } | null)?.company_id ?? null
}

// ─── Hook : useTenantSettings ─────────────────────────────────────────────────

export function useTenantSettings() {
  const [company, setCompany] = useState<TenantCompany | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const companyId = await fetchMyCompanyId()
    if (!companyId) {
      setError('Aucun tenant associé à votre compte.')
      setLoading(false)
      return
    }
    const { data, error: dbErr } = await supabase
      .from('companies')
      .select('id, name, slug, status, subscription_plan, max_users, max_screens, email_domain, enabled_modules, created_at, updated_at')
      .eq('id', companyId)
      .single()
    if (dbErr || !data) {
      setError(dbErr?.message ?? 'Tenant introuvable.')
    } else {
      setCompany({
        ...data,
        enabled_modules: (data.enabled_modules as TenantModule[] | null) ?? ALL_TENANT_MODULES,
      } as TenantCompany)
      setError(null)
    }
    setLoading(false)
  }, [])

  useEffect(() => { void load() }, [load])

  return { company, loading, error, reload: load }
}

// ─── Hook : useEnabledModules ─────────────────────────────────────────────────

/**
 * Retourne la liste des modules actifs pour le tenant courant.
 * Utilise useTenantSettings() en interne.
 * Si le tenant n'a pas encore configuré ses modules, tous sont retournés.
 */
export function useEnabledModules(): TenantModule[] {
  const { company } = useTenantSettings()
  if (!company) return ALL_TENANT_MODULES
  return company.enabled_modules.length > 0 ? company.enabled_modules : ALL_TENANT_MODULES
}

// ─── Hook : useModuleEnabled ──────────────────────────────────────────────────

/**
 * Retourne true si le module est actif pour le tenant courant.
 *
 * Usage :
 *   const fleetEnabled = useModuleEnabled('fleet')
 *   if (!fleetEnabled) return <Navigate to="/dashboard" replace />
 */
export function useModuleEnabled(moduleSlug: TenantModule): boolean {
  const enabled = useEnabledModules()
  return enabled.includes(moduleSlug)
}

// ─── Utilitaire : pageToModule ────────────────────────────────────────────────

/**
 * Trouve le module tenant correspondant a une page (route) ERP.
 * Retourne null si la page n'est mappee a aucun module.
 */
export function pageToModule(page: string): TenantModule | null {
  for (const [mod, pages] of Object.entries(MODULE_TO_PAGES) as [TenantModule, string[]][]) {
    if (pages.includes(page)) return mod
  }
  return null
}

// ─── API : mise a jour identite tenant ───────────────────────────────────────

export async function updateTenantIdentity(payload: {
  name?: string
  status?: TenantCompany['status']
  subscription_plan?: TenantCompany['subscription_plan']
}): Promise<{ data: { company: Partial<TenantCompany> } | null; error: string | null }> {
  const companyId = await fetchMyCompanyId()
  if (!companyId) return { data: null, error: 'Tenant introuvable.' }
  const updates: Record<string, unknown> = {}
  if (payload.name !== undefined)              updates.name = payload.name
  if (payload.status !== undefined)            updates.status = payload.status
  if (payload.subscription_plan !== undefined) updates.subscription_plan = payload.subscription_plan
  const { data, error } = await supabase
    .from('companies')
    .update(updates)
    .eq('id', companyId)
    .select('id, name, slug, status, subscription_plan, updated_at')
    .single()
  if (error) return { data: null, error: error.message }
  return { data: { company: data as Partial<TenantCompany> }, error: null }
}

// ─── API : mise a jour domaine email ─────────────────────────────────────────

export async function updateEmailDomain(
  emailDomain: string,
): Promise<{ data: { company: Pick<TenantCompany, 'id' | 'email_domain' | 'updated_at'> } | null; error: string | null }> {
  const companyId = await fetchMyCompanyId()
  if (!companyId) return { data: null, error: 'Tenant introuvable.' }
  const { data, error } = await supabase
    .from('companies')
    .update({ email_domain: emailDomain })
    .eq('id', companyId)
    .select('id, email_domain, updated_at')
    .single()
  if (error) return { data: null, error: error.message }
  return { data: { company: data as Pick<TenantCompany, 'id' | 'email_domain' | 'updated_at'> }, error: null }
}

// ─── API : mise a jour modules ────────────────────────────────────────────────

export async function updateEnabledModules(
  modules: TenantModule[],
): Promise<{ data: { company: Pick<TenantCompany, 'id' | 'enabled_modules' | 'updated_at'> } | null; error: string | null }> {
  const companyId = await fetchMyCompanyId()
  if (!companyId) return { data: null, error: 'Tenant introuvable.' }
  const { data, error } = await supabase
    .from('companies')
    .update({ enabled_modules: modules })
    .eq('id', companyId)
    .select('id, enabled_modules, updated_at')
    .single()
  if (error) return { data: null, error: error.message }
  return { data: { company: data as Pick<TenantCompany, 'id' | 'enabled_modules' | 'updated_at'> }, error: null }
}

// ─── API : utilisateurs ───────────────────────────────────────────────────────

export async function getTenantUsers(): Promise<{ data: { users: TenantUser[] } | null; error: string | null }> {
  const companyId = await fetchMyCompanyId()
  if (!companyId) return { data: null, error: 'Tenant introuvable.' }
  const { data, error } = await supabase
    .from('profils' as any)
    .select('id, user_id, role, matricule, nom, prenom, tenant_key, login_enabled, force_password_reset, created_at, updated_at')
    .eq('company_id', companyId)
    .order('nom', { ascending: true })
  if (error) return { data: null, error: error.message }
  return { data: { users: (data ?? []) as unknown as TenantUser[] }, error: null }
}

export async function createTenantUser(payload: {
  email: string
  nom: string
  prenom: string
  role: string
  password?: string
  force_password_reset?: boolean
}): Promise<{ data: { user: TenantUser; temp_password?: string } | null; error: string | null }> {
  // La création d'un utilisateur Auth nécessite la service-role key
  // → reste via la Netlify function (service role uniquement)
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return { data: null, error: 'Non authentifié.' }
  try {
    const res = await fetch('/.netlify/functions/v11-tenant-admin?action=users', {
      method: 'POST',
      headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    const body = await res.json().catch(() => ({})) as { user?: TenantUser; temp_password?: string; error?: string }
    if (!res.ok) return { data: null, error: body.error ?? `Erreur HTTP ${res.status}` }
    return { data: { user: body.user!, temp_password: body.temp_password }, error: null }
  } catch {
    return { data: null, error: 'Erreur réseau.' }
  }
}

export async function updateTenantUser(
  profilId: string,
  payload: { nom?: string; prenom?: string },
): Promise<{ data: { user: Partial<TenantUser> } | null; error: string | null }> {
  const updates: Record<string, unknown> = {}
  if (payload.nom    !== undefined) updates.nom    = payload.nom
  if (payload.prenom !== undefined) updates.prenom = payload.prenom
  const { data, error } = await supabase
    .from('profils' as any)
    .update(updates)
    .eq('id', profilId)
    .select('id, nom, prenom, updated_at')
    .single()
  if (error) return { data: null, error: error.message }
  return { data: { user: data as Partial<TenantUser> }, error: null }
}

export async function setUserLoginEnabled(
  profilId: string,
  enabled: boolean,
): Promise<{ data: { user: Pick<TenantUser, 'id' | 'login_enabled' | 'updated_at'> } | null; error: string | null }> {
  const { data, error } = await supabase
    .from('profils' as any)
    .update({ login_enabled: enabled })
    .eq('id', profilId)
    .select('id, login_enabled, updated_at')
    .single()
  if (error) return { data: null, error: error.message }
  return { data: { user: data as unknown as Pick<TenantUser, 'id' | 'login_enabled' | 'updated_at'> }, error: null }
}

export async function setUserRole(
  profilId: string,
  role: string,
): Promise<{ data: { user: Pick<TenantUser, 'id' | 'role' | 'updated_at'> } | null; error: string | null }> {
  const { data, error } = await supabase
    .from('profils' as any)
    .update({ role })
    .eq('id', profilId)
    .select('id, role, updated_at')
    .single()
  if (error) return { data: null, error: error.message }
  return { data: { user: data as unknown as Pick<TenantUser, 'id' | 'role' | 'updated_at'> }, error: null }
}

export async function setUserAllowedPages(
  _profilId: string,
  _allowedPages: string[],
): Promise<{ data: { user_id: string; allowed_pages: string[] } | null; error: string | null }> {
  // Les pages autorisées sont gérées côté roles/user_roles (non implémenté ici)
  return { data: null, error: 'Non implémenté.' }
}

export async function setUserForcePasswordReset(
  profilId: string,
  force: boolean,
): Promise<{ data: { user: Pick<TenantUser, 'id' | 'force_password_reset' | 'updated_at'> } | null; error: string | null }> {
  const { data, error } = await supabase
    .from('profils' as any)
    .update({ force_password_reset: force })
    .eq('id', profilId)
    .select('id, force_password_reset, updated_at')
    .single()
  if (error) return { data: null, error: error.message }
  return { data: { user: data as unknown as Pick<TenantUser, 'id' | 'force_password_reset' | 'updated_at'> }, error: null }
}

