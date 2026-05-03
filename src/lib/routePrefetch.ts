type RouteImporter = () => Promise<unknown>

const routeImporters: Record<string, RouteImporter> = {
  '/dashboard': () => import('@/pages/Dashboard'),
  '/dashboard-conducteur': () => import('@/pages/DashboardConducteur'),
  '/planning': () => import('@/pages/Planning'),
  '/planning-conducteur': () => import('@/pages/PlanningConducteur'),
  '/transports': () => import('@/pages/Transports'),
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
  '/vehicules': () => import('@/pages/Vehicules'),
  '/remorques': () => import('@/pages/Remorques'),
  '/equipements': () => import('@/pages/Equipements'),
  '/maintenance': () => import('@/pages/Maintenance'),
  '/tachygraphe': () => import('@/pages/Tachygraphe'),
  '/amendes': () => import('@/pages/Amendes'),
  '/entrepots': () => import('@/pages/Entrepots'),
  '/facturation': () => import('@/pages/Facturation'),
  '/reglements': () => import('@/pages/Reglements'),
  '/tresorerie': () => import('@/pages/Tresorerie'),
  '/analytique-transport': () => import('@/pages/AnalytiqueTransport'),
  '/bilan-co2': () => import('@/pages/BilanCo2'),
  '/frais': () => import('@/pages/Frais'),
  '/frais-rapide': () => import('@/pages/FraisRapide'),
  '/paie': () => import('@/pages/Paie'),
  '/clients': () => import('@/pages/Clients'),
  '/prospection': () => import('@/pages/Prospection'),
  '/espace-client': () => import('@/pages/EspaceClient'),
  '/compte-client-db': () => import('@/pages/CompteClientDB'),
  '/espace-affreteur': () => import('@/pages/EspaceAffreteur'),
  '/rh': () => import('@/pages/Rh'),
  '/entretiens-salaries': () => import('@/pages/EntretiensSalaries'),
  '/tchat': () => import('@/pages/Tchat'),
  '/mail': () => import('@/pages/Mail'),
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
