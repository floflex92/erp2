import type { OT } from '@/pages/planning/planningTypes'

type Props = {
  ot: OT
  newDeliveryDate: string
  comment: string
  saving: boolean
  onClose: () => void
  onChangeNewDeliveryDate: (value: string) => void
  onChangeComment: (value: string) => void
  onSubmit: () => void
}

export default function PlanningRetardModal({ ot, newDeliveryDate, comment, saving, onClose, onChangeNewDeliveryDate, onChangeComment, onSubmit }: Props) {
  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[170] p-4" onClick={onClose}>
      <div className="bg-slate-900 border border-red-800/50 rounded-2xl w-full max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="p-5 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-red-500/20 border border-red-500/30 flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 text-red-400" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a10 10 0 1 0 0 20A10 10 0 0 0 12 2zm0 11a1 1 0 0 1-1-1V7a1 1 0 0 1 2 0v5a1 1 0 0 1-1 1zm0 4a1 1 0 1 1 0-2 1 1 0 0 1 0 2z"/></svg>
            </div>
            <div>
              <h3 className="text-base font-semibold text-white">Gérer le retard</h3>
              <p className="text-xs text-muted mt-0.5">{ot.reference} · {ot.client_nom}</p>
            </div>
            <button type="button" onClick={onClose} className="ml-auto text-discreet hover:text-white">
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M18 6 6 18M6 6l12 12"/></svg>
            </button>
          </div>
        </div>
        <div className="p-5 space-y-4">
          <div className="rounded-xl bg-red-950/30 border border-red-800/30 p-3 text-xs text-red-300">
            Date de livraison prévue : <span className="font-bold">{ot.date_livraison_prevue?.slice(0, 16).replace('T', ' ') ?? '—'}</span>
            <br/>
            Retard : <span className="font-bold text-red-200">{ot.date_livraison_prevue ? `+${Math.floor((Date.now() - new Date(ot.date_livraison_prevue).getTime()) / 3600000)}h` : '—'}</span>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">Reporter la date de livraison (optionnel)</label>
            <input type="datetime-local" className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none" value={newDeliveryDate} onChange={e => onChangeNewDeliveryDate(e.target.value)} />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">Commentaire / motif du retard</label>
            <textarea className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none resize-none" rows={3} placeholder="Embouteillage, problème mécanique, client absent..." value={comment} onChange={e => onChangeComment(e.target.value)} />
          </div>
        </div>
        <div className="p-4 border-t border-slate-800 flex gap-3 justify-end">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-muted hover:text-white transition-colors">Annuler</button>
          <button type="button" disabled={saving} onClick={onSubmit} className="px-5 py-2 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition-colors">
            {saving ? 'Enregistrement...' : 'Valider le retard'}
          </button>
        </div>
      </div>
    </div>
  )
}