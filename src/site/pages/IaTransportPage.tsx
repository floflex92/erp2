import { Link } from 'react-router-dom'
import SiteSection from '@/site/components/SiteSection'
import ScreenshotPlaceholder from '@/site/components/ScreenshotPlaceholder'
import useSiteMeta from '@/site/hooks/useSiteMeta'

const problems = [
  'L’exploitant arbitre 50 missions simultanées avec des données dispersées : retards détectés trop tard, marges érodées sans clignotant.',
  'Un retard fournisseur ou une panne découverte au départ déclenche une cascade de réaffectations manuelles chronophages.',
  'Chaque tournée optimisée à la main laisse en moyenne 18 % de kilométrage à vide évitable sur la journée.',
  'La rentabilité par mission n’est calculée qu’en fin de mois — quand les ajustements ne sont plus possibles.',
]

const solutionPillars = [
  {
    title: 'Suggestions d’affectation automatisées',
    body: 'L’IA analyse la charge, les disponibilités flotte et les créneaux clients pour proposer l’affectation optimale — l’exploitant valide en un clic ou ajuste.',
  },
  {
    title: 'Détection précoce des dérives',
    body: 'Retard probable, mission sous le seuil de rentabilité, conducteur proche des limites RSE : l’alerte arrive avant l’incident, pas après.',
  },
  {
    title: 'Regroupement intelligent des missions',
    body: 'Identification automatique des courses partageant une zone ou un itéraire pour réduire le kilométrage à vide sans effort de planification supplémentaire.',
  },
  {
    title: 'Marge mission en temps réel',
    body: 'Chaque order de transport affiche sa marge projetée pendant l’exécution. Une dérive est signalée immédiatement pour corriger avant clôture.',
  },
]

const keyFeatures = [
  { title: 'Affectation proposée (1 clic)', body: 'Conducteur + véhicule suggérés automatiquement selon dispo, distance et conformité RSE. L’exploitant garde le contrôle.' },
  { title: 'Prédiction de retard avant départ', body: 'Analyse des conditions, créneaux et historiques pour signaler les missions à risque et prévenir les clients.' },
  { title: 'Optimisation tournées multi-stops', body: 'Séquençage intelligent des livraisons multiples pour réduire le kilométrage total et les fenêtres perdues.' },
  { title: 'Alerte marge en dérive', body: 'Le système calcule la marge réelle pendant l’exécution et alerte si le coût réel dépasse le devis accepté.' },
  { title: 'Apprentissage sur vos données', body: 'Les suggestions s’améliorent avec l’historique de votre exploitation : zones, clients récurrents, habitudes de flotte.' },
]

