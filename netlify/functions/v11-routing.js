import {
  authorize,
  buildInternalRoutePlan,
  buildTrafficStatusFromRoute,
  callProvider,
  hashPayload,
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
const ORS_PROVIDER_KEY = 'openrouteservice'
const ORS_DEFAULT_BASE_URL = 'https://api.openrouteservice.org'
const ORS_PROFILE_ALIASES = {
  car: 'driving-car',
  truck: 'driving-hgv',
  hgv: 'driving-hgv',
  bike: 'cycling-regular',
  bicycle: 'cycling-regular',
  walk: 'foot-walking',
  pedestrian: 'foot-walking',
}
const ORS_ALLOWED_PROFILES = new Set([
  'driving-car',
  'driving-hgv',
  'cycling-regular',
  'cycling-road',
  'cycling-mountain',
  'cycling-electric',
  'foot-walking',
  'foot-hiking',
  'wheelchair',
])

function normalizeOrsProfile(value) {
  if (typeof value !== 'string') return null
  const token = value.trim().toLowerCase()
  if (!token) return null
  const alias = ORS_PROFILE_ALIASES[token] ?? token
  return ORS_ALLOWED_PROFILES.has(alias) ? alias : null
}

function normalizePreference(value) {
  if (typeof value !== 'string') return 'recommended'
  const token = value.trim().toLowerCase()
  if (!token) return 'recommended'
  if (token === 'fastest') return 'fastest'
  if (token === 'shortest') return 'shortest'
  if (token === 'recommended') return 'recommended'
  return 'recommended'
}

function readOpenRouteServiceConfig(options) {
  const apiKey = (process.env.OPENROUTESERVICE_API_KEY ?? process.env.ORS_API_KEY ?? '').trim()
  if (!apiKey) return null

  const envProfile = normalizeOrsProfile(process.env.OPENROUTESERVICE_PROFILE ?? process.env.ORS_PROFILE)
  const requestedProfile = normalizeOrsProfile(options?.profile)
  const profile = requestedProfile ?? envProfile ?? 'driving-hgv'
  const baseUrl = (process.env.OPENROUTESERVICE_BASE_URL ?? process.env.ORS_BASE_URL ?? ORS_DEFAULT_BASE_URL)
    .trim()
    .replace(/\/+$/, '')

  return { apiKey, profile, baseUrl }
}

function toPoint(value, prefix) {
  if (!value || typeof value !== 'object') return null
  const latitude = Number(value.latitude ?? value.lat ?? value[`${prefix}_lat`])
  const longitude = Number(value.longitude ?? value.lng ?? value[`${prefix}_lng`])
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null
  return { latitude, longitude }
}

function readPointFromQuery(query, prefix) {
  const latitude = Number(query?.[`${prefix}_lat`])
  const longitude = Number(query?.[`${prefix}_lng`])
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null
  return { latitude, longitude }
}

function serializePoint(point) {
  return [Number(point.latitude.toFixed(6)), Number(point.longitude.toFixed(6))]
}

async function tryConfiguredProvider(dbClient, tenantKey, payload, fallbackRoute, fallbackTraffic) {
  const providers = await loadProviders(dbClient, tenantKey, 'routing')
  const provider = providers[0]
  if (!provider) return null

  const providerResponse = await callProvider(provider, '/routing/route', payload)
  await logApiEvent(dbClient, {
    tenant_key: tenantKey,
    module_key: 'routing',
    provider_key: provider.provider_key,
    status: providerResponse.ok ? 'ok' : 'error',
    http_status: providerResponse.status,
    latency_ms: providerResponse.latencyMs,
    request_payload: payload,
    response_payload: providerResponse.data,
    error_message: providerResponse.error,
  })

  if (!providerResponse.ok || !providerResponse.data || typeof providerResponse.data !== 'object') {
    return null
  }

  const routeRules = await loadMappingRules(dbClient, tenantKey, provider.provider_key, 'RoutePlan')
  const trafficRules = await loadMappingRules(dbClient, tenantKey, provider.provider_key, 'TrafficStatus')

  const mappedRoute = normalizeMapping(providerResponse.data, routeRules, {
    distance_km: fallbackRoute.distance_km,
    duration_minutes: fallbackRoute.duration_minutes,
    geometry: fallbackRoute.geometry,
    summary: fallbackRoute.summary,
  })

  const mappedTraffic = normalizeMapping(providerResponse.data, trafficRules, {
    level: fallbackTraffic.level,
    factor: fallbackTraffic.factor,
    delay_minutes: fallbackTraffic.delay_minutes,
    source: provider.provider_key,
  })

  return {
    routePlan: {
      distance_km: Number(mappedRoute.distance_km ?? fallbackRoute.distance_km),
      duration_minutes: Number(mappedRoute.duration_minutes ?? fallbackRoute.duration_minutes),
      geometry: Array.isArray(mappedRoute.geometry) ? mappedRoute.geometry : fallbackRoute.geometry,
      summary: mappedRoute.summary && typeof mappedRoute.summary === 'object'
        ? mappedRoute.summary
        : fallbackRoute.summary,
    },
    trafficStatus: {
      level: mappedTraffic.level ?? fallbackTraffic.level,
      factor: Number(mappedTraffic.factor ?? fallbackTraffic.factor),
      delay_minutes: Number(mappedTraffic.delay_minutes ?? fallbackTraffic.delay_minutes),
      source: provider.provider_key,
    },
    providerUsed: provider.provider_key,
  }
}

async function tryOpenRouteService(dbClient, tenantKey, payload, fallbackTraffic) {
  const config = readOpenRouteServiceConfig(payload.options)
  if (!config) return null

  const points = [payload.origin, ...(payload.waypoints ?? []), payload.destination]
    .filter(Boolean)
    .map(point => [Number(point.longitude), Number(point.latitude)])
  if (points.length < 2) return null

  const requestBody = {
    coordinates: points,
    preference: normalizePreference(payload.options?.preference),
    instructions: false,
    geometry_simplify: false,
    units: 'm',
  }

  const controller = new AbortController()
  const timeoutMs = 8000
  const start = Date.now()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  let status = 0
  let responsePayload = null
  let errorMessage = null
  let routePlan = null

  try {
    const response = await fetch(`${config.baseUrl}/v2/directions/${config.profile}/geojson`, {
      method: 'POST',
      headers: {
        Authorization: config.apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
      signal: controller.signal,
    })

    status = response.status
    const bodyText = await response.text()
    responsePayload = (() => {
      try {
        return JSON.parse(bodyText)
      } catch {
        return { raw: bodyText }
      }
    })()

    if (response.ok && responsePayload && typeof responsePayload === 'object') {
      const feature = Array.isArray(responsePayload.features) ? responsePayload.features[0] : null
      const coordinates = Array.isArray(feature?.geometry?.coordinates) ? feature.geometry.coordinates : []
      const summary = feature?.properties?.summary
      const distanceKm = Number(summary?.distance) / 1000
      const durationMinutes = Number(summary?.duration) / 60

      if (coordinates.length > 1 && Number.isFinite(distanceKm) && Number.isFinite(durationMinutes)) {
        routePlan = {
          distance_km: distanceKm,
          duration_minutes: durationMinutes,
          geometry: coordinates
            .filter(item => Array.isArray(item) && item.length >= 2)
            .map(item => [Number(item[1]), Number(item[0])]),
          summary: {
            source: ORS_PROVIDER_KEY,
            profile: config.profile,
            distance_m: Number(summary.distance),
            duration_s: Number(summary.duration),
            ...(feature?.properties && typeof feature.properties === 'object' ? feature.properties : {}),
          },
        }
      } else {
        errorMessage = 'OpenRouteService response missing route summary or geometry.'
      }
    } else {
      errorMessage = `OpenRouteService status ${response.status}`
    }
  } catch (error) {
    errorMessage = error instanceof Error ? error.message : 'OpenRouteService call failed'
  } finally {
    clearTimeout(timer)
  }

  await logApiEvent(dbClient, {
    tenant_key: tenantKey,
    module_key: 'routing',
    provider_key: ORS_PROVIDER_KEY,
    status: routePlan ? 'ok' : 'error',
    http_status: status,
    latency_ms: Date.now() - start,
    request_payload: {
      ...requestBody,
      profile: config.profile,
      coordinates_count: requestBody.coordinates.length,
    },
    response_payload: routePlan
      ? {
        profile: config.profile,
        distance_km: routePlan.distance_km,
        duration_minutes: routePlan.duration_minutes,
        points: routePlan.geometry.length,
      }
      : responsePayload,
    error_message: routePlan ? null : errorMessage,
  })

  if (!routePlan) return null

  return {
    routePlan,
    trafficStatus: {
      ...fallbackTraffic,
      source: ORS_PROVIDER_KEY,
    },
    providerUsed: ORS_PROVIDER_KEY,
  }
}

async function maybeEnrichWithProvider(dbClient, tenantKey, moduleConfig, payload, fallbackRoute, fallbackTraffic) {
  if (moduleConfig.mode === 'internal_only') {
    return { routePlan: fallbackRoute, trafficStatus: fallbackTraffic, providerUsed: null }
  }

  const configuredProvider = await tryConfiguredProvider(dbClient, tenantKey, payload, fallbackRoute, fallbackTraffic)
  if (configuredProvider) return configuredProvider

  const orsProvider = await tryOpenRouteService(dbClient, tenantKey, payload, fallbackTraffic)
  if (orsProvider) return orsProvider

  return { routePlan: fallbackRoute, trafficStatus: fallbackTraffic, providerUsed: null }
}

export async function handler(event) {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204 }
  const auth = await authorize(event, { allowedRoles: ALLOWED_ROLES })
  if (auth.error) return auth.error

  const body = parseJsonBody(event)
  if (body === null) return json(400, { error: 'Invalid JSON payload.' })

  const query = event.queryStringParameters ?? {}
  const tenantKey = readTenantKey(event, body)
  const moduleConfig = await moduleState(auth.dbClient, tenantKey, 'routing')
  if (!moduleConfig.enabled) return json(423, { error: 'Routing module disabled for tenant.' })

  const origin = toPoint(body.origin, 'origin') ?? readPointFromQuery(query, 'origin')
  const destination = toPoint(body.destination, 'destination') ?? readPointFromQuery(query, 'destination')
  if (!origin || !destination) {
    return json(400, { error: 'origin and destination coordinates are required.' })
  }

  const waypoints = Array.isArray(body.waypoints)
    ? body.waypoints.map(item => toPoint(item, '')).filter(Boolean)
    : []
  const routeOptions = typeof body.options === 'object' && body.options ? { ...body.options } : {}
  if (typeof body.profile === 'string' && body.profile.trim()) routeOptions.profile = body.profile.trim()
  if (!routeOptions.profile && typeof query.profile === 'string' && query.profile.trim()) {
    routeOptions.profile = query.profile.trim()
  }
  const cacheOptionsHash = hashPayload({
    profile: routeOptions.profile ?? null,
    preference: routeOptions.preference ?? null,
    waypoints: waypoints.length,
  }).slice(0, 10)

  const routeKey = `routing:${serializePoint(origin).join(',')}:${serializePoint(destination).join(',')}:${cacheOptionsHash}`
  const cacheResult = await readCache(auth.dbClient, tenantKey, routeKey)
  if (cacheResult.hit) {
    return json(200, {
      tenant_key: tenantKey,
      object: 'RoutePlan+TrafficStatus',
      source: 'cache',
      data: cacheResult.value,
    })
  }

  const internalRoute = buildInternalRoutePlan(origin, destination, waypoints)
  const internalTraffic = buildTrafficStatusFromRoute(internalRoute)

  const providerPayload = {
    origin,
    destination,
    waypoints,
    options: routeOptions,
  }

  const enriched = await maybeEnrichWithProvider(
    auth.dbClient,
    tenantKey,
    moduleConfig,
    providerPayload,
    internalRoute,
    internalTraffic,
  )

  const payload = {
    RoutePlan: {
      distance_km: Number(enriched.routePlan.distance_km.toFixed(1)),
      duration_minutes: Math.max(1, Math.round(enriched.routePlan.duration_minutes)),
      geometry: enriched.routePlan.geometry,
      summary: {
        ...(enriched.routePlan.summary ?? {}),
        mode: moduleConfig.mode,
      },
    },
    TrafficStatus: {
      level: enriched.trafficStatus.level,
      factor: Number(enriched.trafficStatus.factor),
      delay_minutes: Math.max(0, Math.round(enriched.trafficStatus.delay_minutes)),
      source: enriched.trafficStatus.source ?? 'internal',
    },
    provider: enriched.providerUsed,
  }

  const ttl = Math.max(30, Number(moduleConfig.refresh_interval_sec ?? 180))
  await writeCache(auth.dbClient, tenantKey, routeKey, 'routing', payload, ttl, Math.floor(ttl / 2), enriched.providerUsed ? 'provider' : 'internal')

  return json(200, {
    tenant_key: tenantKey,
    object: 'RoutePlan+TrafficStatus',
    mode: moduleConfig.mode,
    data: payload,
  })
}
