import { useEffect, useState } from 'react'
import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import { clearDemoAndMockLocalData } from '@/lib/demoDataCleanup'
import SessionPicker from '@/pages/SessionPicker'

const RESERVED_BOOTSTRAP_ROLE_BY_EMAIL: Record<string, 'admin' | 'dirigeant'> = {
  'admin@erp-demo.fr': 'admin',
  'contact@nexora-truck.fr': 'admin',
  'direction@erp-demo.fr': 'dirigeant',
  'chabre.florent@gmail.com': 'admin',
}

function resolvePrivilegedBootstrapRole(user: NonNullable<ReturnType<typeof useAuth>['session']>['user']): 'admin' | 'dirigeant' | null {
  const email = typeof user.email === 'string' ? user.email.trim().toLowerCase() : ''
  if (email && RESERVED_BOOTSTRAP_ROLE_BY_EMAIL[email]) return RESERVED_BOOTSTRAP_ROLE_BY_EMAIL[email]
  if (email) {
    const localPart = email.split('@')[0] ?? ''
    if (localPart === 'admin') return 'admin'
    if (localPart === 'direction' || localPart === 'dirigeant') return 'dirigeant'
  }

  const appRole = typeof user.app_metadata?.role === 'string' ? user.app_metadata.role.trim().toLowerCase() : null
  if (appRole === 'admin' || appRole === 'dirigeant') return appRole

  const userRole = typeof user.user_metadata?.role === 'string' ? user.user_metadata.role.trim().toLowerCase() : null
  if (userRole === 'admin' || userRole === 'dirigeant') return userRole

  return null
}

function FullscreenSpinner() {
  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-slate-600 border-t-white rounded-full animate-spin" />
    </div>
  )
}

function ProfileBootstrapScreen({
  busy,
  error,
  onRetry,
}: {
  busy: boolean
  error: string | null
  onRetry: () => void
}) {
  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-xl rounded-2xl border border-slate-800 bg-slate-900 p-8 shadow-2xl">
        <h2 className="text-xl font-semibold text-white">Initialisation du profil</h2>
        <p className="mt-2 text-sm text-slate-400">
          La session est ouverte, mais aucun profil applicatif n&apos;existe encore dans Supabase. Tant que cette ligne n&apos;est pas creee dans
          `public.profils`, les ecritures et le mock data restent bloques par les policies RLS.
        </p>
        {error && (
          <div className="mt-4 rounded-xl border border-red-800 bg-red-900/30 px-4 py-3 text-sm text-red-300">
            {error}
          </div>
        )}
        <div className="mt-6 flex items-center gap-3">
          <button
            type="button"
            onClick={onRetry}
            disabled={busy}
            className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-slate-900 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {busy ? 'Initialisation...' : 'Reessayer'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function RequireAuth() {
  const { session, loading, accountProfil, canUseSessionPicker, sessionRole, profilLoading, reloadProfil, authError } = useAuth()
  const [bootstrapTick, setBootstrapTick] = useState(0)
  const [bootstrapping, setBootstrapping] = useState(false)
  const [bootstrapError, setBootstrapError] = useState<string | null>(null)

  useEffect(() => {
    if (!session?.user || accountProfil !== null || profilLoading || authError) return

    let active = true

    ;(async () => {
      try {
        if (active) {
          setBootstrapping(true)
          setBootstrapError(null)
        }

        // Never overwrite an existing profile role during bootstrap.
        // If profile loading failed transiently, this prevents accidental role downgrade.
        const { data: existingProfile, error: existingProfileError } = await supabase
          .from('profils')
          .select('id')
          .eq('user_id', session.user.id)
          .maybeSingle()

        if (existingProfileError) throw existingProfileError
        if (existingProfile?.id) return

        const { count } = await supabase
          .from('profils')
          .select('id', { head: true, count: 'exact' })

        const privilegedBootstrapRole = resolvePrivilegedBootstrapRole(session.user)
        const bootstrapRole = privilegedBootstrapRole ?? ((count ?? 0) === 0 ? 'admin' : 'exploitant')
        const { error } = await supabase.from('profils').insert({
          user_id: session.user.id,
          matricule: `USR-${session.user.id.slice(0, 8).toUpperCase()}`,
          role: bootstrapRole,
          nom: typeof session.user.user_metadata?.nom === 'string' ? session.user.user_metadata.nom : null,
          prenom: typeof session.user.user_metadata?.prenom === 'string' ? session.user.user_metadata.prenom : null,
        })

        // If another concurrent flow created the row first, treat as success.
        if (error && error.code !== '23505') throw error
      } finally {
        if (active) {
          await reloadProfil()
          setBootstrapping(false)
        }
      }
    })().catch(err => {
      if (!active) return
      const message = err instanceof Error ? err.message : "Impossible de creer le profil applicatif."
      setBootstrapError(message)
      setBootstrapping(false)
    })

    return () => {
      active = false
    }
  }, [session?.user, session?.user?.id, accountProfil, profilLoading, authError, reloadProfil, bootstrapTick])

  useEffect(() => {
    clearDemoAndMockLocalData()
  }, [session?.user, session?.user?.id])

  if (loading || (session?.user && profilLoading)) return <FullscreenSpinner />

  if (!session) return <Navigate to="/login" replace />

  if (!accountProfil) {
    return (
      <ProfileBootstrapScreen
        busy={bootstrapping}
        error={bootstrapError ?? authError}
        onRetry={() => setBootstrapTick(value => value + 1)}
      />
    )
  }

  if (canUseSessionPicker && !sessionRole) return <SessionPicker />

  return <Outlet />
}
