import { Link } from 'react-router-dom'
import { useEffect } from 'react'
import SiteSection from '@/site/components/SiteSection'
import useSiteMeta from '@/site/hooks/useSiteMeta'

const inlineLinkClassName = 'font-semibold text-[#2563EB]'

export default function SeoErpTransportPage() {
  useSiteMeta({
    title: 'ERP transport : plateforme ERP + TMS + flotte pour routiers',
    description:
      'NEXORA Truck : ERP transport tout-en-un qui relie TMS, flotte, conducteurs, télématique et IA dans une seule interface pour pilotes exploités.',
    canonicalPath: '/erp-transport',
    keywords:
      'ERP transport, ERP transport routier, logiciel transport routier, TMS transport, exploitation transport, gestion flotte, planning transport, logiciel affrètement, portail client transport',
    ogType: 'article',
    author: 'NEXORA Truck',
    breadcrumbs: [{ name: 'ERP transport', path: '/erp-transport' }],
    faqItems: [
      {
        question: "Qu’est-ce qu’un ERP transport ?",
        answer: "Un ERP transport est un logiciel de gestion intégré qui centralise toutes les fonctions d’une entreprise de transport routier : planification des missions, ordres de transport, suivi flotte, gestion des conducteurs, télématique, facturation et reporting dans un seul outil.",
      },
      {
        question: "Quelle différence entre un ERP transport et un TMS ?",
        answer: "Un TMS (Transport Management System) gère uniquement les ordres de transport et le dispatch. Un ERP transport intègre en plus la gestion flotte, les conducteurs, la télématique, la comptabilité et la facturation. L’ERP est un sur-ensemble du TMS.",
      },
      {
        question: "Combien coûte un ERP transport ?",
        answer: "Le coût d’un ERP transport varie selon la taille de la flotte et les modules activés. NEXORA Truck propose un modèle SaaS transparent, adapté aux transporteurs de 5 à plusieurs centaines de véhicules. Demandez une démonstration pour obtenir un tarif personnalisé.",
      },
      {
        question: "Combien de temps dure l’installation d’un ERP transport ?",
        answer: "Avec NEXORA Truck, la mise en production se compte en jours. La configuration initiale se fait en ligne ; les données flotte et conducteurs sont importées depuis vos fichiers existants.",
      },
      {
        question: "Un ERP transport fonctionne-t-il avec la télématique existante ?",
        answer: "Oui. NEXORA Truck s’intègre avec Webfleet, FleetBoard, Samsara et d’autres solutions pour remonter automatiquement positions GPS, statuts de conduite et données tachygraphe.",
      },
    ],
  ogImage: 'https://nexora-truck.fr/site/screenshots/accueil-proof.png',
  })

  useEffect(() => {
    const script = document.createElement('script')
    script.type = 'application/ld+json'
    script.id = 'erp-transport-jsonld'
    script.text = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'SoftwareApplication',
      name: 'NEXORA Truck',
      applicationCategory: 'BusinessApplication',
      operatingSystem: 'Web',
      inLanguage: 'fr-FR',
      url: 'https://nexora-truck.fr/erp-transport',
      description:
        'ERP transport pour relier exploitation transport, planning transport, gestion flotte, suivi des missions et facturation.',
    })
    document.head.appendChild(script)

    return () => {
      script.remove()
    }
  }, [])

  return (
    <div className="space-y-8">
      <section className="rounded-[2.2rem] border border-white/80 bg-white px-6 py-8 shadow-[0_24px_80px_rgba(15,23,42,0.1)] sm:px-8 sm:py-10">
        <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-sky-800">Page SEO canonique</p>
        <h1 className="mt-4 max-w-4xl text-4xl font-semibold tracking-tight text-[var(--site-text)] sm:text-[3.2rem] sm:leading-[1.04]">
          ERP transport : la plateforme tout-en-un pour piloter votre exploitation routière sans fragmentation
        </h1>
        <div className="mt-5 max-w-3xl space-y-4 text-base leading-8 text-[var(--site-text-secondary)]">
          <p>
            Un ERP transport permet de piloter l’exploitation transport dans un seul environnement, sans découper le travail
            entre plusieurs outils qui se contredisent. Pour un exploitant, le gain principal n’est pas théorique: c’est la
            capacité à décider plus vite avec des données fiables. Les ordres de transport, le planning transport, la gestion
            flotte, les statuts de mission et la facturation restent dans le même flux de travail, ce qui réduit les
            ressaisies et les pertes de contexte.
          </p>
          <p>
            Cette page détaille une approche concrète, terrain et orientée exploitation. Si vous souhaitez comparer avec une
            lecture complémentaire, consultez aussi la page{' '}
            <Link to="/logiciel-transport" className={inlineLinkClassName}>
              logiciel transport
            </Link>{' '}
            et les <Link to="/articles" className={inlineLinkClassName}>articles transport</Link> pour approfondir les cas
            d’usage métier.
          </p>
        </div>
      </section>

      <SiteSection
        eyebrow="Définition"
        title="Qu’est-ce qu’un ERP transport"
        description="Un ERP transport est un système de gestion intégré qui relie les opérations, les ressources et la continuité financière."
      >
        <div className="space-y-4 text-sm leading-7 text-[var(--site-text-secondary)] sm:text-base">
          <h3 className="text-lg font-semibold tracking-tight text-[var(--site-text)]">Un socle unique pour les décisions quotidiennes</h3>
          <p>
            Un ERP transport n’est pas un simple logiciel de suivi. C’est un cadre de pilotage qui relie les ordres, les
            statuts, les ressources, les événements terrain et les impacts financiers. Dans une entreprise de transport, cela
            veut dire que l’exploitation, le planning transport et la gestion flotte consultent la même réalité au même
            moment. Au lieu de multiplier les vérifications manuelles, l’équipe voit immédiatement ce qui est confirmé, ce qui
            bloque et ce qui doit être arbitré.
          </p>
          <h3 className="text-lg font-semibold tracking-tight text-[var(--site-text)]">Une continuité de la mission jusqu’à la facturation</h3>
          <p>
            La valeur réelle d’un ERP transport apparaît quand une mission suit un fil logique complet: création de l’ordre,
            affectation, exécution, preuve, contrôle puis facturation. Sans continuité, les équipes recopient les mêmes
            informations et perdent du temps sur des tâches de coordination. Avec continuité, la traçabilité progresse, la
            communication interne s’allège et les litiges se traitent plus vite.
          </p>
        </div>
      </SiteSection>

      <SiteSection
        eyebrow="Intérêt"
        title="Pourquoi utiliser un logiciel transport"
        description="Le besoin naît quand la coordination quotidienne devient plus coûteuse que l’exécution elle-même."
      >
        <div className="space-y-4 text-sm leading-7 text-[var(--site-text-secondary)] sm:text-base">
          <h3 className="text-lg font-semibold tracking-tight text-[var(--site-text)]">Limiter la dispersion des outils</h3>
          <p>
            Un logiciel transport devient indispensable quand les opérations passent par plusieurs canaux non synchronisés.
            Dans ce cas, chaque changement génère des messages, des vérifications et des ressaisies. L’exploitant perd du
            temps sur la consolidation au lieu de piloter la journée. Le système doit donc centraliser l’information utile,
            avec des statuts compréhensibles et une lecture actionnable.
          </p>
          <h3 className="text-lg font-semibold tracking-tight text-[var(--site-text)]">Améliorer la qualité de service sans ajouter de complexité</h3>
          <p>
            Utiliser un logiciel transport ne consiste pas à empiler des fonctions. Le but est d’améliorer la fiabilité des
            engagements: affecter la bonne ressource, anticiper les blocages, informer les parties prenantes et garder la
            trace des arbitrages. C’est précisément cette logique qui rapproche la fonction TMS d’un pilotage ERP complet,
            comme expliqué dans{' '}
            <Link to="/articles/tms-transport-definition-simple-et-complete" className={inlineLinkClassName}>
              l’article dédié au TMS transport
            </Link>
            .
          </p>
        </div>
      </SiteSection>

      <SiteSection
        eyebrow="Organisation"
        title="Gestion du planning transport"
        description="Le planning transport est le cœur de l’exploitation: il doit rester fiable malgré les changements de la journée."
      >
        <div className="space-y-4 text-sm leading-7 text-[var(--site-text-secondary)] sm:text-base">
          <h3 className="text-lg font-semibold tracking-tight text-[var(--site-text)]">Planifier avec une vue de charge réelle</h3>
          <p>
            Un bon planning transport ne se limite pas à remplir des créneaux. Il doit intégrer les contraintes ressources,
            les priorités clients et la faisabilité opérationnelle. Sans cette lecture, les affectations sont fragiles et les
            corrections de dernière minute deviennent permanentes.
          </p>
          <h3 className="text-lg font-semibold tracking-tight text-[var(--site-text)]">Absorber les urgences sans casser la journée</h3>
          <p>
            L’exploitation subit des imprévus permanents: annulation, retard, indisponibilité, changement de priorité. Le
            système doit permettre des réaffectations rapides et traçables, sans effacer l’historique des décisions. Cette
            capacité distingue un planning opérationnel d’un tableau de saisie.
          </p>
          <h3 className="text-lg font-semibold tracking-tight text-[var(--site-text)]">Relier le planning au reste du flux</h3>
          <p>
            Le planning transport doit alimenter le suivi terrain, la preuve d’exécution et la facturation. Dès que le
            planning vit en silo, l’entreprise reconstitue l’information à la main. Pour une approche détaillée, consultez
            aussi{' '}
            <Link to="/articles/comment-organiser-un-planning-transport-efficacement" className={inlineLinkClassName}>
              l’article sur l’organisation du planning transport
            </Link>
            .
          </p>
        </div>
      </SiteSection>

      <SiteSection
        eyebrow="Ressources"
        title="Optimisation de la flotte"
        description="La gestion flotte doit rester connectée à l’exploitation pour éviter les affectations irréalistes."
      >
        <div className="space-y-4 text-sm leading-7 text-[var(--site-text-secondary)] sm:text-base">
          <h3 className="text-lg font-semibold tracking-tight text-[var(--site-text)]">Voir la disponibilité avant l’affectation</h3>
          <p>
            Une flotte bien pilotée ne se résume pas au nombre de véhicules dans le parc. Ce qui compte, c’est la
            disponibilité réellement mobilisable selon les contraintes techniques, réglementaires et terrain. Cette
            visibilité doit exister avant de confirmer une mission, sinon le planning se dégrade en chaîne.
          </p>
          <h3 className="text-lg font-semibold tracking-tight text-[var(--site-text)]">Relier atelier, conformité et exploitation</h3>
          <p>
            Les opérations atelier, les alertes de conformité et les indisponibilités documentaires doivent être lisibles dans
            la même vue que le pilotage quotidien. Quand ces informations circulent séparément, les arbitrages arrivent trop
            tard. La flotte doit être un sujet de décision en temps réel, pas un reporting différé.
          </p>
          <h3 className="text-lg font-semibold tracking-tight text-[var(--site-text)]">Mesurer l’impact opérationnel et financier</h3>
          <p>
            Optimiser la flotte, c’est aussi mesurer son impact sur la marge: immobilisations non planifiées, temps morts,
            réaffectations d’urgence, surcoûts de coordination. Vous pouvez approfondir ce sujet avec{' '}
            <Link to="/articles/gestion-de-flotte-poids-lourd-erreurs-courantes" className={inlineLinkClassName}>
              l’article sur les erreurs de gestion de flotte poids lourd
            </Link>
            .
          </p>
        </div>
      </SiteSection>

      <SiteSection
        eyebrow="Exécution"
        title="Suivi des opérations en temps réel"
        description="Le suivi des opérations transforme les données terrain en décisions immédiates et traçables."
      >
        <div className="space-y-4 text-sm leading-7 text-[var(--site-text-secondary)] sm:text-base">
          <h3 className="text-lg font-semibold tracking-tight text-[var(--site-text)]">Passer du constat tardif à l’action immédiate</h3>
          <p>
            Le suivi des opérations en temps réel donne à l’exploitant une lecture claire de l’avancement, des écarts et des
            risques. L’objectif n’est pas de surveiller davantage, mais d’agir au bon moment. Un incident traité tôt coûte
            moins cher et dégrade moins la relation client qu’un incident découvert en fin de chaîne.
          </p>
          <h3 className="text-lg font-semibold tracking-tight text-[var(--site-text)]">Donner de la traçabilité aux arbitrages</h3>
          <p>
            Chaque décision d’exploitation doit laisser une trace: qui a décidé, pourquoi, avec quel impact. Cette mémoire
            métier réduit les litiges internes, fiabilise les retours d’expérience et améliore la qualité de service au fil du
            temps. C’est aussi un levier important pour relier pilotage opérationnel et rentabilité réelle.
          </p>
          <h3 className="text-lg font-semibold tracking-tight text-[var(--site-text)]">Renforcer le maillage interne du site</h3>
          <p>
            Pour prolonger cette lecture, consultez la page <Link to="/logiciel-transport" className={inlineLinkClassName}>logiciel transport</Link>,
            la rubrique <Link to="/articles" className={inlineLinkClassName}>articles</Link> et l’article{' '}
            <Link to="/articles/comment-ameliorer-la-rentabilite-d-une-entreprise-de-transport" className={inlineLinkClassName}>
              sur la rentabilité d’une entreprise de transport
            </Link>
            .
          </p>          <p>
            Les sujets plus spécialisés sont traités sur des pages dédiées :{' '}
            <Link to="/tms-transport" className={inlineLinkClassName}>TMS transport</Link>,{' '}
            <Link to="/logiciel-gestion-flotte-camion" className={inlineLinkClassName}>gestion de flotte camion</Link>,{' '}
            <Link to="/telematique-transport" className={inlineLinkClassName}>télématique transport</Link>,{' '}
            <Link to="/chronotachygraphe" className={inlineLinkClassName}>chronotachygraphe</Link>{' '}
            et <Link to="/ia-transport" className={inlineLinkClassName}>IA transport</Link>.
          </p>
        </div>
      </SiteSection>

      <SiteSection
        eyebrow="Cas d'usage"
        title="Ce que NEXORA Truck change au quotidien"
        description="Scénarios concrets d'exploitation transport : avant fragmentation, après centralisation ERP."
      >
        <div className="space-y-6 text-sm leading-7 text-[var(--site-text-secondary)] sm:text-base">
          <div>
            <h3 className="text-lg font-semibold tracking-tight text-[var(--site-text)]">Avant : quatre outils, zéro synchronisation</h3>
            <p className="mt-2">L'exploitant gère le planning dans un tableur partagé, les disponibilités flotte par téléphone avec l'atelier, les temps conducteurs dans un logiciel RH séparé et la facturation dans un ERP générique non relié au terrain. Quand une mission est annulée à 18h, il faut répercuter la modification dans chacun de ces systèmes manuellement, informer le conducteur par SMS et corriger le fichier de facturation à la main en fin de semaine.</p>
          </div>
          <div>
            <h3 className="text-lg font-semibold tracking-tight text-[var(--site-text)]">Avec NEXORA Truck : une seule modification, tout est à jour</h3>
            <p className="mt-2">La réaffectation se fait dans le <Link to="/tms-transport" className={inlineLinkClassName}>TMS transport</Link> en 90 secondes. Le conducteur reçoit la mission actualisée sur son terminal, la <Link to="/telematique-transport" className={inlineLinkClassName}>télématique</Link> suit le nouveau véhicule, et la lettre de voiture est recréée automatiquement. Les données réelles (km GPS, heures de service) alimentent la facturation sans ressaisie. En fin de mois, l'arrêté comptable prend quelques heures au lieu de trois jours.</p>
          </div>
          <div>
            <h3 className="text-lg font-semibold tracking-tight text-[var(--site-text)]">Conformité conducteurs sans import manuel</h3>
            <p className="mt-2">Les dépassements de temps de conduite sont signalés dans le planning avant confirmation. L'exploitant ne découvre pas l'infraction au contrôle DREAL : la contrainte RSE est visible dès la saisie de l'ordre, grâce à la connexion native avec le <Link to="/chronotachygraphe" className={inlineLinkClassName}>chronotachygraphe</Link>. La <Link to="/ia-transport" className={inlineLinkClassName}>couche IA</Link> propose en temps réel le conducteur disponible le plus cohérent selon la charge résiduelle et les temps de repos.</p>
          </div>
        </div>
      </SiteSection>

      <SiteSection title="Pages spécialisées" description="Chaque dimension de l'ERP transport NEXORA est détaillée sur une page dédiée.">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[
            { to: '/erp-transport-routier', label: 'ERP transport routier', desc: 'Solution complète pour les transporteurs routiers' },
            { to: '/tms-transport', label: 'TMS transport', desc: 'Planification et gestion des ordres de transport' },
            { to: '/logiciel-gestion-flotte-camion', label: 'Gestion de flotte camion', desc: 'Suivi véhicules, maintenance et conformité' },
            { to: '/telematique-transport', label: 'Télématique transport', desc: 'GPS, suivi temps réel et données terrain' },
            { to: '/chronotachygraphe', label: 'Chronotachygraphe', desc: 'Intégration tachygraphe et conformité conducteurs' },
            { to: '/ia-transport', label: 'IA transport', desc: 'Intelligence artificielle appliquée à l\u2019exploitation' },
          ].map(({ to, label, desc }) => (
            <Link
              key={to}
              to={to}
              className="group flex flex-col rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm transition-shadow hover:shadow-md"
            >
              <span className="text-sm font-semibold text-[var(--site-text)] group-hover:text-blue-600 transition-colors">{label}</span>
              <span className="mt-1 text-xs leading-5 text-[var(--site-text-secondary)]">{desc}</span>
            </Link>
          ))}
        </div>
      </SiteSection>
    </div>
  )
}
