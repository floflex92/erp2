import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, canAccess, firstPage, useAuth, type Role } from '@/lib/auth'
import { ThemeProvider } from '@/lib/theme'
import ScrollToTop from '@/components/routing/ScrollToTop'
import RequireAuth from '@/components/layout/RequireAuth'
import { getPublicSiteRoutes } from '@/site/publicRoutes'

const AppLayout = lazy(() => import('@/components/layout/AppLayout'))
const MentionsLegales = lazy(() => import('@/pages/MentionsLegales'))
const Login = lazy(() => import('@/pages/Login'))
const Dashboard = lazy(() => import('@/pages/Dashboard'))
const Chauffeurs = lazy(() => import('@/pages/Chauffeurs'))
const Equipements = lazy(() => import('@/pages/Equipements'))
const Maintenance = lazy(() => import('@/pages/Maintenance'))
const Entrepots = lazy(() => import('@/pages/Entrepots'))
const Clients = lazy(() => import('@/pages/Clients'))
const Facturation = lazy(() => import('@/pages/Facturation'))
const Comptabilite = lazy(() => import('@/pages/Comptabilite'))
const Paie = lazy(() => import('@/pages/Paie'))
const Prospection = lazy(() => import('@/pages/Prospection'))
const MapLive = lazy(() => import('@/pages/MapLive'))
const FeuilleRoute = lazy(() => import('@/pages/FeuilleRoute'))
const CompteClientDB = lazy(() => import('@/pages/CompteClientDB'))
const DemandesClients = lazy(() => import('@/pages/DemandesClients'))
const Utilisateurs = lazy(() => import('@/pages/Utilisateurs'))
const Parametres = lazy(() => import('@/pages/Parametres'))
const Communication = lazy(() => import('@/pages/Communication'))
const InterErp = lazy(() => import('@/pages/InterErp'))
const Coffre = lazy(() => import('@/pages/Coffre'))
const Tasks = lazy(() => import('@/pages/Tasks'))
const DemoAccess = lazy(() => import('@/pages/DemoAccess'))
const SessionPickerPage = lazy(() => import('@/pages/SessionPicker'))
const SuperAdmin = lazy(() => import('@/pages/SuperAdminPage'))
const TenantAdmin = lazy(() => import('@/pages/TenantAdminPage'))
const OpsCenter = lazy(() => import('@/pages/OpsCenter'))
const DashboardConducteur = lazy(() => import('@/pages/DashboardConducteur'))
const OptimisationTournees = lazy(() => import('@/pages/OptimisationTournees'))
const MessagerieColis = lazy(() => import('@/pages/MessagerieColis'))
const FormulairesTerrain = lazy(() => import('@/pages/FormulairesTerrain'))
const GestionTemperature = lazy(() => import('@/pages/GestionTemperature'))
const PlanningUnifie = lazy(() => import('@/pages/PlanningUnifie'))
const TransportsUnifie = lazy(() => import('@/pages/TransportsUnifie'))
const Terrain = lazy(() => import('@/pages/Terrain'))
const FraisUnifie = lazy(() => import('@/pages/FraisUnifie'))
const Analyses = lazy(() => import('@/pages/Analyses'))
const ComptabiliteUnifie = lazy(() => import('@/pages/ComptabiliteUnifie'))
const ParcVehicules = lazy(() => import('@/pages/ParcVehicules'))
const Conformite = lazy(() => import('@/pages/Conformite'))
const Portails = lazy(() => import('@/pages/Portails'))
const RhUnifie = lazy(() => import('@/pages/RhUnifie'))
const MessagerieUnifie = lazy(() => import('@/pages/MessagerieUnifie'))
const PlanningAffreteur = lazy(() => import('@/pages/PlanningAffreteur'))
const TerrainUnifie = lazy(() => import('@/pages/TerrainUnifie'))
const OpsCenterUnifie = lazy(() => import('@/pages/OpsCenterUnifie'))

function RequireRole({ page, children }: { page: string; children: React.ReactNode }) {
  const { role, loading, profilLoading, tenantAllowedPages, enabledModules } = useAuth()
  if (loading || profilLoading) return <RouteFallback />
  if (!role) return <RouteFallback />
  if (!canAccess(role as Role, page, tenantAllowedPages, enabledModules)) {
    return <Navigate to={firstPage(role as Role, tenantAllowedPages, enabledModules)} replace />
  }
  return <>{children}</>
}

