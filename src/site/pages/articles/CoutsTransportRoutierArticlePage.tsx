import { Link } from 'react-router-dom'
import ArticleShell, { inlineLinkClassName } from '@/site/components/ArticleShell'
import SiteSection from '@/site/components/SiteSection'

export default function CoutsTransportRoutierArticlePage() {
  return (
    <ArticleShell
      title="Coûts transport routier : 10 leviers pour réduire sans dégrader le service"
      description="Réduire les coûts d'une entreprise de transport routier ne passe pas par moins de personnel. Voici 10 leviers concrets avec leurs impacts réels."
      canonicalPath="/articles/couts-transport-routier-reduire-optimiser"
      keywords="coûts transport routier, réduire coûts transport, optimisation coûts transport routier, charges transport routier, gestion coûts flotte, rentabilité transport"
      readingTime="7 min"
      intro={
        <>
          <p>
            Les coûts d'une entreprise de transport routier se répartissent de manière prévisible&nbsp;: carburant (30 à 35&nbsp;%),
            personnel (35 à 40&nbsp;%), véhicules et amortissements (15&nbsp;%), frais généraux (10&nbsp;%). Mais cette répartition ne dit
            pas où se trouvent les marges de manœuvre.
          </p>
          <p>
            Certains transporteurs cherchent à réduire les charges salariales ou à comprimer les marges fournisseurs. Ces
            leviers sont limités et risqués. Les vrais leviers sont opérationnels&nbsp;: ils touchent à l'organisation, à la
            prise de décision et à la fluidité du flux d'information entre l'exploitation, les chauffeurs et les clients.
            Un <Link to="/erp-transport" className={inlineLinkClassName}>ERP transport</Link> bien déployé agit sur plusieurs de
            ces leviers simultanément.
          </p>
        </>
      }
      relatedLinks={[
        { to: '/avantages-roi', title: 'ROI ERP transport', description: 'Quantifier les gains d\'une modernisation de l\'outil de gestion.' },
        { to: '/logiciel-gestion-flotte-camion', title: 'Gestion flotte camion', description: 'Réduire les coûts de maintenance et d\'immobilisation.' },
        { to: '/telematique-transport', title: 'Télématique transport', description: 'Optimiser la consommation de carburant et les tournées.' },
        { to: '/articles/reduire-les-kilometres-a-vide-dans-le-transport-routier', title: 'Kilomètres à vide', description: 'Levier majeur sur la marge de l\'exploitation.' },
        { to: '/articles/comment-ameliorer-la-rentabilite-d-une-entreprise-de-transport', title: 'Rentabilité transport', description: 'Vue d\'ensemble des méthodes d\'amélioration de la marge.' },
      ]}
    >
      <SiteSection eyebrow="Leviers coûts directs" title="Réduire sans toucher à l'humain">
        <div className="space-y-4 text-sm leading-7 text-[var(--site-text-secondary)] sm:text-base">
          <p>
            <strong>1. Réduire les kilomètres à vide.</strong> Un ratio kilométrique à vide supérieur à 20&nbsp;% signale une
            organisation de tournées à retravailler. Il est le premier levier à activer&nbsp;: chaque point de moins représente
            un gain direct sur le carburant, l'usure et le temps conducteur. Le taux de km à vide se pilote avec un outil
            de <Link to="/tms-transport" className={inlineLinkClassName}>dispatch intégré</Link> qui visualise les retours à vide
            et propose des groupages automatiques.
          </p>
          <p>
            <strong>2. Anticiper les immobilisations véhicule.</strong> Une révision non planifiée coûte deux à trois fois
            plus cher qu'une maintenance préventive programmée. La maintenance prédictive, basée sur les données
            kilométriques et les alertes <Link to="/telematique-transport" className={inlineLinkClassName}>télématique</Link>,
            réduit les pannes routières et les frais de dépannage imprévus.
          </p>
          <p>
            <strong>3. Optimiser la consommation de carburant.</strong> L'éco-conduite n'est pas donnée une fois pour toutes.
            Elle se mesure par conducteur, par tournée, par tracteur. Les tableaux de bord télématiques identifient les profils
            de conduite énergivores et permettent des formations ciblées. Un gain de 5&nbsp;% sur la consommation d'une flotte
            de 20 camions représente plusieurs dizaines de milliers d'euros annuels.
          </p>
        </div>
      </SiteSection>

      <SiteSection eyebrow="Leviers d'organisation" title="Gagner du temps = gagner de l'argent">
        <div className="space-y-4 text-sm leading-7 text-[var(--site-text-secondary)] sm:text-base">
          <p>
            <strong>4. Éliminer les doubles saisies.</strong> Chaque information saisie deux fois coûte du temps et produit
            des erreurs. L'exploitant qui retranscrit un ordre client dans le TMS, puis re-saisit les données dans le logiciel
            de facturation, puis recopie les montants en comptabilité perd 3 à 5 heures par semaine sur cette seule tâche,
            souvent sans s'en rendre compte.
          </p>
          <p>
            <strong>5. Réduire le temps de facturation.</strong> Plus la facture est émise tôt, plus le délai de paiement est
            court. Automatiser la <Link to="/facturation-transport" className={inlineLinkClassName}>facturation transport</Link> depuis
            la clôture d'OT réduit l'encours client et améliore la trésorerie sans toucher aux conditions de règlement.
          </p>
          <p>
            <strong>6. Centraliser les communications chauffeurs.</strong> Les appels téléphoniques entre exploitation et
            chauffeurs sont difficiles à mesurer mais représentent une charge réelle. Un outil de messagerie intégré
            ou d'application chauffeur réduit le nombre d'appels et garde une trace des échanges opérationnels.
          </p>
        </div>
      </SiteSection>

      <SiteSection eyebrow="Leviers réglementaires" title="Sécuriser les coûts liés à la conformité">
        <div className="space-y-4 text-sm leading-7 text-[var(--site-text-secondary)] sm:text-base">
          <p>
            <strong>7. Maîtriser le chronotachygraphe.</strong> Les infractions aux temps de conduite génèrent des amendes et
            des immobilisations administratives. Le <Link to="/chronotachygraphe" className={inlineLinkClassName}>suivi chronotachygraphe</Link> intégré
            à l'ERP alerte avant le dépassement, pas après. Le coût d'une amende évitée dépasse souvent le coût annuel de l'outil.
          </p>
          <p>
            <strong>8. Anticiper les renouvellements de documents.</strong> Carte conducteur expirée, visite technique hors
            délai, assurance à renouveler&nbsp;: chaque expiration non anticipée provoque une immobilisation. Un système de
            rappels automatiques liés aux données véhicule et conducteur supprime ces incidents prévisibles.
          </p>
          <p>
            <strong>9. Piloter les amendes et frais de peacetime.</strong> Les amendes de stationnement, les péages non
            optimisés et les contrats de location mal suivis s'accumulent discrètement. Un tableau de bord des coûts par
            véhicule révèle les postes anormaux et permet d'agir avant que la dérive soit significative.
          </p>
        </div>
      </SiteSection>

      <SiteSection eyebrow="Levier système" title="Le ratio coût/complexité de la modernisation">
        <div className="space-y-4 text-sm leading-7 text-[var(--site-text-secondary)] sm:text-base">
          <p>
            <strong>10. Consolider les outils.</strong> Une entreprise de transport qui utilise 4 à 7 logiciels différents
            (planning, facturation, comptabilité, télématique, CHRONO, véhicules, RH) paye des abonnements multiples,
            gère des interfaces et forme ses équipes sur des interfaces différentes. Consolider sur un <Link to="/erp-transport" className={inlineLinkClassName}>ERP transport</Link> intégré
            réduit le coût total des systèmes de 20 à 40&nbsp;% tout en améliorant la qualité des données.
          </p>
          <p>
            Ce dernier levier est souvent le plus rentable, mais aussi le plus mal mesuré. Le coût du statu quo — perte de
            temps, erreurs, décisions prises sans données — ne figure dans aucune ligne du compte de résultat, ce qui le rend
            invisible jusqu'à ce qu'un concurrent ait pris de l'avance.
          </p>
        </div>
      </SiteSection>
    </ArticleShell>
  )
}
