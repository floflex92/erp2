import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '@/lib/auth'
import { readCompanySettings, subscribeCompanySettings } from '@/lib/companySettings'
import { listApprovedExpenseTicketsForPeriod, subscribeExpenseTickets, sumApprovedExpenseReimbursements } from '@/lib/expenseTickets'
import { ensureEmployeeRecord, getEmployeeRecord, listEmployeeRecords, subscribeEmployeeRecords } from '@/lib/employeeRecords'
import { BAREME_URSSAF_2026, calculatePayrollPreview, createPayrollSlip, listPayrollSlips, savePayrollConfig, subscribePayroll } from '@/lib/payroll'
import { buildPayrollPeriodSchedule, formatPayrollWorkflowDate, readPayrollValidationState, type PayrollValidationLevel, type PayrollValidationState, upsertPayrollRelease, writePayrollValidationState } from '@/lib/payrollWorkflow'
import { buildStaffDirectory, findStaffMember, staffDisplayName } from '@/lib/staffDirectory'
import { supabase } from '@/lib/supabase'
import { computeAbsenceHeuresFromAbsences, fetchAbsencesValideesPeriode, type AbsenceRh } from '@/lib/absencesRh'
import { linkPayrollBonusesToAccounting, listPayrollBonusLinkStatuses, listValidatedUnpaidBonusesForPayroll, type PayrollBonusLinkStatus } from '@/lib/payrollBonusBridge'
import { useScrollToTopOnChange } from '@/hooks/useScrollToTopOnChange'

const inp = 'nx-input w-full'
type PaieTab = 'saisie' | 'revision'

function formatMoney(value: unknown) {
  const amount = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(amount) ? amount.toFixed(2) : '0.00'
}

function formatDateTime(value: unknown) {
  if (typeof value !== 'string' || !value.trim()) return 'Date inconnue'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? 'Date inconnue' : date.toLocaleString('fr-FR')
}

