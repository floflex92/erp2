import { Link } from 'react-router-dom'
import ArticleShell, { inlineLinkClassName } from '@/site/components/ArticleShell'
import SiteSection from '@/site/components/SiteSection'

export default function TransportSystemeCoherentArticlePage() {
  return (
    <ArticleShell
      title="Le transport routier ne manque pas de compétences. Il manque d'un système cohérent."
      description="Un exploitant peut gérer 60 conducteurs avec les bons outils. Mais quand ces outils ne communiquent pas, l'information existe sans être exploitable. Ce que change un système unifié."
      canonicalPath="/articles/transport-routier-systeme-coherent"
      keywords="ERP transport, logiciel transport, exploitation transport, système transport unifié, plateforme transport"
      readingTime="6 min"
      intro={
        <>
          <p>
            Aujourd'hui, un exploitant peut gérer 30, 40, parfois 60 conducteurs. Mais avec quels outils ? Un logiciel
            d'exploitation, un outil GPS, une plateforme tachygraphe, des fichiers Excel, des appels et messages en continu.
            Un empilement de solutions, rarement connectées entre elles.
          </p>
          <p>
            Le problème n'est pas un manque de compétences. C'est un problème de structure.{' '}
            <Link to="/erp-transport" className={inlineLinkClassName}>Un ERP transport</Link> unifié change la donne en
            centralisant l'information et en la rendant exploitable pour chaque acteur de l'entreprise.
          </p>
        </>
      }
      relatedLinks={[
        { to: '/erp-transport', title: 'ERP transport', description: 'Comprendre ce que change une plateforme unifiée.' },
        { to: '/logiciel-transport', title: 'Logiciel transport', description: "Comparer les critères d'un outil vraiment opérationnel." },
        { to: '/articles/erp-transport-pourquoi-abandonner-excel', title: 'Pourquoi abandonner Excel', description: "Les limites d'un pilotage fragmenté." },
        { to: '/articles/comment-ameliorer-la-rentabilite-d-une-entreprise-de-transport', title: 'Rentabilité transport', description: 'Relier lisibilité et performance financière.' },
      ]}
    >
      <SiteSection
        eyebrow="Constat"
        title="Une exploitation encore éclatée"
        description="L'information existe. Elle est simplement dispersée entre trop d'interfaces."
      >
        <div className="space-y-4 text-sm leading-7 text-[var(--site-text-secondary)] sm:text-base">
          <p>
            Sur le terrain, la réalité est simple. Un exploitant jongle en permanence entre plusieurs interfaces pour suivre
            ses véhicules, contrôler les temps de conduite, ajuster ses tournées et répondre aux clients. L'information
            existe, mais elle est dispersée.
          </p>
          <p>
            Résultat : perte de temps, erreurs opérationnelles, décisions prises avec une vision partielle. Ce n'est pas un
            problème de volonté. C'est la conséquence directe d'un empilement d'outils non connectés.
          </p>
          <h2 className="text-lg font-semibold tracking-tight text-[var(--site-text)]">Une entreprise qui fonctionne en silos</h2>
          <p>
            Le transport ne se limite pas à l'exploitation. C'est aussi de la prospection, de la gestion client, de la
            facturation, de la comptabilité, du pilotage financier, de la gestion RH, de la maintenance. Prenons des
            situations concrètes : un mécanicien détecte un problème trop tard, faute d'alerte centralisée. Un dirigeant met
            plusieurs heures à comprendre pourquoi une activité n'est pas rentable.
          </p>
          <p>
            Ce ne sont pas des problèmes de compétences. Ce sont des problèmes de structure.
          </p>
        </div>
      </SiteSection>

      <SiteSection
        eyebrow="Direction"
        title="Un manque de lisibilité pour les décideurs"
        description="Piloter avec une vision fragmentée ralentit les décisions et les biaise."
        muted
      >
        <div className="space-y-4 text-sm leading-7 text-[var(--site-text-secondary)] sm:text-base">
          <p>
            Beaucoup de dirigeants pilotent aujourd'hui avec une vision fragmentée. Pour comprendre leur activité, ils doivent
            croiser plusieurs outils, consolider des données manuellement et interpréter des informations parfois incohérentes.
            Résultat : des décisions ralenties, parfois biaisées.
          </p>
          <p>
            Ce qui manque concrètement : des indicateurs fiables, des visuels clairs, une donnée centralisée et exploitable.
            C'est précisément ce qu'apporte un{' '}
            <Link to="/erp-transport" className={inlineLinkClassName}>ERP transport</Link> bien structuré.
          </p>
        </div>
      </SiteSection>

      <SiteSection
        eyebrow="Écosystème"
        title="Ouvrir l'exploitation à tous les acteurs"
        description="Conducteurs, clients, affrétés, mécaniciens — chacun a besoin d'un accès adapté à son rôle."
      >
        <div className="space-y-4 text-sm leading-7 text-[var(--site-text-secondary)] sm:text-base">
          <p>
            Le transport implique plusieurs acteurs : exploitants, conducteurs, clients, affrétés, mécaniciens, fonctions
            support. Aujourd'hui, chacun travaille dans son propre environnement. Demain, chacun devra être connecté au même
            système.
          </p>
          <ul className="space-y-3 pl-4">
            <li>
              <span className="font-semibold text-[var(--site-text)]">Portail conducteur</span> — planning et missions,
              documents de transport, communication structurée, remontée d'informations terrain.
            </li>
            <li>
              <span className="font-semibold text-[var(--site-text)]">Portail client</span> — suivi en temps réel, accès
              aux documents, visibilité sur les opérations.
            </li>
            <li>
              <span className="font-semibold text-[var(--site-text)]">Portail affrété</span> — gestion des missions,
              échanges centralisés, suivi des prestations.
            </li>
            <li>
              <span className="font-semibold text-[var(--site-text)]">Portail mécanicien</span> — suivi des entretiens,
              alertes maintenance, historique véhicule, état de la flotte.
            </li>
          </ul>
          <p>
            Une seule source de vérité, adaptée à chaque rôle.
          </p>
        </div>
      </SiteSection>

      <SiteSection
        eyebrow="Données & API"
        title="Connecter les données plutôt que les multiplier"
        description="GPS, tachygraphe, exploitation : les données clés existent déjà. L'enjeu est de les relier."
        muted
      >
        <div className="space-y-4 text-sm leading-7 text-[var(--site-text-secondary)] sm:text-base">
          <p>
            Un exploitant peut savoir où est un camion sans savoir s'il peut encore rouler légalement. Un dirigeant peut voir
            un chiffre d'affaires sans comprendre sa rentabilité réelle. Les données clés existent mais restent cloisonnées.
          </p>
          <p>
            L'enjeu n'est pas de multiplier les outils. C'est de les connecter intelligemment. Les API permettent de faire
            circuler l'information, synchroniser les données, éliminer les doubles saisies et fiabiliser les flux. On ne
            remplace pas tout. On structure et on unifie.
          </p>
          <h2 className="text-lg font-semibold tracking-tight text-[var(--site-text)]">L'intelligence artificielle comme levier opérationnel</h2>
          <p>
            Avec des données centralisées, l'IA devient concrète. Elle permet d'anticiper les retards et les aléas,
            d'optimiser les plans de transport, d'analyser les performances. Mais aussi d'agir directement : détection des
            excès de vitesse, alertes sur des coupures mal effectuées, identification des dérives opérationnelles. On passe
            d'une exploitation subie à une exploitation pilotée.
          </p>
        </div>
      </SiteSection>

      <SiteSection
        eyebrow="Conclusion"
        title="Vers un modèle unifié et performant"
        description="La question n'est plus de savoir s'il faut évoluer. Mais à quelle vitesse."
      >
        <div className="space-y-4 text-sm leading-7 text-[var(--site-text-secondary)] sm:text-base">
          <p>
            Le modèle qui s'impose est clair : une plateforme unique, des modules connectés, des données centralisées, des
            accès pour chaque acteur, une vision claire pour la direction. Aujourd'hui, l'exploitation fonctionne encore à
            l'énergie humaine. Demain, elle devra fonctionner à l'information.
          </p>
          <p>
            Continuer avec des outils fragmentés, c'est accepter de perdre du temps, de perdre en rentabilité, de limiter sa
            capacité de croissance. À l'inverse, unifier son système permet de mieux décider, mieux anticiper, mieux performer.
          </p>
          <p>
            Nexora Truck s'inscrit dans cette évolution avec une{' '}
            <Link to="/fonctionnalites" className={inlineLinkClassName}>plateforme unifiée</Link>, pensée pour connecter
            l'ensemble des acteurs du transport dans un environnement cohérent, lisible et exploitable.
          </p>
          <p className="rounded-xl border border-sky-100 bg-sky-50 px-5 py-4 text-sky-900">
            Cet article a été publié sur LinkedIn.{' '}
            <a
              href="https://www.linkedin.com/pulse/le-transport-routier-ne-manque-pas-de-comp%C3%A9tences-il-dun-ttdkf"
              target="_blank"
              rel="noopener noreferrer"
              className={inlineLinkClassName}
            >
              Retrouvez-le et suivez NEXORA Truck sur LinkedIn
            </a>{' '}
            pour être notifié des prochaines publications.
          </p>
        </div>
      </SiteSection>
    </ArticleShell>
  )
}
