import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  __analyticsInternals,
  EVENTS,
  flushPendingAnalyticsEvents,
  trackEvent,
  trackFunnelStep,
  trackPageView,
  trackReleaseHealthPingOnce,
} from './analytics'

describe('analytics hardening', () => {
  beforeEach(() => {
    window.localStorage.clear()
    window.gtag = undefined
    window.history.replaceState({}, '', '/')
    __analyticsInternals.clearPendingQueue()
    __analyticsInternals.clearFunnelSessionState()
    __analyticsInternals.clearReleaseHealthState()
    vi.restoreAllMocks()
  })

  it('n envoie rien sans consentement', () => {
    const gtagSpy = vi.fn()
    window.gtag = gtagSpy

    trackEvent(EVENTS.MARKETING_CTA_CLICK, { placement: 'hero' })

    expect(gtagSpy).not.toHaveBeenCalled()
  })

  it('sanitise les params et injecte le contexte standard', () => {
    const gtagSpy = vi.fn()
    window.gtag = gtagSpy
    window.localStorage.setItem('nexora-cookie-consent-v1', 'accepted')
    window.history.replaceState({}, '', '/fonctionnalites')

    trackEvent(EVENTS.MARKETING_CTA_CLICK, {
      'Placement Name': ' Hero Section ',
      invalidNumber: Number.NaN,
      keepBoolean: true,
    })

    expect(gtagSpy).toHaveBeenCalledTimes(1)
    expect(gtagSpy).toHaveBeenCalledWith('event', 'marketing_cta_click', {
      page_path: '/fonctionnalites',
      event_origin: 'web',
      placement_name: 'Hero Section',
      keepboolean: true,
    })
  })

  it('trackPageView utilise page_view avec page_path', () => {
    const gtagSpy = vi.fn()
    window.gtag = gtagSpy
    window.localStorage.setItem('nexora-cookie-consent-v1', 'accepted')

    trackPageView('/login')

    expect(gtagSpy).toHaveBeenCalledWith('event', 'page_view', {
      event_origin: 'web',
      page_path: '/login',
    })
  })

  it('expose des helpers de sanitisation stables', () => {
    expect(__analyticsInternals.sanitizeEventName('  ###  ')).toBeNull()
    expect(__analyticsInternals.sanitizeEventName('Login Submit Success')).toBe('login_submit_success')

    const result = __analyticsInternals.sanitizeParams({
      ' A B ': '  valeur  ',
      n: 42,
      b: false,
      inf: Number.POSITIVE_INFINITY,
    })

    expect(result).toEqual({
      a_b: 'valeur',
      n: 42,
      b: false,
    })
  })

  it('met en file d attente les events si gtag n est pas encore disponible puis flush', () => {
    window.localStorage.setItem('nexora-cookie-consent-v1', 'accepted')

    trackEvent(EVENTS.MARKETING_CTA_CLICK, { placement: 'hero' })
    trackEvent(EVENTS.LOGIN_SUBMIT, { remember_me: true })

    expect(__analyticsInternals.getPendingQueueSize()).toBe(2)

    const gtagSpy = vi.fn()
    window.gtag = gtagSpy

    const flushed = flushPendingAnalyticsEvents()
    expect(flushed).toBe(2)
    expect(__analyticsInternals.getPendingQueueSize()).toBe(0)
    expect(gtagSpy).toHaveBeenCalledTimes(2)
  })

  it('ignore les events en file devenus obsoletes', () => {
    vi.spyOn(Date, 'now').mockReturnValue(1000)
    window.localStorage.setItem('nexora-cookie-consent-v1', 'accepted')
    trackEvent(EVENTS.MARKETING_CTA_CLICK, { placement: 'hero' })

    const gtagSpy = vi.fn()
    window.gtag = gtagSpy
    vi.spyOn(Date, 'now').mockReturnValue(200000)

    const flushed = flushPendingAnalyticsEvents()
    expect(flushed).toBe(0)
    expect(__analyticsInternals.getPendingQueueSize()).toBe(0)
    expect(gtagSpy).not.toHaveBeenCalled()
  })

  it('dedoublonne les etapes funnel dans la session', () => {
    const gtagSpy = vi.fn()
    window.gtag = gtagSpy
    window.localStorage.setItem('nexora-cookie-consent-v1', 'accepted')

    const first = trackFunnelStep('marketing_demo', 'home_view', { source: 'hero' })
    const second = trackFunnelStep('marketing_demo', 'home_view', { source: 'hero' })

    expect(first).toBe(true)
    expect(second).toBe(false)
    expect(gtagSpy).toHaveBeenCalledTimes(1)
    expect(gtagSpy).toHaveBeenLastCalledWith('event', 'funnel_step', {
      page_path: '/',
      event_origin: 'web',
      funnel: 'marketing_demo',
      step: 'home_view',
      source: 'hero',
    })
  })

  it('envoie un ping release une seule fois par session', () => {
    const gtagSpy = vi.fn()
    window.gtag = gtagSpy
    window.localStorage.setItem('nexora-cookie-consent-v1', 'accepted')

    const first = trackReleaseHealthPingOnce({ surface: 'site_layout' })
    const second = trackReleaseHealthPingOnce({ surface: 'site_layout' })

    expect(first).toBe(true)
    expect(second).toBe(false)
    expect(gtagSpy).toHaveBeenCalledTimes(1)
    expect(gtagSpy.mock.calls[0][0]).toBe('event')
    expect(gtagSpy.mock.calls[0][1]).toBe('release_health_ping')
    expect(gtagSpy.mock.calls[0][2]).toMatchObject({
      event_origin: 'web',
      page_path: '/',
      surface: 'site_layout',
    })
  })
})