// Retourne {debut, fin} d'un label de période type "Mars 2026"
function parsePeriodLabel(label: string): { debut: string; fin: string } | null {
  const MOIS: Record<string, number> = {
    janvier: 0, fevrier: 1, mars: 2, avril: 3, mai: 4, juin: 5,
    juillet: 6, aout: 7, septembre: 8, octobre: 9, novembre: 10, decembre: 11,
  }
  const normalized = label.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim()
  const parts = normalized.split(' ')
  if (parts.length !== 2) return null
  const moisIndex = MOIS[parts[0]]
  const annee = parseInt(parts[1], 10)
  if (moisIndex === undefined || Number.isNaN(annee)) return null
  const debut = new Date(annee, moisIndex, 1)
  const fin = new Date(annee, moisIndex + 1, 0)
  return {
    debut: debut.toISOString().slice(0, 10),
    fin: fin.toISOString().slice(0, 10),
  }
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
  const [isGeneratingSlip, setIsGeneratingSlip] = useState(false)
  const [importingTachy, setImportingTachy] = useState(false)
  const [importingAbsences, setImportingAbsences] = useState(false)
  const [activeTab, setActiveTab] = useState<PaieTab>('saisie')
  useScrollToTopOnChange(activeTab)
  const [payrollValidations, setPayrollValidations] = useState<PayrollValidationState>(() => readPayrollValidationState())
  const [absencesValidees, setAbsencesValidees] = useState<AbsenceRh[]>([])
  const [bonusLinkStatusesBySlip, setBonusLinkStatusesBySlip] = useState<Record<string, PayrollBonusLinkStatus>>({})
  const [companySettings, setCompanySettings] = useState(() => readCompanySettings())
  const [form, setForm] = useState({
    conventionCollective: 'CCN transports routiers et activites auxiliaires du transport - IDCC 16',
    jobCoefficient: '',
    hourlyRate: '13.25',
    monthlyBaseHours: '151.67',
    contractType: 'CDI',
    jobTitle: '',
    periodLabel: 'Avril 2026',
    workedHours: '151.67',
    overtime25Hours: '0',
    overtime50Hours: '0',
    absenceHours: '0',
    heuresNuit: '0',
    joursTravailles: '0',
    sourceHeures: 'manuel' as 'manuel' | 'tachygraphe' | 'mixte',
    // Primes imposables
    performanceBonus: '0',
    exceptionalBonus: '0',
    // Indemnites exonerees (hors assiette URSSAF)
    indemniteRepasExo: '0',
    nbRepas: '0',
    indemniteGrandRoutierExo: '0',
    nbJoursGr: '0',
    indemniteTpExo: '0',
    depassementBaremeCotisable: '0',
    // Frais
    manualExpenseAdjustment: '0',
    // Retenues
    incomeTaxWithholding: '0',
    advanceDeduction: '0',
    otherDeduction: '0',
  })

  useEffect(() => {
    if (selectedEmployeeId || staff.length === 0) return
    setSelectedEmployeeId(staff[0].id)
  }, [selectedEmployeeId, staff])

  useEffect(() => {
    writePayrollValidationState(payrollValidations)
  }, [payrollValidations])

  useEffect(() => {
    function refreshCompanySettings() {
      setCompanySettings(readCompanySettings())
    }
    return subscribeCompanySettings(refreshCompanySettings)
  }, [])

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
  const allSlips = useMemo(() => listPayrollSlips(null), [staff.length, form.periodLabel])
  const slipsByEmployeeForPeriod = useMemo(() => {
    const map = new Map<string, (typeof allSlips)[number]>()
    for (const slip of allSlips) {
      if (slip.periodLabel !== form.periodLabel) continue
      if (!map.has(slip.employeeId)) {
        map.set(slip.employeeId, slip)
      }
    }
    return map
  }, [allSlips, form.periodLabel])
  const validationsForPeriod = useMemo(() => payrollValidations[form.periodLabel] ?? {}, [payrollValidations, form.periodLabel])

  const reviewRows = useMemo(() => {
    return staff.map(member => {
      const periodSlip = slipsByEmployeeForPeriod.get(member.id) ?? null
      const validationEntry = validationsForPeriod[member.id]
      return {
        member,
        periodSlip,
        hasSlip: Boolean(periodSlip),
        validationEntry,
        isExploitationValidated: Boolean(validationEntry?.exploitation),
        isDirectionValidated: Boolean(validationEntry?.direction),
        isFullyValidated: Boolean(validationEntry?.exploitation && validationEntry?.direction),
      }
    })
  }, [staff, slipsByEmployeeForPeriod, validationsForPeriod])

  const reviewReadyCount = reviewRows.filter(row => row.hasSlip).length
  const reviewExploitationValidatedCount = reviewRows.filter(row => row.isExploitationValidated).length
  const reviewDirectionValidatedCount = reviewRows.filter(row => row.isDirectionValidated).length
  const reviewFullyValidatedCount = reviewRows.filter(row => row.isFullyValidated).length
  const payrollSchedule = useMemo(() => buildPayrollPeriodSchedule(form.periodLabel, companySettings), [form.periodLabel, companySettings])
  const isCurrentPeriodFullyValidated = useMemo(() => {
    const rowsWithSlip = reviewRows.filter(row => row.hasSlip)
    return rowsWithSlip.length > 0 && rowsWithSlip.every(row => row.isFullyValidated)
  }, [reviewRows])
  const selectedReviewRow = useMemo(() => reviewRows.find(row => row.member.id === selectedEmployeeId) ?? null, [reviewRows, selectedEmployeeId])
  const currentReviewIndex = useMemo(() => reviewRows.findIndex(row => row.member.id === selectedEmployeeId), [reviewRows, selectedEmployeeId])
  const nextReviewRow = useMemo(() => {
    if (reviewRows.length === 0) return null
    const startIndex = currentReviewIndex >= 0 ? currentReviewIndex + 1 : 0
    for (let i = startIndex; i < reviewRows.length; i += 1) {
      if (!reviewRows[i].isFullyValidated) return reviewRows[i]
    }
    for (let i = 0; i < startIndex && i < reviewRows.length; i += 1) {
      if (!reviewRows[i].isFullyValidated) return reviewRows[i]
    }
    return null
  }, [reviewRows, currentReviewIndex])
  const autoExpenseAmount = employee ? sumApprovedExpenseReimbursements(employee.id, form.periodLabel) : 0
  const approvedExpenseTickets = employee ? listApprovedExpenseTicketsForPeriod(employee.id, form.periodLabel) : []

  useEffect(() => {
    if (!payrollSchedule.vaultAvailableAt || !payrollSchedule.paymentScheduledAt) {
      upsertPayrollRelease(form.periodLabel, null)
      return
    }
    if (!isCurrentPeriodFullyValidated) {
      upsertPayrollRelease(form.periodLabel, null)
      return
    }
    upsertPayrollRelease(form.periodLabel, {
      fullyValidatedAt: new Date().toISOString(),
      vaultAvailableAt: payrollSchedule.vaultAvailableAt.toISOString(),
      paymentScheduledAt: payrollSchedule.paymentScheduledAt.toISOString(),
      updatedAt: new Date().toISOString(),
    })
  }, [form.periodLabel, isCurrentPeriodFullyValidated, payrollSchedule.paymentScheduledAt, payrollSchedule.vaultAvailableAt])

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

  useEffect(() => {
    if (!employee) {
      setBonusLinkStatusesBySlip({})
      return
    }

    let isMounted = true
    void listPayrollBonusLinkStatuses(employee.id)
      .then(rows => {
        if (!isMounted) return
        const map: Record<string, PayrollBonusLinkStatus> = {}
        for (const row of rows) {
          if (!map[row.payrollSlipId]) map[row.payrollSlipId] = row
        }
        setBonusLinkStatusesBySlip(map)
      })
      .catch(() => {
        if (!isMounted) return
        setBonusLinkStatusesBySlip({})
      })

    return () => {
      isMounted = false
    }
  }, [employee, slips.length])

  const preview = useMemo(() => {
    if (!employeeRecord) return null
    return calculatePayrollPreview(employeeRecord, {
      periodLabel: form.periodLabel,
      workedHours: Number.parseFloat(form.workedHours) || 0,
      overtime25Hours: Number.parseFloat(form.overtime25Hours) || 0,
      overtime50Hours: Number.parseFloat(form.overtime50Hours) || 0,
      absenceHours: Number.parseFloat(form.absenceHours) || 0,
      heuresNuit: Number.parseFloat(form.heuresNuit) || 0,
      joursTravailles: Number.parseFloat(form.joursTravailles) || 0,
      sourceHeures: form.sourceHeures,
      performanceBonus: Number.parseFloat(form.performanceBonus) || 0,
      exceptionalBonus: Number.parseFloat(form.exceptionalBonus) || 0,
      indemniteRepasExo: Number.parseFloat(form.indemniteRepasExo) || 0,
      nbRepas: Number.parseFloat(form.nbRepas) || 0,
      indemniteGrandRoutierExo: Number.parseFloat(form.indemniteGrandRoutierExo) || 0,
      nbJoursGr: Number.parseFloat(form.nbJoursGr) || 0,
      indemniteTpExo: Number.parseFloat(form.indemniteTpExo) || 0,
      depassementBaremeCotisable: Number.parseFloat(form.depassementBaremeCotisable) || 0,
      manualExpenseAdjustment: Number.parseFloat(form.manualExpenseAdjustment) || 0,
      incomeTaxWithholding: Number.parseFloat(form.incomeTaxWithholding) || 0,
      advanceDeduction: Number.parseFloat(form.advanceDeduction) || 0,
      otherDeduction: Number.parseFloat(form.otherDeduction) || 0,
    })
  }, [employeeRecord, form])

  if (!profil) return null
  const currentProfil = profil

  async function importFromTachy() {
    if (!employee) return
    const periode = parsePeriodLabel(form.periodLabel)
    if (!periode) {
      setError('Format de période non reconnu (ex : "Avril 2026").')
      return
    }
    // Chercher le conducteur Supabase lié à ce profil
    setImportingTachy(true)
    setError(null)
    try {
      const { data: conducteur } = await supabase
        .from('conducteurs')
        .select('id')
        .ilike('email', employee.email ?? '%')
        .maybeSingle()
      if (!conducteur?.id) {
        setError('Conducteur non trouvé dans Supabase pour ce collaborateur. Vérifiez que l\'email correspond.')
        return
      }
      interface HeuresMois {
        heures_travail_total: number | null
        heures_sup_25: number | null
        heures_sup_50: number | null
        jours_travailles: number | null
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const heuresResult = await (supabase as any)
        .from('v_heures_paie_mois')
        .select('heures_travail_total,heures_sup_25,heures_sup_50,jours_travailles')
        .eq('conducteur_id', conducteur.id)
        .eq('mois_debut', periode.debut)
        .maybeSingle()
      const heures = (heuresResult?.data ?? null) as HeuresMois | null
      if (!heures) {
        setError(`Aucune donnée tachygraphe trouvée pour ${form.periodLabel}. Vérifiez les entrées tachygraphe de ce conducteur.`)
        return
      }
      setForm(current => ({
        ...current,
        workedHours: String(heures.heures_travail_total ?? current.workedHours),
        overtime25Hours: String(heures.heures_sup_25 ?? '0'),
        overtime50Hours: String(heures.heures_sup_50 ?? '0'),
        joursTravailles: String(heures.jours_travailles ?? '0'),
        sourceHeures: 'tachygraphe',
      }))
      setNotice(`Import tachygraphe OK — ${heures.heures_travail_total}h travailées, ${heures.heures_sup_25}h HS25%, ${heures.heures_sup_50}h HS50%, ${heures.jours_travailles} jours.`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur import tachygraphe.')
    } finally {
      setImportingTachy(false)
    }
  }

  async function importFromAbsences() {
    if (!employee) return
    const periode = parsePeriodLabel(form.periodLabel)
    if (!periode) {
      setError('Format de période non reconnu (ex : "Avril 2026").')
      return
    }
    setImportingAbsences(true)
    setError(null)
    try {
      const data = await fetchAbsencesValideesPeriode(employee.id, periode.debut, periode.fin)
      setAbsencesValidees(data)
      const { totalHeures } = computeAbsenceHeuresFromAbsences(data)
      if (data.length === 0) {
        setNotice(`Aucune absence validée trouvée pour ${form.periodLabel}.`)
      } else {
        setForm(current => ({ ...current, absenceHours: String(totalHeures) }))
        setNotice(`${data.length} absence(s) importée(s) — ${totalHeures}h d'absence saisies automatiquement.`)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur import absences.')
    } finally {
      setImportingAbsences(false)
    }
  }

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

  async function generateSlip() {
    if (!employee || isGeneratingSlip) return
    setIsGeneratingSlip(true)
    try {
      const validatedBonuses = await listValidatedUnpaidBonusesForPayroll(employee.id, form.periodLabel)
      const manualPerformanceBonus = Number.parseFloat(form.performanceBonus) || 0
      const performanceBonusWithObjectives = manualPerformanceBonus + validatedBonuses.totalAmount

      createPayrollSlip(employee, currentProfil, {
        periodLabel: form.periodLabel,
        workedHours: Number.parseFloat(form.workedHours),
        overtime25Hours: Number.parseFloat(form.overtime25Hours),
        overtime50Hours: Number.parseFloat(form.overtime50Hours),
        absenceHours: Number.parseFloat(form.absenceHours),
        heuresNuit: Number.parseFloat(form.heuresNuit) || 0,
        joursTravailles: Number.parseFloat(form.joursTravailles) || 0,
        sourceHeures: form.sourceHeures,
        performanceBonus: performanceBonusWithObjectives,
        exceptionalBonus: Number.parseFloat(form.exceptionalBonus),
        indemniteRepasExo: Number.parseFloat(form.indemniteRepasExo) || 0,
        nbRepas: Number.parseFloat(form.nbRepas) || 0,
        indemniteGrandRoutierExo: Number.parseFloat(form.indemniteGrandRoutierExo) || 0,
        nbJoursGr: Number.parseFloat(form.nbJoursGr) || 0,
        indemniteTpExo: Number.parseFloat(form.indemniteTpExo) || 0,
        depassementBaremeCotisable: Number.parseFloat(form.depassementBaremeCotisable) || 0,
        manualExpenseAdjustment: Number.parseFloat(form.manualExpenseAdjustment),
        incomeTaxWithholding: Number.parseFloat(form.incomeTaxWithholding),
        advanceDeduction: Number.parseFloat(form.advanceDeduction),
        otherDeduction: Number.parseFloat(form.otherDeduction),
      })

      let syncMessage = ''
      if (validatedBonuses.totalAmount > 0) {
        const latestSlip = listPayrollSlips(employee.id)[0]
        if (latestSlip) {
          const bridgeResult = await linkPayrollBonusesToAccounting({
            profilId: employee.id,
            periodLabel: form.periodLabel,
            payrollSlipId: latestSlip.id,
            payrollPeriodLabel: latestSlip.periodLabel,
            bonusCalculations: validatedBonuses.items,
          })

          if (bridgeResult.status === 'linked') {
            syncMessage = ` | Bonus objectifs integres (${validatedBonuses.totalAmount.toFixed(2)} EUR) et OD comptable ${bridgeResult.accountingEntryId ?? 'cree'}.`
          } else {
            syncMessage = ` | Bulletin genere avec bonus (${validatedBonuses.totalAmount.toFixed(2)} EUR), mais liaison comptable en echec: ${bridgeResult.errorMessage ?? 'erreur inconnue'}.`
          }
        }
      }

      setNotice(`Bulletin de paie genere pour ${staffDisplayName(employee)}${syncMessage}`)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Generation paie impossible.')
    } finally {
      setIsGeneratingSlip(false)
    }
  }

  function togglePayrollValidation(employeeId: string, level: PayrollValidationLevel, shouldValidate: boolean) {
    const actorName = [currentProfil.prenom, currentProfil.nom].filter(Boolean).join(' ') || (level === 'exploitation' ? 'Service exploitation' : 'Direction')
    setPayrollValidations(current => {
      const periodState = { ...(current[form.periodLabel] ?? {}) }
      const entry = { ...(periodState[employeeId] ?? {}) }
      if (shouldValidate) {
        if (level === 'direction' && !entry.exploitation) {
          entry.exploitation = {
            validatedAt: new Date().toISOString(),
            validatedBy: 'Service exploitation',
          }
        }
        entry[level] = {
          validatedAt: new Date().toISOString(),
          validatedBy: actorName,
        }
        periodState[employeeId] = entry
      } else {
        delete entry[level]
        if (level === 'exploitation') {
          delete entry.direction
        }
        if (entry.exploitation || entry.direction) {
          periodState[employeeId] = entry
        } else {
          delete periodState[employeeId]
        }
      }
      return {
        ...current,
        [form.periodLabel]: periodState,
      }
    })
  }

  function validateCurrentAndMoveNext() {
    if (!employee) return
    const row = reviewRows.find(item => item.member.id === employee.id)
    if (!row?.hasSlip) {
      setError('Ce collaborateur n a pas encore de bulletin pour cette periode.')
      return
    }
    if (!row.validationEntry?.exploitation) {
      togglePayrollValidation(employee.id, 'exploitation', true)
      setNotice(`Validation exploitation enregistree pour ${staffDisplayName(employee)} (${form.periodLabel}).`)
      setError(null)
      return
    }

    if (!row.validationEntry?.direction) {
      togglePayrollValidation(employee.id, 'direction', true)
      setNotice(`Validation direction enregistree pour ${staffDisplayName(employee)} (${form.periodLabel}).`)
    } else {
      setNotice(`Cette paie est deja validee exploitation + direction pour ${staffDisplayName(employee)}.`)
    }
    setError(null)
    if (nextReviewRow?.member.id) {
      setSelectedEmployeeId(nextReviewRow.member.id)
    }
  }

  return (
    <div className="space-y-6 p-5 md:p-6">
      <div className="nx-panel nx-page-hero px-6 py-4">
        <p className="nx-label">RH x Comptable</p>
        <h2 className="nx-page-hero-title mt-2 text-2xl font-semibold tracking-tight">Paie</h2>
        <p className="mt-1.5 text-sm nx-subtle">Parametrage metier, variables mensuelles, generation PDF et archivage direct dans le coffre salarie.</p>
      </div>
      <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 flex items-start gap-2">
        <span className="text-base leading-none mt-0.5">⚠</span>
        <span>Les bulletins de paie generés sont archivés localement dans ce navigateur. Pour une conformité RGPD et un audit trace, exportez-les vers votre coffre-fort RH ou votre logiciel comptable.</span>
      </div>

      {(notice || error) && (
        <div className={`rounded-2xl border px-5 py-4 text-sm ${error ? 'border-rose-300/30 bg-rose-950/20 text-rose-200' : 'border-sky-300/30 bg-sky-950/20 text-sky-200'}`}>
          {error ?? notice}
        </div>
      )}

      <div className="nx-tab-group">
        <button
          type="button"
          onClick={() => setActiveTab('saisie')}
          className={`nx-tab-button ${activeTab === 'saisie' ? 'is-active' : ''}`}
        >
          Saisie paie
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('revision')}
          className={`nx-tab-button ${activeTab === 'revision' ? 'is-active' : ''}`}
        >
          Revision et validation
        </button>
      </div>

      {activeTab === 'saisie' && (
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
            </div>

            {/* Import tachygraphe */}
            <div className="mt-3 flex items-center gap-3">
              <button
                type="button"
                onClick={importFromTachy}
                disabled={importingTachy}
                className="rounded-xl border border-blue-500/30 bg-blue-500/10 px-4 py-2.5 text-sm font-medium text-blue-200 hover:bg-blue-500/20 disabled:opacity-50"
              >
                {importingTachy ? 'Import en cours...' : '⬇ Importer depuis tachygraphe'}
              </button>
              <button
                type="button"
                onClick={() => void importFromAbsences()}
                disabled={importingAbsences}
                className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-2.5 text-sm font-medium text-amber-200 hover:bg-amber-500/20 disabled:opacity-50"
              >
                {importingAbsences ? 'Import en cours...' : '⬇ Importer absences RH'}
              </button>
              {form.sourceHeures !== 'manuel' && (
                <span className="rounded-full bg-emerald-500/15 px-3 py-1 text-xs text-emerald-300">Source : {form.sourceHeures}</span>
              )}
            </div>

            {/* Détail absences importées */}
            {absencesValidees.length > 0 && (() => {
              const { detail } = computeAbsenceHeuresFromAbsences(absencesValidees)
              return (
                <div className="mt-3 rounded-xl border border-amber-400/20 bg-amber-400/5 px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-amber-300 mb-2">Absences validées importées ({form.periodLabel})</p>
                  <div className="space-y-1">
                    {absencesValidees.map(a => (
                      <div key={a.id} className="flex justify-between text-xs text-amber-200">
                        <span>{a.nb_jours} j — {new Date(a.date_debut).toLocaleDateString('fr-FR')} → {new Date(a.date_fin).toLocaleDateString('fr-FR')}</span>
                        <span className="text-amber-300">{a.type_absence.replace(/_/g, ' ')}</span>
                      </div>
                    ))}
                    {detail.length > 0 && (
                      <p className="mt-2 text-xs text-amber-300 font-medium border-t border-amber-400/20 pt-1">
                        Total non rémunéré : {detail.reduce((s, d) => s + d.heures, 0)}h
                      </p>
                    )}
                  </div>
                </div>
              )
            })()}

            <div className="mt-4 grid gap-4 md:grid-cols-3">
              <Field label="Heures travaillees">
                <input className={inp} value={form.workedHours} onChange={event => setForm(current => ({ ...current, workedHours: event.target.value }))} />
              </Field>
              <Field label="Absences (h)">
                <input className={inp} value={form.absenceHours} onChange={event => setForm(current => ({ ...current, absenceHours: event.target.value }))} />
              </Field>
              <Field label="Jours travailles">
                <input className={inp} value={form.joursTravailles} onChange={event => setForm(current => ({ ...current, joursTravailles: event.target.value }))} />
              </Field>
              <Field label="HS 25%">
                <input className={inp} value={form.overtime25Hours} onChange={event => setForm(current => ({ ...current, overtime25Hours: event.target.value }))} />
              </Field>
              <Field label="HS 50%">
                <input className={inp} value={form.overtime50Hours} onChange={event => setForm(current => ({ ...current, overtime50Hours: event.target.value }))} />
              </Field>
              <Field label="Heures de nuit">
                <input className={inp} value={form.heuresNuit} onChange={event => setForm(current => ({ ...current, heuresNuit: event.target.value }))} />
              </Field>
            </div>

            {/* Indemnités exonérées — section dédiée avec barèmes URSSAF affichés */}
            <div className="mt-4 rounded-xl border border-amber-400/20 bg-amber-400/5 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-amber-300 mb-3">Indemnites transport exonerees (hors assiette URSSAF)</p>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Field label={`Repas/petit deplacement (bar. ${BAREME_URSSAF_2026.repas_journee}€/repas)`}>
                    <input className={inp} value={form.indemniteRepasExo} onChange={event => setForm(current => ({ ...current, indemniteRepasExo: event.target.value }))} />
                  </Field>
                </div>
                <div>
                  <Field label="Nb repas (pour controle plafond unitaire)">
                    <input className={inp} type="number" min="0" value={form.nbRepas} onChange={event => setForm(current => ({ ...current, nbRepas: event.target.value }))} />
                  </Field>
                </div>
                <div>
                  <Field label={`Grand routier nuitee (bar. ${BAREME_URSSAF_2026.grand_routier_journalier}€/j)`}>
                    <input className={inp} value={form.indemniteGrandRoutierExo} onChange={event => setForm(current => ({ ...current, indemniteGrandRoutierExo: event.target.value }))} />
                  </Field>
                </div>
                <div>
                  <Field label="Nb jours GR hors domicile">
                    <input className={inp} type="number" min="0" value={form.nbJoursGr} onChange={event => setForm(current => ({ ...current, nbJoursGr: event.target.value }))} />
                  </Field>
                </div>
                <div>
                  <Field label={`Territoire propre (bar. ${BAREME_URSSAF_2026.territoire_propre_repas}€/repas)`}>
                    <input className={inp} value={form.indemniteTpExo} onChange={event => setForm(current => ({ ...current, indemniteTpExo: event.target.value }))} />
                  </Field>
                </div>
                <div>
                  <Field label="Depassement bareme (part cotisable)">
                    <input className={inp} value={form.depassementBaremeCotisable} onChange={event => setForm(current => ({ ...current, depassementBaremeCotisable: event.target.value }))} />
                  </Field>
                </div>
              </div>
            </div>

            {/* Primes imposables */}
            <div className="mt-4 grid gap-4 md:grid-cols-3">
              <Field label="Prime performance (imposable)">
                <input className={inp} value={form.performanceBonus} onChange={event => setForm(current => ({ ...current, performanceBonus: event.target.value }))} />
              </Field>
              <Field label="Prime exceptionnelle (imposable)">
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

            {/* Alertes conformité temps réel */}
            {preview && preview.alertesConformite.length > 0 && (
              <div className="mt-4 space-y-2">
                {preview.alertesConformite.map((alerte, i) => (
                  <div key={i} className={`flex items-start gap-2 rounded-xl border px-4 py-3 text-sm ${alerte.niveau === 'bloquant' ? 'border-rose-400/30 bg-rose-950/20 text-rose-200' : 'border-amber-400/30 bg-amber-950/20 text-amber-200'}`}>
                    <span className="mt-0.5 text-base leading-none">{alerte.niveau === 'bloquant' ? '🚫' : '⚠'}</span>
                    <span>{alerte.message}</span>
                  </div>
                ))}
              </div>
            )}

            <button
              type="button"
              onClick={generateSlip}
              disabled={isGeneratingSlip}
              className="mt-4 rounded-xl bg-[color:var(--primary)] px-4 py-3 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isGeneratingSlip ? 'Generation en cours...' : 'Generer le bulletin PDF'}
            </button>

            {preview && (
              <div className="mt-5 grid gap-3 md:grid-cols-5">
                <MetricCard label="Brut soumis cotis." value={`${preview.grossSubject.toFixed(2)} EUR`} tone="slate" />
                <MetricCard label="Indemnites exo." value={`${preview.indemnitesExonerees.toFixed(2)} EUR`} tone="blue" />
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
                {slips.map(slip => {
                  const bonusStatus = bonusLinkStatusesBySlip[slip.id]
                  return (
                  <div key={slip.id} className="flex flex-col gap-2 px-5 py-4 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="text-sm font-semibold text-white">{slip.periodLabel}</p>
                      <p className="mt-1 text-xs text-slate-400">Brut {formatMoney(slip.grossSubject)} EUR - Net {formatMoney(slip.netToPay)} EUR</p>
                      <p className="mt-1 text-xs text-slate-500">Genere le {formatDateTime(slip.createdAt)}</p>
                      {bonusStatus && (
                        <p className="mt-1 text-xs text-slate-300">
                          Rapprochement primes: {bonusStatus.status === 'linked'
                            ? 'OK'
                            : bonusStatus.status === 'pending'
                              ? 'En cours'
                              : 'Echec'}
                          {bonusStatus.accountingEntryId
                            ? ` | OD ${bonusStatus.accountingEntryId.slice(0, 8)}`
                            : ''}
                          {bonusStatus.errorMessage
                            ? ` | ${bonusStatus.errorMessage}`
                            : ''}
                        </p>
                      )}
                    </div>
                    {bonusStatus && (
                      <span className={`inline-flex self-start rounded-full px-2.5 py-1 text-xs font-semibold ${
                        bonusStatus.status === 'linked'
                          ? 'bg-emerald-500/20 text-emerald-300'
                          : bonusStatus.status === 'pending'
                            ? 'bg-amber-500/20 text-amber-300'
                            : 'bg-rose-500/20 text-rose-300'
                      }`}>
                        {bonusStatus.status === 'linked'
                          ? 'Rapproche'
                          : bonusStatus.status === 'pending'
                            ? 'A rapprocher'
                            : 'Erreur rapprochement'}
                      </span>
                    )}
                  </div>
                )})}
              </div>
            )}
          </div>
        </div>
      </div>
      )}

      {activeTab === 'revision' && (
        <div className="space-y-5">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Periode</p>
              <p className="mt-2 text-lg font-semibold text-slate-900">{form.periodLabel}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Bulletins disponibles</p>
              <p className="mt-2 text-lg font-semibold text-slate-900">{reviewReadyCount} / {reviewRows.length}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Workflow validation</p>
              <p className="mt-2 text-sm font-semibold text-slate-900">Exploitation {reviewExploitationValidatedCount} / {reviewRows.length}</p>
              <p className="mt-1 text-sm font-semibold text-slate-900">Direction {reviewDirectionValidatedCount} / {reviewRows.length}</p>
              <p className="mt-1 text-xs font-medium text-emerald-700">Complet {reviewFullyValidatedCount} / {reviewRows.length}</p>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4">
            <p className="text-sm font-semibold text-slate-900">Calendrier applique</p>
            <div className="mt-3 grid gap-3 md:grid-cols-3">
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3">
                <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Date butee validation</p>
                <p className="mt-1 text-sm font-semibold text-slate-900">{formatPayrollWorkflowDate(payrollSchedule.validationDeadlineAt)}</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3">
                <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Coffre numerique</p>
                <p className="mt-1 text-sm font-semibold text-slate-900">{formatPayrollWorkflowDate(payrollSchedule.vaultAvailableAt)}</p>
                <p className="mt-1 text-xs text-slate-500">Publication automatique a minuit si la periode est entierement validee.</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3">
                <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Versement collectif</p>
                <p className="mt-1 text-sm font-semibold text-slate-900">{formatPayrollWorkflowDate(payrollSchedule.paymentScheduledAt)}</p>
                <p className="mt-1 text-xs text-slate-500">Declenchement commun de tous les salaires de la periode.</p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-slate-900">Collaborateur en revision</p>
                <p className="mt-1 text-xs text-slate-500">Valide exploitation puis direction, et passe au suivant.</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => {
                    if (currentReviewIndex <= 0) return
                    setSelectedEmployeeId(reviewRows[currentReviewIndex - 1].member.id)
                  }}
                  disabled={currentReviewIndex <= 0}
                  className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium text-slate-700 disabled:opacity-45"
                >
                  Precedent
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (currentReviewIndex < 0 || currentReviewIndex >= reviewRows.length - 1) return
                    setSelectedEmployeeId(reviewRows[currentReviewIndex + 1].member.id)
                  }}
                  disabled={currentReviewIndex < 0 || currentReviewIndex >= reviewRows.length - 1}
                  className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium text-slate-700 disabled:opacity-45"
                >
                  Suivant
                </button>
                <button
                  type="button"
                  onClick={validateCurrentAndMoveNext}
                  disabled={!employee || !reviewRows.find(row => row.member.id === employee.id)?.hasSlip}
                  className="rounded-xl bg-emerald-600 px-3 py-2 text-xs font-medium text-white disabled:opacity-45"
                >
                  Valider l etape et passer au suivant
                </button>
              </div>
            </div>

            {employee && (
              <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                <p className="text-sm font-semibold text-slate-900">{staffDisplayName(employee)}</p>
                <p className="mt-1 text-xs text-slate-600">{employee.matricule} - {employee.email ?? 'Email non renseigne'}</p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  {reviewRows.find(row => row.member.id === employee.id)?.hasSlip ? (
                    <span className="rounded-full bg-blue-100 px-2.5 py-1 text-xs font-semibold text-blue-800">Bulletin present</span>
                  ) : (
                    <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-800">Bulletin absent</span>
                  )}
                  {selectedReviewRow?.isExploitationValidated ? (
                    <span className="rounded-full bg-sky-100 px-2.5 py-1 text-xs font-semibold text-sky-800">Exploitation validee</span>
                  ) : (
                    <span className="rounded-full bg-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-700">Exploitation en attente</span>
                  )}
                  {selectedReviewRow?.isDirectionValidated ? (
                    <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-800">Direction validee</span>
                  ) : (
                    <span className="rounded-full bg-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-700">Direction en attente</span>
                  )}
                </div>
                {selectedReviewRow?.validationEntry?.exploitation && (
                  <p className="mt-2 text-xs text-slate-600">
                    Exploitation: {selectedReviewRow.validationEntry.exploitation.validatedBy} - {formatDateTime(selectedReviewRow.validationEntry.exploitation.validatedAt)}
                  </p>
                )}
                {selectedReviewRow?.validationEntry?.direction && (
                  <p className="mt-1 text-xs text-slate-600">
                    Direction: {selectedReviewRow.validationEntry.direction.validatedBy} - {formatDateTime(selectedReviewRow.validationEntry.direction.validatedAt)}
                  </p>
                )}
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => employee && togglePayrollValidation(employee.id, 'exploitation', true)}
                    disabled={!employee || !reviewRows.find(row => row.member.id === employee.id)?.hasSlip}
                    className="rounded-xl bg-sky-600 px-3 py-2 text-xs font-medium text-white disabled:opacity-45"
                  >
                    Valider exploitation
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (!employee) return
                      if (!selectedReviewRow?.isExploitationValidated) {
                        setError('Validez d abord l exploitation avant la direction.')
                        return
                      }
                      togglePayrollValidation(employee.id, 'direction', true)
                      setError(null)
                      setNotice(`Validation direction enregistree pour ${staffDisplayName(employee)}.`)
                    }}
                    disabled={!employee || !selectedReviewRow?.isExploitationValidated || selectedReviewRow?.isDirectionValidated}
                    className="rounded-xl bg-emerald-600 px-3 py-2 text-xs font-medium text-white disabled:opacity-45"
                  >
                    Valider direction
                  </button>
                  <button
                    type="button"
                    onClick={() => employee && togglePayrollValidation(employee.id, 'direction', false)}
                    disabled={!employee || !selectedReviewRow?.isDirectionValidated}
                    className="rounded-xl border border-slate-300 px-3 py-2 text-xs font-medium text-slate-700 disabled:opacity-45"
                  >
                    Retirer direction
                  </button>
                  <button
                    type="button"
                    onClick={() => employee && togglePayrollValidation(employee.id, 'exploitation', false)}
                    disabled={!employee || !selectedReviewRow?.isExploitationValidated}
                    className="rounded-xl border border-slate-300 px-3 py-2 text-xs font-medium text-slate-700 disabled:opacity-45"
                  >
                    Retirer exploitation
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (!employee) return
                      setActiveTab('saisie')
                      setSelectedEmployeeId(employee.id)
                      setNotice(`Mode saisie ouvert pour ${staffDisplayName(employee)}. Ajustez les valeurs puis regenerez le bulletin.`)
                      setError(null)
                    }}
                    className="rounded-xl border border-slate-300 px-3 py-2 text-xs font-medium text-slate-700"
                  >
                    Modifier la fiche
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <p className="text-sm font-semibold text-slate-900">Visualisation de la fiche</p>
            {!selectedReviewRow?.periodSlip ? (
              <p className="mt-2 text-xs text-slate-500">Aucun bulletin disponible pour ce collaborateur et cette periode.</p>
            ) : (
              <div className="mt-3 space-y-3">
                <div className="grid gap-2 md:grid-cols-3">
                  <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3">
                    <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Brut soumis</p>
                    <p className="mt-1 text-sm font-semibold text-slate-900">{formatMoney(selectedReviewRow.periodSlip.grossSubject)} EUR</p>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3">
                    <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Cotisations salariales</p>
                    <p className="mt-1 text-sm font-semibold text-slate-900">{formatMoney(selectedReviewRow.periodSlip.employeeContributions)} EUR</p>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3">
                    <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Net a payer</p>
                    <p className="mt-1 text-sm font-semibold text-slate-900">{formatMoney(selectedReviewRow.periodSlip.netToPay)} EUR</p>
                  </div>
                </div>

                {selectedReviewRow.periodSlip.alertesConformite.length > 0 && (
                  <div className="space-y-2">
                    {selectedReviewRow.periodSlip.alertesConformite.map((alert, index) => (
                      <div
                        key={`${selectedReviewRow.periodSlip?.id}-alert-${index}`}
                        className={`rounded-xl border px-3 py-2 text-xs ${alert.niveau === 'bloquant' ? 'border-rose-200 bg-rose-50 text-rose-700' : 'border-amber-200 bg-amber-50 text-amber-700'}`}
                      >
                        {alert.niveau.toUpperCase()} - {alert.message}
                      </div>
                    ))}
                  </div>
                )}

                <div className="overflow-x-auto rounded-xl border border-slate-200">
                  <table className="min-w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-600">
                      <tr>
                        <th className="px-3 py-2 font-semibold">Ligne cotisation</th>
                        <th className="px-3 py-2 font-semibold">Base</th>
                        <th className="px-3 py-2 font-semibold">Part salariale</th>
                        <th className="px-3 py-2 font-semibold">Part patronale</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedReviewRow.periodSlip.contributionLines.map(line => (
                        <tr key={`${selectedReviewRow.periodSlip?.id}-${line.label}`} className="border-t border-slate-100 text-slate-700">
                          <td className="px-3 py-2">{line.label}</td>
                          <td className="px-3 py-2">{formatMoney(line.base)} EUR</td>
                          <td className="px-3 py-2">{formatMoney(line.employeeAmount)} EUR</td>
                          <td className="px-3 py-2">{formatMoney(line.employerAmount)} EUR</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <p className="text-sm font-semibold text-slate-900">Revision collaborateur par collaborateur</p>
            <p className="mt-1 text-xs text-slate-500">Statut de validation sur la periode {form.periodLabel}.</p>
            <div className="mt-4 divide-y divide-slate-100">
              {reviewRows.map(row => (
                <button
                  key={row.member.id}
                  type="button"
                  onClick={() => setSelectedEmployeeId(row.member.id)}
                  className={`flex w-full items-center justify-between gap-3 px-2 py-3 text-left ${selectedEmployeeId === row.member.id ? 'bg-slate-100' : ''}`}
                >
                  <div>
                    <p className="text-sm font-medium text-slate-900">{staffDisplayName(row.member)}</p>
                    <p className="mt-1 text-xs text-slate-500">{row.member.matricule}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {row.hasSlip ? (
                      <span className="rounded-full bg-blue-100 px-2.5 py-1 text-xs font-semibold text-blue-800">Bulletin OK</span>
                    ) : (
                      <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-800">Bulletin manquant</span>
                    )}
                    {row.isExploitationValidated ? (
                      <span className="rounded-full bg-sky-100 px-2.5 py-1 text-xs font-semibold text-sky-800">Exploitation OK</span>
                    ) : (
                      <span className="rounded-full bg-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-700">Exploitation KO</span>
                    )}
                    {row.isDirectionValidated ? (
                      <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-800">Direction OK</span>
                    ) : (
                      <span className="rounded-full bg-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-700">Direction KO</span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>{label}</span>
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
