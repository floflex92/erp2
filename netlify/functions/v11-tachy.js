import {
  authorize,
  buildDriverStatus,
  buildDrivingTimeStatus,
  callProvider,
  json,
  loadMappingRules,
  loadProviders,
  logApiEvent,
  moduleState,
  normalizeMapping,
  parseJsonBody,
  readCache,
  readTenantKey,
  writeCache,
} from './_lib/v11-core.js'

const ALLOWED_ROLES = ['admin', 'dirigeant', 'exploitant', 'conducteur']

async function aggregateFromTachyEntries(dbClient, conducteurId) {
  const { data, error } = await dbClient
    .from('tachygraphe_entrees')
    .select('type_activite, duree_minutes, date_debut')
    .eq('conducteur_id', conducteurId)
    .order('date_debut', { ascending: false })
    .limit(400)

  if (error) return null

  const now = Date.now()
  const dayThreshold = now - 24 * 60 * 60 * 1000
  const weekThreshold = now - 7 * 24 * 60 * 60 * 1000
  let dailyDriveMinutes = 0
  let weeklyDriveMinutes = 0
  let lastStatus = 'unknown'
  let lastActivityAt = null

  for (const row of (data ?? [])) {
    const duration = Number(row.duree_minutes ?? 0)
    const startedAt = new Date(row.date_debut).getTime()
    const type = row.type_activite
    if (!lastActivityAt) {
      lastActivityAt = row.date_debut
      if (type === 'conduite') lastStatus = 'drive'
      else if (type === 'repos') lastStatus = 'rest'
      else if (type === 'disponibilite') lastStatus = 'available'
      else lastStatus = 'work'
    }
    if (type === 'conduite') {
      if (startedAt >= dayThreshold) dailyDriveMinutes += duration
      if (startedAt >= weekThreshold) weeklyDriveMinutes += duration
    }
  }

  return {
    conducteur_id: conducteurId,
    activity_at: lastActivityAt ?? new Date().toISOString(),
    driver_status: lastStatus,
    daily_drive_minutes: dailyDriveMinutes,
    weekly_drive_minutes: weeklyDriveMinutes,
    driving_minutes_remaining: Math.max(0, 540 - dailyDriveMinutes),
    break_minutes_remaining: dailyDriveMinutes >= 270 ? 45 : 0,
    source: 'internal_tachy_entries',
  }
}

