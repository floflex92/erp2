import { Link } from 'react-router-dom'
import SiteSection from '@/site/components/SiteSection'
import ScreenshotPlaceholder from '@/site/components/ScreenshotPlaceholder'
import useSiteMeta from '@/site/hooks/useSiteMeta'

const problems = [
  'Perte de temps dans la gestion des disponibilités camions et remorques.',
  'Manque de visibilité sur les ressources mobilisables en temps réel.',
  'Outils dispersés entre planning, atelier et exploitation.',
  'Erreurs humaines sur les affectations et les priorités terrain.',
]

const solutionPillars = [
  {
    title: 'Centralisation flotte',
    body: 'Une seule vue pour les véhicules, les statuts et les disponibilités.',
  },
  {
    title: 'Pilotage global',
    body: 'Les décisions flotte restent alignées avec le planning transport.',
  },
  {
    title: 'Simplification operationnelle',
    body: 'Moins de coordination manuelle entre exploitation et maintenance.',
  },
  {
    title: 'Automatisation utile',
    body: 'Alertes, workflows et actions récurrentes exécutées automatiquement.',
  },
]

const keyFeatures = [
  { title: 'Planning transport', body: 'Projection charge et affectations par mission.' },
  { title: 'Gestion flotte', body: 'Suivi camions, remorques et indisponibilités critiques.' },
  { title: 'Conducteurs', body: 'Affectation chauffeur-flotte selon contraintes réelles.' },
  { title: 'Rentabilité', body: 'Lecture coût mission et impact des ressources engagées.' },
  { title: 'API et automatisation', body: 'Synchronisation avec vos outils métier existants.' },
]

export default function LogicielGestionFlotteCamionPage() {
  useSiteMeta({
    title: 'Logiciel gestion flotte camion',
    description:
      'Logiciel gestion flotte camion NEXORA Truck pour centraliser planning transport, disponibilités flotte, conducteurs et rentabilité.',
    canonicalPath: '/logiciel-gestion-flotte-camion',
    keywords:
      'logiciel gestion flotte camion, gestion flotte transport, logiciel flotte poids lourds, planning flotte transport, ERP transport routier',
    ogType: 'article',
    author: 'NEXORA Truck',
  })

  return (
    <div className="space-y-8">
      <section className="rounded-[2.2rem] border border-white/80 bg-white px-6 py-8 shadow-[0_24px_80px_rgba(15,23,42,0.1)] sm:px-8 sm:py-10">
        <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-sky-800">Page SEO secondaire</p>
        <h1 className="mt-4 max-w-4xl text-4xl font-semibold tracking-tight text-[var(--site-text)] sm:text-[3.2rem] sm:leading-[1.04]">
          Logiciel gestion flotte camion
        </h1>
        <p className="mt-5 max-w-3xl text-base leading-8 text-[var(--site-text-secondary)]">
          Quand la flotte n’est pas pilotée dans le même outil que l’exploitation, la coordination devient fragile. Les décisions arrivent trop tard et les ressources sont mal utilisées. Un logiciel de gestion flotte camion relie planning, terrain et performance dans un flux unique.
        </p>
        <div className="mt-7 flex flex-wrap gap-3">
          <Link to="/connexion-erp" className="site-btn-primary px-5 py-3 text-sm transition-colors">
            Tester l'ERP
          </Link>
          <Link to="/demonstration" className="rounded-full border border-slate-300 px-5 py-3 text-sm font-semibold text-[var(--site-text)] hover:bg-white">
            Demander une démo
          </Link>
        </div>
      </section>

      <SiteSection eyebrow="Problèmes" title="Les blocages fréquents côté flotte" description="Un manque de synchronisation flotte-planning crée des retards et des coûts évitables.">
        <ul className="grid gap-3">
          {problems.map(problem => (
            <li key={problem} className="rounded-[1.2rem] border border-slate-200/80 bg-white px-5 py-4 text-sm leading-7 text-[var(--site-text)]">
              {problem}
            </li>
          ))}
        </ul>
      </SiteSection>

      <SiteSection eyebrow="Solution NEXORA" title="Un pilotage flotte relié au terrain" description="NEXORA Truck unifie la gestion flotte camion et l’exécution transport pour garder la main sur les priorités.">
        <div className="grid gap-4 md:grid-cols-2">
          {solutionPillars.map(item => (
            <article key={item.title} className="rounded-[1.5rem] border border-slate-200/80 bg-white p-5">
              <h2 className="text-lg font-semibold tracking-tight text-slate-950">{item.title}</h2>
              <p className="mt-2 text-sm leading-7 text-[var(--site-text-secondary)]">{item.body}</p>
            </article>
          ))}
        </div>
      </SiteSection>

      <SiteSection eyebrow="Fonctionnalités clés" title="Modules utiles pour la flotte" description="Lecture rapide, action immédiate.">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {keyFeatures.map(feature => (
            <article key={feature.title} className="rounded-[1.5rem] border border-slate-200/80 bg-white p-5">
              <h3 className="text-base font-semibold text-[var(--site-text)]">{feature.title}</h3>
              <p className="mt-2 text-sm leading-7 text-[var(--site-text-secondary)]">{feature.body}</p>
            </article>
          ))}
        </div>
      </SiteSection>

      <SiteSection eyebrow="Visuel ERP" title="Emplacement screenshot flotte" description="Zone réservée pour une capture écran ERP centrée gestion flotte camion.">
        <ScreenshotPlaceholder
          title="Screenshot logiciel gestion flotte camion"
          caption="Insérez ici une capture de la vue flotte avec statuts véhicules, affectations et alertes atelier."
          format="16:9"
          label="Gestion flotte"
          status="Prêt à remplacer"
          highlights={[
            'Disponibilité flotte en direct',
            'Affectations planning transport',
            'Alertes maintenance critiques',
          ]}
        />
      </SiteSection>

      <SiteSection eyebrow="Lien principal" title="Retour à la page ERP transport routier" description="Cette page secondaire renvoie vers la page principale SEO." muted>
        <Link to="/erp-transport-routier" className="inline-flex rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-[var(--site-text)] transition-colors hover:bg-slate-50">
          Voir ERP transport routier
        </Link>
      </SiteSection>
    </div>
  )
}
