import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom'
import Sidebar from './Sidebar'
import NexoraTruckLogo from './NexoraTruckLogo'
import { ROLE_LABELS, canAccess, useAuth } from '@/lib/auth'
import { useTheme } from '@/lib/theme'

const PLANNING_HEADER_COLLAPSED_KEY = 'nexora_planning_header_collapsed_v1'

const PAGE_TITLES: Record<string, string> = {
  '/dashboard': 'Vue d’ensemble',
  '/tachygraphe': 'Chronotachygraphe',
  '/amendes': 'PV & Amendes',
  '/map-live': 'Map live',
  '/feuille-route': 'Feuille de route',
  '/planning': 'Planning',
  '/demandes-clients': 'Demandes clients',
  '/espace-client': 'Espace client',
  '/espace-affreteur': 'Espace affreteur',
  '/transports': 'Ordres de transport',
  '/chauffeurs': 'Conducteurs',
  '/rh': 'Ressources humaines',
  '/vehicules': 'Camions',
  '/remorques': 'Remorques',
  '/equipements': 'Equipements',
  '/maintenance': 'Atelier',
  '/tasks': 'Gestionnaire de tâches',
  '/clients': 'Clients',
  '/facturation': 'Comptabilité',
  '/comptabilite': 'États légaux',
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

function SearchIcon() {
  return <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
}
function BellIcon() {
  return <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M6.5 8.5a5.5 5.5 0 1 1 11 0c0 5.5 2 6.5 2 6.5h-15s2-1 2-6.5Z" /><path d="M10 20a2 2 0 0 0 4 0" /></svg>
}
function SwitchSessionIcon() {
  return <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M16 3h5v5" /><path d="m21 3-6 6" /><path d="M8 21H3v-5" /><path d="m3 21 6-6" /><path d="M14 7H8a3 3 0 0 0-3 3v0" /><path d="M10 17h6a3 3 0 0 0 3-3v0" /></svg>
}
function SunIcon() {
  return <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="4" /><path d="M12 2v2.2M12 19.8V22M4.93 4.93l1.56 1.56M17.5 17.5l1.57 1.57M2 12h2.2M19.8 12H22M4.93 19.07l1.56-1.56M17.5 6.5l1.57-1.57" /></svg>
}
function MoonIcon() {
  return <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M20 15.8A8.5 8.5 0 0 1 8.2 4a9 9 0 1 0 11.8 11.8Z" /></svg>
}
function ChevronIcon({ open }: { open: boolean }) {
  return <svg className={`h-4 w-4 transition-transform ${open ? 'rotate-180' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="m6 9 6 6 6-6" /></svg>
}

export default function AppLayout() {
  const location = useLocation()
  const navigate = useNavigate()
  const {
    user,
    profil,
    accountProfil,
    role,
    tenantAllowedPages,
    canUseSessionPicker,
    isDemoSession,
    signOut,
    resetSessionRole,
    resetSessionProfil,
  } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const [menuOpen, setMenuOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchHighlightIndex, setSearchHighlightIndex] = useState(0)
  const [planningHeaderCollapsed, setPlanningHeaderCollapsed] = useState(false)
  const [menuPosition, setMenuPosition] = useState<{ top: number; left: number; width: number } | null>(null)
  const menuRef = useRef<HTMLDivElement | null>(null)
  const menuButtonRef = useRef<HTMLButtonElement | null>(null)
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
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false)
      }
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setSearchOpen(false)
      }
    }
    window.addEventListener('mousedown', handleClickOutside)
    return () => window.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    if (!menuOpen) {
      setMenuPosition(null)
      return
    }

    function syncMenuPosition() {
      const rect = menuButtonRef.current?.getBoundingClientRect()
      if (!rect) return

      const menuWidth = Math.max(rect.width, 280)
      const left = Math.max(16, Math.min(rect.right - menuWidth, window.innerWidth - menuWidth - 16))

      setMenuPosition({
        top: rect.bottom + 12,
        left,
        width: menuWidth,
      })
    }

    syncMenuPosition()

    window.addEventListener('resize', syncMenuPosition)
    window.addEventListener('scroll', syncMenuPosition, true)

    return () => {
      window.removeEventListener('resize', syncMenuPosition)
      window.removeEventListener('scroll', syncMenuPosition, true)
    }
  }, [menuOpen])

  useEffect(() => {
    setMenuOpen(false)
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
  const displayName = profil?.prenom || profil?.nom
    ? `${profil?.prenom ?? ''} ${profil?.nom ?? ''}`.trim()
    : user?.email ?? 'Equipe NEXORA truck'
  const accountName = accountProfil?.prenom || accountProfil?.nom
    ? `${accountProfil?.prenom ?? ''} ${accountProfil?.nom ?? ''}`.trim()
    : user?.email ?? 'Compte admin'
  const roleLabel = role ? ROLE_LABELS[role] ?? role : 'Utilisateur'
  const todayLabel = new Intl.DateTimeFormat('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(new Date())

  const menuLinks = [
    canAccess(role, 'parametres', tenantAllowedPages) ? { to: '/parametres', label: 'Reglages' } : null,
    canAccess(role, 'parametres', tenantAllowedPages) ? { to: '/parametres#rgpd', label: 'Charte RGPD' } : null,
    canAccess(role, 'parametres', tenantAllowedPages) ? { to: '/parametres#aide', label: 'Aide' } : null,
    canAccess(role, 'mentions-legales', tenantAllowedPages) ? { to: '/mentions-legales', label: 'Mentions legales' } : null,
    canAccess(role, 'utilisateurs', tenantAllowedPages) ? { to: '/utilisateurs', label: 'Comptes et acces' } : null,
  ].filter(Boolean) as { to: string; label: string }[]

  const quickLinks = Object.entries(PAGE_TITLES)
    .map(([to, label]) => ({ to, label, page: to.slice(1) }))
    .filter(link => canAccess(role, link.page, tenantAllowedPages))

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

  function resetSessionView() {
    resetSessionProfil()
    resetSessionRole()
    setMenuOpen(false)
  }

  const profileMenu = menuOpen && menuPosition
    ? createPortal(
      <div
        className="fixed z-[260] rounded-2xl border p-2 shadow-2xl"
        style={{
          top: menuPosition.top,
          left: menuPosition.left,
          width: menuPosition.width,
          borderColor: 'var(--border)',
          background: 'var(--surface)',
        }}
      >
        <div className="border-b px-3 py-3" style={{ borderColor: 'var(--border)' }}>
          <p className="truncate text-sm font-semibold">{displayName}</p>
          <p className="mt-1 truncate text-xs nx-subtle">{user?.email}</p>
          {isDemoSession && (
            <p className="mt-2 text-xs" style={{ color: 'var(--primary)' }}>
              Session demo ouverte depuis {accountName}
            </p>
          )}
          <div className="mt-3">
            {canUseSessionPicker ? (
              <button
                type="button"
                onClick={resetSessionView}
                className="inline-flex rounded-full border px-2.5 py-1 text-[11px] font-medium capitalize transition-colors hover:bg-[color:var(--primary-soft)]"
                style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
                title="Changer de session"
                aria-label="Changer de session"
              >
                {roleLabel}
              </button>
            ) : (
              <span
                className="inline-flex rounded-full border px-2.5 py-1 text-[11px] font-medium capitalize"
                style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
              >
                {roleLabel}
              </span>
            )}
          </div>
        </div>
        <div className="border-b px-3 py-2" style={{ borderColor: 'var(--border)' }}>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] nx-muted">Reglages</p>
        </div>
        <div className="space-y-1 p-1">
          {menuLinks.map(link => (
            <Link
              key={link.to}
              to={link.to}
              className="block rounded-xl px-3 py-2 text-sm transition-colors hover:bg-[color:var(--primary-soft)]"
            >
              {link.label}
            </Link>
          ))}
          {menuLinks.length === 0 && (
            <p className="px-3 py-2 text-sm nx-subtle">Aucun acces disponible.</p>
          )}
          {canUseSessionPicker && (
            <button
              type="button"
              onClick={resetSessionView}
              className="block w-full rounded-xl px-3 py-2 text-left text-sm transition-colors hover:bg-[color:var(--primary-soft)]"
            >
              {isDemoSession ? 'Changer de profil demo' : 'Changer de session'}
            </button>
          )}
          <button
            type="button"
            onClick={signOut}
            className="block w-full rounded-xl px-3 py-2 text-left text-sm transition-colors hover:bg-[color:var(--primary-soft)]"
          >
            Se deconnecter
          </button>
        </div>
      </div>,
      document.body,
    )
    : null

  return (
    <div className="nx-shell nx-main lg:flex">
      <a href="#app-main-content" className="nx-skip-link">
        Aller au contenu principal
      </a>
      <Sidebar />

      <div className="flex min-h-screen flex-1 flex-col px-4 pb-4 pt-4 sm:px-5 lg:px-6">
        {!hidePlanningHeader && (
          <header className="nx-panel nx-glass-header nx-topbar mb-5 overflow-visible px-4 py-4 sm:px-5">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <div className="mb-3">
                <NexoraTruckLogo size="sm" subtitle="Control center" />
              </div>
              <h1 className="mt-1 text-xl font-semibold tracking-tight sm:text-2xl">{pageTitle}</h1>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <span className="nx-chip">{roleLabel}</span>
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
                {canUseSessionPicker && (
                  <button
                    type="button"
                    onClick={resetSessionView}
                    className="nx-btn nx-btn-accent flex h-11 items-center gap-2 px-3 text-sm font-medium shadow-sm"
                    title="Changer de session"
                    aria-label="Changer de session"
                  >
                    <SwitchSessionIcon />
                    <span className="hidden sm:inline">Changer de session</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={toggleTheme}
                  className="nx-btn flex h-11 w-11 items-center justify-center shadow-sm"
                  style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
                  aria-label="Basculer le theme"
                >
                  {theme === 'light' ? <MoonIcon /> : <SunIcon />}
                </button>

                <button
                  type="button"
                  className="nx-btn relative flex h-11 w-11 items-center justify-center shadow-sm"
                  style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
                  aria-label="Notifications"
                >
                  <BellIcon />
                  <span className="absolute right-2 top-2 inline-flex h-2.5 w-2.5 rounded-full" style={{ background: 'var(--warning)' }} />
                </button>

                <div ref={menuRef} className="relative z-[90]">
                  <button
                    ref={menuButtonRef}
                    type="button"
                    onClick={() => setMenuOpen(current => !current)}
                    className="nx-btn flex items-center gap-3 px-3 py-2 shadow-sm"
                    style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
                  >
                    <div
                      className="flex h-10 w-10 items-center justify-center rounded-xl text-sm font-semibold"
                      style={{ background: 'var(--primary-soft)', color: 'var(--primary)' }}
                    >
                      {displayName.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0 text-left">
                      <p className="truncate text-sm font-semibold">{displayName}</p>
                      <p className="truncate text-xs nx-subtle">{roleLabel}</p>
                    </div>
                    <span className="nx-subtle"><ChevronIcon open={menuOpen} /></span>
                  </button>
                </div>
                {profileMenu}
              </div>
            </div>
          </div>
          </header>
        )}

        <main id="app-main-content" className="relative z-0 flex-1">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
