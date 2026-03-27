import { NavLink } from 'react-router-dom'

const NAV = [
  { to: '/dashboard',    label: 'Tableau de bord',     icon: '📊' },
  { to: '/chauffeurs',   label: 'Conducteurs',           icon: '👤' },
  { to: '/vehicules',    label: 'Véhicules',            icon: '🚛' },
  { to: '/transports',   label: 'Ordres de transport',  icon: '📋' },
  { to: '/clients',      label: 'Clients',              icon: '🏢' },
  { to: '/facturation',  label: 'Facturation',          icon: '💶' },
  { to: '/tachygraphe',  label: 'Tachygraphe',          icon: '⏱️' },
]

export default function Sidebar() {
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

      <nav className="flex-1 p-3 space-y-0.5">
        {NAV.map(item => (
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

      <div className="p-4 border-t border-slate-700">
        <p className="text-slate-500 text-xs">v1.0.0 · Smart ERP Transport</p>
      </div>
    </aside>
  )
}
