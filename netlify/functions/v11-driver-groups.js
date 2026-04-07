import {
  authorize,
  json,
  parseJsonBody,
  readTenantKey,
} from './_lib/v11-core.js'

const ALLOWED_ROLES = ['admin', 'dirigeant', 'exploitant']
const WRITE_ROLES   = ['admin', 'dirigeant', 'exploitant']
const DELETE_ROLES  = ['admin', 'dirigeant']

// ── Helpers sanitize ─────────────────────────────────────────────────────────

function sanitizeGroup(body) {
  if (!body || typeof body !== 'object') return null
  const nom = typeof body.nom === 'string' ? body.nom.trim() : ''
  if (!nom) return null
  return {
    nom,
    description: typeof body.description === 'string' ? body.description.trim() : null,
    couleur: /^#[0-9a-fA-F]{6}$/.test(body.couleur ?? '') ? body.couleur : '#6366f1',
  }
}

// ── Groupes ──────────────────────────────────────────────────────────────────

async function listGroups(dbClient) {
  const { data, error } = await dbClient
    .from('driver_groups')
    .select('id, nom, description, couleur, created_at, updated_at')
    .order('nom', { ascending: true })
  if (error) return json(500, { error: error.message })
  return json(200, { object: 'DriverGroupList', data: data ?? [] })
}

async function createGroup(dbClient, body, auth) {
  const sanitized = sanitizeGroup(body)
  if (!sanitized) return json(400, { error: 'nom requis.' })
  const { data, error } = await dbClient
    .from('driver_groups')
    .insert({ ...sanitized, created_by: auth.user.id })
    .select('id, nom, description, couleur, created_at')
    .single()
  if (error) return json(500, { error: error.message })
  return json(201, { object: 'DriverGroup', data })
}

async function updateGroup(dbClient, groupId, body) {
  if (!groupId) return json(400, { error: 'group_id requis.' })
  const sanitized = sanitizeGroup(body)
  if (!sanitized) return json(400, { error: 'nom requis.' })
  const { data, error } = await dbClient
    .from('driver_groups')
    .update({ ...sanitized, updated_at: new Date().toISOString() })
    .eq('id', groupId)
    .select('id, nom, description, couleur, updated_at')
    .single()
  if (error) return json(500, { error: error.message })
  if (!data) return json(404, { error: 'Groupe introuvable.' })
  return json(200, { object: 'DriverGroup', data })
}

async function deleteGroup(dbClient, groupId) {
  if (!groupId) return json(400, { error: 'group_id requis.' })
  const { error } = await dbClient
    .from('driver_groups')
    .delete()
    .eq('id', groupId)
  if (error) return json(500, { error: error.message })
  return json(200, { deleted: true, group_id: groupId })
}

// ── Membres ───────────────────────────────────────────────────────────────────

async function listMembers(dbClient, groupId) {
  if (!groupId) return json(400, { error: 'group_id requis.' })
  const { data, error } = await dbClient
    .from('driver_group_members')
    .select(`
      id,
      conducteur_id,
      added_at,
      conducteurs ( id, nom, prenom, statut )
    `)
    .eq('group_id', groupId)
    .order('added_at', { ascending: true })
  if (error) return json(500, { error: error.message })
  return json(200, { object: 'DriverGroupMemberList', group_id: groupId, data: data ?? [] })
}

async function addMember(dbClient, groupId, body, auth) {
  if (!groupId) return json(400, { error: 'group_id requis.' })
  const conducteurId = typeof body?.conducteur_id === 'string' ? body.conducteur_id.trim() : ''
  if (!conducteurId) return json(400, { error: 'conducteur_id requis.' })
  const { data, error } = await dbClient
    .from('driver_group_members')
    .insert({ group_id: groupId, conducteur_id: conducteurId, added_by: auth.user.id })
    .select('id, group_id, conducteur_id, added_at')
    .single()
  if (error) {
    if (error.code === '23505') return json(409, { error: 'Conducteur deja dans ce groupe.' })
    return json(500, { error: error.message })
  }
  return json(201, { object: 'DriverGroupMember', data })
}

async function removeMember(dbClient, groupId, conducteurId) {
  if (!groupId || !conducteurId) return json(400, { error: 'group_id et conducteur_id requis.' })
  const { error } = await dbClient
    .from('driver_group_members')
    .delete()
    .eq('group_id', groupId)
    .eq('conducteur_id', conducteurId)
  if (error) return json(500, { error: error.message })
  return json(200, { deleted: true, group_id: groupId, conducteur_id: conducteurId })
}

// ── Handler principal ─────────────────────────────────────────────────────────

export async function handler(event) {
  const method = event.httpMethod
  const auth   = await authorize(event, ALLOWED_ROLES)
  if (!auth.ok) return json(auth.status ?? 401, { error: auth.error })

  await readTenantKey(event, auth)

  const body     = parseJsonBody(event)
  const path     = event.path ?? ''
  // /v11-driver-groups              → groups CRUD
  // /v11-driver-groups/members      → members CRUD
  const isMember = path.includes('/members')
  const groupId  =
    typeof event.queryStringParameters?.group_id === 'string'
      ? event.queryStringParameters.group_id
      : (body?.group_id ?? null)
  const conducteurId =
    typeof event.queryStringParameters?.conducteur_id === 'string'
      ? event.queryStringParameters.conducteur_id
      : (body?.conducteur_id ?? null)

  if (isMember) {
    if (method === 'GET')    return listMembers(auth.dbClient, groupId)
    if (method === 'POST')   {
      if (!WRITE_ROLES.includes(auth.profile.role)) return json(403, { error: 'Forbidden.' })
      return addMember(auth.dbClient, groupId, body, auth)
    }
    if (method === 'DELETE') {
      if (!WRITE_ROLES.includes(auth.profile.role)) return json(403, { error: 'Forbidden.' })
      return removeMember(auth.dbClient, groupId, conducteurId)
    }
    return json(405, { error: 'Method not allowed.' })
  }

  if (method === 'GET')    return listGroups(auth.dbClient)
  if (method === 'POST')   {
    if (!WRITE_ROLES.includes(auth.profile.role)) return json(403, { error: 'Forbidden.' })
    return createGroup(auth.dbClient, body, auth)
  }
  if (method === 'PUT')    {
    if (!WRITE_ROLES.includes(auth.profile.role)) return json(403, { error: 'Forbidden.' })
    return updateGroup(auth.dbClient, groupId, body)
  }
  if (method === 'DELETE') {
    if (!DELETE_ROLES.includes(auth.profile.role)) return json(403, { error: 'Forbidden.' })
    return deleteGroup(auth.dbClient, groupId)
  }

  return json(405, { error: 'Method not allowed.' })
}
