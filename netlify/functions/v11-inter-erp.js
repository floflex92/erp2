import crypto from 'node:crypto'
import {
  assertTenantContext,
  authorize,
  json,
  parseJsonBody,
} from './_lib/v11-core.js'

// Rôles autorisés à lire les canaux et messages inter-ERP
const ALLOWED_ROLES = [
  'admin', 'dirigeant', 'exploitant', 'commercial',
  'affreteur', 'logisticien', 'client',
]
// Rôles autorisés à écrire (créer canal, envoyer message, modifier statut)
const WRITE_ROLES = ['admin', 'dirigeant', 'exploitant', 'logisticien', 'commercial']

const VALID_STATUS = new Set(['connecte', 'degrade', 'hors_ligne'])

// ── Channels ──────────────────────────────────────────────────────────────────

async function listChannels(dbClient, companyId) {
  const { data, error } = await dbClient
    .from('inter_erp_channels')
    .select('id, partner_name, erp_code, status, last_sync_at, signed_webhook_enabled, created_at')
    .eq('company_id', companyId)
    .order('created_at', { ascending: false })
  if (error) return json(500, { error: error.message })
  return json(200, { object: 'InterErpChannelList', data: data ?? [] })
}

async function createChannel(dbClient, companyId, body) {
  if (!body || typeof body !== 'object') return json(400, { error: 'Corps requis.' })

  const partner_name = typeof body.partner_name === 'string' ? body.partner_name.trim() : ''
  const erp_code     = typeof body.erp_code     === 'string' ? body.erp_code.trim().toUpperCase() : ''
  if (!partner_name) return json(400, { error: 'partner_name requis.' })
  if (!erp_code)     return json(400, { error: 'erp_code requis.' })

  // Générer un secret webhook unique par canal (HMAC-SHA256)
  const webhook_secret = crypto.randomBytes(32).toString('hex')

  const { data, error } = await dbClient
    .from('inter_erp_channels')
    .insert({ company_id: companyId, partner_name, erp_code, webhook_secret })
    .select('id, partner_name, erp_code, status, last_sync_at, signed_webhook_enabled, created_at')
    .single()
  if (error) return json(500, { error: error.message })
  return json(201, { object: 'InterErpChannel', data })
}

async function patchChannel(dbClient, companyId, channelId, body) {
  if (!channelId) return json(400, { error: 'channel_id requis.' })
  if (!body || typeof body !== 'object') return json(400, { error: 'Corps requis.' })

  const update = {}
  if (body.status !== undefined) {
    if (!VALID_STATUS.has(body.status)) return json(400, { error: 'status invalide.' })
    update.status = body.status
  }
  if (body.signed_webhook_enabled !== undefined) {
    update.signed_webhook_enabled = Boolean(body.signed_webhook_enabled)
  }
  if (Object.keys(update).length === 0) return json(400, { error: 'Aucun champ a mettre a jour.' })

  const { data, error } = await dbClient
    .from('inter_erp_channels')
    .update(update)
    .eq('company_id', companyId)
    .eq('id', channelId)
    .select('id, partner_name, erp_code, status, last_sync_at, signed_webhook_enabled, created_at')
    .single()
  if (error) return json(error.code === 'PGRST116' ? 404 : 500, { error: error.message })
  return json(200, { object: 'InterErpChannel', data })
}

// ── Messages ──────────────────────────────────────────────────────────────────

async function listMessages(dbClient, companyId, channelId) {
  if (!channelId) return json(400, { error: 'channel_id requis.' })

  const { data, error } = await dbClient
    .from('inter_erp_messages')
    .select('id, channel_id, direction, transport_ref, body, author, created_at')
    .eq('company_id', companyId)
    .eq('channel_id', channelId)
    .order('created_at', { ascending: true })
    .limit(200)
  if (error) return json(500, { error: error.message })
  return json(200, { object: 'InterErpMessageList', data: data ?? [] })
}

async function sendMessage(dbClient, companyId, body) {
  if (!body || typeof body !== 'object') return json(400, { error: 'Corps requis.' })

  const channel_id    = typeof body.channel_id    === 'string' ? body.channel_id.trim()    : ''
  const transport_ref = typeof body.transport_ref === 'string' ? body.transport_ref.trim().toUpperCase() : ''
  const msgBody       = typeof body.body          === 'string' ? body.body.trim()          : ''

  if (!channel_id)    return json(400, { error: 'channel_id requis.' })
  if (!transport_ref) return json(400, { error: 'transport_ref requis.' })
  if (!msgBody)       return json(400, { error: 'body requis.' })

  // Vérifier que le canal appartient à la company
  const { data: channel, error: chErr } = await dbClient
    .from('inter_erp_channels')
    .select('id, partner_name, erp_code')
    .eq('company_id', companyId)
    .eq('id', channel_id)
    .single()
  if (chErr || !channel) return json(404, { error: 'Canal introuvable.' })

  const { data: sent, error: sendErr } = await dbClient
    .from('inter_erp_messages')
    .insert({ company_id: companyId, channel_id, direction: 'sortant', transport_ref, body: msgBody, author: 'NEXORA Truck' })
    .select('id, channel_id, direction, transport_ref, body, author, created_at')
    .single()
  if (sendErr) return json(500, { error: sendErr.message })

  // Simuler un accusé de réception du partenaire (sera remplacé par un vrai webhook en prod)
  await dbClient.from('inter_erp_messages').insert({
    company_id:    companyId,
    channel_id,
    direction:     'entrant',
    transport_ref,
    body:          `Accusé de réception (${channel.erp_code}). Message traité côté partenaire.`,
    author:        channel.partner_name,
  })

  return json(201, { object: 'InterErpMessage', data: sent })
}

// ── Handler principal ─────────────────────────────────────────────────────────

export async function handler(event) {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204 }

  const auth = await authorize(event, { allowedRoles: ALLOWED_ROLES })
  if (auth.error) return auth.error

  const tenantGuard = assertTenantContext(auth.companyId)
  if (!tenantGuard.ok) return tenantGuard.error

  const { dbClient, companyId } = auth
  const method  = event.httpMethod
  const qs      = event.queryStringParameters ?? {}
  const resource = qs.resource ?? 'channels'

  if (resource === 'channels') {
    if (method === 'GET')  return listChannels(dbClient, companyId)
    if (!WRITE_ROLES.includes(auth.profile.role)) return json(403, { error: 'Permission insuffisante.' })
    if (method === 'POST')  return createChannel(dbClient, companyId, parseJsonBody(event))
    if (method === 'PATCH') return patchChannel(dbClient, companyId, qs.channel_id, parseJsonBody(event))
  }

  if (resource === 'messages') {
    if (method === 'GET')  return listMessages(dbClient, companyId, qs.channel_id)
    if (!WRITE_ROLES.includes(auth.profile.role)) return json(403, { error: 'Permission insuffisante.' })
    if (method === 'POST') return sendMessage(dbClient, companyId, parseJsonBody(event))
  }

  return json(405, { error: 'Methode ou ressource non supportee.' })
}
