import { lazy } from 'react'
import { Navigate, Route } from 'react-router-dom'
// SiteLayout et HomePage: lazy pour réduire l'entry bundle (~127KB → ~56KB)
// Les modulepreload hints injectés dans dist/index.html les pré-téléchargent
// en parallèle de l'entry, éliminant la cascade sans gonfler le bundle critique.
const SiteLayout = lazy(() => import('@/site/components/SiteLayout'))
const HomePage = lazy(() => import('@/site/pages/HomePage'))

const MentionsLegales = lazy(() => import('@/pages/MentionsLegales'))

const AboutPage = lazy(() => import('@/site/pages/AboutPage'))
const AffretementTransportPage = lazy(() => import('@/site/pages/AffretementTransportPage'))
const AllFeaturesPage = lazy(() => import('@/site/pages/AllFeaturesPage'))
const ArticlesPage = lazy(() => import('@/site/pages/ArticlesPage'))
const ArticlePage = lazy(() => import('@/site/pages/articles/ArticlePage'))
const ChronotachygraphePage = lazy(() => import('@/site/pages/ChronotachygraphePage'))
const ContactPage = lazy(() => import('@/site/pages/ContactPage'))
const ComparatifPage = lazy(() => import('@/site/pages/ComparatifPage'))
const DemoPage = lazy(() => import('@/site/pages/DemoPage'))
const ERPLoginPage = lazy(() => import('@/site/pages/ERPLoginPage'))
const ErpTransportTmsPage = lazy(() => import('@/site/pages/ErpTransportTmsPage'))
const ErpTransportRoutierPage = lazy(() => import('@/site/pages/ErpTransportRoutierPage'))
const FacturationTransportPage = lazy(() => import('@/site/pages/FacturationTransportPage'))
const FeaturesPage = lazy(() => import('@/site/pages/FeaturesPage'))
const IaTransportPage = lazy(() => import('@/site/pages/IaTransportPage'))
const IntegrationsPage = lazy(() => import('@/site/pages/IntegrationsPage'))
const LogicielGestionFlotteCamionPage = lazy(() => import('@/site/pages/LogicielGestionFlotteCamionPage'))
const LogicielTransportPage = lazy(() => import('@/site/pages/LogicielTransportPage'))
const PlanningIntelligentPage = lazy(() => import('@/site/pages/PlanningIntelligentPage'))
const PricingPage = lazy(() => import('@/site/pages/PricingPage'))
const PresentationPage = lazy(() => import('@/site/pages/PresentationPage'))
const PrivacyPolicyPage = lazy(() => import('@/site/pages/PrivacyPolicyPage'))
const ProductPage = lazy(() => import('@/site/pages/ProductPage'))
const RoiPage = lazy(() => import('@/site/pages/RoiPage'))
const SecteurTransportPage = lazy(() => import('@/site/pages/SecteurTransportPage'))
const SeoErpTransportPage = lazy(() => import('@/site/pages/SeoErpTransportPage'))
const SolutionPage = lazy(() => import('@/site/pages/SolutionPage'))
const TelematiqueTransportPage = lazy(() => import('@/site/pages/TelématiqueTransportPage'))
const TermsOfUsePage = lazy(() => import('@/site/pages/TermsOfUsePage'))
const TmsTransportPage = lazy(() => import('@/site/pages/TmsTransportPage'))
const VersionsPage = lazy(() => import('@/site/pages/VersionsPage'))

export function getPublicSiteRoutes() {
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
