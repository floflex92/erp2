import { useEffect, useState } from 'react'
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { firstPage, useAuth } from '@/lib/auth'
import { sitePhotos } from '@/site/lib/sitePhotos'
import { EVENTS, FUNNELS, FUNNEL_STEPS, trackEvent, trackFunnelStep, trackPageView } from '@/site/lib/analytics'

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

  // ── Reset mot de passe ─────────────────────────────────────────────────────
  const [showReset, setShowReset] = useState(false)
  const [resetEmail, setResetEmail] = useState('')
  const [resetStatus, setResetStatus] = useState<'idle' | 'loading' | 'sent' | 'error'>('idle')
  const [resetError, setResetError] = useState<string | null>(null)

  async function handleResetSubmit(e: React.FormEvent) {
    e.preventDefault()
    setResetError(null)
    setResetStatus('loading')
    const { error: resetErr } = await supabase.auth.resetPasswordForEmail(resetEmail.trim().toLowerCase(), {
      redirectTo: `${window.location.origin}/parametres`,
    })
    if (resetErr) {
      setResetError('Impossible d\'envoyer le lien. Vérifiez l\'email et réessayez.')
      setResetStatus('error')
    } else {
      setResetStatus('sent')
    }
  }

  // ── Mode démo ──────────────────────────────────────────────────────────────
  const [showDemo, setShowDemo] = useState(false)
  const [demoEmail, setDemoEmail] = useState('')
  const [demoStatus, setDemoStatus] = useState<DemoStatus>('idle')
  const [demoError, setDemoError] = useState<string | null>(null)

  async function handleDemoSubmit(e: React.FormEvent) {
    e.preventDefault()
    setDemoError(null)
    setDemoStatus('loading')
    trackEvent(EVENTS.LOGIN_DEMO_SUBMIT, { source: 'demo_magic_link' })
    trackFunnelStep(FUNNELS.MARKETING_DEMO, 'login_demo_submit', { source: 'demo_magic_link' })

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
        trackEvent(EVENTS.LOGIN_DEMO_ERROR, { stage: 'request_link' })
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
        trackEvent(EVENTS.LOGIN_DEMO_ERROR, { stage: 'verify_otp' })
        return
      }

      setDemoStatus('success')
      trackEvent(EVENTS.LOGIN_DEMO_SUCCESS, { source: 'demo_magic_link' })
      trackFunnelStep(FUNNELS.MARKETING_DEMO, 'login_demo_success', { source: 'demo_magic_link' })
      // Redirection simple vers le dashboard — le rôle sera lu depuis le profil en base
      navigate('/dashboard', { replace: true })
    } catch {
      setDemoError('Connexion impossible. Vérifiez votre réseau.')
      setDemoStatus('error')
      trackEvent(EVENTS.LOGIN_DEMO_ERROR, { stage: 'network' })
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

  useEffect(() => {
    trackPageView('/login')
    trackFunnelStep(FUNNELS.MARKETING_DEMO, 'login_view', { mode: demoMode ? 'demo' : 'standard' })
  }, [demoMode])

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
    trackEvent(EVENTS.LOGIN_SUBMIT, { remember_me: rememberMe })
    trackFunnelStep(FUNNELS.AUTH_LOGIN, FUNNEL_STEPS.AUTH_LOGIN.SUBMIT, { remember_me: rememberMe })
    const { error: signInError } = await signIn(email, password)
    setSubmitting(false)
    if (signInError) {
      trackEvent(EVENTS.LOGIN_SUBMIT_ERROR, { reason: signInError.slice(0, 80) })
      setError(signInError)
      return
    }
    trackEvent(EVENTS.LOGIN_SUBMIT_SUCCESS, { source: 'password' })
    trackFunnelStep(FUNNELS.AUTH_LOGIN, FUNNEL_STEPS.AUTH_LOGIN.SUCCESS, { source: 'password' })
  }

  const inputStyle: React.CSSProperties = {
    border: '1px solid var(--input-border)',
    borderRadius: '12px',
    color: 'var(--input-text)',
    background: 'var(--input-bg)',
  }

  const panelStyle: React.CSSProperties = {
    background: 'var(--surface-soft)',
  }

  const ctaStyle: React.CSSProperties = {
    background: 'var(--brand-gradient)',
    borderRadius: '12px',
  }

  return (
    <div className="nx-login-page flex min-h-screen" style={{ background: 'var(--background)' }}>
      {/* ── Left: Dark immersive panel with truck image ── */}
      <div
        className="relative hidden w-1/2 overflow-hidden lg:block"
        style={{ background: 'linear-gradient(180deg,#091A34 0%,#0B1F3A 55%,#08152A 100%)' }}
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
              'linear-gradient(90deg, rgba(7,18,36,0.92) 0%, rgba(8,20,40,0.8) 35%, rgba(8,20,40,0.38) 65%, rgba(7,18,36,0.62) 100%)',
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
              onError={(e) => { (e.currentTarget as HTMLImageElement).src = '/site/logo/brand/nexora-logo-light.webp' }}
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
                  background: 'linear-gradient(90deg,#60A5FA 0%,#3B82F6 55%,#2563EB 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                  filter: 'drop-shadow(0 2px 12px rgba(37,99,235,0.35))',
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
                      background: 'linear-gradient(135deg, rgba(59,130,246,0.24), rgba(37,99,235,0.18))',
                      border: '1px solid rgba(96,165,250,0.35)',
                    }}
                  >
                    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="#93C5FD" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
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
      <div className="nx-login-form-pane flex w-full flex-col items-center justify-center px-4 py-8 sm:px-6 sm:py-10 lg:w-1/2" style={{ paddingInline: 'clamp(16px, 4vw, 72px)', ...panelStyle }}>
        <div className="nx-login-form-wrap w-full max-w-md">
          {/* Logo */}
          <Link to="/" className="inline-flex items-center" aria-label="NEXORA accueil">
            <img
              src="/site/logo/brand/nexora-logo-dark.png"
              onError={(e) => { (e.currentTarget as HTMLImageElement).src = '/site/logo/brand/nexora-logo-dark.webp' }}
              alt="NEXORA"
              className="h-9 w-auto object-contain"
              loading="eager"
              decoding="async"
            />
          </Link>
          <p className="mt-1 text-sm" style={{ color: 'var(--text-discreet)' }}>Plateforme de gestion transport</p>

          {showDemo ? (
            /* ── Panneau Essai gratuit ──────────────────────────────────────── */
            <>
              <h1 className="nx-login-title mt-8 text-3xl font-bold" style={{ color: 'var(--text-heading)' }}>
                Accès démo
              </h1>
              <p className="mt-2" style={{ color: 'var(--text-secondary)', fontSize: '16px' }}>
                Entrez votre email pour accéder à l'ERP en mode découverte — sans mot de passe.
              </p>

              {demoStatus === 'success' ? (
                <div className="mt-10 rounded-xl px-6 py-8 text-center" style={{ background: 'var(--status-success-bg)', border: '1px solid color-mix(in srgb, var(--status-success-text) 34%, transparent)' }}>
                  <p className="text-base font-semibold" style={{ color: 'var(--status-success-text)' }}>Connexion en cours...</p>
                  <p className="mt-1 text-sm" style={{ color: 'var(--status-success-text)' }}>Vous allez etre redirige vers le tableau de bord.</p>
                </div>
              ) : (
                <form onSubmit={handleDemoSubmit} className="mt-10 grid gap-4">
                  <label className="grid gap-1.5">
                    <span className="text-sm font-medium" style={{ color: 'var(--text)' }}>Adresse email</span>
                    <input
                      type="email"
                      value={demoEmail}
                      onChange={e => setDemoEmail(e.target.value)}
                      required
                      autoComplete="email"
                      autoFocus
                      placeholder="vous@entreprise.fr"
                      className="w-full px-4 py-3 text-base outline-none transition-colors"
                      style={inputStyle}
                      disabled={demoStatus === 'loading'}
                    />
                  </label>

                  {demoError && (
                    <div className="rounded-lg px-4 py-3 text-sm" style={{ background: 'var(--status-error-bg)', color: 'var(--status-error-text)', border: '1px solid color-mix(in srgb, var(--status-error-text) 28%, transparent)' }}>
                      {demoError}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={demoStatus === 'loading'}
                    className="mt-2 w-full py-3 text-sm font-semibold text-white transition-colors disabled:opacity-50"
                    style={ctaStyle}
                  >
                    {demoStatus === 'loading' ? 'Accès en cours…' : 'Accéder à la démo'}
                  </button>
                </form>
              )}

              <div className="mt-6 text-center">
                <button
                  type="button"
                  onClick={() => {
                    trackEvent(EVENTS.LOGIN_DEMO_BACK_TO_LOGIN, { source: 'demo_panel' })
                    setShowDemo(false)
                    setDemoEmail('')
                    setDemoStatus('idle')
                    setDemoError(null)
                  }}
                  className="text-sm transition-colors hover:text-[color:var(--text)]"
                  style={{ color: 'var(--text-discreet)' }}
                >
                  ← Retour à la connexion
                </button>
              </div>
            </>
          ) : (
            /* ── Formulaire de connexion normal ─────────────────────────────── */
            <>
              <h1 className="nx-login-title mt-8 text-3xl font-bold" style={{ color: 'var(--text-heading)' }}>
                Connexion
              </h1>
              <p className="mt-2" style={{ color: 'var(--text-secondary)', fontSize: '16px' }}>
                Accédez à votre espace de gestion NEXORA Truck.
              </p>

              {/* Email/Password form */}
              <form onSubmit={handleSubmit} className="mt-8 grid gap-4">
                <label className="grid gap-1.5">
                  <span className="text-sm font-medium" style={{ color: 'var(--text)' }}>Adresse email</span>
                  <div className="relative">
                    <svg viewBox="0 0 24 24" className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2" fill="none" stroke="var(--text-discreet)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
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
                      className="w-full pl-10 pr-4 py-3 text-base outline-none transition-colors"
                      style={inputStyle}
                    />
                  </div>
                </label>

                <label className="grid gap-1.5">
                  <span className="text-sm font-medium" style={{ color: 'var(--text)' }}>Mot de passe</span>
                  <div className="relative">
                    <svg viewBox="0 0 24 24" className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2" fill="none" stroke="var(--text-discreet)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
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
                      className="w-full pl-10 pr-12 py-3 text-base outline-none transition-colors"
                      style={inputStyle}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        trackEvent(EVENTS.LOGIN_PASSWORD_VISIBILITY_TOGGLE, { visible: !showPassword })
                        setShowPassword(v => !v)
                      }}
                      aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                      className="absolute right-3 top-1/2 -translate-y-1/2 rounded p-1 transition-colors hover:text-[color:var(--primary)]"
                      style={{ color: 'var(--text-discreet)' }}
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
                  <label className="inline-flex cursor-pointer items-center gap-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={e => setRememberMe(e.target.checked)}
                      className="h-4 w-4 rounded border-line-strong"
                      style={{ accentColor: 'var(--primary)' }}
                    />
                    Se souvenir de moi
                  </label>
                  <button
                    type="button"
                    onClick={() => { setShowReset(true); setResetEmail(email); setResetStatus('idle'); setResetError(null) }}
                    className="text-sm font-semibold transition-colors hover:underline"
                    style={{ color: 'var(--primary)' }}
                  >
                    Mot de passe oublié ?
                  </button>
                </div>

                {/* ── Modal reset mot de passe ── */}
                {showReset && (
                  <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)' }}>
                    <div className="w-full max-w-sm rounded-2xl border p-8 shadow-2xl" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
                      <h2 className="text-xl font-bold" style={{ color: 'var(--text-heading)' }}>Reinitialiser le mot de passe</h2>
                      {resetStatus === 'sent' ? (
                        <>
                          <p className="mt-4 text-sm leading-6" style={{ color: 'var(--status-success-text)' }}>
                            Un lien de reinitialisation a ete envoye a <strong>{resetEmail}</strong>. Verifiez votre boite mail (y compris les spams).
                          </p>
                          <button
                            type="button"
                            onClick={() => setShowReset(false)}
                            className="mt-6 w-full rounded-xl py-3 text-sm font-semibold text-white"
                            style={ctaStyle}
                          >
                            Fermer
                          </button>
                        </>
                      ) : (
                        <form onSubmit={handleResetSubmit} className="mt-5 grid gap-4">
                          <p className="text-sm leading-6" style={{ color: 'var(--text-secondary)' }}>
                            Entrez votre adresse email. Vous recevrez un lien pour créer un nouveau mot de passe.
                          </p>
                          <input
                            type="email"
                            required
                            autoFocus
                            placeholder="votre@email.fr"
                            value={resetEmail}
                            onChange={e => setResetEmail(e.target.value)}
                            className="w-full rounded-xl px-4 py-3 text-base outline-none transition-colors"
                            style={inputStyle}
                            disabled={resetStatus === 'loading'}
                          />
                          {resetError && (
                            <p className="rounded-lg px-4 py-3 text-sm" style={{ background: 'var(--status-error-bg)', color: 'var(--status-error-text)', border: '1px solid color-mix(in srgb, var(--status-error-text) 28%, transparent)' }}>
                              {resetError}
                            </p>
                          )}
                          <div className="flex gap-3">
                            <button
                              type="button"
                              onClick={() => setShowReset(false)}
                              className="flex-1 rounded-xl py-3 text-sm font-semibold transition-colors"
                              style={{ border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
                            >
                              Annuler
                            </button>
                            <button
                              type="submit"
                              disabled={resetStatus === 'loading'}
                              className="flex-1 rounded-xl py-3 text-sm font-semibold text-white disabled:opacity-60"
                              style={ctaStyle}
                            >
                              {resetStatus === 'loading' ? 'Envoi...' : 'Envoyer le lien'}
                            </button>
                          </div>
                        </form>
                      )}
                    </div>
                  </div>
                )}

                {error && (
                  <div className="rounded-lg px-4 py-3 text-sm" style={{ background: 'var(--status-error-bg)', color: 'var(--status-error-text)', border: '1px solid color-mix(in srgb, var(--status-error-text) 28%, transparent)' }}>
                    {translateError(error)}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={submitting}
                  className="mt-2 inline-flex w-full items-center justify-center gap-2 py-3 text-sm font-semibold text-white transition-colors disabled:opacity-50"
                  style={{ ...ctaStyle, boxShadow: '0 8px 24px -8px rgba(11,31,58,0.55)' }}
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
                <p className="text-sm" style={{ color: 'var(--text-discreet)' }}>
                  Pas encore de compte ?{' '}
                  <button
                    type="button"
                    onClick={() => {
                      trackEvent(EVENTS.MARKETING_CTA_CLICK, { placement: 'login_footer_trial', target: 'demo_mode' })
                      setShowDemo(true)
                    }}
                    className="font-semibold transition-colors hover:underline"
                    style={{ color: 'var(--primary)' }}
                  >
                    Essai gratuit
                  </button>
                </p>
              </div>
            </>
          )}

          {/* Trust strip */}
          <div
            className="nx-login-trust-strip mt-8 rounded-2xl px-4 py-4 sm:px-5"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-card)' }}
          >
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
              {([
                ['Accès sécurisé', 'Vos données sont protégées.', (<><rect x="4" y="10" width="16" height="11" rx="2" /><path d="M8 10V7a4 4 0 118 0v3" /></>)],
                ['Disponibilité 24/7', 'Accédez à votre activité à tout moment.', (<><path d="M4 14a8 8 0 1016 0A8 8 0 004 14z" /><path d="M12 10v4l2 2" /></>)],
                ['Support réactif', 'Notre équipe est là pour vous aider.', (<><path d="M4 14v-2a8 8 0 0116 0v2" /><rect x="3" y="14" width="4" height="6" rx="1.5" /><rect x="17" y="14" width="4" height="6" rx="1.5" /></>)],
              ] as const).map(([title, desc, icon]) => (
                <div key={title} className="flex items-start gap-2.5">
                  <svg viewBox="0 0 24 24" className="mt-0.5 h-4 w-4 flex-shrink-0" fill="none" stroke="var(--primary)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    {icon}
                  </svg>
                  <div>
                    <p className="text-[11.5px] font-semibold leading-tight" style={{ color: 'var(--text-heading)' }}>{title}</p>
                    <p className="mt-0.5 text-[10.5px] leading-[1.45]" style={{ color: 'var(--text-discreet)' }}>{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-6 grid gap-2 text-center text-xs" style={{ color: 'var(--text-discreet)' }}>
            <p>NEXORA Truck — Accès sécurisé</p>
            <div className="flex justify-center gap-3">
              <Link to="/mentions-legales-public" className="underline underline-offset-2 transition-colors hover:text-[color:var(--text)]">
                Mentions légales
              </Link>
              <Link to="/politique-confidentialite" className="underline underline-offset-2 transition-colors hover:text-[color:var(--text)]">
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
