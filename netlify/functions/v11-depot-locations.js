import {
  assertTenantContext,
  authorize,
  json,
  parseJsonBody,
} from './_lib/v11-core.js'

const ALLOWED_ROLES = ['admin', 'super_admin', 'dirigeant', 'exploitant', 'logisticien', 'flotte', 'maintenance', 'conducteur']
const WRITE_ROLES = ['admin', 'super_admin', 'dirigeant', 'exploitant', 'logisticien', 'flotte']

const VALID_LOCATION_TYPES = new Set([
  'stockage',
  'quai_chargement',
  'quai_dechargement',
  'cross_dock',
  'tampon',
  'autre',
])

const LOCATION_SELECT = `
  id, company_id, depot_site_id,
  code, libelle, zone, allee, rayon, niveau, position,
  type_emplacement, capacite_m3, actif, notes,
  created_by, created_at, updated_at,
  depot:depot_site_id ( id, nom, type_site )
`

function sanitizeLocation(body) {
  if (!body || typeof body !== 'object') return null

  const code = typeof body.code === 'string' ? body.code.trim() : ''
  const depot_site_id = typeof body.depot_site_id === 'string' ? body.depot_site_id.trim() : ''
  if (!code || !depot_site_id) return null

  const typeRaw = typeof body.type_emplacement === 'string' ? body.type_emplacement : ''
  const type_emplacement = VALID_LOCATION_TYPES.has(typeRaw) ? typeRaw : 'stockage'

  const capacite_m3 = body.capacite_m3 === '' || body.capacite_m3 == null
    ? null
    : Number(body.capacite_m3)
  if (capacite_m3 !== null && !Number.isFinite(capacite_m3)) return null

  return {
    depot_site_id,
    code,
    libelle: typeof body.libelle === 'string' ? body.libelle.trim() || null : null,
    zone: typeof body.zone === 'string' ? body.zone.trim() || null : null,
    allee: typeof body.allee === 'string' ? body.allee.trim() || null : null,
    rayon: typeof body.rayon === 'string' ? body.rayon.trim() || null : null,
    niveau: typeof body.niveau === 'string' ? body.niveau.trim() || null : null,
    position: typeof body.position === 'string' ? body.position.trim() || null : null,
    type_emplacement,
    capacite_m3,
    actif: typeof body.actif === 'boolean' ? body.actif : true,
    notes: typeof body.notes === 'string' ? body.notes.trim() || null : null,
  }
}

async function listLocations(dbClient, companyId, params) {
  let query = dbClient
    .from('depot_locations')
    .select(LOCATION_SELECT)
    .eq('company_id', companyId)
    .order('code', { ascending: true })

  if (params.depot_site_id) query = query.eq('depot_site_id', params.depot_site_id)
  if (params.actif === 'true') query = query.eq('actif', true)
  if (params.actif === 'false') query = query.eq('actif', false)

  const { data, error } = await query
  if (error) {
    if (error.code === '42P01') return json(500, { error: 'La table depot_locations est absente. Applique la migration SQL des emplacements.' })
    return json(500, { error: error.message })
  }
  return json(200, { object: 'DepotLocationList', data: data ?? [] })
}

async function getLocation(dbClient, companyId, locationId) {
  if (!locationId) return json(400, { error: 'location_id requis.' })
  const { data, error } = await dbClient
    .from('depot_locations')
    .select(LOCATION_SELECT)
    .eq('company_id', companyId)
    .eq('id', locationId)
    .single()
  if (error) return json(error.code === 'PGRST116' ? 404 : 500, { error: error.message })
  return json(200, { object: 'DepotLocation', data })
}

async function createLocation(dbClient, companyId, body, auth) {
  const sanitized = sanitizeLocation(body)
  if (!sanitized) return json(400, { error: 'code et depot_site_id sont requis. Capacite invalide si fournie.' })

  const payload = {
    ...sanitized,
    company_id: companyId,
    created_by: auth.user.id,
  }

  const { data, error } = await dbClient
    .from('depot_locations')
    .insert(payload)
    .select(LOCATION_SELECT)
    .single()

  if (error) {
    if (error.code === '23505') return json(409, { error: 'Un emplacement avec ce code existe deja pour ce centre.' })
    if (error.code === '23503') return json(400, { error: 'Centre introuvable ou non autorise pour ce tenant.' })
    return json(500, { error: error.message })
  }

  return json(201, { object: 'DepotLocation', data })
}

async function updateLocation(dbClient, companyId, locationId, body) {
  if (!locationId) return json(400, { error: 'location_id requis.' })
  const sanitized = sanitizeLocation(body)
  if (!sanitized) return json(400, { error: 'code et depot_site_id sont requis. Capacite invalide si fournie.' })

  const { data, error } = await dbClient
    .from('depot_locations')
    .update({ ...sanitized, updated_at: new Date().toISOString() })
    .eq('company_id', companyId)
    .eq('id', locationId)
    .select(LOCATION_SELECT)
    .single()

  if (error) {
    if (error.code === '23505') return json(409, { error: 'Un emplacement avec ce code existe deja pour ce centre.' })
    return json(500, { error: error.message })
  }
  if (!data) return json(404, { error: 'Emplacement introuvable.' })
  return json(200, { object: 'DepotLocation', data })
}

async function deleteLocation(dbClient, companyId, locationId) {
  if (!locationId) return json(400, { error: 'location_id requis.' })

  const { error } = await dbClient
    .from('depot_locations')
    .delete()
    .eq('company_id', companyId)
    .eq('id', locationId)

  if (error) return json(500, { error: error.message })
  return json(200, { deleted: true, location_id: locationId })
}

export async function handler(event) {
  const { httpMethod: method, queryStringParameters: qs = {} } = event

  const auth = await authorize(event, { allowedRoles: ALLOWED_ROLES })
  if (auth.error) return auth.error

  const tenantGuard = assertTenantContext(auth.companyId)
  if (!tenantGuard.ok) return tenantGuard.error

  const { dbClient, companyId } = auth

  if (method === 'GET') {
    if (qs.location_id) return getLocation(dbClient, companyId, qs.location_id)
    return listLocations(dbClient, companyId, qs)
  }

  if (!WRITE_ROLES.includes(auth.profile.role)) return json(403, { error: 'Permission insuffisante.' })

  if (method === 'POST') {
    const body = parseJsonBody(event)
    return createLocation(dbClient, companyId, body, auth)
  }

  if (method === 'PUT') {
    const body = parseJsonBody(event)
    return updateLocation(dbClient, companyId, qs.location_id, body)
  }

  if (method === 'DELETE') {
    return deleteLocation(dbClient, companyId, qs.location_id)
  }

  return json(405, { error: 'Methode non supportee.' })
}
