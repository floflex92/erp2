/**
 * v11-ai-provider.js
 *
 * Module partagé : abstraction provider IA (local Ollama / cloud OpenAI).
 * Importé par v11-ai.js et v11-ai-placement.js.
 *
 * Providers supportés :
 *   'local'  → Ollama (endpoint /v1/chat/completions compatible OpenAI)
 *   'openai' → OpenAI Responses API
 */

// ── Parsing de la réponse brute ───────────────────────────────────────────────
export function parseTextFromResponse(responseJson) {
  if (!responseJson || typeof responseJson !== 'object') return null

  // Format OpenAI Responses API
  if (Array.isArray(responseJson.output_text) && responseJson.output_text.length > 0) {
    return responseJson.output_text.join('\n')
  }
  if (Array.isArray(responseJson.output)) {
    const texts = []
    for (const item of responseJson.output) {
      if (!Array.isArray(item.content)) continue
      for (const c of item.content) {
        if (typeof c.text === 'string') texts.push(c.text)
      }
    }
    if (texts.length > 0) return texts.join('\n')
  }

  // Format chat/completions universel (Ollama + OpenAI compatible)
  const msg = responseJson?.choices?.[0]?.message
  if (msg) {
    if (typeof msg.content === 'string' && msg.content.trim().length > 0) return msg.content
    // Modèles de raisonnement (gpt-oss, DeepSeek R1...) : texte dans reasoning
    if (typeof msg.reasoning === 'string' && msg.reasoning.trim().length > 0) return msg.reasoning
    if (typeof msg.reasoning_content === 'string' && msg.reasoning_content.trim().length > 0) return msg.reasoning_content
  }

  return null
}

// ── Provider local : Ollama ────────────────────────────────────────────────────
async function _callLocal(localEndpoint, localModel, prompt, maxTokens = 1200) {
  const url = `${localEndpoint.replace(/\/$/, '')}/v1/chat/completions`
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: localModel,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: maxTokens,
      stream: false,
    }),
    signal: AbortSignal.timeout(30000),
  })
  if (!response.ok) throw new Error(`local_ai_status_${response.status}`)
  const json = await response.json()
  const text = parseTextFromResponse(json)
  if (!text) throw new Error('local_ai_empty_output')
  return text
}

// ── Provider cloud : OpenAI ────────────────────────────────────────────────────
async function _callOpenAi(model, apiKey, prompt, maxTokens = 450) {
  if (!apiKey) throw new Error('missing_api_key')
  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ model, input: prompt, max_output_tokens: maxTokens }),
  })
  if (!response.ok) throw new Error(`openai_status_${response.status}`)
  const json = await response.json()
  const text = parseTextFromResponse(json)
  if (!text) throw new Error('openai_empty_output')
  return text
}

// ── Chargement des settings IA depuis config_entreprise ───────────────────────
// NOTE SECURITE: utilise systemClient → accès tables système uniquement.
export async function loadAiSettings(systemClient) {
  const keys = [
    'v11.ai.enabled',
    'v11.ai.provider',
    'v11.ai.model',
    'v11.ai.local_endpoint',
    'v11.ai.local_model',
    'v11.ai.cache_ttl_sec',
  ]
  const { data } = await systemClient
    .from('config_entreprise')
    .select('cle, valeur')
    .in('cle', keys)
  const map = Object.fromEntries((data ?? []).map(row => [row.cle, row.valeur]))
  const provider = typeof map['v11.ai.provider'] === 'string' ? map['v11.ai.provider'] : 'local'
  return {
    enabled: map['v11.ai.enabled'] !== false,
    provider,
    model: typeof map['v11.ai.model'] === 'string' ? map['v11.ai.model'] : 'gpt-4.1-mini',
    localEndpoint: typeof map['v11.ai.local_endpoint'] === 'string' ? map['v11.ai.local_endpoint'] : 'http://localhost:11434',
    localModel: typeof map['v11.ai.local_model'] === 'string' ? map['v11.ai.local_model'] : 'mistral',
    cacheTtlSec: Number.isFinite(map['v11.ai.cache_ttl_sec']) ? Number(map['v11.ai.cache_ttl_sec']) : 300,
  }
}

// ── Dispatcher principal ──────────────────────────────────────────────────────
/**
 * Appelle le provider configuré avec un prompt texte libre.
 * @param {object} settings  résultat de loadAiSettings()
 * @param {string} prompt    prompt complet à envoyer
 * @param {number} maxTokens limite de tokens en sortie
 * @returns {{ used: boolean, text: string|null, error: string|null }}
 */
export async function callAiProvider(settings, prompt, maxTokens = 1200) {
  if (!settings.enabled) return { used: false, text: null, error: 'provider_disabled' }
  try {
    let text
    if (settings.provider === 'local') {
      text = await _callLocal(settings.localEndpoint, settings.localModel, prompt, maxTokens)
    } else {
      const apiKey = process.env.OPENAI_API_KEY || process.env.CHATGPT_API_KEY || null
      text = await _callOpenAi(settings.model, apiKey, prompt, maxTokens)
    }
    return { used: true, text, error: null }
  } catch (error) {
    return {
      used: false,
      text: null,
      error: error instanceof Error ? error.message : 'ai_request_failed',
    }
  }
}
