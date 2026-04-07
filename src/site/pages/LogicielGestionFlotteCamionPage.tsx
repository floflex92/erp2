import { Link } from 'react-router-dom'
import SiteSection from '@/site/components/SiteSection'
import ScreenshotPlaceholder from '@/site/components/ScreenshotPlaceholder'
import useSiteMeta from '@/site/hooks/useSiteMeta'

const problems = [
  'Une immobilisation non planifiée découverte au départ paralyse la journée entière.',
  'La disponibilité réelle de la flotte est inconnue jusqu’au moment de l’affectation.',
  'Atelier, CT / VGP et exploitation communiquent dans des canaux séparés sans synchronisation.',
  'Les affectations véhicule–conducteur ne tiennent pas compte des contraintes techniques en temps réel.',
]

const solutionPillars = [
  {
    title: 'Cockpit flotte centralisé',
    body: 'Disponibilités, statuts et alertes de chaque véhicule dans une seule vue synchronisée avec le planning transport.',
  },
  {
    title: 'Alertes maintenance proactives',
    body: 'CT / VGP, contrôles atelier et révisions programmées remontent avant d’impacter les missions du lendemain.',
  },
  {
    title: 'Affectation contrainte réelle',
    body: 'Le système valide qu’un camion est disponible, conforme et adapté avant chaque confirmation de départ.',
  },
  {
    title: 'Impact coût direct',
    body: 'Immobilisations, surcoûts de réaffectation et disponibilité opérationnelle mesurés mission par mission.',
  },
]

const keyFeatures = [
  { title: 'Disponibilité temps réel', body: 'Chaque véhicule et remorque affiche son statut opérationnel et ses prochaines contraintes techniques.' },
  { title: 'Alertes CT / VGP et révisions', body: 'Notifications automatiques avant toute échéance réglementaire ou intervention atelier planifiée.' },
  { title: 'Géolocalisation intégrée', body: 'Position des camions remountée depuis la télématique directement dans la fiche véhicule.' },
  { title: 'Historique et conformité', body: 'Documents, révisions et sinistres centralisés par véhicule pour les audits et contrôles.' },
  { title: 'Connexion exploitation', body: 'La flotte reste synchronisée avec le TMS pour valider chaque affectation avant départ.' },
]

