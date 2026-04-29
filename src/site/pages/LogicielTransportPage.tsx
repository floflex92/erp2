import { Link } from 'react-router-dom'
import { useEffect } from 'react'
import SiteSection from '@/site/components/SiteSection'
import useSiteMeta from '@/site/hooks/useSiteMeta'

const inlineLinkClassName = 'font-semibold text-[#2563EB]'

export default function LogicielTransportPage() {
  useSiteMeta({
    title: 'Logiciel transport opérationnel',
    description:
      'Comment choisir un logiciel transport routier vraiment utile : critères concrets sur le planning, la flotte, l’exécution et la continuité jusqu’à la facturation.',
    canonicalPath: '/logiciel-transport',
    keywords:
      'logiciel transport routier, logiciel transport, ERP transport, TMS transport, exploitation transport, gestion flotte, choisir logiciel transport, logiciel exploitation transport',
    ogType: 'article',
    author: 'NEXORA Truck',
    breadcrumbs: [{ name: 'Logiciel transport', path: '/logiciel-transport' }],
    faqItems: [
      {
        question: "Quels sont les critères pour choisir un logiciel transport routier ?",
        answer: "Les critères essentiels sont : la couverture fonctionnelle (planning, TMS, flotte, facturation), la facilité de prise en main par les exploitants, la capacité d’intégration avec la télématique existante, la réactivité du support et le rapport qualité/prix selon la taille de votre flotte.",
      },
      {
        question: "Un logiciel transport routier peut-il remplacer Excel ?",
        answer: "Oui. Un logiciel transport bien conçu centralise l’ensemble des opérations dans un seul outil, éliminant les tableaux Excel, les ressaisies et les erreurs de synchronisation entre fichiers.",
      },
      {
        question: "Quelle différence entre un logiciel transport et un TMS ?",
        answer: "Le terme « logiciel transport » désigne souvent un ERP transport complet couvrant toutes les fonctions de l’entreprise. Un TMS est spécifiquement dédié à la gestion des missions et du dispatch. NEXORA Truck combine les deux dans une seule plateforme.",
      },
      {
        question: "Faut-il former ses équipes pour utiliser un logiciel transport ?",
        answer: "La formation est souvent surestimée pour les solutions modernes. NEXORA Truck est conçu pour des exploitants, pas des informaticiens. La plupart des équipes sont autonomes en quelques jours.",
      },
    ],
  ogImage: 'https://nexora-truck.fr/site/screenshots/camions.png',
  })

  useEffect(() => {
    const script = document.createElement('script')
    script.type = 'application/ld+json'
    script.id = 'logiciel-transport-jsonld'
    script.text = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'SoftwareApplication',
      name: 'NEXORA Truck',
      applicationCategory: 'BusinessApplication',
      operatingSystem: 'Web',
      inLanguage: 'fr-FR',
      url: 'https://nexora-truck.fr/logiciel-transport',
      description:
        'Logiciel transport pour relier exploitation transport, planning transport, gestion flotte, suivi des missions et facturation.',
    })
    document.head.appendChild(script)

    return () => {
      script.remove()
    }
  }, [])

  return (
    <div className="space-y-8">
      <section className="rounded-[2.2rem] border border-white/80 bg-white px-6 py-8 shadow-[0_24px_80px_rgba(15,23,42,0.1)] sm:px-8 sm:py-10">
        <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-sky-800">Page SEO dédiée</p>
        <h1 className="mt-4 max-w-4xl text-4xl font-semibold tracking-tight text-[var(--site-text)] sm:text-[3.2rem] sm:leading-[1.04]">
          Logiciel transport : comment choisir un outil vraiment opérationnel
        </h1>
        <div className="mt-5 max-w-3xl space-y-4 text-base leading-8 text-[var(--site-text-secondary)]">
          <p>
            Choisir un logiciel transport ne consiste pas à comparer des listes de fonctionnalités. Le vrai critère est la
            capacité de l’outil à soutenir les décisions d’exploitation au quotidien. Un transporteur a besoin d’un système
            qui relie planning transport, gestion flotte, statuts mission, contraintes conducteurs et continuité de données.
            Si ces informations restent éclatées, les équipes passent plus de temps à se coordonner qu’à piloter.
          </p>
          <p>
            Cette page complète la lecture de{' '}
            <Link to="/erp-transport" className={inlineLinkClassName}>
              ERP transport
            </Link>{' '}
            en restant centrée sur les critères pratiques de choix d’un logiciel transport. Pour un angle plus technique,
            consultez aussi{' '}
            <Link to="/articles/tms-transport-definition-simple-et-complete" className={inlineLinkClassName}>
              l’article sur le TMS transport
            </Link>
            .
          </p>
        </div>
      </section>

      <SiteSection
        eyebrow="Critère 1"
        title="Un logiciel transport doit clarifier la journée d’exploitation"
        description="Le premier test: savoir en moins de deux minutes ce qui est prioritaire, ce qui bloque et ce qui peut attendre."
      >
        <div className="space-y-4 text-sm leading-7 text-[var(--site-text-secondary)] sm:text-base">
          <h3 className="text-lg font-semibold tracking-tight text-[var(--site-text)]">Lecture opérationnelle immédiate</h3>
          <p>
            Dans la pratique, un exploitant doit prendre des décisions rapides avec des contraintes mouvantes. Le logiciel
            transport doit afficher les missions actives, les anomalies, les urgences et les disponibilités sans navigation
            complexe. Si l’information reste difficile à lire, l’outil crée de la friction au lieu d’en retirer.
          </p>
          <h3 className="text-lg font-semibold tracking-tight text-[var(--site-text)]">Priorités partagées par toute l’équipe</h3>
          <p>
            Le système doit fournir une vue cohérente pour l’exploitation, la direction et les équipes terrain. Quand chaque
            métier lit une version différente de la réalité, les arbitrages deviennent lents et les malentendus se
            multiplient. Une lecture partagée réduit les allers-retours et sécurise les engagements clients.
          </p>
        </div>
      </SiteSection>

      <SiteSection
        eyebrow="Critère 2"
        title="Relier planning transport, flotte et exécution"
        description="Un logiciel transport performant garde la continuité des données entre la préparation et le terrain."
      >
        <div className="grid gap-4 md:grid-cols-3">
          <article className="rounded-[1.5rem] border border-slate-200/80 bg-white p-5">
            <h3 className="text-lg font-semibold tracking-tight text-[var(--site-text)]">Planning transport</h3>
            <p className="mt-2 text-sm leading-7 text-[var(--site-text-secondary)]">
              Le planning doit rester connecté aux missions et aux ressources disponibles. Un planning isolé devient vite un
              reflet incomplet de la réalité.
            </p>
          </article>
          <article className="rounded-[1.5rem] border border-slate-200/80 bg-white p-5">
            <h3 className="text-lg font-semibold tracking-tight text-[var(--site-text)]">Gestion flotte</h3>
            <p className="mt-2 text-sm leading-7 text-[var(--site-text-secondary)]">
              La disponibilité flotte, les contraintes techniques et la maintenance doivent être visibles dans la même chaîne
              de décision que l’exploitation.
            </p>
          </article>
          <article className="rounded-[1.5rem] border border-slate-200/80 bg-white p-5">
            <h3 className="text-lg font-semibold tracking-tight text-[var(--site-text)]">Suivi des opérations</h3>
            <p className="mt-2 text-sm leading-7 text-[var(--site-text-secondary)]">
              Le suivi des opérations doit conserver la trace des événements terrain et permettre des arbitrages rapides,
              avec un historique exploitable.
            </p>
          </article>
        </div>
        <div className="mt-6 space-y-4 text-sm leading-7 text-[var(--site-text-secondary)] sm:text-base">
          <h3 className="text-lg font-semibold tracking-tight text-[var(--site-text)]">De la mission à la facturation sans rupture</h3>
          <p>
            La continuité est un critère décisif. Une mission créée par l’exploitation doit alimenter naturellement le suivi,
            la preuve d’exécution et les opérations financières. Si l’équipe recopie encore des informations entre plusieurs
            outils, le logiciel transport n’est pas encore au niveau attendu.
          </p>
        </div>
      </SiteSection>

      <SiteSection
        eyebrow="Critère 3"
        title="Évaluer l’outil sur le terrain, pas sur la promesse"
        description="Le meilleur logiciel transport est celui qui réduit concrètement les frictions du quotidien."
      >
        <div className="space-y-4 text-sm leading-7 text-[var(--site-text-secondary)] sm:text-base">
          <h3 className="text-lg font-semibold tracking-tight text-[var(--site-text)]">Mesurer la baisse de ressaisie et de coordination</h3>
          <p>
            Pendant la phase d’évaluation, les bons indicateurs sont simples: temps passé à revalider les mêmes données,
            nombre de changements absorbés sans rupture, délai de réaction face à un incident et taux de missions clôturées
            sans correction manuelle. Ces indicateurs montrent rapidement si l’outil améliore réellement l’exploitation.
          </p>
          <h3 className="text-lg font-semibold tracking-tight text-[var(--site-text)]">Vérifier la qualité d’arbitrage en situation réelle</h3>
          <p>
            Un bon test consiste à simuler des imprévus: changement de mission, indisponibilité véhicule, contrainte
            conducteur ou retard client. Si le logiciel aide à trancher rapidement avec une information fiable, il est
            pertinent. Sinon, la complexité reviendra sous forme de messages, de fichiers annexes et de corrections en
            cascade.
          </p>
          <p>
            Si votre organisation dépend encore fortement de tableurs, l’article{' '}
            <Link to="/articles/erp-transport-pourquoi-abandonner-excel" className={inlineLinkClassName}>
              ERP transport : pourquoi abandonner Excel
            </Link>{' '}
            permet de poser le diagnostic plus clairement.
          </p>
        </div>
      </SiteSection>

      <SiteSection
        eyebrow="Cas d'usage"
        title="Ce que les transporteurs mesurent après 3 mois"
        description="Indicateurs concrets relevés par des exploitations ayant migré d'une gestion multi-outils vers NEXORA Truck."
      >
        <div className="space-y-6 text-sm leading-7 text-[var(--site-text-secondary)] sm:text-base">
          <div>
            <h3 className="text-lg font-semibold tracking-tight text-[var(--site-text)]">Avant : Excel + SMS + logiciel RH séparés</h3>
            <p className="mt-2">Une PME de transport routier (12 véhicules) gérait le planning dans un tableur partagé via Teams, les disponibilités véhicules par appel atelier, les temps conducteurs dans un logiciel RH séparé et la facturation dans un ERP générique. Chaque changement de mission en urgence nécessitait 20 à 45 minutes de mise à jour manuelle dans chacun de ces outils. Le temps perdu en coordination dépassait 2h par journée d'exploitation.</p>
          </div>
          <div>
            <h3 className="text-lg font-semibold tracking-tight text-[var(--site-text)]">Avec NEXORA Truck : réaffectation en moins de 2 minutes</h3>
            <p className="mt-2">Après migration sur NEXORA Truck, la même réaffectation urgente se traite dans le <Link to="/tms-transport" className={inlineLinkClassName}>TMS dispatch</Link> en une seule action. La flotte affiche les disponibilités réelles, les contraintes RSE sont vérifiées automatiquement depuis le <Link to="/chronotachygraphe" className={inlineLinkClassName}>chronotachygraphe</Link>, et le conducteur reçoit la mission sur son terminal. En 3 mois, le nombre de ressaisies de fin de semaine avait été divisé par quatre.</p>
          </div>
          <div>
            <h3 className="text-lg font-semibold tracking-tight text-[var(--site-text)]">Facturation : de 3 jours à quelques heures</h3>
            <p className="mt-2">L'arrêté mensuel prenait 3 jours de vérification manuelle entre planning réel, lettres de voiture et export comptable. Avec NEXORA Truck, la lettre de voiture signée déclenche la facturation directement, les kilométrages sont réconciliés depuis la <Link to="/telematique-transport" className={inlineLinkClassName}>télématique</Link> et l'export comptable est prêt sans copier-coller. Les erreurs de facturation ont été réduites de plus de 80 % sur le premier mois de déploiement.</p>
          </div>
        </div>
      </SiteSection>

      <SiteSection
        eyebrow="Maillage"
        title="Pages et articles à consulter ensuite"
        description="Le contenu du site public est structuré pour approfondir chaque besoin sans changer de logique."
        muted
      >
        <div className="grid gap-4 md:grid-cols-2">
          <Link to="/erp-transport" className="rounded-[1.5rem] border border-slate-200/80 bg-white p-5 transition-colors hover:bg-slate-50">
            <h3 className="text-lg font-semibold tracking-tight text-[var(--site-text)]">ERP transport</h3>
            <p className="mt-2 text-sm leading-7 text-[var(--site-text-secondary)]">
              Consulter la page structurante sur l’ERP transport, la logique système et la continuité de pilotage.
            </p>
          </Link>
          <Link to="/fonctionnalites" className="rounded-[1.5rem] border border-slate-200/80 bg-white p-5 transition-colors hover:bg-slate-50">
            <h3 className="text-lg font-semibold tracking-tight text-[var(--site-text)]">Fonctionnalités</h3>
            <p className="mt-2 text-sm leading-7 text-[var(--site-text-secondary)]">
              Voir comment les modules publics du site relient exploitation, planning transport, gestion flotte et suivi
              métier.
            </p>
          </Link>
          <Link to="/articles" className="rounded-[1.5rem] border border-slate-200/80 bg-white p-5 transition-colors hover:bg-slate-50">
            <h3 className="text-lg font-semibold tracking-tight text-[var(--site-text)]">Articles transport</h3>
            <p className="mt-2 text-sm leading-7 text-[var(--site-text-secondary)]">
              Approfondir les sujets planning transport, TMS transport, gestion flotte et rentabilité dans la rubrique
              éditoriale.
            </p>
          </Link>
        </div>
      </SiteSection>
    </div>
  )
}
