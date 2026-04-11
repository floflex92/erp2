import { createClient } from '@supabase/supabase-js'

const ROLE_VALUES = ['admin', 'dirigeant', 'exploitant', 'mecanicien', 'commercial', 'comptable', 'rh', 'conducteur', 'conducteur_affreteur', 'client', 'affreteur', 'administratif', 'facturation', 'flotte', 'maintenance', 'observateur', 'demo', 'investisseur', 'super_admin']
const ROLE_SET = new Set(ROLE_VALUES)
const ADMIN_ROLES = new Set(['admin', 'super_admin', 'dirigeant'])
const ACCOUNT_STATUSES = new Set(['actif', 'suspendu', 'archive', 'desactive'])
const ALL_MODULE_KEYS = ['dashboard', 'planning', 'fleet', 'workshop', 'hr', 'accounting', 'documents', 'settings']
const ALL_PAGE_KEYS = [
  'dashboard', 'tasks', 'chauffeurs', 'rh', 'vehicules', 'remorques', 'equipements', 'maintenance', 'transports',
  'clients', 'facturation', 'comptabilite', 'paie', 'frais', 'tachygraphe', 'amendes', 'map-live', 'planning',
  'feuille-route', 'prospection', 'demandes-clients', 'espace-client', 'espace-affreteur', 'parametres',
  'utilisateurs', 'communication', 'inter-erp', 'tchat', 'mail', 'coffre', 'mentions-legales',
]

function json(statusCode, body) {
  return {
    statusCode,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }
}

function getSupabaseEnv() {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
  const anonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || null
  if (!url || !anonKey) return null
  return { url, anonKey, serviceRoleKey }
}

function createServerClient(url, key, accessToken) {
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: accessToken ? { headers: { Authorization: `Bearer ${accessToken}` } } : undefined,
  })
}

function normalizeToken(value) {
  return String(value)
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[\s-]+/g, '_')
}

function normalizeRole(value) {
  if (typeof value !== 'string') return null
  const token = normalizeToken(value)
  return ROLE_SET.has(token) ? token : null
}

function sanitizeStatus(value, fallback = 'actif') {
  const token = normalizeToken(value ?? '')
  return ACCOUNT_STATUSES.has(token) ? token : fallback
}

function sanitizeMaxScreens(value, fallback = 1) {
  const n = Number(value)
  if (!Number.isFinite(n)) return fallback
  return Math.max(1, Math.min(12, Math.trunc(n)))
}

function sanitizeAllowedPages(value) {
  if (!Array.isArray(value)) return []
  return Array.from(new Set(value.filter(item => typeof item === 'string').map(item => item.trim()).filter(item => ALL_PAGE_KEYS.includes(item))))
}

function sanitizeModules(value) {
  if (!Array.isArray(value)) return ALL_MODULE_KEYS
  const filtered = value.filter(item => typeof item === 'string' && ALL_MODULE_KEYS.includes(item))
  return filtered.length > 0 ? filtered : ALL_MODULE_KEYS
}

function sanitizeTenantKey(value) {
  if (typeof value !== 'string') return null
  const token = normalizeToken(value)
  if (!/^[a-z0-9_]{2,64}$/.test(token)) return null
  return token
}

async function authorize(event) {
  const authHeader = event.headers.authorization || event.headers.Authorization
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null
  const env = getSupabaseEnv()

  if (!env) return { error: json(500, { error: 'Missing Supabase environment variables.' }) }
  if (!token) return { error: json(401, { error: 'Missing bearer token.' }) }

  const sessionClient = createServerClient(env.url, env.anonKey, token)
  const admin = env.serviceRoleKey ? createServerClient(env.url, env.serviceRoleKey) : null
  const authClient = admin ?? sessionClient

  const { data, error } = await authClient.auth.getUser(token)
  if (error || !data.user) return { error: json(401, { error: 'Invalid session token.' }) }

  const dbClient = admin ?? sessionClient
  const { data: profile, error: profileError } = await dbClient
    .from('profils')
    .select('id, user_id, role')
    .eq('user_id', data.user.id)
    .maybeSingle()

  if (profileError) return { error: json(500, { error: profileError.message }) }
  const role = normalizeRole(profile?.role)
  if (!profile || !role || !ADMIN_ROLES.has(role)) {
    return { error: json(403, { error: 'Forbidden: insufficient role.' }) }
  }

  return { admin, dbClient, currentUser: data.user, currentProfile: profile }
}

async function listClients({ admin, dbClient }) {
  const [{ data: tenants, error: tenantsError }, { data: profiles, error: profilesError }, { data: companies, error: companiesError }] = await Promise.all([
    dbClient.from('erp_v11_tenants').select('*').order('display_name', { ascending: true }),
    dbClient.from('profils').select('id, user_id, role, matricule, nom, prenom, tenant_key, max_concurrent_screens, created_at, updated_at').order('nom', { ascending: true }),
    dbClient.from('companies').select('id, name, slug, status, enabled_modules'),
  ])

  if (tenantsError) return { error: tenantsError.message }
  if (profilesError) return { error: profilesError.message }
  if (companiesError) return { error: companiesError.message }

  let authById = new Map()
  if (admin) {
    const { data: authData, error: authError } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 })
    if (authError) return { error: authError.message }
    authById = new Map((authData?.users ?? []).map(user => [user.id, user]))
  }

  const employees = (profiles ?? []).map(profile => {
    const authUser = authById.get(profile.user_id)
    return {
      ...profile,
      email: authUser?.email ?? null,
      last_sign_in_at: authUser?.last_sign_in_at ?? null,
    }
  })

  // Merge enabled_modules from companies into each tenant row
  const companiesById = new Map((companies ?? []).map(c => [c.id, c]))
  const enrichedTenants = (tenants ?? []).map(t => ({
    ...t,
    enabled_modules: companiesById.get(t.company_id)?.enabled_modules ?? null,
    company_status: companiesById.get(t.company_id)?.status ?? null,
  }))

  return {
    tenants: enrichedTenants,
    employees,
    allPageKeys: ALL_PAGE_KEYS,
    allModuleKeys: ALL_MODULE_KEYS,
  }
}

