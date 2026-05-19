import { Navigate, Route } from 'react-router-dom'
import MentionsLegales from '@/pages/MentionsLegales'
import SiteLayout from '@/site/components/SiteLayout'
import AboutPage from '@/site/pages/AboutPage'
import AffretementTransportPage from '@/site/pages/AffretementTransportPage'
import AllFeaturesPage from '@/site/pages/AllFeaturesPage'
import ArticlesPage from '@/site/pages/ArticlesPage'
import ArticlePage from '@/site/pages/articles/ArticlePage'
import ChronotachygraphePage from '@/site/pages/ChronotachygraphePage'
import ContactPage from '@/site/pages/ContactPage'
import ComparatifPage from '@/site/pages/ComparatifPage'
import DemoPage from '@/site/pages/DemoPage'
import ERPLoginPage from '@/site/pages/ERPLoginPage'
import ErpTransportTmsPage from '@/site/pages/ErpTransportTmsPage'
import ErpTransportRoutierPage from '@/site/pages/ErpTransportRoutierPage'
import FacturationTransportPage from '@/site/pages/FacturationTransportPage'
import FeaturesPage from '@/site/pages/FeaturesPage'
import HomePage from '@/site/pages/HomePage'
import IaTransportPage from '@/site/pages/IaTransportPage'
import IntegrationsPage from '@/site/pages/IntegrationsPage'
import LogicielGestionFlotteCamionPage from '@/site/pages/LogicielGestionFlotteCamionPage'
import LogicielTransportPage from '@/site/pages/LogicielTransportPage'
import PlanningIntelligentPage from '@/site/pages/PlanningIntelligentPage'
import PricingPage from '@/site/pages/PricingPage'
import PresentationPage from '@/site/pages/PresentationPage'
import PrivacyPolicyPage from '@/site/pages/PrivacyPolicyPage'
import ProductPage from '@/site/pages/ProductPage'
import RoiPage from '@/site/pages/RoiPage'
import SecteurTransportPage from '@/site/pages/SecteurTransportPage'
import SeoErpTransportPage from '@/site/pages/SeoErpTransportPage'
import SolutionPage from '@/site/pages/SolutionPage'
import TelematiqueTransportPage from '@/site/pages/TelématiqueTransportPage'
import TermsOfUsePage from '@/site/pages/TermsOfUsePage'
import TmsTransportPage from '@/site/pages/TmsTransportPage'
import VersionsPage from '@/site/pages/VersionsPage'

export function getPublicSiteRoutesSsr() {
  return (
    <>
      <Route element={<SiteLayout />}>
        <Route index element={<HomePage />} />
        <Route path="solution" element={<SolutionPage />} />
        <Route path="planning-intelligent" element={<PlanningIntelligentPage />} />
        <Route path="avantages-roi" element={<RoiPage />} />
        <Route path="roi" element={<Navigate to="/avantages-roi" replace />} />
        <Route path="secteur-transport" element={<SecteurTransportPage />} />
        <Route path="a-propos" element={<AboutPage />} />
        <Route path="erp-transport" element={<SeoErpTransportPage />} />
        <Route path="erp-transport-tms" element={<ErpTransportTmsPage />} />
        <Route path="tarifs-erp-transport" element={<PricingPage />} />
        <Route path="comparatif-erp-transport" element={<ComparatifPage />} />
        <Route path="erp" element={<Navigate to="/erp-transport" replace />} />
        <Route path="logiciel-transport" element={<LogicielTransportPage />} />
        <Route path="articles" element={<ArticlesPage />} />
        <Route path="articles/:slug" element={<ArticlePage />} />
        <Route path="demonstration" element={<DemoPage />} />
        <Route path="contact" element={<ContactPage />} />
        <Route path="politique-confidentialite" element={<PrivacyPolicyPage />} />
        <Route path="conditions-generales-utilisation" element={<TermsOfUsePage />} />
        <Route path="connexion-erp" element={<ERPLoginPage />} />
        <Route path="nexora" element={<Navigate to="/" replace />} />
        <Route path="nexora-truck" element={<Navigate to="/" replace />} />
        <Route path="plateforme-erp-transport" element={<ProductPage />} />
        <Route path="produit" element={<Navigate to="/plateforme-erp-transport" replace />} />
        <Route path="fonctionnalites" element={<FeaturesPage />} />
        <Route path="toutes-les-fonctionnalites" element={<AllFeaturesPage />} />
        <Route path="demo" element={<Navigate to="/demonstration" replace />} />
        <Route path="tms-transport" element={<TmsTransportPage />} />
        <Route path="erp-transport-routier" element={<ErpTransportRoutierPage />} />
        <Route path="logiciel-gestion-flotte-camion" element={<LogicielGestionFlotteCamionPage />} />
        <Route path="gestion-flotte" element={<Navigate to="/logiciel-gestion-flotte-camion" replace />} />
        <Route path="telematique-transport" element={<TelematiqueTransportPage />} />
        <Route path="chronotachygraphe" element={<ChronotachygraphePage />} />
        <Route path="ia-transport" element={<IaTransportPage />} />
        <Route path="facturation-transport" element={<FacturationTransportPage />} />
        <Route path="affretement-transport" element={<AffretementTransportPage />} />
        <Route path="integrations" element={<IntegrationsPage />} />
        <Route path="mentions-legales-public" element={<MentionsLegales />} />
        <Route path="presentation" element={<PresentationPage />} />
        <Route path="versions" element={<VersionsPage />} />
      </Route>
    </>
  )
}
