import { Link } from 'react-router-dom'
import ArticleShell, { inlineLinkClassName } from '@/site/components/ArticleShell'
import SiteSection from '@/site/components/SiteSection'

export default function GestionFlotteArticlePage() {
  return (
    <ArticleShell
      title="Gestion de flotte poids lourd : erreurs à éviter"
      description="Les erreurs de pilotage les plus fréquentes sur la flotte et les bonnes pratiques pour les éviter."
      canonicalPath="/articles/gestion-de-flotte-poids-lourd-erreurs-courantes"
      keywords="gestion flotte poids lourd, gestion flotte, logiciel transport, ERP transport, exploitation transport, planning transport"
      readingTime="6 min"
      intro={
        <>
          <p>
            Dans le transport routier, la flotte est trop souvent pilotée comme un sujet séparé. D’un côté, l’atelier et la
            maintenance. De l’autre, le planning et l’exploitation. Cette séparation semble pratique, mais elle produit des
            décisions tardives, des affectations fragiles et des indisponibilités découvertes au mauvais moment.
          </p>
          <p>
            Une bonne gestion flotte ne consiste pas seulement à savoir quels véhicules existent. Elle consiste à savoir
            lesquels sont réellement mobilisables, à quel moment, avec quelles contraintes et pour quelles missions. C’est
            pourquoi la flotte doit rester liée au{' '}
            <Link to="/erp-transport" className={inlineLinkClassName}>
              pilotage ERP transport
            </Link>{' '}
            et au{' '}
            <Link to="/articles/comment-organiser-un-planning-transport-efficacement" className={inlineLinkClassName}>
              planning transport
            </Link>
            .
          </p>
          <p>
            Quand la flotte est pilotée en silo, l’exploitation découvre trop tard des indisponibilités pourtant prévisibles.
            Le coût apparaît sous forme de réaffectations d’urgence, de kilomètres improductifs et d’une pression accrue sur
            les équipes. Une gestion flotte robuste cherche au contraire à anticiper ces situations et à rendre visibles les
            arbitrages avant qu’ils ne deviennent critiques.
          </p>
        </>
      }
      relatedLinks={[
        { to: '/logiciel-gestion-flotte-camion', title: 'Logiciel gestion flotte camion', description: 'Page dédiée à la gestion de flotte NEXORA Truck.' },
        { to: '/logiciel-transport', title: 'Logiciel transport', description: 'Voir comment relier flotte, planning et exploitation.' },
        { to: '/erp-transport', title: 'ERP transport', description: 'Revenir vers la page principale sur le pilotage global.' },
        { to: '/telematique-transport', title: 'Télématique transport', description: 'Comprendre comment la télématique améliore le suivi flotte.' },
        { to: '/articles/comment-ameliorer-la-rentabilite-d-une-entreprise-de-transport', title: 'Rentabilité transport', description: "Mesurer l’impact direct de la flotte sur la marge." },
      ]}
    >
      <SiteSection
        eyebrow="Erreur n°1"
        title="Gérer la disponibilité avec retard"
        description="La disponibilité flotte doit être visible avant l’affectation, pas après."
      >
        <div className="space-y-4 text-sm leading-7 text-[var(--site-text-secondary)] sm:text-base">
          <p>
            La première erreur consiste à considérer la disponibilité flotte comme une information secondaire. Lorsqu’un
            véhicule est indisponible, incertain ou proche d’une contrainte, cette donnée doit être visible avant
            l’affectation. Sinon, le planning repose sur une hypothèse et non sur une ressource fiable.
          </p>
          <p>
            Un <Link to="/logiciel-transport" className={inlineLinkClassName}>logiciel transport</Link> utile doit relier la
            ressource au flux de décision. Ce n’est pas un confort: c’est la base d’une exécution stable.
          </p>
        </div>
      </SiteSection>

      <SiteSection
        eyebrow="Erreur n°2"
        title="Séparer maintenance et exploitation"
        description="Le problème n’est pas le manque de volonté, mais le manque de lecture partagée."
      >
        <div className="space-y-4 text-sm leading-7 text-[var(--site-text-secondary)] sm:text-base">
          <p>
            Quand l’atelier travaille sans visibilité immédiate côté exploitation, les arbitrages deviennent pénibles. Une
            intervention pourtant prévue peut percuter une mission sensible. À l’inverse, une mission urgente peut mobiliser un
            véhicule qui aurait dû sortir du flux.
          </p>
          <p>
            Plus la flotte grossit, plus cette séparation coûte cher. La maintenance doit rester lisible dans le même
            environnement que le planning transport, même si les métiers gardent leurs propres actions.
          </p>
        </div>
      </SiteSection>

      <SiteSection
        eyebrow="Erreur n°3"
        title="Piloter la flotte sans indicateurs utiles"
        description="Compter les véhicules du parc ne suffit pas."
      >
        <div className="grid gap-4 md:grid-cols-2">
          <article className="rounded-[1.5rem] border border-slate-200/80 bg-white p-5">
            <h3 className="text-lg font-semibold tracking-tight text-[var(--site-text)]">Disponibilité réelle</h3>
            <p className="mt-2 text-sm leading-7 text-[var(--site-text-secondary)]">
              Il faut suivre la disponibilité réellement exploitable, les immobilisations non planifiées et l’impact des
              indisponibilités sur le planning.
            </p>
          </article>
          <article className="rounded-[1.5rem] border border-slate-200/80 bg-white p-5">
            <h3 className="text-lg font-semibold tracking-tight text-[var(--site-text)]">Impact marge</h3>
            <p className="mt-2 text-sm leading-7 text-[var(--site-text-secondary)]">
              Une flotte mal pilotée crée des réorganisations de dernière minute, des kilomètres mal absorbés et des coûts de
              coordination qui grignotent la rentabilité.
            </p>
          </article>
        </div>
      </SiteSection>

      <SiteSection
        eyebrow="Erreur n°4"
        title="Traiter chaque incident comme un cas isolé"
        description="Un événement flotte doit laisser une trace utile, pas disparaître après résolution."
        muted
      >
        <div className="space-y-4 text-sm leading-7 text-[var(--site-text-secondary)] sm:text-base">
          <p>
            Une panne, un retard atelier ou une indisponibilité documentaire ne doivent pas être gérés comme des accidents sans
            mémoire. Chaque événement doit alimenter un historique exploitable pour affiner les décisions futures. Sans cette
            trace, l’organisation répète les mêmes erreurs et dépend trop de la mémoire individuelle.
          </p>
          <p>
            Si vous souhaitez relier ce sujet à la performance globale, poursuivez avec{' '}
            <Link to="/articles/comment-ameliorer-la-rentabilite-d-une-entreprise-de-transport" className={inlineLinkClassName}>
              l’article sur la rentabilité d’une entreprise de transport
            </Link>{' '}
            ou revenez vers les{' '}
            <Link to="/fonctionnalites" className={inlineLinkClassName}>
              fonctionnalités publiques du site
            </Link>
            .
          </p>
        </div>
      </SiteSection>

      <SiteSection
        eyebrow="Prévention"
        title="Construire une gestion flotte qui évite les blocages"
        description="La prévention repose sur des routines simples reliées au planning transport."
      >
        <div className="space-y-4 text-sm leading-7 text-[var(--site-text-secondary)] sm:text-base">
          <h2 className="text-lg font-semibold tracking-tight text-[var(--site-text)]">Planifier la maintenance selon l’activité réelle</h2>
          <p>
            La maintenance préventive doit être cadrée en lien avec la charge opérationnelle, et non traitée comme un agenda
            isolé. Cette coordination réduit les immobilisations subies et sécurise la disponibilité au moment des pics
            d’activité.
          </p>
          <h3 className="text-lg font-semibold tracking-tight text-[var(--site-text)]">Standardiser les alertes et les seuils</h3>
          <p>
            Les alertes critiques (documents, conformité, échéances techniques, événements atelier) doivent suivre des seuils
            lisibles par toute l’équipe. Sans standard commun, chacun interprète l’urgence différemment et les décisions se
            contredisent.
          </p>
          <h3 className="text-lg font-semibold tracking-tight text-[var(--site-text)]">Mesurer l’impact sur la performance</h3>
          <p>
            Une gestion flotte efficace suit des indicateurs concrets: disponibilité réellement exploitable, fréquence des
            réaffectations liées aux ressources, coût des immobilisations non planifiées et délai moyen de remise en service.
            Ces mesures aident à prioriser les actions qui améliorent réellement l’exploitation.
          </p>
          <p>
            Pour une vision transversale, consultez aussi la page <Link to="/logiciel-transport" className={inlineLinkClassName}>logiciel transport</Link>{' '}
            et l’article <Link to="/articles/comment-ameliorer-la-rentabilite-d-une-entreprise-de-transport" className={inlineLinkClassName}>sur la rentabilité transport</Link>.
          </p>
        </div>
      </SiteSection>
    </ArticleShell>
  )
}