export default function LogicielGestionFlotteCamionPage() {
  useSiteMeta({
    title: 'Logiciel flotte camion : suivi, maintenance et exploitation',
    description:
      'Logiciel gestion flotte camion NEXORA Truck : disponibilités véhicules, alertes CT / VGP, maintenance et géolocalisation intégrées au planning transport en temps réel.',
    canonicalPath: '/logiciel-gestion-flotte-camion',
    keywords:
      'logiciel gestion flotte camion, gestion flotte transport, logiciel flotte poids lourds, fleet management transport, planning flotte transport, ERP transport routier, gestion parc poids lourds',
    ogType: 'article',
    author: 'NEXORA Truck',
  })

  return (
    <div className="space-y-8">
      <section className="rounded-[2.2rem] border border-white/80 bg-white px-6 py-8 shadow-[0_24px_80px_rgba(15,23,42,0.1)] sm:px-8 sm:py-10">
        <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-sky-800">Page SEO secondaire</p>
        <h1 className="mt-4 max-w-4xl text-4xl font-semibold tracking-tight text-[var(--site-text)] sm:text-[3.2rem] sm:leading-[1.04]">
          Logiciel gestion flotte camion : suivez chaque véhicule, anticipez la maintenance, évitez les immobilisations
        </h1>
        <p className="mt-5 max-w-3xl text-base leading-8 text-[var(--site-text-secondary)]">
          Une immobilisation découverte au départ, un CT / VGP manqué ou une disponibilité mal évaluée : voilà les pannes silencieuses de l’exploitation. NEXORA Truck centralise la gestion flotte camion dans le même outil que le planning transport — disponibilités, alertes maintenance et géolocalisation visibles avant chaque affectation.
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

      <SiteSection eyebrow="Problèmes" title="Les blocages fréquents côté flotte" description="Un manque de synchronisation flotte-planning crée des retards et des coûts évitables.">
        <ul className="grid gap-3">
          {problems.map(problem => (
            <li key={problem} className="rounded-[1.2rem] border border-slate-200/80 bg-white px-5 py-4 text-sm leading-7 text-[var(--site-text)]">
              {problem}
            </li>
          ))}
        </ul>
      </SiteSection>

      <SiteSection eyebrow="Solution NEXORA" title="Un pilotage flotte relié au terrain" description="NEXORA Truck unifie la gestion flotte camion et l’exécution transport pour garder la main sur les priorités.">
        <div className="grid gap-4 md:grid-cols-2">
          {solutionPillars.map(item => (
            <article key={item.title} className="rounded-[1.5rem] border border-slate-200/80 bg-white p-5">
              <h3 className="text-lg font-semibold tracking-tight text-slate-950">{item.title}</h3>
              <p className="mt-2 text-sm leading-7 text-[var(--site-text-secondary)]">{item.body}</p>
            </article>
          ))}
        </div>
      </SiteSection>

      <SiteSection eyebrow="Fonctionnalités clés" title="Le cockpit flotte NEXORA en pratique" description="Chaque module répond à une situation concrète de la gestion quotidienne d’un parc de poids lourds.">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {keyFeatures.map(feature => (
            <article key={feature.title} className="rounded-[1.5rem] border border-slate-200/80 bg-white p-5">
              <h3 className="text-base font-semibold text-[var(--site-text)]">{feature.title}</h3>
              <p className="mt-2 text-sm leading-7 text-[var(--site-text-secondary)]">{feature.body}</p>
            </article>
          ))}
        </div>
      </SiteSection>

      <SiteSection eyebrow="Cas d’usage" title="Ce que la gestion flotte change dans l’exploitation" description="Scénarios concrets de véhicules, maintenance et disponibilité pour des entreprises de transport routier.">
        <div className="space-y-6 text-sm leading-7 text-[var(--site-text-secondary)] sm:text-base">
          <div>
            <h3 className="text-lg font-semibold tracking-tight text-[var(--site-text)]">CT / VGP manqué découvert au départ</h3>
            <p className="mt-2">Sans alerte proactive, le véhicule est affecté la veille et l’échéance du contrôle technique n’est connue que le matin du départ. Résultat : réaffectation d’urgence, mission retardée, client prévenu en dernier. Avec NEXORA Truck, l’alerte CT / VGP remonte 10 jours avant l’échéance dans le cockpit flotte. L’exploitant programme l’intervention atelier avant que le véhicule ne soit affronté au planning.</p>
          </div>
          <div>
            <h3 className="text-lg font-semibold tracking-tight text-[var(--site-text)]">Coût total de possession (TCO) par véhicule</h3>
            <p className="mt-2">Un véhicule consomme 28 000 € / an en carburant, 4 200 € en pneus et 6 800 € en maintenance. Si ces données restent dans trois fichiers Excel distincts, il est impossible de savoir quels camions sont les plus rentables. NEXORA Truck centralise le TCO flotte par véhicule : coût au km, intervalle de révision et impact sur la marge mission peuvent être visualisés en temps réel.</p>
          </div>
          <div>
            <h3 className="text-lg font-semibold tracking-tight text-[var(--site-text)]">Affectation véhicule–conducteur avec contraintes réelles</h3>
            <p className="mt-2">Un conducteur à 35 tonnes ne peut pas prendre une semi chargée si son permis est en cours de renouvellement. Un véhicule référencé « indétermine » dans le système reste invisible à l’affectation. Dans NEXORA Truck, chaque véhicule porte ses contraintes techniques et documentaires — l’affectation est validée au moment de la confirmation, pas découverte au départ. Ce contrôle est 100 % natif, sans module à part, directement relié au <Link to="/tms-transport" className="font-semibold text-[#2563EB]">TMS transport</Link> et au <Link to="/chronotachygraphe" className="font-semibold text-[#2563EB]">suivi des temps de conduite</Link>.</p>
          </div>
          <div>
            <h3 className="text-lg font-semibold tracking-tight text-[var(--site-text)]">Géolocalisation intégrée : position réelle dans la fiche véhicule</h3>
            <p className="mt-2">La <Link to="/telematique-transport" className="font-semibold text-[#2563EB]">télématique transport</Link> de NEXORA remonte la position, le kilométrage réalisé et les alertes comportement directement dans la fiche véhicule. Le gestionnaire de flotte voit en temps réel quels camions sont proches d’une révision kilométrique et peut programmer l’intervention atelier sans attendre un rapport de fin de mois.</p>
          </div>
        </div>
      </SiteSection>

      <SiteSection eyebrow="Visuel ERP" title="Aperçu cockpit flotte" description="Interface de gestion flotte camion : disponibilités, alertes maintenance et affectations reliées au planning.">
        <ScreenshotPlaceholder
          title="Screenshot logiciel gestion flotte camion"
          caption="Insérez ici une capture de la vue flotte avec statuts véhicules, affectations et alertes atelier."
          format="16:9"
          label="Gestion flotte"
          status="Prêt à remplacer"
          highlights={[
            'Disponibilité flotte en direct',
            'Affectations planning transport',
            'Alertes maintenance critiques',
          ]}
        />
      </SiteSection>

      <SiteSection eyebrow="Lien principal" title="Pages complémentaires" description="Approfondir les sujets reliés à la gestion de flotte." muted>
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
          <Link to="/chronotachygraphe" className="inline-flex rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-[var(--site-text)] transition-colors hover:bg-slate-50">
            Chronotachygraphe
          </Link>
        </div>
      </SiteSection>
    </div>
  )
}
