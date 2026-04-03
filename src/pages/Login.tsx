import { useEffect, useState } from 'react'
import { Link, Navigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '@/lib/auth'

const SCREEN_LIMIT_ERROR_STORAGE_KEY = 'nexora_screen_limit_error_v1'

export default function Login() {
  const { session, signIn, loading, authError } = useAuth()
  const [searchParams] = useSearchParams()
  const demoMode = searchParams.get('mode') === 'demo'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (authError) setError(authError)
  }, [authError])

  useEffect(() => {
    const persistedError = window.localStorage.getItem(SCREEN_LIMIT_ERROR_STORAGE_KEY)
    if (!persistedError) return
    setError(persistedError)
    window.localStorage.removeItem(SCREEN_LIMIT_ERROR_STORAGE_KEY)
  }, [])

  if (loading) return null
  if (session) return <Navigate to={demoMode ? '/demo-access' : '/dashboard'} replace />

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    const { error: signInError } = await signIn(email, password)
    setSubmitting(false)
    if (signInError) setError(signInError)
  }

  async function handleGoogleSignIn() {
    // TODO: Configurer l'authentification Google via Supabase
    // supabase.auth.signInWithOAuth({ provider: 'google' })
    setError('La connexion Google sera disponible prochainement.')
  }

  const inputStyle: React.CSSProperties = {
    border: '1px solid #E5E5E5',
    borderRadius: '8px',
    color: '#1D1D1F',
    background: '#FFFFFF',
  }

  return (
    <div className="flex min-h-screen" style={{ background: '#FFFFFF' }}>
      {/* ── Left: Image ── */}
      <div className="relative hidden w-1/2 lg:block">
        <img
          src="https://images.unsplash.com/photo-1580674285054-bed31e145f59?auto=format&fit=crop&w=1200&q=80"
          alt="Flotte de camions sur la route"
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, rgba(0,0,0,0.03) 0%, rgba(0,0,0,0.25) 100%)' }} />
        <div className="absolute left-12 top-10">
          <Link to="/" className="text-sm font-medium text-white/80 transition-colors hover:text-white">
            ← Accueil
          </Link>
        </div>
        <div className="absolute bottom-12 left-12 right-12">
          <p className="text-3xl font-bold leading-tight text-white" style={{ textShadow: '0 2px 20px rgba(0,0,0,0.3)' }}>
            Pilotez votre exploitation.{'\n'}Simplement.
          </p>
          <p className="mt-3 text-base text-white/80">
            +120 transporteurs font confiance à NEXORA Truck.
          </p>
        </div>
      </div>

      {/* ── Right: Form ── */}
      <div className="flex w-full flex-col items-center justify-center px-6 lg:w-1/2" style={{ paddingInline: 'clamp(24px, 6vw, 80px)' }}>
        <div className="w-full max-w-sm">
          {/* Logo */}
          <Link to="/" className="text-2xl font-bold tracking-tight" style={{ fontFamily: 'Outfit, Inter, sans-serif', color: '#000000' }}>
            NEXORA
          </Link>
          <p className="mt-1 text-sm" style={{ color: '#86868B' }}>Plateforme de gestion transport</p>

          <h1 className="mt-10 text-3xl font-bold" style={{ color: '#000000' }}>
            Connexion
          </h1>
          <p className="mt-2" style={{ color: '#6E6E73', fontSize: '16px' }}>
            Accédez à votre espace de gestion NEXORA Truck.
          </p>

          {/* Google Sign In */}
          <button
            type="button"
            onClick={handleGoogleSignIn}
            className="mt-8 flex w-full items-center justify-center gap-3 py-3 text-sm font-medium transition-colors"
            style={{ ...inputStyle, color: '#1D1D1F' }}
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
            </svg>
            Continuer avec Google
          </button>

          {/* Divider */}
          <div className="my-6 flex items-center gap-4">
            <div className="h-px flex-1" style={{ background: '#E5E5E5' }} />
            <span className="text-xs" style={{ color: '#86868B' }}>ou</span>
            <div className="h-px flex-1" style={{ background: '#E5E5E5' }} />
          </div>

          {/* Email/Password form */}
          <form onSubmit={handleSubmit} className="grid gap-4">
            <label className="grid gap-1.5">
              <span className="text-sm font-medium" style={{ color: '#1D1D1F' }}>Adresse email</span>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoComplete="email"
                placeholder="vous@entreprise.fr"
                className="w-full px-4 py-3 text-base outline-none transition-colors focus:border-[#2563EB]"
                style={inputStyle}
              />
            </label>

            <label className="grid gap-1.5">
              <span className="text-sm font-medium" style={{ color: '#1D1D1F' }}>Mot de passe</span>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                placeholder="••••••••"
                className="w-full px-4 py-3 text-base outline-none transition-colors focus:border-[#2563EB]"
                style={inputStyle}
              />
            </label>

            {error && (
              <div className="rounded-lg px-4 py-3 text-sm" style={{ background: '#FEF2F2', color: '#991B1B', border: '1px solid #FECACA' }}>
                {translateError(error)}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="mt-2 w-full py-3 text-sm font-semibold text-white transition-colors disabled:opacity-50"
              style={{ background: '#2563EB', borderRadius: '8px' }}
            >
              {submitting ? 'Connexion en cours...' : 'Se connecter'}
            </button>
          </form>

          {/* Footer links */}
          <div className="mt-8 text-center">
            <p className="text-sm" style={{ color: '#6E6E73' }}>
              Pas encore de compte ?{' '}
              <Link to="/connexion-erp" className="font-semibold" style={{ color: '#2563EB' }}>
                Essai gratuit
              </Link>
            </p>
          </div>

          <div className="mt-10 grid gap-2 text-center text-xs" style={{ color: '#86868B' }}>
            <p>NEXORA Truck — Accès sécurisé</p>
            <div className="flex justify-center gap-3">
              <Link to="/mentions-legales-public" className="underline underline-offset-2 transition-colors hover:text-[#1D1D1F]">
                Mentions légales
              </Link>
              <Link to="/politique-confidentialite" className="underline underline-offset-2 transition-colors hover:text-[#1D1D1F]">
                Confidentialité
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function translateError(err: string): string {
  if (err.includes('Trop d\'ecrans ouverts') || err.includes('SCREEN_LIMIT_EXCEEDED')) {
    return "Trop d'ecrans ouverts pour ce compte. Fermez un autre ecran puis reconnectez-vous."
  }
  if (err.includes('Invalid login credentials')) return 'Email ou mot de passe incorrect.'
  if (err.includes('Email not confirmed')) return 'Email non confirmé. Vérifiez votre boîte mail.'
  if (err.includes('Too many requests')) return 'Trop de tentatives. Attendez quelques minutes.'
  if (err.includes('Google')) return err
  if (
    err.includes('Failed to fetch')
    || err.includes('NetworkError')
    || err.includes('ERR_CONNECTION_TIMED_OUT')
  ) {
    return 'Connexion impossible au serveur. Vérifiez le réseau.'
  }
  if (err.includes('timed out')) return 'Le serveur met trop de temps à répondre.'
  return err
}
