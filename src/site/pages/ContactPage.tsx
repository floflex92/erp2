import { Link } from 'react-router-dom'
import { useState, useMemo } from 'react'
import useSiteMeta from '@/site/hooks/useSiteMeta'
import { sitePhotos } from '@/site/lib/sitePhotos'

const sectionPx: React.CSSProperties = { paddingInline: 'clamp(24px, 8vw, 160px)' }
const sectionPy: React.CSSProperties = { paddingBlock: 'clamp(80px, 12vw, 160px)' }

type ContactForm = {
  name: string
  company: string
  email: string
  objective: string
  vehicles: string
  message: string
}

const initialForm: ContactForm = {
  name: '',
  company: '',
  email: '',
  objective: 'modernisation',
  vehicles: '5-20',
  message: '',
}

function generateChallenge() {
  const a = Math.floor(Math.random() * 9) + 1
  const b = Math.floor(Math.random() * 9) + 1
  return { a, b, answer: a + b }
}

export default function ContactPage() {
  const [form, setForm] = useState<ContactForm>(initialForm)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [challenge] = useState(generateChallenge)
  const [captchaInput, setCaptchaInput] = useState('')

  useSiteMeta({
    title: 'Contact — démo ERP transport routier',
    description: 'Contactez NEXORA Truck pour qualifier votre projet ERP transport et organiser un rendez-vous de démonstration personnalisé.',
    canonicalPath: '/contact',
    keywords: 'contact ERP transport, rendez-vous démonstration TMS, projet digital transport routier',
  })

  function update<K extends keyof ContactForm>(key: K, value: ContactForm[K]) {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)

    if (Number(captchaInput) !== challenge.answer) {
      setError('Vérification incorrecte. Veuillez réessayer.')
      return
    }

    setSubmitting(true)
    try {
      const formData = new FormData()
      formData.append('form-name', 'contact')
      formData.append('name', form.name)
      formData.append('company', form.company)
      formData.append('email', form.email)
      formData.append('objective', form.objective)
      formData.append('vehicles', form.vehicles)
      formData.append('message', form.message)

      await fetch('/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams(formData as unknown as Record<string, string>).toString(),
      })
      setSuccess(true)
    } catch {
      setError('Erreur lors de l\'envoi. Veuillez réessayer ou nous contacter par email.')
    } finally {
      setSubmitting(false)
    }
  }

  const contactMailTo = useMemo(() =>
    `mailto:contact@nexora-truck.fr?subject=${encodeURIComponent(`Projet ERP transport - ${form.company || 'Entreprise'}`)}&body=${encodeURIComponent(
      `Nom: ${form.name}\nEntreprise: ${form.company}\nEmail: ${form.email}\nObjectif: ${form.objective}\nTaille flotte: ${form.vehicles}\nMessage: ${form.message}`,
    )}`,
    [form],
  )

  const inputStyle: React.CSSProperties = { border: '1px solid #E5E5E5', borderRadius: '8px', color: '#1D1D1F', background: '#FFFFFF' }

  return (
    <>
      {/* Netlify Forms hidden form for detection */}
      <form name="contact" data-netlify="true" netlify-honeypot="bot-field" hidden>
        <input name="name" />
        <input name="company" />
        <input name="email" />
        <input name="objective" />
        <input name="vehicles" />
        <textarea name="message" />
      </form>

      {/* ── HERO ── */}
      <section
        className="relative w-full overflow-hidden"
        style={{ ...sectionPx, ...sectionPy }}
      >
        <img
          src={sitePhotos.contactHero.src(1600)}
          srcSet={sitePhotos.contactHero.srcSet([768, 1200, 1600])}
          sizes="100vw"
          alt="Poids lourds sur autoroute européenne avec paysage dégagé" aria-hidden="true"
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.45)' }} />
        <div className="relative mx-auto max-w-2xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: 'rgba(255,255,255,0.7)' }}>
            Contact
          </p>
          <h1
            className="mt-6 text-balance font-bold leading-[1.05]"
            style={{ fontSize: 'clamp(2.2rem, 5vw, 4rem)', color: '#FFFFFF', letterSpacing: '-0.025em' }}
          >
            Parlons de votre projet transport
          </h1>
          <p className="mt-6" style={{ color: 'rgba(255,255,255,0.8)', fontSize: '20px', lineHeight: 1.6 }}>
            Qualifions votre besoin ensemble pour un échange utile dès le premier rendez-vous.
          </p>
        </div>
      </section>

      {/* ── PARCOURS 3 ÉTAPES ── */}
      <section className="w-full bg-white text-center" style={{ ...sectionPx, ...sectionPy }}>
        <p className="text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: '#6E6E73' }}>Parcours</p>
        <h2 className="mt-4 font-semibold" style={{ fontSize: 'clamp(1.8rem, 4vw, 3rem)', color: '#000000' }}>
          3 étapes simples
        </h2>
        <div className="mx-auto mt-16 grid max-w-4xl gap-12 md:grid-cols-3">
          {([
            ['1', 'Qualification', 'Nous analysons votre contexte, vos enjeux et vos priorités pour cibler la démonstration.'],
            ['2', 'Démonstration', 'Session personnalisée selon votre taille de flotte, vos priorités et votre maturité digitale.'],
            ['3', 'Feuille de route', 'Plan de déploiement réaliste avec quick wins et montée en puissance progressive.'],
          ] as const).map(([num, title, desc]) => (
            <div key={num}>
              <p className="text-4xl font-bold" style={{ color: '#000000' }}>{num}</p>
              <h3 className="mt-4 text-lg font-semibold" style={{ color: '#000000' }}>{title}</h3>
              <p className="mt-2" style={{ color: '#6E6E73' }}>{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── COORDONNÉES + FORMULAIRE ── */}
      <section className="w-full" style={{ background: '#F5F5F7', ...sectionPx, ...sectionPy }}>
        <div className="mx-auto grid max-w-5xl gap-12 lg:grid-cols-[0.8fr_1.2fr]">
          {/* Left: coordonnées */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: '#6E6E73' }}>Coordonnées</p>
            <h2 className="mt-4 text-2xl font-semibold" style={{ color: '#000000' }}>Contactez-nous directement</h2>

            <div className="mt-10 grid gap-8">
              <div>
                <p className="text-sm font-semibold" style={{ color: '#000000' }}>Email</p>
                <a href="mailto:contact@nexora-truck.fr" className="mt-1 text-base" style={{ color: '#2563EB' }}>contact@nexora-truck.fr</a>
              </div>
              <div>
                <p className="text-sm font-semibold" style={{ color: '#000000' }}>Téléphone</p>
                <a href="tel:+33782711705" className="mt-1 text-base" style={{ color: '#2563EB' }}>07 82 71 17 05</a>
              </div>
              <div>
                <p className="text-sm font-semibold" style={{ color: '#000000' }}>Adresse</p>
                <p className="mt-1" style={{ color: '#6E6E73' }}>Marseille, France</p>
              </div>
              <div>
                <p className="text-sm font-semibold" style={{ color: '#000000' }}>Horaires</p>
                <p className="mt-1" style={{ color: '#6E6E73' }}>Lundi — Vendredi, 9h — 18h</p>
              </div>
            </div>

            {/* Réseaux sociaux */}
            <div className="mt-12">
              <p className="text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: '#6E6E73' }}>Nos réseaux</p>
              <div className="mt-4 flex gap-5">
                <a href="https://www.linkedin.com/company/nexora-truck" target="_blank" rel="noopener noreferrer" aria-label="LinkedIn" className="transition-opacity hover:opacity-70">
                  <svg className="h-6 w-6" viewBox="0 0 24 24" fill="#1D1D1F"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
                </a>
                <a href="https://twitter.com/nexoratruck" target="_blank" rel="noopener noreferrer" aria-label="X (Twitter)" className="transition-opacity hover:opacity-70">
                  <svg className="h-6 w-6" viewBox="0 0 24 24" fill="#1D1D1F"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                </a>
                <a href="https://www.facebook.com/nexoratruck" target="_blank" rel="noopener noreferrer" aria-label="Facebook" className="transition-opacity hover:opacity-70">
                  <svg className="h-6 w-6" viewBox="0 0 24 24" fill="#1D1D1F"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                </a>
              </div>
            </div>

          </div>

          {/* Right: formulaire */}
          <form onSubmit={submit} className="rounded-xl bg-white p-8" style={{ border: '1px solid #E5E5E5' }}>
            <h3 className="text-xl font-semibold" style={{ color: '#000000' }}>Envoyer une demande</h3>
            <p className="mt-2 text-sm" style={{ color: '#6E6E73' }}>Nous revenons vers vous sous 24h.</p>

            {/* Honeypot anti-spam */}
            <div className="hidden"><input name="bot-field" /></div>

            <div className="mt-6 grid gap-5 sm:grid-cols-2">
              <label className="grid gap-1.5">
                <span className="text-sm font-medium" style={{ color: '#1D1D1F' }}>Votre nom *</span>
                <input required value={form.name} onChange={e => update('name', e.target.value)} className="w-full px-4 py-3 text-base outline-none focus:border-[#2563EB]" style={inputStyle} />
              </label>
              <label className="grid gap-1.5">
                <span className="text-sm font-medium" style={{ color: '#1D1D1F' }}>Entreprise *</span>
                <input required value={form.company} onChange={e => update('company', e.target.value)} className="w-full px-4 py-3 text-base outline-none focus:border-[#2563EB]" style={inputStyle} />
              </label>
              <label className="grid gap-1.5 sm:col-span-2">
                <span className="text-sm font-medium" style={{ color: '#1D1D1F' }}>Email professionnel *</span>
                <input type="email" required value={form.email} onChange={e => update('email', e.target.value)} className="w-full px-4 py-3 text-base outline-none focus:border-[#2563EB]" style={inputStyle} />
              </label>
              <label className="grid gap-1.5">
                <span className="text-sm font-medium" style={{ color: '#1D1D1F' }}>Objectif principal</span>
                <select value={form.objective} onChange={e => update('objective', e.target.value)} className="w-full px-4 py-3 text-base" style={inputStyle}>
                  <option value="modernisation">Moderniser le pilotage global</option>
                  <option value="planning">Optimiser le planning</option>
                  <option value="rentabilite">Améliorer la rentabilité</option>
                  <option value="conformite">Sécuriser conformité et RH</option>
                </select>
              </label>
              <label className="grid gap-1.5">
                <span className="text-sm font-medium" style={{ color: '#1D1D1F' }}>Taille de flotte</span>
                <select value={form.vehicles} onChange={e => update('vehicles', e.target.value)} className="w-full px-4 py-3 text-base" style={inputStyle}>
                  <option value="5-20">5 à 20 véhicules</option>
                  <option value="21-50">21 à 50 véhicules</option>
                  <option value="51-100">51 à 100 véhicules</option>
                  <option value="100+">100+ véhicules</option>
                </select>
              </label>
              <label className="grid gap-1.5 sm:col-span-2">
                <span className="text-sm font-medium" style={{ color: '#1D1D1F' }}>Contexte et attentes</span>
                <textarea value={form.message} onChange={e => update('message', e.target.value)} rows={4} className="w-full px-4 py-3 text-base outline-none focus:border-[#2563EB]" style={inputStyle} />
              </label>

              {/* Anti-spam math challenge */}
              <label className="grid gap-1.5 sm:col-span-2">
                <span className="text-sm font-medium" style={{ color: '#1D1D1F' }}>Vérification : combien font {challenge.a} + {challenge.b} ? *</span>
                <input
                  required
                  type="number"
                  value={captchaInput}
                  onChange={e => setCaptchaInput(e.target.value)}
                  className="w-full max-w-[120px] px-4 py-3 text-base outline-none focus:border-[#2563EB]"
                  style={inputStyle}
                />
              </label>
            </div>

            {error && (
              <p className="mt-4 rounded-lg px-4 py-3 text-sm" style={{ background: '#FEF2F2', color: '#991B1B', border: '1px solid #FECACA' }}>{error}</p>
            )}

            {success ? (
              <p className="mt-6 rounded-lg px-4 py-3 text-sm" style={{ background: '#F0FDF4', color: '#166534', border: '1px solid #BBF7D0' }}>
                Demande reçue. Notre équipe vous contacte sous 24h pour organiser votre démonstration.
              </p>
            ) : (
              <div className="mt-6 flex flex-wrap items-center gap-4">
                <button
                  type="submit"
                  disabled={submitting}
                  className="site-btn-primary px-6 py-3 text-sm transition-colors disabled:opacity-50"
                >
                  {submitting ? 'Envoi en cours...' : 'Envoyer ma demande'}
                </button>
                <a href={contactMailTo} className="text-sm font-semibold" style={{ color: '#2563EB' }}>
                  Envoyer par email
                </a>
              </div>
            )}
          </form>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="w-full bg-white text-center" style={{ ...sectionPx, paddingBlock: 'clamp(80px, 10vw, 140px)' }}>
        <h2 className="mx-auto max-w-3xl text-balance font-semibold leading-tight" style={{ fontSize: 'clamp(2rem, 5vw, 3.5rem)', color: '#000000' }}>
          Prêt à passer à l'action ?
        </h2>
        <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
          <Link to="/demonstration" className="text-sm font-semibold" style={{ color: '#2563EB' }}>Voir la démonstration</Link>
          <Link to="/a-propos" className="text-sm font-semibold" style={{ color: '#2563EB' }}>Découvrir NEXORA Truck</Link>
        </div>
      </section>
    </>
  )
}
