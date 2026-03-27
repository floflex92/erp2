export default function Dashboard() {
  return (
    <div>
      <h2 className="text-2xl font-bold text-slate-800 mb-6">Tableau de bord</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        {[
          { label: 'Chauffeurs actifs',     value: '—', icon: '👤' },
          { label: 'Véhicules en service',  value: '—', icon: '🚛' },
          { label: 'Transports en cours',   value: '—', icon: '📋' },
          { label: 'Factures en attente',   value: '—', icon: '💶' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
            <span className="text-2xl">{s.icon}</span>
            <p className="text-3xl font-bold text-slate-800 mt-3">{s.value}</p>
            <p className="text-slate-500 text-sm mt-1">{s.label}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
