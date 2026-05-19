const alerts = [
  { text: 'OT-2404 en retard — Reims → Paris', type: 'amber' },
  { text: 'Remorque RQ-07: CT a renouveler sous 12j', type: 'red' },
  { text: 'Conducteur F. Dupré: heure de service limite', type: 'amber' },
] as const

const kpi = [
  { label: 'Courses actives', value: '18', sub: '+3 vs J-1', accent: 'text-sky-300' },
  { label: 'Conducteurs actifs', value: '12', sub: '3 en repos CPP', accent: 'text-emerald-300' },
  { label: 'Alertes atelier', value: '2', sub: '1 urgente', accent: 'text-red-300' },
  { label: 'Livraisons du jour', value: '9 / 14', sub: '5 en cours', accent: 'text-amber-300' },
] as const

export default function FrameDashboard() {
  return (
    <div className="h-full rounded-[1.4rem] border border-white/8 bg-slate-950 p-4 text-white">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-[9px] font-semibold uppercase tracking-[0.28em] text-sky-200">Tableau de bord</p>
          <p className="mt-0.5 text-sm font-semibold">Cockpit exploitation</p>
        </div>
        <span className="rounded-full border border-sky-400/25 bg-sky-400/10 px-2.5 py-0.5 text-[10px] font-semibold text-sky-200">
          En direct
        </span>
      </div>

      {/* KPIs */}
      <div className="mb-3 grid grid-cols-2 gap-2">
        {kpi.map(k => (
          <div key={k.label} className="rounded-[1rem] border border-white/8 bg-white/5 p-3">
            <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-slate-300">{k.label}</p>
            <p className={`mt-1 text-xl font-semibold leading-none ${k.accent}`}>{k.value}</p>
            <p className="mt-1 text-[10px] text-slate-300">{k.sub}</p>
          </div>
        ))}
      </div>

      {/* Alertes */}
      <div className="rounded-[1rem] border border-white/8 bg-white/4 p-3">
        <p className="mb-2 text-[9px] font-semibold uppercase tracking-[0.22em] text-slate-300">Alertes actives</p>
        <div className="space-y-1.5">
          {alerts.map(a => (
            <div key={a.text} className={`flex items-center gap-2 rounded-[0.8rem] border px-3 py-2 ${a.type === 'red' ? 'border-red-400/20 bg-red-400/8' : 'border-amber-400/20 bg-amber-400/8'}`}>
              <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${a.type === 'red' ? 'bg-red-400' : 'bg-amber-400'}`} />
              <p className="text-[10px] leading-5 text-slate-200">{a.text}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
