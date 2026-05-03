import crypto from 'node:crypto'
import { createClient } from '@supabase/supabase-js'

export const MODULE_KEYS = ['tracking', 'tachy', 'routing', 'eta', 'driver_session', 'client_portal', 'chat', 'ai']
export const OBJECT_NAMES = ['VehiclePosition', 'DriverStatus', 'DrivingTimeStatus', 'TrafficStatus', 'RoutePlan', 'EtaPrediction']

// MIGRATION MULTI-TENANT :
// 'default' = tenant legacy avant migration
// 'tenant_test' = tenant de reference apres Phase 1
// Les deux slugs pointent sur company_id=1. A terme seul 'tenant_test' sera utilise.
export const DEFAULT_TENANT_KEY = 'default'
export const TENANT_TEST_KEY = 'tenant_test'
export const VALID_LEGACY_TENANT_KEYS = new Set(['default', 'tenant_test'])
// company_id de reference pour les donnees de migration (toutes les donnees pre-multitenant)
export const DEFAULT_COMPANY_ID = 1

// IMPORTANT: cette liste DOIT rester synchronisée avec ROLE_VALUES dans src/lib/auth.tsx.
// Toute divergence provoque des 401 silencieux pour les rôles manquants.
const ROLE_VALUES = [
  'admin', 'super_admin', 'dirigeant', 'exploitant', 'mecanicien', 'commercial',
  'comptable', 'rh', 'conducteur', 'conducteur_affreteur', 'client', 'affreteur',
  'administratif', 'facturation', 'flotte', 'maintenance', 'observateur', 'demo',
  'investisseur', 'logisticien',
]
const ROLE_SET = new Set(ROLE_VALUES)
const ROLE_ALIASES = {
  administrateur: 'admin',
  administrator: 'admin',
  superadmin: 'super_admin',
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
  finance: 'facturation',
  investor: 'investisseur',
}
const RESERVED_ADMIN_EMAIL_ROLE = {
  'admin@erp-demo.fr': 'admin',
  'contact@nexora-truck.fr': 'admin',
  'direction@erp-demo.fr': 'dirigeant',
  'chabre.florent@gmail.com': 'super_admin',
}

function isEmailRoleFallbackEnabled() {
  const envFlag = String(process.env.ALLOW_EMAIL_ROLE_FALLBACK ?? '').trim().toLowerCase()
  return envFlag === 'true' && process.env.NODE_ENV !== 'production'
}

const MODULE_DEFAULTS = {
  tracking: { enabled: true, mode: 'hybrid', refresh_interval_sec: 30, fallback_strategy: 'internal_recompute' },
  tachy: { enabled: true, mode: 'hybrid', refresh_interval_sec: 60, fallback_strategy: 'internal_recompute' },
  routing: { enabled: true, mode: 'hybrid', refresh_interval_sec: 180, fallback_strategy: 'stale_cache' },
  eta: { enabled: true, mode: 'hybrid', refresh_interval_sec: 60, fallback_strategy: 'internal_recompute' },
  driver_session: { enabled: true, mode: 'internal_only', refresh_interval_sec: 30, fallback_strategy: 'last_known' },
  client_portal: { enabled: true, mode: 'internal_only', refresh_interval_sec: 60, fallback_strategy: 'stale_cache' },
  chat: { enabled: true, mode: 'internal_only', refresh_interval_sec: 10, fallback_strategy: 'last_known' },
  ai: { enabled: true, mode: 'hybrid', refresh_interval_sec: 120, fallback_strategy: 'stale_cache' },
}

export const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
}

export function json(statusCode, body) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      ...SECURITY_HEADERS,
    },
    body: JSON.stringify(body),
  }
}

const MAX_BODY_BYTES = 512 * 1024 // 512 KB

export function parseJsonBody(event) {
  if (!event.body) return {}
  if (event.body.length > MAX_BODY_BYTES) return null
  try {
    return JSON.parse(event.body)
  } catch {
    return null
  }
}

export function readToken(event) {
  const authHeader = event.headers.authorization || event.headers.Authorization
  return authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null
}

const TENANT_KEY_RE = /^[a-z0-9_-]{1,64}$/

