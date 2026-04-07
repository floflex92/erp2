import { Link } from 'react-router-dom'
import SiteSection from '@/site/components/SiteSection'
import ScreenshotPlaceholder from '@/site/components/ScreenshotPlaceholder'
import useSiteMeta from '@/site/hooks/useSiteMeta'

const problems = [
  'Le statut réel d’un ordre de transport est inconnu sans appeler le conducteur.',
  'Une réaffectation d’urgence déclenche une cascade de messages, corrections et ressaisies.',
  'Le TMS ne parle pas à la facturation : chaque OT clôturé implique une saisie manuelle supplémentaire.',
  'Les priorités client changent mais l’exploitant n’a pas de vision unifiée sur l’exécution en cours.',
]

const solutionPillars = [
  {
    title: 'Dispatch en temps réel',
    body: 'Affectez, réaffectez et suivez chaque ordre en quelques secondes depuis un cockpit unique sans quitter le TMS.',
  },
  {
    title: 'Suivi exécution terrain',
    body: 'Statuts conducteurs, ETAs et preuves de livraison remontent automatiquement — sans appel téléphonique.',
  },
  {
    title: 'Élimination des ressaisies',
    body: 'Chaque OT clôturé alimente directement la facturation sans transfert manuel entre outils.',
  },
  {
    title: 'Alertes et priorités',
    body: 'Incidents, retards et urgences détectés en temps réel pour arbitrer avant que la cascade ne s’installe.',
  },
]

const keyFeatures = [
  { title: 'Plan de transport quotidien', body: 'Ordonnancez les ordres du lendemain dès aujourd’hui, visualisez la charge et anticipez les conflits de ressources.' },
  { title: 'Suivi temps réel des OT', body: 'Chaque ordre affiche position GPS, statut, ETA et incidents — sans quitter le TMS.' },
  { title: 'Communication conducteurs', body: 'Instructions, modifications et accusés de réception échangés sans appel téléphonique.' },
  { title: 'Facturation directe', body: 'L’ordre de transport devient automatiquement bon de livraison puis facture, zonder ressaisie.' },
  { title: 'API Webfleet / télématique', body: 'Données tachygraphe, géolocalisation et alertes terrain intégrées nativement au TMS.' },
]

