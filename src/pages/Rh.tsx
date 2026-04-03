import { useEffect, useMemo, useState, type ChangeEvent, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useAuth, ROLE_LABELS } from '@/lib/auth'
import { ensureEmployeeRecord, generateProfessionalEmail, getEmployeeRecord, listEmployeeRecords, subscribeEmployeeRecords, updateEmployeeRecord, type EmployeeRecord } from '@/lib/employeeRecords'
import { ensureEmployeeJobSheets, ensurePolicyDocuments, generateEmploymentContract, generateJobSheet, HR_CATEGORY_LABELS, uploadEmployeeDocument } from '@/lib/hrDocuments'
import { importEmployeeIntakeForm, provisionEmployeeOnboarding } from '@/lib/onboarding'
import { createPayrollSlip } from '@/lib/payroll'
import { buildStaffDirectory, findStaffMember, staffDisplayName } from '@/lib/staffDirectory'
import { createEntretienRh, deleteEntretienRh, fetchEntretienRh, fetchUpcomingEntretiens, updateEntretienRh, type EntretienRh } from '@/lib/entretienRh'

const RH_UPLOAD_CATEGORIES = ['carte_vitale', 'carte_identite', 'justificatif_domicile', 'scan_complementaire'] as const
const inp = 'w-full rounded-xl border bg-[color:var(--surface)] px-3 py-2.5 text-sm text-[color:var(--text)] outline-none focus:border-[color:var(--primary)]'
type RhTab = 'employes' | 'documents' | 'entretiens'