async function createTenant({ dbClient }, rawBody) {
  const body = typeof rawBody === 'string' && rawBody.length > 0 ? JSON.parse(rawBody) : {}
  const tenantKey = sanitizeTenantKey(body.tenant_key)
  const displayName = typeof body.display_name === 'string' ? body.display_name.trim() : ''
  const defaultMaxScreens = sanitizeMaxScreens(body.default_max_concurrent_screens, 1)
  const allowedPages = sanitizeAllowedPages(body.allowed_pages)
  const isActive = body.is_active !== false

  if (!tenantKey) return json(400, { error: 'tenant_key invalide.' })
  if (!displayName) return json(400, { error: 'display_name requis.' })

  const { error } = await dbClient.from('erp_v11_tenants').insert({
    tenant_key: tenantKey,
    display_name: displayName,
    is_active: isActive,
    default_max_concurrent_screens: defaultMaxScreens,
    allowed_pages: allowedPages,
  })

  if (error) return json(400, { error: error.message })
  return json(201, { ok: true, tenant_key: tenantKey })
}

async function updateTenant({ dbClient }, body) {
  const tenantKey = sanitizeTenantKey(body.tenant_key)
  if (!tenantKey) return json(400, { error: 'tenant_key invalide.' })

  const patch = {}
  if (typeof body.display_name === 'string' && body.display_name.trim()) patch.display_name = body.display_name.trim()
  if (typeof body.is_active === 'boolean') patch.is_active = body.is_active
  if (body.default_max_concurrent_screens !== undefined) patch.default_max_concurrent_screens = sanitizeMaxScreens(body.default_max_concurrent_screens, 1)
  if (Array.isArray(body.allowed_pages)) patch.allowed_pages = sanitizeAllowedPages(body.allowed_pages)

  const { error } = await dbClient.from('erp_v11_tenants').update(patch).eq('tenant_key', tenantKey)
  if (error) return json(400, { error: error.message })

  if (patch.default_max_concurrent_screens) {
    const { error: profileUpdateError } = await dbClient
      .from('profils')
      .update({ max_concurrent_screens: patch.default_max_concurrent_screens })
      .eq('tenant_key', tenantKey)
    if (profileUpdateError) return json(400, { error: profileUpdateError.message })
  }

  return json(200, { ok: true })
}

async function updateTenantModules({ dbClient }, body) {
  const companyId = typeof body.company_id === 'number' && body.company_id > 0 ? body.company_id : null
  if (!companyId) return json(400, { error: 'company_id requis et doit etre un entier positif.' })
  const modules = sanitizeModules(body.enabled_modules)
  const { error } = await dbClient.from('companies').update({ enabled_modules: modules }).eq('id', companyId)
  if (error) return json(400, { error: error.message })
  return json(200, { ok: true, enabled_modules: modules })
}

async function updateEmployee({ dbClient }, body) {
  const profileId = typeof body.profile_id === 'string' ? body.profile_id : ''
  if (!profileId) return json(400, { error: 'profile_id requis.' })

  const patch = {}
  if (body.tenant_key !== undefined) {
    const tenantKey = sanitizeTenantKey(body.tenant_key)
    patch.tenant_key = tenantKey ?? 'default'
  }
  if (body.role !== undefined) {
    const role = normalizeRole(body.role)
    if (!role) return json(400, { error: 'Role invalide.' })
    patch.role = role
  }
  if (body.account_status !== undefined) {
    patch.account_status = sanitizeStatus(body.account_status, 'actif')
  }
  if (body.max_concurrent_screens !== undefined) {
    patch.max_concurrent_screens = sanitizeMaxScreens(body.max_concurrent_screens, 1)
  }

  const { error } = await dbClient.from('profils').update(patch).eq('id', profileId)
  if (error) return json(400, { error: error.message })
  return json(200, { ok: true })
}

export async function handler(event) {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204 }

  const auth = await authorize(event)
  if (auth.error) return auth.error

  if (event.httpMethod === 'GET') {
    const result = await listClients(auth)
    if (result.error) return json(500, { error: result.error })
    return json(200, result)
  }

  if (event.httpMethod === 'POST') {
    try {
      return await createTenant(auth, event.body)
    } catch {
      return json(400, { error: 'Invalid JSON payload.' })
    }
  }

  if (event.httpMethod === 'PATCH') {
    try {
      const body = typeof event.body === 'string' && event.body.length > 0 ? JSON.parse(event.body) : {}
      if (body.kind === 'employee') return await updateEmployee(auth, body)
      if (body.kind === 'modules') return await updateTenantModules(auth, body)
      return await updateTenant(auth, body)
    } catch {
      return json(400, { error: 'Invalid JSON payload.' })
    }
  }

  return json(405, { error: 'Method not allowed.' })
}
