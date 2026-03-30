import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, canAccess, firstPage, useAuth, type Role } from '@/lib/auth'
import { ThemeProvider } from '@/lib/theme'
import RequireAuth from '@/components/layout/RequireAuth'
import AppLayout from '@/components/layout/AppLayout'

const Login = lazy(() => import('@/pages/Login'))
const Dashboard = lazy(() => import('@/pages/Dashboard'))
const Chauffeurs = lazy(() => import('@/pages/Chauffeurs'))
const Vehicules = lazy(() => import('@/pages/Vehicules'))
const Remorques = lazy(() => import('@/pages/Remorques'))
const Equipements = lazy(() => import('@/pages/Equipements'))
const Maintenance = lazy(() => import('@/pages/Maintenance'))
const Transports = lazy(() => import('@/pages/Transports'))
const Clients = lazy(() => import('@/pages/Clients'))
const Facturation = lazy(() => import('@/pages/Facturation'))
const Paie = lazy(() => import('@/pages/Paie'))
const Frais = lazy(() => import('@/pages/Frais'))
const Prospection = lazy(() => import('@/pages/Prospection'))
const Tachygraphe = lazy(() => import('@/pages/Tachygraphe'))
const Amendes = lazy(() => import('@/pages/Amendes'))
const MapLive = lazy(() => import('@/pages/MapLive'))
const Planning = lazy(() => import('@/pages/Planning'))
const FeuilleRoute = lazy(() => import('@/pages/FeuilleRoute'))
const EspaceClient = lazy(() => import('@/pages/EspaceClient'))
const EspaceAffreteur = lazy(() => import('@/pages/EspaceAffreteur'))
const DemandesClients = lazy(() => import('@/pages/DemandesClients'))
const Utilisateurs = lazy(() => import('@/pages/Utilisateurs'))
const Parametres = lazy(() => import('@/pages/Parametres'))
const Rh = lazy(() => import('@/pages/Rh'))
const Tchat = lazy(() => import('@/pages/Tchat'))
const Mail = lazy(() => import('@/pages/Mail'))
const Communication = lazy(() => import('@/pages/Communication'))
const Coffre = lazy(() => import('@/pages/Coffre'))
const MentionsLegales = lazy(() => import('@/pages/MentionsLegales'))
const Tasks = lazy(() => import('@/pages/Tasks'))

function RequireRole({ page, children }: { page: string; children: React.ReactNode }) {
  const { role, loading } = useAuth()
  if (loading) return null
  // Pas encore de rôle (profil en cours de chargement) → on attend sans rediriger
  if (!role) return null
  // Rôle chargé mais pas accès à cette page → rediriger vers la première page accessible
  if (!canAccess(role as Role, page)) return <Navigate to={firstPage(role as Role)} replace />
  return <>{children}</>
}

function RouteFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-[color:var(--primary)] border-t-transparent" />
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
              <Route path="/login" element={<Login />} />
              <Route path="/mentions-legales-public" element={<MentionsLegales />} />
              <Route element={<RequireAuth />}>
                <Route element={<AppLayout />}>
                  <Route index element={<Navigate to="/dashboard" replace />} />
                  <Route path="dashboard"    element={<RequireRole page="dashboard"><Dashboard /></RequireRole>} />
                  <Route path="tasks"        element={<RequireRole page="tasks"><Tasks /></RequireRole>} />
                  <Route path="chauffeurs"   element={<RequireRole page="chauffeurs"><Chauffeurs /></RequireRole>} />
                  <Route path="vehicules"    element={<RequireRole page="vehicules"><Vehicules /></RequireRole>} />
                  <Route path="remorques"    element={<RequireRole page="remorques"><Remorques /></RequireRole>} />
                  <Route path="equipements"  element={<RequireRole page="equipements"><Equipements /></RequireRole>} />
                  <Route path="maintenance"  element={<RequireRole page="maintenance"><Maintenance /></RequireRole>} />
                  <Route path="transports"   element={<RequireRole page="transports"><Transports /></RequireRole>} />
                  <Route path="clients"      element={<RequireRole page="clients"><Clients /></RequireRole>} />
                  <Route path="facturation"  element={<RequireRole page="facturation"><Facturation /></RequireRole>} />
                  <Route path="paie"         element={<RequireRole page="paie"><Paie /></RequireRole>} />
                  <Route path="frais"        element={<RequireRole page="frais"><Frais /></RequireRole>} />
                  <Route path="prospection"  element={<RequireRole page="prospection"><Prospection /></RequireRole>} />
                  <Route path="tachygraphe"  element={<RequireRole page="tachygraphe"><Tachygraphe /></RequireRole>} />
                  <Route path="amendes"      element={<RequireRole page="amendes"><Amendes /></RequireRole>} />
                  <Route path="map-live"     element={<RequireRole page="map-live"><MapLive /></RequireRole>} />
                  <Route path="feuille-route" element={<RequireRole page="feuille-route"><FeuilleRoute /></RequireRole>} />
                  <Route path="planning"     element={<RequireRole page="planning"><Planning /></RequireRole>} />
                  <Route path="espace-client" element={<RequireRole page="espace-client"><EspaceClient /></RequireRole>} />
                  <Route path="espace-affreteur" element={<RequireRole page="espace-affreteur"><EspaceAffreteur /></RequireRole>} />
                  <Route path="demandes-clients" element={<RequireRole page="demandes-clients"><DemandesClients /></RequireRole>} />
                  <Route path="utilisateurs" element={<RequireRole page="utilisateurs"><Utilisateurs /></RequireRole>} />
                  <Route path="rh"           element={<RequireRole page="rh"><Rh /></RequireRole>} />
                  <Route path="parametres"   element={<RequireRole page="parametres"><Parametres /></RequireRole>} />
                  <Route path="communication" element={<RequireRole page="communication"><Communication /></RequireRole>} />
                  <Route path="tchat"        element={<RequireRole page="tchat"><Tchat /></RequireRole>} />
                  <Route path="mail"         element={<RequireRole page="mail"><Mail /></RequireRole>} />
                  <Route path="coffre"       element={<RequireRole page="coffre"><Coffre /></RequireRole>} />
                  <Route path="mentions-legales" element={<RequireRole page="mentions-legales"><MentionsLegales /></RequireRole>} />
                </Route>
              </Route>
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </ThemeProvider>
    </AuthProvider>
  )
}
