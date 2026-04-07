import {
  authorize,
  buildDriverStatus,
  buildDrivingTimeStatus,
  buildEtaPrediction,
  buildInternalRoutePlan,
  buildTrafficStatusFromRoute,
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

const ALLOWED_ROLES = ['admin', 'dirigeant', 'exploitant', 'conducteur', 'logisticien']

function normalizePoint(addressLike) {
  const latitude = Number(addressLike?.latitude)
  const longitude = Number(addressLike?.longitude)
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null
  return { latitude, longitude }
}

async function resolveMissionContext(dbClient, otId) {
  const { data: order, error: orderError } = await dbClient
    .from('ordres_transport')
    .select('id, vehicule_id, conducteur_id, date_livraison_prevue, statut_operationnel')
    .eq('id', otId)
    .maybeSingle()

  if (orderError || !order) return null

  const { data: steps } = await dbClient
    .from('etapes_mission')
    .select('ordre, adresses(latitude, longitude)')
    .eq('ot_id', otId)
    .order('ordre', { ascending: true })

  const points = (steps ?? [])
    .map(step => {
      const address = Array.isArray(step.adresses) ? step.adresses[0] : step.adresses
      return normalizePoint(address)
    })
    .filter(Boolean)

  if (points.length < 2) return { order, origin: null, destination: null }
  return { order, origin: points[0], destination: points[points.length - 1] }
}

// NOTE SECURITE: utilise systemClient car erp_v11_driver_activity est une table systeme.
async function resolveActivity(systemClient, tenantKey, conducteurId) {
  if (!conducteurId) return null
  const { data } = await systemClient
    .from('erp_v11_driver_activity')
    .select('*')
    .eq('tenant_key', tenantKey)
    .eq('conducteur_id', conducteurId)
    .order('activity_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  return data ?? null
}

// NOTE SECURITE: utilise systemClient car loadProviders/logApiEvent/loadMappingRules sont des tables systeme.
async function maybeEnrichWithProvider(systemClient, tenantKey, moduleConfig, payload, fallbackEta) {
  if (moduleConfig.mode === 'internal_only') return { eta: fallbackEta, providerUsed: null }

  const providers = await loadProviders(systemClient, tenantKey, 'eta')
  const provider = providers[0]
  if (!provider) return { eta: fallbackEta, providerUsed: null }

  const providerResponse = await callProvider(provider, '/eta/predict', payload)
  await logApiEvent(systemClient, {
    tenant_key: tenantKey,
    module_key: 'eta',
    provider_key: provider.provider_key,
    status: providerResponse.ok ? 'ok' : 'error',
    http_status: providerResponse.status,
    latency_ms: providerResponse.latencyMs,
    request_payload: payload,
    response_payload: providerResponse.data,
    error_message: providerResponse.error,
  })

  if (!providerResponse.ok || !providerResponse.data || typeof providerResponse.data !== 'object') {
    return { eta: fallbackEta, providerUsed: null }
  }

  const rules = await loadMappingRules(systemClient, tenantKey, provider.provider_key, 'EtaPrediction')
  const mapped = normalizeMapping(providerResponse.data, rules, {
    eta_at: fallbackEta.eta_at,
    duration_minutes: fallbackEta.duration_minutes,
    delay_minutes: fallbackEta.delay_minutes,
    confidence: fallbackEta.confidence,
    traffic_factor: fallbackEta.traffic_factor,
    break_factor: fallbackEta.break_factor,
    method: 'provider',
  })

  const eta = {
    eta_at: mapped.eta_at ?? fallbackEta.eta_at,
    duration_minutes: Number(mapped.duration_minutes ?? fallbackEta.duration_minutes),
    delay_minutes: Number(mapped.delay_minutes ?? fallbackEta.delay_minutes),
    confidence: Number(mapped.confidence ?? fallbackEta.confidence),
    traffic_factor: Number(mapped.traffic_factor ?? fallbackEta.traffic_factor),
    break_factor: Number(mapped.break_factor ?? fallbackEta.break_factor),
    method: moduleConfig.mode === 'hybrid' ? 'hybrid' : 'provider',
  }

  return { eta, providerUsed: provider.provider_key }
}

export async function handler(event) {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204 }
  const auth = await authorize(event, { allowedRoles: ALLOWED_ROLES })
  if (auth.error) return auth.error

  const body = parseJsonBody(event)
  if (body === null) return json(400, { error: 'Invalid JSON payload.' })

  const query = event.queryStringParameters ?? {}
  const tenantKey = readTenantKey(event, body)
  // NOTE SECURITE: tables systeme (moduleState, cache, eta_predictions) → systemClient.
  // Tables metier (ordres_transport, etapes_mission via resolveMissionContext) → dbClient (RLS actif).
  const moduleConfig = await moduleState(auth.systemClient, tenantKey, 'eta')
  if (!moduleConfig.enabled) return json(423, { error: 'ETA module disabled for tenant.' })

  const otId = query.ot_id ?? body.ot_id ?? null
  if (!otId) return json(400, { error: 'ot_id is required for ETA prediction.' })

  const cacheKey = `eta:${otId}`
  const cacheResult = await readCache(auth.systemClient, tenantKey, cacheKey)
  if (cacheResult.hit) {
    return json(200, {
      tenant_key: tenantKey,
      object: 'EtaPrediction',
      source: 'cache',
      data: cacheResult.value,
    })
  }

  const mission = await resolveMissionContext(auth.dbClient, otId)
  if (!mission?.order) return json(404, { error: 'Mission not found.' })
  if (!mission.origin || !mission.destination) {
    return json(422, { error: 'Mission has no valid geographic points for ETA.' })
  }

  const routePlan = buildInternalRoutePlan(mission.origin, mission.destination, [])
  const trafficStatus = buildTrafficStatusFromRoute(routePlan)
  const activity = await resolveActivity(auth.systemClient, tenantKey, mission.order.conducteur_id)
  const driverStatus = buildDriverStatus(activity)
  const drivingTimeStatus = buildDrivingTimeStatus(activity)
  const etaInternal = buildEtaPrediction(routePlan, trafficStatus, drivingTimeStatus)

  const providerPayload = {
    mission_id: otId,
    route_plan: routePlan,
    traffic_status: trafficStatus,
    driver_status: driverStatus,
    driving_time_status: drivingTimeStatus,
    planned_eta: mission.order.date_livraison_prevue,
  }

  const enriched = await maybeEnrichWithProvider(auth.systemClient, tenantKey, moduleConfig, providerPayload, etaInternal)
  const eta = enriched.eta

  await auth.systemClient.from('erp_v11_eta_predictions').insert({
    tenant_key: tenantKey,
    ot_id: otId,
    vehicle_id: mission.order.vehicule_id,
    prediction_at: new Date().toISOString(),
    eta_at: eta.eta_at,
    confidence: eta.confidence,
    delay_minutes: Math.round(eta.delay_minutes),
    method: eta.method,
    traffic_factor: eta.traffic_factor,
    break_factor: eta.break_factor,
    source_provider: enriched.providerUsed,
    details: {
      route_km: routePlan.distance_km,
      route_minutes: routePlan.duration_minutes,
      planned_eta: mission.order.date_livraison_prevue,
      driver_status: driverStatus,
      driving_time_status: drivingTimeStatus,
    },
  })

  const payload = {
    EtaPrediction: eta,
    RoutePlan: routePlan,
    TrafficStatus: trafficStatus,
    DriverStatus: driverStatus,
    DrivingTimeStatus: drivingTimeStatus,
    provider: enriched.providerUsed,
  }

  const ttl = Math.max(20, Number(moduleConfig.refresh_interval_sec ?? 60))
  await writeCache(auth.systemClient, tenantKey, cacheKey, 'eta', payload, ttl, Math.floor(ttl / 2), enriched.providerUsed ? 'provider' : 'internal')

  return json(200, {
    tenant_key: tenantKey,
    object: 'EtaPrediction',
    mode: moduleConfig.mode,
    data: payload,
  })
}

