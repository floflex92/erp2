import { useEffect, useMemo, useState, type ChangeEvent, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useAuth, ROLE_LABELS, type Role } from '@/lib/auth'
import { ensureEmployeeRecord, generateProfessionalEmail, getEmployeeRecord, listEmployeeRecords, subscribeEmployeeRecords, updateEmployeeRecord, type EmployeeRecord } from '@/lib/employeeRecords'
import { ensureEmployeeJobSheets, ensurePolicyDocuments, generateEmploymentContract, generateJobSheet, HR_CATEGORY_LABELS, uploadEmployeeDocument } from '@/lib/hrDocuments'
import { importEmployeeIntakeForm, provisionEmployeeOnboarding } from '@/lib/onboarding'
import { createPayrollSlip } from '@/lib/payroll'
import { buildStaffDirectory, findStaffMember, staffDisplayName } from '@/lib/staffDirectory'
import { createAbsenceRh, deleteAbsenceRh, fetchAbsencesRh, fetchSoldeAbsences, TYPE_ABSENCE_LABELS, STATUT_ABSENCE_LABELS, STATUT_ABSENCE_COLORS, ABSENCE_WORKFLOW_STEPS, upsertSoldeAbsences, updateAbsenceRh, type AbsenceRh, type SoldeAbsences, type TypeAbsence, type StatutAbsence } from '@/lib/absencesRh'
import { generateCongeDocumentPDF } from '@/lib/congePdf'
import { supabase } from '@/lib/supabase'
import type { Tables } from '@/lib/database.types'
import EntretiensSalaries from '@/pages/EntretiensSalaries'
import { useScrollToTopOnChange } from '@/hooks/useScrollToTopOnChange'

const RH_UPLOAD_CATEGORIES = ['carte_vitale', 'carte_identite', 'justificatif_domicile', 'scan_complementaire'] as const
const inp = 'nx-input w-full'
type RhTab = 'employes' | 'effectif' | 'documents' | 'entretiens' | 'absences'

type ProfilRow = Tables<'profils'>
type ConducteurRow = Tables<'conducteurs'>
type ExploitantRow = Tables<'exploitants'>

type WorkforceMember = {
  id: string
  source: 'profil' | 'conducteur' | 'exploitant' | 'annuaire'
  nomComplet: string
  metier: string
  matricule: string | null
  email: string | null
  statut: string
}

