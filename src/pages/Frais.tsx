import { useEffect, useMemo, useState, type ChangeEvent } from 'react'
import { ROLE_LABELS, useAuth, type Profil, type Role } from '@/lib/auth'
import {
  EXPENSE_CATEGORY_LABELS,
  EXPENSE_STATUS_LABELS,
  approveExpenseTicketAtAccounting,
  approveExpenseTicketAtRh,
  canApproveExpenseAtAccounting,
  canApproveExpenseAtRh,
  createExpenseTicket,
  listExpenseTicketsForViewer,
  rejectExpenseTicket,
  subscribeExpenseTickets,
  type ExpenseCategory,
  type ExpenseTicket,
} from '@/lib/expenseTickets'
import { createExpensePreset, deleteExpensePreset, listExpensePresets, subscribeExpensePresets, type ExpensePreset } from '@/lib/expensePresets'
import { buildStaffDirectory, findStaffMember, staffDisplayName } from '@/lib/staffDirectory'

const inp = 'w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-slate-400'
const CATEGORIES = Object.keys(EXPENSE_CATEGORY_LABELS) as ExpenseCategory[]
const CUSTOM_PRESET = '__custom__'

function isPrivileged(role: Role | null) {
  return role === 'admin' || role === 'dirigeant' || role === 'rh' || role === 'comptable'
}

