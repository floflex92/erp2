import { useEffect, useMemo, useState, type ChangeEvent, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useAuth, ROLE_LABELS } from '@/lib/auth'
import { ensureEmployeeRecord, generateProfessionalEmail, getEmployeeRecord, subscribeEmployeeRecords } from '@/lib/employeeRecords'
import { ensureEmployeeJobSheets, ensurePolicyDocuments, generateEmploymentContract, generateJobSheet, HR_CATEGORY_LABELS, uploadEmployeeDocument } from '@/lib/hrDocuments'
import { importEmployeeIntakeForm, provisionEmployeeOnboarding } from '@/lib/onboarding'
import { createPayrollSlip } from '@/lib/payroll'
import { buildStaffDirectory, findStaffMember, staffDisplayName } from '@/lib/staffDirectory'

const RH_UPLOAD_CATEGORIES = ['carte_vitale', 'carte_identite', 'justificatif_domicile', 'scan_complementaire'] as const
const inp = 'w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-slate-400'

export default function Rh() {
  const { profil, accountProfil } = useAuth()
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('all')
  const [payPeriod, setPayPeriod] = useState('Mars 2026')
  const [payAmount, setPayAmount] = useState('2450')
  const [uploadCategory, setUploadCategory] = useState<(typeof RH_UPLOAD_CATEGORIES)[number]>('carte_vitale')
  const [notice, setNotice] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const staff = useMemo(() => buildStaffDirectory([profil, accountProfil]), [profil, accountProfil])
  const selectedEmployee = findStaffMember(staff, selectedEmployeeId === 'all' ? profil?.id : selectedEmployeeId)
  const selectedEmployeeRecord = selectedEmployee ? getEmployeeRecord(selectedEmployee.id) ?? ensureEmployeeRecord({
    employeeId: selectedEmployee.id,
    role: selectedEmployee.role,
    firstName: selectedEmployee.prenom,
    lastName: selectedEmployee.nom,
    professionalEmail: selectedEmployee.email ?? generateProfessionalEmail(selectedEmployee.prenom, selectedEmployee.nom),
    loginEmail: selectedEmployee.email,
    jobTitle: ROLE_LABELS[selectedEmployee.role] ?? selectedEmployee.role,
  }) : null

  useEffect(() => {
    if (!profil) return
    ensurePolicyDocuments(staff, profil)
    ensureEmployeeJobSheets(staff, profil)
  }, [profil?.id, staff.length])

  useEffect(() => {
    if (selectedEmployeeId !== 'all') return
    if (staff.length === 0) return
    setSelectedEmployeeId(staff[0].id)
  }, [selectedEmployeeId, staff])

  useEffect(() => subscribeEmployeeRecords(() => {
    setNotice(current => current)
  }), [])

  if (!profil) return null
  const actor = profil

  function handleGenerateContract() {
    if (!selectedEmployee) return
    generateEmploymentContract(selectedEmployee, actor)
    setNotice(`Contrat genere et envoye a ${staffDisplayName(selectedEmployee)}.`)
    setError(null)
  }

  function handleGenerateJobSheet() {
    if (!selectedEmployee) return
    generateJobSheet(selectedEmployee, actor)
    setNotice(`Fiche metier generee et envoyee a ${staffDisplayName(selectedEmployee)} pour signature.`)
    setError(null)
  }

  function handleGeneratePayslip() {
    if (!selectedEmployee) return
    const grossTarget = Number.parseFloat(payAmount)
    if (!Number.isFinite(grossTarget)) {
      setError('Montant de paie invalide.')
      return
    }
    const record = selectedEmployeeRecord ?? ensureEmployeeRecord({
      employeeId: selectedEmployee.id,
      role: selectedEmployee.role,
      firstName: selectedEmployee.prenom,
      lastName: selectedEmployee.nom,
      professionalEmail: selectedEmployee.email ?? generateProfessionalEmail(selectedEmployee.prenom, selectedEmployee.nom),
      loginEmail: selectedEmployee.email,
      jobTitle: ROLE_LABELS[selectedEmployee.role] ?? selectedEmployee.role,
    })
    if (!record.hourlyRate) {
      setError('Renseigne le taux horaire dans l onglet Paie avant de generer un bulletin.')
      return
    }
    const baseGross = record.monthlyBaseHours * record.hourlyRate
    createPayrollSlip(selectedEmployee, actor, {
      periodLabel: payPeriod.trim() || 'Periode courante',
      workedHours: record.monthlyBaseHours,
      overtime25Hours: 0,
      overtime50Hours: 0,
      absenceHours: 0,
      mealAllowance: 0,
      transportBonus: 0,
      performanceBonus: 0,
      exceptionalBonus: Math.max(0, grossTarget - baseGross),
      manualExpenseAdjustment: 0,
      incomeTaxWithholding: 0,
      advanceDeduction: 0,
      otherDeduction: 0,
    })
    setNotice(`Fiche de paie generee et envoyee a ${staffDisplayName(selectedEmployee)}.`)
    setError(null)
  }

  async function handleUploadRhDocument(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file || !selectedEmployee) return
    try {
      await uploadEmployeeDocument(selectedEmployee, actor, uploadCategory, file)
      setNotice(`${HR_CATEGORY_LABELS[uploadCategory]} archive pour ${staffDisplayName(selectedEmployee)}.`)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Archivage du document impossible.')
    } finally {
      event.target.value = ''
    }
  }

  async function handleImportIntake(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file || !selectedEmployee) return
    try {
      await importEmployeeIntakeForm(file, selectedEmployee.id)
      setNotice(`Fiche d embauche importee pour ${staffDisplayName(selectedEmployee)}.`)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import de la fiche d embauche impossible.')
    } finally {
      event.target.value = ''
    }
  }

  function handleGenerateOnboarding() {
    if (!selectedEmployee) return
    const record = selectedEmployeeRecord ?? ensureEmployeeRecord({
      employeeId: selectedEmployee.id,
      role: selectedEmployee.role,
      firstName: selectedEmployee.prenom,
      lastName: selectedEmployee.nom,
      professionalEmail: selectedEmployee.email ?? generateProfessionalEmail(selectedEmployee.prenom, selectedEmployee.nom),
      loginEmail: selectedEmployee.email,
      jobTitle: ROLE_LABELS[selectedEmployee.role] ?? selectedEmployee.role,
    })
    provisionEmployeeOnboarding({
      profileId: selectedEmployee.id,
      role: selectedEmployee.role,
      firstName: record.firstName,
      lastName: record.lastName,
      loginEmail: record.loginEmail ?? record.professionalEmail,
      professionalEmail: record.professionalEmail,
      provisionalCode: record.provisionalCode ?? undefined,
    }, actor)
    setNotice(`Dossier d integration regenere pour ${staffDisplayName(selectedEmployee)}.`)
    setError(null)
  }

  return (
    <div className="space-y-6 p-5 md:p-6">
      <div className="rounded-2xl bg-slate-950 p-6 text-white shadow-xl">
        <p className="text-xs uppercase tracking-[0.3em] text-slate-400">RH</p>
        <h2 className="mt-2 text-3xl font-bold">Ressources humaines</h2>
        <p className="mt-3 max-w-3xl text-sm text-slate-300">
          Contrats, onboarding, scans identite, imports de fiches d embauche, documents collaborateur et lien direct avec la paie.
        </p>
      </div>

      {(notice || error) && (
        <div
          className="rounded-2xl border px-5 py-4 text-sm"
          style={{
            borderColor: error ? 'rgba(244,114,182,0.25)' : 'rgba(56,189,248,0.25)',
            background: error ? 'rgba(127,29,29,0.18)' : 'rgba(8,47,73,0.25)',
            color: error ? '#fecdd3' : '#bae6fd',
          }}
        >
          {error ?? notice}
        </div>
      )}

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">Dossier salarie</p>
        <h3 className="mt-2 text-lg font-semibold text-slate-900">Onboarding et documents RH</h3>
        <p className="mt-1 text-sm text-slate-500">Toute la gestion RH est centralisee ici, separee des reglages generaux.</p>

        <div className="mt-5 grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
          <div className="space-y-4">
            <Field label="Collaborateur">
              <select className={inp} value={selectedEmployeeId} onChange={event => setSelectedEmployeeId(event.target.value)}>
                {staff.map(member => (
                  <option key={member.id} value={member.id}>{staffDisplayName(member)} - {ROLE_LABELS[member.role]}</option>
                ))}
              </select>
            </Field>
            {selectedEmployee && (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-600">
                <p className="font-semibold text-slate-900">{staffDisplayName(selectedEmployee)}</p>
                <p className="mt-1">{ROLE_LABELS[selectedEmployee.role]} - {selectedEmployee.domain}</p>
                <p className="mt-1">{selectedEmployee.email ?? 'Email non renseigne'}</p>
                {selectedEmployeeRecord && (
                  <>
                    <p className="mt-1">Mail pro: {selectedEmployeeRecord.professionalEmail}</p>
                    <p className="mt-1">Code provisoire: {selectedEmployeeRecord.provisionalCode ?? 'A definir'}</p>
                  </>
                )}
              </div>
            )}
            <div className="grid gap-3 md:grid-cols-2">
              <button type="button" onClick={handleGenerateContract} disabled={!selectedEmployee} className="rounded-xl bg-slate-900 px-4 py-3 text-sm font-medium text-white disabled:opacity-50">
                Generer contrat
              </button>
              <button type="button" onClick={handleGenerateJobSheet} disabled={!selectedEmployee} className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700 disabled:opacity-50">
                Generer fiche metier
              </button>
              <button type="button" onClick={handleGenerateOnboarding} disabled={!selectedEmployee} className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700 disabled:opacity-50">
                Regenerer integration
              </button>
              <Link to="/coffre" className="rounded-xl border border-slate-200 px-4 py-3 text-center text-sm font-medium text-slate-700">
                Ouvrir le coffre
              </Link>
              <Link to="/paie" className="rounded-xl border border-slate-200 px-4 py-3 text-center text-sm font-medium text-slate-700">
                Ouvrir la paie
              </Link>
            </div>
          </div>

          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Periode paie">
                <input className={inp} value={payPeriod} onChange={event => setPayPeriod(event.target.value)} />
              </Field>
              <Field label="Brut indicatif EUR">
                <input className={inp} value={payAmount} onChange={event => setPayAmount(event.target.value)} />
              </Field>
            </div>
            <button type="button" onClick={handleGeneratePayslip} disabled={!selectedEmployee} className="rounded-xl bg-[color:var(--primary)] px-4 py-3 text-sm font-medium text-white disabled:opacity-50">
              Generer fiche de paie
            </button>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="grid gap-4 md:grid-cols-[1fr_auto] md:items-end">
                <Field label="Document scanne">
                  <select className={inp} value={uploadCategory} onChange={event => setUploadCategory(event.target.value as (typeof RH_UPLOAD_CATEGORIES)[number])}>
                    {RH_UPLOAD_CATEGORIES.map(category => (
                      <option key={category} value={category}>{HR_CATEGORY_LABELS[category]}</option>
                    ))}
                  </select>
                </Field>
                <label className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700 cursor-pointer">
                  Importer un scan
                  <input type="file" accept="application/pdf,image/png,image/jpeg,image/webp" className="hidden" onChange={event => void handleUploadRhDocument(event)} />
                </label>
              </div>
              <label className="mt-4 inline-flex rounded-xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700 cursor-pointer">
                Importer la fiche d embauche remplie
                <input type="file" accept="application/pdf" className="hidden" onChange={event => void handleImportIntake(event)} />
              </label>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-slate-700">{label}</span>
      {children}
    </label>
  )
}
