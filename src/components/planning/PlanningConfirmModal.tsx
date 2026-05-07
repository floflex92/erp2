type Props = {
  message: string
  onCancel: () => void
  onConfirm: () => void
}

export default function PlanningConfirmModal({ message, onCancel, onConfirm }: Props) {
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[70]" onClick={onCancel}>
      <div className="bg-slate-900 border border-slate-700 rounded-xl p-5 w-full max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>
        <p className="text-sm text-white mb-4">{message}</p>
        <div className="flex justify-end gap-2">
          <button onClick={onCancel} className="px-3 py-2 text-sm text-muted hover:text-white transition-colors">Annuler</button>
          <button onClick={onConfirm} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-xl transition-colors">Confirmer</button>
        </div>
      </div>
    </div>
  )
}