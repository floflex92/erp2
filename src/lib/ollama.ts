const OLLAMA_HOST = import.meta.env.VITE_OLLAMA_HOST ?? 'http://localhost:11434'
const OLLAMA_MODEL = import.meta.env.VITE_OLLAMA_MODEL ?? 'mistral'

export interface OllamaChatMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
}

export interface OllamaChatResponse {
  model: string
  message: OllamaChatMessage
  done: boolean
  done_reason?: string
  total_duration?: number
  eval_count?: number
}

export class OllamaError extends Error {
  readonly status?: number
  constructor(message: string, status?: number) {
    super(message)
    this.name = 'OllamaError'
    this.status = status
  }
}

/**
 * Envoie un prompt à Ollama et retourne la réponse du modèle.
 * Utilise l'endpoint /api/chat (format non-streaming).
 */
export async function chat(
  prompt: string,
  options?: { model?: string; system?: string },
): Promise<OllamaChatResponse> {
  const model = options?.model ?? OLLAMA_MODEL
  const messages: OllamaChatMessage[] = []

  if (options?.system) {
    messages.push({ role: 'system', content: options.system })
  }
  messages.push({ role: 'user', content: prompt })

  let response: Response
  try {
    response = await fetch(`${OLLAMA_HOST}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, messages, stream: false }),
      signal: AbortSignal.timeout(30_000),
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Ollama unreachable'
    throw new OllamaError(`Ollama request failed: ${msg}`)
  }

  if (!response.ok) {
    let detail = ''
    try {
      const body = await response.json()
      detail = typeof body?.error === 'string' ? ` – ${body.error}` : ''
    } catch {
      // ignore parse error
    }
    throw new OllamaError(`Ollama HTTP ${response.status}${detail}`, response.status)
  }

  let json: unknown
  try {
    json = await response.json()
  } catch {
    throw new OllamaError('Ollama returned invalid JSON')
  }

  return json as OllamaChatResponse
}
