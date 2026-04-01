import { Link } from 'react-router-dom'
import FeatureCard from '@/site/components/FeatureCard'
import SiteSection from '@/site/components/SiteSection'
import useSiteMeta from '@/site/hooks/useSiteMeta'

const modules = [
  {
    tag: 'Exploitation',
    title: 'Cockpit opérationnel en temps réel',
    body: 'OT, statuts, incidents et priorités sont centralisés dans un seul espace pour décider vite sans perdre le fil de la journée.',
  },
  {
    tag: 'Flotte',
    title: 'Gestion camions, remorques et maintenance',
    body: 'La flotte est reliée au planning et aux missions, avec une vision directe sur la disponibilité et les alertes atelier.',
  },
  {
    tag: 'Personnel',
    title: 'Conducteurs, RH et conformité',
    body: 'Dossiers chauffeurs, suivi documentaire, conformité et obligations terrain restent connectés aux opérations.',
  },
  {
    tag: 'Finance',
    title: 'Du transport livré à la facturation',
    body: 'Les données d exécution alimentent la facturation et la lecture de marge pour réduire les ressaisies et fiabiliser le pilotage.',
  },
  {
    tag: 'Communication',
    title: 'Coordination interne et client',
    body: 'Les échanges critiques restent reliés aux courses et au planning pour éviter la perte d information.',
  },
  {
    tag: 'API',
    title: 'Ouverture vers votre écosystème',
    body: 'Portail client, connectivité inter-ERP, automatisations et intégrations métier sont prévus dans l architecture produit.',
  },
] as const

const useCases = [
  'Réduire les retards en priorisant automatiquement les missions critiques.',
  'Gagner en lisibilité sur la charge hebdomadaire conducteurs et flotte.',
  'Mieux anticiper conformité, documents et échéances réglementaires.',
  'Piloter la rentabilité avec des données opérationnelles fiables.',
] as const

export default function SolutionPage() {
  useSiteMeta({
    title: 'La Solution ERP Transport',
    description: 'NEXORA Truck réunit exploitation, flotte, personnel, finance et communication dans un seul système pour transporteurs francophones.',
    canonicalPath: '/solution',
    keywords: 'solution ERP transport, logiciel transport routier, plateforme TMS complète, gestion exploitation transport',
  })

  return (
    <div className="space-y-8">
      <section className="rounded-[2rem] border border-[#c7ddff] bg-[linear-gradient(140deg,#ffffff_0%,#eff6ff_45%,#fff7ed_100%)] p-7 shadow-[0_24px_80px_rgba(30,64,175,0.14)] sm:p-10">
        <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#1d4ed8]">La solution</p>
        <h1 className="mt-4 max-w-4xl text-4xl font-semibold tracking-tight text-slate-950 sm:text-[3.1rem] sm:leading-[1.06]">
          Le système d exploitation complet du transport routier francophone
        </h1>
        <p className="mt-5 max-w-3xl text-base leading-8 text-slate-700">
          NEXORA Truck remplace la fragmentation des outils par une plateforme unique: opérationnel, planning, flotte, RH,
          conformité et finance avancent ensemble, avec une lecture claire pour la direction comme pour l exploitation.
        </p>
        <div className="mt-7 flex flex-wrap gap-3">
          <Link to="/demonstration" className="rounded-full bg-[#1d4ed8] px-5 py-3 text-sm font-semibold text-white hover:bg-[#1e40af]">
            Voir la démonstration
          </Link>
          <Link to="/avantages-roi" className="rounded-full border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-white">
            Analyser le ROI
          </Link>
        </div>
      </section>

      <SiteSection
        eyebrow="Modules"
        title="Une architecture pensée pour les transporteurs"
        description="Chaque module répond à un besoin concret, sans casser la cohérence globale du pilotage."
      >
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {modules.map(module => (
            <FeatureCard key={module.title} {...module} />
          ))}
        </div>
      </SiteSection>

      <SiteSection
        eyebrow="Cas d usage"
        title="Ce que les dirigeants veulent améliorer rapidement"
        description="La plateforme cible d abord les gains de lisibilité, de coordination et de rentabilité."
        muted
      >
        <div className="grid gap-4 lg:grid-cols-2">
          {useCases.map(useCase => (
            <article key={useCase} className="rounded-[1.4rem] border border-slate-200 bg-white p-5">
              <p className="text-sm leading-7 text-slate-700">{useCase}</p>
            </article>
          ))}
        </div>
      </SiteSection>
    </div>
  )
}
