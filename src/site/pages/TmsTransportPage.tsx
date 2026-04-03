import { Link } from 'react-router-dom'
import SiteSection from '@/site/components/SiteSection'
import ScreenshotPlaceholder from '@/site/components/ScreenshotPlaceholder'
import useSiteMeta from '@/site/hooks/useSiteMeta'

const problems = [
  'Perte de temps dans le suivi des ordres de transport et des statuts.',
  'Manque de visibilité sur l’exécution et les priorités client.',
  'Outils dispersés entre TMS, communication et facturation.',
  'Erreurs humaines dues aux transferts manuels d’informations.',
]

const solutionPillars = [
  {
    title: 'Centralisation TMS',
    body: 'Toutes les étapes mission sont réunies dans une seule vue transport.',
  },
  {
    title: 'Pilotage global',
    body: 'Exécution, coordination équipe et suivi client restent alignés.',
  },
  {
    title: 'Simplification process',
    body: 'Moins d’outils satellites, plus de clarté pour l’exploitation.',
  },
  {
    title: 'Automatisation operationnelle',
    body: 'Alertes et synchronisations API réduisent les tâches répétitives.',
  },
]

const keyFeatures = [
  { title: 'Planning transport', body: 'Ordonnancement dynamique des missions et des urgences.' },
  { title: 'Gestion flotte', body: 'Coordination des ressources mobilisees par OT.' },
  { title: 'Conducteurs', body: 'Exécution terrain connectée au suivi exploitation.' },
  { title: 'Rentabilité', body: 'Vision marge mission et continuité jusqu’à la facturation.' },
  { title: 'API et automatisation', body: 'Connecteurs métier pour fluidifier les flux externes.' },
]

export default function TmsTransportPage() {
  useSiteMeta({
    title: 'TMS transport',
    description:
      'TMS transport NEXORA Truck pour piloter les ordres de transport, la flotte, les conducteurs et la rentabilite dans un flux unique.',
    canonicalPath: '/tms-transport',
    keywords:
      'TMS transport, logiciel TMS, gestion transport routier, suivi ordres de transport, ERP transport routier, automatisation transport',
    ogType: 'article',
    author: 'NEXORA Truck',
  })

  return (
    <div className="space-y-8">
      <section className="rounded-[2.2rem] border border-white/80 bg-white px-6 py-8 shadow-[0_24px_80px_rgba(15,23,42,0.1)] sm:px-8 sm:py-10">
        <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-sky-800">Page SEO secondaire</p>
        <h1 className="mt-4 max-w-4xl text-4xl font-semibold tracking-tight text-[var(--site-text)] sm:text-[3.2rem] sm:leading-[1.04]">
          TMS transport
        </h1>
        <p className="mt-5 max-w-3xl text-base leading-8 text-[var(--site-text-secondary)]">
          Un TMS transport devient inefficace quand il n’est pas relié aux autres fonctions métier. Les équipes perdent du temps à recouper les informations et à corriger les erreurs. Un pilotage TMS unifié rend l’exécution plus rapide et plus fiable.
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

      <SiteSection eyebrow="Problèmes" title="Les limites d’un TMS isolé" description="Sans maillage des données, les délais et les coûts dérapent rapidement.">
        <ul className="grid gap-3">
          {problems.map(problem => (
            <li key={problem} className="rounded-[1.2rem] border border-slate-200/80 bg-white px-5 py-4 text-sm leading-7 text-[var(--site-text)]">
              {problem}
            </li>
          ))}
        </ul>
      </SiteSection>

      <SiteSection eyebrow="Solution NEXORA" title="Un TMS transport connecté à toute l’exploitation" description="NEXORA Truck transforme le TMS en système de pilotage global.">
        <div className="grid gap-4 md:grid-cols-2">
          {solutionPillars.map(item => (
            <article key={item.title} className="rounded-[1.5rem] border border-slate-200/80 bg-white p-5">
              <h2 className="text-lg font-semibold tracking-tight text-slate-950">{item.title}</h2>
              <p className="mt-2 text-sm leading-7 text-[var(--site-text-secondary)]">{item.body}</p>
            </article>
          ))}
        </div>
      </SiteSection>

      <SiteSection eyebrow="Fonctionnalités clés" title="Essentiel TMS pour aller vite" description="Phrases courtes, impact direct.">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {keyFeatures.map(feature => (
            <article key={feature.title} className="rounded-[1.5rem] border border-slate-200/80 bg-white p-5">
              <h3 className="text-base font-semibold text-[var(--site-text)]">{feature.title}</h3>
              <p className="mt-2 text-sm leading-7 text-[var(--site-text-secondary)]">{feature.body}</p>
            </article>
          ))}
        </div>
      </SiteSection>

      <SiteSection eyebrow="Visuel ERP" title="Emplacement screenshot TMS" description="Zone réservée pour une capture écran TMS transport dans la DA actuelle.">
        <ScreenshotPlaceholder
          title="Screenshot TMS transport"
          caption="Insérez ici une capture du pilotage OT avec statuts transport, priorités et suivi exécution."
          format="16:9"
          label="TMS transport"
          status="Prêt à remplacer"
          highlights={[
            'Suivi OT en temps réel',
            'Coordination exploitation flotte',
            'Passage execution vers facturation',
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
