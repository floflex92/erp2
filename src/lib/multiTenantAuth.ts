/**
 * multiTenantAuth.ts
 * Helpers centralisés pour la gestion multi-tenant, impersonation et rôle actif.
 *
 * ARCHITECTURE :
 *   - getCurrentUser()      : user Supabase courant
 *   - getCurrentTenant()    : tenant actif (depuis tenant_users ou impersonation)
 *   - getActiveRole()       : rôle actif (impersonation > tenant_user > profils)
 *   - isPlatformAdmin()     : vérifie si l'user est platform_admin (DB check)
 *   - startImpersonation()  : démarre une session d'impersonation par rôle + tenant
 *   - endImpersonation()    : termine la session d'impersonation courante
 *   - getActiveImpersonation() : retourne la session active si elle existe
 */

import { supabase } from './supabase'
import type { Role } from './auth'
import { looseSupabase } from './supabaseLoose'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface TenantInfo {
  tenantId: number
  tenantName: string
  tenantSlug: string
  tenantStatus: string
  defaultRole: string | null
  isActive: boolean
}

export interface ImpersonationSession {
  sessionId: string
  tenantId: number
  tenantName: string
  roleId: number
  roleLabel: string
  roleName: string
  adminEmail: string
  targetUserId: string | null
  startedAt: string
  expiresAt: string
}

export interface TenantRole {
  id: number
  name: string
  label: string
  scope: string
  isSystem: boolean
}

// ─── Platform Admin Check ─────────────────────────────────────────────────────

let _platformAdminCache: boolean | null = null
let _platformAdminCacheUserId: string | null = null

/**
 * Vérifie si l'utilisateur courant est un platform admin.
 * Résultat mis en cache par user_id pour éviter des requêtes répétées.
 */
export async function checkIsPlatformAdmin(forceRefresh = false): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    _platformAdminCache = null
    _platformAdminCacheUserId = null
    return false
  }

  if (!forceRefresh && _platformAdminCacheUserId === user.id && _platformAdminCache !== null) {
    return _platformAdminCache
  }

  const { data, error } = await looseSupabase
    .from('platform_admins')
    .select('id')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .maybeSingle()

  const result = !error && data !== null
  _platformAdminCache = result
  _platformAdminCacheUserId = user.id
  return result
}

/** Réinitialise le cache platform admin (à appeler au signOut). */
export function clearPlatformAdminCache() {
  _platformAdminCache = null
  _platformAdminCacheUserId = null
}

// ─── Tenant Helpers ───────────────────────────────────────────────────────────

/**
 * Retourne la liste des tenants de l'utilisateur courant.
 */
export async function getUserTenants(): Promise<TenantInfo[]> {
  const { data, error } = await supabase.rpc('get_user_tenants' as any) as {
    data: Array<{
      tenant_id: number
      tenant_name: string
      tenant_slug: string
      tenant_status: string
      default_role: string | null
      is_active: boolean
    }> | null
    error: { message: string } | null
  }

  if (error || !data) return []

  return data.map(row => ({
    tenantId: row.tenant_id,
    tenantName: row.tenant_name,
    tenantSlug: row.tenant_slug,
    tenantStatus: row.tenant_status,
    defaultRole: row.default_role,
    isActive: row.is_active,
  }))
}

/**
 * Retourne les rôles tenant disponibles pour un company_id donné.
 */
export async function getTenantRoles(companyId: number): Promise<TenantRole[]> {
  const { data, error } = await looseSupabase
    .from('roles')
    .select('id, name, label, scope, is_system')
    .or(`company_id.eq.${companyId},scope.eq.platform`)
    .order('name')

  if (error || !data) return []

  return (data as Array<{ id: number; name: string; label: string; scope: string; is_system: boolean }>).map(r => ({
    id: r.id,
    name: r.name,
    label: r.label,
    scope: r.scope,
    isSystem: r.is_system,
  }))
}

// ─── Impersonation ────────────────────────────────────────────────────────────

/**
 * Démarre une session d'impersonation pour le super admin courant.
 */
export async function startImpersonation(
  tenantId: number,
  roleId: number,
  targetUserId?: string | null,
): Promise<{ sessionId: string | null; error: string | null }> {
  const { data, error } = await supabase.rpc('start_impersonation_session' as any, {
    p_tenant_id: tenantId,
    p_role_id: roleId,
    p_target_user_id: targetUserId ?? null,
  }) as { data: string | null; error: { message: string } | null }

  if (error) return { sessionId: null, error: error.message }
  return { sessionId: data, error: null }
}

/**
 * Termine la session d'impersonation courante.
 */
export async function endImpersonation(): Promise<{ error: string | null }> {
  const { error } = await supabase.rpc('end_impersonation_session' as any) as { error: { message: string } | null }
  return { error: error?.message ?? null }
}

/**
 * Retourne la session d'impersonation active du super admin courant.
 */
export async function getActiveImpersonation(): Promise<ImpersonationSession | null> {
  const { data, error } = await supabase.rpc('get_active_impersonation' as any) as {
    data: Array<{
      session_id: string
      tenant_id: number
      tenant_name: string
      role_id: number
      role_label: string
      role_name: string
      admin_email: string
      target_user_id: string | null
      started_at: string
      expires_at: string
    }> | null
    error: { message: string } | null
  }

  if (error || !data || data.length === 0) return null

  const row = data[0]
  return {
    sessionId: row.session_id,
    tenantId: row.tenant_id,
    tenantName: row.tenant_name,
    roleId: row.role_id,
    roleLabel: row.role_label,
    roleName: row.role_name,
    adminEmail: row.admin_email,
    targetUserId: row.target_user_id,
    startedAt: row.started_at,
    expiresAt: row.expires_at,
  }
}

// ─── Helpers de commodité ─────────────────────────────────────────────────────

/**
 * Retourne le user Supabase courant (null si déconnecté).
 */
export async function getCurrentUser() {
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

/**
 * Retourne le premier tenant actif de l'utilisateur courant.
 * Tient compte de l'impersonation si active.
 */
export async function getCurrentTenant(): Promise<TenantInfo | null> {
  // Vérifier impersonation d'abord
  const imp = await getActiveImpersonation()
  if (imp) {
    return {
      tenantId: imp.tenantId,
      tenantName: imp.tenantName,
      tenantSlug: '', // Non disponible dans la session
      tenantStatus: 'active',
      defaultRole: imp.roleName,
      isActive: true,
    }
  }

  const tenants = await getUserTenants()
  return tenants[0] ?? null
}

/**
 * Retourne le rôle actif (string) : impersonation > tenant > profils.
 */
export async function getActiveRoleFromDB(): Promise<Role | null> {
  const { data, error } = await supabase.rpc('get_active_role' as any) as { data: string | null; error: { message: string } | null }
  if (error || !data) return null
  return data as Role
}
