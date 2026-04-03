import {
  MODULE_KEYS,
  OBJECT_NAMES,
  authorize,
  ensureDefaultModules,
  json,
  parseJsonBody,
  readTenantKey,
} from './_lib/v11-core.js'

const ADMIN_ROLES = ['admin', 'dirigeant']
const PROVIDER_TYPES = ['tracking', 'tachy', 'routing', 'traffic', 'eta', 'chat', 'ai']

function sanitizeModuleInput(item, tenantKey) {
  if (!item || typeof item !== 'object') return null
  if (!MODULE_KEYS.includes(item.module_key)) return null
  return {
    tenant_key: tenantKey,
    module_key: item.module_key,
    enabled: item.enabled !== false,
    mode: typeof item.mode === 'string' ? item.mode : 'hybrid',
    refresh_interval_sec: Number.isFinite(item.refresh_interval_sec) ? Math.max(5, Math.floor(item.refresh_interval_sec)) : 60,
    fallback_strategy: typeof item.fallback_strategy === 'string' ? item.fallback_strategy : 'internal_recompute',
    config: item.config && typeof item.config === 'object' ? item.config : {},
  }
}

function sanitizeProviderInput(item, tenantKey) {
  if (!item || typeof item !== 'object') return null
  if (typeof item.provider_key !== 'string' || item.provider_key.trim() === '') return null
  if (!PROVIDER_TYPES.includes(item.provider_type)) return null
  return {
    tenant_key: tenantKey,
    provider_key: item.provider_key.trim(),
    provider_type: item.provider_type,
    enabled: item.enabled !== false,
    priority: Number.isFinite(item.priority) ? Math.max(1, Math.floor(item.priority)) : 100,
    base_url: typeof item.base_url === 'string' && item.base_url.trim() ? item.base_url.trim() : null,
    auth_type: typeof item.auth_type === 'string' ? item.auth_type : 'none',
    api_key_ref: typeof item.api_key_ref === 'string' && item.api_key_ref.trim() ? item.api_key_ref.trim() : null,
    capabilities: Array.isArray(item.capabilities) ? item.capabilities.filter(value => typeof value === 'string') : [],
    rate_limit_per_minute: Number.isFinite(item.rate_limit_per_minute) ? Math.max(1, Math.floor(item.rate_limit_per_minute)) : 60,
    cache_ttl_sec: Number.isFinite(item.cache_ttl_sec) ? Math.max(1, Math.floor(item.cache_ttl_sec)) : 120,
    timeout_ms: Number.isFinite(item.timeout_ms) ? Math.max(250, Math.floor(item.timeout_ms)) : 5000,
    mapping_profile: typeof item.mapping_profile === 'string' ? item.mapping_profile : 'default',
    config: item.config && typeof item.config === 'object' ? item.config : {},
  }
}

function sanitizeMappingInput(item, tenantKey) {
  if (!item || typeof item !== 'object') return null
  if (typeof item.provider_key !== 'string' || item.provider_key.trim() === '') return null
  if (!OBJECT_NAMES.includes(item.object_name)) return null
  return {
    tenant_key: tenantKey,
    provider_key: item.provider_key.trim(),
    object_name: item.object_name,
    direction: item.direction === 'outbound' ? 'outbound' : 'inbound',
    mapping_version: Number.isFinite(item.mapping_version) ? Math.max(1, Math.floor(item.mapping_version)) : 1,
    is_active: item.is_active !== false,
    rules: item.rules && typeof item.rules === 'object' ? item.rules : {},
  }
}

async function loadScope(dbClient, tenantKey, scope) {
  if (scope === 'modules') {
    await ensureDefaultModules(dbClient, tenantKey)
    const { data, error } = await dbClient
      .from('erp_v11_modules')
      .select('*')
      .eq('tenant_key', tenantKey)
      .order('module_key', { ascending: true })
    if (error) return { error: error.message }
    return { data: data ?? [] }
  }

  if (scope === 'providers') {
    const { data, error } = await dbClient
      .from('erp_v11_providers')
      .select('*')
      .eq('tenant_key', tenantKey)
      .order('priority', { ascending: true })
    if (error) return { error: error.message }
    return { data: data ?? [] }
  }

  if (scope === 'mappings') {
    const { data, error } = await dbClient
      .from('erp_v11_api_mappings')
      .select('*')
      .eq('tenant_key', tenantKey)
      .order('provider_key', { ascending: true })
      .order('object_name', { ascending: true })
      .order('mapping_version', { ascending: false })
    if (error) return { error: error.message }
    return { data: data ?? [] }
  }

  if (scope === 'settings') {
    const { data, error } = await dbClient
      .from('config_entreprise')
      .select('cle, valeur')
      .like('cle', 'v11.%')
    if (error) return { error: error.message }
    return {
      data: Object.fromEntries((data ?? []).map(row => [row.cle, row.valeur])),
    }
  }

  if (scope === 'all') {
    const [modulesResult, providersResult, mappingsResult, settingsResult] = await Promise.all([
      loadScope(dbClient, tenantKey, 'modules'),
      loadScope(dbClient, tenantKey, 'providers'),
      loadScope(dbClient, tenantKey, 'mappings'),
      loadScope(dbClient, tenantKey, 'settings'),
    ])
    const failed = [modulesResult, providersResult, mappingsResult, settingsResult].find(result => result.error)
    if (failed) return failed

    return {
      data: {
        modules: modulesResult.data,
        providers: providersResult.data,
        mappings: mappingsResult.data,
        settings: settingsResult.data,
      },
    }
  }

  return { error: `Unsupported scope "${scope}".` }
}

