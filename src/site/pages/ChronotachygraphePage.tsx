import { Link } from 'react-router-dom'
import SiteSection from '@/site/components/SiteSection'
import ScreenshotPlaceholder from '@/site/components/ScreenshotPlaceholder'
import useSiteMeta from '@/site/hooks/useSiteMeta'

const problems = [
  'Un contrôle sur route révèle un dépassement des temps de conduite non détecté : amende, immobilisation et rapport interne.',
  'Les cartes tachygraphiques numériques ne sont téléchargées que tous les 28 jours — règlement (CE) 561/2006 exige moins de 56 jours, mais des écarts passent inaperçus.',
  'L’exploitant affecte un conducteur déjà à la limite de ses heures autorisées faute de visibilité en temps réel.',
  'Préparer un rapport d’activité pour l’inspection du travail ou la DREAL prend plusieurs heures de consolidation manuelle.',
]

const solutionPillars = [
  {
    title: 'Téléchargement automatisé des cartes',
    body: 'Import automatique des fichiers conducteur et véhicule selon la fréquence réglementaire — zéro oubli, zéro traitement manuel.',
  },
  {
    title: 'Alerte avant dépassement, pas après',
    body: 'Temps de conduite restant, repos obligatoire à venir et infractions probabes signalés avant l’affectation — l’exploitant ne risque plus de valider une mission impossible.',
  },
  {
    title: 'Historique structuré par conducteur',
    body: 'Tous les fichiers tachygraphes archivés, indexables par conducteur, véhicule ou période. Prêt pour un contrôle DREAL en 2 minutes.',
  },
  {
    title: 'Contraintes réglementaires dans le planning',
    body: 'Les indisponibilités conducteurs liées au repos obligatoire remontent automatiquement dans le planning transport pour éviter les affectations irréalisables.',
  },
]

const keyFeatures = [
  { title: 'Téléchargement automatique', body: 'Import des fichiers conducteur et véhicule selon fréquence réglementaire (CE) 561/2006 sans intervention manuelle.' },
  { title: 'Alerte avant dépassement légal', body: 'Notification quand le conducteur s’approche des limites : temps de conduite restant, repos obligatoire et fenêtes disponibles.' },
  { title: 'Historique infractions conducteur', body: 'Suivi des anomalies par conducteur pour le suivi disciplinaire RH, les contrôles DREAL et les audits sécurité.' },
  { title: 'Exports conformes (DREAL / inspection)', body: 'Rapports d’activité au format standard générés en 1 clic, signés et prêts pour les inspecteurs.' },
  { title: 'Indisponibilités dans le planning', body: 'Périodes de repos obligatoires visibles dans le planning avant l’affectation de mission — plus d’erreur à la confirmation.' },
]