export default function TmsTransportPage() {
  useSiteMeta({
    title: 'TMS transport : pilotage des ordres, dispatch et facturation',
    description:
      'TMS transport NEXORA Truck : pilotez chaque ordre de mission du dispatch à la facturation. Statuts en temps réel, zéro ressaisie, conducteurs et flotte connectés.',
    canonicalPath: '/tms-transport',
    keywords:
      'TMS transport, logiciel TMS, TMS transport routier, gestion transport routier, suivi ordres de transport, ERP transport routier, automatisation transport, logiciel exploitation transport',
    ogType: 'article',
    author: 'NEXORA Truck',
    breadcrumbs: [{ name: 'TMS transport', path: '/tms-transport' }],
    faqItems: [
      {
        question: "Qu’est-ce qu’un TMS transport ?",
        answer: "Un TMS (Transport Management System) est un logiciel dédié à la gestion des ordres de transport : dispatch des missions, suivi de l’exécution en temps réel, communication conducteurs et génération de la facturation. Il est souvent intégré dans un ERP transport.",
      },
      {
        question: "Quelle différence entre un TMS et un ERP transport ?",
        answer: "Le TMS gère le cœur opérationnel des missions transport. L’ERP transport englobe en plus la gestion flotte, les conducteurs, la paie, la comptabilité et la télématique. NEXORA Truck intègre TMS et ERP dans un seul outil.",
      },
      {
        question: "Comment le TMS réduit-il les ressaisies dans le transport ?",
        answer: "En reliant directement l’ordre de transport à la facturation, le TMS NEXORA Truck supprime les saisies manuelles entre dispatch, clôture de mission et émission de facture. Les statuts conducteurs remontent automatiquement depuis l’application mobile.",
      },
      {
        question: "Un TMS transport fonctionne-t-il sans télématique ?",
        answer: "Oui. Le TMS NEXORA Truck peut fonctionner avec ou sans télématique connectée. Avec un boîtier GPS ou une application conducteur, les statuts remontent automatiquement. Sans matériel, les mises à jour sont saisies manuellement.",
      },
    ],
  })

  return (
    <div className="space-y-8">
      <section className="rounded-[2.2rem] border border-white/80 bg-white px-6 py-8 shadow-[0_24px_80px_rgba(15,23,42,0.1)] sm:px-8 sm:py-10">
        <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-sky-800">Page SEO secondaire</p>
        <h1 className="mt-4 max-w-4xl text-4xl font-semibold tracking-tight text-[var(--site-text)] sm:text-[3.2rem] sm:leading-[1.04]">
          TMS transport : pilotez chaque ordre de mission du dispatch à la facturation
        </h1>
        <p className="mt-5 max-w-3xl text-base leading-8 text-[var(--site-text-secondary)]">
          Un TMS isolé force l’exploitant à gérer statuts, conducteurs et facturation dans des outils séparés. Chaque changement de mission génère des appels, des ressaisies et des corrections en cascade. NEXORA Truck intègre le TMS transport dans un flux unique relié à la flotte, aux conducteurs et à la facturation — le dispatch se fait en temps réel sans outil satellite.
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
              <h3 className="text-lg font-semibold tracking-tight text-slate-950">{item.title}</h3>
              <p className="mt-2 text-sm leading-7 text-[var(--site-text-secondary)]">{item.body}</p>
            </article>
          ))}
        </div>
      </SiteSection>

      <SiteSection eyebrow="Fonctionnalités clés" title="Le TMS NEXORA Truck en pratique" description="De la création de l’ordre à la facturation, chaque étape est couverte sans basculer d’outil.">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {keyFeatures.map(feature => (
            <article key={feature.title} className="rounded-[1.5rem] border border-slate-200/80 bg-white p-5">
              <h3 className="text-base font-semibold text-[var(--site-text)]">{feature.title}</h3>
              <p className="mt-2 text-sm leading-7 text-[var(--site-text-secondary)]">{feature.body}</p>
            </article>
          ))}
        </div>
      </SiteSection>

      <SiteSection eyebrow="Cas d’usage" title="Scénarios concrets du dispatch au quotidien" description="Ce que NEXORA Truck change vraiment dans la journée d’un exploitant transport.">
        <div className="space-y-6 text-sm leading-7 text-[var(--site-text-secondary)] sm:text-base">
          <div>
            <h3 className="text-lg font-semibold tracking-tight text-[var(--site-text)]">Avant : une réaffectation d’urgence en 25 minutes</h3>
            <p className="mt-2">Un client modifie son créneau à 9h45. L’exploitant appelle le conducteur, vérifie son heure de début, consulte un second outil pour la disponibilité du véhicule, recopie le changement dans le TMS et prévient la facturation par message. Total : 20 à 25 minutes pour une décision qui aurait dû prendre 3 minutes.</p>
          </div>
          <div>
            <h3 className="text-lg font-semibold tracking-tight text-[var(--site-text)]">Avec NEXORA Truck : une réaffectation en 90 secondes</h3>
            <p className="mt-2">Le nouvel horaire met à jour l’OT. Les conducteurs et véhicules disponibles sont affichés en temps réel selon les contraintes réelles. L’exploitant confirme, le conducteur reçoit la mise à jour sur son terminal, et la facturation reçoit automatiquement le délai actualisé. Zéro appel. Zéro ressaisie.</p>
          </div>
          <div>
            <h3 className="text-lg font-semibold tracking-tight text-[var(--site-text)]">Suivi client sans appel</h3>
            <p className="mt-2">Le statut de chaque mission est lisible depuis le portail client NEXORA. Le client voit l’ETA mis à jour automatiquement depuis les données de <Link to="/telematique-transport" className="font-semibold text-[#2563EB]">télématique embarquée</Link>. L’exploitant passe moins de temps sur les relances et plus sur l’arbitrage des priorités réelles.</p>
          </div>
          <div>
            <h3 className="text-lg font-semibold tracking-tight text-[var(--site-text)]">Facturation clôturée le soir même</h3>
            <p className="mt-2">Chaque OT exécuté alimente directement le module facturation. Les preuves de livraison, le kilométrage réel et les éventuels frais supplémentaires sont déjà attachés. La facturation du jour se génère en fin de journée sans consolidation manuelle. En complément, l’<Link to="/erp-transport-routier" className="font-semibold text-[#2563EB]">ERP transport routier NEXORA</Link> conserve la traçabilité complète de la mission jusqu’à la ligne comptable.</p>
          </div>
        </div>
      </SiteSection>

      <SiteSection eyebrow="Visuel TMS" title="Aperçu pilotage TMS" description="Interface dispatch NEXORA Truck : ordres de transport, statuts conducteurs et suivi mission en time réel.">
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

      <SiteSection eyebrow="Lien principal" title="Pages complémentaires" description="Approfondir les sujets reliés au TMS transport." muted>
        <div className="flex flex-wrap gap-3">
          <Link to="/erp-transport-routier" className="inline-flex rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-[var(--site-text)] transition-colors hover:bg-slate-50">
            ERP transport routier
          </Link>
          <Link to="/logiciel-gestion-flotte-camion" className="inline-flex rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-[var(--site-text)] transition-colors hover:bg-slate-50">
            Gestion flotte camion
          </Link>
          <Link to="/telematique-transport" className="inline-flex rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-[var(--site-text)] transition-colors hover:bg-slate-50">
            Télématique transport
          </Link>
          <Link to="/ia-transport" className="inline-flex rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-[var(--site-text)] transition-colors hover:bg-slate-50">
            IA transport
          </Link>
        </div>
      </SiteSection>
    </div>
  )
}
