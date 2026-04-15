/**
 * ImpersonationBanner.tsx
 * Bandeau visible en haut de toutes les pages quand un super admin
 * est en mode test (impersonation par rôle/tenant).
 */

import { useAuth } from '@/lib/auth'

export default function ImpersonationBanner() {
  const { impersonation, exitImpersonation, isPlatformAdmin } = useAuth()

  if (!isPlatformAdmin || !impersonation) return null

  const timeLeft = Math.max(0, Math.round((new Date(impersonation.expiresAt).getTime() - Date.now()) / 60000))

  return (
    <div className="sticky top-0 z-[9999] flex items-center justify-between gap-3 bg-amber-500 px-4 py-2 text-sm font-semibold text-amber-950 shadow-lg">
      <div className="flex items-center gap-3">
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-700 text-xs text-white">
          ⚡
        </span>
        <span>
          MODE TEST — Tenant{' '}
          <strong className="underline underline-offset-2">{impersonation.tenantName}</strong>
          {' — Rôle '}
          <strong className="underline underline-offset-2">{impersonation.roleLabel}</strong>
        </span>
        <span className="rounded-full bg-amber-700/20 px-2 py-0.5 text-xs font-medium">
          {timeLeft > 0 ? `${timeLeft} min restantes` : 'Expiré'}
        </span>
      </div>
      <button
        type="button"
        onClick={() => void exitImpersonation()}
        className="rounded-lg bg-amber-950 px-3 py-1.5 text-xs font-semibold text-amber-100 transition-colors hover:bg-amber-900"
      >
        Quitter le mode test
      </button>
    </div>
  )
}
