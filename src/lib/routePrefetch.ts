type RouteImporter = () => Promise<unknown>

const routeImporters: Record<string, RouteImporter> = {
  '/dashboard': () => import('@/pages/Dashboard'),
  '/dashboard-conducteur': () => import('@/pages/DashboardConducteur'),
  '/planning': () => import('@/pages/PlanningUnifie'),
  '/transports': () => import('@/pages/TransportsUnifie'),
  '/feuille-route': () => import('@/pages/FeuilleRoute'),
  '/map-live': () => import('@/pages/MapLive'),
  '/ops-center': () => import('@/pages/OpsCenter'),
  '/tasks': () => import('@/pages/Tasks'),
  '/demandes-clients': () => import('@/pages/DemandesClients'),
  '/optimisation-tournees': () => import('@/pages/OptimisationTournees'),
  '/messagerie-colis': () => import('@/pages/MessagerieColis'),
  '/formulaires-terrain': () => import('@/pages/FormulairesTerrain'),
  '/gestion-temperature': () => import('@/pages/GestionTemperature'),
  '/chauffeurs': () => import('@/pages/Chauffeurs'),
  '/vehicules': () => import('@/pages/ParcVehicules'),
  '/remorques': () => import('@/pages/ParcVehicules'),
  '/parc': () => import('@/pages/ParcVehicules'),
  '/equipements': () => import('@/pages/Equipements'),
  '/maintenance': () => import('@/pages/Maintenance'),
  '/tachygraphe': () => import('@/pages/Conformite'),
  '/amendes': () => import('@/pages/Conformite'),
  '/conformite': () => import('@/pages/Conformite'),
  '/entrepots': () => import('@/pages/Entrepots'),
  '/pilotage-depots': () => import('@/pages/PilotageDepots'),
  '/facturation': () => import('@/pages/Facturation'),
  '/reglements': () => import('@/pages/ComptabiliteUnifie'),
  '/tresorerie': () => import('@/pages/ComptabiliteUnifie'),
  '/comptabilite-finance': () => import('@/pages/ComptabiliteUnifie'),
  '/analytique-transport': () => import('@/pages/Analyses'),
  '/bilan-co2': () => import('@/pages/Analyses'),
  '/analyses': () => import('@/pages/Analyses'),
  '/frais': () => import('@/pages/FraisUnifie'),
  '/paie': () => import('@/pages/Paie'),
  '/clients': () => import('@/pages/Clients'),
  '/prospection': () => import('@/pages/Prospection'),
  '/espace-client': () => import('@/pages/Portails'),
  '/portails': () => import('@/pages/Portails'),
  '/compte-client-db': () => import('@/pages/CompteClientDB'),
  '/espace-affreteur': () => import('@/pages/Portails'),
  '/rh': () => import('@/pages/RhUnifie'),
  '/entretiens-salaries': () => import('@/pages/RhUnifie'),
  '/rh-unifie': () => import('@/pages/RhUnifie'),
  '/tchat': () => import('@/pages/MessagerieUnifie'),
  '/mail': () => import('@/pages/MessagerieUnifie'),
  '/messagerie': () => import('@/pages/MessagerieUnifie'),
  '/inter-erp': () => import('@/pages/InterErp'),
  '/communication': () => import('@/pages/Communication'),
  '/coffre': () => import('@/pages/Coffre'),
  '/parametres': () => import('@/pages/Parametres'),
  '/utilisateurs': () => import('@/pages/Utilisateurs'),
  '/tenant-admin': () => import('@/pages/TenantAdminPage'),
  '/super-admin': () => import('@/pages/SuperAdminPage'),
}

const prefetchedRoutes = new Set<string>()

function normalizePath(path: string): string {
  const noQuery = path.split('?')[0] ?? path
  if (!noQuery) return '/'
  if (noQuery === '/') return '/'
  return noQuery.endsWith('/') ? noQuery.slice(0, -1) : noQuery
}

function canPrefetchOnThisConnection() {
  if (typeof navigator === 'undefined') return false
  const connection = (navigator as Navigator & {
    connection?: { saveData?: boolean; effectiveType?: string }
  }).connection

  if (!connection) return true
  if (connection.saveData) return false

  const effectiveType = connection.effectiveType ?? ''
  if (effectiveType.includes('2g')) return false

  return true
}

export function prefetchRouteByPath(path: string): void {
  if (typeof window === 'undefined') return
  if (!canPrefetchOnThisConnection()) return

  const normalized = normalizePath(path)
  const importer = routeImporters[normalized]
  if (!importer) return
  if (prefetchedRoutes.has(normalized)) return

  prefetchedRoutes.add(normalized)
  void importer().catch(() => {
    prefetchedRoutes.delete(normalized)
  })
}

export function prefetchRoutesByPath(paths: string[]): void {
  for (const path of paths) {
    prefetchRouteByPath(path)
  }
}
