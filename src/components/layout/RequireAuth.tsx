import { useEffect } from 'react'
import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '@/lib/auth'
import { supabase } from '@/lib/supabase'

export default function RequireAuth() {
  const { session, loading, role, reloadProfil } = useAuth()

  // Crée le profil automatiquement à la première connexion
  useEffect(() => {
    if (!session?.user || role !== null) return
    supabase
      .from('profils')
      .insert({ user_id: session.user.id, role: 'exploitant' })
      .then(() => reloadProfil())
  }, [session, role])

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-slate-600 border-t-white rounded-full animate-spin" />
      </div>
    )
  }

  if (!session) return <Navigate to="/login" replace />

  return <Outlet />
}