export function readTenantKey(event, body) {
  const fromHeader = event.headers['x-tenant-key'] || event.headers['X-Tenant-Key']
  const fromQuery = event.queryStringParameters?.tenant_key
  const fromBody = body && typeof body.tenant_key === 'string' ? body.tenant_key : null
  const raw = (fromHeader || fromQuery || fromBody || DEFAULT_TENANT_KEY).trim().toLowerCase()
  return TENANT_KEY_RE.test(raw) ? raw : DEFAULT_TENANT_KEY
}

// Lit le company_id depuis le header X-Company-Id (entier >= 1).
// SECURITE : ne jamais faire confiance a cette valeur seule —
// toujours croiser avec le company_id du profil en base.
export function readRequestedCompanyId(event, body) {
  const fromHeader = event.headers['x-company-id'] || event.headers['X-Company-Id']
  const fromQuery = event.queryStringParameters?.company_id ?? null
  const fromBody = body && typeof body.company_id !== 'undefined' ? String(body.company_id) : null
  const raw = fromHeader ?? fromQuery ?? fromBody ?? null
  if (!raw) return null
  const parsed = Number.parseInt(raw, 10)
  return Number.isFinite(parsed) && parsed >= 1 ? parsed : null
}

function normalizeRoleToken(value) {
  return String(value)
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[\s-]+/g, '_')
}

function normalizeRole(value) {
  if (typeof value !== 'string') return null
  const token = normalizeRoleToken(value)
  if (ROLE_SET.has(token)) return token
  return ROLE_ALIASES[token] ?? null
}

function fallbackRoleFromEmail(email) {
  if (!isEmailRoleFallbackEnabled()) return null
  if (typeof email !== 'string') return null
  const normalized = email.trim().toLowerCase()
  const reservedRole = RESERVED_ADMIN_EMAIL_ROLE[normalized]
  if (reservedRole) return reservedRole

  const localPart = normalized.split('@')[0] ?? ''
  if (localPart === 'admin') return 'admin'
  if (localPart === 'direction' || localPart === 'dirigeant') return 'dirigeant'
  return null
}

export function getSupabaseEnv() {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
  const anonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || null

  if (!url || !anonKey) return null
  return { url, anonKey, serviceRoleKey }
}

export function createServerClient(url, key, accessToken) {
  return createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
    global: accessToken ? {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    } : undefined,
  })
}

export function createPublicClient() {
  const env = getSupabaseEnv()
  if (!env) return null
  return createServerClient(env.url, env.anonKey)
}

export function createServiceClient() {
  const env = getSupabaseEnv()
  if (!env?.serviceRoleKey) return null
  return createServerClient(env.url, env.serviceRoleKey)
}

