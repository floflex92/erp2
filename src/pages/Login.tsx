import { useEffect, useState } from 'react'
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { firstPage, useAuth } from '@/lib/auth'
import { sitePhotos } from '@/site/lib/sitePhotos'

type DemoStatus = 'idle' | 'loading' | 'success' | 'error'

export default function Login() {
  const { session, signIn, loading, profilLoading, authError, canUseSessionPicker, sessionRole, role, tenantAllowedPages, enabledModules } = useAuth()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const demoMode = searchParams.get('mode') === 'demo'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  // ── Mode démo ──────────────────────────────────────────────────────────────
  const [showDemo, setShowDemo] = useState(false)
  const [demoEmail, setDemoEmail] = useState('')
  const [demoStatus, setDemoStatus] = useState<DemoStatus>('idle')
  const [demoError, setDemoError] = useState<string | null>(null)

  async function handleDemoSubmit(e: React.FormEvent) {
    e.preventDefault()
    setDemoError(null)
    setDemoStatus('loading')

    try {
      const res = await fetch('/.netlify/functions/demo-magic-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: demoEmail.trim().toLowerCase() }),
      })
      const data = await res.json()

      if (!res.ok || !data.hashed_token) {
        setDemoError(data.error ?? 'Erreur inattendue. Réessayez.')
        setDemoStatus('error')
        return
      }

      // Vérification OTP côté client — bypass total du site_url Supabase
      const { error: otpError } = await supabase.auth.verifyOtp({
        token_hash: data.hashed_token,
        type: 'magiclink',
      })

      if (otpError) {
        setDemoError('Lien invalide ou expiré. Réessayez.')
        setDemoStatus('error')
        return
      }

      setDemoStatus('success')
      // Redirection simple vers le dashboard — le rôle sera lu depuis le profil en base
      navigate('/dashboard', { replace: true })
    } catch {
      setDemoError('Connexion impossible. Vérifiez votre réseau.')
      setDemoStatus('error')
    }
  }

  useEffect(() => {
    if (authError) {
      setError(authError)
      setSubmitting(false)
    }
  }, [authError])

  useEffect(() => {
    // Propager les erreurs persistantes éventuelles (laissées par d'anciens flux)
    const persistedError = window.localStorage.getItem('nexora_screen_limit_error_v1')
    if (!persistedError) return
    setError(persistedError)
    window.localStorage.removeItem('nexora_screen_limit_error_v1')
  }, [])

  if (loading || profilLoading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-slate-950 px-6 text-white">
        <span className="text-sm font-medium text-slate-300">Chargement de l'espace de connexion...</span>
        <div className="h-7 w-7 animate-spin rounded-full border-2 border-slate-600 border-t-white" aria-hidden="true" />
      </div>
    )
  }

  if (session) {
    if (demoMode) return <Navigate to="/demo-access" replace />
    if (canUseSessionPicker && !sessionRole) return <Navigate to="/session-picker" replace />
    if (role) return <Navigate to={firstPage(role, tenantAllowedPages, enabledModules)} replace />

    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-slate-950 px-6 text-white">
        <span className="text-sm font-medium text-slate-300">Initialisation de votre session...</span>
        <div className="h-7 w-7 animate-spin rounded-full border-2 border-slate-600 border-t-white" aria-hidden="true" />
      </div>
    )
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    const { error: signInError } = await signIn(email, password)
    setSubmitting(false)
    if (signInError) setError(signInError)
  }

  const inputStyle: React.CSSProperties = {
    border: '1px solid #DBE2EC',
    borderRadius: '10px',
    color: '#1B1B1B',
    background: '#FFFFFF',
  }

  return (
    <div className="flex min-h-screen" style={{ background: '#F7F8FA' }}>
      {/* ── Left: Dark immersive panel with truck image ── */}
      <div
        className="relative hidden w-1/2 overflow-hidden lg:block"
        style={{ background: 'linear-gradient(180deg,#0A1024 0%,#0B132B 55%,#0A1024 100%)' }}
      >
        {/* Background truck image (darkened) */}
        <img
          src={sitePhotos.loginHero.src(1600)}
          srcSet={sitePhotos.loginHero.srcSet([768, 1200, 1600])}
          sizes="50vw"
          alt=""
          aria-hidden="true"
          className="absolute inset-0 h-full w-full object-cover"
          style={{ filter: 'brightness(0.58) saturate(1.05)' }}
        />
        {/* Global dark veil */}
        <div className="absolute inset-0" style={{ background: 'rgba(6,11,24,0.55)' }} />
        {/* Left-column strong gradient for text area */}
        <div
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(90deg, rgba(6,11,24,0.92) 0%, rgba(6,11,24,0.78) 35%, rgba(6,11,24,0.35) 65%, rgba(6,11,24,0.55) 100%)',
          }}
        />
        {/* Top/bottom vignette */}
        <div
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(180deg, rgba(6,11,24,0.55) 0%, rgba(6,11,24,0) 20%, rgba(6,11,24,0) 70%, rgba(6,11,24,0.75) 100%)',
          }}
        />

        {/* Logo + back link */}
        <div className="absolute left-12 top-10 flex items-center gap-6">
          <Link to="/" aria-label="NEXORA accueil" className="inline-flex items-center">
            <img
              src="/site/logo/brand/nexora-logo-light.png"
              onError={(e) => { (e.currentTarget as HTMLImageElement).src = '/site/logo/brand/nexora-logo-dark.png' }}
              alt="NEXORA"
              className="h-9 w-auto object-contain"
            />
          </Link>
        </div>

        {/* Headline */}
        <div className="relative flex h-full flex-col justify-between px-12 py-12">
          <div className="mt-24 max-w-lg">
            {/* Pill */}
            <span
              className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em]"
              style={{
                background: 'rgba(15,23,42,0.7)',
                color: '#E2E8F0',
                border: '1px solid rgba(148,163,184,0.35)',
                backdropFilter: 'blur(8px)',
              }}
            >
              Plateforme de gestion transport
            </span>
            <h2
              className="mt-6 font-bold leading-[1.05] text-white"
              style={{ fontSize: 'clamp(2.4rem, 3.6vw, 3.2rem)', letterSpacing: '-0.02em', textShadow: '0 2px 28px rgba(0,0,0,0.85), 0 1px 3px rgba(0,0,0,0.6)' }}
            >
              Pilotez votre exploitation.{' '}
              <span
                style={{
                  background: 'linear-gradient(90deg,#38BDF8 0%,#60A5FA 55%,#22D3EE 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                  filter: 'drop-shadow(0 2px 12px rgba(34,211,238,0.35))',
                }}
              >
                En toute simplicité.
              </span>
            </h2>
            <p className="mt-5 text-base leading-relaxed" style={{ color: '#E2E8F0', textShadow: '0 1px 8px rgba(0,0,0,0.6)' }}>
              Accédez à votre espace de gestion NEXORA Truck et gardez le contrôle de votre activité en temps réel.
            </p>

            {/* Proof list vertical with icon tiles (glass cards) */}
            <ul className="mt-8 grid gap-3">
              {([
                ['Performance optimisée', 'Suivez vos indicateurs clés en temps réel.', (<><path d="M4 18l5-5 3 3 6-7" /><path d="M14 9h4v4" /></>)],
                ['Données sécurisées', 'Vos informations sont protégées avec les plus hauts standards.', (<><path d="M12 3l8 3v6c0 4.5-3.2 8.2-8 9-4.8-.8-8-4.5-8-9V6z" /><path d="M9 12l2 2 4-4" /></>)],
                ['Équipe connectée', 'Collaborez facilement avec vos équipes et partenaires.', (<><circle cx="9" cy="8" r="3" /><circle cx="17" cy="9" r="2.5" /><path d="M3 20c0-3 3-5 6-5s6 2 6 5M14 20c0-2.5 2-4 4-4s4 1.5 4 4" /></>)],
                ['Gain de temps', 'Automatisez vos tâches et concentrez-vous sur l\'essentiel.', (<><path d="M13 2L4 14h7l-1 8 9-12h-7z" /></>)],
              ] as const).map(([title, desc, icon]) => (
                <li
                  key={title}
                  className="flex items-start gap-4 rounded-xl px-4 py-3"
                  style={{
                    background: 'rgba(15,23,42,0.55)',
                    border: '1px solid rgba(148,163,184,0.18)',
                    backdropFilter: 'blur(8px)',
                    WebkitBackdropFilter: 'blur(8px)',
                  }}
                >
                  <div
                    className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg"
                    style={{
                      background: 'linear-gradient(135deg, rgba(56,189,248,0.22), rgba(34,211,238,0.15))',
                      border: '1px solid rgba(56,189,248,0.35)',
                    }}
                  >
                    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="#7DD3FC" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
                      {icon}
                    </svg>
                  </div>
                  <div className="pt-0.5">
                    <p className="text-[14px] font-bold text-white">{title}</p>
                    <p className="mt-0.5 text-[12.5px] leading-[1.55]" style={{ color: '#CBD5E1' }}>{desc}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          {/* Trust footer */}
          <div className="mt-10 flex items-center gap-2 text-[12.5px] font-medium" style={{ color: '#E2E8F0', textShadow: '0 1px 6px rgba(0,0,0,0.6)' }}>
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="#7DD3FC" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M12 3l8 3v6c0 4.5-3.2 8.2-8 9-4.8-.8-8-4.5-8-9V6z" />
              <path d="M9 12l2 2 4-4" />
            </svg>
            +120 transporteurs font confiance à NEXORA Truck.
          </div>
        </div>
      </div>

      {/* ── Right: Form ── */}
      <div className="flex w-full flex-col items-center justify-center px-6 py-10 lg:w-1/2" style={{ paddingInline: 'clamp(24px, 5vw, 72px)', background: '#F5F7FA' }}>
        <div className="w-full max-w-md">
          {/* Logo */}
          <Link to="/" className="inline-flex items-center" aria-label="NEXORA accueil">
            <img
              src="/site/logo/brand/nexora-logo-dark.png"
              alt="NEXORA"
              className="h-9 w-auto object-contain"
              loading="eager"
              decoding="async"
            />
          </Link>
          <p className="mt-1 text-sm" style={{ color: '#64748B' }}>Plateforme de gestion transport</p>

          {showDemo ? (
            /* ── Panneau Essai gratuit ──────────────────────────────────────── */
            <>
              <h1 className="mt-10 text-3xl font-bold" style={{ color: '#0B1F3A' }}>
                Accès démo
              </h1>
              <p className="mt-2" style={{ color: '#475569', fontSize: '16px' }}>
                Entrez votre email pour accéder à l'ERP en mode découverte — sans mot de passe.
              </p>

              {demoStatus === 'success' ? (
                <div className="mt-10 rounded-xl px-6 py-8 text-center" style={{ background: '#F0FDF4', border: '1px solid #86EFAC' }}>
                  <p className="text-base font-semibold" style={{ color: '#166534' }}>Connexion en cours…</p>
                  <p className="mt-1 text-sm" style={{ color: '#15803D' }}>Vous allez être redirigé vers le tableau de bord.</p>
                </div>
              ) : (
                <form onSubmit={handleDemoSubmit} className="mt-10 grid gap-4">
                  <label className="grid gap-1.5">
                    <span className="text-sm font-medium" style={{ color: '#1B1B1B' }}>Adresse email</span>
                    <input
                      type="email"
                      value={demoEmail}
                      onChange={e => setDemoEmail(e.target.value)}
                      required
                      autoComplete="email"
                      autoFocus
                      placeholder="vous@entreprise.fr"
                      className="w-full px-4 py-3 text-base outline-none transition-colors focus:border-[#1F4E8C]"
                      style={inputStyle}
                      disabled={demoStatus === 'loading'}
                    />
                  </label>

                  {demoError && (
                    <div className="rounded-lg px-4 py-3 text-sm" style={{ background: '#FEF2F2', color: '#991B1B', border: '1px solid #FECACA' }}>
                      {demoError}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={demoStatus === 'loading'}
                    className="mt-2 w-full py-3 text-sm font-semibold text-white transition-colors disabled:opacity-50"
                    style={{ background: 'linear-gradient(135deg, #0B1F3A 0%, #1F4E8C 54%, #0EA5E9 100%)', borderRadius: '10px' }}
                  >
                    {demoStatus === 'loading' ? 'Accès en cours…' : 'Accéder à la démo'}
                  </button>
                </form>
              )}

              <div className="mt-6 text-center">
                <button
                  type="button"
                  onClick={() => { setShowDemo(false); setDemoEmail(''); setDemoStatus('idle'); setDemoError(null) }}
                  className="text-sm transition-colors hover:text-[#1D1D1F]"
                  style={{ color: '#64748B' }}
                >
                  ← Retour à la connexion
                </button>
              </div>
            </>
          ) : (
            /* ── Formulaire de connexion normal ─────────────────────────────── */
            <>
              <h1 className="mt-10 text-3xl font-bold" style={{ color: '#0B1F3A' }}>
                Connexion
              </h1>
              <p className="mt-2" style={{ color: '#475569', fontSize: '16px' }}>
                Accédez à votre espace de gestion NEXORA Truck.
              </p>

              {/* Email/Password form */}
              <form onSubmit={handleSubmit} className="mt-8 grid gap-4">
                <label className="grid gap-1.5">
                  <span className="text-sm font-medium" style={{ color: '#1B1B1B' }}>Adresse email</span>
                  <div className="relative">
                    <svg viewBox="0 0 24 24" className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2" fill="none" stroke="#94A3B8" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <rect x="3" y="5" width="18" height="14" rx="2" />
                      <path d="M3 7l9 6 9-6" />
                    </svg>
                    <input
                      type="email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      required
                      autoComplete="email"
                      placeholder="Votre adresse email"
                      className="w-full pl-10 pr-4 py-3 text-base outline-none transition-colors focus:border-[#1F4E8C]"
                      style={inputStyle}
                    />
                  </div>
                </label>

                <label className="grid gap-1.5">
                  <span className="text-sm font-medium" style={{ color: '#1B1B1B' }}>Mot de passe</span>
                  <div className="relative">
                    <svg viewBox="0 0 24 24" className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2" fill="none" stroke="#94A3B8" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <rect x="4" y="10" width="16" height="11" rx="2" />
                      <path d="M8 10V7a4 4 0 118 0v3" />
                    </svg>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      required
                      autoComplete="current-password"
                      placeholder="Votre mot de passe"
                      className="w-full pl-10 pr-12 py-3 text-base outline-none transition-colors focus:border-[#1F4E8C]"
                      style={inputStyle}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(v => !v)}
                      aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                      className="absolute right-3 top-1/2 -translate-y-1/2 rounded p-1 transition-colors hover:text-[#1F4E8C]"
                      style={{ color: '#94A3B8' }}
                    >
                      {showPassword ? (
                        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <path d="M17.94 17.94A10 10 0 0112 20c-7 0-10-8-10-8a18.5 18.5 0 014.22-5.94M9.9 4.24A10 10 0 0112 4c7 0 10 8 10 8a18.5 18.5 0 01-2.16 3.19M1 1l22 22" />
                          <path d="M14.12 14.12a3 3 0 01-4.24-4.24" />
                        </svg>
                      ) : (
                        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <path d="M1 12s3-8 11-8 11 8 11 8-3 8-11 8S1 12 1 12z" />
                          <circle cx="12" cy="12" r="3" />
                        </svg>
                      )}
                    </button>
                  </div>
                </label>

                {/* Remember + forgot */}
                <div className="flex items-center justify-between">
                  <label className="inline-flex cursor-pointer items-center gap-2 text-sm" style={{ color: '#475569' }}>
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={e => setRememberMe(e.target.checked)}
                      className="h-4 w-4 rounded border-slate-300 accent-[#1F4E8C]"
                    />
                    Se souvenir de moi
                  </label>
                  <Link to="/contact" className="text-sm font-semibold transition-colors hover:underline" style={{ color: '#1F4E8C' }}>
                    Mot de passe oublié ?
                  </Link>
                </div>

                {error && (
                  <div className="rounded-lg px-4 py-3 text-sm" style={{ background: '#FEF2F2', color: '#991B1B', border: '1px solid #FECACA' }}>
                    {translateError(error)}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={submitting}
                  className="mt-2 inline-flex w-full items-center justify-center gap-2 py-3 text-sm font-semibold text-white transition-colors disabled:opacity-50"
                  style={{ background: 'linear-gradient(135deg, #0B1F3A 0%, #1F4E8C 54%, #0EA5E9 100%)', borderRadius: '10px', boxShadow: '0 8px 24px -8px rgba(11,31,58,0.55)' }}
                >
                  <span>{submitting ? 'Connexion en cours...' : 'Se connecter'}</span>
                  {!submitting && (
                    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M5 12h14M13 6l6 6-6 6" />
                    </svg>
                  )}
                </button>
              </form>

              {/* Footer links */}
              <div className="mt-8 text-center">
                <p className="text-sm" style={{ color: '#64748B' }}>
                  Pas encore de compte ?{' '}
                  <button
                    type="button"
                    onClick={() => setShowDemo(true)}
                    className="font-semibold transition-colors hover:underline"
                    style={{ color: '#1F4E8C' }}
                  >
                    Essai gratuit
                  </button>
                </p>
              </div>
            </>
          )}

          {/* Trust strip */}
          <div
            className="mt-10 rounded-2xl px-5 py-4"
            style={{ background: '#FFFFFF', border: '1px solid #E5E7EB', boxShadow: '0 1px 2px rgba(15,23,42,0.04)' }}
          >
            <div className="grid grid-cols-3 gap-4">
              {([
                ['Accès sécurisé', 'Vos données sont protégées.', (<><rect x="4" y="10" width="16" height="11" rx="2" /><path d="M8 10V7a4 4 0 118 0v3" /></>)],
                ['Disponibilité 24/7', 'Accédez à votre activité à tout moment.', (<><path d="M4 14a8 8 0 1016 0A8 8 0 004 14z" /><path d="M12 10v4l2 2" /></>)],
                ['Support réactif', 'Notre équipe est là pour vous aider.', (<><path d="M4 14v-2a8 8 0 0116 0v2" /><rect x="3" y="14" width="4" height="6" rx="1.5" /><rect x="17" y="14" width="4" height="6" rx="1.5" /></>)],
              ] as const).map(([title, desc, icon]) => (
                <div key={title} className="flex items-start gap-2.5">
                  <svg viewBox="0 0 24 24" className="mt-0.5 h-4 w-4 flex-shrink-0" fill="none" stroke="#1F4E8C" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    {icon}
                  </svg>
                  <div>
                    <p className="text-[11.5px] font-semibold leading-tight" style={{ color: '#0B1F3A' }}>{title}</p>
                    <p className="mt-0.5 text-[10.5px] leading-[1.45]" style={{ color: '#64748B' }}>{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-6 grid gap-2 text-center text-xs" style={{ color: '#64748B' }}>
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
