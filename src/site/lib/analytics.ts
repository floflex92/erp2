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
  MARKETING_FORM_SUBMIT: 'marketing_form_submit',
  MARKETING_FORM_SUCCESS: 'marketing_form_success',
  MARKETING_FORM_ERROR: 'marketing_form_error',
  EXPERIMENT_ASSIGNED: 'experiment_assigned',
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

export const FUNNELS = {
  MARKETING_DEMO: 'marketing_demo',
  AUTH_LOGIN: 'auth_login',
  MARKETING_CONTACT: 'marketing_contact',
} as const

export const FUNNEL_STEPS = {
  MARKETING_DEMO: {
    HOME_VIEW: 'home_view',
    DEMO_CLICK: 'demo_click',
    DEMO_PAGE_VIEW: 'demo_page_view',
    DEMO_FORM_SUBMIT: 'demo_form_submit',
    DEMO_FORM_SUCCESS: 'demo_form_success',
  },
  AUTH_LOGIN: {
    SUBMIT: 'submit',
    SUCCESS: 'success',
  },
  MARKETING_CONTACT: {
    CONTACT_PAGE_VIEW: 'contact_page_view',
    CONTACT_FORM_SUBMIT: 'contact_form_submit',
    CONTACT_FORM_SUCCESS: 'contact_form_success',
  },
} as const

const MAX_EVENT_NAME_LENGTH = 40
const MAX_PARAM_KEY_LENGTH = 40
const MAX_STRING_VALUE_LENGTH = 160
const MAX_PARAMS = 25
const MAX_PENDING_EVENTS = 40
const MAX_PENDING_EVENT_AGE_MS = 2 * 60 * 1000
const MAX_FUNNEL_TOKEN_LENGTH = 40
const FUNNEL_STEP_STORAGE_PREFIX = 'nexora_funnel_step_seen_v1:'
const RELEASE_HEALTH_STORAGE_KEY = 'nexora_release_health_ping_v1'
const VISITOR_ID_STORAGE_KEY = 'nexora_visitor_id_v1'
const EXPERIMENT_VARIANT_STORAGE_PREFIX = 'nexora_experiment_variant_v1:'
const EXPERIMENT_ASSIGNMENT_SEEN_PREFIX = 'nexora_experiment_assigned_v1:'
const DEBUG_EVENTS_STORAGE_KEY = 'nexora_analytics_debug_events_v1'
const MAX_DEBUG_EVENTS = 600

export type AnalyticsDebugEvent = {
  name: EventName
  params: AnalyticsParams
  createdAt: number
}

export type MarketingFunnelSnapshot = {
  homeViews: number
  demoClicks: number
  demoFormSubmits: number
  demoFormSuccesses: number
  contactPageViews: number
  contactFormSubmits: number
  contactFormSuccesses: number
  clickRateFromHomeView: number
  demoSubmitRateFromClicks: number
  demoSuccessRateFromSubmits: number
  contactSubmitRateFromViews: number
  contactSuccessRateFromSubmits: number
}

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

function randomToken() {
  return Math.random().toString(36).slice(2, 10)
}

