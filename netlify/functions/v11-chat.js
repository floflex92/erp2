import {
  authorize,
  json,
  moduleState,
  parseJsonBody,
  readTenantKey,
} from './_lib/v11-core.js'

const ALLOWED_ROLES = ['admin', 'dirigeant', 'exploitant', 'conducteur', 'logisticien']

function inferSenderType(role) {
  if (role === 'conducteur') return 'conducteur'
  if (role === 'exploitant') return 'exploitant'
  return 'system'
}

function normalizeAttachments(attachments) {
  if (!Array.isArray(attachments)) return []
  return attachments
    .filter(item => item && typeof item === 'object')
    .map(item => ({
      name: typeof item.name === 'string' ? item.name : 'file',
      url: typeof item.url === 'string' ? item.url : null,
      mime_type: typeof item.mime_type === 'string' ? item.mime_type : 'application/octet-stream',
      size: Number.isFinite(item.size) ? Number(item.size) : null,
    }))
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
  // Les requetes metier (erp_v11_chat_messages) utilisent dbClient pour activer le RLS.
  const moduleConfig = await moduleState(auth.systemClient, tenantKey, 'chat')
  if (!moduleConfig.enabled) return json(423, { error: 'Chat module disabled for tenant.' })

  if (event.httpMethod === 'GET') {
    const channelKey = query.channel_key ?? body.channel_key ?? null
    const otId = query.ot_id ?? body.ot_id ?? null
    const conducteurId = query.conducteur_id ?? body.conducteur_id ?? null

    let dbQuery = auth.dbClient
      .from('erp_v11_chat_messages')
      .select('*')
      .eq('tenant_key', tenantKey)
      .order('created_at', { ascending: false })
      .limit(200)

    if (channelKey) dbQuery = dbQuery.eq('channel_key', channelKey)
    if (otId) dbQuery = dbQuery.eq('ot_id', otId)
    if (conducteurId) dbQuery = dbQuery.or(`sender_id.eq.${conducteurId},recipient_id.eq.${conducteurId}`)

    const { data, error } = await dbQuery
    if (error) return json(500, { error: error.message })

    return json(200, {
      tenant_key: tenantKey,
      object: 'ChatMessages',
      data: (data ?? []).reverse(),
    })
  }

  if (event.httpMethod === 'POST') {
    const channelKey = typeof body.channel_key === 'string' && body.channel_key.trim()
      ? body.channel_key.trim()
      : body.ot_id
        ? `ot:${body.ot_id}`
        : null

    if (!channelKey) return json(400, { error: 'channel_key (or ot_id) is required.' })
    if (typeof body.message !== 'string' || body.message.trim() === '') return json(400, { error: 'message is required.' })

    const senderType = typeof body.sender_type === 'string' ? body.sender_type : inferSenderType(auth.profile.role)
    const row = {
      tenant_key: tenantKey,
      channel_key: channelKey,
      sender_type: senderType,
      // NOTE SECURITE: sender_id est toujours l'utilisateur authentifie,
      // le body ne peut pas le surcharger pour eviter l'usurpation d'identite.
      sender_id: auth.profile.id,
      recipient_type: typeof body.recipient_type === 'string' ? body.recipient_type : null,
      recipient_id: typeof body.recipient_id === 'string' ? body.recipient_id : null,
      ot_id: typeof body.ot_id === 'string' ? body.ot_id : null,
      message: body.message.trim(),
      attachments: normalizeAttachments(body.attachments),
      delivered_at: null,
      read_at: null,
    }

    const { data, error } = await auth.dbClient
      .from('erp_v11_chat_messages')
      .insert(row)
      .select('*')
      .single()

    if (error) return json(500, { error: error.message })
    return json(201, { tenant_key: tenantKey, message: data })
  }

  if (event.httpMethod === 'PATCH') {
    if (typeof body.id !== 'string') return json(400, { error: 'id is required.' })
    const patch = {}
    if (body.delivered === true) patch.delivered_at = new Date().toISOString()
    if (body.read === true) patch.read_at = new Date().toISOString()
    if (Object.keys(patch).length === 0) return json(400, { error: 'No update specified.' })

    const { data, error } = await auth.dbClient
      .from('erp_v11_chat_messages')
      .update(patch)
      .eq('tenant_key', tenantKey)
      .eq('id', body.id)
      // NOTE SECURITE: seul l'expediteur ou le destinataire peut modifier le message
      .or(`sender_id.eq.${auth.profile.id},recipient_id.eq.${auth.profile.id}`)
      .select('*')
      .maybeSingle()

    if (error) return json(500, { error: error.message })
    if (!data) return json(404, { error: 'Message not found.' })
    return json(200, { tenant_key: tenantKey, message: data })
  }

  return json(405, { error: 'Method not allowed.' })
}

