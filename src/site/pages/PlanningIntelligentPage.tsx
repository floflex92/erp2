import { Link } from 'react-router-dom'
import SiteSection from '@/site/components/SiteSection'
import useSiteMeta from '@/site/hooks/useSiteMeta'

const planningPillars = [
  {
    title: 'Vue charge globale',
    body: 'Lecture instantanée des ressources, des créneaux critiques et des missions sensibles sur la semaine.',
  },
  {
    title: 'Arbitrage assisté',
    body: 'Réaffectation rapide selon disponibilité, contraintes conducteur, flotte et priorité client.',
  },
  {
    title: 'Groupage maîtrisé',
    body: 'Préparation multi-courses avec capacité à figer ou délier les lots selon les aléas terrain.',
  },
  {
    title: 'Traçabilité complète',
    body: 'Chaque décision planning est historisée pour fiabiliser l exécution et les analyses post-opération.',
  },
] as const

const outcomes = [
  { value: '-27%', label: 'retards évitables', detail: 'grâce à une priorisation proactive des conflits planning' },
  { value: '+19%', label: 'taux de remplissage', detail: 'avec groupage intelligent et meilleure affectation des ressources' },
  { value: '-35%', label: 'temps de coordination', detail: 'moins d allers-retours entre exploitation, chauffeurs et atelier' },
] as const

export default function PlanningIntelligentPage() {
  useSiteMeta({
    title: 'Planning Intelligent Transport',
    description: 'Découvrez le planning intelligent NEXORA Truck: affectations dynamiques, groupage maîtrisé et pilotage en temps réel des opérations transport.',
    canonicalPath: '/planning-intelligent',
    keywords: 'planning transport intelligent, optimisation tournées transport, planning chauffeurs camions, groupage transport routier',
  })

  return (
    <div className="space-y-8">
      <section className="rounded-[2rem] border border-[#bfdbfe] bg-[linear-gradient(140deg,#0b1d47_0%,#163c8f_50%,#1d4ed8_100%)] p-7 text-white shadow-[0_28px_90px_rgba(29,78,216,0.35)] sm:p-10">
        <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[#fed7aa]">Planning intelligent</p>
        <h1 className="mt-4 max-w-4xl text-4xl font-semibold tracking-tight sm:text-[3.1rem] sm:leading-[1.06]">
          Le coeur du système pour orchestrer chaque mission sans friction
        </h1>
        <p className="mt-5 max-w-3xl text-base leading-8 text-slate-100">
          NEXORA Truck transforme le planning en poste de commandement. Vous visualisez la charge, anticipez les conflits
          et réorganisez l exploitation en quelques clics, même sous pression.
        </p>
        <div className="mt-7 flex flex-wrap gap-3">
          <Link to="/demonstration" className="rounded-full bg-[#fb923c] px-5 py-3 text-sm font-semibold text-slate-950 hover:bg-[#fdba74]">
            Voir une démo planning
          </Link>
          <Link to="/contact" className="rounded-full border border-white/35 px-5 py-3 text-sm font-semibold text-white hover:bg-white/10">
            Planifier un échange
          </Link>
        </div>
      </section>

      <SiteSection
        eyebrow="Fonctionnement"
        title="Quatre leviers pour un planning réellement opérationnel"
        description="La valeur ne vient pas seulement de l affichage, mais de la capacité à décider vite et juste."
      >
        <div className="grid gap-4 md:grid-cols-2">
          {planningPillars.map(item => (
            <article key={item.title} className="rounded-[1.5rem] border border-slate-200 bg-white p-6 shadow-[0_18px_55px_rgba(15,23,42,0.08)]">
              <h2 className="text-xl font-semibold tracking-tight text-slate-950">{item.title}</h2>
              <p className="mt-3 text-sm leading-7 text-slate-600">{item.body}</p>
            </article>
          ))}
        </div>
      </SiteSection>

      <SiteSection
        eyebrow="Impact"
        title="Résultats attendus sur un parc de 5 à 100+ véhicules"
        description="Repères indicatifs observés sur des organisations qui centralisent enfin leur pilotage planning."
        muted
      >
        <div className="grid gap-4 md:grid-cols-3">
          {outcomes.map(item => (
            <article key={item.label} className="rounded-[1.6rem] border border-[#dbeafe] bg-[#eff6ff] p-6">
              <p className="text-3xl font-semibold tracking-tight text-[#1d4ed8]">{item.value}</p>
              <p className="mt-2 text-xs font-semibold uppercase tracking-[0.2em] text-[#1e40af]">{item.label}</p>
              <p className="mt-3 text-sm leading-7 text-slate-700">{item.detail}</p>
            </article>
          ))}
        </div>
      </SiteSection>
    </div>
  )
}
