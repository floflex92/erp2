import { Link } from 'react-router-dom'
import { useEffect } from 'react'
import SiteSection from '@/site/components/SiteSection'
import useSiteMeta from '@/site/hooks/useSiteMeta'

const inlineLinkClassName = 'font-semibold text-[#2563EB]'

export default function LogicielTransportPage() {
  useSiteMeta({
    title: 'Logiciel transport',
    description:
      'Page SEO NEXORA Truck sur le logiciel transport pour relier exploitation transport, planning transport, gestion flotte et suivi métier.',
    canonicalPath: '/logiciel-transport',
    keywords:
      'logiciel transport, ERP transport, TMS transport, exploitation transport, gestion flotte, planning transport',
    ogType: 'article',
    author: 'NEXORA Truck',
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
          <h2 className="text-lg font-semibold tracking-tight text-[var(--site-text)]">Lecture opérationnelle immédiate</h2>
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
            <h2 className="text-lg font-semibold tracking-tight text-[var(--site-text)]">Planning transport</h2>
            <p className="mt-2 text-sm leading-7 text-[var(--site-text-secondary)]">
              Le planning doit rester connecté aux missions et aux ressources disponibles. Un planning isolé devient vite un
              reflet incomplet de la réalité.
            </p>
          </article>
          <article className="rounded-[1.5rem] border border-slate-200/80 bg-white p-5">
            <h2 className="text-lg font-semibold tracking-tight text-[var(--site-text)]">Gestion flotte</h2>
            <p className="mt-2 text-sm leading-7 text-[var(--site-text-secondary)]">
              La disponibilité flotte, les contraintes techniques et la maintenance doivent être visibles dans la même chaîne
              de décision que l’exploitation.
            </p>
          </article>
          <article className="rounded-[1.5rem] border border-slate-200/80 bg-white p-5">
            <h2 className="text-lg font-semibold tracking-tight text-[var(--site-text)]">Suivi des opérations</h2>
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
          <h2 className="text-lg font-semibold tracking-tight text-[var(--site-text)]">Mesurer la baisse de ressaisie et de coordination</h2>
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
        eyebrow="Maillage"
        title="Pages et articles à consulter ensuite"
        description="Le contenu du site public est structuré pour approfondir chaque besoin sans changer de logique."
        muted
      >
        <div className="grid gap-4 md:grid-cols-2">
          <Link to="/erp-transport" className="rounded-[1.5rem] border border-slate-200/80 bg-white p-5 transition-colors hover:bg-slate-50">
            <h2 className="text-lg font-semibold tracking-tight text-[var(--site-text)]">ERP transport</h2>
            <p className="mt-2 text-sm leading-7 text-[var(--site-text-secondary)]">
              Consulter la page structurante sur l’ERP transport, la logique système et la continuité de pilotage.
            </p>
          </Link>
          <Link to="/fonctionnalites" className="rounded-[1.5rem] border border-slate-200/80 bg-white p-5 transition-colors hover:bg-slate-50">
            <h2 className="text-lg font-semibold tracking-tight text-[var(--site-text)]">Fonctionnalités</h2>
            <p className="mt-2 text-sm leading-7 text-[var(--site-text-secondary)]">
              Voir comment les modules publics du site relient exploitation, planning transport, gestion flotte et suivi
              métier.
            </p>
          </Link>
          <Link to="/articles" className="rounded-[1.5rem] border border-slate-200/80 bg-white p-5 transition-colors hover:bg-slate-50">
            <h2 className="text-lg font-semibold tracking-tight text-[var(--site-text)]">Articles transport</h2>
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
