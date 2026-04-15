import { useEffect, useState } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth, fallbackRoleFromEmail } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import { clearDemoAndMockLocalData } from '@/lib/demoDataCleanup'

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
  const { session, loading, accountProfil, canUseSessionPicker, sessionRole, profilLoading, reloadProfil, authError, isPlatformAdmin, impersonation } = useAuth()
  const location = useLocation()
  const [bootstrapTick, setBootstrapTick] = useState(0)
  const [bootstrapping, setBootstrapping] = useState(false)
  const [bootstrapError, setBootstrapError] = useState<string | null>(null)

  useEffect(() => {
    if (!session?.user || accountProfil !== null || profilLoading) return
    // Si authError est set (loadProfil a echoue), le bootstrap ne tente pas d'INSERT
    // mais reloadProfil() sera appele via le bouton Reessayer directement.

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

        const privilegedBootstrapRole = fallbackRoleFromEmail(session.user.email)
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
  }, [session?.user, session?.user?.id, accountProfil, profilLoading, reloadProfil, bootstrapTick])

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
        onRetry={() => {
          // Si le profil exist deja en base (authError apres loadProfil),
          // on force juste un reload du profil. Sinon on relance le bootstrap insert.
          if (authError) {
            setBootstrapError(null)
            void reloadProfil()
          } else {
            setBootstrapTick(value => value + 1)
          }
        }}
      />
    )
  }

  if (canUseSessionPicker && !sessionRole && !isPlatformAdmin && location.pathname !== '/session-picker') return <Navigate to="/session-picker" replace />

  // Platform admin sans session d'impersonation → backoffice plateforme
  if (isPlatformAdmin && !impersonation && !sessionRole && location.pathname !== '/super-admin' && location.pathname !== '/session-picker') {
    return <Navigate to="/super-admin" replace />
  }

  return <Outlet />
}
