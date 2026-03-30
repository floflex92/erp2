import { useEffect, useRef, useState } from 'react'
import { Link, Outlet, useLocation } from 'react-router-dom'
import Sidebar from './Sidebar'
import NexoraTruckLogo from './NexoraTruckLogo'
import { ROLE_LABELS, canAccess, useAuth } from '@/lib/auth'
import { useTheme } from '@/lib/theme'

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
  '/paie': 'Paie',
  '/frais': 'Frais',
  '/prospection': 'Prospection',
  '/parametres': 'Reglages',
  '/utilisateurs': 'Utilisateurs',
  '/communication': 'Communication',
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
  const {
    user,
    profil,
    accountProfil,
    role,
    canUseSessionPicker,
    isDemoSession,
    signOut,
    resetSessionRole,
    resetSessionProfil,
  } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false)
      }
    }
    window.addEventListener('mousedown', handleClickOutside)
    return () => window.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    setMenuOpen(false)
  }, [location.pathname])

  const pageTitle = PAGE_TITLES[location.pathname] ?? 'NEXORA truck'
  const displayName = profil?.prenom || profil?.nom
    ? `${profil?.prenom ?? ''} ${profil?.nom ?? ''}`.trim()
    : user?.email ?? 'Equipe NEXORA truck'
  const accountName = accountProfil?.prenom || accountProfil?.nom
    ? `${accountProfil?.prenom ?? ''} ${accountProfil?.nom ?? ''}`.trim()
    : user?.email ?? 'Compte admin'
  const roleLabel = role ? ROLE_LABELS[role] ?? role : 'Utilisateur'

  const menuLinks = [
    canAccess(role, 'parametres') ? { to: '/parametres', label: 'Reglages' } : null,
    canAccess(role, 'parametres') ? { to: '/parametres#rgpd', label: 'Charte RGPD' } : null,
    canAccess(role, 'parametres') ? { to: '/parametres#aide', label: 'Aide' } : null,
    canAccess(role, 'mentions-legales') ? { to: '/mentions-legales', label: 'Mentions legales' } : null,
    canAccess(role, 'utilisateurs') ? { to: '/utilisateurs', label: 'Utilisateurs' } : null,
  ].filter(Boolean) as { to: string; label: string }[]

  function resetSessionView() {
    resetSessionProfil()
    resetSessionRole()
    setMenuOpen(false)
  }

  return (
    <div className="nx-shell lg:flex">
      <Sidebar />

      <div className="flex min-h-screen flex-1 flex-col px-4 pb-4 pt-4 sm:px-5 lg:px-6">
        <header className="nx-panel relative z-[80] mb-5 overflow-visible px-4 py-4 sm:px-5">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <div className="mb-3">
                <NexoraTruckLogo size="sm" subtitle="Control center" />
              </div>
              <h1 className="mt-1 text-xl font-semibold tracking-tight sm:text-2xl">{pageTitle}</h1>
              {isDemoSession && (
                <p className="mt-2 inline-flex rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em]" style={{ borderColor: 'var(--border)', background: 'var(--surface)', color: 'var(--primary)' }}>
                  Profil demo actif : {displayName}
                </p>
              )}
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <label className="flex min-w-[280px] items-center gap-3 rounded-2xl border px-4 py-3 text-sm shadow-sm sm:min-w-[340px]" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
                <span className="nx-muted"><SearchIcon /></span>
                <input
                  type="text"
                  placeholder="Rechercher mission, vehicule, conducteur ou client"
                  className="w-full border-0 bg-transparent p-0 text-sm outline-none placeholder:text-[color:var(--text-discreet)]"
                />
              </label>

              <div className="flex items-center gap-2">
                {canUseSessionPicker && (
                  <button
                    type="button"
                    onClick={resetSessionView}
                    className="flex h-11 items-center gap-2 rounded-2xl border px-3 text-sm font-medium shadow-sm transition-colors"
                    style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
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
                  className="flex h-11 w-11 items-center justify-center rounded-2xl border shadow-sm transition-colors"
                  style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
                  aria-label="Basculer le theme"
                >
                  {theme === 'light' ? <MoonIcon /> : <SunIcon />}
                </button>

                <button
                  type="button"
                  className="relative flex h-11 w-11 items-center justify-center rounded-2xl border shadow-sm"
                  style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
                  aria-label="Notifications"
                >
                  <BellIcon />
                  <span className="absolute right-2 top-2 inline-flex h-2.5 w-2.5 rounded-full" style={{ background: 'var(--warning)' }} />
                </button>

                <div ref={menuRef} className="relative z-[90]">
                  <button
                    type="button"
                    onClick={() => setMenuOpen(current => !current)}
                    className="flex items-center gap-3 rounded-2xl border px-3 py-2 shadow-sm"
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

                  {menuOpen && (
                    <div className="absolute right-0 top-[calc(100%+0.75rem)] z-[120] min-w-[260px] rounded-2xl border p-2 shadow-2xl" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
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
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </header>

        <main className="relative z-0 flex-1 nx-scrollbar overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