// NOTE SECURITE: systemClient pour erp_v11_driver_activity (table systeme).
// dbClient pour aggregateFromTachyEntries (tachygraphe_entrees - donnees metier, RLS actif).
async function resolveActivity(systemClient, dbClient, tenantKey, conducteurId) {
  const { data, error } = await systemClient
    .from('erp_v11_driver_activity')
    .select('*')
    .eq('tenant_key', tenantKey)
    .eq('conducteur_id', conducteurId)
    .order('activity_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!error && data) return data
  return aggregateFromTachyEntries(dbClient, conducteurId)
}

// NOTE SECURITE: utilise systemClient car loadProviders/logApiEvent/loadMappingRules/erp_v11_driver_activity sont tables systeme.
async function maybeEnrichWithProvider(systemClient, tenantKey, moduleConfig, conducteurId, fallbackPayload) {
  if (moduleConfig.mode === 'internal_only') return { activity: fallbackPayload, providerUsed: null }
  const providers = await loadProviders(systemClient, tenantKey, 'tachy')
  const provider = providers[0]
  if (!provider) return { activity: fallbackPayload, providerUsed: null }

  const providerResponse = await callProvider(provider, '/tachy/status', { conducteur_id: conducteurId })
  await logApiEvent(systemClient, {
    tenant_key: tenantKey,
    module_key: 'tachy',
    provider_key: provider.provider_key,
    status: providerResponse.ok ? 'ok' : 'error',
    http_status: providerResponse.status,
    latency_ms: providerResponse.latencyMs,
    request_payload: { conducteur_id: conducteurId },
    response_payload: providerResponse.data,
    error_message: providerResponse.error,
  })

  if (!providerResponse.ok || !providerResponse.data || typeof providerResponse.data !== 'object') {
    return { activity: fallbackPayload, providerUsed: null }
  }

  const rules = await loadMappingRules(systemClient, tenantKey, provider.provider_key, 'DrivingTimeStatus')
  const mapped = normalizeMapping(providerResponse.data, rules, {
    conducteur_id: conducteurId,
    driving_minutes_remaining: fallbackPayload.driving_minutes_remaining,
    break_minutes_remaining: fallbackPayload.break_minutes_remaining,
    daily_drive_minutes: fallbackPayload.daily_drive_minutes,
    weekly_drive_minutes: fallbackPayload.weekly_drive_minutes,
    activity_at: fallbackPayload.activity_at,
    driver_status: fallbackPayload.driver_status,
    source: provider.provider_key,
  })

  const next = {
    tenant_key: tenantKey,
    conducteur_id: conducteurId,
    activity_at: mapped.activity_at ?? new Date().toISOString(),
    driver_status: mapped.driver_status ?? fallbackPayload.driver_status ?? 'unknown',
    driving_minutes_remaining: Number(mapped.driving_minutes_remaining ?? fallbackPayload.driving_minutes_remaining ?? 0),
    break_minutes_remaining: Number(mapped.break_minutes_remaining ?? fallbackPayload.break_minutes_remaining ?? 0),
    daily_drive_minutes: Number(mapped.daily_drive_minutes ?? fallbackPayload.daily_drive_minutes ?? 0),
    weekly_drive_minutes: Number(mapped.weekly_drive_minutes ?? fallbackPayload.weekly_drive_minutes ?? 0),
    source: provider.provider_key,
    raw_payload: providerResponse.data,
  }

  await systemClient.from('erp_v11_driver_activity').insert(next)
  return { activity: next, providerUsed: provider.provider_key }
}

export async function handler(event) {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204 }
  const auth = await authorize(event, { allowedRoles: ALLOWED_ROLES })
  if (auth.error) return auth.error

  const body = parseJsonBody(event)
  if (body === null) return json(400, { error: 'Invalid JSON payload.' })

  const tenantKey = readTenantKey(event, body)
  const conducteurId = event.queryStringParameters?.conducteur_id ?? body.conducteur_id
  if (!conducteurId) return json(400, { error: 'conducteur_id is required.' })

  const action = (event.queryStringParameters?.action ?? body.action ?? 'status').toLowerCase()
  // NOTE SECURITE: moduleState/cache/enrichissement → systemClient (tables systeme).
  // tachygraphe_entrees (donnees metier) → dbClient via resolveActivity/aggregateFromTachyEntries (RLS actif).
  const moduleConfig = await moduleState(auth.systemClient, tenantKey, 'tachy')
  if (!moduleConfig.enabled) return json(423, { error: 'Tachy module disabled for tenant.' })

  const cacheKey = `tachy:${conducteurId}:${action}`
  const cacheResult = await readCache(auth.systemClient, tenantKey, cacheKey)
  if (cacheResult.hit) {
    return json(200, {
      tenant_key: tenantKey,
      source: 'cache',
      data: cacheResult.value,
    })
  }

  const fallbackActivity = await resolveActivity(auth.systemClient, auth.dbClient, tenantKey, conducteurId)
  if (!fallbackActivity) return json(404, { error: 'No activity found for conducteur.' })

  const enriched = await maybeEnrichWithProvider(auth.systemClient, tenantKey, moduleConfig, conducteurId, fallbackActivity)
  const activity = enriched.activity
  const driverStatus = buildDriverStatus(activity)
  const drivingTimeStatus = buildDrivingTimeStatus(activity)

  const payload = {
    DriverStatus: driverStatus,
    DrivingTimeStatus: drivingTimeStatus,
    provider: enriched.providerUsed,
    source: activity.source ?? 'internal',
  }

  const ttl = Math.max(15, Number(moduleConfig.refresh_interval_sec ?? 60))
  await writeCache(auth.systemClient, tenantKey, cacheKey, 'tachy', payload, ttl, Math.floor(ttl / 2), enriched.providerUsed ? 'provider' : 'internal')

  if (action === 'driving-time') {
    return json(200, {
      tenant_key: tenantKey,
      object: 'DrivingTimeStatus',
      data: drivingTimeStatus,
      provider: enriched.providerUsed,
    })
  }

  return json(200, {
    tenant_key: tenantKey,
    object: 'DriverStatus+DrivingTimeStatus',
    data: payload,
  })
}

