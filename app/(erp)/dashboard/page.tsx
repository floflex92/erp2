export default function DashboardPage() {
  const stats = [
    { label: "Chauffeurs actifs", value: "0", icon: "👤", color: "bg-blue-500" },
    { label: "Véhicules en service", value: "0", icon: "🚛", color: "bg-green-500" },
    { label: "Transports en cours", value: "0", icon: "📋", color: "bg-orange-500" },
    { label: "Factures en attente", value: "0 €", icon: "💶", color: "bg-purple-500" },
  ]

  return (
    <div>
      <h2 className="text-2xl font-bold text-slate-800 mb-6">Tableau de bord</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-8">
        {stats.map((stat) => (
          <div key={stat.label} className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <div className="flex items-center justify-between mb-3">
              <span className="text-2xl">{stat.icon}</span>
              <span className={`${stat.color} w-2 h-2 rounded-full`} />
            </div>
            <p className="text-3xl font-bold text-slate-800">{stat.value}</p>
            <p className="text-slate-500 text-sm mt-1">{stat.label}</p>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h3 className="font-semibold text-slate-700 mb-4">Transports récents</h3>
          <p className="text-slate-400 text-sm">Aucun transport enregistré</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h3 className="font-semibold text-slate-700 mb-4">Alertes véhicules</h3>
          <p className="text-slate-400 text-sm">Aucune alerte</p>
        </div>
      </div>
    </div>
  )
}
