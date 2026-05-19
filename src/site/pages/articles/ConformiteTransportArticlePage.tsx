import { Link } from 'react-router-dom'
import ArticleShell, { inlineLinkClassName } from '@/site/components/ArticleShell'
import SiteSection from '@/site/components/SiteSection'

export default function ConformiteTransportArticlePage() {
  return (
    <ArticleShell
      title="Conformité transport routier : les 5 obligations que les PME sous-estiment"
      description="Temps de conduite, chronotachygraphe, documents de bord, cabotage : les obligations réglementaires transport routier que les PME oublient jusqu'à l'amende."
      canonicalPath="/articles/conformite-transport-routier-reglementation"
      keywords="conformité transport routier, réglementation transport routier PME, obligations chronotachygraphe, temps de conduite réglementation, contrôle transport routier, ERP conformité transport"
      readingTime="6 min"
      intro={
        <>
          <p>
            Les grandes entreprises de transport ont des équipes dédiées à la conformité réglementaire. Les PME, elles, gèrent
            cela entre deux courses. Le résultat est souvent le même&nbsp;: les obligations sont connues dans leurs grandes lignes,
            mais les détails opérationnels — qui vérifie quoi, quand, comment — ne sont jamais formalisés.
          </p>
          <p>
            Le problème n'est pas la mauvaise volonté. C'est que la conformité dans le transport routier demande un suivi
            continu sur des dizaines de paramètres&nbsp;: temps de conduite, validité des documents, entretien des véhicules,
            règles de cabotage. Sans un <Link to="/erp-transport" className={inlineLinkClassName}>système centralisé</Link>, les
            alertes arrivent trop tard — après l'infraction, pas avant.
          </p>
        </>
      }
      relatedLinks={[
        { to: '/chronotachygraphe', title: 'Chronotachygraphe', description: 'Suivi et conformité chronotachygraphe dans l\'ERP.' },
        { to: '/telematique-transport', title: 'Télématique transport', description: 'Données temps réel pour le suivi des temps de conduite.' },
        { to: '/logiciel-gestion-flotte-camion', title: 'Gestion flotte camion', description: 'Alertes maintenance et documents véhicule.' },
        { to: '/erp-transport', title: 'ERP transport', description: 'Centraliser la conformité dans l\'exploitation.' },
      ]}
    >
      <SiteSection eyebrow="Obligation 1" title="Les temps de conduite et de repos du règlement CE 561/2006">
        <div className="space-y-4 text-sm leading-7 text-[var(--site-text-secondary)] sm:text-base">
          <p>
            Le règlement CE 561/2006 fixe des limites précises&nbsp;: 9 heures de conduite par jour (extensible à 10 heures deux
            fois par semaine), 56 heures par semaine, 90 heures sur deux semaines consécutives. Ces seuils s'appliquent à
            chaque conducteur individuellement, pas à l'entreprise dans son ensemble.
          </p>
          <p>
            En pratique, les dépassements arrivent rarement par mauvaise volonté — ils se produisent lors de congestions
            imprévues, de missions rallongées en dernière minute ou de retour tardif après livraison complexe. Sans alertes
            préventives, l'exploitant ne sait qu'il y a eu dépassement qu'à la lecture du <Link to="/chronotachygraphe" className={inlineLinkClassName}>disque chronotachygraphe</Link>.
          </p>
          <p>
            La solution opérationnelle consiste à surveiller en temps réel le temps de conduite cumulé par conducteur et à
            alerter l'exploitant avant que le seuil soit atteint. C'est possible dès lors que la télématique véhicule est
            connectée au système de dispatch.
          </p>
        </div>
      </SiteSection>

      <SiteSection eyebrow="Obligation 2" title="Le chronotachygraphe numérique&nbsp;: téléchargement et archivage">
        <div className="space-y-4 text-sm leading-7 text-[var(--site-text-secondary)] sm:text-base">
          <p>
            Depuis 2004, les nouvelles immatriculations imposent le chronotachygraphe numérique. Les données conducteur doivent
            être téléchargées au minimum toutes les 28 jours, les données véhicule toutes les 90 jours. Ces données doivent
            être conservées pendant 12 mois.
          </p>
          <p>
            C'est une obligation simple en apparence, mais difficile à tenir sur une flotte de 10 véhicules et plus sans
            automatisation&nbsp;: il faut planifier les téléchargements, vérifier que tous les fichiers sont bien récupérés,
            archiver correctement et produire les données rapidement en cas de contrôle DREAL.
          </p>
          <p>
            Un ERP transport avec module chronotachygraphe intégré automatise les rappels de téléchargement et suit les
            dates de dernière lecture par véhicule et par conducteur. Le contrôleur inopiné trouve les données disponibles
            en moins d'une minute.
          </p>
        </div>
      </SiteSection>

      <SiteSection eyebrow="Obligation 3" title="La liasse documentaire de bord toujours complète">
        <div className="space-y-4 text-sm leading-7 text-[var(--site-text-secondary)] sm:text-base">
          <p>
            Chaque véhicule doit disposer à bord d'une liste de documents précis&nbsp;: attestation de conduite (pour les
            conducteurs ressortissants d'États tiers), lettre de voiture ou CMR en cours, carte verte à jour, papier
            d'immatriculation, disque ou carte conducteur valide. Un document manquant peut entraîner immobilisation et amende.
          </p>
          <p>
            La gestion manuelle de cette liste sur une flotte en rotation permanente est une source fréquente d'oublis.
            La centralisation dans un <Link to="/logiciel-gestion-flotte-camion" className={inlineLinkClassName}>logiciel de gestion de flotte</Link> avec
            alertes d'expiration permet de détecter les documents à renouveler avant la mission, pas pendant le contrôle.
          </p>
        </div>
      </SiteSection>

      <SiteSection eyebrow="Obligations 4 et 5" title="Cabotage et attestation de détachement">
        <div className="space-y-4 text-sm leading-7 text-[var(--site-text-secondary)] sm:text-base">
          <p>
            <strong>Le cabotage</strong> (transport de marchandises entre deux points dans un même pays étranger) est soumis
            à des règles strictes&nbsp;: maximum 3 opérations en 7 jours après un transport international, avec preuve documentaire
            pour chaque opération. La réglementation européenne (Paquet Mobilité I) a renforcé les contrôles depuis 2022.
          </p>
          <p>
            <strong>Le détachement de conducteurs</strong> dans un autre État membre (missions longues ou basées à l'étranger)
            impose une attestation spécifique, normalement produite par l'employeur et disponible à bord. Cette obligation
            touche de nombreuses PME qui assurent des liaisons franco-espagnoles, franco-belges ou franco-allemandes.
          </p>
          <p>
            Ces deux points ne nécessitent pas de compétence juridique interne — ils nécessitent des processus documentaires
            clairs et un outil qui rappelle quand une mission déclenche ces obligations. C'est exactement le type d'alerte
            que peut gérer un <Link to="/erp-transport" className={inlineLinkClassName}>ERP transport</Link> qui connaît
            le type de mission et sa destination.
          </p>
        </div>
      </SiteSection>
    </ArticleShell>
  )
}
