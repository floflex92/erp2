import { useEffect, useRef, useState } from 'react'
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom'
import Sidebar from './Sidebar'
import ImpersonationBanner from './ImpersonationBanner'
import { canAccess, useAuth } from '@/lib/auth'
import { useTheme } from '@/lib/theme'

const PLANNING_HEADER_COLLAPSED_KEY = 'nexora_planning_header_collapsed_v1'

const PAGE_TITLES: Record<string, string> = {
  '/dashboard': 'Tableau de bord',
  '/dashboard-conducteur': 'Mon tableau de bord',
  '/planning-conducteur': 'Mon planning',
  '/frais-rapide': 'Saisie frais rapide',
  '/tachygraphe': 'Chronotachygraphe',
  '/amendes': 'PV & Amendes',
  '/map-live': 'Map live',
  '/war-room': 'War Room — Surveillance',
  '/ops-center': 'Ops Center',
  '/alertes': 'Ops Center',
  '/feuille-route': 'Feuille de route',
  '/planning': 'Planning',
  '/demandes-clients': 'Demandes clients',
  '/espace-client': 'Espace client',
  '/compte-client-db': 'Compte client DB',
  '/espace-affreteur': 'Espace affreteur',
  '/transports': 'Ordres de transport',
  '/entrepots': 'Entrepots & Depots',
  '/chauffeurs': 'Conducteurs',
  '/rh': 'Ressources humaines',
  '/entretiens-salaries': 'Entretiens salaries',
  '/vehicules': 'Camions',
  '/remorques': 'Remorques',
  '/equipements': 'Equipements',
  '/maintenance': 'Atelier',
  '/tasks': 'Taches',
  '/clients': 'Clients',
  '/facturation': 'Facturation',
  '/reglements': 'Reglements & Recouvrement',
  '/tresorerie': 'Tresorerie',
  '/analytique-transport': 'Analytique Transport',
  '/bilan-co2': 'Bilan CO₂ Transport',
  '/comptabilite': 'Etats legaux',
  '/paie': 'Paie',
  '/frais': 'Frais',
  '/prospection': 'Prospection',
  '/parametres': 'Reglages',
  '/utilisateurs': 'Comptes et acces',
  '/communication': 'Communication',
  '/inter-erp': 'Connectivite inter-ERP',
  '/mail': 'Mail',
  '/coffre': 'Coffre numerique',
  '/mentions-legales': 'Mentions legales',
}

function PlusIcon() {
  return <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M12 5v14M5 12h14" /></svg>
}
function SearchIcon() {
  return <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
}

// Action rapide contextuelle selon le rôle actif
const ROLE_QUICK_ACTION: Record<string, { label: string; to: string; onlyOnPage?: string }> = {
  exploitant:     { label: 'Créer un OT',         to: '/transports', onlyOnPage: '/planning' },
  admin:          { label: 'Créer un OT',         to: '/transports', onlyOnPage: '/planning' },
  super_admin:    { label: 'Créer un OT',         to: '/transports', onlyOnPage: '/planning' },
  dirigeant:      { label: 'Créer un OT',         to: '/transports', onlyOnPage: '/planning' },
  conducteur:     { label: 'Saisir un frais',     to: '/frais-rapide' },
  conducteur_affreteur: { label: 'Saisir un frais', to: '/frais-rapide' },
  commercial:     { label: 'Nouveau prospect',    to: '/prospection' },
  comptable:      { label: 'Nouvelle facture',    to: '/facturation' },
  facturation:    { label: 'Nouvelle facture',    to: '/facturation' },
  administratif:  { label: 'Nouvelle facture',    to: '/facturation' },
  mecanicien:     { label: 'Nouvelle intervention', to: '/maintenance' },
  maintenance:    { label: 'Nouvelle intervention', to: '/maintenance' },
  flotte:         { label: 'Voir les camions',    to: '/vehicules' },
  rh:             { label: 'Fiche conducteur',    to: '/chauffeurs' },
  logisticien:    { label: 'Voir entrepôts',      to: '/entrepots' },
}

