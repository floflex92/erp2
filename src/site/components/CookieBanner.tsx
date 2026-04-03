import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

export const COOKIE_CONSENT_STORAGE_KEY = 'nexora-cookie-consent-v1'
const COOKIE_PREFERENCES_EVENT = 'nexora-cookie-preferences-open'

export function reopenCookiePreferences() {
  if (typeof window === 'undefined') return
  window.localStorage.removeItem(COOKIE_CONSENT_STORAGE_KEY)
  window.dispatchEvent(new CustomEvent(COOKIE_PREFERENCES_EVENT))
}

export default function CookieBanner() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const stored = window.localStorage.getItem(COOKIE_CONSENT_STORAGE_KEY)
    setVisible(!stored)

    const openPreferences = () => setVisible(true)
    window.addEventListener(COOKIE_PREFERENCES_EVENT, openPreferences)

    return () => {
      window.removeEventListener(COOKIE_PREFERENCES_EVENT, openPreferences)
    }
  }, [])

  function acceptCookies() {
    window.localStorage.setItem(COOKIE_CONSENT_STORAGE_KEY, 'accepted')
    setVisible(false)
  }

  function closeBanner() {
    window.localStorage.setItem(COOKIE_CONSENT_STORAGE_KEY, 'dismissed')
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div className="fixed inset-x-0 bottom-4 z-50" style={{ paddingInline: 'clamp(16px, 4vw, 80px)' }}>
      <div
        className="mx-auto flex w-full max-w-3xl flex-col gap-3 rounded-xl px-5 py-4 shadow-[0_8px_30px_rgba(0,0,0,0.08)] sm:flex-row sm:items-center sm:justify-between"
        style={{ background: '#FFFFFF', border: '1px solid #E5E5E5' }}
      >
        <div className="max-w-xl">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: '#1D1D1F' }}>Cookies</p>
          <p className="mt-1 text-sm leading-6" style={{ color: '#6E6E73' }}>
            Ce site utilise des cookies techniques pour assurer son bon fonctionnement. Détails dans notre{' '}
            <Link to="/politique-confidentialite" className="font-semibold underline underline-offset-2" style={{ color: '#2563EB' }}>
              politique de confidentialité
            </Link>
            .
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <button
            type="button"
            onClick={closeBanner}
            className="rounded-lg px-4 py-2 text-sm font-medium transition-colors"
            style={{ color: '#6E6E73', border: '1px solid #E5E5E5' }}
          >
            Plus tard
          </button>
          <button
            type="button"
            onClick={acceptCookies}
            className="rounded-lg px-4 py-2 text-sm font-semibold text-white transition-colors"
            style={{ background: '#2563EB' }}
          >
            Accepter
          </button>
        </div>
      </div>
    </div>
  )
}
