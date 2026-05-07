import { APP_VERSION, BUILD_REF } from '@/lib/appVersion'

const COOKIE_CONSENT_STORAGE_KEY = 'nexora-cookie-consent-v1'

type AnalyticsValue = string | number | boolean | null
export type AnalyticsParams = Record<string, AnalyticsValue>

type PendingAnalyticsEvent = {
  name: EventName
  params: AnalyticsParams
  createdAt: number
}

export const EVENTS = {
  PAGE_VIEW: 'page_view',
  FUNNEL_STEP: 'funnel_step',
  RELEASE_HEALTH_PING: 'release_health_ping',
  MARKETING_CTA_CLICK: 'marketing_cta_click',
  MARKETING_NAV_CLICK: 'marketing_nav_click',
  LOGIN_SUBMIT: 'login_submit',
  LOGIN_SUBMIT_SUCCESS: 'login_submit_success',
  LOGIN_SUBMIT_ERROR: 'login_submit_error',
  LOGIN_DEMO_SUBMIT: 'login_demo_submit',
  LOGIN_DEMO_SUCCESS: 'login_demo_success',
  LOGIN_DEMO_ERROR: 'login_demo_error',
  LOGIN_DEMO_BACK_TO_LOGIN: 'login_demo_back_to_login',
  LOGIN_PASSWORD_VISIBILITY_TOGGLE: 'login_password_visibility_toggle',
} as const

export type EventName = (typeof EVENTS)[keyof typeof EVENTS]

const MAX_EVENT_NAME_LENGTH = 40
const MAX_PARAM_KEY_LENGTH = 40
const MAX_STRING_VALUE_LENGTH = 160
const MAX_PARAMS = 25
const MAX_PENDING_EVENTS = 40
const MAX_PENDING_EVENT_AGE_MS = 2 * 60 * 1000
const MAX_FUNNEL_TOKEN_LENGTH = 40
const FUNNEL_STEP_STORAGE_PREFIX = 'nexora_funnel_step_seen_v1:'
const RELEASE_HEALTH_STORAGE_KEY = 'nexora_release_health_ping_v1'

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void
    __nexora_pending_analytics__?: PendingAnalyticsEvent[]
  }
}

function hasAnalyticsConsent() {
  if (typeof window === 'undefined') return false
  return window.localStorage.getItem(COOKIE_CONSENT_STORAGE_KEY) === 'accepted'
}

function sanitizeToken(value: string, maxLength: number) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9_]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, maxLength)
}

function sanitizeEventName(name: string) {
  const safeName = sanitizeToken(name, MAX_EVENT_NAME_LENGTH)
  return safeName.length > 0 ? safeName : null
}

function sanitizeParams(params: AnalyticsParams) {
  const safeParams: AnalyticsParams = {}
  const entries = Object.entries(params).slice(0, MAX_PARAMS)

  for (const [rawKey, rawValue] of entries) {
    const key = sanitizeToken(rawKey, MAX_PARAM_KEY_LENGTH)
    if (!key) continue

    if (typeof rawValue === 'string') {
      safeParams[key] = rawValue.trim().slice(0, MAX_STRING_VALUE_LENGTH)
      continue
    }

    if (typeof rawValue === 'number') {
      if (Number.isFinite(rawValue)) {
        safeParams[key] = rawValue
      }
      continue
    }

    if (typeof rawValue === 'boolean' || rawValue === null) {
      safeParams[key] = rawValue
    }
  }

  return safeParams
}

function withStandardContext(params: AnalyticsParams) {
  const pagePath = typeof window !== 'undefined' ? window.location.pathname : '/'
  return {
    page_path: pagePath,
    event_origin: 'web',
    ...params,
  }
}

function getFunnelStorageKey(funnel: string, step: string) {
  const safeFunnel = sanitizeToken(funnel, MAX_FUNNEL_TOKEN_LENGTH)
  const safeStep = sanitizeToken(step, MAX_FUNNEL_TOKEN_LENGTH)
  if (!safeFunnel || !safeStep) return null
  return `${FUNNEL_STEP_STORAGE_PREFIX}${safeFunnel}:${safeStep}`
}

function hasSeenFunnelStep(funnel: string, step: string) {
  if (typeof window === 'undefined') return false
  const key = getFunnelStorageKey(funnel, step)
  if (!key) return true

  try {
    return window.sessionStorage.getItem(key) === '1'
  } catch {
    return false
  }
}

function markFunnelStepAsSeen(funnel: string, step: string) {
  if (typeof window === 'undefined') return
  const key = getFunnelStorageKey(funnel, step)
  if (!key) return

  try {
    window.sessionStorage.setItem(key, '1')
  } catch {
    // Ignore quota/sessionStorage access issues.
  }
}

