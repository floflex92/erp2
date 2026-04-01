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
    <div className="fixed inset-x-0 bottom-4 z-50 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-[1240px] flex-col gap-4 rounded-[1.6rem] border border-white/70 bg-[rgba(15,23,42,0.94)] px-5 py-4 text-white shadow-[0_24px_80px_rgba(15,23,42,0.35)] backdrop-blur sm:flex-row sm:items-end sm:justify-between sm:px-6">
        <div className="max-w-3xl">
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-sky-200">Cookies</p>
          <p className="mt-2 text-sm leading-7 text-slate-200">
            NEXORA Truck utilise des cookies et stockages techniques necessaires au fonctionnement du site, a la
            conservation de vos preferences et a la mesure technique d audience. Vous pouvez consulter le detail dans la{' '}
            <Link to="/politique-confidentialite" className="font-semibold text-white underline underline-offset-2 hover:text-sky-200">
              politique de confidentialite
            </Link>
            .
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={closeBanner}
            className="rounded-full border border-white/20 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-white/10"
          >
            Plus tard
          </button>
          <button
            type="button"
            onClick={acceptCookies}
            className="rounded-full bg-[#fb923c] px-4 py-2 text-sm font-semibold text-slate-950 transition-colors hover:bg-[#fdba74]"
          >
            Accepter
          </button>
        </div>
      </div>
    </div>
  )
}