import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/lib/auth'
import {
  EXPENSE_CATEGORY_LABELS,
  createExpenseTicket,
  type ExpenseCategory,
} from '@/lib/expenseTickets'

const CATEGORY_ICONS: Record<ExpenseCategory, string> = {
  repas: '🍽',
  hebergement: '🏨',
  carburant: '⛽',
  peage: '🛣',
  stationnement: '🅿',
  representation: '🤝',
  autre: '📎',
}

const CATEGORIES = Object.keys(EXPENSE_CATEGORY_LABELS) as ExpenseCategory[]

export default function FraisRapide() {
  const { profil } = useAuth()
  const navigate = useNavigate()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [category, setCategory] = useState<ExpenseCategory | null>(null)
  const [amount, setAmount] = useState('')
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().slice(0, 10))
  const [description, setDescription] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0] ?? null
    setFile(selected)
    if (selected) {
      const url = URL.createObjectURL(selected)
      setPreview(url)
    } else {
      setPreview(null)
    }
  }

  function resetForm() {
    setCategory(null)
    setAmount('')
    setDescription('')
    setFile(null)
    setPreview(null)
    setExpenseDate(new Date().toISOString().slice(0, 10))
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!profil) { setError('Profil introuvable.'); return }
    if (!category) { setError('Selectionnez une categorie.'); return }
    const parsedAmount = parseFloat(amount.replace(',', '.'))
    if (isNaN(parsedAmount) || parsedAmount <= 0) { setError('Montant invalide.'); return }

    setSaving(true)
    setError(null)
    try {
      await createExpenseTicket({
        employee: profil,
        actor: profil,
        title: EXPENSE_CATEGORY_LABELS[category] + (description.trim() ? ` - ${description.trim()}` : ''),
        category,
        amount: parsedAmount,
        expenseDate,
        description: description.trim(),
        file: file ?? null,
      })
      setSuccess(true)
      resetForm()
      window.setTimeout(() => setSuccess(false), 3500)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la soumission.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-5 p-4 md:p-6 max-w-xl mx-auto">
      <div className="nx-panel px-4 py-5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[color:var(--primary)]">Saisie rapide</p>
        <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">Note de frais</h2>
        <p className="mt-1 text-sm text-slate-600">Photographiez votre justificatif et saisissez le montant en 3 taps.</p>
      </div>

      {success && (
        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">
          ✓ Note de frais soumise avec succes !
        </div>
      )}
      {error && (
        <div className="rounded-2xl border border-rose-500/20 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      )}

      <form onSubmit={e => void handleSubmit(e)} className="space-y-5">
        {/* Photo justificatif */}
        <div className="nx-panel p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 mb-3">📷 Justificatif</p>
          {preview ? (
            <div className="relative">
              <img src={preview} alt="Justificatif" className="w-full rounded-xl object-cover max-h-56 border border-slate-200" />
              <button
                type="button"
                onClick={() => { setFile(null); setPreview(null); if (fileInputRef.current) fileInputRef.current.value = '' }}
                className="absolute top-2 right-2 rounded-full bg-slate-900/80 px-2 py-1 text-[11px] font-semibold text-white"
              >
                Supprimer
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 py-8 text-center hover:border-[color:var(--primary)] hover:bg-slate-100 transition-colors"
            >
              <span className="block text-3xl mb-2">📷</span>
              <span className="block text-sm font-semibold text-slate-600">Prendre une photo ou importer</span>
              <span className="block text-xs text-slate-400 mt-1">Ticket de caisse, facture, recu...</span>
            </button>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleFileChange}
            className="sr-only"
            aria-label="Justificatif photo"
          />
        </div>

        {/* Categorie */}
        <div className="nx-panel p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 mb-3">Categorie</p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {CATEGORIES.map(cat => (
              <button
                key={cat}
                type="button"
                onClick={() => setCategory(cat)}
                className={`rounded-xl border py-3 px-2 text-center transition-colors ${
                  category === cat
                    ? 'border-[color:var(--primary)] bg-[color:var(--primary)]/10 font-bold text-[color:var(--primary)]'
                    : 'border-slate-200 bg-white text-slate-700 hover:border-slate-400'
                }`}
              >
                <span className="block text-2xl mb-1">{CATEGORY_ICONS[cat]}</span>
                <span className="block text-[11px] font-semibold leading-tight">{EXPENSE_CATEGORY_LABELS[cat]}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Montant et date */}
        <div className="nx-panel p-4 space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 mb-2">
              Montant (€) *
            </label>
            <input
              type="number"
              inputMode="decimal"
              step="0.01"
              min="0.01"
              required
              placeholder="0,00"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-4 text-2xl font-bold text-slate-900 outline-none focus:border-[color:var(--primary)] text-center"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 mb-2">
              Date
            </label>
            <input
              type="date"
              value={expenseDate}
              onChange={e => setExpenseDate(e.target.value)}
              required
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm text-slate-800 outline-none focus:border-[color:var(--primary)]"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 mb-2">
              Commentaire (optionnel)
            </label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Ex: repas client, autoroute A7, hotel Ibis Lyon..."
              rows={2}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 outline-none focus:border-[color:var(--primary)] resize-none"
            />
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <button
            type="submit"
            disabled={saving || !category || !amount}
            className="w-full rounded-2xl bg-[color:var(--primary)] py-4 text-base font-bold text-white hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            {saving ? 'Envoi en cours...' : '✓ Soumettre la note de frais'}
          </button>
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="w-full rounded-2xl border border-slate-300 bg-white py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Annuler
          </button>
        </div>
      </form>
    </div>
  )
}
