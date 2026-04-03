import { Link } from 'react-router-dom'
import ArticleShell, { inlineLinkClassName } from '@/site/components/ArticleShell'
import SiteSection from '@/site/components/SiteSection'

export default function ErpTransportExcelArticlePage() {
  return (
    <ArticleShell
      title="ERP transport : pourquoi abandonner Excel"
      description="Pourquoi Excel atteint vite ses limites dans le transport routier, et ce qu’un ERP transport change au quotidien."
      canonicalPath="/articles/erp-transport-pourquoi-abandonner-excel"
      keywords="ERP transport, abandonner Excel transport, logiciel transport, TMS transport, exploitation transport, planning transport"
      readingTime="6 min"
      intro={
        <>
          <p>
            Excel rassure parce qu’il est connu, souple et rapide à ouvrir. Dans beaucoup d’entreprises de transport, il a
            servi de point de départ pour organiser le planning, suivre les missions ou consolider quelques indicateurs. Le
            problème apparaît lorsque l’activité gagne en densité. À partir d’un certain volume, le tableur ne structure plus
            l’activité: il la fragilise.
          </p>
          <p>
            Un <Link to="/erp-transport" className={inlineLinkClassName}>ERP transport</Link> n’est pas une version plus jolie
            d’Excel. C’est un cadre de travail qui relie l’ordre de transport, le planning, la flotte, les conducteurs, les
            documents et la facturation. Cette continuité change tout, notamment pour l’exploitation transport qui doit décider
            vite sans perdre la trace.
          </p>
          <p>
            Le débat n’est donc pas outil ancien contre outil moderne. Il s’agit plutôt de savoir si l’organisation peut
            continuer à piloter avec des données non synchronisées. Dès que plusieurs personnes interviennent sur les mêmes
            missions, la logique tableur montre ses limites: versions concurrentes, contrôles manuels, décisions tardives.
            Passer à un ERP transport devient alors une nécessité opérationnelle, pas un projet cosmétique.
          </p>
        </>
      }
      relatedLinks={[
        { to: '/erp-transport', title: 'ERP transport', description: 'Revenir vers la page SEO principale dédiée à l’ERP transport.' },
        { to: '/logiciel-transport', title: 'Logiciel transport', description: 'Comparer la logique ERP avec l’approche logiciel transport.' },
        { to: '/articles/tms-transport-definition-simple-et-complete', title: 'Définition du TMS transport', description: 'Clarifier le rôle exact du TMS dans le flux métier.' },
        { to: '/articles/comment-organiser-un-planning-transport-efficacement', title: 'Planning transport', description: 'Voir comment structurer le pilotage de la journée.' },
      ]}
    >
      <SiteSection
        eyebrow="Limite"
        title="Excel ne travaille pas, il stocke"
        description="Le tableur note des informations, mais ne gère pas naturellement les dépendances métier du transport."
      >
        <div className="space-y-4 text-sm leading-7 text-[var(--site-text-secondary)] sm:text-base">
          <p>
            Un tableur permet de noter, trier et filtrer. En revanche, il ne sait pas qu’un véhicule est indisponible, qu’un
            conducteur approche d’une contrainte, qu’une mission change de statut ou qu’un document manque pour débloquer une
            action. Toutes ces informations doivent être recopiées, vérifiées et interprétées à la main.
          </p>
          <p>
            Cette logique pousse les équipes à multiplier les versions, les onglets et les fichiers parallèles. Très vite, la
            question n’est plus de savoir quoi faire, mais quel fichier dit vrai. À ce stade, Excel cesse d’être un support
            d’organisation et devient une zone de friction.
          </p>
        </div>
      </SiteSection>

      <SiteSection
        eyebrow="Coûts cachés"
        title="Le vrai coût du tableur dans une exploitation transport"
        description="Les pertes visibles ne sont qu’une partie du problème."
      >
        <div className="grid gap-4 md:grid-cols-3">
          <article className="rounded-[1.5rem] border border-slate-200/80 bg-white p-5">
            <h3 className="text-lg font-semibold tracking-tight text-[var(--site-text)]">Ressaisie</h3>
            <p className="mt-2 text-sm leading-7 text-[var(--site-text-secondary)]">
              Chaque transfert entre planning, statuts, documents et facturation ajoute du temps sans créer de valeur. Ce
              temps pèse lourd à l’échelle d’une semaine.
            </p>
          </article>
          <article className="rounded-[1.5rem] border border-slate-200/80 bg-white p-5">
            <h3 className="text-lg font-semibold tracking-tight text-[var(--site-text)]">Décisions tardives</h3>
            <p className="mt-2 text-sm leading-7 text-[var(--site-text-secondary)]">
              Quand l’information n’est pas synchronisée, l’arbitrage arrive après plusieurs vérifications. Dans le transport,
              ce décalage suffit à transformer un incident gérable en retard client.
            </p>
          </article>
          <article className="rounded-[1.5rem] border border-slate-200/80 bg-white p-5">
            <h3 className="text-lg font-semibold tracking-tight text-[var(--site-text)]">Traçabilité faible</h3>
            <p className="mt-2 text-sm leading-7 text-[var(--site-text-secondary)]">
              Qui a modifié quoi, quand, pour quelle mission et avec quel impact ? Sans historique métier, la qualité de
              service et la marge deviennent plus difficiles à piloter.
            </p>
          </article>
        </div>
      </SiteSection>

      <SiteSection
        eyebrow="Effet métier"
        title="Ce qu’un ERP transport apporte concrètement"
        description="Le principal bénéfice n’est pas technologique, il est opérationnel."
      >
        <div className="space-y-4 text-sm leading-7 text-[var(--site-text-secondary)] sm:text-base">
          <p>
            Dans un ERP transport, l’équipe travaille dans le même environnement, avec des statuts partagés, des ressources
            visibles et des transitions claires entre les étapes. Le planning transport cesse d’être un fichier
            centralisateur pour devenir un levier de pilotage. Cette continuité permet aussi de relier la gestion flotte, les
            conducteurs et la facturation, ce qu’un simple outil isolé gère rarement de manière suffisante.
          </p>
          <p>
            En pratique, cela réduit le temps de coordination et améliore la qualité de décision. Si vous souhaitez clarifier
            la frontière entre ERP et TMS, l’article{' '}
            <Link to="/articles/tms-transport-definition-simple-et-complete" className={inlineLinkClassName}>
              TMS transport : définition simple et complète
            </Link>{' '}
            apporte le bon complément.
          </p>
        </div>
      </SiteSection>

      <SiteSection
        eyebrow="Bascule"
        title="Le bon moment pour quitter Excel"
        description="Le seuil n’est pas lié à la taille de flotte, mais au niveau de friction quotidien."
        muted
      >
        <div className="space-y-4 text-sm leading-7 text-[var(--site-text-secondary)] sm:text-base">
          <p>
            Le bon moment arrive dès que le tableur impose plus de coordination qu’il n’en résout. Si plusieurs personnes
            modifient les données, si la journée change souvent, si les marges doivent être suivies mission par mission ou si
            les litiges augmentent, le seuil est déjà franchi.
          </p>
          <p>
            Abandonner Excel ne veut pas dire complexifier le quotidien. Cela veut dire construire un cadre plus fiable pour
            l’exploitation transport. Vous pouvez ensuite poursuivre avec la{' '}
            <Link to="/fonctionnalites" className={inlineLinkClassName}>
              page des fonctionnalités
            </Link>{' '}
            ou revenir à la{' '}
            <Link to="/" className={inlineLinkClassName}>
              homepage
            </Link>{' '}
            pour explorer les pages publiques du site.
          </p>
        </div>
      </SiteSection>

      <SiteSection
        eyebrow="Transition"
        title="Comment sortir d’Excel sans désorganiser l’exploitation"
        description="Une migration réussie se prépare comme un changement de méthode, pas comme un simple transfert de fichiers."
      >
        <div className="space-y-4 text-sm leading-7 text-[var(--site-text-secondary)] sm:text-base">
          <h2 className="text-lg font-semibold tracking-tight text-[var(--site-text)]">Étape 1: cadrer le périmètre utile</h2>
          <p>
            La première étape consiste à définir les flux prioritaires: création d’ordre, affectation, suivi des statuts,
            gestion flotte et passage à la facturation. Ce cadrage évite de reproduire dans le nouvel outil des habitudes de
            ressaisie qui venaient justement d’Excel.
          </p>
          <h3 className="text-lg font-semibold tracking-tight text-[var(--site-text)]">Étape 2: standardiser les règles d’arbitrage</h3>
          <p>
            Les équipes gagnent rapidement en efficacité quand elles partagent des règles communes: priorité client,
            disponibilité ressource, niveau de criticité, mode de réaffectation. Sans cette standardisation, le nouvel outil
            reste sous-utilisé et les pratiques de contournement reviennent.
          </p>
          <h3 className="text-lg font-semibold tracking-tight text-[var(--site-text)]">Étape 3: piloter la transition avec quelques indicateurs</h3>
          <p>
            Suivre la baisse de ressaisie, le temps de coordination et le taux de corrections tardives permet de vérifier que
            la migration produit un gain réel. Ces indicateurs sont plus pertinents qu’un simple ressenti utilisateur.
          </p>
          <p>
            Pour compléter la transition, il est utile de lire{' '}
            <Link to="/articles/comment-organiser-un-planning-transport-efficacement" className={inlineLinkClassName}>
              l’article sur l’organisation du planning transport
            </Link>{' '}
            et la page <Link to="/logiciel-transport" className={inlineLinkClassName}>logiciel transport</Link>.
          </p>
        </div>
      </SiteSection>
    </ArticleShell>
  )
}
