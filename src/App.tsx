import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, canAccess, firstPage, useAuth, type Role } from '@/lib/auth'
import { ThemeProvider } from '@/lib/theme'
import RequireAuth from '@/components/layout/RequireAuth'
import AppLayout from '@/components/layout/AppLayout'
import SiteLayout from '@/site/components/SiteLayout'

const Login = lazy(() => import('@/pages/Login'))
const Dashboard = lazy(() => import('@/pages/Dashboard'))
const Chauffeurs = lazy(() => import('@/pages/Chauffeurs'))
const Vehicules = lazy(() => import('@/pages/Vehicules'))
const Remorques = lazy(() => import('@/pages/Remorques'))
const Equipements = lazy(() => import('@/pages/Equipements'))
const Maintenance = lazy(() => import('@/pages/Maintenance'))
const Transports = lazy(() => import('@/pages/Transports'))
const Entrepots = lazy(() => import('@/pages/Entrepots'))
const Clients = lazy(() => import('@/pages/Clients'))
const Facturation = lazy(() => import('@/pages/Facturation'))
const Reglements = lazy(() => import('@/pages/Reglements'))
const Tresorerie = lazy(() => import('@/pages/Tresorerie'))
const AnalytiqueTransport = lazy(() => import('@/pages/AnalytiqueTransport'))
const Comptabilite = lazy(() => import('@/pages/Comptabilite'))
const Paie = lazy(() => import('@/pages/Paie'))
const Frais = lazy(() => import('@/pages/Frais'))
const Prospection = lazy(() => import('@/pages/Prospection'))
const Tachygraphe = lazy(() => import('@/pages/Tachygraphe'))
const Amendes = lazy(() => import('@/pages/Amendes'))
const MapLive = lazy(() => import('@/pages/MapLive'))
const Planning = lazy(() => import('@/pages/Planning'))
const FeuilleRoute = lazy(() => import('@/pages/FeuilleRoute'))
const EspaceClient = lazy(() => import('@/pages/EspaceClient'))
const CompteClientDB = lazy(() => import('@/pages/CompteClientDB'))
const EspaceAffreteur = lazy(() => import('@/pages/EspaceAffreteur'))
const DemandesClients = lazy(() => import('@/pages/DemandesClients'))
const Utilisateurs = lazy(() => import('@/pages/Utilisateurs'))
const Parametres = lazy(() => import('@/pages/Parametres'))
const Rh = lazy(() => import('@/pages/Rh'))
const EntretiensSalaries = lazy(() => import('@/pages/EntretiensSalaries'))
const Tchat = lazy(() => import('@/pages/Tchat'))
const Mail = lazy(() => import('@/pages/Mail'))
const Communication = lazy(() => import('@/pages/Communication'))
const InterErp = lazy(() => import('@/pages/InterErp'))
const Coffre = lazy(() => import('@/pages/Coffre'))
const MentionsLegales = lazy(() => import('@/pages/MentionsLegales'))
const Tasks = lazy(() => import('@/pages/Tasks'))
const HomePage = lazy(() => import('@/site/pages/HomePage'))
const SolutionPage = lazy(() => import('@/site/pages/SolutionPage'))
const FeaturesPage = lazy(() => import('@/site/pages/FeaturesPage'))
const AllFeaturesPage = lazy(() => import('@/site/pages/AllFeaturesPage'))
const VersionsPage = lazy(() => import('@/site/pages/VersionsPage'))
const PlanningIntelligentPage = lazy(() => import('@/site/pages/PlanningIntelligentPage'))
const RoiPage = lazy(() => import('@/site/pages/RoiPage'))
const SecteurTransportPage = lazy(() => import('@/site/pages/SecteurTransportPage'))
const AboutPage = lazy(() => import('@/site/pages/AboutPage'))
const SeoErpTransportPage = lazy(() => import('@/site/pages/SeoErpTransportPage'))
const TmsTransportPage = lazy(() => import('@/site/pages/TmsTransportPage'))
const ErpTransportRoutierPage = lazy(() => import('@/site/pages/ErpTransportRoutierPage'))
const LogicielGestionFlotteCamionPage = lazy(() => import('@/site/pages/LogicielGestionFlotteCamionPage'))
const TelématiqueTransportPage = lazy(() => import('@/site/pages/TelématiqueTransportPage'))
const ChronotachygraphePage = lazy(() => import('@/site/pages/ChronotachygraphePage'))
const IaTransportPage = lazy(() => import('@/site/pages/IaTransportPage'))
const LogicielTransportPage = lazy(() => import('@/site/pages/LogicielTransportPage'))
const FacturationTransportPage = lazy(() => import('@/site/pages/FacturationTransportPage'))
const AffretementTransportPage = lazy(() => import('@/site/pages/AffretementTransportPage'))
const IntegrationsPage = lazy(() => import('@/site/pages/IntegrationsPage'))
const ArticlesPage = lazy(() => import('@/site/pages/ArticlesPage'))
const ArticlePage = lazy(() => import('@/site/pages/articles/ArticlePage'))
const DemoPage = lazy(() => import('@/site/pages/DemoPage'))
const ContactPage = lazy(() => import('@/site/pages/ContactPage'))
const ERPLoginPage = lazy(() => import('@/site/pages/ERPLoginPage'))
const PrivacyPolicyPage = lazy(() => import('@/site/pages/PrivacyPolicyPage'))
const TermsOfUsePage = lazy(() => import('@/site/pages/TermsOfUsePage'))
const PresentationPage = lazy(() => import('@/site/pages/PresentationPage'))
const DemoAccess = lazy(() => import('@/pages/DemoAccess'))
const SessionPickerPage = lazy(() => import('@/pages/SessionPicker'))
const SuperAdmin = lazy(() => import('@/pages/SuperAdminPage'))
const TenantAdmin = lazy(() => import('@/pages/TenantAdminPage'))
const OpsCenter   = lazy(() => import('@/pages/OpsCenter'))
const DashboardConducteur = lazy(() => import('@/pages/DashboardConducteur'))
const PlanningConducteur = lazy(() => import('@/pages/PlanningConducteur'))
const FraisRapide = lazy(() => import('@/pages/FraisRapide'))