export default function IaTransportPage() {
  useSiteMeta({
    title: 'IA transport : optimisation planning, tournées et rentabilité',
    description:
      'IA transport NEXORA Truck : suggestions d’affectation en 1 clic, détection de retard avant départ, optimisation km à vide et alerte marge en dérive en temps réel.',
    canonicalPath: '/ia-transport',
    keywords:
      'IA transport, intelligence artificielle transport, optimisation IA logistique, algorithme optimisation transport, prédiction retard transport, ERP transport routier',
    ogType: 'article',
    author: 'NEXORA Truck',
    breadcrumbs: [{ name: 'IA transport', path: '/ia-transport' }],
    faqItems: [
      {
        question: 'Comment l’IA améliore-t-elle le transport routier ?',
        answer: 'L’IA transport analyse les historiques d’exploitation pour optimiser le placement conducteurs, prédire les ETAs, détecter des anomalies et proposer des regroupements de missions, réduisant le temps de décision de l’exploitant.',
      },
      {
        question: 'L’IA peut-elle optimiser le planning transport ?',
        answer: 'Oui, sur des problèmes structurés : placement conducteurs/véhicules, groupage de tournées, détection de surcharges. Le module IA placement de NEXORA Truck suggère les affectations optimales en tenant compte des contraintes réglementaires et de la disponibilité flotte.',
      },
      {
        question: 'L’IA remplacera-t-elle l’exploitant transport ?',
        answer: 'Non. L’IA propose, l’exploitant décide. Elle accélère le traitement de scénarios complexes mais la connaissance métier et la relation client restent irremplaçables.',
      },
      {
        question: 'Faut-il des données historiques pour utiliser l’IA dans le transport ?',
        answer: 'Le module IA de NEXORA Truck devient pertinent dès quelques semaines d’utilisation et s’améliore avec le temps. Il ne nécessite pas d’infrastructure data spécifique.',
      },
    ],
  })

  return (
    <div className="space-y-8">
      <section className="rounded-[2.2rem] border border-white/80 bg-white px-6 py-8 shadow-[0_24px_80px_rgba(15,23,42,0.1)] sm:px-8 sm:py-10">
        <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-sky-800">Page SEO secondaire</p>
        <h1 className="mt-4 max-w-4xl text-4xl font-semibold tracking-tight text-[var(--site-text)] sm:text-[3.2rem] sm:leading-[1.04]">
          IA transport : affectez, optimisez et pilotez la rentabilité mission en temps réel
        </h1>
        <p className="mt-5 max-w-3xl text-base leading-8 text-[var(--site-text-secondary)]">
          Gérer 40 missions par jour à la main, c’est perdre en moyenne 90 minutes d’arbitrages évitables. NEXORA Truck intègre l’IA directement dans le flux d’exploitation : chaque ordre de transport reçoit une affectation suggérée, un risque de retard estimé et une marge projetée — sans module supplémentaire, sans export vers un outil externe.
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

      <SiteSection eyebrow="Problèmes" title="Ce que l'exploitation gagne à automatiser" description="L'IA intervient là où la charge cognitive et les données non connectées ralentissent les décisions.">
        <ul className="grid gap-3">
          {problems.map(problem => (
            <li key={problem} className="rounded-[1.2rem] border border-slate-200/80 bg-white px-5 py-4 text-sm leading-7 text-[var(--site-text)]">
              {problem}
            </li>
          ))}
        </ul>
      </SiteSection>

      <SiteSection eyebrow="Solution NEXORA" title="Une IA au service de l'exploitant, pas à sa place" description="NEXORA Truck utilise l'IA pour assister la décision, pas pour la remplacer.">
        <div className="grid gap-4 md:grid-cols-2">
          {solutionPillars.map(item => (
            <article key={item.title} className="rounded-[1.5rem] border border-slate-200/80 bg-white p-5">
              <h3 className="text-lg font-semibold tracking-tight text-slate-950">{item.title}</h3>
              <p className="mt-2 text-sm leading-7 text-[var(--site-text-secondary)]">{item.body}</p>
            </article>
          ))}
        </div>
      </SiteSection>

      <SiteSection eyebrow="Fonctionnalités clés" title="Modules IA dans NEXORA Truck" description="Des algorithmes intégrés au flux opérationnel, sans écran supplémentaire.">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {keyFeatures.map(feature => (
            <article key={feature.title} className="rounded-[1.5rem] border border-slate-200/80 bg-white p-5">
              <h3 className="text-base font-semibold text-[var(--site-text)]">{feature.title}</h3>
              <p className="mt-2 text-sm leading-7 text-[var(--site-text-secondary)]">{feature.body}</p>
            </article>
          ))}
        </div>
      </SiteSection>

      <SiteSection eyebrow="Intégration" title="Comment NEXORA connecte ERP, TMS et IA" description="L'IA n'a de valeur que si elle est connectée aux données opérationnelles réelles.">
        <div className="space-y-4 text-sm leading-7 text-[var(--site-text-secondary)] sm:text-base">
          <p>
            Les modules d&apos;intelligence artificielle de NEXORA Truck opèrent directement sur les données de l&apos;
            <Link to="/erp-transport" className="font-semibold text-[#2563EB]">ERP transport</Link> et du{' '}
            <Link to="/tms-transport" className="font-semibold text-[#2563EB]">TMS transport</Link>. Les suggestions de
            planning intègrent les disponibilités réelles de la flotte, les contraintes conducteurs et les créneaux clients
            sans nécessiter de paramétrage manuel supplémentaire.
          </p>
          <p>
            La détection d&apos;anomalies s&apos;appuie sur les données de la{' '}
            <Link to="/telematique-transport" className="font-semibold text-[#2563EB]">télématique embarquée</Link> :
            position GPS, vitesse, arrêts et écarts de trajet sont analysés en continu pour identifier les missions à risque
            avant qu&apos;elles ne génèrent un retard client ou un coût supplémentaire.
          </p>
          <p>
            L&apos;optimisation kilométrique réduit les courses à vide en regroupant intelligemment les missions selon les zones de
            livraison et les retours disponibles. Cette fonctionnalité est directement reliée à la{' '}
            <Link to="/logiciel-gestion-flotte-camion" className="font-semibold text-[#2563EB]">gestion de la flotte</Link>{' '}
            pour orienter les décisions d&apos;affectation vers les ressources les mieux positionnées.
          </p>
        </div>
      </SiteSection>

      <SiteSection eyebrow="Visuel ERP" title="Emplacement screenshot IA transport" description="Zone réservée pour une capture écran du module IA dans le pilotage opérationnel.">
        <ScreenshotPlaceholder
          title="Screenshot IA transport"
          caption="Insérez ici une capture des suggestions d\u2019affectation IA ou du tableau de bord prédictif."
          format="16:9"
          label="IA transport"
          status="Prêt à remplacer"
          highlights={[
            'Suggestions planning intelligentes',
            'Détection anomalies temps réel',
            'Analyse rentabilité mission',
          ]}
        />
      </SiteSection>

      <SiteSection eyebrow="En savoir plus" title="Pages complémentaires" description="Approfondir les sujets reliés à l'intelligence artificielle dans le transport." muted>
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
