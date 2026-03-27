import { useEffect } from 'react'
import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import SessionPicker from '@/pages/SessionPicker'

function FullscreenSpinner() {
  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-slate-600 border-t-white rounded-full animate-spin" />
    </div>
  )
}

export default function RequireAuth() {
  const { session, loading, profil, isAdmin, sessionRole, profilLoading, authError, reloadProfil, signOut } = useAuth()

  useEffect(() => {
    if (!session?.user || profil !== null || profilLoading) return

    let active = true

    void (async () => {
      try {
        await supabase.from('profils').insert({ user_id: session.user.id, role: 'exploitant' })
      } finally {
        if (active) await reloadProfil()
      }
    })()

    return () => {
      active = false
    }
  }, [session?.user?.id, profil, profilLoading, reloadProfil])

  if (loading || (session?.user && profilLoading)) return <FullscreenSpinner />

  if (!session) return <Navigate to="/login" replace />

  if (!profil) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
        <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6 text-white shadow-2xl">
          <h2 className="text-lg font-semibold">Profil indisponible</h2>
          <p className="mt-2 text-sm text-slate-400">
            {authError ?? "Le profil utilisateur n'a pas pu etre charge."}
          </p>
          <div className="mt-5 flex gap-3">
            <button
              type="button"
              onClick={() => void reloadProfil()}
              className="rounded-lg bg-white px-4 py-2 text-sm font-medium text-slate-900 hover:bg-slate-100"
            >
              Reessayer
            </button>
            <button
              type="button"
              onClick={() => void signOut()}
              className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-300 hover:bg-slate-800"
            >
              Se deconnecter
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (isAdmin && !sessionRole) return <SessionPicker />

  return <Outlet />
}
