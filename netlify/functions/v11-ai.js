import {
  authorize,
  hashPayload,
  json,
  moduleState,
  parseJsonBody,
  readCache,
  readTenantKey,
  writeCache,
} from './_lib/v11-core.js'
import { callAiProvider, loadAiSettings } from './_lib/v11-ai-provider.js'

const ALLOWED_ROLES = ['admin', 'dirigeant', 'exploitant', 'conducteur']

function buildInternalAnalysis(action, payload) {
  const eta = payload?.eta ?? payload?.EtaPrediction ?? {}
  const delayMinutes = Number(payload?.delay_minutes ?? eta.delay_minutes ?? 0)
  const confidence = Number(payload?.confidence ?? eta.confidence ?? 0)

  const recommendations = []
  if (delayMinutes >= 45) {
    recommendations.push('Informer le client immediatement et proposer un nouveau creneau.')
    recommendations.push('Reaffecter une ressource de secours sur la mission suivante.')
  } else if (delayMinutes >= 15) {
    recommendations.push('Mettre a jour ETA client et surveiller la congestion.')
  } else {
    recommendations.push('Maintenir le plan courant, aucun retard significatif detecte.')
  }

  if (confidence < 0.6) recommendations.push('Confiance faible: declencher un recalcul ETA dans 15 minutes.')

  if (action === 'assistant') {
    return {
      summary: 'Assistant exploitation (mode interne)',
      insights: [
        `Retard estime: ${Math.round(delayMinutes)} minute(s).`,
        `Confiance ETA: ${(confidence * 100).toFixed(0)}%.`,
      ],
      recommendations,
    }
  }

  if (action === 'explain_delay') {
    return {
      summary: `Retard estime de ${Math.round(delayMinutes)} minute(s).`,
      causes: [
        'Trafic routier et variabilite de vitesse.',
        'Contraintes de temps de conduite et pauses obligatoires.',
      ],
      recommendations,
    }
  }

  return {
    summary: 'Analyse ETA interne',
    delay_minutes: Math.round(delayMinutes),
    confidence,
    recommendations,
  }
}

// ── Prompt dédié au contexte ETA / assistant exploitation ────────────────────
function buildAiPrompt(action, payload) {
  return [
    `Tu es un copilote ERP pour l'exploitation transport.`,
    `Action: ${action}.`,
    `Réponds en JSON avec les clés: summary, risks, recommendations.`,
    `Données: ${JSON.stringify(payload)}`,
  ].join('\n')
}

function parsedOrFallback(text, fallback) {
  try {
    // Extraire le premier bloc JSON du texte (les modèles de raisonnement ajoutent parfois du texte avant)
    const match = text.match(/\{[\s\S]*\}/)
    return match ? JSON.parse(match[0]) : JSON.parse(text)
  } catch {
    return { summary: text, recommendations: fallback.recommendations ?? [] }
  }
}

// NOTE SECURITE: config_entreprise et erp_v11_ai_logs sont des tables systeme → systemClient.
async function insertAiLog(systemClient, tenantKey, payload) {
  try {
    await systemClient.from('erp_v11_ai_logs').insert({
      tenant_key: tenantKey,
      module_key: 'ai',
      context_type: payload.context_type,
      context_id: payload.context_id,
      prompt_hash: payload.prompt_hash,
      model: payload.model,
      request_payload: payload.request_payload,
      response_payload: payload.response_payload,
      tokens_in: payload.tokens_in ?? null,
      tokens_out: payload.tokens_out ?? null,
      cost_estimate: payload.cost_estimate ?? null,
    })
  } catch {
    // non-blocking logging
  }
}

export async function handler(event) {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204 }
  const auth = await authorize(event, { allowedRoles: ALLOWED_ROLES })
  if (auth.error) return auth.error

  if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed.' })

  const body = parseJsonBody(event)
  if (body === null) return json(400, { error: 'Invalid JSON payload.' })

  const tenantKey = readTenantKey(event, body)
  // NOTE SECURITE: toutes les tables de ce module sont systeme (config_entreprise, erp_v11_*) → systemClient.
  const moduleConfig = await moduleState(auth.systemClient, tenantKey, 'ai')
  if (!moduleConfig.enabled) return json(423, { error: 'AI module disabled for tenant.' })

  const action = String(body.action ?? 'analyse_eta').toLowerCase()
  const acceptedActions = new Set(['analyse_eta', 'explain_delay', 'assistant'])
  if (!acceptedActions.has(action)) return json(400, { error: 'Unsupported action.' })

  const payload = body.payload && typeof body.payload === 'object' ? body.payload : {}
  const promptHash = hashPayload({ action, payload })
  const cacheKey = `ai:${action}:${promptHash}`
  const aiSettings = await loadAiSettings(auth.systemClient)
  const cacheResult = await readCache(auth.systemClient, tenantKey, cacheKey)
  if (cacheResult.hit) {
    return json(200, {
      tenant_key: tenantKey,
      source: 'cache',
      data: cacheResult.value,
    })
  }

  const internal = buildInternalAnalysis(action, payload)
  const canCallProvider = aiSettings.enabled && moduleConfig.mode !== 'internal_only'

  let providerResult = { used: false, text: null, error: 'provider_disabled' }
  if (canCallProvider) {
    const raw = await callAiProvider(aiSettings, buildAiPrompt(action, payload))
    if (raw.used) {
      providerResult = { used: true, text: parsedOrFallback(raw.text, internal), error: null }
    } else {
      providerResult = raw
    }
  }

  const activeModel = providerResult.used
    ? (aiSettings.provider === 'local' ? aiSettings.localModel : aiSettings.model)
    : 'internal'

  const result = {
    action,
    source: providerResult.used ? aiSettings.provider : 'internal',
    analysis: providerResult.text ?? internal,
    meta: {
      model: activeModel,
      provider: aiSettings.provider,
      fallback_reason: providerResult.used ? null : providerResult.error,
      generated_at: new Date().toISOString(),
    },
  }

  await insertAiLog(auth.systemClient, tenantKey, {
    context_type: action,
    context_id: typeof payload.ot_id === 'string' ? payload.ot_id : null,
    prompt_hash: promptHash,
    model: activeModel,
    request_payload: payload,
    response_payload: result.analysis,
  })

  const ttl = Math.max(60, Math.floor(aiSettings.cacheTtlSec))
  await writeCache(auth.systemClient, tenantKey, cacheKey, 'ai', result, ttl, Math.floor(ttl / 2), providerResult.used ? aiSettings.provider : 'internal')

  return json(200, {
    tenant_key: tenantKey,
    object: 'AiAnalysis',
    data: result,
  })
}