function hasSentReleaseHealthPing(versionRef: string) {
  if (typeof window === 'undefined') return false
  try {
    return window.sessionStorage.getItem(RELEASE_HEALTH_STORAGE_KEY) === versionRef
  } catch {
    return false
  }
}

function markReleaseHealthPingSent(versionRef: string) {
  if (typeof window === 'undefined') return
  try {
    window.sessionStorage.setItem(RELEASE_HEALTH_STORAGE_KEY, versionRef)
  } catch {
    // Ignore sessionStorage access issues.
  }
}

function getPendingQueue() {
  if (typeof window === 'undefined') return []
  if (!Array.isArray(window.__nexora_pending_analytics__)) {
    window.__nexora_pending_analytics__ = []
  }
  return window.__nexora_pending_analytics__
}

function enqueuePendingEvent(name: EventName, params: AnalyticsParams) {
  const queue = getPendingQueue()
  queue.push({
    name,
    params,
    createdAt: Date.now(),
  })

  if (queue.length > MAX_PENDING_EVENTS) {
    queue.splice(0, queue.length - MAX_PENDING_EVENTS)
  }
}

function sendEventToGtag(name: EventName, params: AnalyticsParams) {
  if (typeof window === 'undefined') return false
  if (typeof window.gtag !== 'function') return false

  const safeName = sanitizeEventName(name)
  if (!safeName) return false

  const safeParams = sanitizeParams(withStandardContext(params))

  try {
    window.gtag('event', safeName, safeParams)
    return true
  } catch {
    return false
  }
}

export function flushPendingAnalyticsEvents() {
  if (typeof window === 'undefined') return 0
  if (!hasAnalyticsConsent()) return 0
  if (typeof window.gtag !== 'function') return 0

  const now = Date.now()
  const queue = getPendingQueue()
  if (queue.length === 0) return 0

  const keep: PendingAnalyticsEvent[] = []
  let sent = 0

  for (const event of queue) {
    if (now - event.createdAt > MAX_PENDING_EVENT_AGE_MS) continue
    if (sendEventToGtag(event.name, event.params)) {
      sent += 1
      continue
    }
    keep.push(event)
  }

  window.__nexora_pending_analytics__ = keep
  return sent
}

export function trackEvent(name: EventName, params: AnalyticsParams = {}) {
  if (typeof window === 'undefined') return
  if (!hasAnalyticsConsent()) return
  if (typeof window.gtag !== 'function') {
    enqueuePendingEvent(name, params)
    return
  }

  flushPendingAnalyticsEvents()
  void sendEventToGtag(name, params)
}

export function trackFunnelStep(funnel: string, step: string, params: AnalyticsParams = {}) {
  if (typeof window === 'undefined') return false
  if (!hasAnalyticsConsent()) return false
  if (hasSeenFunnelStep(funnel, step)) return false

  markFunnelStepAsSeen(funnel, step)
  trackEvent(EVENTS.FUNNEL_STEP, {
    funnel,
    step,
    ...params,
  })
  return true
}

export function trackPageView(path = typeof window !== 'undefined' ? window.location.pathname : '/') {
  trackEvent(EVENTS.PAGE_VIEW, { page_path: path })
}

export function trackReleaseHealthPingOnce(params: AnalyticsParams = {}) {
  if (typeof window === 'undefined') return false
  if (!hasAnalyticsConsent()) return false

  const versionRef = `${APP_VERSION}+${BUILD_REF}`
  if (hasSentReleaseHealthPing(versionRef)) return false

  markReleaseHealthPingSent(versionRef)
  trackEvent(EVENTS.RELEASE_HEALTH_PING, {
    app_version: APP_VERSION,
    build_ref: BUILD_REF,
    ...params,
  })
  return true
}

export const __analyticsInternals = {
  sanitizeEventName,
  sanitizeParams,
  getPendingQueueSize: () => getPendingQueue().length,
  clearPendingQueue: () => {
    if (typeof window === 'undefined') return
    window.__nexora_pending_analytics__ = []
  },
  clearFunnelSessionState: () => {
    if (typeof window === 'undefined') return
    try {
      const keysToDelete: string[] = []
      for (let i = 0; i < window.sessionStorage.length; i += 1) {
        const key = window.sessionStorage.key(i)
        if (key && key.startsWith(FUNNEL_STEP_STORAGE_PREFIX)) {
          keysToDelete.push(key)
        }
      }
      for (const key of keysToDelete) {
        window.sessionStorage.removeItem(key)
      }
    } catch {
      // Ignore sessionStorage access issues.
    }
  },
  clearReleaseHealthState: () => {
    if (typeof window === 'undefined') return
    try {
      window.sessionStorage.removeItem(RELEASE_HEALTH_STORAGE_KEY)
    } catch {
      // Ignore sessionStorage access issues.
    }
  },
}
