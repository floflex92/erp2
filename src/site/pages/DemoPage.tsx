import { Link } from 'react-router-dom'
import { useEffect, useMemo, useState } from 'react'
import useSiteMeta from '@/site/hooks/useSiteMeta'
import FrameDashboard from '@/site/components/frames/FrameDashboard'
import FramePlanning from '@/site/components/frames/FramePlanning'
import FrameChauffeur from '@/site/components/frames/FrameChauffeur'
import { sitePhotos } from '@/site/lib/sitePhotos'
import { supabase } from '@/lib/supabase'
import { EVENTS, FUNNELS, FUNNEL_STEPS, trackEvent, trackFunnelStep, trackPageView } from '@/site/lib/analytics'

const sectionPx: React.CSSProperties = { paddingInline: 'clamp(24px, 8vw, 160px)' }
const sectionPy: React.CSSProperties = { paddingBlock: 'clamp(80px, 12vw, 160px)' }

type DemoFormState = {
  company: string
  email: string
  fleetSize: string
  priority: string
  date: string
  slot: string
}

const initialForm: DemoFormState = {
  company: '',
  email: '',
  fleetSize: '5-20',
  priority: 'planning',
  date: '',
  slot: '09:00',
}

export default function DemoPage() {
  const [form, setForm] = useState<DemoFormState>(initialForm)
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    trackPageView('/demonstration')
    trackFunnelStep(FUNNELS.MARKETING_DEMO, FUNNEL_STEPS.MARKETING_DEMO.DEMO_PAGE_VIEW, { surface: 'demo_page' })
  }, [])

  useSiteMeta({
    title: 'Démonstration ERP transport : accès gratuit',
    description: 'Réservez une démonstration personnalisée NEXORA Truck ou accédez directement à la plateforme complète gratuitement.',
    canonicalPath: '/demonstration',
    keywords: 'démo ERP transport, démonstration TMS, logiciel transport routier, rendez-vous Nexora Truck',
  })

  const demoSubject = useMemo(() =>
    encodeURIComponent(`Demande de démonstration NEXORA Truck - ${form.company || 'Entreprise transport'}`),
    [form.company],
  )

  const demoBody = useMemo(() =>
    encodeURIComponent(`Entreprise: ${form.company}\nEmail: ${form.email}\nTaille flotte: ${form.fleetSize}\nPriorité: ${form.priority}\nDate souhaitée: ${form.date || 'à définir'}\nCréneau: ${form.slot}`),
    [form],
  )

  function handleChange<K extends keyof DemoFormState>(key: K, value: DemoFormState[K]) {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitting(true)
    setError(null)
    trackEvent(EVENTS.MARKETING_FORM_SUBMIT, {
      form_name: 'demo_reservation',
      surface: 'demo_page',
      fleet_size: form.fleetSize,
      priority: form.priority,
    })
    trackFunnelStep(FUNNELS.MARKETING_DEMO, FUNNEL_STEPS.MARKETING_DEMO.DEMO_FORM_SUBMIT, {
      surface: 'demo_page',
      fleet_size: form.fleetSize,
      priority: form.priority,
    })

    try {
      // 1. Netlify Forms
      const body = new URLSearchParams({
        'form-name': 'demo-reservation',
        company: form.company,
        email: form.email,
        fleetSize: form.fleetSize,
        priority: form.priority,
        date: form.date,
        slot: form.slot,
      })
      await fetch('/', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: body.toString() })

      // 2. Supabase prospect (fire-and-forget, ne bloque pas l'UX)
      supabase.from('prospects').insert({
        nom_entreprise: form.company,
        source_lead: 'site_web',
        statut: 'lead',
        probabilite_closing: 20,
        notes: `Demande démo site — flotte: ${form.fleetSize} — priorité: ${form.priority} — date souhaitée: ${form.date || 'NC'} ${form.slot}`,
      }).then(() => {})

      trackEvent(EVENTS.MARKETING_FORM_SUCCESS, {
        form_name: 'demo_reservation',
        surface: 'demo_page',
        fleet_size: form.fleetSize,
        priority: form.priority,
      })
      trackFunnelStep(FUNNELS.MARKETING_DEMO, FUNNEL_STEPS.MARKETING_DEMO.DEMO_FORM_SUCCESS, {
        surface: 'demo_page',
        fleet_size: form.fleetSize,
        priority: form.priority,
      })

      setSubmitted(true)
    } catch {
      trackEvent(EVENTS.MARKETING_FORM_ERROR, {
        form_name: 'demo_reservation',
        surface: 'demo_page',
      })
      setError('Erreur lors de l\'envoi. Veuillez réessayer ou nous contacter par email.')
    } finally {
      setSubmitting(false)
    }
  }

  const inputStyle: React.CSSProperties = { border: '1px solid #E5E5E5', borderRadius: '8px', color: '#1D1D1F' }

  return (
    <>
      {/* Netlify Forms bot detection */}
      <form name="demo-reservation" data-netlify="true" netlify-honeypot="bot-field" hidden>
        <input name="company" />
        <input name="email" />
        <input name="fleetSize" />
        <input name="priority" />
        <input name="date" />
        <input name="slot" />
      </form>

      {/* ── HERO ── */}
      <section
        className="relative flex min-h-[75vh] w-full flex-col items-center justify-center overflow-hidden text-center"
        style={{ ...sectionPx, ...sectionPy }}
      >
        <img
          src={sitePhotos.officeDispatcherSolo.src(1600)}
          alt="Responsable exploitation transport préparant une démonstration au bureau" aria-hidden="true"
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.45)' }} />

        <div className="relative">
          <p className="text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: 'rgba(255,255,255,0.7)' }}>
            Démonstration
          </p>
          <h1
            className="mx-auto mt-6 max-w-4xl text-balance font-bold leading-[1.05]"
            style={{ fontSize: 'clamp(2.5rem, 6vw, 5rem)', color: '#FFFFFF', letterSpacing: '-0.025em' }}
          >
            Démonstration ERP transport NEXORA Truck.
          </h1>
          <p className="mx-auto mt-6 max-w-2xl" style={{ color: 'rgba(255,255,255,0.8)', fontSize: '20px', lineHeight: 1.6 }}>
            Accédez à la plateforme complète gratuitement ou réservez une démonstration personnalisée avec notre équipe.
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <Link
              to="/login?mode=demo"
              onClick={() => {
                trackEvent(EVENTS.MARKETING_CTA_CLICK, { placement: 'demo_hero_primary', target: '/login?mode=demo' })
                trackFunnelStep(FUNNELS.MARKETING_DEMO, FUNNEL_STEPS.MARKETING_DEMO.DEMO_CLICK, { placement: 'demo_hero_primary' })
              }}
              className="site-btn-primary px-8 py-4 text-base transition-colors"
            >
              Accéder à la démo gratuite
            </Link>
            <a
              href="#reservation"
              onClick={() => trackEvent(EVENTS.MARKETING_CTA_CLICK, { placement: 'demo_hero_secondary', target: '#reservation' })}
              className="text-sm font-semibold transition-colors"
              style={{ color: '#93C5FD' }}
            >
              Réserver une session guidée ↓
            </a>
          </div>
        </div>
      </section>

      {/* ── 3 AVANTAGES ── */}
      <section
        className="w-full"
        style={{ background: '#F5F5F7', ...sectionPx, ...sectionPy }}
      >
        <div className="grid gap-x-20 gap-y-12 md:grid-cols-3">
          {([
            ['Accès immédiat', 'Votre espace est prêt en quelques minutes. Explorez la plateforme complète sans attendre un rendez-vous.'],
            ['Tous les modules actifs', 'Planning, flotte, conducteurs, facturation, conformité — rien n\'est verrouillé pendant l\'essai.'],
            ['Accompagnement garanti', 'Notre équipe vous recontacte pour maximiser votre prise en main et répondre à vos questions.'],
          ] as const).map(([title, desc]) => (
            <div key={title}>
              <h3 className="text-xl font-semibold" style={{ color: '#000000' }}>{title}</h3>
              <p className="mt-3" style={{ color: '#6E6E73' }}>{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── GALERIE PRODUIT ── */}
      <section
        className="w-full bg-white"
        style={{ ...sectionPx, ...sectionPy }}
      >
        <h2
          className="font-semibold"
          style={{ fontSize: 'clamp(1.8rem, 4vw, 3rem)', color: '#000000' }}
        >
          Explorez les zones clés du produit
        </h2>
        <p className="mt-4 max-w-2xl" style={{ color: '#6E6E73' }}>
          Trois aperçus pour illustrer la plateforme avant votre démonstration personnalisée.
        </p>

        <div className="mx-auto mt-12" style={{ width: '90vw', maxWidth: '1400px' }}>
          <div className="grid gap-6 xl:grid-cols-3">
            {([
              ['Cockpit exploitation', FrameDashboard],
              ['Planning & affectations', FramePlanning],
              ['Dossier conducteur', FrameChauffeur],
            ] as const).map(([label, Component]) => (
              <div key={label}>
                <div className="overflow-hidden rounded-xl bg-white shadow-[0_12px_40px_rgba(0,0,0,0.08)]">
                  <div className="flex items-center gap-2 border-b px-3 py-2" style={{ borderColor: '#E5E5E5' }}>
                    <span className="h-2.5 w-2.5 rounded-full" style={{ background: '#FF5F57' }} />
                    <span className="h-2.5 w-2.5 rounded-full" style={{ background: '#FEBC2E' }} />
                    <span className="h-2.5 w-2.5 rounded-full" style={{ background: '#28C840' }} />
                  </div>
                  <div className="p-3">
                    <Component />
                  </div>
                </div>
                <p className="mt-3 text-center text-sm" style={{ color: '#86868B' }}>{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FORMULAIRE RÉSERVATION ── */}
      <section
        id="reservation"
        className="w-full"
        style={{ background: '#F5F5F7', ...sectionPx, ...sectionPy }}
      >
        <div className="mx-auto grid max-w-5xl gap-12 lg:grid-cols-[1.1fr_0.9fr]">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: '#6E6E73' }}>
              Session personnalisée
            </p>
            <h2
              className="mt-4 font-semibold leading-tight"
              style={{ fontSize: 'clamp(1.8rem, 4vw, 3rem)', color: '#000000' }}
            >
              Réservez une démonstration alignée sur votre réalité terrain
            </h2>
            <p className="mt-4" style={{ color: '#6E6E73' }}>
              Nous préparons la session selon votre taille de flotte, vos priorités et votre maturité digitale.
            </p>

            <div className="mt-12 grid gap-8">
              {([
                ['1', 'Diagnostic rapide', 'Qualification de votre contexte et de vos enjeux prioritaires.'],
                ['2', 'Démo guidée', 'Démonstration personnalisée centrée sur vos besoins réels.'],
                ['3', 'Plan d\'adoption', 'Feuille de route concrète et prochaines étapes.'],
              ] as const).map(([num, title, desc]) => (
                <div key={num} className="flex gap-5">
                  <div
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold"
                    style={{ background: '#FFFFFF', border: '1px solid #E5E5E5', color: '#000000' }}
                  >
                    {num}
                  </div>
                  <div>
                    <p className="font-semibold" style={{ color: '#000000' }}>{title}</p>
                    <p className="mt-1 text-sm" style={{ color: '#6E6E73' }}>{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="rounded-xl bg-white p-8" style={{ border: '1px solid #E5E5E5' }}>
            <div className="grid gap-5 sm:grid-cols-2">
              <label className="text-sm font-medium sm:col-span-2" style={{ color: '#1D1D1F' }}>
                Nom de l'entreprise
                <input required value={form.company} onChange={e => handleChange('company', e.target.value)} className="mt-2 w-full px-4 py-3 text-base" style={inputStyle} />
              </label>
              <label className="text-sm font-medium sm:col-span-2" style={{ color: '#1D1D1F' }}>
                Email professionnel
                <input type="email" required value={form.email} onChange={e => handleChange('email', e.target.value)} className="mt-2 w-full px-4 py-3 text-base" style={inputStyle} />
              </label>
              <label className="text-sm font-medium" style={{ color: '#1D1D1F' }}>
                Taille de flotte
                <select value={form.fleetSize} onChange={e => handleChange('fleetSize', e.target.value)} className="mt-2 w-full px-4 py-3 text-base" style={inputStyle}>
                  <option value="5-20">5 à 20 véhicules</option>
                  <option value="21-50">21 à 50 véhicules</option>
                  <option value="51-100">51 à 100 véhicules</option>
                  <option value="100+">100+ véhicules</option>
                </select>
              </label>
              <label className="text-sm font-medium" style={{ color: '#1D1D1F' }}>
                Priorité principale
                <select value={form.priority} onChange={e => handleChange('priority', e.target.value)} className="mt-2 w-full px-4 py-3 text-base" style={inputStyle}>
                  <option value="planning">Planning intelligent</option>
                  <option value="exploitation">Pilotage exploitation</option>
                  <option value="conformite">Conformité et RH</option>
                  <option value="finance">Rentabilité et facturation</option>
                </select>
              </label>
              <label className="text-sm font-medium" style={{ color: '#1D1D1F' }}>
                Date souhaitée
                <input type="date" value={form.date} onChange={e => handleChange('date', e.target.value)} className="mt-2 w-full px-4 py-3 text-base" style={inputStyle} />
              </label>
              <label className="text-sm font-medium" style={{ color: '#1D1D1F' }}>
                Créneau
                <select value={form.slot} onChange={e => handleChange('slot', e.target.value)} className="mt-2 w-full px-4 py-3 text-base" style={inputStyle}>
                  <option value="09:00">09 h 00</option>
                  <option value="11:00">11 h 00</option>
                  <option value="14:00">14 h 00</option>
                  <option value="16:00">16 h 00</option>
                </select>
              </label>
            </div>
            <div className="mt-6 flex flex-wrap gap-3">
              <button type="submit" disabled={submitting} className="site-btn-primary px-6 py-3 text-sm transition-colors disabled:opacity-60">
                {submitting ? 'Envoi en cours…' : 'Préparer ma démo'}
              </button>
              <a
                href={`mailto:contact@nexora-truck.fr?subject=${demoSubject}&body=${demoBody}`}
                className="text-sm font-semibold transition-colors"
                style={{ color: '#2563EB', padding: '12px 0' }}
              >
                Envoyer par email
              </a>
            </div>
            {submitted && (
              <p className="mt-5 rounded-lg px-4 py-3 text-sm" style={{ background: '#F0FDF4', color: '#166534', border: '1px solid #BBF7D0' }}>
                Demande enregistrée. Un conseiller NEXORA Truck vous contacte avec une trame de démonstration personnalisée.
              </p>
            )}
            {error && (
              <p className="mt-5 rounded-lg px-4 py-3 text-sm" style={{ background: '#FFF1F2', color: '#9F1239', border: '1px solid #FECDD3' }}>
                {error}
              </p>
            )}
          </form>
        </div>
      </section>

      {/* ── FINAL CTA ── */}
      <section
        className="w-full bg-white text-center"
        style={{ ...sectionPx, paddingBlock: 'clamp(100px, 14vw, 200px)' }}
      >
        <h2
          className="mx-auto max-w-3xl text-balance font-semibold leading-tight"
          style={{ fontSize: 'clamp(2rem, 5vw, 3.5rem)', color: '#000000' }}
        >
          Prêt à simplifier votre quotidien transport ?
        </h2>
        <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
          <Link
            to="/login?mode=demo"
            className="site-btn-primary px-8 py-4 text-base transition-colors"
          >
            Commencer l'essai gratuit
          </Link>
          <Link
            to="/contact"
            className="text-sm font-semibold transition-colors"
            style={{ color: '#2563EB' }}
          >
            Parler à un expert
          </Link>
        </div>
      </section>
    </>
  )
}