async function upsertScope(dbClient, tenantKey, scope, body) {
  if (scope === 'modules') {
    const source = Array.isArray(body.items) ? body.items : [body]
    const payload = source.map(item => sanitizeModuleInput(item, tenantKey)).filter(Boolean)
    if (payload.length === 0) return { error: 'No valid module payload.' }
    const { error } = await dbClient
      .from('erp_v11_modules')
      .upsert(payload, { onConflict: 'tenant_key,module_key' })
    if (error) return { error: error.message }
    return { ok: true, count: payload.length }
  }

  if (scope === 'providers') {
    const source = Array.isArray(body.items) ? body.items : [body]
    const payload = source.map(item => sanitizeProviderInput(item, tenantKey)).filter(Boolean)
    if (payload.length === 0) return { error: 'No valid provider payload.' }
    const { error } = await dbClient
      .from('erp_v11_providers')
      .upsert(payload, { onConflict: 'tenant_key,provider_key' })
    if (error) return { error: error.message }
    return { ok: true, count: payload.length }
  }

  if (scope === 'mappings') {
    const source = Array.isArray(body.items) ? body.items : [body]
    const payload = source.map(item => sanitizeMappingInput(item, tenantKey)).filter(Boolean)
    if (payload.length === 0) return { error: 'No valid mapping payload.' }
    const { error } = await dbClient
      .from('erp_v11_api_mappings')
      .upsert(payload, { onConflict: 'tenant_key,provider_key,object_name,direction,mapping_version' })
    if (error) return { error: error.message }
    return { ok: true, count: payload.length }
  }

  if (scope === 'settings') {
    const entries = Object.entries(body.settings ?? {})
      .filter(([key]) => key.startsWith('v11.'))
      .map(([key, value]) => ({ cle: key, valeur: value }))

    if (entries.length === 0) return { error: 'No valid settings payload.' }
    const { error } = await dbClient
      .from('config_entreprise')
      .upsert(entries, { onConflict: 'cle' })
    if (error) return { error: error.message }
    return { ok: true, count: entries.length }
  }

  return { error: `Unsupported scope "${scope}".` }
}

export async function handler(event) {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204 }

  const auth = await authorize(event, { allowedRoles: ADMIN_ROLES })
  if (auth.error) return auth.error

  const body = parseJsonBody(event)
  if (body === null) return json(400, { error: 'Invalid JSON payload.' })

  const tenantKey = readTenantKey(event, body)
  const scope = (event.queryStringParameters?.scope ?? body.scope ?? 'all').toLowerCase()

  if (event.httpMethod === 'GET') {
    // NOTE SECURITE: v11-admin-config n'accede qu'a des tables systeme (erp_v11_*, config_entreprise) → systemClient.
    const result = await loadScope(auth.systemClient, tenantKey, scope)
    if (result.error) return json(400, { error: result.error })
    return json(200, { tenant_key: tenantKey, scope, data: result.data })
  }

  if (event.httpMethod === 'POST' || event.httpMethod === 'PUT' || event.httpMethod === 'PATCH') {
    const result = await upsertScope(auth.systemClient, tenantKey, scope, body)
    if (result.error) return json(400, { error: result.error })
    return json(200, { tenant_key: tenantKey, scope, ...result })
  }

  if (event.httpMethod === 'DELETE') {
    if (scope === 'providers' && typeof body.provider_key === 'string') {
      const { error } = await auth.systemClient
        .from('erp_v11_providers')
        .delete()
        .eq('tenant_key', tenantKey)
        .eq('provider_key', body.provider_key)
      if (error) return json(400, { error: error.message })
      return json(200, { ok: true })
    }

    if (scope === 'mappings' && typeof body.provider_key === 'string' && typeof body.object_name === 'string') {
      const { error } = await auth.systemClient
        .from('erp_v11_api_mappings')
        .delete()
        .eq('tenant_key', tenantKey)
        .eq('provider_key', body.provider_key)
        .eq('object_name', body.object_name)
      if (error) return json(400, { error: error.message })
      return json(200, { ok: true })
    }

    return json(400, { error: 'Unsupported delete scope or payload.' })
  }

  return json(405, { error: 'Method not allowed.' })
}