export default function ChronotachygraphePage() {
  useSiteMeta({
    title: 'Chronotachygraphe : suivi conduite, conformité RSE et exports DREAL',
    description:
      'Gestion chronotachygraphe NEXORA Truck : téléchargement automatisé, alertes avant dépassement légal, indisponibilités conducteurs dans le planning et exports DREAL en 1 clic.',
    canonicalPath: '/chronotachygraphe',
    keywords:
      'chronotachygraphe, gestion tachygraphe, temps de conduite transport, conformité conducteur, carte tachygraphique numérique, logiciel gestion tachygraphe, ERP transport routier',
    ogType: 'article',
    author: 'NEXORA Truck',
    breadcrumbs: [{ name: 'Chronotachygraphe', path: '/chronotachygraphe' }],
    faqItems: [
      {
        question: 'Qu’est-ce que le chronotachygraphe numérique ?',
        answer: 'Le chronotachygraphe numérique est un appareil de contrôle obligatoire sur les poids lourds > 3,5 t. Il enregistre les temps de conduite, coupures et repos conformément au règlement CE 561/2006.',
      },
      {
        question: 'Qu’est-ce que le chronotachygraphe intelligent (G2) ?',
        answer: 'Le chronotachygraphe intelligent G2 (obligatoire dès août 2023 sur les nouveaux véhicules) transmet les données en temps réel par satellite et facilite les contrôles mobiles.',
      },
      {
        question: 'Comment analyser les données tachygraphe avec un ERP ?',
        answer: 'NEXORA Truck lit les fichiers DDD ou reçoit les données via Webfleet / FleetBoard. Les infractions potentielles et les alertes réglementaires sont affichées dans le tableau de bord sans logiciel supplémentaire.',
      },
      {
        question: 'Quelles amendes pour non-conformité tachygraphe ?',
        answer: 'Les infractions entraînent des amendes de 750 € à plus de 15 000 € selon la gravité. Un suivi proactif via ERP réduit considérablement ce risque.',
      },
    ],
  ogImage: 'https://nexora-truck.fr/site/screenshots/chronotachygraphe.png',
  })

  return (
    <div className="space-y-8">
      <section className="rounded-[2.2rem] border border-white/80 bg-white px-6 py-8 shadow-[0_24px_80px_rgba(15,23,42,0.1)] sm:px-8 sm:py-10">
        <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-sky-800">Page SEO secondaire</p>
        <h1 className="mt-4 max-w-4xl text-4xl font-semibold tracking-tight text-[var(--site-text)] sm:text-[3.2rem] sm:leading-[1.04]">
          Chronotachygraphe : zéro dépassement, exports DREAL en 1 clic, planification sans erreur
        </h1>
        <p className="mt-5 max-w-3xl text-base leading-8 text-[var(--site-text-secondary)]">
          Un contrôle DREAL sur un seul conducteur avec des données manquantes peut coûter plus cher que 6 mois de logiciel. NEXORA Truck automatise le téléchargement des cartes tachygraphiques, détecte les dépassements avant l’affectation et génère les rapports réglementaires en 1 clic — sans module tiers, sans ressaisie, sans surprise.
        </p>
        <div className="mt-7 flex flex-wrap gap-3">
          <Link to="/connexion-erp" className="site-btn-primary px-5 py-3 text-sm transition-colors">
            Tester l&apos;ERP
          </Link>
          <Link to="/demonstration" className="rounded-full border border-slate-300 px-5 py-3 text-sm font-semibold text-[var(--site-text)] hover:bg-white">
            Demander une démo
          </Link>
        </div>
      </section>

      <SiteSection eyebrow="Problèmes" title="Les risques d'un suivi tachygraphique manuel" description="Chaque erreur de suivi des temps de conduite expose l'entreprise à une sanction réglementaire.">
        <ul className="grid gap-3">
          {problems.map(problem => (
            <li key={problem} className="rounded-[1.2rem] border border-slate-200/80 bg-white px-5 py-4 text-sm leading-7 text-[var(--site-text)]">
              {problem}
            </li>
          ))}
        </ul>
      </SiteSection>

      <SiteSection eyebrow="Solution NEXORA" title="Un suivi chronotachygraphique intégré à l'exploitation" description="Les obligations réglementaires remontent directement dans le flux opérationnel.">
        <div className="grid gap-4 md:grid-cols-2">
          {solutionPillars.map(item => (
            <article key={item.title} className="rounded-[1.5rem] border border-slate-200/80 bg-white p-5">
              <h3 className="text-lg font-semibold tracking-tight text-slate-950">{item.title}</h3>
              <p className="mt-2 text-sm leading-7 text-[var(--site-text-secondary)]">{item.body}</p>
            </article>
          ))}
        </div>
      </SiteSection>

      <SiteSection eyebrow="Fonctionnalités clés" title="Ce que le module tachygraphe couvre" description="Lecture, alertes, historique et export sans ressaisie.">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {keyFeatures.map(feature => (
            <article key={feature.title} className="rounded-[1.5rem] border border-slate-200/80 bg-white p-5">
              <h3 className="text-base font-semibold text-[var(--site-text)]">{feature.title}</h3>
              <p className="mt-2 text-sm leading-7 text-[var(--site-text-secondary)]">{feature.body}</p>
            </article>
          ))}
        </div>
      </SiteSection>

      <SiteSection eyebrow="Intégration" title="Comment NEXORA connecte ERP, TMS et chronotachygraphe" description="La conformité réglementaire ne doit pas être un frein à l'exploitation.">
        <div className="space-y-4 text-sm leading-7 text-[var(--site-text-secondary)] sm:text-base">
          <p>
            Dans NEXORA Truck, le module tachygraphe est directement relié au
            {' '}<Link to="/erp-transport" className="font-semibold text-[#2563EB]">ERP transport</Link> et au
            {' '}<Link to="/tms-transport" className="font-semibold text-[#2563EB]">TMS transport</Link>.
            Les indisponibilités réglementaires des conducteurs remontent automatiquement dans le planning. Un exploitant
            ne peut pas affecter par erreur un conducteur déjà à la limite de ses heures autorisées.
          </p>
          <p>
            Les données tachygraphiques sont aussi croisées avec celles de la
            {' '}<Link to="/telematique-transport" className="font-semibold text-[#2563EB]">télématique embarquée</Link>.
            Temps de conduite réels, km parcourus et pauses enregistrées se comparent aux données de la carte numérique
            pour détecter les incohérences avant un contrôle sur route.
          </p>
          <p>
            La{' '}
            <Link to="/logiciel-gestion-flotte-camion" className="font-semibold text-[#2563EB]">gestion de la flotte</Link>{' '}
            bénéficie également de cette synchronisation: les véhicules dont les conducteurs sont en période de repos
            obligatoire sont marqués indisponibles pour éviter les erreurs d&apos;affectation.
          </p>
        </div>
      </SiteSection>

      <SiteSection eyebrow="Visuel ERP" title="Emplacement screenshot tachygraphe" description="Zone réservée pour une capture écran de la gestion chronotachygraphique.">
        <ScreenshotPlaceholder
          title="Screenshot chronotachygraphe"
          caption="Insérez ici une capture du tableau de bord tachygraphe : activités conducteur, alertes conformité, exports."
          format="16:9"
          label="Chronotachygraphe"
          status="Prêt à remplacer"
          highlights={[
            'Activités conducteur par période',
            'Alertes réglementaires temps réel',
            'Export rapports d\u2019activité',
          ]}
        />
      </SiteSection>

      <SiteSection eyebrow="En savoir plus" title="Pages complémentaires" description="Sujets reliés à la conformité et à la gestion conducteurs." muted>
        <div className="flex flex-wrap gap-3">
          <Link to="/erp-transport-routier" className="inline-flex rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-[var(--site-text)] transition-colors hover:bg-slate-50">
            ERP transport routier
          </Link>
          <Link to="/tms-transport" className="inline-flex rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-[var(--site-text)] transition-colors hover:bg-slate-50">
            TMS transport
          </Link>
          <Link to="/telematique-transport" className="inline-flex rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-[var(--site-text)] transition-colors hover:bg-slate-50">
            Télématique transport
          </Link>
          <Link to="/logiciel-gestion-flotte-camion" className="inline-flex rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-[var(--site-text)] transition-colors hover:bg-slate-50">
            Gestion flotte camion
          </Link>
        </div>
      </SiteSection>
    </div>
  )
}
