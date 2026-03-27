import { useAuth, ROLE_LABELS, ROLE_ACCESS, type Role } from '@/lib/auth'

const ROLES: Role[] = ['dirigeant', 'exploitant', 'mecanicien', 'commercial', 'comptable']

const ROLE_META: Record<Role, { icon: string; color: string; border: string; desc: string }> = {
  admin:      { icon: '⚡', color: 'from-slate-700 to-slate-800', border: 'border-slate-500', desc: '' },
  dirigeant:  { icon: '👔', color: 'from-violet-700 to-violet-900', border: 'border-violet-500', desc: 'Accès complet à toutes les fonctionnalités' },
  exploitant: { icon: '🗂️', color: 'from-blue-700 to-blue-900',   border: 'border-blue-500',   desc: 'Planning, OT, Conducteurs, Véhicules' },
  mecanicien: { icon: '🔧', color: 'from-orange-700 to-orange-900', border: 'border-orange-500', desc: 'Véhicules et Tachygraphe uniquement' },
  commercial: { icon: '💼', color: 'from-emerald-700 to-emerald-900', border: 'border-emerald-500', desc: 'Clients, OT, Facturation' },
  comptable:  { icon: '📊', color: 'from-slate-600 to-slate-800', border: 'border-slate-400',   desc: 'Dashboard et Facturation uniquement' },
}

export default function SessionPicker() {
  const { user, setSessionRole, signOut } = useAuth()

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-8">
      {/* Header */}
      <div className="mb-10 text-center">
        <div className="flex items-center justify-center gap-3 mb-4">
          <span className="text-3xl">🚛</span>
          <h1 className="text-2xl font-bold text-white">ERP Transport</h1>
        </div>
        <p className="text-slate-400 text-sm">
          Connecté en tant que <span className="text-white font-medium">{user?.email}</span>
        </p>
        <div className="mt-2 inline-flex items-center gap-1.5 bg-yellow-500/10 border border-yellow-500/30 rounded-full px-3 py-1">
          <span className="w-2 h-2 bg-yellow-400 rounded-full" />
          <span className="text-yellow-400 text-xs font-semibold">Mode Administrateur</span>
        </div>
        <p className="text-slate-500 text-sm mt-4">Choisissez le type de session à ouvrir :</p>
      </div>

      {/* Role cards */}
      <div className="grid grid-cols-3 gap-4 w-full max-w-3xl">
        {ROLES.map(role => {
          const meta = ROLE_META[role]
          const pages = ROLE_ACCESS[role]
          return (
            <button
              key={role}
              onClick={() => setSessionRole(role)}
              className={`relative group text-left p-5 rounded-2xl bg-gradient-to-br ${meta.color} border ${meta.border}/40 hover:${meta.border}/80 hover:scale-[1.02] transition-all duration-200 shadow-lg hover:shadow-xl`}
            >
              <div className="text-3xl mb-3">{meta.icon}</div>
              <h3 className="text-white font-bold text-base mb-1">{ROLE_LABELS[role]}</h3>
              <p className="text-white/50 text-xs mb-3">{meta.desc}</p>
              <div className="flex flex-wrap gap-1">
                {pages.slice(0, 4).map(p => (
                  <span key={p} className="text-[9px] bg-white/10 text-white/60 px-1.5 py-0.5 rounded font-mono">
                    {p}
                  </span>
                ))}
                {pages.length > 4 && (
                  <span className="text-[9px] text-white/40">+{pages.length - 4}</span>
                )}
              </div>
              <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity text-white/60 text-xs">
                Ouvrir →
              </div>
            </button>
          )
        })}

        {/* Accès admin complet */}
        <button
          onClick={() => setSessionRole('admin')}
          className="text-left p-5 rounded-2xl bg-gradient-to-br from-slate-800 to-slate-900 border border-white/10 hover:border-white/30 hover:scale-[1.02] transition-all duration-200 shadow-lg col-span-3 flex items-center gap-4"
        >
          <span className="text-3xl">⚡</span>
          <div>
            <h3 className="text-white font-bold text-base">Accès Administrateur complet</h3>
            <p className="text-slate-400 text-xs">Vue sans restriction — toutes les pages visibles</p>
          </div>
          <span className="ml-auto text-slate-500 text-sm">Ouvrir →</span>
        </button>
      </div>

      <button
        onClick={signOut}
        className="mt-10 text-slate-600 hover:text-slate-400 text-sm transition-colors"
      >
        Se déconnecter
      </button>
    </div>
  )
}
