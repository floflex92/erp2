import { NavLink } from 'react-router-dom'
import { useAuth, canAccess, ROLE_LABELS } from '@/lib/auth'

const NAV = [
  { to: '/dashboard',     page: 'dashboard',     label: 'Tableau de bord',    icon: '📊' },
  { to: '/planning',      page: 'planning',      label: 'Planning',           icon: '📅' },
  { to: '/transports',    page: 'transports',    label: 'Ordres de transport', icon: '📋' },
  { to: '/chauffeurs',    page: 'chauffeurs',    label: 'Conducteurs',         icon: '👤' },
  { to: '/vehicules',     page: 'vehicules',     label: 'Véhicules',          icon: '🚛' },
  { to: '/clients',       page: 'clients',       label: 'Clients',            icon: '🏢' },
  { to: '/facturation',   page: 'facturation',   label: 'Facturation',        icon: '💶' },
  { to: '/tachygraphe',   page: 'tachygraphe',   label: 'Tachygraphe',        icon: '⏱️' },
  { to: '/utilisateurs',  page: 'utilisateurs',  label: 'Utilisateurs',       icon: '🔐' },
]

const ROLE_BADGE: Record<string, string> = {
  dirigeant:  'bg-violet-900/60 text-violet-300',
  exploitant: 'bg-blue-900/60 text-blue-300',
  mecanicien: 'bg-orange-900/60 text-orange-300',
  commercial: 'bg-emerald-900/60 text-emerald-300',
  comptable:  'bg-slate-700 text-slate-300',
}

export default function Sidebar() {
  const { user, role, profil, signOut } = useAuth()

  const displayName = profil?.prenom || profil?.nom
    ? `${profil.prenom ?? ''} ${profil.nom ?? ''}`.trim()
    : user?.email ?? ''

  return (
    <aside className="w-64 min-h-screen bg-slate-900 text-white flex flex-col shrink-0">
      <div className="p-6 border-b border-slate-700">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🚛</span>
          <div>
            <h1 className="text-base font-bold leading-tight">ERP Transport</h1>
            <p className="text-slate-400 text-xs">Gestion de flotte</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
        {NAV.filter(item => canAccess(role, item.page)).map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-slate-700 text-white'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              }`
            }
          >
            <span className="text-base">{item.icon}</span>
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="p-4 border-t border-slate-700 space-y-3">
        {user && (
          <div className="px-1 space-y-1">
            <p className="text-slate-300 text-sm font-medium truncate">{displayName}</p>
            <p className="text-slate-500 text-xs truncate">{user.email}</p>
            {role && (
              <span className={`inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full ${ROLE_BADGE[role] ?? 'bg-slate-700 text-slate-400'}`}>
                {ROLE_LABELS[role]}
              </span>
            )}
          </div>
        )}
        <button
          onClick={signOut}
          className="flex items-center gap-2 w-full px-3 py-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg text-sm transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          Se déconnecter
        </button>
        <p className="text-slate-700 text-xs px-1">v1.0.0 · Smart ERP Transport</p>
      </div>
    </aside>
  )
}
