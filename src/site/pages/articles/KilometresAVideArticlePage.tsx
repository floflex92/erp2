import { Link } from 'react-router-dom'
import ArticleShell, { inlineLinkClassName } from '@/site/components/ArticleShell'
import SiteSection from '@/site/components/SiteSection'

export default function KilometresAVideArticlePage() {
  return (
    <ArticleShell
      title="Réduire les kilomètres à vide dans le transport routier"
      description="Méthodes opérationnelles pour limiter les kilomètres à vide et améliorer la marge sans complexifier l’exploitation."
      canonicalPath="/articles/reduire-les-kilometres-a-vide-dans-le-transport-routier"
      keywords="kilomètres à vide transport, rentabilité transport, planning transport, ERP transport, logiciel transport"
      readingTime="7 min"
      intro={
        <>
          <p>
            Les kilomètres à vide représentent une perte directe de marge pour un transporteur. Ils mobilisent du temps
            conducteur, consomment du carburant et augmentent l’usure de la flotte sans revenu associé. Le sujet n’est pas
            uniquement commercial. Côté exploitation, une partie importante du problème vient d’un pilotage trop tardif des
            affectations et des retours.
          </p>
          <p>
            Réduire les kilomètres à vide demande une organisation solide entre planning transport, suivi des opérations et
            gestion flotte. Si ces briques restent séparées, l’exploitant ne voit pas assez tôt les opportunités de
            réaffectation. Avec un cadre plus intégré, comme un <Link to="/erp-transport" className={inlineLinkClassName}>ERP transport</Link>,
            les décisions sont prises au bon moment.
          </p>
        </>
      }
      relatedLinks={[
        { to: '/erp-transport', title: 'ERP transport', description: 'Voir la page SEO principale sur le pilotage global.' },
        { to: '/ia-transport', title: 'IA transport', description: 'Réduire les km à vide par optimisation intelligente des tournées.' },
        { to: '/logiciel-transport', title: 'Logiciel transport', description: 'Comparer les critères d’un outil vraiment opérationnel.' },
        { to: '/articles/comment-organiser-un-planning-transport-efficacement', title: 'Planning transport', description: 'Structurer la journée pour réduire les pertes.' },
        { to: '/articles/comment-ameliorer-la-rentabilite-d-une-entreprise-de-transport', title: 'Rentabilité transport', description: 'Relier les kilomètres à vide à la marge.' },
      ]}
    >
      <SiteSection
        eyebrow="Diagnostic"
        title="Pourquoi les kilomètres à vide augmentent"
        description="Le problème vient rarement d’une seule cause: il s’installe par accumulation de petites décisions."
      >
        <div className="space-y-4 text-sm leading-7 text-[var(--site-text-secondary)] sm:text-base">
          <h2 className="text-lg font-semibold tracking-tight text-[var(--site-text)]">Des retours non anticipés</h2>
          <p>
            Les retours à vide apparaissent souvent quand l’exploitation traite la mission en silo. Le trajet aller est
            optimisé, mais le retour n’est travaillé qu’en fin de cycle, avec moins d’options disponibles. Ce décalage crée
            des kilomètres improductifs qui se répètent quotidiennement.
          </p>
          <h3 className="text-lg font-semibold tracking-tight text-[var(--site-text)]">Un planning trop statique</h3>
          <p>
            Un planning transport figé ne permet pas d’absorber les opportunités de chargement de dernière minute. L’équipe
            hésite à réaffecter, car elle manque de visibilité sur les impacts en cascade. Résultat: un trajet potentiellement
            valorisable reste traité comme un retour à vide.
          </p>
        </div>
      </SiteSection>

      <SiteSection
        eyebrow="Méthode"
        title="Trois leviers concrets pour réduire le vide"
        description="Des actions simples, applicables sans alourdir le quotidien de l’exploitation."
      >
        <div className="space-y-4 text-sm leading-7 text-[var(--site-text-secondary)] sm:text-base">
          <h2 className="text-lg font-semibold tracking-tight text-[var(--site-text)]">1. Travailler la mission aller-retour</h2>
          <p>
            Dès la préparation, la mission doit intégrer un scénario de retour: chargement possible, zone d’attente,
            alternatives réalistes en cas d’aléa. Ce réflexe réduit les décisions d’urgence et augmente la probabilité de
            valoriser le trajet retour.
          </p>
          <h3 className="text-lg font-semibold tracking-tight text-[var(--site-text)]">2. Synchroniser planning et suivi des opérations</h3>
          <p>
            Les statuts terrain doivent alimenter immédiatement le planning. Une mise à jour tardive empêche de saisir une
            opportunité utile. Le lien entre exécution et planning est donc central pour limiter les kilomètres à vide.
          </p>
          <h3 className="text-lg font-semibold tracking-tight text-[var(--site-text)]">3. Piloter par zone et créneau</h3>
          <p>
            Une lecture par zone géographique et par créneau horaire aide à repérer les poches de vide récurrentes.
            L’exploitation peut alors ajuster ses règles d’affectation, négocier des regroupements ou prioriser certains flux.
          </p>
        </div>
      </SiteSection>

      <SiteSection
        eyebrow="Mesure"
        title="Indicateurs à suivre chaque semaine"
        description="Quelques KPI suffisent pour piloter une baisse durable des kilomètres à vide."
        muted
      >
        <div className="space-y-4 text-sm leading-7 text-[var(--site-text-secondary)] sm:text-base">
          <p>
            Suivez le taux de kilomètres à vide, la part des retours valorisés, le délai moyen de réaffectation et l’impact
            sur la marge mission. Ces indicateurs permettent de distinguer les actions utiles des ajustements sans effet.
          </p>
          <p>
            Pour continuer, vous pouvez consulter la page <Link to="/" className={inlineLinkClassName}>homepage</Link>, la
            page <Link to="/fonctionnalites" className={inlineLinkClassName}>fonctionnalités</Link> et l’article
            <Link to="/articles/otif-transport-comment-fiabiliser-la-livraison-client" className={inlineLinkClassName}> OTIF transport</Link>
            pour relier qualité de service et performance opérationnelle.
          </p>
        </div>
      </SiteSection>
    </ArticleShell>
  )
}