export default function Rh() {
  const { profil, accountProfil, companyId } = useAuth()
  const [activeTab, setActiveTab] = useState<RhTab>('employes')
  useScrollToTopOnChange(activeTab)
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
  
  // Absences RH
  const [absences, setAbsences] = useState<AbsenceRh[]>([])
  const [isLoadingAbsences, setIsLoadingAbsences] = useState(false)
  const [absenceFilterEmploye, setAbsenceFilterEmploye] = useState('')
  const [absenceFilterStatut, setAbsenceFilterStatut] = useState<StatutAbsence | 'tous'>('tous')
  const [showAbsenceForm, setShowAbsenceForm] = useState(false)
  const [editingAbsenceId, setEditingAbsenceId] = useState<string | null>(null)
  const [absenceForm, setAbsenceForm] = useState<Partial<AbsenceRh>>({
    type_absence: 'conges_payes',
    date_debut: new Date().toISOString().slice(0, 10),
    date_fin: new Date().toISOString().slice(0, 10),
    nb_jours: 1,
    statut: 'demande',
  })
  const [solde, setSolde] = useState<SoldeAbsences | null>(null)
  const [soldeAnnee, setSoldeAnnee] = useState(new Date().getFullYear())
  const [solveDraft, setSoldeDraft] = useState({ cp_acquis: '0', cp_pris: '0', rtt_acquis: '0', rtt_pris: '0' })
  const [workforce, setWorkforce] = useState<WorkforceMember[]>([])
  const [workforceLoading, setWorkforceLoading] = useState(false)
  const [workforceWarning, setWorkforceWarning] = useState<string | null>(null)
  const [workforceFilter, setWorkforceFilter] = useState<'tous' | 'conducteurs' | 'exploitants' | 'mecaniciens' | 'autres'>('tous')
  const [workforceSearch, setWorkforceSearch] = useState('')

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
    async function loadWorkforce() {
      setWorkforceWarning(null)
      setWorkforceLoading(true)

      const annuaireBase: WorkforceMember[] = staff.map(member => ({
        id: `annuaire:${member.id}`,
        source: 'annuaire',
        nomComplet: staffDisplayName(member),
        metier: ROLE_LABELS[member.role] ?? member.role,
        matricule: member.matricule ?? null,
        email: member.email ?? null,
        statut: 'Annuaire',
      }))

      if (!companyId) {
        setWorkforce(annuaireBase)
        setWorkforceWarning('Company non detectee: affichage de l annuaire RH uniquement.')
        setWorkforceLoading(false)
        return
      }

      const [profilsRes, conducteursRes, exploitantsRes] = await Promise.all([
        supabase
          .from('profils')
          .select('id, nom, prenom, role, matricule, is_active, archived_at, company_id')
          .eq('company_id', companyId)
          .is('archived_at', null),
        supabase
          .from('conducteurs')
          .select('id, nom, prenom, email, matricule, statut, company_id')
          .eq('company_id', companyId),
        supabase
          .from('exploitants')
          .select('id, name, company_id, is_active, profil_id')
          .eq('company_id', companyId),
      ])

      const warnings: string[] = []
      if (profilsRes.error) warnings.push('profils')
      if (conducteursRes.error) warnings.push('conducteurs')
      if (exploitantsRes.error) warnings.push('exploitants')
      if (warnings.length > 0) {
        setWorkforceWarning(`Sources partielles indisponibles (${warnings.join(', ')}): affichage complete avec fallback annuaire.`)
      }

      const profils = (((profilsRes.error ? [] : profilsRes.data) as Pick<ProfilRow, 'id' | 'nom' | 'prenom' | 'role' | 'matricule' | 'is_active' | 'archived_at' | 'company_id'>[] | null) ?? [])
        .filter(item => item.company_id === companyId)
      const conducteurs = (((conducteursRes.error ? [] : conducteursRes.data) as Pick<ConducteurRow, 'id' | 'nom' | 'prenom' | 'email' | 'matricule' | 'statut' | 'company_id'>[] | null) ?? [])
        .filter(item => item.company_id === companyId)
      const exploitants = (((exploitantsRes.error ? [] : exploitantsRes.data) as Pick<ExploitantRow, 'id' | 'name' | 'company_id' | 'is_active' | 'profil_id'>[] | null) ?? [])
        .filter(item => item.company_id === companyId)

      const profilMembers: WorkforceMember[] = profils.map(item => ({
        id: `profil:${item.id}`,
        source: 'profil',
        nomComplet: `${item.prenom ?? ''} ${item.nom ?? ''}`.trim() || item.id,
        metier: ROLE_LABELS[(item.role as Role) ?? 'administratif'] ?? item.role,
        matricule: item.matricule ?? null,
        email: null,
        statut: item.is_active ? 'Actif' : 'Inactif',
      }))

      const conducteurMembers: WorkforceMember[] = conducteurs.map(item => ({
        id: `conducteur:${item.id}`,
        source: 'conducteur',
        nomComplet: `${item.prenom ?? ''} ${item.nom ?? ''}`.trim() || item.id,
        metier: 'Conducteur',
        matricule: item.matricule ?? null,
        email: item.email ?? null,
        statut: item.statut ?? 'inconnu',
      }))

      const exploitantMembers: WorkforceMember[] = exploitants.map(item => ({
        id: `exploitant:${item.id}`,
        source: 'exploitant',
        nomComplet: item.name,
        metier: 'Exploitant',
        matricule: null,
        email: null,
        statut: item.is_active ? 'Actif' : 'Inactif',
      }))

      const dbMembers = [...profilMembers, ...conducteurMembers, ...exploitantMembers]
      const knownKeys = new Set(
        dbMembers.map(item => `${item.nomComplet.toLowerCase()}|${(item.matricule ?? '').toLowerCase()}`),
      )
      const annuaireMembers: WorkforceMember[] = annuaireBase
        .filter(member => !knownKeys.has(`${member.nomComplet.toLowerCase()}|${(member.matricule ?? '').toLowerCase()}`))

      setWorkforce([...dbMembers, ...annuaireMembers])
      setWorkforceLoading(false)
    }

    void loadWorkforce()
  }, [companyId, staff])

  useEffect(() => {
    if (!selectedEmployeeRecord) {
      setEmployeeDraft(null)
      return
    }
    setEmployeeDraft(selectedEmployeeRecord)
  }, [selectedEmployeeRecord])

  const filteredWorkforce = useMemo(() => {
    const q = workforceSearch.trim().toLowerCase()
    return workforce.filter(member => {
      const metier = member.metier.toLowerCase()
      const isConducteurLike = member.source === 'conducteur' || metier.includes('conducteur')
      const isExploitantLike = member.source === 'exploitant' || metier.includes('exploitant')
      if (workforceFilter === 'conducteurs' && !isConducteurLike) return false
      if (workforceFilter === 'exploitants' && !isExploitantLike) return false
      if (workforceFilter === 'mecaniciens' && !member.metier.toLowerCase().includes('mecan')) return false
      if (workforceFilter === 'autres' && (isConducteurLike || isExploitantLike || metier.includes('mecan'))) return false
      if (!q) return true
      return [member.nomComplet, member.metier, member.matricule ?? '', member.email ?? '', member.statut]
        .join(' ')
        .toLowerCase()
        .includes(q)
    })
  }, [workforce, workforceFilter, workforceSearch])

  useEffect(() => {
    void (async () => {
      setIsLoadingAbsences(true)
      const data = await fetchAbsencesRh()
      setAbsences(data)
      setIsLoadingAbsences(false)
    })()
  }, [])

  useEffect(() => {
    if (!absenceFilterEmploye) { setSolde(null); return }
    void (async () => {
      const s = await fetchSoldeAbsences(absenceFilterEmploye, soldeAnnee)
      setSolde(s)
      if (s) {
        setSoldeDraft({
          cp_acquis: String(s.cp_acquis),
          cp_pris: String(s.cp_pris),
          rtt_acquis: String(s.rtt_acquis),
          rtt_pris: String(s.rtt_pris),
        })
      } else {
        setSoldeDraft({ cp_acquis: '0', cp_pris: '0', rtt_acquis: '0', rtt_pris: '0' })
      }
    })()
  }, [absenceFilterEmploye, soldeAnnee])

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
      heuresNuit: 0,
      joursTravailles: 0,
      sourceHeures: 'manuel' as const,
      performanceBonus: 0,
      exceptionalBonus: Math.max(0, grossTarget - baseGross),
      indemniteRepasExo: 0,
      nbRepas: 0,
      indemniteGrandRoutierExo: 0,
      nbJoursGr: 0,
      indemniteTpExo: 0,
      depassementBaremeCotisable: 0,
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

  // ── Absences handlers ───────────────────────────────────────────────────────

  function resetAbsenceForm() {
    setEditingAbsenceId(null)
    setShowAbsenceForm(false)
    setAbsenceForm({
      type_absence: 'conges_payes',
      date_debut: new Date().toISOString().slice(0, 10),
      date_fin: new Date().toISOString().slice(0, 10),
      nb_jours: 1,
      statut: 'demande',
    })
  }

  async function handleSaveAbsence() {
    if (!absenceForm.employe_id || !absenceForm.type_absence || !absenceForm.date_debut || !absenceForm.date_fin) {
      setError('Collaborateur, type, date début et fin sont obligatoires.')
      return
    }
    try {
      if (editingAbsenceId) {
        const updated = await updateAbsenceRh(editingAbsenceId, absenceForm)
        if (updated) {
          setAbsences(prev => prev.map(a => a.id === editingAbsenceId ? updated : a))
          setNotice('Absence mise à jour.')
          resetAbsenceForm()
        } else {
          setError("Erreur lors de la mise à jour.")
        }
      } else {
        const created = await createAbsenceRh({
          ...absenceForm as Omit<AbsenceRh, 'id' | 'created_at' | 'updated_at'>,
          company_id: null,
          justificatif_url: null,
          validateur_id: null,
          date_validation: null,
          commentaire_rh: null,
          created_by: profil?.id ?? null,
        })
        if (created) {
          setAbsences(prev => [created, ...prev])
          setNotice('Absence créée.')
          resetAbsenceForm()
        } else {
          setError("Erreur lors de la création.")
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inattendue.")
    }
  }

  async function handleValiderAbsence(id: string, statut: StatutAbsence) {
    const now = new Date().toISOString()
    const userId = profil?.id ?? null

    // Champs spécifiques selon l'étape du workflow
    const stepFields: Partial<AbsenceRh> = {}
    if (statut === 'validee_exploitation') {
      stepFields.validateur_exploitation_id = userId
      stepFields.date_validation_exploitation = now
    } else if (statut === 'validee_direction') {
      stepFields.validateur_direction_id = userId
      stepFields.date_validation_direction = now
    } else if (statut === 'integree_paie') {
      stepFields.integre_paie_par_id = userId
      stepFields.date_integration_paie = now
    } else if (statut === 'validee') {
      stepFields.validateur_id = userId
      stepFields.date_validation = now
    }

    const updated = await updateAbsenceRh(id, {
      statut,
      ...stepFields,
    })
    if (updated) {
      setAbsences(prev => prev.map(a => a.id === id ? updated : a))
      const stepLabel = STATUT_ABSENCE_LABELS[statut]
      setNotice(statut === 'refusee' ? 'Absence refusée.' : `Étape : ${stepLabel}.`)
      // Déduire du solde CP ou RTT à la validation finale uniquement
      if (statut === 'validee' && (updated.type_absence === 'conges_payes' || updated.type_absence === 'rtt')) {
        const annee = new Date(updated.date_debut).getFullYear()
        const currentSolde = await fetchSoldeAbsences(updated.employe_id, annee)
        const nb = updated.nb_jours ?? 0
        const patch = updated.type_absence === 'conges_payes'
          ? { cp_pris: (currentSolde?.cp_pris ?? 0) + nb }
          : { rtt_pris: (currentSolde?.rtt_pris ?? 0) + nb }
        await upsertSoldeAbsences({
          employe_id: updated.employe_id,
          annee,
          company_id: null,
          cp_acquis: currentSolde?.cp_acquis ?? 0,
          cp_pris: currentSolde?.cp_pris ?? 0,
          rtt_acquis: currentSolde?.rtt_acquis ?? 0,
          rtt_pris: currentSolde?.rtt_pris ?? 0,
          ...patch,
        })
        if (absenceFilterEmploye === updated.employe_id) {
          const refreshed = await fetchSoldeAbsences(updated.employe_id, soldeAnnee)
          setSolde(refreshed)
        }
      }
    } else {
      setError('Impossible de changer le statut.')
    }
  }

  async function handleDeleteAbsence(id: string) {
    if (!confirm('Supprimer cette absence ?')) return
    const ok = await deleteAbsenceRh(id)
    if (ok) {
      setAbsences(prev => prev.filter(a => a.id !== id))
      setNotice('Absence supprimée.')
      if (editingAbsenceId === id) resetAbsenceForm()
    } else {
      setError('Impossible de supprimer.')
    }
  }

  async function handleSaveSolde() {
    if (!absenceFilterEmploye) return
    const updated = await upsertSoldeAbsences({
      employe_id: absenceFilterEmploye,
      annee: soldeAnnee,
      company_id: null,
      cp_acquis: parseFloat(solveDraft.cp_acquis) || 0,
      cp_pris: parseFloat(solveDraft.cp_pris) || 0,
      rtt_acquis: parseFloat(solveDraft.rtt_acquis) || 0,
      rtt_pris: parseFloat(solveDraft.rtt_pris) || 0,
    })
    if (updated) { setSolde(updated); setNotice('Soldes enregistrés.') }
    else setError('Impossible de sauvegarder les soldes.')
  }

  return (
    <div className="space-y-6 p-5 md:p-6">
      <div className="nx-panel nx-page-hero rounded-2xl p-5 shadow-xl">
        <p className="nx-label">RH</p>
        <h2 className="nx-page-hero-title mt-2 text-2xl font-bold">Ressources humaines</h2>
        <p className="mt-2 max-w-3xl text-sm nx-subtle">
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

      <section className="nx-card rounded-2xl p-5 shadow-sm">
        <div className="nx-tab-group mb-5">
          <button
            type="button"
            onClick={() => setActiveTab('employes')}
            className={`nx-tab-button ${activeTab === 'employes' ? 'is-active' : ''}`}
          >
            Employes
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('documents')}
            className={`nx-tab-button ${activeTab === 'documents' ? 'is-active' : ''}`}
          >
            Onboarding et documents
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('effectif')}
            className={`nx-tab-button ${activeTab === 'effectif' ? 'is-active' : ''}`}
          >
            Effectif global
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('entretiens')}
            className={`nx-tab-button ${activeTab === 'entretiens' ? 'is-active' : ''}`}
          >
            Entretiens professionnels
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('absences')}
            className={`nx-tab-button ${activeTab === 'absences' ? 'is-active' : ''}`}
          >
            Absences
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

        {activeTab === 'effectif' && (
          <div className="space-y-4">
            {workforceWarning && (
              <div className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                {workforceWarning}
              </div>
            )}
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div className="grid gap-3 md:grid-cols-2">
                <Field label="Type de collaborateur">
                  <select className={inp} value={workforceFilter} onChange={event => setWorkforceFilter(event.target.value as typeof workforceFilter)}>
                    <option value="tous">Tous</option>
                    <option value="conducteurs">Conducteurs</option>
                    <option value="exploitants">Exploitants</option>
                    <option value="mecaniciens">Mecaniciens</option>
                    <option value="autres">Autres profils</option>
                  </select>
                </Field>
                <Field label="Recherche">
                  <input
                    className={inp}
                    placeholder="Nom, metier, matricule..."
                    value={workforceSearch}
                    onChange={event => setWorkforceSearch(event.target.value)}
                  />
                </Field>
              </div>

              <div className="flex flex-wrap items-center gap-2 text-xs">
                <Link to="/utilisateurs" className="rounded-lg border border-slate-300 bg-white px-3 py-2 font-semibold text-slate-900">
                  Gerer profils
                </Link>
                <Link to="/chauffeurs" className="rounded-lg border border-slate-300 bg-white px-3 py-2 font-semibold text-slate-900">
                  Gerer conducteurs
                </Link>
                <Link to="/parametres" className="rounded-lg border border-slate-300 bg-white px-3 py-2 font-semibold text-slate-900">
                  Gerer services/exploitants
                </Link>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 overflow-hidden">
              {workforceLoading ? (
                <p className="px-4 py-6 text-sm text-slate-500">Chargement de l effectif...</p>
              ) : filteredWorkforce.length === 0 ? (
                <p className="px-4 py-6 text-sm text-slate-500">Aucun collaborateur trouve pour ce filtre.</p>
              ) : (
                <div className="max-h-[540px] overflow-auto">
                  <table className="w-full min-w-[760px] text-sm">
                    <thead className="bg-slate-100 text-slate-700">
                      <tr>
                        <th className="px-3 py-2 text-left font-semibold">Nom</th>
                        <th className="px-3 py-2 text-left font-semibold">Metier</th>
                        <th className="px-3 py-2 text-left font-semibold">Origine</th>
                        <th className="px-3 py-2 text-left font-semibold">Matricule</th>
                        <th className="px-3 py-2 text-left font-semibold">Email</th>
                        <th className="px-3 py-2 text-left font-semibold">Statut</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredWorkforce.map(member => (
                        <tr key={member.id} className="border-t border-slate-200 bg-white">
                          <td className="px-3 py-2 font-medium text-slate-900">{member.nomComplet}</td>
                          <td className="px-3 py-2 text-slate-800">{member.metier}</td>
                          <td className="px-3 py-2">
                            <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs font-semibold text-slate-800">
                              {member.source === 'annuaire' ? 'annuaire' : member.source}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-slate-700">{member.matricule ?? '—'}</td>
                          <td className="px-3 py-2 text-slate-700">{member.email ?? '—'}</td>
                          <td className="px-3 py-2 text-slate-700">{member.statut}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
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

        {activeTab === 'entretiens' && <EntretiensSalaries />}

        {activeTab === 'absences' && (
          <>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">Gestion des absences</p>
            <h3 className="mt-2 text-lg font-semibold text-slate-900">Congés, RTT & absences</h3>
            <p className="mt-1 text-sm text-slate-500">Suivi des demandes, validation RH et soldes CP/RTT par collaborateur.</p>

            {/* ── Filtres + stats ── */}
            <div className="mt-5 flex flex-wrap gap-3 items-center justify-between">
              <div className="flex flex-wrap gap-3">
                <select
                  className={`${inp} w-56`}
                  value={absenceFilterEmploye}
                  onChange={e => setAbsenceFilterEmploye(e.target.value)}
                >
                  <option value="">Tous les collaborateurs</option>
                  {staff.map(m => (
                    <option key={m.id} value={m.id}>{staffDisplayName(m)}</option>
                  ))}
                </select>
                <select
                  className={`${inp} w-40`}
                  value={absenceFilterStatut}
                  onChange={e => setAbsenceFilterStatut(e.target.value as StatutAbsence | 'tous')}
                >
                  <option value="tous">Tous statuts</option>
                  {(Object.keys(STATUT_ABSENCE_LABELS) as StatutAbsence[]).map(s => (
                    <option key={s} value={s}>{STATUT_ABSENCE_LABELS[s]}</option>
                  ))}
                </select>
              </div>
              <button
                type="button"
                onClick={() => setShowAbsenceForm(!showAbsenceForm)}
                className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white"
              >
                {showAbsenceForm ? 'Annuler' : '+ Nouvelle absence'}
              </button>
            </div>

            {/* ── Soldes CP/RTT ── */}
            {absenceFilterEmploye && (
              <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-semibold text-slate-800">Soldes CP/RTT</p>
                  <div className="flex items-center gap-2">
                    <label className="text-xs text-slate-500">Année</label>
                    <input
                      type="number"
                      className={`${inp} w-24 py-1.5 text-xs`}
                      value={soldeAnnee}
                      onChange={e => setSoldeAnnee(Number(e.target.value))}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                  {[
                    { label: 'CP acquis', key: 'cp_acquis' },
                    { label: 'CP pris', key: 'cp_pris' },
                    { label: 'RTT acquis', key: 'rtt_acquis' },
                    { label: 'RTT pris', key: 'rtt_pris' },
                  ].map(({ label, key }) => (
                    <div key={key}>
                      <label className="block text-xs font-medium text-slate-600 mb-1">{label}</label>
                      <input
                        type="number"
                        step="0.5"
                        min="0"
                        className={`${inp} py-1.5 text-xs`}
                        value={solveDraft[key as keyof typeof solveDraft]}
                        onChange={e => setSoldeDraft(d => ({ ...d, [key]: e.target.value }))}
                      />
                    </div>
                  ))}
                </div>
                {solde && (
                  <div className="mt-3 flex gap-4 text-sm">
                    <span className="text-emerald-700 font-semibold">
                      CP restants : {(solde.cp_acquis - solde.cp_pris).toFixed(1)} j
                    </span>
                    <span className="text-blue-700 font-semibold">
                      RTT restants : {(solde.rtt_acquis - solde.rtt_pris).toFixed(1)} j
                    </span>
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => void handleSaveSolde()}
                  className="mt-3 rounded-xl bg-slate-900 px-4 py-2 text-xs font-medium text-white"
                >
                  Enregistrer les soldes
                </button>
              </div>
            )}

            {/* ── Formulaire absence ── */}
            {showAbsenceForm && (
              <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3">
                <div className="grid gap-3 md:grid-cols-2">
                  <Field label="Collaborateur">
                    <select
                      className={inp}
                      value={absenceForm.employe_id || ''}
                      onChange={e => setAbsenceForm(f => ({ ...f, employe_id: e.target.value }))}
                    >
                      <option value="">Sélectionner...</option>
                      {staff.map(m => (
                        <option key={m.id} value={m.id}>{staffDisplayName(m)}</option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Type d'absence">
                    <select
                      className={inp}
                      value={absenceForm.type_absence || 'conges_payes'}
                      onChange={e => setAbsenceForm(f => ({ ...f, type_absence: e.target.value as TypeAbsence }))}
                    >
                      {(Object.entries(TYPE_ABSENCE_LABELS) as [TypeAbsence, string][]).map(([k, v]) => (
                        <option key={k} value={k}>{v}</option>
                      ))}
                    </select>
                  </Field>
                </div>
                <div className="grid gap-3 md:grid-cols-3">
                  <Field label="Date début">
                    <input
                      type="date"
                      className={inp}
                      value={absenceForm.date_debut || ''}
                      onChange={e => setAbsenceForm(f => ({ ...f, date_debut: e.target.value }))}
                    />
                  </Field>
                  <Field label="Date fin">
                    <input
                      type="date"
                      className={inp}
                      value={absenceForm.date_fin || ''}
                      onChange={e => setAbsenceForm(f => ({ ...f, date_fin: e.target.value }))}
                    />
                  </Field>
                  <Field label="Nb jours">
                    <input
                      type="number"
                      step="0.5"
                      min="0.5"
                      className={inp}
                      value={absenceForm.nb_jours ?? 1}
                      onChange={e => setAbsenceForm(f => ({ ...f, nb_jours: parseFloat(e.target.value) || 1 }))}
                    />
                  </Field>
                </div>
                <Field label="Motif (optionnel)">
                  <input
                    className={inp}
                    placeholder="Précision..."
                    value={absenceForm.motif || ''}
                    onChange={e => setAbsenceForm(f => ({ ...f, motif: e.target.value || null }))}
                  />
                </Field>
                {editingAbsenceId && (
                  <Field label="Statut">
                    <select
                      className={inp}
                      value={absenceForm.statut || 'demande'}
                      onChange={e => setAbsenceForm(f => ({ ...f, statut: e.target.value as StatutAbsence }))}
                    >
                      {(Object.keys(STATUT_ABSENCE_LABELS) as StatutAbsence[]).map(s => (
                        <option key={s} value={s}>{STATUT_ABSENCE_LABELS[s]}</option>
                      ))}
                    </select>
                  </Field>
                )}
                <Field label="Commentaire RH">
                  <input
                    className={inp}
                    placeholder="Note interne..."
                    value={absenceForm.commentaire_rh || ''}
                    onChange={e => setAbsenceForm(f => ({ ...f, commentaire_rh: e.target.value || null }))}
                  />
                </Field>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => void handleSaveAbsence()}
                    className="flex-1 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white"
                  >
                    {editingAbsenceId ? 'Mettre à jour' : 'Créer'}
                  </button>
                  {editingAbsenceId && (
                    <button
                      type="button"
                      onClick={() => void handleDeleteAbsence(editingAbsenceId)}
                      className="rounded-xl bg-red-100 px-4 py-2.5 text-sm font-medium text-red-700"
                    >
                      Supprimer
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* ── Liste des absences ── */}
            <div className="mt-4">
              {isLoadingAbsences ? (
                <p className="text-sm text-slate-400 py-6 text-center">Chargement...</p>
              ) : (
                <div className="space-y-2">
                  {absences
                    .filter(a => (!absenceFilterEmploye || a.employe_id === absenceFilterEmploye))
                    .filter(a => absenceFilterStatut === 'tous' || a.statut === absenceFilterStatut)
                    .map(a => {
                      const emp = staff.find(m => m.id === a.employe_id)
                      return (
                        <div
                          key={a.id}
                          className="rounded-xl border border-slate-200 bg-white p-4 flex items-start justify-between gap-3"
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUT_ABSENCE_COLORS[a.statut]}`}>
                                {STATUT_ABSENCE_LABELS[a.statut]}
                              </span>
                              <span className="text-xs font-medium text-slate-700">
                                {TYPE_ABSENCE_LABELS[a.type_absence]}
                              </span>
                              <span className="text-xs text-slate-500">
                                {a.nb_jours} j · {new Date(a.date_debut).toLocaleDateString('fr-FR')} → {new Date(a.date_fin).toLocaleDateString('fr-FR')}
                              </span>
                            </div>
                            {emp && (
                              <p className="mt-1 text-xs text-slate-600 font-medium">{staffDisplayName(emp)}</p>
                            )}
                            {a.motif && <p className="mt-1 text-xs text-slate-500 italic">{a.motif}</p>}
                            {a.commentaire_rh && <p className="mt-1 text-xs text-amber-700">{a.commentaire_rh}</p>}
                            {/* Indicateur de progression du workflow */}
                            <div className="mt-2 flex items-center gap-1 text-[10px]">
                              {[
                                { key: 'demande', label: 'Demande', date: a.created_at },
                                { key: 'validee_exploitation', label: 'Exploitation', date: a.date_validation_exploitation },
                                { key: 'validee_direction', label: 'Direction', date: a.date_validation_direction },
                                { key: 'integree_paie', label: 'Paie', date: a.date_integration_paie },
                                { key: 'validee', label: 'Final', date: a.date_validation },
                              ].map((step, i, arr) => {
                                const done = !!step.date
                                return (
                                  <span key={step.key} className="flex items-center gap-1">
                                    <span className={`inline-block w-2 h-2 rounded-full ${done ? 'bg-green-500' : 'bg-slate-300'}`} />
                                    <span className={done ? 'text-green-700 font-medium' : 'text-slate-400'}>
                                      {step.label}
                                      {step.date && <span className="ml-0.5 font-normal text-slate-400">({new Date(step.date).toLocaleDateString('fr-FR')})</span>}
                                    </span>
                                    {i < arr.length - 1 && <span className="text-slate-300 mx-0.5">→</span>}
                                  </span>
                                )
                              })}
                            </div>
                          </div>
                          <div className="flex flex-col gap-1.5 shrink-0">
                            {/* Bouton workflow : prochaine étape selon rôle */}
                            {(() => {
                              const nextStep = ABSENCE_WORKFLOW_STEPS.find(
                                s => s.from === a.statut && profil?.role && s.roles.includes(profil.role),
                              )
                              if (!nextStep) return null
                              return (
                                <button
                                  type="button"
                                  onClick={() => void handleValiderAbsence(a.id, nextStep.to)}
                                  className="text-xs px-2.5 py-1 rounded-lg bg-green-100 text-green-700 font-medium hover:bg-green-200"
                                >
                                  {nextStep.label}
                                </button>
                              )
                            })()}
                            {/* Refuser à tout moment sauf si déjà terminé */}
                            {a.statut !== 'validee' && a.statut !== 'refusee' && a.statut !== 'annulee' && (
                              <button
                                type="button"
                                onClick={() => void handleValiderAbsence(a.id, 'refusee')}
                                className="text-xs px-2.5 py-1 rounded-lg bg-red-100 text-red-700 font-medium hover:bg-red-200"
                              >
                                Refuser
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => {
                                setEditingAbsenceId(a.id)
                                setAbsenceForm(a)
                                setShowAbsenceForm(true)
                              }}
                              className="text-xs px-2.5 py-1 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"
                            >
                              Modifier
                            </button>
                            {/* Document de congé PDF quand validée */}
                            {a.statut === 'validee' && (
                              <button
                                type="button"
                                onClick={() => {
                                  const empName = staff.find(m => m.id === a.employe_id)
                                  const findName = (uid: string | null) => {
                                    if (!uid) return null
                                    const member = staff.find(m => m.id === uid)
                                    return member ? staffDisplayName(member) : uid.slice(0, 8)
                                  }
                                  generateCongeDocumentPDF({
                                    absence: a,
                                    employeNom: empName ? staffDisplayName(empName) : 'Employe',
                                    validateurExploitationNom: findName(a.validateur_exploitation_id),
                                    validateurDirectionNom: findName(a.validateur_direction_id),
                                    integrePaieParNom: findName(a.integre_paie_par_id),
                                    validateurFinalNom: findName(a.validateur_id),
                                  })
                                }}
                                className="text-xs px-2.5 py-1 rounded-lg bg-indigo-100 text-indigo-700 font-medium hover:bg-indigo-200"
                              >
                                PDF congé
                              </button>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  {absences.filter(a =>
                    (!absenceFilterEmploye || a.employe_id === absenceFilterEmploye) &&
                    (absenceFilterStatut === 'tous' || a.statut === absenceFilterStatut)
                  ).length === 0 && (
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-6 text-center">
                      <p className="text-sm text-slate-500">Aucune absence enregistrée.</p>
                    </div>
                  )}
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
