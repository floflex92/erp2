const slots = [
  { heure: '06:00', ot: 'OT-2401', trajet: 'Mulhouse → Rouen', conducteur: 'J. Mallet', remorque: 'RQ-01', statut: 'Livre', color: 'bg-emerald-400' },
  { heure: '08:42', ot: 'OT-2403', trajet: 'Strasbourg → Lyon', conducteur: 'M. Renaud', remorque: 'RQ-04', statut: 'En cours', color: 'bg-sky-400' },
  { heure: '10:15', ot: 'OT-2404', trajet: 'Reims → Paris Rungis', conducteur: 'F. Dupré', remorque: 'FR-02', statut: 'En attente', color: 'bg-amber-400' },
  { heure: '13:00', ot: 'OT-2406', trajet: 'Colmar → Dijon', conducteur: 'S. Haas', remorque: 'RQ-08', statut: 'Planifie', color: 'bg-slate-400' },
] as const

const conducteurs = [
  { nom: 'M. Renaud', dispo: 'En mission', pct: 78 },
  { nom: 'J. Mallet', dispo: 'Repos', pct: 0 },
  { nom: 'F. Dupré', dispo: 'Limite HSE', pct: 92 },
  { nom: 'S. Haas', dispo: 'Planifie', pct: 45 },
] as const

export default function FramePlanning() {
  return (
    <div className="h-full rounded-[1.4rem] border border-white/8 bg-slate-950 p-4 text-white">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-[9px] font-semibold uppercase tracking-[0.28em] text-sky-200">Planning</p>
          <p className="mt-0.5 text-sm font-semibold">Affectations — 31 mars 2026</p>
        </div>
        <div className="flex gap-1.5">
          {['Jour', 'Semaine'].map((v, i) => (
            <span key={v} className={`rounded-full border px-2.5 py-0.5 text-[10px] font-semibold ${i === 0 ? 'border-sky-400/40 bg-sky-400/15 text-sky-200' : 'border-white/10 text-slate-300'}`}>{v}</span>
          ))}
        </div>
      </div>

      {/* Timeline mini */}
      <div className="mb-3 space-y-1.5">
        {slots.map(s => (
          <div key={s.ot} className="flex items-center gap-2.5 rounded-[0.95rem] border border-white/8 bg-white/4 px-3 py-2.5">
            <p className="w-9 shrink-0 text-[10px] font-semibold text-slate-300">{s.heure}</p>
            <span className={`h-2 w-2 shrink-0 rounded-full ${s.color}`} />
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-semibold text-white">{s.ot} · {s.trajet}</p>
              <p className="mt-0.5 text-[10px] text-slate-300">{s.conducteur} — {s.remorque}</p>
            </div>
            <span className={`shrink-0 text-[10px] font-semibold ${s.statut === 'Livre' ? 'text-emerald-300' : s.statut === 'En cours' ? 'text-sky-300' : s.statut === 'En attente' ? 'text-amber-300' : 'text-slate-300'}`}>{s.statut}</span>
          </div>
        ))}
      </div>

      {/* Ressources conducteurs */}
      <div className="rounded-[1rem] border border-white/8 bg-white/4 p-3">
        <p className="mb-2 text-[9px] font-semibold uppercase tracking-[0.22em] text-slate-300">Charge conducteurs</p>
        <div className="space-y-2">
          {conducteurs.map(c => (
            <div key={c.nom} className="flex items-center gap-3">
              <p className="w-20 shrink-0 text-[10px] font-medium text-slate-200">{c.nom}</p>
              <div className="flex-1 rounded-full bg-white/8 h-1.5">
                <div className="h-full rounded-full bg-sky-400" style={{ width: `${c.pct}%` }} />
              </div>
              <p className="w-16 shrink-0 text-right text-[10px] text-slate-300">{c.dispo}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
