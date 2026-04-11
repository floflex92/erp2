import { Link } from 'react-router-dom'
import useSiteMeta from '@/site/hooks/useSiteMeta'

/* ── Types ────────────────────────────────────────────────── */

type ApiStatus = 'priority' | 'roadmap' | 'available'

type ApiEntry = {
  name: string
  category: string
  status: ApiStatus
  statusLabel: string
  description: string
  honest: string
  docUrl: string
  logoColor: string
}

/* ── Data ─────────────────────────────────────────────────── */

const PRIORITY_APIS: ApiEntry[] = [
  {
    name: 'Webfleet',
    category: 'Télématique',
    status: 'priority',
    statusLabel: 'Priorité #1',
    description:
      "Solution télématique leader en Europe, compatible TMS. L'API Webfleet remonte position, kilométrage, statuts de conduite et données tachygraphe directement dans l'exploitation.",
    honest:
      "Premier chantier d'intégration : le marché européen du transport routier a une forte pénétration Webfleet. C'est le gain le plus direct pour nos clients.",
    docUrl: 'https://www.webfleet.com/en_gb/webfleet/api/',
    logoColor: '#E8440A',
  },
  {
    name: 'Samsara',
    category: 'Télématique',
    status: 'priority',
    statusLabel: 'Priorité #2',
    description:
      'API moderne et bien documentée, REST de bout en bout, webhooks temps réel. Samsara couvre géolocalisation, alertes comportement, caméras et diagnostic véhicule en une seule intégration.',
    honest:
      "L'API est nettement plus propre et stable que la majorité des concurrents. Pour les clients équipés Samsara, l'intégration sera la plus fluide à maintenir sur le long terme.",
    docUrl: 'https://developer.samsara.com/',
    logoColor: '#1F74E0',
  },
  {
    name: 'Google Maps Platform',
    category: 'Cartographie & routage',
    status: 'priority',
    statusLabel: 'Indispensable',
    description:
      "Géocodage, calcul d'itinéraires avec contraintes poids lourd, affichage carte, trafic temps réel. La brique cartographique de base pour l'ERP et la carte live.",
    honest:
      "Pas d'alternative viable à court terme pour un usage fiable en production. Le coût à l'usage est réel — nous travaillons sur un fallback OpenStreetMap pour les fonctions qui n'ont pas besoin du trafic temps réel.",
    docUrl: 'https://developers.google.com/maps',
    logoColor: '#4285F4',
  },
]

const ROADMAP_APIS: ApiEntry[] = [
  {
    name: 'Geotab',
    category: 'Télématique',
    status: 'roadmap',
    statusLabel: 'Sur la roadmap',
    description:
      'Plateforme télématique ouverte avec SDK étendu. Forte présence dans les flottes de grande taille. API REST documentée, accès données conducteurs et véhicules.',
    honest:
      'API plus complexe que Samsara. Prioritaire dès que plusieurs clients Geotab le demandent explicitement.',
    docUrl: 'https://developer.geotab.com/',
    logoColor: '#0066CC',
  },
  {
    name: 'Trans.eu',
    category: 'Bourse de fret',
    status: 'roadmap',
    statusLabel: 'Sur la roadmap',
    description:
      "Bourse de fret européenne avec API d'accès aux offres. Permet de récupérer des demandes de transport et de publier des capacités disponibles directement depuis l'ERP.",
    honest:
      "Intégration utile surtout pour les transporteurs qui font de l'affrètement. On attendra d'avoir des clients actifs sur Trans.eu avant de prioriser.",
    docUrl: 'https://developer.trans.eu/',
    logoColor: '#E63329',
  },
  {
    name: 'Timocom',
    category: 'Bourse de fret',
    status: 'roadmap',
    statusLabel: 'Sur la roadmap',
    description:
      "Bourse de fret numéro 1 en Allemagne, présente en Europe centrale et de l'Est. API pour accès aux offres fret et diffusion de capacités.",
    honest:
      'Pertinent pour les transporteurs travaillant sur le corridor franco-allemand. Intégration planifiée après Trans.eu.',
    docUrl: 'https://www.timocom.fr/',
    logoColor: '#F04E23',
  },
  {
    name: 'HERE Technologies',
    category: 'Cartographie & routage',
    status: 'roadmap',
    statusLabel: 'Fallback cartographie',
    description:
      "Alternative à Google Maps avec des API de routage poids lourd avancées : restrictions hauteur, tonnage, itinéraires dangereux. Données cartographiques offline possibles.",
    honest:
      "Candidat naturel pour remplacer ou compléter Google Maps sur les calculs d'itinéraires poids lourd spécifiques, moins coûteux à grande échelle.",
    docUrl: 'https://developer.here.com/',
    logoColor: '#00AFAA',
  },
  {
    name: 'OpenStreetMap',
    category: 'Cartographie (open source)',
    status: 'roadmap',
    statusLabel: 'Intégré partiellement',
    description:
      "Données cartographiques libres, déjà utilisées via Leaflet pour certaines vues de l'ERP. Pas de coût à l'usage pour l'affichage de cartes statiques ou à faible trafic.",
    honest:
      "Déjà en place pour les cartes non temps réel. On étend progressivement la couverture pour réduire la dépendance à Google Maps sur les fonctionnalités qui n'ont pas besoin du trafic live.",
    docUrl: 'https://wiki.openstreetmap.org/wiki/API',
    logoColor: '#7EBC6F',
  },
  {
    name: 'VDO Continental',
    category: 'Chronotachygraphe',
    status: 'roadmap',
    statusLabel: 'Sur la roadmap',
    description:
      "Fabricant de chronotachygraphes numériques. Interface pour récupérer les données tachygraphe directement via leur plateforme DLD/Online, sans passer par un lecteur physique.",
    honest:
      "Complète le module chronotachygraphe de NEXORA. Priorisé quand la base clients sur VDO sera suffisante pour justifier le coût de développement et de certification.",
    docUrl: 'https://www.vdo.com/en/news-and-media/online-platforms/',
    logoColor: '#E2231A',
  },
]

