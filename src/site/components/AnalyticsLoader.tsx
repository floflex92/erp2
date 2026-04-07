import { useEffect } from 'react'
import { COOKIE_CONSENT_STORAGE_KEY } from '@/site/components/CookieBanner'

const GA_ID = 'G-4QQVY1DQT2'
const ANALYTICS_LOADED_KEY = '__nexora_ga_loaded'

declare global {
  interface Window {
    dataLayer: unknown[]
    gtag?: (...args: unknown[]) => void
    __nexora_ga_loaded?: boolean
  }
}

function loadGoogleAnalytics() {
  if (window[ANALYTICS_LOADED_KEY as keyof Window]) return
  window.__nexora_ga_loaded = true

  const script = document.createElement('script')
  script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`
  script.async = true
  document.head.appendChild(script)

  window.dataLayer = window.dataLayer || []
  function gtag(...args: unknown[]) { window.dataLayer.push(args) }
  window.gtag = gtag
  gtag('js', new Date())
  gtag('config', GA_ID)
}

/**
 * Charge Google Analytics uniquement après consentement explicite (RGPD).
 * - Si le consentement est déjà stocké ('accepted'), chargement immédiat.
 * - Sinon, écoute l'événement 'nexora-analytics-consent' déclenché par CookieBanner.
 */
export default function AnalyticsLoader() {
  useEffect(() => {
    const stored = window.localStorage.getItem(COOKIE_CONSENT_STORAGE_KEY)
    if (stored === 'accepted') {
      loadGoogleAnalytics()
      return
    }

    const onConsent = (e: Event) => {
      if ((e as CustomEvent<string>).detail === 'accepted') {
        loadGoogleAnalytics()
      }
    }
    window.addEventListener('nexora-analytics-consent', onConsent)
    return () => window.removeEventListener('nexora-analytics-consent', onConsent)
  }, [])

  return null
}