function RequireRole({ page, children }: { page: string; children: React.ReactNode }) {
  const { role, loading, profilLoading, tenantAllowedPages, enabledModules } = useAuth()
  if (loading || profilLoading) return <RouteFallback />
  // Pas encore de rôle (profil en cours de chargement) → on attend sans rediriger
  if (!role) return <RouteFallback />
  // Rôle chargé mais pas accès à cette page → rediriger vers la première page accessible
  if (!canAccess(role as Role, page, tenantAllowedPages, enabledModules)) return <Navigate to={firstPage(role as Role, tenantAllowedPages, enabledModules)} replace />
  return <>{children}</>
}

function RouteFallback() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-slate-950 px-6 text-white">
      <span className="sr-only">Chargement en cours…</span>
      <div className="h-7 w-7 animate-spin rounded-full border-2 border-slate-600 border-t-white" aria-hidden="true" />
    </div>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <BrowserRouter>
          <Suspense fallback={<RouteFallback />}>
            <Routes>
              <Route element={<SiteLayout />}>
                <Route index element={<HomePage />} />
                <Route path="solution" element={<SolutionPage />} />
                <Route path="planning-intelligent" element={<PlanningIntelligentPage />} />
                <Route path="avantages-roi" element={<RoiPage />} />
                <Route path="secteur-transport" element={<SecteurTransportPage />} />
                <Route path="a-propos" element={<AboutPage />} />
                <Route path="erp-transport" element={<SeoErpTransportPage />} />
                <Route path="erp-transport-tms" element={<Navigate to="/erp-transport" replace />} />
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
                <Route path="produit" element={<Navigate to="/solution" replace />} />
                <Route path="fonctionnalites" element={<FeaturesPage />} />
                <Route path="toutes-les-fonctionnalites" element={<AllFeaturesPage />} />
                <Route path="versions" element={<VersionsPage />} />
                <Route path="demo" element={<Navigate to="/demonstration" replace />} />                <Route path="tms-transport" element={<TmsTransportPage />} />
                <Route path="erp-transport-routier" element={<ErpTransportRoutierPage />} />
                <Route path="logiciel-gestion-flotte-camion" element={<LogicielGestionFlotteCamionPage />} />
                <Route path="gestion-flotte" element={<Navigate to="/logiciel-gestion-flotte-camion" replace />} />
                <Route path="telematique-transport" element={<TelématiqueTransportPage />} />
                <Route path="chronotachygraphe" element={<ChronotachygraphePage />} />
                <Route path="ia-transport" element={<IaTransportPage />} />
                <Route path="facturation-transport" element={<FacturationTransportPage />} />
                <Route path="affretement-transport" element={<AffretementTransportPage />} />
                <Route path="integrations" element={<IntegrationsPage />} />
              <Route path="mentions-legales-public" element={<MentionsLegales />} />                <Route path="presentation" element={<PresentationPage />} />              </Route>
              <Route path="/login" element={<Login />} />
              <Route element={<RequireAuth />}>
                <Route path="demo-access" element={<DemoAccess />} />
                <Route path="session-picker" element={<SessionPickerPage />} />
                <Route path="super-admin" element={<RequireRole page="super-admin"><SuperAdmin /></RequireRole>} />
                <Route element={<AppLayout />}>
                  <Route path="dashboard"    element={<RequireRole page="dashboard"><Dashboard /></RequireRole>} />
                  <Route path="tasks"        element={<RequireRole page="tasks"><Tasks /></RequireRole>} />
                  <Route path="chauffeurs"   element={<RequireRole page="chauffeurs"><Chauffeurs /></RequireRole>} />
                  <Route path="vehicules"    element={<RequireRole page="vehicules"><Vehicules /></RequireRole>} />
                  <Route path="remorques"    element={<RequireRole page="remorques"><Remorques /></RequireRole>} />
                  <Route path="equipements"  element={<RequireRole page="equipements"><Equipements /></RequireRole>} />
                  <Route path="maintenance"  element={<RequireRole page="maintenance"><Maintenance /></RequireRole>} />
                  <Route path="transports"   element={<RequireRole page="transports"><Transports /></RequireRole>} />
                  <Route path="entrepots"    element={<RequireRole page="entrepots"><Entrepots /></RequireRole>} />
                  <Route path="clients"      element={<RequireRole page="clients"><Clients /></RequireRole>} />
                  <Route path="facturation"  element={<RequireRole page="facturation"><Facturation /></RequireRole>} />
                  <Route path="reglements"   element={<RequireRole page="reglements"><Reglements /></RequireRole>} />
                  <Route path="tresorerie"   element={<RequireRole page="tresorerie"><Tresorerie /></RequireRole>} />
                  <Route path="analytique-transport" element={<RequireRole page="analytique-transport"><AnalytiqueTransport /></RequireRole>} />
                  <Route path="comptabilite" element={<RequireRole page="comptabilite"><Comptabilite /></RequireRole>} />
                  <Route path="paie"         element={<RequireRole page="paie"><Paie /></RequireRole>} />
                  <Route path="frais"        element={<RequireRole page="frais"><Frais /></RequireRole>} />
                  <Route path="prospection"  element={<RequireRole page="prospection"><Prospection /></RequireRole>} />
                  <Route path="tachygraphe"  element={<RequireRole page="tachygraphe"><Tachygraphe /></RequireRole>} />
                  <Route path="amendes"      element={<RequireRole page="amendes"><Amendes /></RequireRole>} />
                  <Route path="map-live"     element={<RequireRole page="map-live"><MapLive /></RequireRole>} />
                  <Route path="feuille-route" element={<RequireRole page="feuille-route"><FeuilleRoute /></RequireRole>} />
                  <Route path="planning"     element={<RequireRole page="planning"><Planning /></RequireRole>} />
                  <Route path="espace-client" element={<RequireRole page="espace-client"><EspaceClient /></RequireRole>} />
                  <Route path="compte-client-db" element={<RequireRole page="compte-client-db"><CompteClientDB /></RequireRole>} />
                  <Route path="espace-affreteur" element={<RequireRole page="espace-affreteur"><EspaceAffreteur /></RequireRole>} />
                  <Route path="demandes-clients" element={<RequireRole page="demandes-clients"><DemandesClients /></RequireRole>} />
                  <Route path="utilisateurs" element={<RequireRole page="utilisateurs"><Utilisateurs /></RequireRole>} />
                  <Route path="rh"           element={<RequireRole page="rh"><Rh /></RequireRole>} />
                  <Route path="entretiens-salaries" element={<RequireRole page="entretiens-salaries"><EntretiensSalaries /></RequireRole>} />
                  <Route path="parametres"   element={<RequireRole page="parametres"><Parametres /></RequireRole>} />
                  <Route path="communication" element={<RequireRole page="communication"><Communication /></RequireRole>} />
                  <Route path="inter-erp" element={<RequireRole page="inter-erp"><InterErp /></RequireRole>} />
                  <Route path="tchat"        element={<RequireRole page="tchat"><Tchat /></RequireRole>} />
                  <Route path="mail"         element={<RequireRole page="mail"><Mail /></RequireRole>} />
                  <Route path="coffre"       element={<RequireRole page="coffre"><Coffre /></RequireRole>} />
                  <Route path="mentions-legales" element={<RequireRole page="mentions-legales"><MentionsLegales /></RequireRole>} />
                  <Route path="tenant-admin"    element={<RequireRole page="tenant-admin"><TenantAdmin /></RequireRole>} />
                  <Route path="war-room"        element={<Navigate to="/ops-center" replace />} />
                  <Route path="ops-center"       element={<RequireRole page="ops-center"><OpsCenter /></RequireRole>} />
                  <Route path="dashboard-conducteur" element={<RequireRole page="dashboard-conducteur"><DashboardConducteur /></RequireRole>} />
                  <Route path="planning-conducteur" element={<RequireRole page="planning-conducteur"><PlanningConducteur /></RequireRole>} />
                  <Route path="frais-rapide" element={<RequireRole page="frais-rapide"><FraisRapide /></RequireRole>} />
                </Route>
              </Route>
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </ThemeProvider>
    </AuthProvider>
  )
}