function RouteFallback() {
  return (
    <div className="flex min-h-screen" style={{ background: 'var(--bg, #f3f4f6)' }}>
      <div
        className="hidden w-56 shrink-0 flex-col gap-3 p-4 lg:flex"
        style={{ background: 'var(--surface-sidebar, #111827)' }}
        aria-hidden="true"
      >
        <div
          className="nx-skeleton mb-4 h-8 w-28 rounded-lg"
          style={{ '--skeleton-base': 'rgba(255,255,255,0.08)', '--skeleton-shine': 'rgba(255,255,255,0.13)' } as React.CSSProperties}
        />
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="nx-skeleton h-7 rounded-lg"
            style={{ width: `${60 + (i % 4) * 8}%`, '--skeleton-base': 'rgba(255,255,255,0.06)', '--skeleton-shine': 'rgba(255,255,255,0.10)' } as React.CSSProperties}
          />
        ))}
      </div>
      <div className="flex flex-1 flex-col gap-0" role="status" aria-label="Chargement en cours">
        <div
          className="flex h-14 items-center gap-4 border-b px-6"
          style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
          aria-hidden="true"
        >
          <div className="nx-skeleton h-6 w-48 rounded-lg" />
          <div className="ml-auto flex items-center gap-3">
            <div className="nx-skeleton h-8 w-8 rounded-full" />
            <div className="nx-skeleton h-6 w-24 rounded-lg" />
          </div>
        </div>
        <div className="flex-1 p-6">
          <div className="nx-skeleton mb-6 h-8 w-56 rounded-xl" />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="rounded-xl border p-5 flex flex-col gap-3"
                style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
                aria-hidden="true"
              >
                <div className="nx-skeleton h-4 w-24 rounded" />
                <div className="nx-skeleton h-8 w-16 rounded" />
                <div className="nx-skeleton h-3 w-32 rounded" />
              </div>
            ))}
          </div>
          <div
            className="mt-4 overflow-hidden rounded-xl border"
            style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
            aria-hidden="true"
          >
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="flex items-center gap-4 border-b px-4 py-3 last:border-0"
                style={{ borderColor: 'var(--border)', background: i % 2 !== 0 ? 'var(--surface-soft)' : 'var(--surface)' }}
              >
                {[35, 20, 18, 15, 12].map((w, j) => (
                  <div key={j} className="nx-skeleton h-3 rounded" style={{ width: `${w}%` }} />
                ))}
              </div>
            ))}
          </div>
        </div>
        <span className="sr-only">Chargement en cours...</span>
      </div>
    </div>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <BrowserRouter>
          <ScrollToTop includeSearch />
          <Suspense fallback={<RouteFallback />}>
            <Routes>
              {getPublicSiteRoutes()}
              <Route path="/login" element={<Login />} />
              <Route element={<RequireAuth />}>
                <Route path="demo-access" element={<DemoAccess />} />
                <Route path="session-picker" element={<SessionPickerPage />} />
                <Route path="platform" element={<RequireRole page="super-admin"><SuperAdmin /></RequireRole>} />
                <Route path="super-admin" element={<Navigate to="/platform" replace />} />
                <Route element={<AppLayout />}>
                  <Route path="dashboard" element={<RequireRole page="dashboard"><Dashboard /></RequireRole>} />
                  <Route path="tasks" element={<RequireRole page="tasks"><Tasks /></RequireRole>} />
                  <Route path="chauffeurs" element={<RequireRole page="chauffeurs"><Chauffeurs /></RequireRole>} />
                  <Route path="vehicules" element={<Navigate to="/parc" replace />} />
                  <Route path="remorques" element={<Navigate to="/parc" replace />} />
                  <Route path="parc" element={<RequireRole page="vehicules"><ParcVehicules /></RequireRole>} />
                  <Route path="remorques" element={<Navigate to="/parc" replace />} />
                  <Route path="equipements" element={<RequireRole page="equipements"><Equipements /></RequireRole>} />
                  <Route path="maintenance" element={<RequireRole page="maintenance"><Maintenance /></RequireRole>} />
                  <Route path="transports" element={<RequireRole page="transports"><TransportsUnifie /></RequireRole>} />
                  <Route path="entrepots" element={<RequireRole page="entrepots"><Entrepots /></RequireRole>} />
                  <Route path="clients" element={<RequireRole page="clients"><Clients /></RequireRole>} />
                  <Route path="facturation" element={<RequireRole page="facturation"><Facturation /></RequireRole>} />
                  <Route path="reglements" element={<Navigate to="/comptabilite-finance" replace />} />
                  <Route path="tresorerie" element={<Navigate to="/comptabilite-finance" replace />} />
                  <Route path="analytique-transport" element={<Navigate to="/analyses" replace />} />
                  <Route path="bilan-co2" element={<Navigate to="/analyses" replace />} />
                  <Route path="comptabilite-finance" element={<RequireRole page="reglements"><ComptabiliteUnifie /></RequireRole>} />
                  <Route path="analyses" element={<RequireRole page="analytique-transport"><Analyses /></RequireRole>} />
                  <Route path="comptabilite" element={<RequireRole page="comptabilite"><Comptabilite /></RequireRole>} />
                  <Route path="paie" element={<RequireRole page="paie"><Paie /></RequireRole>} />
                  <Route path="frais" element={<RequireRole page="frais"><FraisUnifie /></RequireRole>} />
                  <Route path="prospection" element={<RequireRole page="prospection"><Prospection /></RequireRole>} />
                  <Route path="tachygraphe" element={<Navigate to="/conformite" replace />} />
                  <Route path="amendes" element={<Navigate to="/conformite" replace />} />
                  <Route path="conformite" element={<RequireRole page="tachygraphe"><Conformite /></RequireRole>} />
                  <Route path="amendes" element={<Navigate to="/conformite" replace />} />
                  <Route path="map-live" element={<RequireRole page="map-live"><MapLive /></RequireRole>} />
                  <Route path="feuille-route" element={<RequireRole page="feuille-route"><FeuilleRoute /></RequireRole>} />
                  <Route path="terrain" element={<RequireRole page="terrain"><TerrainUnifie /></RequireRole>} />
                  <Route path="planning" element={<RequireRole page="planning"><PlanningUnifie /></RequireRole>} />
                  <Route path="espace-client" element={<Navigate to="/portails" replace />} />
                  <Route path="espace-affreteur" element={<Navigate to="/portails" replace />} />
                  <Route path="portails" element={<RequireRole page="espace-client"><Portails /></RequireRole>} />
                  <Route path="compte-client-db" element={<RequireRole page="compte-client-db"><CompteClientDB /></RequireRole>} />
                  <Route path="espace-affreteur" element={<Navigate to="/portails" replace />} />
                  <Route path="demandes-clients" element={<RequireRole page="demandes-clients"><DemandesClients /></RequireRole>} />
                  <Route path="utilisateurs" element={<RequireRole page="utilisateurs"><Utilisateurs /></RequireRole>} />
                  <Route path="rh" element={<Navigate to="/rh-unifie" replace />} />
                  <Route path="entretiens-salaries" element={<Navigate to="/rh-unifie" replace />} />
                  <Route path="rh-unifie" element={<RequireRole page="rh"><RhUnifie /></RequireRole>} />
                  <Route path="entretiens-salaries" element={<Navigate to="/rh-unifie" replace />} />
                  <Route path="parametres" element={<RequireRole page="parametres"><Parametres /></RequireRole>} />
                  <Route path="communication" element={<RequireRole page="communication"><Communication /></RequireRole>} />
                  <Route path="inter-erp" element={<RequireRole page="inter-erp"><InterErp /></RequireRole>} />
                  <Route path="tchat" element={<Navigate to="/messagerie" replace />} />
                  <Route path="mail" element={<Navigate to="/messagerie" replace />} />
                  <Route path="messagerie" element={<RequireRole page="tchat"><MessagerieUnifie /></RequireRole>} />
                  <Route path="mail" element={<Navigate to="/messagerie" replace />} />
                  <Route path="coffre" element={<RequireRole page="coffre"><Coffre /></RequireRole>} />
                  <Route path="mentions-legales" element={<RequireRole page="mentions-legales"><MentionsLegales /></RequireRole>} />
                  <Route path="tenant-admin" element={<RequireRole page="tenant-admin"><TenantAdmin /></RequireRole>} />
                  <Route path="war-room" element={<Navigate to="/ops-center" replace />} />
                  <Route path="obs-center" element={<Navigate to="/ops-center" replace />} />
                  <Route path="ops-center" element={<RequireRole page="ops-center"><OpsCenterUnifie /></RequireRole>} />
                  <Route path="alertes" element={<Navigate to="/ops-center" replace />} />
                  <Route path="dashboard-conducteur" element={<RequireRole page="dashboard-conducteur"><DashboardConducteur /></RequireRole>} />
                  <Route path="planning-conducteur" element={<Navigate to="/planning" replace />} />
                  <Route path="planning-affreteur" element={<RequireRole page="planning-affreteur"><PlanningAffreteur /></RequireRole>} />
                  <Route path="frais-rapide" element={<Navigate to="/frais" replace />} />
                  <Route path="optimisation-tournees" element={<RequireRole page="optimisation-tournees"><OptimisationTournees /></RequireRole>} />
                  <Route path="messagerie-colis" element={<RequireRole page="messagerie-colis"><MessagerieColis /></RequireRole>} />
                  <Route path="formulaires-terrain" element={<RequireRole page="formulaires-terrain"><FormulairesTerrain /></RequireRole>} />
                  <Route path="gestion-temperature" element={<RequireRole page="gestion-temperature"><GestionTemperature /></RequireRole>} />
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