export default function Rh() {
  const { profil, accountProfil } = useAuth()
  const [activeTab, setActiveTab] = useState<RhTab>('employes')
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('')
  const [employeeRecords, setEmployeeRecords] = useState<EmployeeRecord[]>(() => listEmployeeRecords())
  const [roleFilter, setRoleFilter] = useState('all')
  const [searchEmployee, setSearchEmployee] = useState('')
  const [employeeDraft, setEmployeeDraft] = useState<EmployeeRecord | null>(null)
  const [payPeriod, setPayPeriod] = useState('Mars 2026')
  const [payAmount, setPayAmount] = useState('2450')
  const [uploadCategory, setUploadCategory] = useState<(typeof RH_UPLOAD_CATEGORIES)[number]>('carte_vitale')
  const [notice, setNotice] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  
  // Entretiens RH
  const [entretiens, setEntretiens] = useState<EntretienRh[]>([])
  const [upcomingEntretiens, setUpcomingEntretiens] = useState<EntretienRh[]>([])
  const [isLoadingEntretiens, setIsLoadingEntretiens] = useState(false)
  const [editingEntretienId, setEditingEntretienId] = useState<string | null>(null)
  const [entretienForm, setEntretienForm] = useState<Partial<EntretienRh>>({
    type: 'entretien_professionnel',
    duree_minutes: 60,
    statut: 'planifie',
    suivi_requis: false,
  })
  const [showEntretienForm, setShowEntretienForm] = useState(false)

  const staff = useMemo(() => buildStaffDirectory([profil, accountProfil]), [profil, accountProfil])
  const selectedEmployee = findStaffMember(staff, selectedEmployeeId || profil?.id)
  const selectedEmployeeRecord = selectedEmployee ? getEmployeeRecord(selectedEmployee.id) ?? ensureEmployeeRecord({
    employeeId: selectedEmployee.id,
    role: selectedEmployee.role,
    firstName: selectedEmployee.prenom,
    lastName: selectedEmployee.nom,
    professionalEmail: selectedEmployee.email ?? generateProfessionalEmail(selectedEmployee.prenom, selectedEmployee.nom),
    loginEmail: selectedEmployee.email,
    jobTitle: ROLE_LABELS[selectedEmployee.role] ?? selectedEmployee.role,
  }) : null

  const filteredEmployees = useMemo(() => {
    const normalizedSearch = searchEmployee.trim().toLowerCase()
    return staff.filter(member => {
      if (roleFilter !== 'all' && member.role !== roleFilter) return false
      if (!normalizedSearch) return true
      const record = employeeRecords.find(item => item.employeeId === member.id)
      const haystack = [
        member.nom,
        member.prenom,
        member.email,
        member.matricule,
        ROLE_LABELS[member.role],
        record?.professionalEmail,
        record?.jobTitle,
      ].filter(Boolean).join(' ').toLowerCase()
      return haystack.includes(normalizedSearch)
    })
  }, [employeeRecords, roleFilter, searchEmployee, staff])

  const roleOptions = useMemo(() => {
    const unique = Array.from(new Set(staff.map(member => member.role)))
    return unique.sort((left, right) => (ROLE_LABELS[left] ?? left).localeCompare(ROLE_LABELS[right] ?? right, 'fr'))
  }, [staff])

  const evaluatorsOptions = useMemo(() => {
    return staff.filter(member => member.role === 'rh' || member.role === 'dirigeant' || member.role === 'admin')
  }, [staff])

  useEffect(() => {
    if (!profil) return
    staff.forEach(member => {
      ensureEmployeeRecord({
        employeeId: member.id,
        matricule: member.matricule,
        role: member.role,
        firstName: member.prenom,
        lastName: member.nom,
        professionalEmail: member.email ?? generateProfessionalEmail(member.prenom, member.nom),
        loginEmail: member.email,
        jobTitle: ROLE_LABELS[member.role] ?? member.role,
      })
    })
    setEmployeeRecords(listEmployeeRecords())
    ensurePolicyDocuments(staff, profil)
    ensureEmployeeJobSheets(staff, profil)
  }, [profil, staff])

  useEffect(() => {
    if (selectedEmployeeId) return
    if (staff.length === 0) return
    setSelectedEmployeeId(staff[0].id)
  }, [selectedEmployeeId, staff])

  useEffect(() => subscribeEmployeeRecords(() => {
    setEmployeeRecords(listEmployeeRecords())
  }), [])

  useEffect(() => {
    if (!selectedEmployeeRecord) {
      setEmployeeDraft(null)
      return
    }
    setEmployeeDraft(selectedEmployeeRecord)
  }, [selectedEmployeeRecord])

  // Load entretiens RH from Supabase
  useEffect(() => {
    const loadEntretiens = async () => {
      setIsLoadingEntretiens(true)
      const data = await fetchEntretienRh()
      setEntretiens(data)
      setIsLoadingEntretiens(false)
    }
    void loadEntretiens()
  }, [])

  // Load upcoming entretiens for dashboard
  useEffect(() => {
    const loadUpcoming = async () => {
      const data = await fetchUpcomingEntretiens(7)
      setUpcomingEntretiens(data)
    }
    void loadUpcoming()
  }, [])

  // Reset form when not editing
  useEffect(() => {
    if (!editingEntretienId) {
      setEntretienForm({
        type: 'entretien_professionnel',
        duree_minutes: 60,
        statut: 'planifie',
        suivi_requis: false,
      })
    } else {
      const editing = entretiens.find(e => e.id === editingEntretienId)
      if (editing) {
        setEntretienForm(editing)
      }
    }
  }, [editingEntretienId, entretiens])

  if (!profil) return null
  const actor = profil

  function updateDraft<K extends keyof EmployeeRecord>(key: K, value: EmployeeRecord[K]) {
    setEmployeeDraft(current => current ? { ...current, [key]: value } : current)
  }

  function handleSaveEmployee() {
    if (!selectedEmployee || !employeeDraft) return
    const nextChildren = employeeDraft.childrenCount === null || employeeDraft.childrenCount === undefined
      ? null
      : Number.isFinite(Number(employeeDraft.childrenCount))
        ? Number(employeeDraft.childrenCount)
        : null
    const nextHourlyRate = employeeDraft.hourlyRate === null || employeeDraft.hourlyRate === undefined
      ? null
      : Number.isFinite(Number(employeeDraft.hourlyRate))
        ? Number(employeeDraft.hourlyRate)
        : null
    const nextMonthlyBaseHours = Number.isFinite(Number(employeeDraft.monthlyBaseHours))
      ? Number(employeeDraft.monthlyBaseHours)
      : 151.67

    updateEmployeeRecord(selectedEmployee.id, {
      ...employeeDraft,
      childrenCount: nextChildren,
      hourlyRate: nextHourlyRate,
      monthlyBaseHours: nextMonthlyBaseHours,
    })
    setEmployeeRecords(listEmployeeRecords())
    setNotice(`Informations collaborateur mises a jour pour ${staffDisplayName(selectedEmployee)}.`)
    setError(null)
  }

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

  // Entretiens RH handlers
  async function handleSaveEntretien() {
    if (!entretienForm.employe_id || !entretienForm.titre || !entretienForm.date_planifiee) {
      setError('Collaborateur, titre et date sont obligatoires.')
      return
    }

    try {
      if (editingEntretienId) {
        const updated = await updateEntretienRh(editingEntretienId, entretienForm as Partial<EntretienRh>)
        if (updated) {
          setEntretiens(entretiens.map(e => e.id === editingEntretienId ? updated : e))
          setNotice('Entretien mis à jour.')
          resetEntretienForm()
        } else {
          setError('Erreur lors de la mise à jour.')
        }
      } else {
        const created = await createEntretienRh(entretienForm as Omit<EntretienRh, 'id' | 'created_at' | 'updated_at'>)
        if (created) {
          setEntretiens([...entretiens, created])
          setNotice('Entretien créé.')
          resetEntretienForm()
        } else {
          setError('Erreur lors de la création.')
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de l\'enregistrement.')
    }
  }

  async function handleDeleteEntretien(id: string) {
    if (!confirm('Supprimer cet entretien ?')) return
    try {
      const success = await deleteEntretienRh(id)
      if (success) {
        setEntretiens(entretiens.filter(e => e.id !== id))
        setNotice('Entretien supprimé.')
        if (editingEntretienId === id) {
          resetEntretienForm()
        }
      } else {
        setError('Erreur lors de la suppression.')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la suppression.')
    }
  }

  function resetEntretienForm() {
    setEditingEntretienId(null)
    setShowEntretienForm(false)
    setEntretienForm({
      type: 'entretien_professionnel',
      duree_minutes: 60,
      statut: 'planifie',
      suivi_requis: false,
    })
  }

  function handleEditEntretien(entretien: EntretienRh) {
    setEditingEntretienId(entretien.id)
    setEntretienForm(entretien)
    setShowEntretienForm(true)
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
        <div className="mb-5 inline-flex rounded-xl border border-slate-200 bg-slate-50 p-1">
          <button
            type="button"
            onClick={() => setActiveTab('employes')}
            className={`rounded-lg px-4 py-2 text-sm font-medium ${activeTab === 'employes' ? 'bg-slate-900 text-white' : 'text-slate-600'}`}
          >
            Employes
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('documents')}
            className={`rounded-lg px-4 py-2 text-sm font-medium ${activeTab === 'documents' ? 'bg-slate-900 text-white' : 'text-slate-600'}`}
          >
            Onboarding et documents
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('entretiens')}
            className={`rounded-lg px-4 py-2 text-sm font-medium ${activeTab === 'entretiens' ? 'bg-slate-900 text-white' : 'text-slate-600'}`}
          >
            Entretiens professionnels
          </button>
        </div>

        {activeTab === 'employes' && (
          <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
            <div className="space-y-4">
              <div className="grid gap-3 md:grid-cols-2">
                <Field label="Filtre metier">
                  <select className={inp} value={roleFilter} onChange={event => setRoleFilter(event.target.value)}>
                    <option value="all">Tous les metiers</option>
                    {roleOptions.map(role => (
                      <option key={role} value={role}>{ROLE_LABELS[role] ?? role}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Recherche rapide">
                  <input
                    className={inp}
                    placeholder="Nom, matricule, email, metier..."
                    value={searchEmployee}
                    onChange={event => setSearchEmployee(event.target.value)}
                  />
                </Field>
              </div>

              <div className="max-h-[480px] overflow-auto rounded-2xl border border-slate-200">
                {filteredEmployees.length === 0 && (
                  <p className="px-4 py-6 text-sm text-slate-500">Aucun employe ne correspond a ce filtre.</p>
                )}
                {filteredEmployees.map(member => {
                  const isActive = selectedEmployeeId === member.id
                  return (
                    <button
                      key={member.id}
                      type="button"
                      onClick={() => setSelectedEmployeeId(member.id)}
                      className={`w-full border-b border-slate-100 px-4 py-3 text-left last:border-b-0 ${isActive ? 'bg-slate-900 text-white' : 'bg-white text-slate-700 hover:bg-slate-50'}`}
                    >
                      <p className="text-sm font-semibold">{staffDisplayName(member)}</p>
                      <p className={`mt-1 text-xs ${isActive ? 'text-slate-200' : 'text-slate-500'}`}>
                        {member.matricule} - {ROLE_LABELS[member.role] ?? member.role}
                      </p>
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="space-y-4">
              {!selectedEmployee || !employeeDraft ? (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-5 text-sm text-slate-500">
                  Selectionne un employe pour modifier ses informations.
                </div>
              ) : (
                <>
                  <div className="grid gap-4 md:grid-cols-2">
                    <Field label="Prenom"><input className={inp} value={employeeDraft.firstName} onChange={event => updateDraft('firstName', event.target.value)} /></Field>
                    <Field label="Nom"><input className={inp} value={employeeDraft.lastName} onChange={event => updateDraft('lastName', event.target.value)} /></Field>
                    <Field label="Matricule"><input className={inp} value={employeeDraft.matricule} onChange={event => updateDraft('matricule', event.target.value)} /></Field>
                    <Field label="Poste / metier"><input className={inp} value={employeeDraft.jobTitle ?? ''} onChange={event => updateDraft('jobTitle', event.target.value)} /></Field>
                    <Field label="Email professionnel"><input className={inp} value={employeeDraft.professionalEmail} onChange={event => updateDraft('professionalEmail', event.target.value)} /></Field>
                    <Field label="Email connexion"><input className={inp} value={employeeDraft.loginEmail ?? ''} onChange={event => updateDraft('loginEmail', event.target.value || null)} /></Field>
                    <Field label="Email personnel"><input className={inp} value={employeeDraft.personalEmail ?? ''} onChange={event => updateDraft('personalEmail', event.target.value || null)} /></Field>
                    <Field label="Telephone"><input className={inp} value={employeeDraft.phone ?? ''} onChange={event => updateDraft('phone', event.target.value || null)} /></Field>
                    <Field label="Adresse"><input className={inp} value={employeeDraft.address ?? ''} onChange={event => updateDraft('address', event.target.value || null)} /></Field>
                    <Field label="Code postal"><input className={inp} value={employeeDraft.postalCode ?? ''} onChange={event => updateDraft('postalCode', event.target.value || null)} /></Field>
                    <Field label="Ville"><input className={inp} value={employeeDraft.city ?? ''} onChange={event => updateDraft('city', event.target.value || null)} /></Field>
                    <Field label="Date de naissance"><input type="date" className={inp} value={employeeDraft.birthDate ?? ''} onChange={event => updateDraft('birthDate', event.target.value || null)} /></Field>
                    <Field label="Contact urgence"><input className={inp} value={employeeDraft.emergencyContactName ?? ''} onChange={event => updateDraft('emergencyContactName', event.target.value || null)} /></Field>
                    <Field label="Tel urgence"><input className={inp} value={employeeDraft.emergencyContactPhone ?? ''} onChange={event => updateDraft('emergencyContactPhone', event.target.value || null)} /></Field>
                    <Field label="Numero securite sociale"><input className={inp} value={employeeDraft.socialSecurityNumber ?? ''} onChange={event => updateDraft('socialSecurityNumber', event.target.value || null)} /></Field>
                    <Field label="Situation familiale"><input className={inp} value={employeeDraft.maritalStatus ?? ''} onChange={event => updateDraft('maritalStatus', event.target.value || null)} /></Field>
                    <Field label="Nombre d enfants"><input type="number" min={0} className={inp} value={employeeDraft.childrenCount ?? ''} onChange={event => updateDraft('childrenCount', event.target.value === '' ? null : Number(event.target.value))} /></Field>
                    <Field label="IBAN"><input className={inp} value={employeeDraft.iban ?? ''} onChange={event => updateDraft('iban', event.target.value || null)} /></Field>
                    <Field label="Mutuelle"><input className={inp} value={employeeDraft.mutuellePlan ?? ''} onChange={event => updateDraft('mutuellePlan', event.target.value || null)} /></Field>
                    <Field label="Type de contrat"><input className={inp} value={employeeDraft.contractType ?? ''} onChange={event => updateDraft('contractType', event.target.value || null)} /></Field>
                    <Field label="Convention collective"><input className={inp} value={employeeDraft.conventionCollective} onChange={event => updateDraft('conventionCollective', event.target.value)} /></Field>
                    <Field label="Coefficient"><input className={inp} value={employeeDraft.jobCoefficient ?? ''} onChange={event => updateDraft('jobCoefficient', event.target.value || null)} /></Field>
                    <Field label="Taux horaire"><input type="number" step="0.01" className={inp} value={employeeDraft.hourlyRate ?? ''} onChange={event => updateDraft('hourlyRate', event.target.value === '' ? null : Number(event.target.value))} /></Field>
                    <Field label="Heures base mensuelle"><input type="number" step="0.01" className={inp} value={employeeDraft.monthlyBaseHours} onChange={event => updateDraft('monthlyBaseHours', Number(event.target.value))} /></Field>
                    <Field label="Code provisoire"><input className={inp} value={employeeDraft.provisionalCode ?? ''} onChange={event => updateDraft('provisionalCode', event.target.value || null)} /></Field>
                  </div>
                  <button type="button" onClick={handleSaveEmployee} className="rounded-xl bg-slate-900 px-4 py-3 text-sm font-medium text-white">
                    Enregistrer les modifications
                  </button>
                </>
              )}
            </div>
          </div>
        )}

        {activeTab === 'documents' && (
          <>
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">Dossier salarie</p>
        <h3 className="mt-2 text-lg font-semibold text-slate-900">Onboarding et documents RH</h3>
        <p className="mt-1 text-sm text-slate-500">Toute la gestion RH est centralisee ici, separee des reglages generaux.</p>

        <div className="mt-5 grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
          <div className="space-y-4">
            <Field label="Collaborateur">
              <select className={inp} value={selectedEmployeeId} onChange={event => setSelectedEmployeeId(event.target.value)}>
                {staff.map(member => (
                  <option key={member.id} value={member.id}>{staffDisplayName(member)} - {member.matricule} - {ROLE_LABELS[member.role]}</option>
                ))}
              </select>
            </Field>
            {selectedEmployee && (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-600">
                <p className="font-semibold text-slate-900">{staffDisplayName(selectedEmployee)}</p>
                <p className="mt-1 font-mono text-xs text-slate-500">Matricule: {selectedEmployee.matricule}</p>
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
        </>
        )}

        {activeTab === 'entretiens' && (
          <>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">Suivi RH</p>
            <h3 className="mt-2 text-lg font-semibold text-slate-900">Entretiens professionnels</h3>
            <p className="mt-1 text-sm text-slate-500">Planification et suivi des entretiens d'évaluation, bilan de compétences et réunions management.</p>

            {upcomingEntretiens.length > 0 && (
              <div className="mt-4 rounded-xl border border-blue-200 bg-blue-50 p-4">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0">
                    <span className="text-2xl">⏰</span>
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-blue-900">Entretiens à planifier</h4>
                    <p className="text-sm text-blue-700 mt-1">
                      {upcomingEntretiens.length} entretien{upcomingEntretiens.length > 1 ? 's' : ''} planifié{upcomingEntretiens.length > 1 ? 's' : ''} au cours des 7 prochains jours
                    </p>
                    <ul className="mt-2 space-y-1">
                      {upcomingEntretiens.slice(0, 3).map(e => {
                        const emp = staff.find(m => m.id === e.employe_id)
                        return (
                          <li key={e.id} className="text-xs text-blue-800">
                            • {new Date(e.date_planifiee).toLocaleDateString('fr-FR')} - {emp ? staffDisplayName(emp) : 'Employé inconnu'} ({e.titre})
                          </li>
                        )
                      })}
                      {upcomingEntretiens.length > 3 && (
                        <li className="text-xs text-blue-700 italic">et {upcomingEntretiens.length - 3} autre{upcomingEntretiens.length - 3 > 1 ? 's' : ''}...</li>
                      )}
                    </ul>
                  </div>
                </div>
              </div>
            )}

            <div className="mt-5 space-y-4">
              <div className="flex items-center justify-between">
                <div className="grid gap-3 grid-cols-2 lg:grid-cols-4 flex-1">
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                    <p className="text-2xl font-bold text-slate-900">{entretiens.length}</p>
                    <p className="text-xs text-slate-600 mt-1">Entretiens</p>
                  </div>
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                    <p className="text-2xl font-bold text-slate-900">{entretiens.filter(e => e.statut === 'planifie').length}</p>
                    <p className="text-xs text-slate-600 mt-1">Planifiés</p>
                  </div>
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                    <p className="text-2xl font-bold text-slate-900">{entretiens.filter(e => e.statut === 'effectue').length}</p>
                    <p className="text-xs text-slate-600 mt-1">Effectués</p>
                  </div>
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                    <p className="text-2xl font-bold text-amber-700">{entretiens.filter(e => e.suivi_requis && e.statut === 'effectue').length}</p>
                    <p className="text-xs text-slate-600 mt-1">Suivi requis</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowEntretienForm(!showEntretienForm)}
                  className="ml-4 h-fit rounded-xl bg-slate-900 px-4 py-3 text-sm font-medium text-white whitespace-nowrap"
                >
                  {showEntretienForm ? 'Annuler' : '+ Ajouter'}
                </button>
              </div>

              {showEntretienForm && (
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3">
                  <div className="grid gap-3 md:grid-cols-2">
                    <Field label="Collaborateur">
                      <select
                        className={inp}
                        value={entretienForm.employe_id || ''}
                        onChange={e => setEntretienForm({ ...entretienForm, employe_id: e.target.value })}
                      >
                        <option value="">Sélectionner...</option>
                        {staff.map(member => (
                          <option key={member.id} value={member.id}>
                            {staffDisplayName(member)}
                          </option>
                        ))}
                      </select>
                    </Field>
                    <Field label="Évaluateur">
                      <select
                        className={inp}
                        value={entretienForm.evaluateur_id || ''}
                        onChange={e => setEntretienForm({ ...entretienForm, evaluateur_id: e.target.value || null })}
                      >
                        <option value="">Non assigné</option>
                        {evaluatorsOptions.map(member => (
                          <option key={member.id} value={member.id}>
                            {staffDisplayName(member)}
                          </option>
                        ))}
                      </select>
                    </Field>
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    <Field label="Type d'entretien">
                      <select
                        className={inp}
                        value={entretienForm.type || 'entretien_professionnel'}
                        onChange={e => setEntretienForm({ ...entretienForm, type: e.target.value as EntretienRh['type'] })}
                      >
                        <option value="evaluation_annuelle">Évaluation annuelle</option>
                        <option value="entretien_professionnel">Entretien professionnel</option>
                        <option value="bilan_competences">Bilan de compétences</option>
                        <option value="reunion_management">Réunion management</option>
                        <option value="autre">Autre</option>
                      </select>
                    </Field>
                  </div>
                  <Field label="Titre / Objet">
                    <input
                      className={inp}
                      placeholder="Ex: Évaluation performance Q1 2026"
                      value={entretienForm.titre || ''}
                      onChange={e => setEntretienForm({ ...entretienForm, titre: e.target.value })}
                    />
                  </Field>
                  <Field label="Description (optionnel)">
                    <textarea
                      className={inp}
                      rows={2}
                      placeholder="Notes supplémentaires..."
                      value={entretienForm.description || ''}
                      onChange={e => setEntretienForm({ ...entretienForm, description: e.target.value || null })}
                    />
                  </Field>
                  <div className="grid gap-3 md:grid-cols-2">
                    <Field label="Date planifiée">
                      <input
                        className={inp}
                        type="date"
                        value={entretienForm.date_planifiee || ''}
                        onChange={e => setEntretienForm({ ...entretienForm, date_planifiee: e.target.value })}
                      />
                    </Field>
                    <Field label="Heure">
                      <input
                        className={inp}
                        type="time"
                        value={entretienForm.heure_debut || ''}
                        onChange={e => setEntretienForm({ ...entretienForm, heure_debut: e.target.value })}
                      />
                    </Field>
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    <Field label="Durée (minutes)">
                      <input
                        className={inp}
                        type="number"
                        min="15"
                        step="15"
                        value={entretienForm.duree_minutes || 60}
                        onChange={e => setEntretienForm({ ...entretienForm, duree_minutes: parseInt(e.target.value) })}
                      />
                    </Field>
                    <Field label="Statut">
                      <select
                        className={inp}
                        value={entretienForm.statut || 'planifie'}
                        onChange={e => setEntretienForm({ ...entretienForm, statut: e.target.value as EntretienRh['statut'] })}
                      >
                        <option value="planifie">Planifié</option>
                        <option value="effectue">Effectué</option>
                        <option value="reporte">Reporté</option>
                        <option value="annule">Annulé</option>
                      </select>
                    </Field>
                  </div>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={entretienForm.suivi_requis || false}
                      onChange={e => setEntretienForm({ ...entretienForm, suivi_requis: e.target.checked })}
                      className="rounded border border-slate-200"
                    />
                    <span className="text-sm text-slate-700">Suivi requis</span>
                  </label>
                  {entretienForm.suivi_requis && (
                    <Field label="Date de suivi prévue">
                      <input
                        className={inp}
                        type="date"
                        value={entretienForm.date_suivi_prevu || ''}
                        onChange={e => setEntretienForm({ ...entretienForm, date_suivi_prevu: e.target.value })}
                      />
                    </Field>
                  )}
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => void handleSaveEntretien()}
                      disabled={isLoadingEntretiens}
                      className="flex-1 rounded-xl bg-slate-900 px-4 py-3 text-sm font-medium text-white disabled:opacity-50"
                    >
                      {editingEntretienId ? 'Mettre à jour' : 'Créer'}
                    </button>
                    {editingEntretienId && (
                      <button
                        type="button"
                        onClick={() => void handleDeleteEntretien(editingEntretienId)}
                        disabled={isLoadingEntretiens}
                        className="rounded-xl bg-red-100 px-4 py-3 text-sm font-medium text-red-700 disabled:opacity-50"
                      >
                        Supprimer
                      </button>
                    )}
                  </div>
                </div>
              )}

              {entretiens.length === 0 ? (
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-6 text-center">
                  <p className="text-sm text-slate-500">Aucun entretien pour le moment.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {entretiens
                    .sort((a, b) => new Date(b.date_planifiee).getTime() - new Date(a.date_planifiee).getTime())
                    .map(entretien => {
                      const employee = staff.find(m => m.id === entretien.employe_id)
                      const statusColors: Record<string, string> = {
                        planifie: 'bg-blue-50 border-blue-200 text-blue-700',
                        effectue: 'bg-green-50 border-green-200 text-green-700',
                        reporte: 'bg-yellow-50 border-yellow-200 text-yellow-700',
                        annule: 'bg-slate-50 border-slate-200 text-slate-600',
                      }
                      return (
                        <div key={entretien.id} className={`rounded-lg border p-4 ${statusColors[entretien.statut] || statusColors.planifie}`}>
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1">
                              <h4 className="font-semibold text-sm">{entretien.titre}</h4>
                              {employee && <p className="text-xs mt-1 opacity-75">{staffDisplayName(employee)}</p>}
                              <div className="flex gap-2 mt-2 flex-wrap">
                                <span className="text-xs px-2 py-0.5 rounded bg-white/50 font-medium">
                                  {new Date(entretien.date_planifiee).toLocaleDateString('fr-FR')}
                                </span>
                                {entretien.heure_debut && (
                                  <span className="text-xs px-2 py-0.5 rounded bg-white/50 font-medium">
                                    {entretien.heure_debut}
                                  </span>
                                )}
                                <span className="text-xs px-2 py-0.5 rounded bg-white/50 font-medium">
                                  {entretien.duree_minutes} min
                                </span>
                              </div>
                              {entretien.description && <p className="text-xs mt-2 opacity-75">{entretien.description}</p>}
                              {entretien.suivi_requis && entretien.date_suivi_prevu && (
                                <p className="text-xs mt-2 opacity-75">
                                  📌 Suivi prévu: {new Date(entretien.date_suivi_prevu).toLocaleDateString('fr-FR')}
                                </p>
                              )}
                            </div>
                            <button
                              type="button"
                              onClick={() => handleEditEntretien(entretien)}
                              className="text-xs px-2 py-1 rounded border bg-white/30 hover:bg-white/50 transition"
                            >
                              Éditer
                            </button>
                          </div>
                        </div>
                      )
                    })}
                </div>
              )}
            </div>
          </>
        )}
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
