import { Navigate, useParams } from 'react-router-dom'
import PlanningTransportArticlePage from '@/site/pages/articles/PlanningTransportArticlePage'
import ErpTransportExcelArticlePage from '@/site/pages/articles/ErpTransportExcelArticlePage'
import TmsTransportDefinitionArticlePage from '@/site/pages/articles/TmsTransportDefinitionArticlePage'
import GestionFlotteArticlePage from '@/site/pages/articles/GestionFlotteArticlePage'
import RentabiliteTransportArticlePage from '@/site/pages/articles/RentabiliteTransportArticlePage'
import KilometresAVideArticlePage from '@/site/pages/articles/KilometresAVideArticlePage'
import OtifTransportArticlePage from '@/site/pages/articles/OtifTransportArticlePage'
import TransportSystemeCoherentArticlePage from '@/site/pages/articles/TransportSystemeCoherentArticlePage'
import FacturationTransportArticlePage from '@/site/pages/articles/FacturationTransportArticlePage'
import AffretementTransportArticlePage from '@/site/pages/articles/AffretementTransportArticlePage'
import CoutsTransportRoutierArticlePage from '@/site/pages/articles/CoutsTransportRoutierArticlePage'
import ConformiteTransportArticlePage from '@/site/pages/articles/ConformiteTransportArticlePage'
import DigitalisationTransportArticlePage from '@/site/pages/articles/DigitalisationTransportArticlePage'

const articleComponentBySlug = {
  'comment-organiser-un-planning-transport-efficacement': PlanningTransportArticlePage,
  'erp-transport-pourquoi-abandonner-excel': ErpTransportExcelArticlePage,
  'tms-transport-definition-simple-et-complete': TmsTransportDefinitionArticlePage,
  'gestion-de-flotte-poids-lourd-erreurs-courantes': GestionFlotteArticlePage,
  'comment-ameliorer-la-rentabilite-d-une-entreprise-de-transport': RentabiliteTransportArticlePage,
  'reduire-les-kilometres-a-vide-dans-le-transport-routier': KilometresAVideArticlePage,
  'otif-transport-comment-fiabiliser-la-livraison-client': OtifTransportArticlePage,
  'transport-routier-systeme-coherent': TransportSystemeCoherentArticlePage,
  'facturation-transport-automatiser': FacturationTransportArticlePage,
  'affretement-transport-sous-traitance': AffretementTransportArticlePage,
  'couts-transport-routier-reduire-optimiser': CoutsTransportRoutierArticlePage,
  'conformite-transport-routier-reglementation': ConformiteTransportArticlePage,
  'digitalisation-transport-routier-2026': DigitalisationTransportArticlePage,
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
