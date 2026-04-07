import { Link } from 'react-router-dom'
import SiteSection from '@/site/components/SiteSection'
import ScreenshotPlaceholder from '@/site/components/ScreenshotPlaceholder'
import useSiteMeta from '@/site/hooks/useSiteMeta'

const problems = [
  'Position des véhicules inconnue en temps réel, relances conducteurs chronophages.',
  'Données terrain non remontées automatiquement : kilométrage, arrêts, incidents.',
  "Absence d’alertes sur les comportements de conduite ou les déviations de trajet.",
  'Rapprochements manuels entre données GPS et ordres de transport.',
]

const solutionPillars = [
  {
    title: 'Géolocalisation en temps réel',
    body: "Position et statut de chaque véhicule visibles directement dans l’exploitation, sans outil tiers.",
  },
  {
    title: 'Données terrain exploitables',
    body: "Kilométrage, durée de trajet, arrêts non planifiés et incidents remontés automatiquement dans l’ERP.",
  },
  {
    title: 'Alertes automatisées',
    body: "Déviations de trajet, vitesse excessive, arrêts prolongés : l’équipe est informée avant que le problème ne s’aggrave.",
  },
  {
    title: 'Intégration TMS et gestion flotte',
    body: 'Les données télématiques alimentent directement le planning, la facturation kilométrique et le suivi de la flotte.',
  },
]

const keyFeatures = [
  { title: 'Suivi GPS temps réel', body: 'Carte live avec position, vitesse et statut de chaque poids lourd.' },
  { title: 'Kilométrage automatique', body: 'Relevé en continu pour facturation précise et suivi du TCO flotte.' },
  { title: 'Alertes comportement conduite', body: 'Notifications sur freinages brusques, excès de vitesse et conduite hors plage.' },
  { title: "Détection d’arrêts non planifiés", body: "Signalement immédiat des pauses non prévues pour réorganiser l’exploitation." },
  { title: 'Rapprochement automatique OT', body: "Les données GPS se lient à l’ordre de transport sans ressaisie manuelle." },
]

