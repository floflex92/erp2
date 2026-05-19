const transports = [
  { id: 'OT-2403', client: 'Logistra Est', depart: 'Strasbourg', arrivee: 'Lyon', statut: 'En cours', statutColor: 'bg-sky-400', chauffeur: 'M. Renaud', remorque: 'RQ-04', heure: '08:42' },
  { id: 'OT-2404', client: 'ColdEx France', depart: 'Reims', arrivee: 'Paris Rungis', statut: 'En attente', statutColor: 'bg-amber-400', chauffeur: 'F. Dupré', remorque: 'FR-02', heure: '10:15' },
  { id: 'OT-2401', client: 'AgriTrans 67', depart: 'Mulhouse', arrivee: 'Rouen', statut: 'Livre', statutColor: 'bg-emerald-400', chauffeur: 'J. Mallet', remorque: 'RQ-01', heure: '06:30' },
] as const

const kpi = [
  { label: 'Courses actives', value: '18', delta: '+3 vs hier' },
  { label: 'Conducteurs', value: '12 / 15', delta: '3 en repos' },
  { label: 'Alertes atelier', value: '2', delta: 'dont 1 urgente' },
] as const

export default function SiteHeroVisual() {
  return (
    <div className="rounded-[2.15rem] border border-white/50 bg-[linear-gradient(145deg,rgba(255,255,255,0.94),rgba(226,232,240,0.88))] p-5 shadow-[0_30px_90px_rgba(15,23,42,0.16)] backdrop-blur">
      {/* Barre de navigation ERP simulee */}
      <div className="mb-4 flex items-center gap-2 px-1">
        <div className="h-3 w-3 rounded-full bg-slate-300" />
        <div className="h-3 w-3 rounded-full bg-slate-300" />
        <div className="h-3 w-3 rounded-full bg-slate-300" />
        <div className="ml-3 flex-1 rounded-full border border-slate-200 bg-white/80 px-4 py-1.5">
          <p className="text-[11px] text-slate-600">app.nexoratruck.fr / dashboard</p>
        </div>
      </div>

      <div className="rounded-[1.8rem] border border-slate-900/60 bg-slate-950 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
        {/* Header ERP */}
        <div className="flex items-center justify-between gap-3 border-b border-white/8 px-5 py-3.5">
          <div className="flex items-center gap-3">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-sky-500 text-[11px] font-bold text-white">N</div>
            <p className="text-[12px] font-semibold text-white">NEXORA Truck</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-red-500/90 text-[9px] font-bold text-white">2</span>
            <div className="h-7 w-7 rounded-full bg-slate-700 text-center text-[11px] font-semibold leading-7 text-slate-200">FL</div>
          </div>
        </div>

        <div className="flex min-h-0">
          {/* Sidebar simulee */}
          <div className="hidden w-[88px] shrink-0 flex-col items-center gap-1 border-r border-white/8 py-4 sm:flex">
            {['Dashboard', 'Transports', 'Planning', 'Chauffeurs', 'Clients'].map((item, i) => (
              <div key={item} className={`flex w-full flex-col items-center gap-1 px-2 py-2.5 ${i === 0 ? 'rounded-[0.85rem] bg-sky-500/20 text-sky-300' : 'text-slate-300 hover:text-slate-100'}`}>
                <div className={`h-4 w-4 rounded bg-current opacity-70`} />
                <p className="text-[9px] font-semibold uppercase leading-none tracking-[0.18em]">{item}</p>
              </div>
            ))}
          </div>

          {/* Contenu principal */}
          <div className="flex-1 overflow-hidden p-4">
            {/* KPIs */}
            <div className="mb-4 grid grid-cols-3 gap-2">
              {kpi.map(k => (
                <div key={k.label} className="rounded-[1.15rem] border border-white/8 bg-white/5 p-3">
                  <p className="text-[9px] font-semibold uppercase tracking-[0.22em] text-slate-300">{k.label}</p>
                  <p className="mt-1.5 text-xl font-semibold leading-none text-white">{k.value}</p>
                  <p className="mt-1 text-[10px] text-slate-300">{k.delta}</p>
                </div>
              ))}
            </div>

            {/* Liste transports */}
            <div className="rounded-[1.15rem] border border-white/8 bg-white/4">
              <div className="border-b border-white/8 px-4 py-2.5">
                <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-300">Ordres de transport — aujourd’hui</p>
              </div>
              <div className="divide-y divide-white/6">
                {transports.map(t => (
                  <div key={t.id} className="flex items-center gap-3 px-4 py-3">
                    <span className={`h-2 w-2 shrink-0 rounded-full ${t.statutColor}`} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline gap-2">
                        <p className="text-[11px] font-semibold text-white">{t.id}</p>
                        <p className="truncate text-[10px] text-slate-300">{t.client}</p>
                      </div>
                      <p className="mt-0.5 text-[10px] text-slate-300">{t.depart} → {t.arrivee} · {t.chauffeur}</p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-[10px] font-semibold text-slate-200">{t.statut}</p>
                      <p className="text-[10px] text-slate-300">{t.heure}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
