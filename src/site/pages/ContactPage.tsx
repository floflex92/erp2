import { Link } from 'react-router-dom'
import { useState } from 'react'
import SiteSection from '@/site/components/SiteSection'
import useSiteMeta from '@/site/hooks/useSiteMeta'

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

export default function ContactPage() {
  const [form, setForm] = useState<ContactForm>(initialForm)
  const [success, setSuccess] = useState(false)

  useSiteMeta({
    title: 'Contact',
    description: 'Contactez NEXORA Truck pour qualifier votre projet ERP transport et organiser un rendez-vous de démonstration personnalisé.',
    canonicalPath: '/contact',
    keywords: 'contact ERP transport, rendez-vous démonstration TMS, projet digital transport routier',
  })

  function update<K extends keyof ContactForm>(key: K, value: ContactForm[K]) {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSuccess(true)
  }

  const contactMailTo = `mailto:contact@nexora-truck.fr?subject=${encodeURIComponent(`Projet ERP transport - ${form.company || 'Entreprise'}`)}&body=${encodeURIComponent(
    `Nom: ${form.name}\nEntreprise: ${form.company}\nEmail: ${form.email}\nObjectif: ${form.objective}\nTaille flotte: ${form.vehicles}\nMessage: ${form.message}`,
  )}`

  return (
    <div className="space-y-8">
      <SiteSection
        eyebrow="Contact"
        title="Transformons votre ambition transport en plan d action concret"
        description="Ce formulaire qualifie votre besoin pour organiser un échange utile dès le premier rendez-vous."
      >
        <div className="grid gap-5 lg:grid-cols-[1.08fr_0.92fr]">
          <form onSubmit={submit} className="rounded-[1.75rem] border border-slate-200/80 bg-white p-6 shadow-[0_18px_60px_rgba(15,23,42,0.08)]">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="text-sm text-slate-700">
                Votre nom
                <input required value={form.name} onChange={e => update('name', e.target.value)} className="mt-1.5 w-full rounded-xl border border-slate-300 px-3 py-2" />
              </label>
              <label className="text-sm text-slate-700">
                Entreprise
                <input required value={form.company} onChange={e => update('company', e.target.value)} className="mt-1.5 w-full rounded-xl border border-slate-300 px-3 py-2" />
              </label>
              <label className="text-sm text-slate-700 sm:col-span-2">
                Email professionnel
                <input type="email" required value={form.email} onChange={e => update('email', e.target.value)} className="mt-1.5 w-full rounded-xl border border-slate-300 px-3 py-2" />
              </label>
              <label className="text-sm text-slate-700">
                Objectif principal
                <select value={form.objective} onChange={e => update('objective', e.target.value)} className="mt-1.5 w-full rounded-xl border border-slate-300 px-3 py-2">
                  <option value="modernisation">Moderniser le pilotage global</option>
                  <option value="planning">Optimiser le planning</option>
                  <option value="rentabilite">Améliorer la rentabilité</option>
                  <option value="conformite">Sécuriser conformité et RH</option>
                </select>
              </label>
              <label className="text-sm text-slate-700">
                Taille de flotte
                <select value={form.vehicles} onChange={e => update('vehicles', e.target.value)} className="mt-1.5 w-full rounded-xl border border-slate-300 px-3 py-2">
                  <option value="5-20">5 à 20 véhicules</option>
                  <option value="21-50">21 à 50 véhicules</option>
                  <option value="51-100">51 à 100 véhicules</option>
                  <option value="100+">100+ véhicules</option>
                </select>
              </label>
              <label className="text-sm text-slate-700 sm:col-span-2">
                Contexte et attentes
                <textarea value={form.message} onChange={e => update('message', e.target.value)} rows={4} className="mt-1.5 w-full rounded-xl border border-slate-300 px-3 py-2" />
              </label>
            </div>
            <div className="mt-5 flex flex-wrap gap-3">
              <button type="submit" className="rounded-full bg-[#1d4ed8] px-5 py-3 text-sm font-semibold text-white hover:bg-[#1e40af]">
                Envoyer ma demande
              </button>
              <a href={contactMailTo} className="rounded-full border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                Envoyer via email
              </a>
            </div>
            {success ? (
              <p className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                Demande reçue. Notre équipe vous contacte rapidement pour cadrer votre démonstration.
              </p>
            ) : null}
          </form>

          <article className="rounded-[1.75rem] border border-slate-200/80 bg-[linear-gradient(145deg,#0f172a,#1e3a8a)] p-6 text-white shadow-[0_20px_70px_rgba(15,23,42,0.22)]">
            <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[#fdba74]">Prise de rendez-vous</p>
            <h3 className="mt-4 text-2xl font-semibold tracking-tight">Un parcours simple en 3 étapes</h3>
            <div className="mt-4 space-y-3 text-sm leading-7 text-slate-200">
              <p>1. Qualification de votre contexte</p>
              <p>2. Démonstration personnalisée selon vos priorités</p>
              <p>3. Feuille de route de déploiement réaliste</p>
            </div>
            <p className="mt-4 text-sm leading-7 text-slate-200">
              Notre objectif: transformer chaque contact en opportunité qualifiée, avec un discours clair pour les décideurs transport.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link to="/demonstration" className="rounded-full bg-white px-5 py-3 text-sm font-semibold text-slate-950 hover:bg-slate-100">
                Voir la démonstration
              </Link>
              <Link to="/a-propos" className="rounded-full border border-white/30 px-5 py-3 text-sm font-semibold text-white hover:bg-white/10">
                Découvrir NEXORA Truck
              </Link>
            </div>
          </article>
        </div>
      </SiteSection>
    </div>
  )
}