/* ── Components ───────────────────────────────────────────── */

function StatusBadge({ status, label }: { status: ApiStatus; label: string }) {
  const styles: Record<ApiStatus, string> = {
    priority: 'bg-blue-50 text-blue-700 border-blue-200',
    roadmap: 'bg-slate-50 text-slate-600 border-slate-200',
    available: 'bg-green-50 text-green-700 border-green-200',
  }
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold tracking-wide ${styles[status]}`}>
      {label}
    </span>
  )
}

function ApiCard({ api }: { api: ApiEntry }) {
  return (
    <article className="flex flex-col rounded-[1.6rem] border border-slate-200/80 bg-white p-6">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-sm font-bold text-white"
            style={{ background: api.logoColor }}
          >
            {api.name.slice(0, 2).toUpperCase()}
          </span>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-slate-400">{api.category}</p>
            <h3 className="text-lg font-semibold tracking-tight text-slate-950">{api.name}</h3>
          </div>
        </div>
        <StatusBadge status={api.status} label={api.statusLabel} />
      </div>

      <p className="mt-4 flex-1 text-sm leading-7 text-slate-600">{api.description}</p>

      <div className="mt-4 rounded-xl bg-slate-50 px-4 py-3">
        <p className="text-[12px] font-semibold uppercase tracking-[0.12em] text-slate-400">Notre position</p>
        <p className="mt-1 text-sm leading-6 text-slate-600">{api.honest}</p>
      </div>

      <a
        href={api.docUrl}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`Documentation officielle ${api.name} (nouvelle fenêtre)`}
        className="mt-4 flex min-h-[44px] items-center gap-1.5 text-sm font-semibold text-blue-600 transition-colors hover:text-blue-800"
      >
        Documentation {api.name}
        <svg className="h-4 w-4" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M7 5l5 5-5 5"/></svg>
      </a>
    </article>
  )
}

/* ── Page ─────────────────────────────────────────────────── */

export default function IntegrationsPage() {
  useSiteMeta({
    title: 'Intégrations & API — Webfleet, Samsara, Google Maps | NEXORA Truck',
    description:
      'Les intégrations API de NEXORA Truck : Webfleet, Samsara, Google Maps Platform en priorité, puis Geotab, Trans.eu, Timocom, HERE, VDO et OpenStreetMap. Vision honnête sur le calendrier.',
    canonicalPath: '/integrations',
    keywords:
      'intégrations ERP transport, API télématique, Webfleet API, Samsara API, Google Maps transport, Geotab, Trans.eu, Timocom, HERE Technologies, ERP transport connecté',
    ogType: 'article',
    author: 'NEXORA Truck',
    breadcrumbs: [{ name: 'Intégrations', path: '/integrations' }],
  })

  return (
    <div className="space-y-8">

      {/* ── Hero ── */}
      <section className="rounded-[2.2rem] border border-white/80 bg-white px-6 py-8 shadow-[0_24px_80px_rgba(15,23,42,0.1)] sm:px-8 sm:py-10">
        <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-sky-800">Connectivité</p>
        <h1 className="mt-4 max-w-4xl text-4xl font-semibold tracking-tight text-[var(--site-text)] sm:text-[3.2rem] sm:leading-[1.04]">
          Intégrations API — ce qu'on connecte, dans quel ordre, et pourquoi.
        </h1>
        <p className="mt-5 max-w-3xl text-base leading-8 text-[var(--site-text-secondary)]">
          Un ERP transport n'est utile que s'il parle aux outils déjà en place dans votre exploitation :
          boîtiers télématiques, bourses de fret, cartographie, tachygraphes. Voici les intégrations que nous
          construisons, avec notre position honnête sur les priorités et le calendrier.
        </p>
        {/* Honest callout */}
        <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4">
          <p className="text-sm font-semibold text-amber-800">Ce qu'on ne prétend pas faire</p>
          <p className="mt-1 text-sm leading-6 text-amber-700">
            On ne connectera pas tout dès le lancement. Construire une intégration API solide prend du temps :
            certification, tests de régression, maintenance des changements côté fournisseur. Nous priorisons
            les intégrations qui apportent le plus de valeur au plus grand nombre de clients, dans l'ordre indiqué ci-dessous.
          </p>
        </div>
        <div className="mt-7 flex flex-wrap gap-3">
          <Link to="/connexion-erp" className="site-btn-primary px-5 py-3 text-sm transition-colors">
            Tester l'ERP
          </Link>
          <Link to="/contact" className="rounded-full border border-slate-300 px-5 py-3 text-sm font-semibold text-[var(--site-text)] hover:bg-slate-50">
            Demander une intégration
          </Link>
        </div>
      </section>

      {/* ── Priorités ── */}
      <section className="rounded-[2.2rem] border px-6 py-8 shadow-[0_26px_90px_rgba(15,23,42,0.08)] sm:px-8 sm:py-10 bg-white" style={{ borderColor: '#e2e8f0' }}>
        <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-sky-700">En cours de développement</p>
        <h2 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950 sm:text-[2rem]">
          Les 3 intégrations prioritaires
        </h2>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-[var(--site-text-secondary)]">
          Sélectionnées pour leur couverture marché, la qualité de leur API, et la valeur immédiate pour l'exploitation quotidienne.
        </p>
        <div className="mt-8 grid gap-5 md:grid-cols-3">
          {PRIORITY_APIS.map(api => (
            <ApiCard key={api.name} api={api} />
          ))}
        </div>
      </section>

      {/* ── Roadmap ── */}
      <section className="rounded-[2.2rem] border px-6 py-8 shadow-[0_26px_90px_rgba(15,23,42,0.08)] sm:px-8 sm:py-10 bg-slate-50" style={{ borderColor: '#e2e8f0' }}>
        <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-sky-700">Roadmap</p>
        <h2 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950 sm:text-[2rem]">
          Les prochaines intégrations
        </h2>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-[var(--site-text-secondary)]">
          Ces intégrations sont identifiées et spécifiées. Leur développement sera déclenché par la demande
          clients et notre capacité technique. Le calendrier n'est pas figé.
        </p>
        <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {ROADMAP_APIS.map(api => (
            <ApiCard key={api.name} api={api} />
          ))}
        </div>
      </section>

      {/* ── How it works ── */}
      <section className="rounded-[2.2rem] border px-6 py-8 shadow-[0_26px_90px_rgba(15,23,42,0.08)] sm:px-8 sm:py-10 bg-white" style={{ borderColor: '#e2e8f0' }}>
        <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-sky-700">Architecture</p>
        <h2 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950 sm:text-[2rem]">
          Comment les intégrations fonctionnent dans NEXORA
        </h2>
        <div className="mt-6 grid gap-5 sm:grid-cols-3">
          {([
            ['Données terrain → ERP', 'Les positions GPS, statuts conduite et alertes remontent automatiquement dans le planning et les ordres de transport. Zéro ressaisie manuelle.'],
            ['ERP → facturation', 'Le kilométrage réel, les durées terrain et les incidents documentés alimentent directement la facturation et le suivi de marge mission.'],
            ['Supervision unifiée', "Un seul écran dans NEXORA Truck couvre planning, carte live et données télématiques. Vous n'avez pas besoin d'ouvrir l'interface de votre boîtier."],
          ] as const).map(([title, body]) => (
            <article key={title} className="rounded-[1.5rem] border border-slate-200/80 bg-slate-50 p-5">
              <h3 className="text-base font-semibold text-slate-950">{title}</h3>
              <p className="mt-2 text-sm leading-7 text-slate-600">{body}</p>
            </article>
          ))}
        </div>
      </section>

      {/* ── CTA & related links ── */}
      <section className="rounded-[2.2rem] border px-6 py-8 shadow-[0_26px_90px_rgba(15,23,42,0.08)] sm:px-8 sm:py-10 bg-slate-50" style={{ borderColor: '#e2e8f0' }}>
        <h2 className="text-xl font-semibold tracking-tight text-slate-950">Votre boîtier n'est pas dans la liste ?</h2>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-[var(--site-text-secondary)]">
          Parlez-nous de votre équipement actuel. Si plusieurs clients utilisent le même fournisseur, on avance l'intégration dans la roadmap. Les retours terrain orientent directement nos priorités de développement.
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Link to="/contact" className="site-btn-primary px-5 py-3 text-sm transition-colors">
            Nous contacter
          </Link>
        </div>
        <div className="mt-8 flex flex-wrap gap-3 border-t border-slate-200 pt-6">
          <Link to="/telematique-transport" className="inline-flex rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-[var(--site-text)] transition-colors hover:bg-slate-100">
            Télématique transport
          </Link>
          <Link to="/ia-transport" className="inline-flex rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-[var(--site-text)] transition-colors hover:bg-slate-100">
            IA transport
          </Link>
          <Link to="/tms-transport" className="inline-flex rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-[var(--site-text)] transition-colors hover:bg-slate-100">
            TMS transport
          </Link>
          <Link to="/erp-transport" className="inline-flex rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-[var(--site-text)] transition-colors hover:bg-slate-100">
            ERP transport
          </Link>
        </div>
      </section>

    </div>
  )
}
