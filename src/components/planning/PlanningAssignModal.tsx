import type { AbsenceRh } from '@/lib/absencesRh'
import { STATUT_LABEL } from '@/pages/planning/planningUtils'
import type { Conducteur, OT, Remorque, Vehicule } from '@/pages/planning/planningTypes'

type AssignModalState = {
  ot: OT
  conducteur_id: string
  vehicule_id: string
  remorque_id: string
  date_chargement: string
  time_chargement: string
  date_livraison: string
  time_livraison: string
  applyToGroupage: boolean
}

type AssignScheduleMeta = {
  valid: boolean
  durationMinutes: number
}

type Props = {
  assignModal: AssignModalState
  assignGroupMembers: OT[]
  assignScheduleMeta: AssignScheduleMeta
  assignDurationLabel: string
  assignKeepDuration: boolean
  assignSaving: boolean
  conducteurs: Conducteur[]
  vehicules: Vehicule[]
  remorques: Remorque[]
  getEffectiveOtLegacyStatus: (ot: OT) => string
  getGroupageBubbleLabel: (ot: OT) => string | null
  getConducteurAbsencesForPeriod: (conducteurId: string, dateDebut: string, dateFin: string) => AbsenceRh[]
  onClose: () => void
  onSetApplyToGroupage: (next: boolean) => void
  onSetKeepDuration: (next: boolean) => void
  onUpdateAssignStart: (nextDate: string, nextTime: string) => void
  onSetDateLivraison: (nextDate: string) => void
  onSetTimeLivraison: (nextTime: string) => void
  onShiftAssignStart: (deltaMinutes: number) => void
  onApplyAssignDuration: (durationMinutes: number) => void
  onUpdateResource: (key: 'conducteur_id' | 'vehicule_id' | 'remorque_id', value: string) => void
  onSave: () => void
}