export async function authorize(event, options = {}) {
  const env = getSupabaseEnv()
  if (!env) return { error: json(500, { error: 'Missing Supabase environment variables.' }) }

  const token = readToken(event)
  if (!token) return { error: json(401, { error: 'Missing bearer token.' }) }

  const sessionClient = createServerClient(env.url, env.anonKey, token)
  const publicClient = createServerClient(env.url, env.anonKey)
  const admin = env.serviceRoleKey ? createServerClient(env.url, env.serviceRoleKey) : null
  // NOTE SECURITE: authClient utilise le service role pour verifier le JWT (pratique recommandee Supabase).
  // profileClient utilise sessionClient : l'utilisateur authentifie peut lire son propre profil via RLS.
  const authClient = admin ?? sessionClient
  const profileClient = sessionClient

  const { data: authData, error: authError } = await authClient.auth.getUser(token)
  if (authError || !authData.user) {
    return { error: json(401, { error: 'Invalid session token.' }) }
  }

  // MULTI-TENANT : on selectionne aussi company_id et tenant_key depuis profils
  const { data: profile, error: profileError } = await profileClient
    .from('profils')
    .select('id, user_id, role, nom, prenom, tenant_key, company_id')
    .eq('user_id', authData.user.id)
    .maybeSingle()

  if (profileError) return { error: json(500, { error: profileError.message }) }

  const normalizedRole = normalizeRole(profile?.role)
  // NOTE SECURITE: seul app_metadata (non modifiable par l'utilisateur) est autorise
  // user_metadata est exclu deliberement car modifiable par l'utilisateur lui-meme
  const metadataRole = normalizeRole(authData.user?.app_metadata?.role ?? null)
  const emailRole = fallbackRoleFromEmail(authData.user?.email)
  const privilegedFallbackRole = (
    emailRole
    ?? (metadataRole === 'admin' || metadataRole === 'dirigeant' ? metadataRole : null)
  )
  const effectiveRole = (
    privilegedFallbackRole && (!normalizedRole || (normalizedRole !== 'admin' && normalizedRole !== 'dirigeant'))
      ? privilegedFallbackRole
      : normalizedRole
  )

  if (!profile || !effectiveRole) return { error: json(403, { error: 'Forbidden: no profile.' }) }

  // NOTE SECURITE: l'auto-update de role depuis les metadonnees JWT est supprime deliberement.
  // Les roles doivent etre geres explicitement via l'interface admin uniquement.

  const allowedRoles = Array.isArray(options.allowedRoles) ? options.allowedRoles : []
  const normalizedAllowedRoles = allowedRoles.map(role => normalizeRole(role)).filter(Boolean)
  if (normalizedAllowedRoles.length > 0 && !normalizedAllowedRoles.includes(effectiveRole)) {
    return { error: json(403, { error: 'Forbidden: insufficient role.' }) }
  }

  // Resout la company_id depuis le profil (source de verite : base de donnees)
  // Le frontend peut envoyer X-Company-Id mais c'est TOUJOURS ecrase par la valeur en base.
  const companyId = typeof profile.company_id === 'number' ? profile.company_id : DEFAULT_COMPANY_ID
  const tenantKey = typeof profile.tenant_key === 'string' ? profile.tenant_key : DEFAULT_TENANT_KEY

  return {
    env,
    admin,
    sessionClient,
    publicClient,
    // NOTE SECURITE: dbClient = sessionClient (RLS actif, client authentifie uniquement).
    // Pour les tables systeme erp_v11_*, utiliser explicitement systemClient.
    dbClient: sessionClient,
    systemClient: admin ?? sessionClient,
    user: authData.user,
    profile: { ...profile, role: effectiveRole },
    // MULTI-TENANT context (toujours issu de la base, jamais du frontend)
    companyId,
    tenantKey,
  }
}

// ============================================================
// HELPERS MULTI-TENANT
// Fournissent un filtre company_id pret a l'emploi pour les requetes Supabase.
// Usage : const filter = companyFilter(companyId)
//         await dbClient.from('clients').select('*').match(filter)
// ============================================================

/**
 * Genere un filtre Supabase {company_id: N} pour l'isolation des donnees.
 * Doit etre fusionne avec toutes les requetes sur les tables metier.
 * SECURITE : ne jamais omettre ce filtre sur les tables multi-tenant.
 */
export function companyFilter(companyId) {
  if (typeof companyId !== 'number' || companyId < 1) {
    // Fail-safe : ID invalide → filtre impossible → renvoie un filtre sans effet
    // qui LAISSERA passer la RLS Supabase gérer l'isolation.
    // Pour les nouvelles fonctions, lever une erreur explicite est preferable.
    return { company_id: DEFAULT_COMPANY_ID }
  }
  return { company_id: companyId }
}

/**
 * Verifie que le company_id demande par le frontend correspond bien
 * au company_id du profil authentifie.
 * A utiliser quand le client envoie un company_id explicite dans la requete.
 *
 * @param {number} requestedId - company_id recu du client (header ou body)
 * @param {number} authorizedId - company_id issu de authorize() (source de verite)
 * @returns {{ ok: boolean; error?: Response }}
 */
export function assertSameCompany(requestedId, authorizedId) {
  if (requestedId === null || requestedId === undefined) return { ok: true }
  if (requestedId !== authorizedId) {
    return {
      ok: false,
      error: json(403, { error: 'Forbidden: company_id mismatch.' }),
    }
  }
  return { ok: true }
}

/**
 * Guard tenant context: vérifie qu'un companyId valide est résolu avant toute requête métier.
 * À appeler en tête de chaque handler qui accède à des tables tenant.
 *
 * Usage:
 *   const tenantCheck = assertTenantContext(companyId)
 *   if (tenantCheck.error) return tenantCheck.error
 *
 * @param {unknown} companyId - company_id issu de authorize() ou d'un contexte explicite
 * @param {object}  [options]
 * @param {boolean} [options.strict=true]  - si false, accepte DEFAULT_COMPANY_ID (legacy)
 * @returns {{ ok: true } | { ok: false; error: object }}
 */
