import { Link } from 'react-router-dom'
import ArticleShell, { inlineLinkClassName } from '@/site/components/ArticleShell'
import SiteSection from '@/site/components/SiteSection'

export default function FacturationTransportArticlePage() {
  return (
    <ArticleShell
      title="Facturation transport automatisée"
      description="Automatiser la facturation transport ne signifie pas perdre de la rigueur. Voici comment passer de la retranscription manuelle à un flux bout en bout."
      canonicalPath="/articles/facturation-transport-automatiser"
      keywords="facturation transport automatique, automatiser facturation transport routier, logiciel facturation transport, ERP facturation transport, facturation depuis ordre de transport"
      readingTime="5 min"
      intro={
        <>
          <p>
            Dans la plupart des entreprises de transport routier, la facturation est encore assurée par une personne qui lit les bons
            de livraison, vérifie les tarifs dans un classeur, tape les lignes dans le logiciel comptable et envoie le PDF par e-mail.
            Chaque étape prend du temps. Chaque étape est une source d'erreur.
          </p>
          <p>
            Automatiser ce flux ne demande pas un changement radical. Il demande de connecter ce que le transport fait déjà&nbsp;:
            un <Link to="/tms-transport" className={inlineLinkClassName}>TMS</Link> qui clôture les ordres de transport, et un module
            facturation qui lit ces données pour générer les factures. Quand la liaison est directe, le délai entre livraison et facture
            passe de plusieurs jours à quelques minutes.
          </p>
          <p>
            Cet article décrit les étapes, les pièges à éviter et les indicateurs pour vérifier que
            l'<Link to="/facturation-transport" className={inlineLinkClassName}>automatisation de la facturation transport</Link> fonctionne vraiment.
          </p>
        </>
      }
      relatedLinks={[
        { to: '/facturation-transport', title: 'Facturation transport', description: 'Module de facturation intégré à l\'ERP NEXORA Truck.' },
        { to: '/tms-transport', title: 'TMS transport', description: 'Comment le TMS alimente la facturation.' },
        { to: '/erp-transport', title: 'ERP transport', description: 'Vision complète de l\'intégration exploitation-facturation-comptabilité.' },
        { to: '/avantages-roi', title: 'ROI ERP transport', description: 'Mesurer les gains de l\'automatisation.' },
      ]}
    >
      <SiteSection eyebrow="Étape 1" title="Centraliser les tarifs contractuels">
        <div className="space-y-4 text-sm leading-7 text-[var(--site-text-secondary)] sm:text-base">
          <p>
            L'automatisation de la facturation commence par la tarification. Tant que les grilles tarifaires sont éparpillées
            entre des classeurs Excel, des e-mails et des post-its, aucun outil ne peut émettre une facture juste sans vérification manuelle.
          </p>
          <p>
            Un ERP transport centralise les tarifs par client, par type de course, par zone ou par tranche de tonnage. Dès qu'un
            ordre de transport est clôturé, le moteur tarifaire applique les bonnes règles et produit le montant facturable.
            La vérification manuelle disparaît, sauf cas exceptionnel signalé par une alerte.
          </p>
          <p>
            La première semaine de mise en place, reprenez les 20 dernières factures envoyées et comparez-les au montant calculé
            automatiquement. Les écarts révèlent les règles tarifaires mal renseignées ou non encore encodées, et permettent de
            corriger le référentiel avant de passer en production.
          </p>
        </div>
      </SiteSection>

      <SiteSection eyebrow="Étape 2" title="Relier la clôture d'OT au brouillon de facture">
        <div className="space-y-4 text-sm leading-7 text-[var(--site-text-secondary)] sm:text-base">
          <p>
            Une fois les tarifs centralisés, la deuxième étape consiste à déclencher automatiquement la création d'un brouillon
            de facture dès qu'un ordre de transport est clôturé. Ce brouillon contient déjà le client, les lignes, les montants
            et les références de l'OT.
          </p>
          <p>
            Le rôle de la personne en charge de la facturation change&nbsp;: elle ne retranscrit plus, elle valide. Elle traite les
            cas particuliers — un avoir non encore soldé, un tarif exceptionnel accordé oralement — et approuve le reste en batch. En
            pratique, un exploitant qui passait 4 heures par semaine à facturer descend à 45 minutes.
          </p>
          <p>
            L'enjeu de cette étape est la discipline de clôture des OT. Si les exploitants ne clôturent pas systématiquement
            leurs ordres, la chaîne s'interrompt. Il faut donc suivre le taux de clôture en temps réel et intervenir rapidement
            quand des OT restent ouverts sans raison.
          </p>
        </div>
      </SiteSection>

      <SiteSection eyebrow="Étape 3" title="Gérer les avoirs et litiges sans perdre de traçabilité">
        <div className="space-y-4 text-sm leading-7 text-[var(--site-text-secondary)] sm:text-base">
          <p>
            L'automatisation ne supprime pas les litiges. Elle les rend plus traitables. Quand chaque facture est attachée à
            un OT précis — avec son conducteur, son client, son heure de livraison — contester une ligne devient une question
            factuelle plutôt qu'une dispute.
          </p>
          <p>
            Un bon outil de facturation transport permet de créer un avoir directement depuis la facture émise, en gardant
            le lien avec l'OT source. Cela évite de recréer une facture négative manuellement et conserve l'historique complet
            pour les contrôles comptables.
          </p>
          <p>
            Les délais de paiement s'améliorent également&nbsp;: les relances automatiques configurables par délai (J+30, J+45)
            suppriment le suivi manuel et réduisent le besoin de relancer un client par téléphone pour chaque facture impayée.
          </p>
        </div>
      </SiteSection>

      <SiteSection eyebrow="Étape 4" title="Connecter la facturation à la comptabilité">
        <div className="space-y-4 text-sm leading-7 text-[var(--site-text-secondary)] sm:text-base">
          <p>
            La dernière boucle à fermer est l'export vers le logiciel comptable. Sans intégration, la validation d'une facture
            dans le TMS nécessite une nouvelle saisie dans Sage, EBP ou un autre outil. Cette double saisie est la plus grande
            source d'erreurs en aval et absorbe plusieurs heures par semaine pour les exploitations de 10 camions et plus.
          </p>
          <p>
            Un <Link to="/erp-transport" className={inlineLinkClassName}>ERP transport</Link> intégré exporte les écritures dans
            un format paramétré selon votre plan comptable. Les factures validées alimentent directement le journal des ventes.
            Le comptable ou l'expert-comptable ne re-saisit rien&nbsp;: il contrôle et approuve.
          </p>
          <p>
            Cette connexion élimine définitivement le risque d'écart entre le chiffre d'affaires saisi dans le TMS et celui
            enregistré en comptabilité — une source fréquente de discordances lors des clôtures mensuelles.
          </p>
        </div>
      </SiteSection>
    </ArticleShell>
  )
}
