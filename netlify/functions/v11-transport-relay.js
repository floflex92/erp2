import {
  authorize,
  json,
  parseJsonBody,
} from './_lib/v11-core.js'

const ALLOWED_ROLES = ['admin', 'dirigeant', 'exploitant', 'conducteur', 'logisticien']
const WRITE_ROLES   = ['admin', 'dirigeant', 'exploitant', 'logisticien']

const VALID_TYPE_RELAIS = new Set(['depot_marchandise', 'relais_conducteur'])
const VALID_STATUTS     = new Set(['en_attente', 'assigne', 'en_cours_reprise', 'termine', 'annule'])

// ── Helpers ───────────────────────────────────────────────────────────────────

const RELAIS_SELECT = `
  id, ot_id, type_relais, statut, notes,
  site_id, lieu_nom, lieu_adresse, lieu_lat, lieu_lng,
  conducteur_depose_id, vehicule_depose_id, remorque_depose_id, date_depot,
  conducteur_reprise_id, vehicule_reprise_id, remorque_reprise_id,
  date_reprise_prevue, date_reprise_reelle,
  created_by, created_at, updated_at,
  ordres_transport:ot_id ( id, reference, client_nom, statut, statut_operationnel, vehicule_id, conducteur_id ),
  site:site_id ( id, nom, adresse, ville, code_postal, latitude, longitude ),
  conducteur_depose:conducteur_depose_id ( id, nom, prenom ),
  vehicule_depose:vehicule_depose_id ( id, immatriculation, modele ),
  conducteur_reprise:conducteur_reprise_id ( id, nom, prenom ),
  vehicule_reprise:vehicule_reprise_id ( id, immatriculation, modele ),
  remorque_reprise:remorque_reprise_id ( id, immatriculation )
`

// ── Handlers ──────────────────────────────────────────────────────────────────

async function listRelais(dbClient, params) {
  let query = dbClient
    .from('transport_relais')
    .select(RELAIS_SELECT)
    .order('created_at', { ascending: false })

  if (params.ot_id) {
    query = query.eq('ot_id', params.ot_id)
  }
  if (params.site_id) {
    query = query.eq('site_id', params.site_id)
  }
  if (params.statut) {
    query = query.eq('statut', params.statut)
  }
  if (params.type_relais) {
    query = query.eq('type_relais', params.type_relais)
  }
  // Par defaut: exclure les termines/annules sauf si demande explicite
  if (!params.statut && params.actifs !== 'false') {
    query = query.in('statut', ['en_attente', 'assigne', 'en_cours_reprise'])
  }

  const { data, error } = await query
  if (error) return json(500, { error: error.message })
  return json(200, { object: 'TransportRelaisList', data: data ?? [] })
}

async function getRelais(dbClient, relaisId) {
  if (!relaisId) return json(400, { error: 'relais_id requis.' })
  const { data, error } = await dbClient
    .from('transport_relais')
    .select(RELAIS_SELECT)
    .eq('id', relaisId)
    .single()
  if (error) return json(error.code === 'PGRST116' ? 404 : 500, { error: error.message })
  return json(200, { object: 'TransportRelais', data })
}

// POST /deposit — creer un relais (depot ou relais conducteur)
async function createDeposit(dbClient, body, auth) {
  if (!body || typeof body !== 'object') return json(400, { error: 'Corps requis.' })

  const ot_id = typeof body.ot_id === 'string' ? body.ot_id.trim() : ''
  if (!ot_id) return json(400, { error: 'ot_id requis.' })

  const type_relais = VALID_TYPE_RELAIS.has(body.type_relais) ? body.type_relais : 'depot_marchandise'
  const lieu_nom = typeof body.lieu_nom === 'string' ? body.lieu_nom.trim() : ''
  if (!lieu_nom) return json(400, { error: 'lieu_nom requis.' })

  const payload = {
    ot_id,
    type_relais,
    lieu_nom,
    lieu_adresse:         typeof body.lieu_adresse === 'string'  ? body.lieu_adresse.trim()  || null : null,
    lieu_lat:             body.lieu_lat  != null ? Number(body.lieu_lat)  : null,
    lieu_lng:             body.lieu_lng  != null ? Number(body.lieu_lng)  : null,
    site_id:              typeof body.site_id === 'string'       ? body.site_id.trim()       || null : null,
    conducteur_depose_id: typeof body.conducteur_depose_id === 'string' ? body.conducteur_depose_id.trim() || null : null,
    vehicule_depose_id:   typeof body.vehicule_depose_id === 'string'   ? body.vehicule_depose_id.trim()   || null : null,
    remorque_depose_id:   typeof body.remorque_depose_id === 'string'   ? body.remorque_depose_id.trim()   || null : null,
    date_depot:           typeof body.date_depot === 'string'            ? body.date_depot                  : new Date().toISOString(),
    notes:                typeof body.notes === 'string'                 ? body.notes.trim()                || null : null,
    statut:               'en_attente',
    created_by:            auth.user.id,
  }

  if (payload.lieu_lat !== null && !Number.isFinite(payload.lieu_lat)) return json(400, { error: 'lieu_lat invalide.' })
  if (payload.lieu_lng !== null && !Number.isFinite(payload.lieu_lng)) return json(400, { error: 'lieu_lng invalide.' })

  const { data, error } = await dbClient
    .from('transport_relais')
    .insert(payload)
    .select(RELAIS_SELECT)
    .single()
  if (error) return json(500, { error: error.message })
  return json(201, { object: 'TransportRelais', data })
}

