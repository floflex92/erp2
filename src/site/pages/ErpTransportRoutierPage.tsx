import { Link } from 'react-router-dom'
import SiteSection from '@/site/components/SiteSection'
import ScreenshotPlaceholder from '@/site/components/ScreenshotPlaceholder'
import useSiteMeta from '@/site/hooks/useSiteMeta'

const problems = [
  'Perte de temps entre planning, exploitation et facturation.',
  'Manque de visibilité sur la flotte, les conducteurs et les priorités.',
  'Outils dispersés qui cassent le suivi des opérations.',
  'Erreurs humaines liées aux doubles saisies et aux relais manuels.',
]

const solutionPillars = [
  {
    title: 'Centralisation',
    body: 'Toutes les données transport restent dans le même ERP, sans fragmentation.',
  },
  {
    title: 'Pilotage global',
    body: 'Une lecture unifiée des courses, des ressources et de la rentabilité.',
  },
  {
    title: 'Simplification',
    body: 'Moins de ressaisies, moins de frictions, plus de décisions utiles.',
  },
  {
    title: 'Automatisation',
    body: 'Workflows, alertes et synchronisations API pour accélérer l’exécution.',
  },
]

const keyFeatures = [
  {
    title: 'Planning transport',
    body: 'Affectation rapide des missions et arbitrage des urgences.',
  },
  {
    title: 'Gestion flotte',
    body: 'Camions, remorques et disponibilités reliés aux opérations.',
  },
  {
    title: 'Conducteurs',
    body: 'Contraintes terrain, suivi RH et exécution connectés.',
  },
  {
    title: 'Rentabilite',
    body: 'Lecture directe des marges entre exécution et facturation.',
  },
  {
    title: 'API et automatisation',
    body: 'Connectivité avec vos flux externes et actions métier automatisées.',
  },
]

