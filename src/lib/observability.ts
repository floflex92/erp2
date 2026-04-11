import { looseSupabase } from '@/lib/supabaseLoose'

// Clés de contexte à ne jamais inclure dans les rapports d'erreur (OWASP)
const SENSITIVE_KEYS = new Set([
  'password', 'token', 'access_token', 'refresh_token',
  'secret', 'authorization', 'apikey', 'api_key', 'jwt', 'bearer',
])

// Rate-limiting par session : max 3 reports par message identique
const sessionCounts = new Map<string, number>()
const MAX_PER_KEY = 3

function sanitizeContext(ctx: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(ctx)) {
    if (SENSITIVE_KEYS.has(key.toLowerCase())) continue
    result[key] = value
  }
  return result
}

function rateKey(errorType: string, message: string): string {
  return `${errorType}:${message.slice(0, 60)}`
}

export interface ErrorReportOptions {
  error_type: 'unhandled_error' | 'unhandled_rejection' | 'react_boundary' | 'api_error'
  message: string
  stack_trace?: string | null
  context?: Record<string, unknown>
}

export function reportError(opts: ErrorReportOptions): void {
  // Pas de reporting en développement (évite le bruit et la consommation inutile)
  if (import.meta.env.DEV) return

  const key = rateKey(opts.error_type, opts.message)
  const count = sessionCounts.get(key) ?? 0
  if (count >= MAX_PER_KEY) return
  sessionCounts.set(key, count + 1)

  const context: Record<string, unknown> = {
    ...sanitizeContext(opts.context ?? {}),
    url: window.location.pathname,
    ua: navigator.userAgent.slice(0, 120),
  }

  // Insertion non-bloquante
  void looseSupabase.from('app_error_logs').insert({
    source: 'frontend',
    error_type: opts.error_type,
    message: opts.message.slice(0, 500),
    stack_trace: opts.stack_trace?.slice(0, 2000) ?? null,
    context,
  })
}

export function initObservability(): void {
  if (import.meta.env.DEV) return

  window.addEventListener('error', (event) => {
    reportError({
      error_type: 'unhandled_error',
      message: event.message || 'Unhandled error',
      stack_trace: event.error instanceof Error ? (event.error.stack ?? null) : null,
      context: {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
      },
    })
  })

  window.addEventListener('unhandledrejection', (event) => {
    const err = event.reason
    const message =
      err instanceof Error
        ? err.message
        : typeof err === 'string'
          ? err
          : 'Unhandled promise rejection'
    reportError({
      error_type: 'unhandled_rejection',
      message,
      stack_trace: err instanceof Error ? (err.stack ?? null) : null,
    })
  })
}
