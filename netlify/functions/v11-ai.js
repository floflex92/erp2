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

function parseOpenAiText(responseJson) {
  if (!responseJson || typeof responseJson !== 'object') return null

  if (Array.isArray(responseJson.output_text) && responseJson.output_text.length > 0) {
    return responseJson.output_text.join('\n')
  }

  if (!Array.isArray(responseJson.output)) return null
  const texts = []
  for (const outputItem of responseJson.output) {
    if (!Array.isArray(outputItem.content)) continue
    for (const contentItem of outputItem.content) {
      if (typeof contentItem.text === 'string') texts.push(contentItem.text)
    }
  }
  if (texts.length === 0) return null
  return texts.join('\n')
}

async function callOpenAiIfEnabled(model, apiKey, action, payload, fallback) {
  if (!apiKey) return { used: false, text: null, error: 'missing_api_key' }
  try {
    const prompt = [
      `You are an ERP transport operations copilot.`,
      `Action: ${action}.`,
      `Return concise JSON with keys summary, risks, recommendations.`,
      `Data: ${JSON.stringify(payload)}`,
    ].join('\n')

    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        input: prompt,
        max_output_tokens: 450,
      }),
    })

    if (!response.ok) {
      return { used: false, text: null, error: `openai_status_${response.status}` }
    }

    const responseJson = await response.json()
    const text = parseOpenAiText(responseJson)
    if (!text) {
      return { used: false, text: null, error: 'openai_empty_output' }
    }

    let parsed = null
    try {
      parsed = JSON.parse(text)
    } catch {
      parsed = { summary: text, recommendations: fallback.recommendations ?? [] }
    }

    return {
      used: true,
      text: parsed,
      raw: responseJson,
      error: null,
    }
  } catch (error) {
    return {
      used: false,
      text: null,
      error: error instanceof Error ? error.message : 'openai_request_failed',
    }
  }
}

// NOTE SECURITE: config_entreprise et erp_v11_ai_logs sont des tables systeme → systemClient.
async function loadAiSettings(systemClient) {
  const keys = [
    'v11.ai.enabled',
    'v11.ai.model',
    'v11.ai.cache_ttl_sec',
  ]
  const { data } = await systemClient
    .from('config_entreprise')
    .select('cle, valeur')
    .in('cle', keys)
  const map = Object.fromEntries((data ?? []).map(row => [row.cle, row.valeur]))
  return {
    enabled: map['v11.ai.enabled'] !== false,
    model: typeof map['v11.ai.model'] === 'string' ? map['v11.ai.model'] : 'gpt-4.1-mini',
    cacheTtlSec: Number.isFinite(map['v11.ai.cache_ttl_sec']) ? Number(map['v11.ai.cache_ttl_sec']) : 300,
  }
}

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
  const apiKey = process.env.OPENAI_API_KEY || process.env.CHATGPT_API_KEY || null
  const provider = canCallProvider
    ? await callOpenAiIfEnabled(aiSettings.model, apiKey, action, payload, internal)
    : { used: false, text: null, error: 'provider_disabled' }

  const result = {
    action,
    source: provider.used ? 'openai' : 'internal',
    analysis: provider.text ?? internal,
    meta: {
      model: provider.used ? aiSettings.model : 'internal',
      fallback_reason: provider.used ? null : provider.error,
      generated_at: new Date().toISOString(),
    },
  }

  await insertAiLog(auth.systemClient, tenantKey, {
    context_type: action,
    context_id: typeof payload.ot_id === 'string' ? payload.ot_id : null,
    prompt_hash: promptHash,
    model: provider.used ? aiSettings.model : 'internal',
    request_payload: payload,
    response_payload: result.analysis,
  })

  const ttl = Math.max(60, Math.floor(aiSettings.cacheTtlSec))
  await writeCache(auth.systemClient, tenantKey, cacheKey, 'ai', result, ttl, Math.floor(ttl / 2), provider.used ? 'provider' : 'internal')

  return json(200, {
    tenant_key: tenantKey,
    object: 'AiAnalysis',
    data: result,
  })
}

