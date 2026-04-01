import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '@/lib/auth'
import { listApprovedExpenseTicketsForPeriod, subscribeExpenseTickets, sumApprovedExpenseReimbursements } from '@/lib/expenseTickets'
import { ensureEmployeeRecord, getEmployeeRecord, listEmployeeRecords, subscribeEmployeeRecords } from '@/lib/employeeRecords'
import { calculatePayrollPreview, createPayrollSlip, listPayrollSlips, savePayrollConfig, subscribePayroll } from '@/lib/payroll'
import { buildStaffDirectory, findStaffMember, staffDisplayName } from '@/lib/staffDirectory'

const inp = 'w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-slate-400'

function formatMoney(value: unknown) {
  const amount = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(amount) ? amount.toFixed(2) : '0.00'
}

function formatDateTime(value: unknown) {
  if (typeof value !== 'string' || !value.trim()) return 'Date inconnue'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? 'Date inconnue' : date.toLocaleString('fr-FR')
}

export default function Paie() {
  const { profil, accountProfil } = useAuth()
  const staff = useMemo(() => buildStaffDirectory([profil, accountProfil]), [profil, accountProfil])
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('')
  const [, setRecordsVersion] = useState(0)
  const [, setPayrollVersion] = useState(0)
  const [, setExpensesVersion] = useState(0)
  const [notice, setNotice] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState({
    conventionCollective: 'CCN transports routiers et activites auxiliaires du transport - IDCC 16',
    jobCoefficient: '',
    hourlyRate: '13.25',
    monthlyBaseHours: '151.67',
    contractType: 'CDI',
    jobTitle: '',
    periodLabel: 'Mars 2026',
    workedHours: '151.67',
    overtime25Hours: '8',
    overtime50Hours: '2',
    absenceHours: '0',
    mealAllowance: '180',
    transportBonus: '95',
    performanceBonus: '120',
    exceptionalBonus: '0',
    manualExpenseAdjustment: '0',
    incomeTaxWithholding: '0',
    advanceDeduction: '0',
    otherDeduction: '0',
  })

  useEffect(() => {
    if (selectedEmployeeId || staff.length === 0) return
    setSelectedEmployeeId(staff[0].id)
  }, [selectedEmployeeId, staff])

  useEffect(() => {
    const stopRecords = subscribeEmployeeRecords(() => setRecordsVersion(current => current + 1))
    const stopPayroll = subscribePayroll(() => setPayrollVersion(current => current + 1))
    const stopExpenses = subscribeExpenseTickets(() => setExpensesVersion(current => current + 1))
    return () => {
      stopRecords()
      stopPayroll()
      stopExpenses()
    }
  }, [])

  const employee = findStaffMember(staff, selectedEmployeeId)
  const employeeRecord = !employee
    ? null
    : getEmployeeRecord(employee.id) ?? ensureEmployeeRecord({
        employeeId: employee.id,
        role: employee.role,
        firstName: employee.prenom,
        lastName: employee.nom,
        professionalEmail: employee.email,
        loginEmail: employee.email,
        jobTitle: employee.domain,
      })
  const slips = listPayrollSlips(selectedEmployeeId || null)
  const employeeRecords = listEmployeeRecords()
  const autoExpenseAmount = employee ? sumApprovedExpenseReimbursements(employee.id, form.periodLabel) : 0
  const approvedExpenseTickets = employee ? listApprovedExpenseTicketsForPeriod(employee.id, form.periodLabel) : []

  useEffect(() => {
    if (!employeeRecord) return
    setForm(current => ({
      ...current,
      conventionCollective: employeeRecord.conventionCollective ?? current.conventionCollective,
      jobCoefficient: employeeRecord.jobCoefficient ?? current.jobCoefficient,
      hourlyRate: employeeRecord.hourlyRate?.toString() ?? current.hourlyRate,
      monthlyBaseHours: employeeRecord.monthlyBaseHours.toString(),
      contractType: employeeRecord.contractType ?? current.contractType,
      jobTitle: employeeRecord.jobTitle ?? current.jobTitle,
    }))
  }, [employeeRecord])

  const preview = useMemo(() => {
    if (!employeeRecord) return null
    return calculatePayrollPreview(employeeRecord, {
      periodLabel: form.periodLabel,
      workedHours: Number.parseFloat(form.workedHours) || 0,
      overtime25Hours: Number.parseFloat(form.overtime25Hours) || 0,
      overtime50Hours: Number.parseFloat(form.overtime50Hours) || 0,
      absenceHours: Number.parseFloat(form.absenceHours) || 0,
      mealAllowance: Number.parseFloat(form.mealAllowance) || 0,
      transportBonus: Number.parseFloat(form.transportBonus) || 0,
      performanceBonus: Number.parseFloat(form.performanceBonus) || 0,
      exceptionalBonus: Number.parseFloat(form.exceptionalBonus) || 0,
      manualExpenseAdjustment: Number.parseFloat(form.manualExpenseAdjustment) || 0,
      incomeTaxWithholding: Number.parseFloat(form.incomeTaxWithholding) || 0,
      advanceDeduction: Number.parseFloat(form.advanceDeduction) || 0,
      otherDeduction: Number.parseFloat(form.otherDeduction) || 0,
    })
  }, [employeeRecord, form])

  if (!profil) return null
  const currentProfil = profil

  function saveConfig() {
    if (!employee) return
    savePayrollConfig(employee.id, {
      conventionCollective: form.conventionCollective || undefined,
      jobCoefficient: form.jobCoefficient || null,
      hourlyRate: Number.parseFloat(form.hourlyRate),
      monthlyBaseHours: Number.parseFloat(form.monthlyBaseHours),
      contractType: form.contractType || null,
      jobTitle: form.jobTitle || null,
    })
    setNotice(`Parametres paie enregistres pour ${staffDisplayName(employee)}.`)
    setError(null)
  }

  function generateSlip() {
    if (!employee) return
    try {
      createPayrollSlip(employee, currentProfil, {
        periodLabel: form.periodLabel,
        workedHours: Number.parseFloat(form.workedHours),
        overtime25Hours: Number.parseFloat(form.overtime25Hours),
        overtime50Hours: Number.parseFloat(form.overtime50Hours),
        absenceHours: Number.parseFloat(form.absenceHours),
        mealAllowance: Number.parseFloat(form.mealAllowance),
        transportBonus: Number.parseFloat(form.transportBonus),
        performanceBonus: Number.parseFloat(form.performanceBonus),
        exceptionalBonus: Number.parseFloat(form.exceptionalBonus),
        manualExpenseAdjustment: Number.parseFloat(form.manualExpenseAdjustment),
        incomeTaxWithholding: Number.parseFloat(form.incomeTaxWithholding),
        advanceDeduction: Number.parseFloat(form.advanceDeduction),
        otherDeduction: Number.parseFloat(form.otherDeduction),
      })
      setNotice(`Bulletin de paie genere pour ${staffDisplayName(employee)}.`)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Generation paie impossible.')
    }
  }

  return (
    <div className="space-y-6 p-5 md:p-6">
      <div className="nx-panel px-6 py-5" style={{ background: 'linear-gradient(135deg, #111827 0%, #0f172a 55%, #1d4ed8 100%)' }}>
        <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-blue-200/70">RH x Comptable</p>
        <h2 className="mt-2 text-2xl font-semibold tracking-tight text-white">Paie</h2>
        <p className="mt-1.5 text-sm text-slate-300">Parametrage metier, variables mensuelles, generation PDF et archivage direct dans le coffre salarie.</p>
      </div>

      {(notice || error) && (
        <div className={`rounded-2xl border px-5 py-4 text-sm ${error ? 'border-rose-300/30 bg-rose-950/20 text-rose-200' : 'border-sky-300/30 bg-sky-950/20 text-sky-200'}`}>
          {error ?? notice}
        </div>
      )}

      <div className="grid gap-5 xl:grid-cols-[0.8fr_1.2fr]">
        <div className="nx-panel px-5 py-5">
          <Field label="Collaborateur">
            <select className={inp} value={selectedEmployeeId} onChange={event => setSelectedEmployeeId(event.target.value)}>
              {staff.map(member => (
                <option key={member.id} value={member.id}>{staffDisplayName(member)} - {member.matricule}</option>
              ))}
            </select>
          </Field>

          {employeeRecord && (
            <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 px-4 py-4">
              <p className="text-sm font-semibold text-white">{employeeRecord.firstName} {employeeRecord.lastName}</p>
              <p className="mt-1 text-xs font-mono text-slate-300">Matricule: {employeeRecord.matricule}</p>
              <p className="mt-1 text-xs text-slate-400">{employeeRecord.professionalEmail}</p>
              <p className="mt-1 text-xs text-slate-500">{employeeRecord.conventionCollective}</p>
            </div>
          )}

          <div className="mt-4 grid gap-4">
            <Field label="Convention collective">
              <input className={inp} value={form.conventionCollective} onChange={event => setForm(current => ({ ...current, conventionCollective: event.target.value }))} />
            </Field>
            <Field label="Coefficient metier">
              <input className={inp} value={form.jobCoefficient} onChange={event => setForm(current => ({ ...current, jobCoefficient: event.target.value }))} />
            </Field>
            <Field label="Intitule poste">
              <input className={inp} value={form.jobTitle} onChange={event => setForm(current => ({ ...current, jobTitle: event.target.value }))} />
            </Field>
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Taux horaire">
                <input className={inp} value={form.hourlyRate} onChange={event => setForm(current => ({ ...current, hourlyRate: event.target.value }))} />
              </Field>
              <Field label="Base mensuelle heures">
                <input className={inp} value={form.monthlyBaseHours} onChange={event => setForm(current => ({ ...current, monthlyBaseHours: event.target.value }))} />
              </Field>
            </div>
            <Field label="Type contrat">
              <input className={inp} value={form.contractType} onChange={event => setForm(current => ({ ...current, contractType: event.target.value }))} />
            </Field>
            <button type="button" onClick={saveConfig} className="rounded-xl bg-slate-900 px-4 py-3 text-sm font-medium text-white">
              Enregistrer les parametres paie
            </button>
          </div>
        </div>

        <div className="space-y-5">
          <div className="nx-panel px-5 py-5">
            <div className="grid gap-4 md:grid-cols-3">
              <Field label="Periode">
                <input className={inp} value={form.periodLabel} onChange={event => setForm(current => ({ ...current, periodLabel: event.target.value }))} />
              </Field>
              <Field label="Heures travaillees">
                <input className={inp} value={form.workedHours} onChange={event => setForm(current => ({ ...current, workedHours: event.target.value }))} />
              </Field>
              <Field label="Absences">
                <input className={inp} value={form.absenceHours} onChange={event => setForm(current => ({ ...current, absenceHours: event.target.value }))} />
              </Field>
              <Field label="HS 25%">
                <input className={inp} value={form.overtime25Hours} onChange={event => setForm(current => ({ ...current, overtime25Hours: event.target.value }))} />
              </Field>
              <Field label="HS 50%">
                <input className={inp} value={form.overtime50Hours} onChange={event => setForm(current => ({ ...current, overtime50Hours: event.target.value }))} />
              </Field>
              <Field label="Prime repas">
                <input className={inp} value={form.mealAllowance} onChange={event => setForm(current => ({ ...current, mealAllowance: event.target.value }))} />
              </Field>
              <Field label="Prime transport">
                <input className={inp} value={form.transportBonus} onChange={event => setForm(current => ({ ...current, transportBonus: event.target.value }))} />
              </Field>
              <Field label="Prime performance">
                <input className={inp} value={form.performanceBonus} onChange={event => setForm(current => ({ ...current, performanceBonus: event.target.value }))} />
              </Field>
              <Field label="Prime exceptionnelle">
                <input className={inp} value={form.exceptionalBonus} onChange={event => setForm(current => ({ ...current, exceptionalBonus: event.target.value }))} />
              </Field>
              <Field label="Ajustement frais">
                <input className={inp} value={form.manualExpenseAdjustment} onChange={event => setForm(current => ({ ...current, manualExpenseAdjustment: event.target.value }))} />
              </Field>
              <Field label="Prelevement a la source">
                <input className={inp} value={form.incomeTaxWithholding} onChange={event => setForm(current => ({ ...current, incomeTaxWithholding: event.target.value }))} />
              </Field>
              <Field label="Acompte">
                <input className={inp} value={form.advanceDeduction} onChange={event => setForm(current => ({ ...current, advanceDeduction: event.target.value }))} />
              </Field>
              <Field label="Autres retenues">
                <input className={inp} value={form.otherDeduction} onChange={event => setForm(current => ({ ...current, otherDeduction: event.target.value }))} />
              </Field>
            </div>
            <button type="button" onClick={generateSlip} className="mt-4 rounded-xl bg-[color:var(--primary)] px-4 py-3 text-sm font-medium text-white">
              Generer le bulletin PDF
            </button>

            {preview && (
              <div className="mt-5 grid gap-3 md:grid-cols-4">
                <MetricCard label="Brut soumis" value={`${preview.grossSubject.toFixed(2)} EUR`} tone="slate" />
                <MetricCard label="Frais auto" value={`${preview.approvedExpenseReimbursement.toFixed(2)} EUR`} tone="blue" />
                <MetricCard label="Cotis. salarie" value={`${preview.employeeContributions.toFixed(2)} EUR`} tone="blue" />
                <MetricCard label="Net avant PAS" value={`${preview.netBeforeIncomeTax.toFixed(2)} EUR`} tone="cyan" />
                <MetricCard label="Net a payer" value={`${preview.netToPay.toFixed(2)} EUR`} tone="green" />
              </div>
            )}

            <div className="mt-5 rounded-2xl border border-white/10 bg-white/5 px-4 py-4">
              <p className="text-sm font-semibold text-white">Frais integres automatiquement</p>
              <p className="mt-1 text-xs text-slate-400">
                {approvedExpenseTickets.length} ticket(s) comptablement valides pour {form.periodLabel} - {autoExpenseAmount.toFixed(2)} EUR.
              </p>
              {approvedExpenseTickets.length > 0 && (
                <div className="mt-3 space-y-2">
                  {approvedExpenseTickets.map(ticket => (
                    <div key={ticket.id} className="flex items-center justify-between rounded-xl border border-white/10 px-3 py-2 text-xs text-slate-300">
                      <span>{ticket.title}</span>
                      <span>{ticket.amount.toFixed(2)} EUR</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="nx-panel overflow-hidden">
            <div className="border-b px-5 py-4" style={{ borderColor: 'var(--border)' }}>
              <p className="text-sm font-semibold text-white">Historique des bulletins</p>
              <p className="mt-1 text-xs text-slate-400">{employeeRecords.length} fiche(s) salariee(s) parametrees</p>
            </div>
            {slips.length === 0 ? (
              <div className="px-5 py-10 text-sm text-slate-400">Aucun bulletin genere pour ce collaborateur.</div>
            ) : (
              <div className="divide-y" style={{ borderColor: 'var(--border)' }}>
                {slips.map(slip => (
                  <div key={slip.id} className="flex flex-col gap-2 px-5 py-4 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="text-sm font-semibold text-white">{slip.periodLabel}</p>
                      <p className="mt-1 text-xs text-slate-400">Brut {formatMoney(slip.grossSubject)} EUR - Net {formatMoney(slip.netToPay)} EUR</p>
                      <p className="mt-1 text-xs text-slate-500">Genere le {formatDateTime(slip.createdAt)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
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

function MetricCard({ label, value, tone }: { label: string; value: string; tone: 'slate' | 'blue' | 'cyan' | 'green' }) {
  const toneClass =
    tone === 'green'
      ? 'border-emerald-400/20 bg-emerald-500/10 text-emerald-50'
      : tone === 'cyan'
        ? 'border-cyan-400/20 bg-cyan-500/10 text-cyan-50'
        : tone === 'blue'
          ? 'border-blue-400/20 bg-blue-500/10 text-blue-50'
          : 'border-white/10 bg-white/5 text-white'

  return (
    <div className={`rounded-2xl border px-4 py-4 ${toneClass}`}>
      <p className="text-[11px] uppercase tracking-[0.2em] opacity-70">{label}</p>
      <p className="mt-2 text-lg font-semibold">{value}</p>
    </div>
  )
}