export default function TelématiqueTransportPage() {
  useSiteMeta({
    title: 'Télématique transport : GPS intégré ERP/TMS, alertes et kilométrage',
    description:
      'Télématique transport NEXORA Truck : géolocalisation en temps réel, alertes comportement conduite, kilométrage automatique et intégration ERP/TMS.',
    canonicalPath: '/telematique-transport',
    keywords:
      'télématique transport, télématique embarquée, géolocalisation transport, suivi GPS poids lourd, boitier télématique transport, ERP transport routier',
    ogType: 'article',
    author: 'NEXORA Truck',
    breadcrumbs: [{ name: 'Télématique transport', path: '/telematique-transport' }],
    faqItems: [
      {
        question: 'Qu’est-ce que la télématique transport ?',
        answer: 'La télématique transport désigne les systèmes embarqués sur poids lourds transmettant en temps réel géolocalisation, statuts de conduite, kilométrage et alertes comportement à l’ERP de l’entreprise.',
      },
      {
        question: 'Comment la télématique est-elle intégrée dans un ERP transport ?',
        answer: 'NEXORA Truck se connecte aux principales boîtes noires (Webfleet, FleetBoard, Samsara) via API. Positions GPS, statuts et kilométrage remontent automatiquement dans le TMS sans saisie manuelle.',
      },
      {
        question: 'La télématique transport est-elle obligatoire ?',
        answer: 'Le chronotachygraphe numérique est obligatoire pour les PL > 3,5 t en transport professionnel. La télématique GPS n’est pas légalement obligatoire mais devient indispensable dès quelques véhicules pour piloter une exploitation sérieuse.',
      },
      {
        question: 'Quelle différence entre télématique et chronotachygraphe ?',
        answer: 'Le chronotachygraphe enregistre les temps de conduite pour la conformité réglementaire. La télématique couvre un périmètre plus large : GPS, alertes conduite, kilométrage, surveillance de zone. Les deux sont complémentaires dans NEXORA Truck.',
      },
    ],
  ogImage: 'https://nexora-truck.fr/site/screenshots/map-live-vehicles.png',
  })

  return (
    <div className="space-y-8">
      <section className="rounded-[2.2rem] border border-white/80 bg-white px-6 py-8 shadow-[0_24px_80px_rgba(15,23,42,0.1)] sm:px-8 sm:py-10">
        <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-sky-800">Page SEO secondaire</p>
        <h1 className="mt-4 max-w-4xl text-4xl font-semibold tracking-tight text-[var(--site-text)] sm:text-[3.2rem] sm:leading-[1.04]">
          Télématique transport : GPS, kilométrage automatique et alertes dans votre exploitation
        </h1>
        <p className="mt-5 max-w-3xl text-base leading-8 text-[var(--site-text-secondary)]">
          Une solution de télématique transport isolée produit des données sans les relier à l'exploitation. Les équipes
          consultent deux outils différents et recopient les informations utiles à la main. Quand la télématique est intégrée
          à l'ERP et au TMS, les données GPS deviennent immédiatement actionnables pour le planning, la facturation et le
          suivi de flotte.
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

      <SiteSection eyebrow="Problèmes" title="Quand la télématique reste un outil à part" description="Des données GPS non reliées à l'exploitation restent inutiles pour décider vite.">
        <ul className="grid gap-3">
          {problems.map(problem => (
            <li key={problem} className="rounded-[1.2rem] border border-slate-200/80 bg-white px-5 py-4 text-sm leading-7 text-[var(--site-text)]">
              {problem}
            </li>
          ))}
        </ul>
      </SiteSection>

      <SiteSection eyebrow="Solution NEXORA" title="Une télématique connectée au cœur de l'exploitation" description="NEXORA Truck intègre les données terrain dans le flux ERP/TMS sans outil satellite.">
        <div className="grid gap-4 md:grid-cols-2">
          {solutionPillars.map(item => (
            <article key={item.title} className="rounded-[1.5rem] border border-slate-200/80 bg-white p-5">
              <h3 className="text-lg font-semibold tracking-tight text-slate-950">{item.title}</h3>
              <p className="mt-2 text-sm leading-7 text-[var(--site-text-secondary)]">{item.body}</p>
            </article>
          ))}
        </div>
      </SiteSection>

      <SiteSection eyebrow="Fonctionnalités clés" title="Ce que la télématique apporte au quotidien" description="Des données terrain directement exploitables dans le pilotage opérationnel.">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {keyFeatures.map(feature => (
            <article key={feature.title} className="rounded-[1.5rem] border border-slate-200/80 bg-white p-5">
              <h3 className="text-base font-semibold text-[var(--site-text)]">{feature.title}</h3>
              <p className="mt-2 text-sm leading-7 text-[var(--site-text-secondary)]">{feature.body}</p>
            </article>
          ))}
        </div>
      </SiteSection>

      <SiteSection eyebrow="Intégration" title="Comment NEXORA connecte ERP, TMS et télématique" description="La valeur de la télématique dépend de ce à quoi elle est reliée.">
        <div className="space-y-4 text-sm leading-7 text-[var(--site-text-secondary)] sm:text-base">
          <p>
            Chez NEXORA Truck, la télématique n'est pas un module à part. Les données GPS et comportement de conduite
            remontent directement dans l'<Link to="/erp-transport" className="font-semibold text-[#2563EB]">ERP transport</Link> et
            alimentent le{' '}
            <Link to="/tms-transport" className="font-semibold text-[#2563EB]">TMS transport</Link> en temps réel. L'exploitant
            consulte la position des véhicules depuis le même écran que le planning et les ordres de transport.
          </p>
          <p>
            Cette continuité élimine les rapprochements manuels, accélère les décisions de réaffectation et fournit une base
            fiable pour le suivi kilométrique, la facturation au réel et la{' '}
            <Link to="/logiciel-gestion-flotte-camion" className="font-semibold text-[#2563EB]">gestion de la flotte</Link>.
            Les alertes comportement se lisent dans le contexte de la mission en cours, pas dans un outil déconnecté.
          </p>
          <p>
            Le module de{' '}
            <Link to="/chronotachygraphe" className="font-semibold text-[#2563EB]">gestion du chronotachygraphe</Link> utilise
            également les données remontées par la télématique pour croiser les temps d'activité réels avec les temps déclarés
            sur carte numérique. Cette cohérence réduit les risques de non-conformité réglementaire.
          </p>
        </div>
      </SiteSection>

      <SiteSection eyebrow="Visuel ERP" title="Emplacement screenshot télématique" description="Zone réservée pour une capture écran du suivi GPS intégré dans la DA actuelle.">
        <ScreenshotPlaceholder
          title="Screenshot télématique transport"
          caption="Insérez ici une capture de la carte live avec positions véhicules et statuts de mission."
          format="16:9"
          label="Télématique transport"
          status="Prêt à remplacer"
          highlights={[
            'Position GPS en temps réel',
            'Alertes comportement de conduite',
            'Rapprochement automatique OT',
          ]}
        />
      </SiteSection>

      <SiteSection eyebrow="En savoir plus" title="Pages complémentaires" description="Approfondir les sujets reliés à la télématique transport." muted>
        <div className="flex flex-wrap gap-3">
          <Link to="/erp-transport-routier" className="inline-flex rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-[var(--site-text)] transition-colors hover:bg-slate-50">
            ERP transport routier
          </Link>
          <Link to="/tms-transport" className="inline-flex rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-[var(--site-text)] transition-colors hover:bg-slate-50">
            TMS transport
          </Link>
          <Link to="/logiciel-gestion-flotte-camion" className="inline-flex rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-[var(--site-text)] transition-colors hover:bg-slate-50">
            Gestion flotte camion
          </Link>
          <Link to="/chronotachygraphe" className="inline-flex rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-[var(--site-text)] transition-colors hover:bg-slate-50">
            Chronotachygraphe
          </Link>
        </div>
      </SiteSection>
    </div>
  )
}