// PUT /assign — affecter un conducteur + vehicule pour la reprise
async function assignReprise(dbClient, relaisId, body) {
  if (!relaisId) return json(400, { error: 'relais_id requis.' })
  if (!body || typeof body !== 'object') return json(400, { error: 'Corps requis.' })

  const conducteur_reprise_id = typeof body.conducteur_reprise_id === 'string' ? body.conducteur_reprise_id.trim() || null : null
  const vehicule_reprise_id   = typeof body.vehicule_reprise_id === 'string'   ? body.vehicule_reprise_id.trim()   || null : null

  const update = {
    conducteur_reprise_id,
    vehicule_reprise_id,
    remorque_reprise_id:  typeof body.remorque_reprise_id === 'string' ? body.remorque_reprise_id.trim() || null : null,
    date_reprise_prevue:  typeof body.date_reprise_prevue === 'string' ? body.date_reprise_prevue || null : null,
    notes:                typeof body.notes === 'string'               ? body.notes.trim()        || null : undefined,
    statut:               conducteur_reprise_id ? 'assigne' : 'en_attente',
    updated_at:           new Date().toISOString(),
  }

  // Supprimer la cle notes si elle est undefined (pas de mise a jour)
  if (update.notes === undefined) delete update.notes

  const { data, error } = await dbClient
    .from('transport_relais')
    .update(update)
    .eq('id', relaisId)
    .select(RELAIS_SELECT)
    .single()
  if (error) return json(500, { error: error.message })
  if (!data) return json(404, { error: 'Relais introuvable.' })
  return json(200, { object: 'TransportRelais', data })
}

// PATCH /status — changer le statut
async function updateStatut(dbClient, relaisId, body) {
  if (!relaisId) return json(400, { error: 'relais_id requis.' })
  const statut = body?.statut
  if (!VALID_STATUTS.has(statut)) return json(400, { error: `statut invalide. Values: ${[...VALID_STATUTS].join(', ')}` })

  const update = { statut, updated_at: new Date().toISOString() }
  if (statut === 'en_cours_reprise' || statut === 'termine') {
    update.date_reprise_reelle = new Date().toISOString()
  }

  const { data, error } = await dbClient
    .from('transport_relais')
    .update(update)
    .eq('id', relaisId)
    .select(RELAIS_SELECT)
    .single()
  if (error) return json(500, { error: error.message })
  if (!data) return json(404, { error: 'Relais introuvable.' })
  return json(200, { object: 'TransportRelais', data })
}

// ── Handler principal ─────────────────────────────────────────────────────────

export async function handler(event) {
  const { httpMethod: method, queryStringParameters: qs = {}, path } = event

  const auth = await authorize(event, ALLOWED_ROLES)
  if (auth.error) return json(auth.status ?? 401, { error: auth.error })

  const { dbClient } = auth

  // Routage par sous-chemin
  const subPath = path?.split('/v11-transport-relay').pop() ?? ''

  if (method === 'GET') {
    if (qs.relais_id) return getRelais(dbClient, qs.relais_id)
    return listRelais(dbClient, qs)
  }

  if (!WRITE_ROLES.includes(auth.role)) return json(403, { error: 'Permission insuffisante.' })

  if (method === 'POST') {
    // POST /deposit ou POST standard
    const body = await parseJsonBody(event)
    return createDeposit(dbClient, body, auth)
  }

  if (method === 'PUT') {
    // PUT ?relais_id=... /assign
    const body = await parseJsonBody(event)
    if (subPath.includes('/assign') || qs.action === 'assign') {
      return assignReprise(dbClient, qs.relais_id, body)
    }
    return assignReprise(dbClient, qs.relais_id, body)
  }

  if (method === 'PATCH') {
    const body = await parseJsonBody(event)
    return updateStatut(dbClient, qs.relais_id, body)
  }

  if (method === 'DELETE') {
    if (!['admin', 'dirigeant'].includes(auth.role)) return json(403, { error: 'Seuls admin et dirigeant peuvent supprimer un relais.' })
    const { error } = await dbClient
      .from('transport_relais')
      .delete()
      .eq('id', qs.relais_id)
    if (error) return json(500, { error: error.message })
    return json(200, { deleted: true, relais_id: qs.relais_id })
  }

  return json(405, { error: 'Methode non supportee.' })
}
