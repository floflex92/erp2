import { Link } from 'react-router-dom'
import ArticleShell, { inlineLinkClassName } from '@/site/components/ArticleShell'
import SiteSection from '@/site/components/SiteSection'

export default function TmsTransportDefinitionArticlePage() {
  return (
    <ArticleShell
      title="TMS transport : définition simple et complète"
      description="Définition claire du TMS transport, de son rôle et de sa différence avec un ERP transport."
      canonicalPath="/articles/tms-transport-definition-simple-et-complete"
      keywords="TMS transport, définition TMS transport, ERP transport, logiciel transport, exploitation transport, planning transport"
      readingTime="6 min"
      intro={
        <>
          <p>
            Le terme TMS transport est souvent utilisé de manière floue. Certains y voient un simple outil de planning,
            d’autres une plateforme complète pour piloter tout le transport routier. En réalité, un TMS désigne d’abord un
            système de gestion du transport, centré sur la préparation, l’exécution et le suivi des missions.
          </p>
          <p>
            Cette définition reste utile à condition d’être complétée par une question simple: jusqu’où le TMS va-t-il dans le
            métier ? Lorsqu’il reste isolé, il aide à suivre les opérations mais laisse de côté une partie du quotidien. Quand
            il s’insère dans un <Link to="/erp-transport" className={inlineLinkClassName}>ERP transport</Link>, il devient un
            vrai point d’appui pour l’exploitation transport.
          </p>
          <p>
            Beaucoup de confusions viennent d’un usage marketing du terme TMS transport. Pour un exploitant, la bonne
            définition n’est pas la plus large, mais la plus utile: un système qui simplifie la préparation, sécurise
            l’exécution et rend les décisions plus rapides. Si le TMS ajoute des écrans sans réduire la friction quotidienne,
            il ne remplit pas son rôle.
          </p>
        </>
      }
      relatedLinks={[
        { to: '/tms-transport', title: 'TMS transport', description: 'Page dédiée au TMS transport NEXORA Truck.' },
        { to: '/logiciel-transport', title: 'Logiciel transport', description: 'Comparer la logique TMS avec une vision plus large du logiciel transport.' },
        { to: '/erp-transport', title: 'ERP transport', description: "Voir comment l\u2019ERP \u00e9tend le p\u00e9rim\u00e8tre du TMS." },
        { to: '/telematique-transport', title: 'Télématique transport', description: 'Comprendre comment la télématique complète le TMS.' },
        { to: '/articles/erp-transport-pourquoi-abandonner-excel', title: 'Abandonner Excel', description: 'Relier la définition du TMS aux problèmes de ressaisie.' },
      ]}
    >
      <SiteSection
        eyebrow="Définition"
        title="À quoi sert un TMS transport"
        description="Le TMS aide d’abord à préparer, suivre et sécuriser l’exécution des missions."
      >
        <div className="space-y-4 text-sm leading-7 text-[var(--site-text-secondary)] sm:text-base">
          <p>
            Un TMS transport sert à gérer les ordres de transport, organiser les affectations, suivre les statuts, piloter les
            incidents et conserver une lecture claire de l’exécution. Il aide l’exploitant à savoir ce qui est parti, ce qui
            est en cours, ce qui bloque et ce qui doit être relancé. C’est donc un outil de coordination et de décision.
          </p>
          <p>
            Dans une entreprise de transport, cela couvre généralement la préparation des missions, le{' '}
            <Link to="/planning-intelligent" className={inlineLinkClassName}>
              planning transport
            </Link>
            , le suivi des statuts et la circulation des informations vers les équipes concernées. Le TMS est utile quand il
            raccourcit le temps entre l’événement terrain et la décision d’exploitation.
          </p>
        </div>
      </SiteSection>

      <SiteSection
        eyebrow="Périmètre"
        title="Ce qu’un TMS ne doit pas laisser de côté"
        description="Un TMS utile ne peut pas ignorer la flotte, les contraintes conducteurs ou la continuité jusqu’à la facturation."
      >
        <div className="grid gap-4 md:grid-cols-3">
          <article className="rounded-[1.5rem] border border-slate-200/80 bg-white p-5">
            <h3 className="text-lg font-semibold tracking-tight text-[var(--site-text)]">La flotte</h3>
            <p className="mt-2 text-sm leading-7 text-[var(--site-text-secondary)]">
              Un TMS qui ne voit pas l’état réel des ressources finit par proposer un pilotage incomplet. La disponibilité
              flotte conditionne directement la faisabilité du planning.
            </p>
          </article>
          <article className="rounded-[1.5rem] border border-slate-200/80 bg-white p-5">
            <h3 className="text-lg font-semibold tracking-tight text-[var(--site-text)]">Les contraintes terrain</h3>
            <p className="mt-2 text-sm leading-7 text-[var(--site-text-secondary)]">
              Les heures, les documents, les affectations et les obligations de conformité ne peuvent pas rester hors du
              système si l’objectif est de fiabiliser l’exécution.
            </p>
          </article>
          <article className="rounded-[1.5rem] border border-slate-200/80 bg-white p-5">
            <h3 className="text-lg font-semibold tracking-tight text-[var(--site-text)]">La continuité</h3>
            <p className="mt-2 text-sm leading-7 text-[var(--site-text-secondary)]">
              Une mission ne s’arrête pas à la livraison. Elle doit aussi alimenter la preuve, les contrôles, les coûts et la
              facturation pour rester rentable.
            </p>
          </article>
        </div>
      </SiteSection>

      <SiteSection
        eyebrow="Comparaison"
        title="Différence entre TMS transport et ERP transport"
        description="La différence se lit dans la continuité réelle du travail, pas seulement dans le vocabulaire."
      >
        <div className="space-y-4 text-sm leading-7 text-[var(--site-text-secondary)] sm:text-base">
          <p>
            Le TMS porte le cœur de l’exécution. L’ERP transport élargit ce cœur et relie les autres dimensions du métier:
            ressources, documents, conformité, finance, communication, parfois RH. La frontière n’est donc pas théorique. Elle
            se voit dans le niveau de continuité réellement offert à l’équipe.
          </p>
          <p>
            En pratique, beaucoup de transporteurs commencent par chercher un TMS transport puis réalisent qu’ils ont surtout
            besoin d’un <Link to="/logiciel-transport" className={inlineLinkClassName}>logiciel transport</Link> capable
            d’éviter la dispersion. La distinction doit donc être faite à partir de l’usage quotidien, pas du seul discours
            commercial.
          </p>
        </div>
      </SiteSection>

      <SiteSection
        eyebrow="Diagnostic"
        title="Comment savoir si votre besoin dépasse un simple TMS"
        description="Quelques signaux suffisent à montrer qu’un système plus intégré devient nécessaire."
        muted
      >
        <div className="space-y-4 text-sm leading-7 text-[var(--site-text-secondary)] sm:text-base">
          <p>
            Si votre équipe jongle entre planning, flotte, documents, statuts et facturation, vous êtes déjà au-delà d’un
            besoin de suivi pur. Si les ressaisies se multiplient, si les marges sont difficiles à lire ou si les incidents
            réclament plusieurs validations manuelles, il faut probablement un système plus intégré.
          </p>
          <p>
            Pour approfondir, vous pouvez lire{' '}
            <Link to="/articles/comment-organiser-un-planning-transport-efficacement" className={inlineLinkClassName}>
              l’article sur le planning transport
            </Link>{' '}
            et consulter la{' '}
            <Link to="/fonctionnalites" className={inlineLinkClassName}>
              page fonctionnalités
            </Link>{' '}
            pour relier la théorie au périmètre concret du site public.
          </p>
        </div>
      </SiteSection>

      <SiteSection
        eyebrow="Pratique"
        title="Trois cas concrets pour évaluer un TMS transport"
        description="Les tests en situation réelle sont la meilleure façon de qualifier la pertinence d’un TMS."
      >
        <div className="space-y-4 text-sm leading-7 text-[var(--site-text-secondary)] sm:text-base">
          <h2 className="text-lg font-semibold tracking-tight text-[var(--site-text)]">Cas 1: changement de priorité client</h2>
          <p>
            Lorsque deux missions entrent en conflit de ressources, le TMS doit aider à arbitrer immédiatement: impact
            planning transport, disponibilité flotte, conséquences client. Si l’équipe doit consulter plusieurs sources avant
            de décider, le système reste partiellement déconnecté du réel.
          </p>
          <h3 className="text-lg font-semibold tracking-tight text-[var(--site-text)]">Cas 2: indisponibilité véhicule de dernière minute</h3>
          <p>
            Le TMS doit proposer une réaffectation avec traçabilité, sans dégrader la lisibilité globale de la journée. Ce
            test révèle rapidement si la gestion flotte est intégrée au pilotage opérationnel ou traitée en périphérie.
          </p>
          <h3 className="text-lg font-semibold tracking-tight text-[var(--site-text)]">Cas 3: continuité vers la facturation</h3>
          <p>
            Après exécution, les informations de mission doivent alimenter les étapes aval sans ressaisie lourde. Cette
            continuité distingue un TMS purement transactionnel d’un système réellement utile pour la performance globale.
          </p>
          <p>
            Si ces trois tests montrent des ruptures répétées, votre besoin se rapproche d’un ERP transport plus intégré.
            Vous pouvez alors approfondir avec la page <Link to="/erp-transport" className={inlineLinkClassName}>ERP transport</Link>{' '}
            et l’article <Link to="/articles/erp-transport-pourquoi-abandonner-excel" className={inlineLinkClassName}>sur l’abandon d’Excel</Link>.
          </p>
        </div>
      </SiteSection>
    </ArticleShell>
  )
}
