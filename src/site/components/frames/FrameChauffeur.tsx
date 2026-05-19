const chauffeur = {
  nom: 'François Dupré',
  matricule: 'CHF-048',
  permis: 'CE — exp. 14/08/2027',
  visite: '12/01/2026',
  hse: '42h12 / 45h max',
  statut: 'Limite HSE',
  statutColor: 'text-amber-300',
}

const docs = [
  { type: 'Permis CE', statut: 'Valide', exp: '14/08/2027', color: 'text-emerald-300' },
  { type: 'FIMO/FCO', statut: 'Valide', exp: '02/03/2027', color: 'text-emerald-300' },
  { type: 'Carte conducteur', statut: 'Valide', exp: '30/11/2026', color: 'text-emerald-300' },
  { type: 'Visite médicale', statut: 'A renouveler', exp: '12/01/2026', color: 'text-amber-300' },
] as const

const amendes = [
  { date: '14/03/2026', motif: 'Vitesse A35', montant: '90 €', statut: 'Contestée' },
  { date: '02/02/2026', motif: 'Stationnement', montant: '35 €', statut: 'Traitée' },
] as const

export default function FrameChauffeur() {
  return (
    <div className="h-full rounded-[1.4rem] border border-white/8 bg-slate-950 p-4 text-white">
      {/* Header chauffeur */}
      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-700 text-sm font-bold text-white">FD</div>
        <div>
          <p className="text-sm font-semibold">{chauffeur.nom}</p>
          <p className="text-[10px] text-slate-300">{chauffeur.matricule} · {chauffeur.permis}</p>
        </div>
        <span className={`ml-auto rounded-full border border-white/10 px-2.5 py-0.5 text-[10px] font-semibold ${chauffeur.statutColor}`}>{chauffeur.statut}</span>
      </div>

      {/* HSE */}
      <div className="mb-3 rounded-[1rem] border border-amber-400/20 bg-amber-400/8 px-4 py-3">
        <div className="flex items-center justify-between gap-2">
          <p className="text-[9px] font-semibold uppercase tracking-[0.22em] text-amber-200">Tachygraphe — semaine</p>
          <p className="text-[11px] font-semibold text-amber-200">{chauffeur.hse}</p>
        </div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
          <div className="h-full rounded-full bg-amber-400" style={{ width: '94%' }} />
        </div>
      </div>

      {/* Documents */}
      <div className="mb-3 rounded-[1rem] border border-white/8 bg-white/4 p-3">
        <p className="mb-2 text-[9px] font-semibold uppercase tracking-[0.22em] text-slate-300">Documents</p>
        <div className="grid gap-1.5 lg:grid-cols-2">
          {docs.map(d => (
            <div key={d.type} className="flex items-center justify-between gap-2 rounded-[0.75rem] border border-white/8 bg-white/4 px-3 py-2">
              <p className="text-[10px] text-slate-200">{d.type}</p>
              <span className={`text-[10px] font-semibold ${d.color}`}>{d.statut}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Amendes */}
      <div className="rounded-[1rem] border border-white/8 bg-white/4 p-3">
        <p className="mb-2 text-[9px] font-semibold uppercase tracking-[0.22em] text-slate-300">Amendes</p>
        <div className="space-y-1.5">
          {amendes.map(a => (
            <div key={a.date} className="flex items-center gap-3 text-[10px]">
              <p className="text-slate-300">{a.date}</p>
              <p className="flex-1 text-slate-200">{a.motif}</p>
              <p className="font-semibold text-white">{a.montant}</p>
              <p className={`${a.statut === 'Contestée' ? 'text-amber-300' : 'text-emerald-300'}`}>{a.statut}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