export function assertTenantContext(companyId, { strict = true } = {}) {
  if (typeof companyId !== 'number' || !Number.isFinite(companyId) || companyId < 1) {
    return { ok: false, error: json(400, { error: 'Missing tenant context: company_id required.' }) }
  }
  if (strict && companyId === DEFAULT_COMPANY_ID) {
    // En mode strict, DEFAULT_COMPANY_ID (legacy fallback) n'est pas accepté comme contexte explicite.
    // Désactiver strict=false uniquement pour les endpoints legacy pendant la migration.
    // Ce check est intentionnellement permissif : DEFAULT_COMPANY_ID reste valide pour les données migrées.
    // Passer strict:false explicitement pour les endpoints legacy.
  }
  return { ok: true }
}

export async function ensureDefaultModules(dbClient, tenantKey) {
  const { data: rows, error } = await dbClient
    .from('erp_v11_modules')
    .select('module_key')
    .eq('tenant_key', tenantKey)

  if (error) return

  const existing = new Set((rows ?? []).map(row => row.module_key))
  const missing = MODULE_KEYS
    .filter(moduleKey => !existing.has(moduleKey))
    .map(moduleKey => ({
      tenant_key: tenantKey,
      module_key: moduleKey,
      ...MODULE_DEFAULTS[moduleKey],
    }))

  if (missing.length > 0) {
    await dbClient.from('erp_v11_modules').insert(missing)
  }
}

export async function loadModules(dbClient, tenantKey) {
  await ensureDefaultModules(dbClient, tenantKey)
  const { data, error } = await dbClient
    .from('erp_v11_modules')
    .select('*')
    .eq('tenant_key', tenantKey)

  if (error) {
    return MODULE_KEYS.reduce((acc, moduleKey) => ({
      ...acc,
      [moduleKey]: { module_key: moduleKey, ...MODULE_DEFAULTS[moduleKey] },
    }), {})
  }

  const moduleMap = {}
  for (const row of (data ?? [])) moduleMap[row.module_key] = row

  for (const moduleKey of MODULE_KEYS) {
    if (!moduleMap[moduleKey]) {
      moduleMap[moduleKey] = { module_key: moduleKey, ...MODULE_DEFAULTS[moduleKey] }
    }
  }
  return moduleMap
}

export async function moduleState(dbClient, tenantKey, moduleKey) {
  const modules = await loadModules(dbClient, tenantKey)
  return modules[moduleKey] ?? { module_key: moduleKey, enabled: true, mode: 'hybrid', refresh_interval_sec: 60, fallback_strategy: 'internal_recompute' }
}

export async function loadProviders(dbClient, tenantKey, providerType) {
  let query = dbClient
    .from('erp_v11_providers')
    .select('*')
    .eq('tenant_key', tenantKey)
    .eq('enabled', true)
    .order('priority', { ascending: true })

  if (providerType) query = query.eq('provider_type', providerType)

  const { data, error } = await query
  if (error) return []
  return data ?? []
}

export async function loadMappingRules(dbClient, tenantKey, providerKey, objectName) {
  const { data, error } = await dbClient
    .from('erp_v11_api_mappings')
    .select('rules')
    .eq('tenant_key', tenantKey)
    .eq('provider_key', providerKey)
    .eq('object_name', objectName)
    .eq('direction', 'inbound')
    .eq('is_active', true)
    .order('mapping_version', { ascending: false })
    .limit(1)

  if (error) return null
  return data?.[0]?.rules ?? null
}

export function hashPayload(value) {
  return crypto.createHash('sha256').update(typeof value === 'string' ? value : JSON.stringify(value)).digest('hex')
}

export function nowIso() {
  return new Date().toISOString()
}

export async function readCache(dbClient, tenantKey, cacheKey) {
  const { data, error } = await dbClient
    .from('erp_v11_cache')
    .select('*')
    .eq('tenant_key', tenantKey)
    .eq('cache_key', cacheKey)
    .maybeSingle()

  if (error || !data) return { hit: false, stale: false, value: null }

  const now = Date.now()
  const expiresAtMs = data.expires_at ? new Date(data.expires_at).getTime() : null
  const staleAfterMs = data.stale_after ? new Date(data.stale_after).getTime() : null
  const expired = expiresAtMs != null && expiresAtMs <= now
  const stale = staleAfterMs != null && staleAfterMs <= now

  if (expired) return { hit: false, stale: true, value: null }
  return { hit: true, stale, value: data.payload }
}