function hashString(value: string) {
  let hash = 2166136261
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

function getOrCreateVisitorId() {
  if (typeof window === 'undefined') return 'server'

  try {
    const existing = window.localStorage.getItem(VISITOR_ID_STORAGE_KEY)
    if (existing) return existing

    const created = `v_${Date.now().toString(36)}_${randomToken()}`
    window.localStorage.setItem(VISITOR_ID_STORAGE_KEY, created)
    return created
  } catch {
    return `ephemeral_${randomToken()}`
  }
}

function hasSentExperimentAssignment(experimentId: string, variant: string) {
  if (typeof window === 'undefined') return false
  const safeExperimentId = sanitizeToken(experimentId, MAX_FUNNEL_TOKEN_LENGTH)
  const safeVariant = sanitizeToken(variant, MAX_FUNNEL_TOKEN_LENGTH)
  if (!safeExperimentId || !safeVariant) return true
  const key = `${EXPERIMENT_ASSIGNMENT_SEEN_PREFIX}${safeExperimentId}:${safeVariant}`

  try {
    return window.sessionStorage.getItem(key) === '1'
  } catch {
    return false
  }
}

function markExperimentAssignmentSent(experimentId: string, variant: string) {
  if (typeof window === 'undefined') return
  const safeExperimentId = sanitizeToken(experimentId, MAX_FUNNEL_TOKEN_LENGTH)
  const safeVariant = sanitizeToken(variant, MAX_FUNNEL_TOKEN_LENGTH)
  if (!safeExperimentId || !safeVariant) return
  const key = `${EXPERIMENT_ASSIGNMENT_SEEN_PREFIX}${safeExperimentId}:${safeVariant}`

  try {
    window.sessionStorage.setItem(key, '1')
  } catch {
    // Ignore sessionStorage access issues.
  }
}

function getStoredExperimentVariant(experimentId: string) {
  if (typeof window === 'undefined') return null
  const safeExperimentId = sanitizeToken(experimentId, MAX_FUNNEL_TOKEN_LENGTH)
  if (!safeExperimentId) return null

  try {
    return window.localStorage.getItem(`${EXPERIMENT_VARIANT_STORAGE_PREFIX}${safeExperimentId}`)
  } catch {
    return null
  }
}

function storeExperimentVariant(experimentId: string, variant: string) {
  if (typeof window === 'undefined') return
  const safeExperimentId = sanitizeToken(experimentId, MAX_FUNNEL_TOKEN_LENGTH)
  const safeVariant = sanitizeToken(variant, MAX_FUNNEL_TOKEN_LENGTH)
  if (!safeExperimentId || !safeVariant) return

  try {
    window.localStorage.setItem(`${EXPERIMENT_VARIANT_STORAGE_PREFIX}${safeExperimentId}`, safeVariant)
  } catch {
    // Ignore localStorage access issues.
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

function readDebugEvents() {
  if (typeof window === 'undefined') return [] as AnalyticsDebugEvent[]
  try {
    const raw = window.localStorage.getItem(DEBUG_EVENTS_STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as AnalyticsDebugEvent[]
    if (!Array.isArray(parsed)) return []
    return parsed
  } catch {
    return []
  }
}

function writeDebugEvents(events: AnalyticsDebugEvent[]) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(DEBUG_EVENTS_STORAGE_KEY, JSON.stringify(events.slice(-MAX_DEBUG_EVENTS)))
  } catch {
    // Ignore localStorage access issues.
  }
}

function storeDebugEvent(name: EventName, params: AnalyticsParams) {
  if (typeof window === 'undefined') return
  const safeParams = sanitizeParams(withStandardContext(params))
  const events = readDebugEvents()
  events.push({
    name,
    params: safeParams,
    createdAt: Date.now(),
  })
  writeDebugEvents(events)
}

function toRate(numerator: number, denominator: number) {
  if (denominator <= 0) return 0
  return Number(((numerator / denominator) * 100).toFixed(1))
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

  storeDebugEvent(name, params)

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

type AssignExperimentOptions = {
  surface?: string
}

export function assignExperimentVariant(
  experimentId: string,
  variants: readonly string[],
  options: AssignExperimentOptions = {},
) {
  const safeExperimentId = sanitizeToken(experimentId, MAX_FUNNEL_TOKEN_LENGTH)
  const safeVariants = variants
    .map(variant => sanitizeToken(variant, MAX_FUNNEL_TOKEN_LENGTH))
    .filter((variant): variant is string => Boolean(variant))

  if (!safeExperimentId || safeVariants.length === 0) {
    return null
  }

  const stored = getStoredExperimentVariant(safeExperimentId)
  let selected = stored && safeVariants.includes(stored) ? stored : null

  if (!selected) {
    const visitorId = getOrCreateVisitorId()
    const bucket = hashString(`${visitorId}:${safeExperimentId}`) % safeVariants.length
    selected = safeVariants[bucket]
    storeExperimentVariant(safeExperimentId, selected)
  }

  if (!hasSentExperimentAssignment(safeExperimentId, selected)) {
    markExperimentAssignmentSent(safeExperimentId, selected)
    trackEvent(EVENTS.EXPERIMENT_ASSIGNED, {
      experiment_id: safeExperimentId,
      variant: selected,
      surface: options.surface ?? 'site',
    })
  }

  return selected
}

export function getAnalyticsDebugEvents() {
  return readDebugEvents()
}

export function getMarketingFunnelSnapshot(): MarketingFunnelSnapshot {
  const events = readDebugEvents()
  let homeViews = 0
  let demoClicks = 0
  let demoFormSubmits = 0
  let demoFormSuccesses = 0
  let contactPageViews = 0
  let contactFormSubmits = 0
  let contactFormSuccesses = 0

  for (const event of events) {
    if (event.name === EVENTS.FUNNEL_STEP) {
      const funnel = event.params.funnel
      const step = event.params.step

      if (funnel === FUNNELS.MARKETING_DEMO && step === FUNNEL_STEPS.MARKETING_DEMO.HOME_VIEW) {
        homeViews += 1
      }
      if (funnel === FUNNELS.MARKETING_DEMO && step === FUNNEL_STEPS.MARKETING_DEMO.DEMO_CLICK) {
        demoClicks += 1
      }
      if (funnel === FUNNELS.MARKETING_DEMO && step === FUNNEL_STEPS.MARKETING_DEMO.DEMO_FORM_SUBMIT) {
        demoFormSubmits += 1
      }
      if (funnel === FUNNELS.MARKETING_DEMO && step === FUNNEL_STEPS.MARKETING_DEMO.DEMO_FORM_SUCCESS) {
        demoFormSuccesses += 1
      }

      if (funnel === FUNNELS.MARKETING_CONTACT && step === FUNNEL_STEPS.MARKETING_CONTACT.CONTACT_PAGE_VIEW) {
        contactPageViews += 1
      }
      if (funnel === FUNNELS.MARKETING_CONTACT && step === FUNNEL_STEPS.MARKETING_CONTACT.CONTACT_FORM_SUBMIT) {
        contactFormSubmits += 1
      }
      if (funnel === FUNNELS.MARKETING_CONTACT && step === FUNNEL_STEPS.MARKETING_CONTACT.CONTACT_FORM_SUCCESS) {
        contactFormSuccesses += 1
      }
    }
  }

  return {
    homeViews,
    demoClicks,
    demoFormSubmits,
    demoFormSuccesses,
    contactPageViews,
    contactFormSubmits,
    contactFormSuccesses,
    clickRateFromHomeView: toRate(demoClicks, homeViews),
    demoSubmitRateFromClicks: toRate(demoFormSubmits, demoClicks),
    demoSuccessRateFromSubmits: toRate(demoFormSuccesses, demoFormSubmits),
    contactSubmitRateFromViews: toRate(contactFormSubmits, contactPageViews),
    contactSuccessRateFromSubmits: toRate(contactFormSuccesses, contactFormSubmits),
  }
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
  clearExperimentState: () => {
    if (typeof window === 'undefined') return
    try {
      const localKeysToDelete: string[] = []
      for (let i = 0; i < window.localStorage.length; i += 1) {
        const key = window.localStorage.key(i)
        if (
          key === VISITOR_ID_STORAGE_KEY
          || (key && key.startsWith(EXPERIMENT_VARIANT_STORAGE_PREFIX))
        ) {
          localKeysToDelete.push(key)
        }
      }
      for (const key of localKeysToDelete) {
        window.localStorage.removeItem(key)
      }

      const sessionKeysToDelete: string[] = []
      for (let i = 0; i < window.sessionStorage.length; i += 1) {
        const key = window.sessionStorage.key(i)
        if (key && key.startsWith(EXPERIMENT_ASSIGNMENT_SEEN_PREFIX)) {
          sessionKeysToDelete.push(key)
        }
      }
      for (const key of sessionKeysToDelete) {
        window.sessionStorage.removeItem(key)
      }
    } catch {
      // Ignore storage access issues.
    }
  },
  clearDebugEvents: () => {
    if (typeof window === 'undefined') return
    try {
      window.localStorage.removeItem(DEBUG_EVENTS_STORAGE_KEY)
    } catch {
      // Ignore localStorage access issues.
    }
  },
}
