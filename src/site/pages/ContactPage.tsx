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

      {/* ── HERO — dark split: copy + form card over truck ── */}
      <section
        className="relative w-full overflow-hidden"
        style={{
          background: 'radial-gradient(1200px 600px at 75% 30%, rgba(14,165,233,0.18), transparent 60%), linear-gradient(180deg,#0A1024 0%, #0B132B 55%, #0A1024 100%)',
          ...sectionPx,
          paddingBlock: 'clamp(72px, 9vw, 120px)',
        }}
      >
        {/* Background truck image on the right */}
        <div className="pointer-events-none absolute inset-0">
          <img
            src={sitePhotos.contactHero.src(1600)}
            srcSet={sitePhotos.contactHero.srcSet([768, 1200, 1600])}
            sizes="100vw"
            alt=""
            aria-hidden="true"
            className="h-full w-full object-cover opacity-[0.55]"
            style={{ objectPosition: '70% center', mixBlendMode: 'screen' }}
          />
          {/* Dark left overlay for text legibility */}
          <div
            className="absolute inset-0"
            style={{
              background:
                'linear-gradient(90deg, #0A1024 0%, rgba(10,16,36,0.94) 28%, rgba(10,16,36,0.55) 55%, rgba(10,16,36,0.15) 80%, rgba(10,16,36,0) 100%)',
            }}
          />
          {/* Decorative world-map dot grid (evokes network) */}
          <svg className="absolute inset-0 h-full w-full opacity-40" viewBox="0 0 1400 700" fill="none" aria-hidden="true" preserveAspectRatio="xMidYMid slice">
            <defs>
              <radialGradient id="contact-dot" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#38BDF8" stopOpacity="0.9" />
                <stop offset="100%" stopColor="#38BDF8" stopOpacity="0" />
              </radialGradient>
            </defs>
            {Array.from({ length: 120 }).map((_, i) => {
              const cx = (i * 73) % 1400
              const cy = ((i * 41) % 700) + ((i % 5) * 13)
              const r = 1 + ((i * 7) % 3)
              const o = 0.25 + (((i * 11) % 70) / 100)
              return <circle key={i} cx={cx} cy={cy} r={r} fill="#60A5FA" opacity={o} />
            })}
            {/* Arcs */}
            <path d="M880 180 Q 1000 80 1120 200" stroke="#22D3EE" strokeWidth="1.2" opacity="0.75" strokeDasharray="3 5" />
            <path d="M950 240 Q 1060 150 1180 260" stroke="#60A5FA" strokeWidth="1.2" opacity="0.6" strokeDasharray="3 5" />
            <path d="M900 320 Q 1020 420 1180 360" stroke="#22D3EE" strokeWidth="1.2" opacity="0.5" strokeDasharray="3 5" />
            <circle cx="880" cy="180" r="3.5" fill="#22D3EE" />
            <circle cx="1120" cy="200" r="3.5" fill="#22D3EE" />
            <circle cx="950" cy="240" r="3.5" fill="#60A5FA" />
            <circle cx="1180" cy="260" r="3.5" fill="#60A5FA" />
            <circle cx="900" cy="320" r="3.5" fill="#22D3EE" />
          </svg>
        </div>

        <div className="relative mx-auto grid w-full max-w-[1280px] items-center gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)] lg:gap-16">
          {/* Left — copy + CTAs */}
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.28em]" style={{ color: '#3B82F6' }}>
              Contact
            </p>
            <h1
              className="mt-5 font-bold leading-[1.05]"
              style={{ fontSize: 'clamp(2.1rem, 4.8vw, 3.8rem)', color: '#FFFFFF', letterSpacing: '-0.025em' }}
            >
              Parlons de votre{' '}
              <span
                className="inline-block"
                style={{
                  background: 'linear-gradient(90deg,#3B82F6,#22D3EE)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}
              >
                projet transport.
              </span>
            </h1>
            <p className="mt-5 max-w-md" style={{ color: 'rgba(226,232,240,0.85)', fontSize: '17px', lineHeight: 1.6 }}>
              Quel que soit votre besoin, notre équipe vous répond rapidement pour vous proposer la meilleure solution.
            </p>

            <div className="mt-7 flex flex-wrap items-center gap-3">
              <a
                href="#contact-form"
                className="inline-flex items-center gap-2 rounded-lg px-5 py-3 text-sm font-semibold text-white shadow-[0_10px_30px_rgba(20,184,166,0.35)] transition-transform hover:-translate-y-0.5"
                style={{ background: 'linear-gradient(135deg,#14B8A6,#22D3EE)' }}
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 9h18M8 3v4M16 3v4" /></svg>
                Planifier un échange
              </a>
              <a
                href="tel:+33782711705"
                className="inline-flex items-center gap-2 rounded-lg border px-5 py-3 text-sm font-semibold transition-colors"
                style={{ borderColor: 'rgba(96,165,250,0.55)', color: '#E2E8F0', background: 'rgba(15,23,42,0.35)' }}
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="#60A5FA" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6A19.79 19.79 0 012.12 4.18 2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z" /></svg>
                Nous appeler
              </a>
            </div>

            {/* Proof strip — 4 items dark */}
            <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {([
                ['Réponse rapide', 'Nous vous répondons sous 24h.', (<path d="M13 2L4 14h7l-1 8 9-12h-7l1-8z" />)],
                ['Équipe experte', 'Des spécialistes du transport à votre écoute.', (<><circle cx="9" cy="8" r="3" /><circle cx="17" cy="9" r="2.5" /><path d="M3 20c0-3 3-5 6-5s6 2 6 5M14 20c0-2.5 2-4 4-4s4 1.5 4 4" /></>)],
                ['Solutions sur-mesure', 'Une approche adaptée à votre organisation.', (<><path d="M12 3l8 3v6c0 4.5-3.2 8.2-8 9-4.8-.8-8-4.5-8-9V6z" /><path d="M9 12l2 2 4-4" /></>)],
                ['Confidentialité', 'Vos données sont traitées en toute sécurité.', (<><rect x="4" y="10" width="16" height="11" rx="2" /><path d="M8 10V7a4 4 0 118 0v3" /></>)],
              ] as const).map(([title, desc, icon]) => (
                <div key={title} className="flex items-start gap-3">
                  <span
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
                    style={{ background: 'rgba(59,130,246,0.15)', border: '1px solid rgba(96,165,250,0.3)' }}
                  >
                    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="#60A5FA" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      {icon}
                    </svg>
                  </span>
                  <div className="leading-tight">
                    <p className="text-[13px] font-bold" style={{ color: '#FFFFFF' }}>{title}</p>
                    <p className="mt-0.5 text-[12px]" style={{ color: 'rgba(203,213,225,0.75)' }}>{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right — floating form card */}
          <form
            id="contact-form"
            onSubmit={submit}
            className="relative rounded-2xl p-7 backdrop-blur-md"
            style={{
              background: 'rgba(11,19,43,0.72)',
              border: '1px solid rgba(96,165,250,0.25)',
              boxShadow: '0 30px 70px rgba(2,6,23,0.55)',
            }}
          >
            <h3 className="text-lg font-semibold" style={{ color: '#FFFFFF' }}>Envoyez-nous un message</h3>

            {/* Honeypot anti-spam */}
            <div className="hidden"><input name="bot-field" /></div>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <label className="grid gap-1.5">
                <span className="sr-only">Votre nom</span>
                <input
                  required
                  placeholder="Votre nom*"
                  value={form.name}
                  onChange={e => update('name', e.target.value)}
                  className="w-full rounded-lg px-4 py-3 text-[14px] text-white outline-none transition-colors placeholder:text-slate-400 focus:border-[#60A5FA]"
                  style={{ background: 'rgba(15,23,42,0.6)', border: '1px solid rgba(96,165,250,0.25)' }}
                />
              </label>
              <label className="grid gap-1.5">
                <span className="sr-only">Entreprise</span>
                <input
                  required
                  placeholder="Entreprise*"
                  value={form.company}
                  onChange={e => update('company', e.target.value)}
                  className="w-full rounded-lg px-4 py-3 text-[14px] text-white outline-none transition-colors placeholder:text-slate-400 focus:border-[#60A5FA]"
                  style={{ background: 'rgba(15,23,42,0.6)', border: '1px solid rgba(96,165,250,0.25)' }}
                />
              </label>
              <label className="grid gap-1.5 sm:col-span-2">
                <span className="sr-only">Email professionnel</span>
                <input
                  type="email"
                  required
                  placeholder="Email professionnel*"
                  value={form.email}
                  onChange={e => update('email', e.target.value)}
                  className="w-full rounded-lg px-4 py-3 text-[14px] text-white outline-none transition-colors placeholder:text-slate-400 focus:border-[#60A5FA]"
                  style={{ background: 'rgba(15,23,42,0.6)', border: '1px solid rgba(96,165,250,0.25)' }}
                />
              </label>
              <label className="grid gap-1.5 sm:col-span-2">
                <span className="sr-only">Objet de votre demande</span>
                <input
                  placeholder="Objet de votre demande"
                  value={form.objective}
                  onChange={e => update('objective', e.target.value)}
                  className="w-full rounded-lg px-4 py-3 text-[14px] text-white outline-none transition-colors placeholder:text-slate-400 focus:border-[#60A5FA]"
                  style={{ background: 'rgba(15,23,42,0.6)', border: '1px solid rgba(96,165,250,0.25)' }}
                />
              </label>
              <label className="grid gap-1.5 sm:col-span-2">
                <span className="sr-only">Votre message</span>
                <textarea
                  required
                  rows={4}
                  placeholder="Votre message*"
                  value={form.message}
                  onChange={e => update('message', e.target.value)}
                  className="w-full rounded-lg px-4 py-3 text-[14px] text-white outline-none transition-colors placeholder:text-slate-400 focus:border-[#60A5FA]"
                  style={{ background: 'rgba(15,23,42,0.6)', border: '1px solid rgba(96,165,250,0.25)' }}
                />
              </label>
              {/* Anti-spam math challenge (compact) */}
              <label className="grid gap-1.5 sm:col-span-2">
                <span className="text-[12px] font-medium" style={{ color: 'rgba(203,213,225,0.8)' }}>
                  Vérification : {challenge.a} + {challenge.b} = ?
                </span>
                <input
                  required
                  type="number"
                  value={captchaInput}
                  onChange={e => setCaptchaInput(e.target.value)}
                  className="w-full max-w-[120px] rounded-lg px-4 py-2.5 text-[14px] text-white outline-none focus:border-[#60A5FA]"
                  style={{ background: 'rgba(15,23,42,0.6)', border: '1px solid rgba(96,165,250,0.25)' }}
                />
              </label>
            </div>

            {error && (
              <p className="mt-4 rounded-lg px-4 py-3 text-sm" style={{ background: 'rgba(254,226,226,0.1)', color: '#FCA5A5', border: '1px solid rgba(252,165,165,0.3)' }}>{error}</p>
            )}

            {success ? (
              <p className="mt-5 rounded-lg px-4 py-3 text-sm" style={{ background: 'rgba(34,197,94,0.12)', color: '#86EFAC', border: '1px solid rgba(134,239,172,0.35)' }}>
                Demande reçue. Notre équipe vous contacte sous 24h pour organiser votre démonstration.
              </p>
            ) : (
              <div className="mt-5 flex items-center justify-end">
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center gap-2 rounded-lg px-5 py-3 text-sm font-semibold text-white shadow-[0_10px_30px_rgba(20,184,166,0.35)] transition-transform hover:-translate-y-0.5 disabled:opacity-50"
                  style={{ background: 'linear-gradient(135deg,#14B8A6,#22D3EE)' }}
                >
                  {submitting ? 'Envoi en cours…' : 'Envoyer ma demande'}
                  <span aria-hidden="true">→</span>
                </button>
              </div>
            )}
          </form>
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

      {/* ── COORDONNÉES ── */}
      <section className="w-full" style={{ background: '#F5F5F7', ...sectionPx, ...sectionPy }}>
        <div className="mx-auto grid max-w-5xl gap-12 md:grid-cols-[1fr_1fr]">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: '#6E6E73' }}>Coordonnées</p>
            <h2 className="mt-4 text-2xl font-semibold" style={{ color: '#000000' }}>Contactez-nous directement</h2>
            <div className="mt-8 grid gap-6 sm:grid-cols-2">
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
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: '#6E6E73' }}>Nos réseaux</p>
            <h2 className="mt-4 text-2xl font-semibold" style={{ color: '#000000' }}>Suivez NEXORA Truck</h2>
            <div className="mt-6 flex gap-5">
              <a href="https://www.linkedin.com/company/nexora-truck" target="_blank" rel="noopener noreferrer" aria-label="LinkedIn" className="transition-opacity hover:opacity-70">
                <svg className="h-7 w-7" viewBox="0 0 24 24" fill="#1D1D1F"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
              </a>
              <a href="https://twitter.com/nexoratruck" target="_blank" rel="noopener noreferrer" aria-label="X (Twitter)" className="transition-opacity hover:opacity-70">
                <svg className="h-7 w-7" viewBox="0 0 24 24" fill="#1D1D1F"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
              </a>
              <a href="https://www.facebook.com/nexoratruck" target="_blank" rel="noopener noreferrer" aria-label="Facebook" className="transition-opacity hover:opacity-70">
                <svg className="h-7 w-7" viewBox="0 0 24 24" fill="#1D1D1F"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
              </a>
            </div>
            <p className="mt-6 text-sm" style={{ color: '#6E6E73' }}>
              Préférez un envoi direct par email ? <a href={contactMailTo} className="font-semibold" style={{ color: '#2563EB' }}>Ouvrir votre messagerie →</a>
            </p>
          </div>
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