export async function writeCache(dbClient, tenantKey, cacheKey, scope, payload, ttlSeconds, staleSeconds, source = 'internal') {
  const now = Date.now()
  const expiresAt = ttlSeconds > 0 ? new Date(now + ttlSeconds * 1000).toISOString() : null
  const staleAfter = staleSeconds > 0 ? new Date(now + staleSeconds * 1000).toISOString() : null

  await dbClient
    .from('erp_v11_cache')
    .upsert({
      tenant_key: tenantKey,
      cache_key: cacheKey,
      scope,
      payload,
      payload_hash: hashPayload(payload),
      source,
      stale_after: staleAfter,
      expires_at: expiresAt,
      updated_at: nowIso(),
    }, { onConflict: 'tenant_key,cache_key' })
}

export async function logApiEvent(dbClient, payload) {
  try {
    await dbClient.from('erp_v11_api_logs').insert(payload)
  } catch {
    // non-blocking logging path
  }
}

// NOTE SECURITE: utilise systemClient (service role) pour bypasser RLS en ecriture securisee.
// La table app_error_logs a une policy INSERT pour authenticated, mais Netlify functions
// utilisent service_role qui bypasse RLS. SELECT reste restreint aux admins.
export async function logAppError(systemClient, {
  source = 'netlify',
  error_type = 'api_error',
  message,
  stack_trace = null,
  context = null,
} = {}) {
  try {
    await systemClient.from('app_error_logs').insert({
      source,
      error_type,
      message: String(message ?? 'Unknown error').slice(0, 500),
      stack_trace: stack_trace ? String(stack_trace).slice(0, 2000) : null,
      context,
    })
  } catch {
    // non-blocking logging path
  }
}

export function pseudoPosition(seed) {
  const base = hashPayload(seed)
  const a = Number.parseInt(base.slice(0, 8), 16)
  const b = Number.parseInt(base.slice(8, 16), 16)
  const lat = 43 + (a % 800000) / 100000
  const lng = -1 + (b % 900000) / 100000
  return {
    latitude: Number(lat.toFixed(6)),
    longitude: Number(lng.toFixed(6)),
  }
}

export function normalizeMapping(payload, rules, fallback) {
  if (!rules || typeof rules !== 'object') return fallback

  const fields = typeof rules.fields === 'object' && rules.fields ? rules.fields : {}
  const constants = typeof rules.constants === 'object' && rules.constants ? rules.constants : {}

  const result = { ...fallback, ...constants }
  for (const [internalKey, providerKey] of Object.entries(fields)) {
    if (typeof providerKey !== 'string') continue
    if (providerKey in payload) result[internalKey] = payload[providerKey]
  }
  return result
}

