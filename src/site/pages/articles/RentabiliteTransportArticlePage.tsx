import { Link } from 'react-router-dom'
import ArticleShell, { inlineLinkClassName } from '@/site/components/ArticleShell'
import SiteSection from '@/site/components/SiteSection'

export default function RentabiliteTransportArticlePage() {
  return (
    <ArticleShell
      title="Rentabilité transport : méthodes concrètes"
      description="Les leviers concrets pour améliorer la rentabilité transport sans alourdir l’organisation."
      canonicalPath="/articles/comment-ameliorer-la-rentabilite-d-une-entreprise-de-transport"
      keywords="rentabilité entreprise de transport, ERP transport, logiciel transport, exploitation transport, gestion flotte, planning transport"
      readingTime="6 min"
      intro={
        <>
          <p>
            Quand la rentabilité baisse, la première réaction consiste souvent à chercher un problème commercial ou tarifaire.
            Bien sûr, le sujet prix existe. Mais dans beaucoup d’entreprises de transport, une partie importante de la marge se
            perd plus en interne qu’en négociation. Décisions tardives, ressources mal affectées, ressaisies, absence de
            visibilité et défaut de continuité coûtent cher mission après mission.
          </p>
          <p>
            Améliorer la rentabilité ne signifie donc pas seulement vendre plus cher. Cela signifie mieux piloter
            l’exploitation transport. Sur ce point, un{' '}
            <Link to="/erp-transport" className={inlineLinkClassName}>
              ERP transport
            </Link>{' '}
            ou un{' '}
            <Link to="/logiciel-transport" className={inlineLinkClassName}>
              logiciel transport
            </Link>{' '}
            utile agit comme un levier de décision, à condition de relier planning, flotte, statuts et facturation.
          </p>
          <p>
            Les entreprises qui stabilisent leur marge ne sont pas celles qui multiplient les tableaux de bord. Ce sont
            celles qui savent transformer rapidement une information terrain en action opérationnelle. La rentabilité devient
            alors une conséquence directe d’une bonne organisation: moins de ressaisie, moins de corrections tardives, plus de
            cohérence dans les arbitrages.
          </p>
        </>
      }
      relatedLinks={[
        { to: '/erp-transport', title: 'ERP transport', description: 'Voir la page SEO principale sur le pilotage global.' },
        { to: '/articles/comment-organiser-un-planning-transport-efficacement', title: 'Planning transport', description: 'Comprendre le lien entre planning et marge.' },
        { to: '/articles/gestion-de-flotte-poids-lourd-erreurs-courantes', title: 'Gestion flotte', description: 'Relier la disponibilité flotte à la rentabilité.' },
        { to: '/', title: 'Accueil', description: 'Revenir à l’entrée principale du site public.' },
      ]}
    >
      <SiteSection
        eyebrow="Visibilité"
        title="Rendre les coûts visibles au bon moment"
        description="On ne pilote pas une marge qu’on ne voit qu’après clôture."
      >
        <div className="space-y-4 text-sm leading-7 text-[var(--site-text-secondary)] sm:text-base">
          <p>
            Le premier levier de rentabilité consiste à voir les écarts avant qu’ils ne deviennent irréversibles. Si le coût
            d’une mission n’est lisible qu’après facturation, l’entreprise ne pilote pas: elle constate. Il faut au contraire
            repérer rapidement les missions qui se dégradent, les ressources mal utilisées et les réorganisations qui mangent
            la marge.
          </p>
          <p>
            Cela suppose une lecture opérationnelle reliée au réel. Les kilomètres, les statuts, les retards, les
            indisponibilités et les ajustements planning doivent rester visibles dans le même fil que la mission.
          </p>
        </div>
      </SiteSection>

      <SiteSection
        eyebrow="Pertes invisibles"
        title="Réduire ce qui grignote la marge sans bruit"
        description="La rentabilité se dégrade souvent par accumulation de petites pertes mal mesurées."
      >
        <div className="grid gap-4 md:grid-cols-3">
          <article className="rounded-[1.5rem] border border-slate-200/80 bg-white p-5">
            <h3 className="text-lg font-semibold tracking-tight text-[var(--site-text)]">Ressaisie</h3>
            <p className="mt-2 text-sm leading-7 text-[var(--site-text-secondary)]">
              Chaque transfert manuel d’information ajoute du temps sans créer de valeur et augmente le risque d’erreur.
            </p>
          </article>
          <article className="rounded-[1.5rem] border border-slate-200/80 bg-white p-5">
            <h3 className="text-lg font-semibold tracking-tight text-[var(--site-text)]">Arbitrages tardifs</h3>
            <p className="mt-2 text-sm leading-7 text-[var(--site-text-secondary)]">
              Une mission mal priorisée ou une affectation révisée trop tard ont un coût direct sur la qualité de service et la marge.
            </p>
          </article>
          <article className="rounded-[1.5rem] border border-slate-200/80 bg-white p-5">
            <h3 className="text-lg font-semibold tracking-tight text-[var(--site-text)]">Sous-utilisation flotte</h3>
            <p className="mt-2 text-sm leading-7 text-[var(--site-text-secondary)]">
              Une flotte peu lisible, des temps morts cachés ou une mauvaise coordination conducteur-véhicule diminuent la performance.
            </p>
          </article>
        </div>
      </SiteSection>

      <SiteSection
        eyebrow="Pilotage"
        title="Travailler mission par mission"
        description="La rentabilité devient actionnable quand elle est reliée à chaque mission et non à une moyenne trop tardive."
      >
        <div className="space-y-4 text-sm leading-7 text-[var(--site-text-secondary)] sm:text-base">
          <p>
            Cette approche permet d’identifier les schémas récurrents: clients très consommateurs de coordination, tournées
            régulièrement désorganisées, créneaux sous-estimés ou véhicules qui compliquent trop souvent le planning. Un bon
            pilotage ne demande pas des dizaines d’indicateurs. Il demande quelques signaux bien choisis, consultables au même
            endroit que le planning et les statuts.
          </p>
          <p>
            L’article{' '}
            <Link to="/articles/comment-organiser-un-planning-transport-efficacement" className={inlineLinkClassName}>
              sur le planning transport
            </Link>{' '}
            montre d’ailleurs à quel point la qualité du planning influe directement sur la marge.
          </p>
        </div>
      </SiteSection>

      <SiteSection
        eyebrow="Résultat"
        title="Faire de la rentabilité un effet d’organisation"
        description="La marge se stabilise quand l’information circule bien et que les décisions sont prises au bon moment."
        muted
      >
        <div className="space-y-4 text-sm leading-7 text-[var(--site-text-secondary)] sm:text-base">
          <p>
            La rentabilité d’une entreprise de transport ne repose pas seulement sur la vente. Elle repose aussi sur la qualité
            de circulation de l’information, sur la continuité du flux et sur la capacité de l’équipe à arbitrer vite avec des
            données fiables. C’est ce qui permet de stabiliser la marge sans alourdir le quotidien.
          </p>
          <p>
            Pour prolonger la lecture, vous pouvez consulter la{' '}
            <Link to="/fonctionnalites" className={inlineLinkClassName}>
              page des fonctionnalités
            </Link>
            , revenir à la <Link to="/" className={inlineLinkClassName}>homepage</Link> ou lire{' '}
            <Link to="/articles/tms-transport-definition-simple-et-complete" className={inlineLinkClassName}>
              la définition complète du TMS transport
            </Link>{' '}
            pour relier les notions entre elles.
          </p>
        </div>
      </SiteSection>

      <SiteSection
        eyebrow="Méthodes"
        title="Cinq méthodes concrètes à mettre en place"
        description="Des actions applicables immédiatement pour renforcer la rentabilité transport."
      >
        <div className="space-y-4 text-sm leading-7 text-[var(--site-text-secondary)] sm:text-base">
          <h2 className="text-lg font-semibold tracking-tight text-[var(--site-text)]">1. Calculer une marge mission par mission</h2>
          <p>
            Les moyennes masquent souvent les problèmes. En suivant la marge par mission, l’entreprise repère rapidement les
            schémas qui dégradent la performance: surcharge de coordination, créneaux mal calibrés, réaffectations trop
            fréquentes.
          </p>
          <h3 className="text-lg font-semibold tracking-tight text-[var(--site-text)]">2. Sécuriser le planning transport en amont</h3>
          <p>
            Un planning mieux structuré réduit les changements de dernière minute et stabilise les coûts d’exécution. Cette
            méthode est détaillée dans{' '}
            <Link to="/articles/comment-organiser-un-planning-transport-efficacement" className={inlineLinkClassName}>
              l’article dédié au planning transport
            </Link>
            .
          </p>
          <h3 className="text-lg font-semibold tracking-tight text-[var(--site-text)]">3. Relier la gestion flotte à la décision</h3>
          <p>
            Une disponibilité flotte mal anticipée coûte très cher en réorganisation. Rendre ces données visibles au bon
            moment réduit les surcoûts cachés et améliore la fiabilité des engagements.
          </p>
          <h3 className="text-lg font-semibold tracking-tight text-[var(--site-text)]">4. Réduire la ressaisie inter-services</h3>
          <p>
            Chaque ressaisie est une source de délai et d’erreur. La standardisation des statuts et la continuité de données
            entre exploitation et finance apportent un gain direct de productivité.
          </p>
          <h3 className="text-lg font-semibold tracking-tight text-[var(--site-text)]">5. Installer une revue hebdomadaire orientée décisions</h3>
          <p>
            Une revue courte, centrée sur trois à cinq indicateurs utiles, aide à prioriser les améliorations les plus
            rentables. L’objectif n’est pas de produire plus de reporting, mais de prendre de meilleures décisions plus tôt.
          </p>
        </div>
      </SiteSection>
    </ArticleShell>
  )
}
