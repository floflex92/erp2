import {
  authorize,
  json,
  parseJsonBody,
} from './_lib/v11-core.js'

const ALLOWED_ROLES = ['admin', 'dirigeant', 'exploitant', 'commercial', 'logisticien']
const WRITE_ROLES   = ['admin', 'dirigeant', 'exploitant', 'logisticien']
const DELETE_ROLES  = ['admin', 'dirigeant']

const VALID_TYPE_SITE  = new Set(['entrepot', 'depot', 'agence', 'client', 'quai', 'autre'])
const VALID_USAGE_TYPE = new Set(['chargement', 'livraison', 'mixte'])

// ── Sanitize ─────────────────────────────────────────────────────────────────

function sanitizeSite(body) {
  if (!body || typeof body !== 'object') return null
  const nom = typeof body.nom === 'string' ? body.nom.trim() : ''
  const adresse = typeof body.adresse === 'string' ? body.adresse.trim() : ''
  if (!nom || !adresse) return null

  const typeSite = VALID_TYPE_SITE.has(body.type_site) ? body.type_site : 'depot'
  const usageType = VALID_USAGE_TYPE.has(body.usage_type) ? body.usage_type : 'mixte'

  const lat = body.latitude !== undefined && body.latitude !== '' && body.latitude !== null
    ? Number(body.latitude) : null
  const lng = body.longitude !== undefined && body.longitude !== '' && body.longitude !== null
    ? Number(body.longitude) : null

  if (lat !== null && !Number.isFinite(lat)) return null
  if (lng !== null && !Number.isFinite(lng)) return null

  return {
    nom,
    adresse,
    type_site: typeSite,
    usage_type: usageType,
    code_postal:    typeof body.code_postal === 'string'   ? body.code_postal.trim()   || null : null,
    ville:          typeof body.ville === 'string'         ? body.ville.trim()         || null : null,
    pays:           typeof body.pays === 'string'          ? body.pays.trim()          || 'France' : 'France',
    contact_nom:    typeof body.contact_nom === 'string'   ? body.contact_nom.trim()   || null : null,
    contact_tel:    typeof body.contact_tel === 'string'   ? body.contact_tel.trim()   || null : null,
    horaires_ouverture: typeof body.horaires_ouverture === 'string' ? body.horaires_ouverture.trim() || null : null,
    jours_ouverture:    typeof body.jours_ouverture === 'string'    ? body.jours_ouverture.trim()    || null : null,
    notes_livraison:    typeof body.notes_livraison === 'string'    ? body.notes_livraison.trim()    || null : null,
    notes:              typeof body.notes === 'string'              ? body.notes.trim()              || null : null,
    entreprise_id:  typeof body.entreprise_id === 'string' ? body.entreprise_id.trim()  || null : null,
    est_depot_relais: typeof body.est_depot_relais === 'boolean' ? body.est_depot_relais : true,
    latitude: lat,
    longitude: lng,
  }
}

// ── Handlers ─────────────────────────────────────────────────────────────────

async function listSites(dbClient, params) {
  let query = dbClient
    .from('sites_logistiques')
    .select(`
      id, nom, adresse, code_postal, ville, pays,
      type_site, usage_type, est_depot_relais,
      contact_nom, contact_tel,
      horaires_ouverture, jours_ouverture, notes_livraison, notes,
      latitude, longitude, entreprise_id,
      created_at, updated_at,
      clients:entreprise_id ( id, nom )
    `)
    .order('nom', { ascending: true })

  if (params.entreprise_id) {
    query = query.eq('entreprise_id', params.entreprise_id)
  }
  if (params.type_site) {
    query = query.eq('type_site', params.type_site)
  }
  if (params.est_depot_relais === 'true') {
    query = query.eq('est_depot_relais', true)
  }

  const { data, error } = await query
  if (error) return json(500, { error: error.message })
  return json(200, { object: 'LogisticSiteList', data: data ?? [] })
}

async function getSite(dbClient, siteId) {
  if (!siteId) return json(400, { error: 'site_id requis.' })
  const { data, error } = await dbClient
    .from('sites_logistiques')
    .select(`
      id, nom, adresse, code_postal, ville, pays,
      type_site, usage_type, est_depot_relais,
      contact_nom, contact_tel,
      horaires_ouverture, jours_ouverture, notes_livraison, notes,
      latitude, longitude, entreprise_id,
      created_at, updated_at,
      clients:entreprise_id ( id, nom )
    `)
    .eq('id', siteId)
    .single()
  if (error) return json(error.code === 'PGRST116' ? 404 : 500, { error: error.message })
  return json(200, { object: 'LogisticSite', data })
}

async function createSite(dbClient, body, auth) {
  const sanitized = sanitizeSite(body)
  if (!sanitized) return json(400, { error: 'nom et adresse sont requis. Coordonnees invalides si fournies.' })

  const { data, error } = await dbClient
    .from('sites_logistiques')
    .insert(sanitized)
    .select('id, nom, adresse, code_postal, ville, type_site, usage_type, est_depot_relais, entreprise_id, created_at')
    .single()
  if (error) {
    if (error.code === '23505') return json(409, { error: 'Un site avec ce nom et cette adresse existe deja pour ce client.' })
    return json(500, { error: error.message })
  }
  return json(201, { object: 'LogisticSite', data })
}

async function updateSite(dbClient, siteId, body) {
  if (!siteId) return json(400, { error: 'site_id requis.' })
  const sanitized = sanitizeSite(body)
  if (!sanitized) return json(400, { error: 'nom et adresse sont requis.' })

  const { data, error } = await dbClient
    .from('sites_logistiques')
    .update({ ...sanitized, updated_at: new Date().toISOString() })
    .eq('id', siteId)
    .select('id, nom, adresse, code_postal, ville, type_site, usage_type, est_depot_relais, entreprise_id, updated_at')
    .single()
  if (error) return json(500, { error: error.message })
  if (!data) return json(404, { error: 'Site introuvable.' })
  return json(200, { object: 'LogisticSite', data })
}

async function deleteSite(dbClient, siteId) {
  if (!siteId) return json(400, { error: 'site_id requis.' })
  const { error } = await dbClient
    .from('sites_logistiques')
    .delete()
    .eq('id', siteId)
  if (error) return json(500, { error: error.message })
  return json(200, { deleted: true, site_id: siteId })
}

// ── Handler principal ─────────────────────────────────────────────────────────

export async function handler(event) {
  const { httpMethod: method, queryStringParameters: qs = {} } = event

  const auth = await authorize(event, ALLOWED_ROLES)
  if (auth.error) return json(auth.status ?? 401, { error: auth.error })

  const { dbClient } = auth

  if (method === 'GET') {
    if (qs.site_id) return getSite(dbClient, qs.site_id)
    return listSites(dbClient, qs)
  }

  if (!WRITE_ROLES.includes(auth.role)) return json(403, { error: 'Permission insuffisante.' })

  if (method === 'POST') {
    const body = await parseJsonBody(event)
    return createSite(dbClient, body, auth)
  }

  if (method === 'PUT') {
    const body = await parseJsonBody(event)
    return updateSite(dbClient, qs.site_id, body)
  }

  if (method === 'DELETE') {
    if (!DELETE_ROLES.includes(auth.role)) return json(403, { error: 'Seuls admin et dirigeant peuvent supprimer un site.' })
    return deleteSite(dbClient, qs.site_id)
  }

  return json(405, { error: 'Methode non supportee.' })
}