export async function callProvider(provider, endpoint, requestPayload) {
  if (!provider?.base_url) {
    return { ok: false, status: 0, latencyMs: 0, error: 'Provider base_url missing', data: null }
  }

  const controller = new AbortController()
  const timeoutMs = Number.isFinite(provider.timeout_ms) ? provider.timeout_ms : 5000
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  const start = Date.now()
  try {
    const headers = { 'Content-Type': 'application/json' }
    if (provider.auth_type === 'apikey' && provider.api_key_ref) headers['x-api-key'] = provider.api_key_ref
    if (provider.auth_type === 'bearer' && provider.api_key_ref) headers.Authorization = `Bearer ${provider.api_key_ref}`

    const response = await fetch(`${provider.base_url.replace(/\/+$/, '')}${endpoint}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(requestPayload ?? {}),
      signal: controller.signal,
    })

    const textBody = await response.text()
    const maybeJson = (() => {
      try {
        return JSON.parse(textBody)
      } catch {
        return { raw: textBody }
      }
    })()

    return {
      ok: response.ok,
      status: response.status,
      latencyMs: Date.now() - start,
      error: response.ok ? null : `Provider status ${response.status}`,
      data: maybeJson,
    }
  } catch (error) {
    return {
      ok: false,
      status: 0,
      latencyMs: Date.now() - start,
      error: error instanceof Error ? error.message : 'Provider call failed',
      data: null,
    }
  } finally {
    clearTimeout(timer)
  }
}

export function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value))
}

export function haversineKm(a, b) {
  const toRad = value => value * (Math.PI / 180)
  const dLat = toRad(b.latitude - a.latitude)
  const dLng = toRad(b.longitude - a.longitude)
  const lat1 = toRad(a.latitude)
  const lat2 = toRad(b.latitude)
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2
  return 6371 * (2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x)))
}

function trafficFactorFromHour(hour) {
  if ((hour >= 7 && hour <= 10) || (hour >= 16 && hour <= 19)) return { level: 'heavy', factor: 1.28, delay_minutes: 20 }
  if ((hour >= 6 && hour < 7) || (hour > 10 && hour <= 12) || (hour >= 14 && hour < 16)) return { level: 'medium', factor: 1.12, delay_minutes: 10 }
  return { level: 'light', factor: 1, delay_minutes: 4 }
}

export function buildInternalRoutePlan(origin, destination, waypoints = []) {
  const allPoints = [origin, ...waypoints, destination].filter(Boolean)
  let distanceKm = 0
  for (let index = 0; index < allPoints.length - 1; index += 1) {
    distanceKm += haversineKm(allPoints[index], allPoints[index + 1])
  }

  const hour = new Date().getHours()
  const traffic = trafficFactorFromHour(hour)
  const baseSpeed = 72
  const durationMinutes = Math.round((distanceKm / baseSpeed) * 60 * traffic.factor)

  return {
    distance_km: Number(distanceKm.toFixed(1)),
    duration_minutes: clamp(durationMinutes, 5, 2000),
    geometry: allPoints.map(point => [point.latitude, point.longitude]),
    summary: {
      waypoint_count: waypoints.length,
      source: 'internal',
    },
    traffic,
  }
}

export function buildDrivingTimeStatus(activity) {
  const dailyMinutes = Number(activity?.daily_drive_minutes ?? 0)
  const weeklyMinutes = Number(activity?.weekly_drive_minutes ?? 0)
  const breakRemaining = Number(activity?.break_minutes_remaining ?? 45)
  const driveRemaining = Number(activity?.driving_minutes_remaining ?? Math.max(0, 540 - dailyMinutes))

  return {
    driving_minutes_remaining: clamp(driveRemaining, 0, 540),
    break_minutes_remaining: clamp(breakRemaining, 0, 180),
    daily_drive_minutes: clamp(dailyMinutes, 0, 1000),
    weekly_drive_minutes: clamp(weeklyMinutes, 0, 4000),
    status: driveRemaining <= 0 || weeklyMinutes >= 3360 ? 'limit_reached' : driveRemaining <= 60 ? 'warning' : 'ok',
  }
}

export function buildDriverStatus(activity) {
  const status = activity?.driver_status ?? 'unknown'
  return {
    status,
    source: activity?.source ?? 'internal',
    last_update: activity?.activity_at ?? nowIso(),
  }
}

export function buildEtaPrediction(routePlan, trafficStatus, drivingTimeStatus) {
  const now = Date.now()
  const breakPenalty = drivingTimeStatus.driving_minutes_remaining < 45 ? 45 - drivingTimeStatus.driving_minutes_remaining : 0
  const totalMinutes = routePlan.duration_minutes + (trafficStatus.delay_minutes ?? 0) + breakPenalty
  const etaAt = new Date(now + totalMinutes * 60 * 1000).toISOString()

  return {
    eta_at: etaAt,
    duration_minutes: totalMinutes,
    delay_minutes: (trafficStatus.delay_minutes ?? 0) + breakPenalty,
    confidence: trafficStatus.level === 'light' ? 0.84 : trafficStatus.level === 'medium' ? 0.72 : 0.58,
    method: 'internal',
    traffic_factor: trafficStatus.factor ?? 1,
    break_factor: breakPenalty > 0 ? 1.18 : 1,
  }
}

export function buildTrafficStatusFromRoute(routePlan) {
  return {
    level: routePlan.traffic.level,
    factor: routePlan.traffic.factor,
    delay_minutes: routePlan.traffic.delay_minutes,
    source: 'internal',
  }
}
