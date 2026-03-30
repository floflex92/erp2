import {
  authorize,
  callProvider,
  json,
  loadMappingRules,
  loadProviders,
  logApiEvent,
  moduleState,
  normalizeMapping,
  nowIso,
  parseJsonBody,
  pseudoPosition,
  readCache,
  readTenantKey,
  writeCache,
} from './_lib/v11-core.js'

const ALLOWED_ROLES = ['admin', 'dirigeant', 'exploitant', 'conducteur']

function parseLimit(value, fallback) {
  const parsed = Number.parseInt(value ?? '', 10)
  if (!Number.isFinite(parsed)) return fallback
  return Math.max(1, Math.min(500, parsed))
}

async function resolveLivePosition(dbClient, tenantKey, vehicleId) {
  if (vehicleId) {
    const { data, error } = await dbClient
      .from('erp_v11_vehicle_positions')
      .select('*')
      .eq('tenant_key', tenantKey)
      .eq('vehicle_id', vehicleId)
      .order('position_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (!error && data) return data
  }

  const query = dbClient
    .from('erp_v11_vehicle_positions')
    .select('*')
    .eq('tenant_key', tenantKey)
    .order('position_at', { ascending: false })
    .limit(1)

  const { data, error } = await query
  if (error || !data?.[0]) return null
  return data[0]
}

async function resolveFallbackPosition(dbClient, tenantKey, vehicleId) {
  if (vehicleId) {
    const { data } = await dbClient
      .from('vehicules')
      .select('id, immatriculation')
      .eq('id', vehicleId)
      .maybeSingle()
    if (data?.id) {
      const geo = pseudoPosition(`${tenantKey}:${data.immatriculation ?? data.id}`)
      return {
        vehicle_id: data.id,
        position_at: nowIso(),
        latitude: geo.latitude,
        longitude: geo.longitude,
        speed_kmh: null,
        heading_deg: null,
        accuracy_m: null,
        source: 'internal_estimate',
      }
    }
  }

  const { data } = await dbClient
    .from('vehicules')
    .select('id, immatriculation')
    .limit(1)
    .order('created_at', { ascending: false })

  const row = data?.[0]
  if (!row) return null
  const geo = pseudoPosition(`${tenantKey}:${row.immatriculation ?? row.id}`)
  return {
    vehicle_id: row.id,
    position_at: nowIso(),
    latitude: geo.latitude,
    longitude: geo.longitude,
    speed_kmh: null,
    heading_deg: null,
    accuracy_m: null,
    source: 'internal_estimate',
  }
}

function toVehiclePosition(payload) {
  return {
    vehicle_id: payload.vehicle_id,
    timestamp: payload.position_at ?? nowIso(),
    latitude: Number(payload.latitude),
    longitude: Number(payload.longitude),
    speed_kmh: payload.speed_kmh != null ? Number(payload.speed_kmh) : null,
    heading_deg: payload.heading_deg != null ? Number(payload.heading_deg) : null,
    accuracy_m: payload.accuracy_m != null ? Number(payload.accuracy_m) : null,
    source: payload.source ?? 'internal',
  }
}

async function maybeEnrichWithProvider(dbClient, tenantKey, moduleConfig, vehiclePosition) {
  if (moduleConfig.mode === 'internal_only') return { vehiclePosition, providerUsed: null }

  const providers = await loadProviders(dbClient, tenantKey, 'tracking')
  const provider = providers[0]
  if (!provider) return { vehiclePosition, providerUsed: null }

  const providerResponse = await callProvider(provider, '/tracking/live', { vehicle_id: vehiclePosition.vehicle_id })
  await logApiEvent(dbClient, {
    tenant_key: tenantKey,
    module_key: 'tracking',
    provider_key: provider.provider_key,
    status: providerResponse.ok ? 'ok' : 'error',
    http_status: providerResponse.status,
    latency_ms: providerResponse.latencyMs,
    request_payload: { vehicle_id: vehiclePosition.vehicle_id },
    response_payload: providerResponse.data,
    error_message: providerResponse.error,
  })

  if (!providerResponse.ok || !providerResponse.data || typeof providerResponse.data !== 'object') {
    return { vehiclePosition, providerUsed: null }
  }

  const rules = await loadMappingRules(dbClient, tenantKey, provider.provider_key, 'VehiclePosition')
  const mapped = normalizeMapping(providerResponse.data, rules, {
    vehicle_id: vehiclePosition.vehicle_id,
    timestamp: nowIso(),
    latitude: vehiclePosition.latitude,
    longitude: vehiclePosition.longitude,
    speed_kmh: vehiclePosition.speed_kmh,
    heading_deg: vehiclePosition.heading_deg,
    accuracy_m: vehiclePosition.accuracy_m,
    source: 'provider',
  })

  if (!Number.isFinite(mapped.latitude) || !Number.isFinite(mapped.longitude)) {
    return { vehiclePosition, providerUsed: null }
  }

  const next = {
    vehicle_id: mapped.vehicle_id ?? vehiclePosition.vehicle_id,
    timestamp: mapped.timestamp ?? nowIso(),
    latitude: Number(mapped.latitude),
    longitude: Number(mapped.longitude),
    speed_kmh: mapped.speed_kmh != null ? Number(mapped.speed_kmh) : vehiclePosition.speed_kmh,
    heading_deg: mapped.heading_deg != null ? Number(mapped.heading_deg) : vehiclePosition.heading_deg,
    accuracy_m: mapped.accuracy_m != null ? Number(mapped.accuracy_m) : vehiclePosition.accuracy_m,
    source: provider.provider_key,
  }

  await dbClient.from('erp_v11_vehicle_positions').insert({
    tenant_key: tenantKey,
    vehicle_id: next.vehicle_id,
    provider_key: provider.provider_key,
    position_at: next.timestamp,
    latitude: next.latitude,
    longitude: next.longitude,
    speed_kmh: next.speed_kmh,
    heading_deg: next.heading_deg,
    accuracy_m: next.accuracy_m,
    source: 'provider',
    raw_payload: providerResponse.data,
  })

  return { vehiclePosition: next, providerUsed: provider.provider_key }
}

export async function handler(event) {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204 }

  const auth = await authorize(event, { allowedRoles: ALLOWED_ROLES })
  if (auth.error) return auth.error

  const body = parseJsonBody(event)
  if (body === null) return json(400, { error: 'Invalid JSON payload.' })

  const tenantKey = readTenantKey(event, body)
  const action = (event.queryStringParameters?.action ?? body.action ?? 'live').toLowerCase()
  const vehicleId = event.queryStringParameters?.vehicle_id ?? body.vehicle_id ?? null
  const moduleConfig = await moduleState(auth.dbClient, tenantKey, 'tracking')

  if (!moduleConfig.enabled) {
    return json(423, { error: 'Tracking module disabled for tenant.', tenant_key: tenantKey })
  }

  if (action === 'historique' || action === 'history') {
    const limit = parseLimit(event.queryStringParameters?.limit ?? body.limit, 120)
    let query = auth.dbClient
      .from('erp_v11_vehicle_positions')
      .select('*')
      .eq('tenant_key', tenantKey)
      .order('position_at', { ascending: false })
      .limit(limit)

    if (vehicleId) query = query.eq('vehicle_id', vehicleId)
    const { data, error } = await query
    if (error) return json(500, { error: error.message })

    return json(200, {
      tenant_key: tenantKey,
      object: 'VehiclePosition[]',
      mode: moduleConfig.mode,
      source: 'internal_history',
      data: (data ?? []).map(toVehiclePosition),
    })
  }

  const cacheKey = `tracking:live:${vehicleId ?? 'latest'}`
  const cacheResult = await readCache(auth.dbClient, tenantKey, cacheKey)
  if (cacheResult.hit) {
    return json(200, {
      tenant_key: tenantKey,
      object: 'VehiclePosition',
      source: 'cache',
      stale: cacheResult.stale,
      data: cacheResult.value,
    })
  }

  let row = await resolveLivePosition(auth.dbClient, tenantKey, vehicleId)
  if (!row) row = await resolveFallbackPosition(auth.dbClient, tenantKey, vehicleId)
  if (!row) return json(404, { error: 'No vehicle position could be resolved.' })

  let vehiclePosition = toVehiclePosition(row)
  let providerUsed = null
  if (moduleConfig.mode !== 'internal_only') {
    const enriched = await maybeEnrichWithProvider(auth.dbClient, tenantKey, moduleConfig, vehiclePosition)
    vehiclePosition = enriched.vehiclePosition
    providerUsed = enriched.providerUsed
  }

  const ttl = Math.max(10, Number(moduleConfig.refresh_interval_sec ?? 30))
  await writeCache(auth.dbClient, tenantKey, cacheKey, 'tracking', vehiclePosition, ttl, Math.floor(ttl / 2), providerUsed ? 'provider' : 'internal')

  return json(200, {
    tenant_key: tenantKey,
    object: 'VehiclePosition',
    mode: moduleConfig.mode,
    provider: providerUsed,
    data: vehiclePosition,
  })
}