export default function ErpTransportRoutierPage() {
  useSiteMeta({
    title: 'ERP transport routier',
    description:
      'ERP transport routier NEXORA Truck pour centraliser planning transport, gestion flotte camion, conducteurs, rentabilite et automatisation API.',
    canonicalPath: '/erp-transport-routier',
    keywords:
      'ERP transport routier, logiciel transport, gestion flotte camion, planning transport, TMS transport, automatisation API transport',
    ogType: 'article',
    author: 'NEXORA Truck',
  })

  return (
    <div className="space-y-8">
      <section className="rounded-[2.2rem] border border-white/80 bg-white px-6 py-8 shadow-[0_24px_80px_rgba(15,23,42,0.1)] sm:px-8 sm:py-10">
        <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-sky-800">Page SEO principale</p>
        <h1 className="mt-4 max-w-4xl text-4xl font-semibold tracking-tight text-[var(--site-text)] sm:text-[3.2rem] sm:leading-[1.04]">
          ERP transport routier
        </h1>
        <p className="mt-5 max-w-3xl text-base leading-8 text-[var(--site-text-secondary)]">
          Les transporteurs perdent du temps quand le planning, la flotte, les conducteurs et la facturation sont séparés. Le manque de vue globale ralentit les décisions et augmente les erreurs. Un ERP transport routier permet de reprendre le contrôle opérationnel avec une base unique.
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

      <SiteSection
        eyebrow="Problèmes"
        title="Pourquoi l’organisation transport se grippe"
        description="Les signaux faibles deviennent rapidement des retards, des litiges et des marges qui se dégradent."
      >
        <ul className="grid gap-3">
          {problems.map(problem => (
            <li key={problem} className="rounded-[1.2rem] border border-slate-200/80 bg-white px-5 py-4 text-sm leading-7 text-[var(--site-text)]">
              {problem}
            </li>
          ))}
        </ul>
      </SiteSection>

      <SiteSection
        eyebrow="Solution NEXORA"
        title="Un ERP transport routier orienté exécution"
        description="NEXORA Truck relie exploitation, flotte et finance dans un système lisible pour toute l’équipe."
      >
        <div className="grid gap-4 md:grid-cols-2">
          {solutionPillars.map(item => (
            <article key={item.title} className="rounded-[1.5rem] border border-slate-200/80 bg-white p-5">
              <h3 className="text-lg font-semibold tracking-tight text-slate-950">{item.title}</h3>
              <p className="mt-2 text-sm leading-7 text-[var(--site-text-secondary)]">{item.body}</p>
            </article>
          ))}
        </div>
      </SiteSection>

      <SiteSection
        eyebrow="Fonctionnalités clés"
        title="Ce que l’équipe utilise chaque jour"
        description="Des modules courts à lire, concrets à activer."
      >
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {keyFeatures.map(feature => (
            <article key={feature.title} className="rounded-[1.5rem] border border-slate-200/80 bg-white p-5">
              <h3 className="text-base font-semibold text-[var(--site-text)]">{feature.title}</h3>
              <p className="mt-2 text-sm leading-7 text-[var(--site-text-secondary)]">{feature.body}</p>
            </article>
          ))}
        </div>
      </SiteSection>

      <SiteSection
        eyebrow="Visuel ERP"
        title="Emplacement screenshot ERP"
        description="Zone prévue pour une capture écran produit, sans modifier la direction artistique actuelle."
      >
        <ScreenshotPlaceholder
          title="Screenshot ERP transport routier"
          caption="Insérez ici une capture du cockpit exploitation avec planning, flotte et statuts transport."
          format="16:9"
          label="ERP transport routier"
          status="Prêt à remplacer"
          highlights={[
            'Planning transport unifié',
            'Visibilité flotte et conducteurs',
            'Suivi rentabilité mission',
          ]}
        />
      </SiteSection>

      <SiteSection
        eyebrow="Pages associees"
        title="Approfondir par besoin métier"
        description="Cette page principale relie les intentions de recherche les plus proches."
        muted
      >
        <div className="grid gap-4 md:grid-cols-2">
          <Link to="/logiciel-gestion-flotte-camion" className="rounded-[1.5rem] border border-slate-200/80 bg-white p-5 transition-colors hover:bg-slate-50">
            <h3 className="text-lg font-semibold tracking-tight text-[var(--site-text)]">Logiciel gestion flotte camion</h3>
            <p className="mt-2 text-sm leading-7 text-[var(--site-text-secondary)]">Voir une page ciblée sur le pilotage flotte et la disponibilité des ressources.</p>
          </Link>
          <Link to="/tms-transport" className="rounded-[1.5rem] border border-slate-200/80 bg-white p-5 transition-colors hover:bg-slate-50">
            <h3 className="text-lg font-semibold tracking-tight text-[var(--site-text)]">TMS transport</h3>
            <p className="mt-2 text-sm leading-7 text-[var(--site-text-secondary)]">Voir la page dédiée au pilotage TMS et au suivi exécution jusqu’à la facturation.</p>
          </Link>
        </div>
      </SiteSection>

      <section className="site-on-dark rounded-[2rem] border border-white/70 bg-[linear-gradient(145deg,#0f172a,#111827)] px-6 py-8 text-white shadow-[0_28px_80px_rgba(15,23,42,0.2)] sm:px-8 sm:py-10">
        <h2 className="text-3xl font-semibold tracking-tight sm:text-[2.45rem]">Passez d’une gestion réactive à un pilotage fiable</h2>
        <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-300 sm:text-base">
          NEXORA Truck structure votre ERP transport routier pour accélérer l’exploitation et sécuriser la croissance.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link to="/connexion-erp" className="rounded-full bg-white px-5 py-3 text-sm font-semibold text-slate-950 hover:bg-slate-100">
            Tester l'ERP
          </Link>
          <Link to="/demonstration" className="rounded-full border border-white/20 px-5 py-3 text-sm font-semibold text-white hover:bg-white/10">
            Demander une démo
          </Link>
        </div>
      </section>
    </div>
  )
}
