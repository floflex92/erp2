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
  const { session, loading, profil, isAdmin, sessionRole, profilLoading, reloadProfil } = useAuth()

  useEffect(() => {
    if (!session?.user || profil !== null || profilLoading) return

    let active = true

    void (async () => {
      try {
        await supabase.from('profils').insert({ user_id: session.user.id, role: 'admin' })
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

  if (isAdmin && !sessionRole) return <SessionPicker />

  return <Outlet />
}
