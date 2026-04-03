import crypto from 'node:crypto'
import {
  authorize,
  createPublicClient,
  createServiceClient,
  json,
  moduleState,
  parseJsonBody,
  readTenantKey,
} from './_lib/v11-core.js'

const ADMIN_ROLES = ['admin', 'dirigeant', 'exploitant', 'commercial']

async function readPortalByToken(dbClient, tenantKey, token) {
  const { data, error } = await dbClient
    .from('erp_v11_client_portal_access')
    .select('client_id, ot_id, expires_at, enabled')
    .eq('tenant_key', tenantKey)
    .eq('access_token', token)
    .maybeSingle()

  if (error || !data) return { error: 'Invalid portal token.' }
  if (!data.enabled) return { error: 'Portal token disabled.' }
  if (new Date(data.expires_at).getTime() <= Date.now()) return { error: 'Portal token expired.' }
  return { client_id: data.client_id, ot_id: data.ot_id }
}

// NOTE SECURITE: ordres_transport (metier) → dbClient (RLS actif).
// erp_v11_eta_predictions / erp_v11_vehicle_positions (systeme) → systemClient.
async function fetchTrackingPayload(dbClient, systemClient, tenantKey, clientId, otId) {
  const { data: order, error: orderError } = await dbClient
    .from('ordres_transport')
    .select('id, reference, client_id, vehicule_id, conducteur_id, statut, statut_operationnel, date_livraison_prevue')
    .eq('id', otId)
    .eq('client_id', clientId)
    .maybeSingle()

  if (orderError || !order) return { error: 'Mission not found for client.' }

  const [{ data: eta }, { data: position }] = await Promise.all([
    systemClient
      .from('erp_v11_eta_predictions')
      .select('eta_at, confidence, delay_minutes, prediction_at')
      .eq('tenant_key', tenantKey)
      .eq('ot_id', otId)
      .order('prediction_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    order.vehicule_id
        ? systemClient
          .from('erp_v11_vehicle_positions')
          .select('position_at, latitude, longitude, speed_kmh')
          .eq('tenant_key', tenantKey)
          .eq('vehicle_id', order.vehicule_id)
          .order('position_at', { ascending: false })
          .limit(1)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ])

  return {
    mission: order,
    tracking: position ?? null,
    eta: eta ?? null,
  }
}

async function grantPortalAccess(dbClient, tenantKey, authUserId, body) {
  if (typeof body.client_id !== 'string' || typeof body.ot_id !== 'string') {
    return json(400, { error: 'client_id and ot_id are required.' })
  }

  const expiresInHours = Number.isFinite(body.expires_in_hours) ? Math.max(1, Math.min(24 * 30, Math.floor(body.expires_in_hours))) : 72
  const token = crypto.randomBytes(24).toString('hex')
  const expiresAt = new Date(Date.now() + expiresInHours * 60 * 60 * 1000).toISOString()

  const { data, error } = await dbClient
    .from('erp_v11_client_portal_access')
    .insert({
      tenant_key: tenantKey,
      client_id: body.client_id,
      ot_id: body.ot_id,
      access_token: token,
      expires_at: expiresAt,
      enabled: true,
      created_by: authUserId,
    })
    .select('id, client_id, ot_id, access_token, expires_at, enabled')
    .single()

  if (error) return json(500, { error: error.message })
  return json(201, {
    tenant_key: tenantKey,
    access: data,
  })
}

export async function handler(event) {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204 }

  const body = parseJsonBody(event)
  if (body === null) return json(400, { error: 'Invalid JSON payload.' })
  const query = event.queryStringParameters ?? {}
  const tenantKey = readTenantKey(event, body)

  if (event.httpMethod === 'GET') {
    const token = query.token ?? body.token ?? null

    if (token) {
      const auth = await authorize(event, { allowedRoles: [] })
      const client = auth.error ? (createServiceClient() ?? createPublicClient()) : auth.dbClient
      if (!client) return json(500, { error: 'Unable to initialize Supabase client.' })

      const moduleConfig = await moduleState(client, tenantKey, 'client_portal')
      if (!moduleConfig.enabled) return json(423, { error: 'Client portal module disabled for tenant.' })

      const portal = await readPortalByToken(client, tenantKey, token)
      if (portal.error) return json(401, { error: portal.error })
      // Flux non authentifie (token public) : client = service role, valide car gated par readPortalByToken.
      const payload = await fetchTrackingPayload(client, client, tenantKey, portal.client_id, portal.ot_id)
      if (payload.error) return json(404, { error: payload.error })
      return json(200, {
        tenant_key: tenantKey,
        object: 'ClientPortalTracking',
        data: payload,
      })
    }

    const auth = await authorize(event, { allowedRoles: ADMIN_ROLES })
    if (auth.error) return auth.error
    // NOTE SECURITE: moduleState → systemClient. fetchTrackingPayload : ordres_transport via dbClient (RLS), infra via systemClient.
    const moduleConfig = await moduleState(auth.systemClient, tenantKey, 'client_portal')
    if (!moduleConfig.enabled) return json(423, { error: 'Client portal module disabled for tenant.' })

    const clientId = query.client_id ?? body.client_id
    const otId = query.ot_id ?? body.ot_id
    if (!clientId || !otId) return json(400, { error: 'client_id and ot_id are required when token is not provided.' })
    const payload = await fetchTrackingPayload(auth.dbClient, auth.systemClient, tenantKey, clientId, otId)
    if (payload.error) return json(404, { error: payload.error })
    return json(200, {
      tenant_key: tenantKey,
      object: 'ClientPortalTracking',
      data: payload,
    })
  }

  const auth = await authorize(event, { allowedRoles: ADMIN_ROLES })
  if (auth.error) return auth.error
  // NOTE SECURITE: erp_v11_client_portal_access (tokens admin) est une table systeme → systemClient.
  const moduleConfig = await moduleState(auth.systemClient, tenantKey, 'client_portal')
  if (!moduleConfig.enabled) return json(423, { error: 'Client portal module disabled for tenant.' })

  const action = (query.action ?? body.action ?? 'grant').toLowerCase()
  if (event.httpMethod === 'POST' && action === 'grant') {
    return grantPortalAccess(auth.systemClient, tenantKey, auth.user.id, body)
  }

  if (event.httpMethod === 'POST' && action === 'revoke') {
    if (typeof body.access_token !== 'string') return json(400, { error: 'access_token is required.' })
    const { error } = await auth.systemClient
      .from('erp_v11_client_portal_access')
      .update({ enabled: false, updated_at: new Date().toISOString() })
      .eq('tenant_key', tenantKey)
      .eq('access_token', body.access_token)
    if (error) return json(500, { error: error.message })
    return json(200, { ok: true })
  }

  return json(405, { error: 'Method not allowed.' })
}
