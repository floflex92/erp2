import type { OT, RowConflict } from '@/pages/planning/planningTypes'

type Props = {
  isOpen: boolean
  rowId: string
  resourceLabel: string
  conflicts: RowConflict[]
  canResolveConflicts: boolean
  canGroupage: boolean
  resolvingRowId: string | null
  conflictActionKey: string | null
  onClose: () => void
  onResolveRow: (rowId: string) => void
  onApplyGroupage: (conflict: RowConflict, freezeGroupage: boolean) => void
  sharesSameGroupage: (first: OT, second: OT) => boolean
  formatMinutes: (minutes: number) => string
  isoToDate: (value: string | null) => string
  isoToTime: (value: string | null) => string
}

export default function PlanningConflictModal({
  isOpen,
  rowId,
  resourceLabel,
  conflicts,
  canResolveConflicts,
  canGroupage,
  resolvingRowId,
  conflictActionKey,
  onClose,
  onResolveRow,
  onApplyGroupage,
  sharesSameGroupage,
  formatMinutes,
  isoToDate,
  isoToTime,
}: Props) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[160] p-4" onClick={onClose}>
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-2xl shadow-2xl" onClick={event => event.stopPropagation()}>
        <div className="p-5 border-b border-slate-800 flex items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-semibold text-white">Details des conflits</h3>
            <p className="text-xs text-muted mt-0.5">{resourceLabel} - {conflicts.length} chevauchement{conflicts.length > 1 ? 's' : ''}</p>
          </div>
          <div className="flex items-center gap-2">
            {canResolveConflicts && conflicts.length > 0 && (
              <button
                type="button"
                onClick={() => onResolveRow(rowId)}
                disabled={resolvingRowId === rowId}
                className="px-3 py-2 rounded-lg text-xs font-semibold bg-rose-600 text-white hover:bg-rose-500 disabled:opacity-60 transition-colors"
              >
                {resolvingRowId === rowId ? 'Resolution...' : 'Resoudre automatiquement'}
              </button>
            )}
            <button onClick={onClose} className="px-3 py-2 text-xs text-slate-300 hover:text-white border border-slate-700 rounded-lg transition-colors">Fermer</button>
          </div>
        </div>

        <div className="p-5 max-h-[65vh] overflow-auto space-y-2">
          {conflicts.length === 0 ? (
            <p className="text-sm text-muted">Aucun conflit detecte sur la periode affichee.</p>
          ) : conflicts.map((conflict, index) => {
            const sameGroupage = sharesSameGroupage(conflict.first, conflict.second)
            const frozenGroupage = sameGroupage && (conflict.first.groupage_fige || conflict.second.groupage_fige)
            const linkActionKey = `${conflict.first.id}:${conflict.second.id}:link`
            const freezeActionKey = `${conflict.first.id}:${conflict.second.id}:freeze`

            return (
              <div key={`${conflict.first.id}-${conflict.second.id}-${index}`} className="rounded-xl border border-slate-700/70 bg-slate-800/50 p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm text-white font-mono">{conflict.first.reference} / {conflict.second.reference}</p>
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 font-semibold">{formatMinutes(conflict.overlapMinutes)}</span>
                </div>

                <p className="text-xs text-muted mt-1">
                  {isoToDate(conflict.first.date_chargement_prevue)} {isoToTime(conflict.first.date_chargement_prevue)} - {isoToDate(conflict.first.date_livraison_prevue)} {isoToTime(conflict.first.date_livraison_prevue)}
                </p>
                <p className="text-xs text-discreet mt-0.5">
                  {isoToDate(conflict.second.date_chargement_prevue)} {isoToTime(conflict.second.date_chargement_prevue)} - {isoToDate(conflict.second.date_livraison_prevue)} {isoToTime(conflict.second.date_livraison_prevue)}
                </p>

                <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                  <p className="text-[11px] text-muted">
                    {frozenGroupage
                      ? 'Lot deja verrouille sur cette paire.'
                      : sameGroupage
                      ? 'Lot deliable deja cree. Vous pouvez maintenant le verrouiller.'
                      : 'Proposer un groupage deliable ou valider un lot verrouille pour cette paire.'}
                  </p>
                  <div className="flex flex-wrap items-center gap-2">
                    {canGroupage ? (
                      <>
                        <button
                          type="button"
                          onClick={() => onApplyGroupage(conflict, false)}
                          disabled={sameGroupage || conflictActionKey !== null}
                          className="px-3 py-1.5 rounded-lg text-[11px] font-semibold border border-emerald-500/35 bg-emerald-500/10 text-emerald-200 hover:bg-emerald-500/20 disabled:opacity-50 disabled:hover:bg-emerald-500/10 transition-colors"
                        >
                          {conflictActionKey === linkActionKey ? 'Creation...' : sameGroupage ? 'Deja groupees' : 'Proposer groupage'}
                        </button>
                        <button
                          type="button"
                          onClick={() => onApplyGroupage(conflict, true)}
                          disabled={frozenGroupage || conflictActionKey !== null}
                          className="px-3 py-1.5 rounded-lg text-[11px] font-semibold border border-indigo-500/35 bg-indigo-500/10 text-indigo-200 hover:bg-indigo-500/20 disabled:opacity-50 disabled:hover:bg-indigo-500/10 transition-colors"
                        >
                          {conflictActionKey === freezeActionKey ? 'Validation...' : frozenGroupage ? 'Lot verrouille' : sameGroupage ? 'Verrouiller le lot' : 'Valider et verrouiller'}
                        </button>
                      </>
                    ) : (
                      <span className="text-[11px] text-discreet">Actions de groupage desactivees</span>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}