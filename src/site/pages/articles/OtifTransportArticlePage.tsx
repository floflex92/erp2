import { Link } from 'react-router-dom'
import ArticleShell, { inlineLinkClassName } from '@/site/components/ArticleShell'
import SiteSection from '@/site/components/SiteSection'

export default function OtifTransportArticlePage() {
  return (
    <ArticleShell
      title="OTIF transport : comment fiabiliser la livraison client"
      description="Guide pratique pour améliorer l’OTIF transport avec un suivi des opérations fiable et des arbitrages plus rapides."
      canonicalPath="/articles/otif-transport-comment-fiabiliser-la-livraison-client"
      keywords="OTIF transport, suivi livraison transport, qualité de service transport, ERP transport, TMS transport"
      readingTime="7 min"
      intro={
        <>
          <p>
            L’OTIF, pour On Time In Full, mesure la capacité à livrer à l’heure et en totalité. Dans le transport routier,
            cet indicateur est stratégique: il reflète à la fois la qualité de service client et la robustesse de
            l’organisation exploitation. Un OTIF fragile entraîne des litiges, des pénalités et une charge opérationnelle
            supplémentaire.
          </p>
          <p>
            L’amélioration de l’OTIF transport ne dépend pas seulement du terrain. Elle dépend aussi d’un bon maillage entre
            planning, gestion flotte, communication et suivi des opérations. C’est pour cette raison qu’un
            <Link to="/logiciel-transport" className={inlineLinkClassName}> logiciel transport</Link> bien structuré fait une
            différence nette sur la régularité des livraisons.
          </p>
        </>
      }
      relatedLinks={[
        { to: '/erp-transport', title: 'ERP transport', description: 'Approfondir le pilotage complet de l’exploitation.' },
        { to: '/articles/tms-transport-definition-simple-et-complete', title: 'TMS transport', description: 'Clarifier le rôle du TMS dans le suivi d’exécution.' },
        { to: '/articles/reduire-les-kilometres-a-vide-dans-le-transport-routier', title: 'Kilomètres à vide', description: 'Réduire les pertes sans dégrader le service.' },
        { to: '/articles/comment-organiser-un-planning-transport-efficacement', title: 'Planning transport', description: 'Structurer les arbitrages en journée.' },
      ]}
    >
      <SiteSection
        eyebrow="Définition"
        title="Ce que mesure vraiment l’OTIF transport"
        description="L’OTIF ne se limite pas à l’heure d’arrivée: il mesure la fiabilité globale de la promesse client."
      >
        <div className="space-y-4 text-sm leading-7 text-[var(--site-text-secondary)] sm:text-base">
          <h2 className="text-lg font-semibold tracking-tight text-[var(--site-text)]">On Time: respect du créneau convenu</h2>
          <p>
            Le premier volet vérifie l’alignement avec la fenêtre de livraison convenue. Une arrivée trop tardive dégrade le
            service, mais une arrivée trop anticipée peut aussi poser problème selon l’organisation client.
          </p>
          <h3 className="text-lg font-semibold tracking-tight text-[var(--site-text)]">In Full: livraison complète et conforme</h3>
          <p>
            Le second volet valide la complétude de la livraison: quantité, conformité documentaire et absence d’écart critique.
            Une livraison à l’heure mais incomplète ne peut pas être considérée comme OTIF.
          </p>
        </div>
      </SiteSection>

      <SiteSection
        eyebrow="Causes"
        title="Pourquoi l’OTIF se dégrade en exploitation"
        description="Les causes sont souvent connues, mais traitées trop tard."
      >
        <div className="grid gap-4 md:grid-cols-2">
          <article className="rounded-[1.5rem] border border-slate-200/80 bg-white p-5">
            <h3 className="text-lg font-semibold tracking-tight text-[var(--site-text)]">Décisions tardives</h3>
            <p className="mt-2 text-sm leading-7 text-[var(--site-text-secondary)]">
              Quand les alertes remontent tard, l’exploitation subit les incidents au lieu de les anticiper. Les arbitrages
              arrivent trop près de l’échéance client.
            </p>
          </article>
          <article className="rounded-[1.5rem] border border-slate-200/80 bg-white p-5">
            <h3 className="text-lg font-semibold tracking-tight text-[var(--site-text)]">Rupture entre planning et terrain</h3>
            <p className="mt-2 text-sm leading-7 text-[var(--site-text-secondary)]">
              Un planning non synchronisé avec l’exécution produit des engagements fragiles. Les écarts se cumulent jusqu’à la
              livraison finale.
            </p>
          </article>
        </div>
      </SiteSection>

      <SiteSection
        eyebrow="Action"
        title="Plan d’amélioration OTIF en quatre étapes"
        description="Une méthode simple pour fiabiliser rapidement la qualité de service."
      >
        <div className="space-y-4 text-sm leading-7 text-[var(--site-text-secondary)] sm:text-base">
          <h2 className="text-lg font-semibold tracking-tight text-[var(--site-text)]">1. Définir clairement la fenêtre OTIF</h2>
          <p>
            Formalisez la règle par client ou par flux: tolérance horaire, critères de conformité et conditions de validation.
            Sans règle explicite, l’indicateur devient discutable et perd sa valeur de pilotage.
          </p>
          <h3 className="text-lg font-semibold tracking-tight text-[var(--site-text)]">2. Fiabiliser les statuts de mission</h3>
          <p>
            Les statuts doivent être simples et mis à jour en temps utile. Un statut tardif ou ambigu fausse l’analyse OTIF et
            retarde les actions correctives.
          </p>
          <h3 className="text-lg font-semibold tracking-tight text-[var(--site-text)]">3. Traiter les causes récurrentes</h3>
          <p>
            Regroupez les non-OTIF par cause: préparation, affectation, incident flotte, attente client, documentation.
            Priorisez les causes qui pèsent le plus sur le volume total.
          </p>
          <h3 className="text-lg font-semibold tracking-tight text-[var(--site-text)]">4. Boucler hebdomadairement avec l’équipe</h3>
          <p>
            Une revue courte mais régulière améliore l’OTIF plus sûrement qu’une analyse ponctuelle très détaillée. L’enjeu
            est de transformer les constats en décisions opérationnelles.
          </p>
        </div>
      </SiteSection>

      <SiteSection
        eyebrow="Maillage"
        title="Aller plus loin"
        description="Relier OTIF, rentabilité et exploitation pour un pilotage durable."
        muted
      >
        <div className="space-y-4 text-sm leading-7 text-[var(--site-text-secondary)] sm:text-base">
          <p>
            L’OTIF transport progresse quand l’entreprise relie qualité de service et pilotage économique. Une baisse des
            retards améliore l’expérience client, mais réduit aussi les coûts cachés de coordination.
          </p>
          <p>
            Pour compléter cette lecture, consultez l’article
            <Link to="/articles/comment-ameliorer-la-rentabilite-d-une-entreprise-de-transport" className={inlineLinkClassName}> rentabilité transport</Link>,
            la page <Link to="/articles" className={inlineLinkClassName}>articles</Link> et la
            <Link to="/" className={inlineLinkClassName}> homepage</Link>.
          </p>
        </div>
      </SiteSection>
    </ArticleShell>
  )
}
