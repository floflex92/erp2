/**
 * inter-erp-webhook.js
 *
 * Endpoint PUBLIC pour recevoir les webhooks entrants des partenaires ERP.
 * Authentification par signature HMAC-SHA256 (pas de JWT Supabase requis).
 *
 * Protocole attendu du partenaire :
 *   POST /.netlify/functions/inter-erp-webhook
 *   Headers :
 *     X-Nexora-Channel-Id  : UUID du canal (récupéré lors de la création du canal)
 *     X-Nexora-Signature   : sha256=<HMAC-SHA256-hex du corps brut avec le webhook_secret du canal>
 *   Body JSON :
 *     { transport_ref, body, author? }
 */

import crypto from 'node:crypto'
import { createClient } from '@supabase/supabase-js'

const MAX_BODY_BYTES = 64 * 1024 // 64 KB

function jsonResp(statusCode, body) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
    },
    body: JSON.stringify(body),
  }
}

function getServiceClient() {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createClient(url, key, { auth: { persistSession: false } })
}

function verifyHmac(rawBody, secret, signatureHeader) {
  if (!signatureHeader || !signatureHeader.startsWith('sha256=')) return false
  const expected = 'sha256=' + crypto
    .createHmac('sha256', secret)
    .update(rawBody, 'utf8')
    .digest('hex')
  // Comparaison à temps constant pour éviter les timing attacks
  try {
    return crypto.timingSafeEqual(
      Buffer.from(signatureHeader),
      Buffer.from(expected),
    )
  } catch {
    return false
  }
}

export async function handler(event) {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204 }
  if (event.httpMethod !== 'POST') return jsonResp(405, { error: 'Seules les requêtes POST sont acceptées.' })

  const rawBody = event.body ?? ''
  if (rawBody.length > MAX_BODY_BYTES) return jsonResp(413, { error: 'Corps trop volumineux.' })

  const channelId  = event.headers['x-nexora-channel-id']  ?? event.headers['X-Nexora-Channel-Id']
  const sigHeader  = event.headers['x-nexora-signature']    ?? event.headers['X-Nexora-Signature']

  if (!channelId) return jsonResp(400, { error: 'X-Nexora-Channel-Id manquant.' })
  if (!sigHeader) return jsonResp(401, { error: 'X-Nexora-Signature manquant.' })

  let parsed
  try {
    parsed = JSON.parse(rawBody)
  } catch {
    return jsonResp(400, { error: 'Corps JSON invalide.' })
  }

  const transport_ref = typeof parsed.transport_ref === 'string' ? parsed.transport_ref.trim().toUpperCase() : ''
  const body          = typeof parsed.body          === 'string' ? parsed.body.trim() : ''
  const author        = typeof parsed.author        === 'string' ? parsed.author.trim() : 'Partenaire ERP'

  if (!transport_ref) return jsonResp(400, { error: 'transport_ref requis.' })
  if (!body)          return jsonResp(400, { error: 'body requis.' })
  if (transport_ref.length > 100) return jsonResp(400, { error: 'transport_ref trop long.' })
  if (body.length > 5000)         return jsonResp(400, { error: 'body trop long.' })

  const client = getServiceClient()
  if (!client) return jsonResp(500, { error: 'Erreur de configuration serveur.' })

  // Récupérer le canal + son secret (service_role bypasse RLS)
  const { data: channel, error: chErr } = await client
    .from('inter_erp_channels')
    .select('id, company_id, webhook_secret, signed_webhook_enabled, partner_name')
    .eq('id', channelId)
    .single()

  if (chErr || !channel) return jsonResp(404, { error: 'Canal introuvable.' })

  // Vérifier la signature HMAC si le webhook signé est activé sur ce canal
  if (channel.signed_webhook_enabled) {
    if (!channel.webhook_secret) return jsonResp(500, { error: 'Secret webhook non configuré.' })
    if (!verifyHmac(rawBody, channel.webhook_secret, sigHeader)) {
      return jsonResp(401, { error: 'Signature HMAC invalide.' })
    }
  }

  const { error: insertErr } = await client.from('inter_erp_messages').insert({
    company_id:    channel.company_id,
    channel_id:    channel.id,
    direction:     'entrant',
    transport_ref,
    body,
    author:        author || channel.partner_name,
  })

  if (insertErr) return jsonResp(500, { error: insertErr.message })

  return jsonResp(200, { received: true, channel_id: channel.id, transport_ref })
}
