import { Navigate, useParams } from 'react-router-dom'
import PlanningTransportArticlePage from '@/site/pages/articles/PlanningTransportArticlePage'
import ErpTransportExcelArticlePage from '@/site/pages/articles/ErpTransportExcelArticlePage'
import TmsTransportDefinitionArticlePage from '@/site/pages/articles/TmsTransportDefinitionArticlePage'
import GestionFlotteArticlePage from '@/site/pages/articles/GestionFlotteArticlePage'
import RentabiliteTransportArticlePage from '@/site/pages/articles/RentabiliteTransportArticlePage'
import KilometresAVideArticlePage from '@/site/pages/articles/KilometresAVideArticlePage'
import OtifTransportArticlePage from '@/site/pages/articles/OtifTransportArticlePage'
import TransportSystemeCoherentArticlePage from '@/site/pages/articles/TransportSystemeCoherentArticlePage'

const articleComponentBySlug = {
  'comment-organiser-un-planning-transport-efficacement': PlanningTransportArticlePage,
  'erp-transport-pourquoi-abandonner-excel': ErpTransportExcelArticlePage,
  'tms-transport-definition-simple-et-complete': TmsTransportDefinitionArticlePage,
  'gestion-de-flotte-poids-lourd-erreurs-courantes': GestionFlotteArticlePage,
  'comment-ameliorer-la-rentabilite-d-une-entreprise-de-transport': RentabiliteTransportArticlePage,
  'reduire-les-kilometres-a-vide-dans-le-transport-routier': KilometresAVideArticlePage,
  'otif-transport-comment-fiabiliser-la-livraison-client': OtifTransportArticlePage,
  'transport-routier-systeme-coherent': TransportSystemeCoherentArticlePage,
} as const

type ArticleSlug = keyof typeof articleComponentBySlug

export default function ArticlePage() {
  const { slug } = useParams<{ slug: string }>()
  const PageComponent = slug ? articleComponentBySlug[slug as ArticleSlug] : undefined

  if (!PageComponent) {
    return <Navigate to="/articles" replace />
  }

  return <PageComponent />
}
