import { useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import NexoraTruckLogo from '@/components/layout/NexoraTruckLogo'
import { useAuth } from '@/lib/auth'

export default function Login() {
  const { session, signIn, loading } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  if (loading) return null
  if (session) return <Navigate to="/dashboard" replace />

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    const { error: signInError } = await signIn(email, password)
    setSubmitting(false)
    if (signInError) setError(signInError)
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 p-4">
      <div className="w-full max-w-sm">
        <div className="mb-10 flex justify-center">
          <NexoraTruckLogo dark size="lg" subtitle="Portail collaborateurs" />
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-8 shadow-2xl">
          <h2 className="mb-1 text-xl font-semibold text-white">Connexion</h2>
          <p className="mb-7 text-sm text-slate-500">Acces reserve aux administrateurs</p>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-400">Adresse email</label>
              <input
                type="email"
                value={email}
                onChange={event => setEmail(event.target.value)}
                required
                autoComplete="email"
                placeholder="admin@exemple.fr"
                className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-sm text-white outline-none transition-colors placeholder:text-slate-600 focus:border-slate-500 focus:ring-1 focus:ring-slate-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-400">Mot de passe</label>
              <input
                type="password"
                value={password}
                onChange={event => setPassword(event.target.value)}
                required
                autoComplete="current-password"
                placeholder="........"
                className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-sm text-white outline-none transition-colors placeholder:text-slate-600 focus:border-slate-500 focus:ring-1 focus:ring-slate-500"
              />
            </div>

            {error && (
              <div className="rounded-xl border border-red-800 bg-red-900/30 px-4 py-3">
                <p className="text-sm text-red-400">{translateError(error)}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="mt-2 w-full rounded-xl bg-white py-3 text-sm font-semibold text-slate-900 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting ? 'Connexion en cours...' : 'Se connecter'}
            </button>
          </form>
        </div>

        <p className="mt-6 text-center text-xs text-slate-600">NEXORA truck - Acces securise</p>
        <div className="mt-2 text-center text-xs text-slate-500">
          <Link to="/mentions-legales-public" className="underline underline-offset-2 hover:text-slate-300">
            Consulter les mentions legales
          </Link>
        </div>
      </div>
    </div>
  )
}

function translateError(err: string): string {
  if (err.includes('Invalid login credentials')) return 'Email ou mot de passe incorrect.'
  if (err.includes('Email not confirmed')) return 'Email non confirme. Verifiez votre boite mail.'
  if (err.includes('Too many requests')) return 'Trop de tentatives. Attendez quelques minutes.'
  if (
    err.includes('Failed to fetch')
    || err.includes('NetworkError')
    || err.includes('ERR_CONNECTION_TIMED_OUT')
  ) {
    return 'Connexion impossible au serveur Supabase. Verifiez le reseau/VPN/pare-feu (acces IPv4 requis).'
  }
  if (err.includes('timed out')) return 'Le serveur met trop de temps a repondre. Reessayez dans quelques secondes.'
  return err
}