export default function Frais() {
  const { profil, accountProfil, role } = useAuth()
  const viewerId = profil?.id ?? null
  const [version, setVersion] = useState(0)
  const [presetsVersion, setPresetsVersion] = useState(0)
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('all')
  const [form, setForm] = useState({
    presetId: CUSTOM_PRESET,
    title: '',
    category: 'repas' as ExpenseCategory,
    amount: '0',
    expenseDate: new Date().toISOString().slice(0, 10),
    description: '',
  })
  const [presetForm, setPresetForm] = useState({
    label: '',
    category: 'repas' as ExpenseCategory,
    amount: '0',
  })
  const [receiptFile, setReceiptFile] = useState<File | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const staff = useMemo(() => buildStaffDirectory([profil, accountProfil]), [profil, accountProfil])
  const canManageAll = isPrivileged(role)
  const canManagePresets = role === 'admin' || role === 'dirigeant' || role === 'comptable'
  const employeeFilterId = canManageAll ? (selectedEmployeeId === 'all' ? null : selectedEmployeeId) : viewerId
  const tickets = useMemo(() => {
    void version
    return viewerId && role ? listExpenseTicketsForViewer(viewerId, role, employeeFilterId) : []
  }, [viewerId, role, employeeFilterId, version])
  const presets = useMemo(() => {
    void presetsVersion
    return listExpensePresets()
  }, [presetsVersion])
  const targetStaffMember = findStaffMember(staff, employeeFilterId ?? profil?.id)
  const targetEmployee: Profil | null = targetStaffMember
    ? {
        id: targetStaffMember.id,
        role: targetStaffMember.role,
        prenom: targetStaffMember.prenom,
        nom: targetStaffMember.nom,
        email: targetStaffMember.email,
        domain: targetStaffMember.domain,
        isDemo: true,
      }
    : profil
  const targetEmployeeLabel = targetEmployee
    ? [targetEmployee.prenom ?? '', targetEmployee.nom ?? ''].filter(Boolean).join(' ').trim() || ROLE_LABELS[targetEmployee.role]
    : 'Collaborateur'

  const pendingRh = tickets.filter(ticket => ticket.status === 'submitted')
  const pendingAccounting = tickets.filter(ticket => ticket.status === 'rh_approved')
  const readyForPayroll = tickets.filter(ticket => ticket.status === 'accounting_approved')
  const paid = tickets.filter(ticket => ticket.status === 'paid')
  const selectedPreset = form.presetId === CUSTOM_PRESET ? null : presets.find(item => item.id === form.presetId) ?? null

  useEffect(() => {
    const stopTickets = subscribeExpenseTickets(() => setVersion(current => current + 1))
    const stopPresets = subscribeExpensePresets(() => setPresetsVersion(current => current + 1))
    return () => {
      stopTickets()
      stopPresets()
    }
  }, [])

  useEffect(() => {
    if (!viewerId || !canManageAll) {
      setSelectedEmployeeId(viewerId ?? 'all')
      return
    }
    if (selectedEmployeeId === 'all') return
    if (staff.some(member => member.id === selectedEmployeeId)) return
    setSelectedEmployeeId('all')
  }, [viewerId, canManageAll, selectedEmployeeId, staff])

  if (!profil || !role) return null
  const actor = profil

  function applyPresetSelection(presetId: string) {
    if (presetId === CUSTOM_PRESET) {
      setForm(current => ({ ...current, presetId }))
      return
    }
    const preset = presets.find(item => item.id === presetId)
    if (!preset) return
    setForm(current => ({
      ...current,
      presetId,
      title: preset.label,
      category: preset.category,
      amount: preset.amount.toFixed(2),
    }))
  }

  async function handleSubmitExpense() {
    if (!targetEmployee) {
      setError('Collaborateur introuvable pour la note de frais.')
      return
    }
    const amount = Number.parseFloat(form.amount)
    if (!form.title.trim() || !Number.isFinite(amount) || amount <= 0 || !form.expenseDate) {
      setError('Complete le titre, la date et un montant strictement positif.')
      return
    }
    try {
      await createExpenseTicket({
        employee: targetEmployee,
        actor,
        title: form.title,
        category: form.category,
        presetId: selectedPreset?.id ?? null,
        presetLabel: selectedPreset?.label ?? null,
        amount,
        expenseDate: form.expenseDate,
        description: form.description,
        file: receiptFile,
      })
      setForm({
        presetId: CUSTOM_PRESET,
        title: '',
        category: 'repas',
        amount: '0',
        expenseDate: new Date().toISOString().slice(0, 10),
        description: '',
      })
      setReceiptFile(null)
      setNotice(`Ticket frais cree pour ${targetEmployeeLabel}.`)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Creation du ticket impossible.')
    }
  }

  function handleCreatePreset() {
    const amount = Number.parseFloat(presetForm.amount)
    try {
      createExpensePreset({
        actor,
        label: presetForm.label,
        category: presetForm.category,
        amount,
      })
      setPresetForm({ label: '', category: 'repas', amount: '0' })
      setNotice('Forfait de remboursement ajoute a la liste.')
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Creation du forfait impossible.')
    }
  }

  function handleDeletePreset(preset: ExpensePreset) {
    if (!window.confirm(`Supprimer le forfait "${preset.label}" ?`)) return
    try {
      deleteExpensePreset(preset.id)
      if (form.presetId === preset.id) {
        setForm(current => ({ ...current, presetId: CUSTOM_PRESET }))
      }
      setNotice(`Forfait supprime: ${preset.label}.`)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Suppression du forfait impossible.')
    }
  }

  function handleApproveRh(ticket: ExpenseTicket) {
    try {
      approveExpenseTicketAtRh(ticket.id, actor)
      setNotice(`Ticket valide RH pour ${ticket.employeeName}.`)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Validation RH impossible.')
    }
  }

  function handleApproveAccounting(ticket: ExpenseTicket) {
    try {
      approveExpenseTicketAtAccounting(ticket.id, actor)
      setNotice(`Ticket valide comptabilite pour ${ticket.employeeName}.`)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Validation comptable impossible.')
    }
  }

  function handleReject(ticket: ExpenseTicket) {
    const reason = window.prompt('Motif du refus', ticket.rejectionReason ?? 'Justificatif incomplet')
    if (reason === null) return
    try {
      rejectExpenseTicket(ticket.id, actor, reason)
      setNotice(`Ticket refuse pour ${ticket.employeeName}.`)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Refus impossible.')
    }
  }

  return (
    <div className="space-y-6 p-5 md:p-6">
      <div className="nx-panel px-6 py-5" style={{ background: 'linear-gradient(135deg, #111827 0%, #0f172a 55%, #134e4a 100%)' }}>
        <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-emerald-200/70">Workflow RH x Comptable</p>
        <h2 className="mt-2 text-2xl font-semibold tracking-tight text-white">Frais</h2>
        <p className="mt-1.5 text-sm text-slate-300">
          Declaration des notes de frais, validation RH puis comptable, et integration automatique a la fiche de paie.
        </p>
      </div>

      {(notice || error) && (
        <div className={`rounded-2xl border px-5 py-4 text-sm ${error ? 'border-rose-300/30 bg-rose-950/20 text-rose-200' : 'border-sky-300/30 bg-sky-950/20 text-sky-200'}`}>
          {error ?? notice}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-4">
        <MetricCard label="A valider RH" value={String(pendingRh.length)} />
        <MetricCard label="A valider compta" value={String(pendingAccounting.length)} />
        <MetricCard label="Prets pour paie" value={String(readyForPayroll.length)} />
        <MetricCard label="Integres paie" value={String(paid.length)} />
      </div>

      <div className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">Depot</p>
          <h3 className="mt-2 text-lg font-semibold text-slate-900">Nouvelle note de frais</h3>
          <p className="mt-1 text-sm text-slate-500">Le ticket part automatiquement dans la file RH puis comptable pour validation.</p>

          <div className="mt-5 space-y-4">
            {canManageAll && (
              <Field label="Collaborateur concerne">
                <select className={inp} value={selectedEmployeeId} onChange={event => setSelectedEmployeeId(event.target.value)}>
                  <option value="all">Mon profil</option>
                  {staff.map(member => (
                    <option key={member.id} value={member.id}>{staffDisplayName(member)} - {ROLE_LABELS[member.role]}</option>
                  ))}
                </select>
              </Field>
            )}

            <Field label="Libelle">
              <input className={inp} value={form.title} onChange={event => setForm(current => ({ ...current, title: event.target.value }))} placeholder="Ex: Hotel mission Lyon" />
            </Field>

            <Field label="Forfait de remboursement">
              <select className={inp} value={form.presetId} onChange={event => applyPresetSelection(event.target.value)}>
                <option value={CUSTOM_PRESET}>Tarif libre</option>
                {presets.map(preset => (
                  <option key={preset.id} value={preset.id}>
                    {preset.label} - {preset.amount.toFixed(2)} EUR
                  </option>
                ))}
              </select>
            </Field>

            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Categorie">
                <select className={inp} value={form.category} disabled={Boolean(selectedPreset)} onChange={event => setForm(current => ({ ...current, category: event.target.value as ExpenseCategory }))}>
                  {CATEGORIES.map(category => (
                    <option key={category} value={category}>{EXPENSE_CATEGORY_LABELS[category]}</option>
                  ))}
                </select>
              </Field>
              <Field label="Montant EUR">
                <input className={inp} value={form.amount} disabled={Boolean(selectedPreset)} onChange={event => setForm(current => ({ ...current, amount: event.target.value }))} />
              </Field>
            </div>

            {selectedPreset && (
              <div className="rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-xs text-blue-800">
                Forfait applique automatiquement: <span className="font-semibold">{selectedPreset.label}</span> ({EXPENSE_CATEGORY_LABELS[selectedPreset.category]} - {selectedPreset.amount.toFixed(2)} EUR).
                Passe sur <span className="font-semibold">Tarif libre</span> si tu veux saisir un montant manuel.
              </div>
            )}

            <Field label="Date de depense">
              <input type="date" className={inp} value={form.expenseDate} onChange={event => setForm(current => ({ ...current, expenseDate: event.target.value }))} />
            </Field>

            <Field label="Commentaire">
              <textarea className={`${inp} min-h-[120px] resize-none`} value={form.description} onChange={event => setForm(current => ({ ...current, description: event.target.value }))} placeholder="Contexte de la depense, client, mission, trajet..." />
            </Field>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex flex-wrap items-center gap-3">
                <label className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 cursor-pointer">
                  Ajouter un justificatif
                  <input type="file" accept="application/pdf,image/png,image/jpeg,image/webp" className="hidden" onChange={(event: ChangeEvent<HTMLInputElement>) => setReceiptFile(event.target.files?.[0] ?? null)} />
                </label>
                <span className="text-xs text-slate-500">{receiptFile?.name ?? 'Aucun fichier joint'}</span>
              </div>
            </div>

            <button type="button" onClick={() => void handleSubmitExpense()} className="rounded-xl bg-[color:var(--primary)] px-4 py-3 text-sm font-medium text-white">
              Creer le ticket frais
            </button>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="border-b border-slate-200 px-5 py-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-900">Ticker RH et comptable</p>
                <p className="mt-1 text-xs text-slate-500">Chaque validation fait progresser le ticket jusqu a son integration automatique dans la paie.</p>
              </div>
              {canManageAll && (
                <select className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700" value={selectedEmployeeId} onChange={event => setSelectedEmployeeId(event.target.value)}>
                  <option value="all">Tous les collaborateurs</option>
                  {staff.map(member => (
                    <option key={member.id} value={member.id}>{staffDisplayName(member)}</option>
                  ))}
                </select>
              )}
            </div>
          </div>

          {tickets.length === 0 ? (
            <div className="px-5 py-12 text-center text-sm text-slate-500">Aucune note de frais pour ce filtre.</div>
          ) : (
            <div className="divide-y divide-slate-200">
              {tickets.map(ticket => (
                <ExpenseRow
                  key={ticket.id}
                  ticket={ticket}
                  role={role}
                  onApproveRh={() => handleApproveRh(ticket)}
                  onApproveAccounting={() => handleApproveAccounting(ticket)}
                  onReject={() => handleReject(ticket)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {canManagePresets && (
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="border-b border-slate-200 px-5 py-4">
            <p className="text-sm font-semibold text-slate-900">Forfaits de remboursement</p>
            <p className="mt-1 text-xs text-slate-500">La comptabilite peut ajouter ou supprimer les forfaits disponibles dans la liste deroulante de saisie.</p>
          </div>

          <div className="grid gap-5 p-5 xl:grid-cols-[0.9fr_1.1fr]">
            <div className="space-y-4">
              <Field label="Libelle forfait">
                <input className={inp} value={presetForm.label} onChange={event => setPresetForm(current => ({ ...current, label: event.target.value }))} placeholder="Ex: Forfait decouche" />
              </Field>
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Categorie">
                  <select className={inp} value={presetForm.category} onChange={event => setPresetForm(current => ({ ...current, category: event.target.value as ExpenseCategory }))}>
                    {CATEGORIES.map(category => (
                      <option key={category} value={category}>{EXPENSE_CATEGORY_LABELS[category]}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Montant EUR">
                  <input className={inp} value={presetForm.amount} onChange={event => setPresetForm(current => ({ ...current, amount: event.target.value }))} />
                </Field>
              </div>
              <button type="button" onClick={handleCreatePreset} className="rounded-xl bg-slate-900 px-4 py-3 text-sm font-medium text-white">
                Ajouter le forfait
              </button>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50">
              <div className="border-b border-slate-200 px-4 py-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                Liste active
              </div>
              {presets.length === 0 ? (
                <div className="px-4 py-8 text-sm text-slate-500">Aucun forfait configure.</div>
              ) : (
                <div className="divide-y divide-slate-200">
                  {presets.map(preset => (
                    <div key={preset.id} className="flex items-center justify-between gap-4 px-4 py-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-900">{preset.label}</p>
                        <p className="mt-1 text-xs text-slate-500">
                          {EXPENSE_CATEGORY_LABELS[preset.category]} - {preset.amount.toFixed(2)} EUR
                        </p>
                      </div>
                      <button type="button" onClick={() => handleDeletePreset(preset)} className="rounded-xl border border-rose-200 bg-white px-3 py-2 text-xs font-medium text-rose-700">
                        Supprimer
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function ExpenseRow({
  ticket,
  role,
  onApproveRh,
  onApproveAccounting,
  onReject,
}: {
  ticket: ExpenseTicket
  role: Role
  onApproveRh: () => void
  onApproveAccounting: () => void
  onReject: () => void
}) {
  const canRh = canApproveExpenseAtRh(role) && ticket.status === 'submitted'
  const canAccounting = canApproveExpenseAtAccounting(role) && ticket.status === 'rh_approved'
  const canReject = (canApproveExpenseAtRh(role) || canApproveExpenseAtAccounting(role)) && ticket.status !== 'paid' && ticket.status !== 'rejected'

  return (
    <div className="flex flex-col gap-4 px-5 py-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate text-sm font-semibold text-slate-900">{ticket.title}</p>
            <StatusBadge status={ticket.status} />
            <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
              {EXPENSE_CATEGORY_LABELS[ticket.category]}
            </span>
            {ticket.presetLabel && (
              <span className="rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-blue-700">
                Forfait
              </span>
            )}
          </div>
          <p className="mt-1 text-xs text-slate-500">
            {ticket.employeeName} - {ROLE_LABELS[ticket.employeeRole]} - {new Date(ticket.expenseDate).toLocaleDateString('fr-FR')}
          </p>
          {ticket.presetLabel && (
            <p className="mt-2 text-xs text-blue-700">Bareme applique: {ticket.presetLabel}</p>
          )}
          <p className="mt-2 text-sm text-slate-600">{ticket.description || 'Sans commentaire.'}</p>
          {ticket.rejectionReason && (
            <p className="mt-2 text-xs text-rose-600">Motif refus: {ticket.rejectionReason}</p>
          )}
        </div>

        <div className="text-right">
          <p className="text-lg font-semibold text-slate-900">{ticket.amount.toFixed(2)} EUR</p>
          <p className="mt-1 text-xs text-slate-500">Cree le {new Date(ticket.createdAt).toLocaleString('fr-FR')}</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {ticket.attachment && (
          <>
            <a href={ticket.attachment.url} target="_blank" rel="noreferrer" className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium text-slate-700">
              Ouvrir justificatif
            </a>
            <a href={ticket.attachment.url} download={ticket.attachment.name} className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium text-slate-700">
              Telecharger
            </a>
          </>
        )}
        {canRh && (
          <button type="button" onClick={onApproveRh} className="rounded-xl bg-emerald-600 px-3 py-2 text-xs font-medium text-white">
            Valider RH
          </button>
        )}
        {canAccounting && (
          <button type="button" onClick={onApproveAccounting} className="rounded-xl bg-blue-600 px-3 py-2 text-xs font-medium text-white">
            Valider compta
          </button>
        )}
        {canReject && (
          <button type="button" onClick={onReject} className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700">
            Refuser
          </button>
        )}
      </div>
    </div>
  )
}

function StatusBadge({ status }: { status: ExpenseTicket['status'] }) {
  const className =
    status === 'paid'
      ? 'bg-emerald-100 text-emerald-700'
      : status === 'accounting_approved'
        ? 'bg-blue-100 text-blue-700'
        : status === 'rh_approved'
          ? 'bg-amber-100 text-amber-700'
          : status === 'rejected'
            ? 'bg-rose-100 text-rose-700'
            : 'bg-slate-100 text-slate-600'

  return (
    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] ${className}`}>
      {EXPENSE_STATUS_LABELS[status]}
    </span>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-slate-700">{label}</span>
      {children}
    </label>
  )
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="nx-panel px-5 py-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-white">{value}</p>
    </div>
  )
}
