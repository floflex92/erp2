import crypto from 'node:crypto'
import {
  authorize,
  json,
  moduleState,
  parseJsonBody,
  readTenantKey,
} from './_lib/v11-core.js'

const ALLOWED_ROLES = ['admin', 'dirigeant', 'exploitant', 'conducteur']

async function resolveConducteurId(dbClient, body, auth) {
  if (typeof body.conducteur_id === 'string' && body.conducteur_id.trim()) {
    return body.conducteur_id
  }

  if (auth.user?.email) {
    const { data } = await dbClient
      .from('conducteurs')
      .select('id')
      .eq('email', auth.user.email)
      .maybeSingle()
    if (data?.id) return data.id
  }

  return null
}

async function openSession(dbClient, tenantKey, auth, body) {
  const conducteurId = await resolveConducteurId(dbClient, body, auth)
  if (!conducteurId) return json(400, { error: 'conducteur_id is required to open a driver session.' })

  const token = crypto.randomBytes(24).toString('hex')
  const payload = {
    tenant_key: tenantKey,
    conducteur_id: conducteurId,
    session_token: token,
    status: 'active',
    started_at: new Date().toISOString(),
    last_seen_at: new Date().toISOString(),
    device_info: body.device_info && typeof body.device_info === 'object' ? body.device_info : {},
    created_by: auth.user.id,
  }

  const { data, error } = await dbClient
    .from('erp_v11_driver_sessions')
    .insert(payload)
    .select('id, conducteur_id, session_token, status, started_at, last_seen_at')
    .single()

  if (error) return json(500, { error: error.message })
  return json(201, { tenant_key: tenantKey, session: data })
}

// NOTE SECURITE: pour le role conducteur, restreint les actions au user ayant cree la session.
// Les autres roles (exploitant, admin...) peuvent agir sur n'importe quelle session.
function applySessionOwnershipFilter(query, auth) {
  if (auth.profile.role === 'conducteur') {
    return query.eq('created_by', auth.user.id)
  }
  return query
}

async function heartbeat(dbClient, tenantKey, body, auth) {
  const token = typeof body.session_token === 'string' ? body.session_token : null
  if (!token) return json(400, { error: 'session_token is required.' })

  let query = dbClient
    .from('erp_v11_driver_sessions')
    .update({ last_seen_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq('tenant_key', tenantKey)
    .eq('session_token', token)
    .eq('status', 'active')
    .select('id, conducteur_id, status, started_at, last_seen_at')

  query = applySessionOwnershipFilter(query, auth)

  const { data, error } = await query.maybeSingle()
  if (error) return json(500, { error: error.message })
  if (!data) return json(404, { error: 'Session not found or inactive.' })
  return json(200, { tenant_key: tenantKey, session: data })
}

async function closeSession(dbClient, tenantKey, body, auth) {
  const token = typeof body.session_token === 'string' ? body.session_token : null
  if (!token) return json(400, { error: 'session_token is required.' })

  let query = dbClient
    .from('erp_v11_driver_sessions')
    .update({
      status: 'closed',
      ended_at: new Date().toISOString(),
      last_seen_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('tenant_key', tenantKey)
    .eq('session_token', token)
    .select('id, conducteur_id, status, started_at, ended_at')

  query = applySessionOwnershipFilter(query, auth)

  const { data, error } = await query.maybeSingle()
  if (error) return json(500, { error: error.message })
  if (!data) return json(404, { error: 'Session not found.' })
  return json(200, { tenant_key: tenantKey, session: data })
}

async function listMissions(dbClient, tenantKey, auth, query, body) {
  const requestedConducteurId = query.conducteur_id ?? body.conducteur_id ?? null
  const ownConducteurId = await resolveConducteurId(dbClient, body, auth)
  const conducteurId = auth.profile.role === 'conducteur'
    ? ownConducteurId
    : (requestedConducteurId ?? ownConducteurId)
  if (!conducteurId) return json(400, { error: 'conducteur_id is required.' })

  const { data, error } = await dbClient
    .from('ordres_transport')
    .select('id, reference, statut, statut_transport, statut_operationnel, date_chargement_prevue, date_livraison_prevue, vehicule_id, client_id')
    .eq('conducteur_id', conducteurId)
    .not('statut_transport', 'in', '("termine","annule")')
    .order('updated_at', { ascending: false })
    .limit(100)

  if (error) return json(500, { error: error.message })

  return json(200, {
    tenant_key: tenantKey,
    conducteur_id: conducteurId,
    missions: data ?? [],
  })
}

export async function handler(event) {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204 }
  const auth = await authorize(event, { allowedRoles: ALLOWED_ROLES })
  if (auth.error) return auth.error

  const body = parseJsonBody(event)
  if (body === null) return json(400, { error: 'Invalid JSON payload.' })

  const query = event.queryStringParameters ?? {}
  const tenantKey = readTenantKey(event, body)
  // NOTE SECURITE: moduleState lit erp_v11_modules (table systeme) → systemClient.
  // Toutes les requetes metier (conducteur_sessions, ordres_transport) utilisent dbClient (RLS actif).
  const moduleConfig = await moduleState(auth.systemClient, tenantKey, 'driver_session')
  if (!moduleConfig.enabled) return json(423, { error: 'Driver session module disabled for tenant.' })

  const action = (query.action ?? body.action ?? (event.httpMethod === 'GET' ? 'missions' : 'open')).toLowerCase()

  if (event.httpMethod === 'GET') {
    if (action === 'missions') return listMissions(auth.dbClient, tenantKey, auth, query, body)
    if (action === 'sessions') {
      let sessionsQuery = auth.dbClient
        .from('erp_v11_driver_sessions')
        .select('id, conducteur_id, status, started_at, ended_at, last_seen_at')
        .eq('tenant_key', tenantKey)
        .order('started_at', { ascending: false })
        .limit(200)

      sessionsQuery = applySessionOwnershipFilter(sessionsQuery, auth)

      const { data, error } = await sessionsQuery
      if (error) return json(500, { error: error.message })
      return json(200, { tenant_key: tenantKey, sessions: data ?? [] })
    }
    return json(400, { error: 'Unsupported GET action.' })
  }

  if (event.httpMethod === 'POST') {
    if (action === 'open') return openSession(auth.dbClient, tenantKey, auth, body)
    if (action === 'heartbeat') return heartbeat(auth.dbClient, tenantKey, body, auth)
    if (action === 'close') return closeSession(auth.dbClient, tenantKey, body, auth)
    return json(400, { error: 'Unsupported POST action.' })
  }

  return json(405, { error: 'Method not allowed.' })
}