const ROLE_FOCUS_ACTIONS: Record<string, Array<{ label: string; to: string }>> = {
  exploitant: [
    { label: 'Planning', to: '/planning' },
    { label: 'Creer un OT', to: '/transports' },
    { label: 'Ops Center', to: '/ops-center' },
  ],
  dirigeant: [
    { label: 'Dashboard', to: '/dashboard' },
    { label: 'Analytique', to: '/analytique-transport' },
    { label: 'Tresorerie', to: '/tresorerie' },
  ],
  conducteur: [
    { label: 'Mon planning', to: '/planning-conducteur' },
    { label: 'Feuille de route', to: '/feuille-route' },
    { label: 'Saisie frais', to: '/frais-rapide' },
  ],
  affreteur: [
    { label: 'Espace affreteur', to: '/espace-affreteur' },
    { label: 'Planning', to: '/planning' },
    { label: 'Map live', to: '/map-live' },
  ],
  client: [
    { label: 'Espace client', to: '/espace-client' },
    { label: 'Demandes clients', to: '/demandes-clients' },
    { label: 'Messagerie', to: '/tchat' },
  ],
}


function BellIcon() {
  return <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M6.5 8.5a5.5 5.5 0 1 1 11 0c0 5.5 2 6.5 2 6.5h-15s2-1 2-6.5Z" /><path d="M10 20a2 2 0 0 0 4 0" /></svg>
}
function SunIcon() {
  return <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="4" /><path d="M12 2v2.2M12 19.8V22M4.93 4.93l1.56 1.56M17.5 17.5l1.57 1.57M2 12h2.2M19.8 12H22M4.93 19.07l1.56-1.56M17.5 6.5l1.57-1.57" /></svg>
}
function MoonIcon() {
  return <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M20 15.8A8.5 8.5 0 0 1 8.2 4a9 9 0 1 0 11.8 11.8Z" /></svg>
}
export default function AppLayout() {
  const location = useLocation()
  const navigate = useNavigate()
  const {
    user,
    profil,
    role,
    tenantAllowedPages,
    enabledModules,
    isDemoSession,
  } = useAuth()
  const { theme, effectiveTheme, toggleTheme } = useTheme()
  const [searchQuery, setSearchQuery] = useState('')
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchHighlightIndex, setSearchHighlightIndex] = useState(0)
  const [planningHeaderCollapsed, setPlanningHeaderCollapsed] = useState(false)
  const searchRef = useRef<HTMLDivElement | null>(null)
  const searchInputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    try {
      setPlanningHeaderCollapsed(localStorage.getItem(PLANNING_HEADER_COLLAPSED_KEY) === '1')
    } catch {
      setPlanningHeaderCollapsed(false)
    }
  }, [])

  useEffect(() => {
    function syncPlanningHeaderState() {
      try {
        setPlanningHeaderCollapsed(localStorage.getItem(PLANNING_HEADER_COLLAPSED_KEY) === '1')
      } catch {
        setPlanningHeaderCollapsed(false)
      }
    }

    window.addEventListener('storage', syncPlanningHeaderState)
    window.addEventListener('nexora:planning-header-visibility-change', syncPlanningHeaderState)

    return () => {
      window.removeEventListener('storage', syncPlanningHeaderState)
      window.removeEventListener('nexora:planning-header-visibility-change', syncPlanningHeaderState)
    }
  }, [])

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target
      if (!(target instanceof Node)) return
      if (searchRef.current && !searchRef.current.contains(target)) {
        setSearchOpen(false)
      }
    }
    window.addEventListener('mousedown', handleClickOutside)
    return () => window.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    setSearchOpen(false)
    setSearchHighlightIndex(0)
    setSearchQuery('')
  }, [location.pathname])

  useEffect(() => {
    function handleShortcut(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        setSearchOpen(true)
        searchInputRef.current?.focus()
        searchInputRef.current?.select()
      }
    }

    window.addEventListener('keydown', handleShortcut)
    return () => window.removeEventListener('keydown', handleShortcut)
  }, [])

  const pageTitle = PAGE_TITLES[location.pathname] ?? 'NEXORA truck'
  const hidePlanningHeader = location.pathname === '/planning' && planningHeaderCollapsed
  const isPlanning = location.pathname === '/planning'
  const displayName = profil?.prenom || profil?.nom
    ? `${profil?.prenom ?? ''} ${profil?.nom ?? ''}`.trim()
    : user?.email ?? 'Equipe NEXORA truck'
  const todayLabel = new Intl.DateTimeFormat('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(new Date())

  const quickLinks = Object.entries(PAGE_TITLES)
    .map(([to, label]) => ({ to, label, page: to.slice(1) }))
    .filter(link => canAccess(role, link.page, tenantAllowedPages, enabledModules))
  const roleFocusActions = role
    ? (ROLE_FOCUS_ACTIONS[role] ?? [])
        .filter(action => canAccess(role, action.to.replace(/^\//, ''), tenantAllowedPages, enabledModules))
        .slice(0, 3)
    : []

  const normalizedQuery = searchQuery.trim().toLowerCase()
  const filteredQuickLinks = (normalizedQuery
    ? quickLinks.filter(link => link.label.toLowerCase().includes(normalizedQuery) || link.to.toLowerCase().includes(normalizedQuery))
    : quickLinks
  ).slice(0, 8)

  const hasSearchResults = filteredQuickLinks.length > 0

  function openQuickLink(to: string) {
    navigate(to)
    setSearchQuery('')
    setSearchOpen(false)
    setSearchHighlightIndex(0)
  }

  function handleSearchKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (!searchOpen) {
      setSearchOpen(true)
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault()
      if (!hasSearchResults) return
      setSearchHighlightIndex(current => (current + 1) % filteredQuickLinks.length)
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault()
      if (!hasSearchResults) return
      setSearchHighlightIndex(current => (current - 1 + filteredQuickLinks.length) % filteredQuickLinks.length)
    }

    if (event.key === 'Enter') {
      event.preventDefault()
      if (!hasSearchResults) return
      const selected = filteredQuickLinks[searchHighlightIndex] ?? filteredQuickLinks[0]
      if (selected) openQuickLink(selected.to)
    }

    if (event.key === 'Escape') {
      setSearchOpen(false)
      setSearchHighlightIndex(0)
    }
  }

  return (
    <div className="nx-shell nx-main lg:flex">
      <ImpersonationBanner />
      <a href="#app-main-content" className="nx-skip-link">
        Aller au contenu principal
      </a>
      <Sidebar />

      <div
        className={isPlanning ? 'flex flex-1 flex-col' : 'flex min-h-screen flex-1 flex-col px-4 pb-4 pt-4 sm:px-5 lg:px-6'}
        style={isPlanning ? { overflowX: 'clip' } : undefined}
      >
        {!hidePlanningHeader && (
          <header className="nx-panel nx-glass-header nx-topbar nx-page-hero mb-4 overflow-visible px-4 py-3 sm:px-5">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <h1 className="nx-page-hero-title text-xl font-semibold tracking-tight sm:text-2xl">{pageTitle}</h1>
              <div className="mt-1.5 flex flex-wrap items-center gap-2">
                <span className="nx-chip capitalize">{todayLabel}</span>
                {isDemoSession && (
                  <span className="nx-chip" style={{ color: 'var(--primary)', borderColor: 'color-mix(in srgb, var(--primary) 35%, var(--border))' }}>
                    Profil demo actif : {displayName}
                  </span>
                )}
              </div>
            </div>

            <div className="flex w-full flex-col gap-3 xl:w-auto sm:flex-row sm:items-center sm:justify-end">
              <div ref={searchRef} className="relative w-full sm:max-w-xl">
                <label className="nx-input-shell flex w-full items-center gap-3 px-4 py-3 text-sm shadow-sm sm:min-w-[340px]" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
                  <span className="nx-muted"><SearchIcon /></span>
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={searchQuery}
                    onChange={(event) => {
                      setSearchQuery(event.target.value)
                      setSearchOpen(true)
                      setSearchHighlightIndex(0)
                    }}
                    onFocus={() => setSearchOpen(true)}
                    onKeyDown={handleSearchKeyDown}
                    placeholder="Aller vers un module (Ctrl/Cmd + K)"
                    className="w-full border-0 bg-transparent p-0 text-sm outline-none placeholder:text-[color:var(--text-discreet)]"
                    aria-label="Navigation rapide"
                    aria-expanded={searchOpen}
                    aria-controls="quick-navigation-list"
                  />
                  {searchQuery.length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        setSearchQuery('')
                        setSearchHighlightIndex(0)
                        searchInputRef.current?.focus()
                      }}
                      className="rounded-md px-1.5 py-0.5 text-xs font-semibold transition-colors hover:bg-[color:var(--primary-soft)]"
                      style={{ color: 'var(--text-discreet)' }}
                      aria-label="Effacer la recherche"
                    >
                      Effacer
                    </button>
                  )}
                  <span className="hidden rounded-md border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide sm:inline" style={{ borderColor: 'var(--border)', color: 'var(--text-discreet)' }}>
                    Ctrl+K
                  </span>
                </label>

                {searchOpen && (
                  <div className="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-[130] overflow-hidden rounded-2xl border shadow-2xl" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
                    {hasSearchResults ? (
                      <ul id="quick-navigation-list" className="max-h-72 overflow-auto p-1 nx-scrollbar" role="listbox" aria-label="Resultats de navigation">
                        {filteredQuickLinks.map((link, index) => {
                          const isActive = index === searchHighlightIndex
                          return (
                            <li key={link.to}>
                              <button
                                type="button"
                                onMouseEnter={() => setSearchHighlightIndex(index)}
                                onClick={() => openQuickLink(link.to)}
                                className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm transition-colors"
                                style={isActive
                                  ? { background: 'var(--primary-soft)', color: 'var(--text-heading)' }
                                  : { color: 'var(--text)' }}
                                role="option"
                                aria-selected={isActive}
                              >
                                <span>{link.label}</span>
                                <span className="text-xs nx-subtle">{link.to}</span>
                              </button>
                            </li>
                          )
                        })}
                      </ul>
                    ) : (
                      <div className="px-3 py-3 text-sm nx-subtle">
                        Aucun module ne correspond a cette recherche.
                      </div>
                    )}
                    <div className="border-t px-3 py-2 text-[11px] nx-subtle" style={{ borderColor: 'var(--border)' }}>
                      Astuce: utilisez les fleches ↑ ↓ puis Entree pour ouvrir rapidement.
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={toggleTheme}
                  className="nx-btn flex h-11 w-11 items-center justify-center shadow-sm"
                  style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
                  aria-label={theme === 'light' ? 'Passer en mode sombre' : 'Passer en mode clair'}
                  title={theme === 'light' ? 'Mode sombre' : 'Mode clair'}
                >
                  {effectiveTheme === 'light' ? <MoonIcon /> : <SunIcon />}
                </button>

                <button
                  type="button"
                  onClick={() => navigate('/ops-center')}
                  className="nx-btn relative flex h-11 w-11 items-center justify-center shadow-sm"
                  style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
                  aria-label="Notifications"
                  title="Ouvrir Ops Center"
                >
                  <BellIcon />
                  <span className="absolute right-2 top-2 inline-flex h-2.5 w-2.5 rounded-full" style={{ background: 'var(--warning)' }} />
                </button>
              </div>
            </div>

          </div>
          {roleFocusActions.length > 0 && (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: 'var(--text-discreet)' }}>
                Actions rapides
              </span>
              {roleFocusActions.map(action => (
                <Link
                  key={action.to}
                  to={action.to}
                  className="inline-flex min-h-[40px] items-center rounded-xl border px-3 py-2 text-sm font-semibold transition-colors"
                  style={{
                    borderColor: 'color-mix(in srgb, var(--primary) 35%, var(--border))',
                    color: 'var(--text)',
                    background: 'color-mix(in srgb, var(--primary-soft) 45%, var(--surface))',
                  }}
                >
                  {action.label}
                </Link>
              ))}
            </div>
          )}
          </header>
        )}

        <main id="app-main-content" className={isPlanning ? 'flex-1 min-h-0' : 'relative z-0 flex-1'}>
          <Outlet />
        </main>

        {/* Bouton action rapide contextuel par rôle */}
        {role && ROLE_QUICK_ACTION[role] && (!ROLE_QUICK_ACTION[role].onlyOnPage || location.pathname === ROLE_QUICK_ACTION[role].onlyOnPage) && location.pathname !== '/planning' && (
          <Link
            to={ROLE_QUICK_ACTION[role].to}
            className="fixed bottom-6 right-6 z-[80] flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold text-white shadow-xl transition-all hover:scale-105 active:scale-95"
            style={{
              background: 'linear-gradient(135deg, var(--primary), color-mix(in srgb, var(--primary) 70%, #5856D6))',
              boxShadow: '0 4px 20px color-mix(in srgb, var(--primary) 45%, transparent)',
            }}
            title={ROLE_QUICK_ACTION[role].label}
          >
            <PlusIcon />
            <span className="hidden sm:inline">{ROLE_QUICK_ACTION[role].label}</span>
          </Link>
        )}
      </div>
    </div>
  )
}
