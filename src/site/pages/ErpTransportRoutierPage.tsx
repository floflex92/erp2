import { Link } from 'react-router-dom'
import SiteSection from '@/site/components/SiteSection'
import ScreenshotPlaceholder from '@/site/components/ScreenshotPlaceholder'
import useSiteMeta from '@/site/hooks/useSiteMeta'

const problems = [
  'Réaffectation d’urgence en moins d’une heure : impossible sans centralisation des disponibilités véhicule, conducteur et mission dans le même système.',
  'La facturation de fin de mois prend 3 à 5 jours de ressaisie car les écarts entre plannning et réalité terrain ne se consolident pas automatiquement.',
  'L’exploitant ne sait pas en temps réel combien coûte une mission jusqu’à la lettre de voiture validée — la marge reste opaque jusqu’en fin de mois.',
  'Cinq applications différentes pour piloter : un tableur planning, un logiciel carburant, un outil RH, un système facturation, et un outil GPS. Chaque écart se gère manuellement.',
]

const solutionPillars = [
  {
    title: 'Planning dispatch en temps réel',
    body: 'Affectation conducteur–véhicule–mission validée en un glisser-déposer, avec vérification automatique des contraintes RSE, CT / VGP et permis.',
  },
  {
    title: 'Flotte et exploitation synchronisées',
    body: 'Disponibilité véhicule, alertes maintenance atelier et statuts terrain remontent dans le même tableau de bord que le planning missions.',
  },
  {
    title: 'Marge mission visible dès la prise d’ordre',
    body: 'Coûts conducteur, carburant estimé, péages et sous-traitance calculés automatiquement avant confirmation — la marge prend forme sans ressaisie.',
  },
  {
    title: 'Facturation automatisée depuis le BL',
    body: 'La lettre de voiture validée génère la facture sans ressaisie manuelle. Les écarts kilométriques sont reconciliés depuis la télématique avant émission.',
  },
]

const keyFeatures = [
  {
    title: 'Dispatch et OT',
    body: 'Création d’ordre de transport, affectation conducteur–véhicule–mission et suivi statut de prise en charge à livraison en un seul environnement.',
  },
  {
    title: 'Cockpit flotte intégré',
    body: 'Disponibilités véhicules, alertes CT / VGP, entretien atelier et géolocalisation reliés directement au planning dispatch.',
  },
  {
    title: 'Gestion conducteurs RSE',
    body: 'Temps de service, repos obligatoires, infractions tachygraphe et suivi disciplinaire visibles sans import manuel depuis le chronotachygraphe.',
  },
  {
    title: 'Marge prévisionnelle et réelle',
    body: 'Coût de revient estimé à la prise d’ordre, puis marge réelle calculée après livraison depuis les données terrain consolidées.',
  },
  {
    title: 'Facturation et BL',
    body: 'Génération de facture depuis la lettre de voiture validée, rapprochement kilométrique GPS et export comptable automatisé.',
  },
]

export default function ErpTransportRoutierPage() {
  useSiteMeta({
    title: 'ERP transport routier : planning, flotte et facturation',
    description:
      'ERP transport routier tout-en-un : de la prise d’ordre à la facturation, NEXORA Truck centralise planning, flotte, conducteurs et marges sans outil satellite.',
    canonicalPath: '/erp-transport-routier',
    keywords:
      'ERP transport routier, logiciel transport routier, gestion flotte camion, planning transport, TMS transport, automatisation API transport, logiciel exploitation transport, gestion parc poids lourds',
    ogType: 'article',
    author: 'NEXORA Truck',
  })

  return (
    <div className="space-y-8">
      <section className="rounded-[2.2rem] border border-white/80 bg-white px-6 py-8 shadow-[0_24px_80px_rgba(15,23,42,0.1)] sm:px-8 sm:py-10">
        <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-sky-800">Page SEO principale</p>
        <h1 className="mt-4 max-w-4xl text-4xl font-semibold tracking-tight text-[var(--site-text)] sm:text-[3.2rem] sm:leading-[1.04]">
          ERP transport routier tout-en-un : planning, flotte, conducteurs et facturation sans outil satellite
        </h1>
        <p className="mt-5 max-w-3xl text-base leading-8 text-[var(--site-text-secondary)]">
          Le planning, la flotte, les conducteurs et la facturation dans des outils séparés : chaque changement de mission se traduit par des appels, des messages et des doubles saisies. NEXORA Truck centralise tout dans un même environnement : l’exploitant voit l’ensemble du flux en temps réel, communique directement avec les conducteurs et les clients, et pilote sans outil satellite.
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
        description="ERP, TMS, flotte et conformité dans un système unique : chaque module alimente le suivant sans ressaisie."
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
        eyebrow="Cas d’usage"
        title="L’ERP transport routier en situation réelle"
        description="Ce que NEXORA Truck change concrètement dans la journée d’un exploitant transport routier."
      >
        <div className="space-y-6 text-sm leading-7 text-[var(--site-text-secondary)] sm:text-base">
          <div>
            <h3 className="text-lg font-semibold tracking-tight text-[var(--site-text)]">Avant : cinq outils, cinq ressaisies</h3>
            <p className="mt-2">Un exploitant gère le planning dans Excel, les disponibilités véhicules dans un fichier atelier, les temps conducteurs dans un logiciel RH, les lettres de voiture en papier et la facturation dans un ERP comptable générique. Un changement de mission en urgence nécessite de répercuter la modification dans chacun de ces systèmes. En moyenne, 45 minutes perdues par réaffectation critique selon les retours terrain.</p>
          </div>
          <div>
            <h3 className="text-lg font-semibold tracking-tight text-[var(--site-text)]">Avec NEXORA Truck : une modification, tout se répercute</h3>
            <p className="mt-2">La réaffectation est faite dans le <Link to="/tms-transport" className="font-semibold text-[#2563EB]">TMS transport</Link> : le conducteur reçoit la mission sur son terminal, la <Link to="/telematique-transport" className="font-semibold text-[#2563EB]">télématique</Link> suit le nouveau véhicule, et la lettre de voiture est générée automatiquement. En fin de journée, les données réelles (km, heures, péages) alimentent la facturation sans copier-coller.</p>
          </div>
          <div>
            <h3 className="text-lg font-semibold tracking-tight text-[var(--site-text)]">Contrôle de la marge dès la prise de commande</h3>
            <p className="mt-2">Avant de confirmer une mission, l’exploitant voit le prix proposé au client, le coût estimé (conducteur + véhicule + carburant + péages) et la marge prévisionnelle. Si la marge est insuffisante, la négociation du tarif se fait avant confirmation — pas en fin de mois lors de l’analyse comptable. C’est la principale différence avec un ERP générique non connecté au terrain.</p>
          </div>
          <div>
            <h3 className="text-lg font-semibold tracking-tight text-[var(--site-text)]">Fin de mois : facturation automatisée depuis le BL</h3>
            <p className="mt-2">La lettre de voiture signée déclenche automatiquement la génération de la facture. Les kilomètres réels (issus de la télématique) sont rapprochés avec les kilomètres facturés. L’export comptable est prêt sans ressaisie — un arrêt de fin de mois qui prend 3 jours en gestion multi-outils se fait en quelques heures avec NEXORA Truck.</p>
          </div>
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
