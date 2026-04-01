import { Link } from 'react-router-dom'
import SiteSection from '@/site/components/SiteSection'
import useSiteMeta from '@/site/hooks/useSiteMeta'

const kpis = [
  { label: 'Heures administratives', before: '42 h/semaine', after: '25 h/semaine' },
  { label: 'Courses en retard', before: '14 %', after: '8 %' },
  { label: 'Ressaisies facturation', before: 'élevées', after: 'réduites de 60 %' },
  { label: 'Marge non tracée', before: 'fréquente', after: 'sous contrôle' },
] as const

const caseStudies = [
  {
    company: 'Transport régional 28 véhicules',
    gain: 'ROI en 6 mois',
    detail: 'Centralisation exploitation + planning + suivi conformité, avec baisse des coûts cachés liés aux doublons et retards.',
  },
  {
    company: 'Groupe multisites 83 véhicules',
    gain: 'ROI en 9 mois',
    detail: 'Vision consolidée sur 3 agences et harmonisation des process de dispatch, affectation et facturation.',
  },
  {
    company: 'Flotte spécialisée frigorifique',
    gain: 'ROI en 7 mois',
    detail: 'Amélioration du taux de service client et réduction des pénalités grâce au pilotage temps réel des incidents.',
  },
] as const

export default function RoiPage() {
  useSiteMeta({
    title: 'Avantages et ROI',
    description: 'Mesurez le ROI de NEXORA Truck: gains opérationnels, réduction des ressaisies et meilleure rentabilité pour les transporteurs francophones.',
    canonicalPath: '/avantages-roi',
    keywords: 'ROI logiciel transport, gains ERP transport, optimisation coûts transport routier, rentabilité TMS',
  })

  return (
    <div className="space-y-8">
      <section className="rounded-[2rem] border border-[#fed7aa] bg-[linear-gradient(140deg,#fff7ed_0%,#ffffff_55%,#eff6ff_100%)] p-7 shadow-[0_24px_80px_rgba(251,146,60,0.18)] sm:p-10">
        <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[#c2410c]">Avantages et ROI</p>
        <h1 className="mt-4 max-w-4xl text-4xl font-semibold tracking-tight text-slate-950 sm:text-[3.05rem] sm:leading-[1.06]">
          Prouver la valeur business de votre transformation digitale transport
        </h1>
        <p className="mt-5 max-w-3xl text-base leading-8 text-slate-700">
          La promesse NEXORA Truck est simple: moins de pertes invisibles, plus de maîtrise opérationnelle et une lecture financière
          fiable pour piloter la croissance dans un contexte de marges serrées.
        </p>
      </section>

      <SiteSection
        eyebrow="Benchmark"
        title="Avant / après centralisation du pilotage"
        description="Exemple de trajectoire observée après remplacement des outils fragmentés."
      >
        <div className="grid gap-4 md:grid-cols-2">
          {kpis.map(item => (
            <article key={item.label} className="rounded-[1.45rem] border border-slate-200 bg-white p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">{item.label}</p>
              <div className="mt-3 grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-rose-200 bg-rose-50 p-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-rose-700">Avant</p>
                  <p className="mt-1 text-sm font-semibold text-slate-800">{item.before}</p>
                </div>
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-emerald-700">Après</p>
                  <p className="mt-1 text-sm font-semibold text-slate-800">{item.after}</p>
                </div>
              </div>
            </article>
          ))}
        </div>
      </SiteSection>

      <SiteSection
        eyebrow="Études de cas"
        title="Trois profils d entreprises, trois trajectoires de gains"
        description="Des scénarios réalistes pour aider les décideurs à se projeter rapidement."
        muted
      >
        <div className="grid gap-4 md:grid-cols-3">
          {caseStudies.map(item => (
            <article key={item.company} className="rounded-[1.5rem] border border-slate-200 bg-white p-6 shadow-[0_18px_55px_rgba(15,23,42,0.06)]">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#1d4ed8]">{item.company}</p>
              <h2 className="mt-3 text-xl font-semibold tracking-tight text-slate-950">{item.gain}</h2>
              <p className="mt-3 text-sm leading-7 text-slate-600">{item.detail}</p>
            </article>
          ))}
        </div>
      </SiteSection>

      <section className="rounded-[1.8rem] border border-slate-200 bg-slate-950 p-7 text-white sm:p-9">
        <h2 className="text-3xl font-semibold tracking-tight">Calculez votre ROI sur vos propres données</h2>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-200">
          Nous comparons votre organisation actuelle avec un scénario cible NEXORA Truck: gains de temps, baisse des incidents et amélioration de la marge.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link to="/demonstration" className="rounded-full bg-[#fb923c] px-5 py-3 text-sm font-semibold text-slate-950 hover:bg-[#fdba74]">
            Réserver une démonstration
          </Link>
          <Link to="/contact" className="rounded-full border border-white/25 px-5 py-3 text-sm font-semibold text-white hover:bg-white/10">
            Parler à un expert
          </Link>
        </div>
      </section>
    </div>
  )
}