export default function PlanningAssignModal({
  assignModal,
  assignGroupMembers,
  assignScheduleMeta,
  assignDurationLabel,
  assignKeepDuration,
  assignSaving,
  conducteurs,
  vehicules,
  remorques,
  getEffectiveOtLegacyStatus,
  getGroupageBubbleLabel,
  getConducteurAbsencesForPeriod,
  onClose,
  onSetApplyToGroupage,
  onSetKeepDuration,
  onUpdateAssignStart,
  onSetDateLivraison,
  onSetTimeLivraison,
  onShiftAssignStart,
  onApplyAssignDuration,
  onUpdateResource,
  onSave,
}: Props) {
  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[160] p-4" onClick={onClose}>
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-5xl shadow-2xl max-h-[88vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="p-5 border-b border-slate-800">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base font-semibold text-white">Reglage course planning</h3>
            <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold bg-slate-800 text-slate-300">{STATUT_LABEL[getEffectiveOtLegacyStatus(assignModal.ot)] ?? getEffectiveOtLegacyStatus(assignModal.ot)}</span>
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${assignScheduleMeta.valid ? 'bg-emerald-500/20 text-emerald-200' : 'bg-rose-500/20 text-rose-200'}`}>
              Duree: {assignDurationLabel}
            </span>
          </div>
          <p className="text-muted text-sm mt-1 flex flex-wrap items-center gap-2">
            <span className="font-mono">{assignModal.ot.reference}</span>
            <span className="text-secondary">-</span><span>{assignModal.ot.client_nom}</span>
            {assignModal.ot.prix_ht && <span className="ml-auto text-discreet">{assignModal.ot.prix_ht.toFixed(0)} EUR HT</span>}
          </p>
        </div>

        <div className="p-5 overflow-y-auto space-y-4">
          {assignGroupMembers.length > 1 && (
            <div className="rounded-xl border border-indigo-500/20 bg-indigo-500/10 p-3 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <button type="button" onClick={() => onSetApplyToGroupage(false)} className={`rounded-full px-3 py-1.5 text-[11px] font-semibold transition-colors ${assignModal.applyToGroupage ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-surface text-heading'}`}>
                  Modifier cette course
                </button>
                <button type="button" onClick={() => onSetApplyToGroupage(true)} className={`rounded-full px-3 py-1.5 text-[11px] font-semibold transition-colors ${assignModal.applyToGroupage ? 'bg-indigo-400 text-slate-950' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}>
                  Modifier la mission
                </button>
              </div>
              <p className="text-[11px] text-indigo-100/90">
                {assignModal.applyToGroupage
                  ? `Cette programmation s'appliquera aux ${assignGroupMembers.length} courses de la mission ${getGroupageBubbleLabel(assignModal.ot)}.`
                  : `Seule la course ${assignModal.ot.reference} sera modifiee. Le reste de la mission restera inchange.`}
              </p>
            </div>
          )}

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            <section className="rounded-xl border border-slate-800 bg-slate-900/70 p-4 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-[11px] font-bold uppercase tracking-wider text-muted">Planification</p>
                <label className="inline-flex items-center gap-2 text-[11px] text-slate-300">
                  <input type="checkbox" checked={assignKeepDuration} onChange={event => onSetKeepDuration(event.target.checked)} />
                  Conserver la duree
                </label>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="text-xs font-medium text-muted">Date chargement</span>
                  <input type="date" value={assignModal.date_chargement} onChange={e => onUpdateAssignStart(e.target.value, assignModal.time_chargement)} className="mt-1 w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-white text-sm outline-none focus:border-slate-500 transition-colors" />
                </label>
                <label className="block">
                  <span className="text-xs font-medium text-muted">Heure depart</span>
                  <input type="time" step={900} value={assignModal.time_chargement} onChange={e => onUpdateAssignStart(assignModal.date_chargement, e.target.value)} className="mt-1 w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-white text-sm outline-none focus:border-slate-500 transition-colors" />
                </label>
                <label className="block">
                  <span className="text-xs font-medium text-muted">Date livraison</span>
                  <input type="date" value={assignModal.date_livraison} onChange={e => onSetDateLivraison(e.target.value)} className="mt-1 w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-white text-sm outline-none focus:border-slate-500 transition-colors" />
                </label>
                <label className="block">
                  <span className="text-xs font-medium text-muted">Heure arrivee</span>
                  <input type="time" step={900} value={assignModal.time_livraison} onChange={e => onSetTimeLivraison(e.target.value)} className="mt-1 w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-white text-sm outline-none focus:border-slate-500 transition-colors" />
                </label>
              </div>

              <div className="rounded-xl border border-slate-700/70 bg-slate-800/60 p-3 space-y-2">
                <p className="text-[11px] font-semibold text-slate-300">Ajustements rapides</p>
                <div className="flex flex-wrap gap-2">
                  <button type="button" onClick={() => onShiftAssignStart(-30)} className="px-2.5 py-1 rounded-lg text-[11px] border border-slate-600 text-slate-200 hover:border-slate-400">Depart -30 min</button>
                  <button type="button" onClick={() => onShiftAssignStart(30)} className="px-2.5 py-1 rounded-lg text-[11px] border border-slate-600 text-slate-200 hover:border-slate-400">Depart +30 min</button>
                  <button type="button" onClick={() => onShiftAssignStart(60)} className="px-2.5 py-1 rounded-lg text-[11px] border border-slate-600 text-slate-200 hover:border-slate-400">Depart +1h</button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {[120, 240, 480, 600].map(minutes => (
                    <button key={minutes} type="button" onClick={() => onApplyAssignDuration(minutes)} className="px-2.5 py-1 rounded-lg text-[11px] border border-slate-600 text-slate-200 hover:border-slate-400">
                      Duree {minutes >= 60 ? `${Math.floor(minutes / 60)}h` : `${minutes} min`}
                    </button>
                  ))}
                </div>
              </div>
            </section>

            <section className="rounded-xl border border-slate-800 bg-slate-900/70 p-4 space-y-3">
              <p className="text-[11px] font-bold uppercase tracking-wider text-muted">Ressources</p>
              {[
                {
                  label: 'Conducteur',
                  key: 'conducteur_id' as const,
                  items: conducteurs.map(c => {
                    const isAbsent = getConducteurAbsencesForPeriod(c.id, assignModal.date_chargement, assignModal.date_livraison).length > 0
                    return { id: c.id, label: `${c.prenom} ${c.nom}${isAbsent ? ' ? ABSENT' : ''}`, absent: isAbsent }
                  }).sort((a, b) => (a.absent ? 1 : 0) - (b.absent ? 1 : 0)),
                  placeholder: 'Non affecte',
                },
                {
                  label: 'Camion',
                  key: 'vehicule_id' as const,
                  items: vehicules.map(v => ({ id: v.id, label: `${v.immatriculation}${v.marque ? ` - ${v.marque}` : ''}`, absent: false })),
                  placeholder: 'Non affecte',
                },
                {
                  label: 'Remorque',
                  key: 'remorque_id' as const,
                  items: remorques.map(r => ({ id: r.id, label: `${r.immatriculation} - ${r.type_remorque}`, absent: false })),
                  placeholder: 'Sans remorque',
                },
              ].map(({ label, key, items, placeholder }) => (
                <label key={key} className="block">
                  <span className="text-xs font-medium text-muted">{label}</span>
                  <select value={assignModal[key]} onChange={e => onUpdateResource(key, e.target.value)} className="mt-1 w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-white text-sm outline-none focus:border-slate-500 transition-colors">
                    <option value="">{placeholder}</option>
                    {items.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}
                  </select>
                </label>
              ))}

              <div className="rounded-xl border border-slate-700/70 bg-slate-800/60 p-3">
                <p className="text-[11px] text-slate-300 font-semibold">Controle planning</p>
                <p className={`text-xs mt-1 ${assignScheduleMeta.valid ? 'text-emerald-300' : 'text-rose-300'}`}>
                  {assignScheduleMeta.valid ? `Fenetre valide: ${assignDurationLabel} planifiee.` : 'Fenetre invalide: la livraison doit etre apres le chargement.'}
                </p>
              </div>
            </section>
          </div>
        </div>

        <div className="p-5 border-t border-slate-800 flex gap-3 justify-end bg-slate-900/95">
          <button onClick={onClose} className="px-4 py-2 text-sm text-muted hover:text-white transition-colors">Annuler</button>
          <button onClick={onSave} disabled={assignSaving} className="px-5 py-2.5 bg-surface text-heading text-sm font-semibold rounded-xl hover:bg-surface-2 disabled:opacity-50 transition-colors">
            {assignSaving ? 'Enregistrement...' : 'Placer sur le planning'}
          </button>
        </div>
      </div>
    </div>
  )
}