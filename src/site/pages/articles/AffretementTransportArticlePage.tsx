import { Link } from 'react-router-dom'
import ArticleShell, { inlineLinkClassName } from '@/site/components/ArticleShell'
import SiteSection from '@/site/components/SiteSection'

export default function AffretementTransportArticlePage() {
  return (
    <ArticleShell
      title="Affrètement transport et sous-traitance : reprendre le contrôle sans ajouter d'écrans"
      description="La sous-traitance transport par e-mail coûte plus cher qu'elle ne semble. Voici comment intégrer l'affrètement dans le TMS sans complexifier l'exploitation."
      canonicalPath="/articles/affretement-transport-sous-traitance"
      keywords="affrètement transport routier, sous-traitance transport ERP, gestion sous-traitants transport, portail affréteur, TMS affrètement, logiciel sous-traitance transport"
      readingTime="5 min"
      intro={
        <>
          <p>
            L'affrètement est, pour beaucoup d'exploitations, la partie la moins maîtrisée du transport. Les courses propres
            sont suivies dans le TMS. Les sous-traitants reçoivent un e-mail, confirment par SMS et envoient un PDF en fin de
            semaine. Personne ne sait exactement ce qui est parti, ce qui est arrivé et combien ça coûte réellement.
          </p>
          <p>
            Ce fonctionnement a un coût invisible&nbsp;: marge non calculée avant confirmation, traçabilité absente pour les
            clients qui demandent un suivi, liasse documentaire incomplète en cas de contrôle. L'<Link to="/affretement-transport" className={inlineLinkClassName}>affrètement transport</Link> ne
            demande pas un outil séparé — il demande une intégration propre dans le <Link to="/tms-transport" className={inlineLinkClassName}>TMS existant</Link>.
          </p>
        </>
      }
      relatedLinks={[
        { to: '/affretement-transport', title: 'Affrètement transport', description: 'Module d\'affrètement intégré à NEXORA Truck.' },
        { to: '/tms-transport', title: 'TMS transport', description: 'Comment le TMS gère les missions propres et sous-traitées.' },
        { to: '/erp-transport', title: 'ERP transport', description: 'Plateforme intégrant exploitation, affrètement et facturation.' },
        { to: '/facturation-transport', title: 'Facturation transport', description: 'Refacturation automatique des courses affrétées.' },
      ]}
    >
      <SiteSection eyebrow="Problème 1" title="La marge affrètement disparaît sans calcul préalable">
        <div className="space-y-4 text-sm leading-7 text-[var(--site-text-secondary)] sm:text-base">
          <p>
            Quand la commande au sous-traitant et le tarif client facturé ne sont pas confrontés en temps réel, la marge de
            l'affrètement n'est visible qu'a posteriori — souvent quand il est trop tard pour ajuster. L'exploitant confirme
            la course au sous-traitant sur la base d'une estimation, puis découvre à la clôture que le taux d'activité rendait
            la course trop chère à confier.
          </p>
          <p>
            La solution n'est pas plus de tableaux Excel. C'est d'afficher le prix d'achat estimé et le tarif de vente dans
            la même interface, au moment de créer la commande d'affrètement. Un décideur ne devrait jamais confirmer un
            affrètement sans connaître la marge.
          </p>
        </div>
      </SiteSection>

      <SiteSection eyebrow="Problème 2" title="La traçabilité des sous-traitants est inexistante">
        <div className="space-y-4 text-sm leading-7 text-[var(--site-text-secondary)] sm:text-base">
          <p>
            Un client appelle pour savoir où est sa livraison. Elle a été confiée à un sous-traitant. L'exploitant ne peut
            que rappeler le chauffeur externe — qui ne répond pas toujours — et espérer avoir une réponse rapide. Ce scénario
            arrive plusieurs fois par semaine dans les exploitations qui gèrent 20&nbsp;% et plus de leur activité en affrètement.
          </p>
          <p>
            Un portail affréteur permet de résoudre ce point sans appel téléphonique&nbsp;: le sous-traitant met à jour le statut
            depuis un accès web sécurisé, dépose le bon de livraison signé et signale les incidents. L'exploitant voit la
            progression dans le même tableau de bord que ses courses propres.
          </p>
          <p>
            Ce ne sont pas deux outils parallèles&nbsp;: c'est une vue unifiée sur toutes les missions, quelle que soit la ressource
            qui les exécute.
          </p>
        </div>
      </SiteSection>

      <SiteSection eyebrow="Problème 3" title="La liasse documentaire de sous-traitance est incomplète">
        <div className="space-y-4 text-sm leading-7 text-[var(--site-text-secondary)] sm:text-base">
          <p>
            CMR, bon de livraison signé, confirmation de commande, facture du sous-traitant&nbsp;: ces documents circulent par
            e-mail, WhatsApp ou courrier et ne sont jamais regroupés au même endroit. En cas de litige avec le donneur d'ordre
            ou de contrôle administratif, reconstituer le dossier prend des heures.
          </p>
          <p>
            Intégrer l'affrètement dans le TMS signifie centraliser automatiquement tous les documents attachés à la commande
            de sous-traitance&nbsp;: l'exploitant voit en un clic ce qui est déposé et ce qui manque. Les rappels automatiques
            sur les pièces manquantes évitent de relancer manuellement chaque sous-traitant en fin de mois.
          </p>
        </div>
      </SiteSection>

      <SiteSection eyebrow="À retenir" title="Ce que l'intégration de l'affrètement apporte concrètement">
        <div className="space-y-4 text-sm leading-7 text-[var(--site-text-secondary)] sm:text-base">
          <p>
            Intégrer la gestion de l'affrètement dans l'<Link to="/erp-transport" className={inlineLinkClassName}>ERP transport</Link> ne
            demande pas de changer de processus. Cela demande de faire entrer les sous-traitants dans le même flux que les
            missions propres&nbsp;: commande liée à l'OT, suivi par portail, documents centralisés, refacturation automatique.
          </p>
          <p>
            Les exploitations qui franchissent ce pas constatent trois effets principaux&nbsp;: moins de temps passé à relancer
            les sous-traitants, meilleure visibilité sur la marge affrètement, et une relation client plus fluide quand le
            suivi de livraison est disponible même en dehors de la flotte propre.
          </p>
        </div>
      </SiteSection>
    </ArticleShell>
  )
}
