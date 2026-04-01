import { Link } from 'react-router-dom'
import { useMemo, useState } from 'react'
import FrameChauffeur from '@/site/components/frames/FrameChauffeur'
import FrameDashboard from '@/site/components/frames/FrameDashboard'
import FramePlanning from '@/site/components/frames/FramePlanning'
import SiteSection from '@/site/components/SiteSection'
import useSiteMeta from '@/site/hooks/useSiteMeta'

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

  useSiteMeta({
    title: 'Démonstration ERP Transport',
    description: 'Réservez une démonstration personnalisée NEXORA Truck avec qualification de vos enjeux transport, planning et rentabilité.',
    canonicalPath: '/demonstration',
    keywords: 'démo ERP transport, démonstration TMS, logiciel transport routier démonstration, rendez-vous Nexora Truck',
  })

  const demoSubject = useMemo(() => {
    return encodeURIComponent(`Demande de démonstration NEXORA Truck - ${form.company || 'Entreprise transport'}`)
  }, [form.company])

  const demoBody = useMemo(() => {
    return encodeURIComponent(
      `Entreprise: ${form.company}\nEmail: ${form.email}\nTaille flotte: ${form.fleetSize}\nPriorité: ${form.priority}\nDate souhaitée: ${form.date || 'à définir'}\nCréneau: ${form.slot}`,
    )
  }, [form])

  function handleChange<K extends keyof DemoFormState>(key: K, value: DemoFormState[K]) {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitted(true)

    const win = window as Window & { dataLayer?: Array<Record<string, unknown>> }
    if (!Array.isArray(win.dataLayer)) {
      win.dataLayer = []
    }
    win.dataLayer.push({
      event: 'demo_request',
      fleet_size: form.fleetSize,
      priority: form.priority,
    })
  }

  return (
    <div className="space-y-8">
      <SiteSection
        eyebrow="Démonstration"
        title="Réservez une démonstration alignée sur votre réalité terrain"
        description="Nous préparons la session selon votre taille de flotte, vos priorités et votre maturité digitale pour maximiser la valeur du rendez-vous."
      >
        <div className="grid gap-5 lg:grid-cols-[1.05fr_0.95fr]">
          <form onSubmit={handleSubmit} className="rounded-[1.7rem] border border-slate-200 bg-white p-6 shadow-[0_18px_60px_rgba(15,23,42,0.08)]">
            <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-[#1d4ed8]">Qualification prospect</p>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <label className="text-sm text-slate-700 sm:col-span-2">
                Nom de l entreprise
                <input
                  required
                  value={form.company}
                  onChange={e => handleChange('company', e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3 py-2"
                />
              </label>
              <label className="text-sm text-slate-700 sm:col-span-2">
                Email professionnel
                <input
                  type="email"
                  required
                  value={form.email}
                  onChange={e => handleChange('email', e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3 py-2"
                />
              </label>
              <label className="text-sm text-slate-700">
                Taille de flotte
                <select value={form.fleetSize} onChange={e => handleChange('fleetSize', e.target.value)} className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3 py-2">
                  <option value="5-20">5 à 20 véhicules</option>
                  <option value="21-50">21 à 50 véhicules</option>
                  <option value="51-100">51 à 100 véhicules</option>
                  <option value="100+">Plus de 100 véhicules</option>
                </select>
              </label>
              <label className="text-sm text-slate-700">
                Priorité principale
                <select value={form.priority} onChange={e => handleChange('priority', e.target.value)} className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3 py-2">
                  <option value="planning">Planning intelligent</option>
                  <option value="exploitation">Pilotage exploitation</option>
                  <option value="conformite">Conformité et RH</option>
                  <option value="finance">Rentabilité et facturation</option>
                </select>
              </label>
              <label className="text-sm text-slate-700">
                Date souhaitée
                <input type="date" value={form.date} onChange={e => handleChange('date', e.target.value)} className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3 py-2" />
              </label>
              <label className="text-sm text-slate-700">
                Créneau
                <select value={form.slot} onChange={e => handleChange('slot', e.target.value)} className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3 py-2">
                  <option value="09:00">09:00</option>
                  <option value="11:00">11:00</option>
                  <option value="14:00">14:00</option>
                  <option value="16:00">16:00</option>
                </select>
              </label>
            </div>
            <div className="mt-5 flex flex-wrap gap-3">
              <button type="submit" className="rounded-full bg-[#1d4ed8] px-5 py-3 text-sm font-semibold text-white hover:bg-[#1e40af]">
                Préparer ma démo
              </button>
              <a
                href={`mailto:contact@nexora-truck.fr?subject=${demoSubject}&body=${demoBody}`}
                className="rounded-full border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Envoyer par email
              </a>
            </div>
            {submitted ? (
              <p className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                Demande enregistrée. Un conseiller NEXORA Truck revient vers vous avec une trame de démonstration personnalisée.
              </p>
            ) : null}
          </form>

          <div className="space-y-4">
            <article className="rounded-[1.5rem] border border-[#fed7aa] bg-[#fff7ed] p-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#c2410c]">Calendrier de rendez-vous</p>
              <h3 className="mt-2 text-xl font-semibold tracking-tight text-slate-950">Session de 45 minutes</h3>
              <p className="mt-2 text-sm leading-7 text-slate-700">
                1. Diagnostic rapide de votre contexte
                2. Démo guidée par vos enjeux
                3. Plan d adoption et prochaines étapes
              </p>
            </article>
            <article className="rounded-[1.5rem] border border-slate-200 bg-white p-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#1d4ed8]">Conversion qualifiée</p>
              <p className="mt-2 text-sm leading-7 text-slate-600">
                Cette page est pensée pour générer des leads qualifiés: moins de volume inutile, plus de rendez-vous utiles.
              </p>
              <Link to="/avantages-roi" className="mt-4 inline-flex rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                Voir les bénéfices ROI
              </Link>
            </article>
          </div>
        </div>
      </SiteSection>

      <SiteSection
        eyebrow="Galerie interactive"
        title="Explorez les zones clés du produit"
        description="Trois aperçus visuels pour illustrer la plateforme en action avant la démo personnalisée."
      >
        <div className="grid gap-5 xl:grid-cols-3">
          <div className="overflow-hidden rounded-[1.7rem] border border-slate-200 bg-slate-950 p-3 shadow-[0_20px_60px_rgba(15,23,42,0.22)]">
            <FrameDashboard />
          </div>
          <div className="overflow-hidden rounded-[1.7rem] border border-slate-200 bg-slate-950 p-3 shadow-[0_20px_60px_rgba(15,23,42,0.22)]">
            <FramePlanning />
          </div>
          <div className="overflow-hidden rounded-[1.7rem] border border-slate-200 bg-slate-950 p-3 shadow-[0_20px_60px_rgba(15,23,42,0.22)]">
            <FrameChauffeur />
          </div>
        </div>
      </SiteSection>
    </div>
  )
}