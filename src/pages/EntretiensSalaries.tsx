import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'
import {
  INTERVIEW_DOCUMENT_STATUS_TRANSITIONS,
  INTERVIEW_PRIORITY_LABELS,
  INTERVIEW_STATUS_TRANSITIONS,
  INTERVIEW_STATUS_LABELS,
  computeInterviewKpis,
  createInterview,
  createInterviewDocument,
  listInterviewActions,
  listInterviewDocumentVersions,
  listInterviewDocuments,
  listInterviewObjectives,
  listInterviewTypes,
  listInterviews,
  transitionInterviewStatus,
  updateInterviewDocumentStatus,
  uploadInterviewSignedScan,
  type InterviewCategory,
  type InterviewDocumentRow,
  type InterviewDocumentVersionRow,
  type InterviewFilters,
  type InterviewPriority,
  type InterviewRow,
  type InterviewType,
} from '@/lib/hrInterviewsModule'

const inputClass = 'w-full rounded-lg border border-line-strong bg-surface px-3 py-2 text-sm text-heading outline-none focus:border-slate-500'

type ProfileLite = {
  id: string
  nom: string | null
  prenom: string | null
  role: string
}

function profileLabel(profile: ProfileLite | null | undefined) {
  if (!profile) return 'Non assigne'
  const name = [profile.prenom, profile.nom].filter(Boolean).join(' ').trim()
  return name || profile.role || profile.id
}

function statusClass(status: string) {
  const map: Record<string, string> = {
    a_planifier: 'bg-surface-2 text-foreground',
    planifie: 'bg-blue-100 text-blue-700',
    convocation_a_preparer: 'bg-amber-100 text-amber-800',
    convocation_envoyee: 'bg-cyan-100 text-cyan-700',
    en_attente_realisation: 'bg-indigo-100 text-indigo-700',
    realise: 'bg-green-100 text-green-700',
    compte_rendu_a_completer: 'bg-orange-100 text-orange-700',
    compte_rendu_a_valider: 'bg-yellow-100 text-yellow-800',
    signe: 'bg-emerald-100 text-emerald-700',
    cloture: 'bg-teal-100 text-teal-700',
    reporte: 'bg-fuchsia-100 text-fuchsia-700',
    annule: 'bg-rose-100 text-rose-700',
    archive: 'bg-slate-200 text-secondary',
  }
  return map[status] ?? 'bg-surface-2 text-foreground'
}

function priorityClass(priority: InterviewPriority) {
  const map: Record<InterviewPriority, string> = {
    basse: 'bg-surface-2 text-secondary',
    normale: 'bg-blue-100 text-blue-700',
    haute: 'bg-amber-100 text-amber-800',
    critique: 'bg-red-100 text-red-700',
  }
  return map[priority]
}

export default function EntretiensSalaries() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [types, setTypes] = useState<InterviewType[]>([])
  const [employees, setEmployees] = useState<ProfileLite[]>([])
  const [interviews, setInterviews] = useState<InterviewRow[]>([])
  const [selectedInterviewId, setSelectedInterviewId] = useState<string | null>(null)
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('')
  const [employeeCategory, setEmployeeCategory] = useState<'all' | InterviewCategory>('all')
  const [actions, setActions] = useState<Array<{ id: string; title: string; status: string; due_date: string | null }>>([])
  const [documents, setDocuments] = useState<InterviewDocumentRow[]>([])
  const [documentVersions, setDocumentVersions] = useState<Record<string, InterviewDocumentVersionRow[]>>({})
  const [objectives, setObjectives] = useState<Array<{ id: string; objective_label_snapshot: string; achieved_value_snapshot: number | null; target_value_snapshot: number | null; unit_snapshot: string | null }>>([])
  const [notice, setNotice] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [filters, setFilters] = useState<InterviewFilters>({})
  const [statusSaving, setStatusSaving] = useState(false)
  const [documentActionId, setDocumentActionId] = useState<string | null>(null)

  const [createTypeId, setCreateTypeId] = useState('')
  const [createEmployeeId, setCreateEmployeeId] = useState('')
  const [createPriority, setCreatePriority] = useState<InterviewPriority>('normale')
  const [createPlannedDate, setCreatePlannedDate] = useState('')
  const [createReason, setCreateReason] = useState('')

  const selectedInterview = useMemo(
    () => interviews.find(item => item.id === selectedInterviewId) ?? null,
    [interviews, selectedInterviewId],
  )

  const employeeInterviews = useMemo(() => {
    if (!selectedEmployeeId) return []
    return interviews
      .filter(item => item.employee_profile_id === selectedEmployeeId)
      .filter(item => employeeCategory === 'all' || item.interview_type?.category === employeeCategory)
      .sort((left, right) => {
        const leftDate = new Date(left.planned_at ?? left.created_at).getTime()
        const rightDate = new Date(right.planned_at ?? right.created_at).getTime()
        return rightDate - leftDate
      })
  }, [employeeCategory, interviews, selectedEmployeeId])

  const employeeNextInterview = useMemo(() => {
    const now = Date.now()
    return employeeInterviews
      .filter(item => item.planned_at && new Date(item.planned_at).getTime() >= now)
      .sort((left, right) => new Date(left.planned_at ?? 0).getTime() - new Date(right.planned_at ?? 0).getTime())[0] ?? null
  }, [employeeInterviews])

  const employeeLastInterview = useMemo(() => {
    const now = Date.now()
    return employeeInterviews
      .filter(item => item.planned_at && new Date(item.planned_at).getTime() <= now)
      .sort((left, right) => new Date(right.planned_at ?? 0).getTime() - new Date(left.planned_at ?? 0).getTime())[0] ?? null
  }, [employeeInterviews])

  const kpis = useMemo(() => computeInterviewKpis(interviews), [interviews])

  async function loadBase() {
    setLoading(true)
    setError(null)

    try {
      const [typesData, interviewsData, profilesRes] = await Promise.all([
        listInterviewTypes(),
        listInterviews(filters),
        (supabase as any)
          .from('profils')
          .select('id, nom, prenom, role')
          .order('nom', { ascending: true }),
      ])

      setTypes(typesData)
      setInterviews(interviewsData)
      setEmployees((profilesRes.data as ProfileLite[]) ?? [])

      if (interviewsData.length > 0 && !selectedInterviewId) {
        setSelectedInterviewId(interviewsData[0]?.id ?? null)
      }
      if (!selectedEmployeeId && interviewsData[0]?.employee_profile_id) {
        setSelectedEmployeeId(interviewsData[0].employee_profile_id)
      }
      if (!createTypeId && typesData[0]?.id) {
        setCreateTypeId(typesData[0].id)
      }
    } catch {
      setError('Chargement des entretiens impossible.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadBase()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    filters.typeId,
    filters.category,
    filters.employeeProfileId,
    filters.managerProfileId,
    filters.status,
    filters.priority,
    filters.fromDate,
    filters.toDate,
  ])

  async function loadSelectedInterviewDetails(interviewId: string) {
    const [actionRows, documentRows, objectiveRows] = await Promise.all([
      listInterviewActions(interviewId),
      listInterviewDocuments(interviewId),
      listInterviewObjectives(interviewId),
    ])
    setActions(actionRows)
    setDocuments(documentRows)
    setObjectives(objectiveRows)

    const versionsEntries = await Promise.all(
      documentRows.map(async documentRow => {
        const versions = await listInterviewDocumentVersions(documentRow.id)
        return [documentRow.id, versions] as const
      }),
    )
    setDocumentVersions(Object.fromEntries(versionsEntries))
  }

  useEffect(() => {
    if (!selectedInterview) {
      setActions([])
      setDocuments([])
      setObjectives([])
      setDocumentVersions({})
      return
    }

    void loadSelectedInterviewDetails(selectedInterview.id)
  }, [selectedInterview])

  async function handleCreateInterview() {
    if (!createTypeId || !createEmployeeId) {
      setError('Type et salarie sont obligatoires.')
      return
    }

    setSaving(true)
    setError(null)

    try {
      const created = await createInterview({
        interviewTypeId: createTypeId,
        employeeProfileId: createEmployeeId,
        priority: createPriority,
        plannedAt: createPlannedDate ? `${createPlannedDate}T09:00:00Z` : null,
        reason: createReason.trim() || null,
        status: createPlannedDate ? 'planifie' : 'a_planifier',
      })

      if (!created) {
        setError('Creation impossible.')
        return
      }

      setNotice('Entretien cree.')
      setCreateReason('')
      await loadBase()
      setSelectedInterviewId(created.id)
      if (!selectedEmployeeId) setSelectedEmployeeId(created.employee_profile_id)
    } finally {
      setSaving(false)
    }
  }

  async function handleTransitionInterview(toStatus: InterviewRow['status']) {
    if (!selectedInterview) return
    setStatusSaving(true)
    setError(null)
    setNotice(null)
    const result = await transitionInterviewStatus(selectedInterview.id, toStatus)
    setStatusSaving(false)
    if (!result.ok) {
      setError(result.error ?? 'Transition impossible.')
      return
    }
    setNotice(`Statut entretien mis a jour: ${INTERVIEW_STATUS_LABELS[toStatus]}.`)
    await loadBase()
    await loadSelectedInterviewDetails(selectedInterview.id)
  }

  async function handleCreateDocument() {
    if (!selectedInterview) return
    setError(null)
    setNotice(null)
    setDocumentActionId('create')
    const created = await createInterviewDocument({
      interviewId: selectedInterview.id,
      employeeProfileId: selectedInterview.employee_profile_id,
      documentType: 'compte_rendu',
      name: `Compte-rendu-${new Date().toISOString().slice(0, 10)}`,
    })
    setDocumentActionId(null)
    if (!created) {
      setError('Generation du document impossible.')
      return
    }
    setNotice('Document genere.')
    await loadSelectedInterviewDetails(selectedInterview.id)
  }

  async function handleDocumentStatus(document: InterviewDocumentRow, toStatus: InterviewDocumentRow['status']) {
    if (!selectedInterview) return
    setDocumentActionId(document.id)
    setError(null)
    setNotice(null)
    const result = await updateInterviewDocumentStatus(document.id, toStatus)
    setDocumentActionId(null)
    if (!result.ok) {
      setError(result.error ?? 'Mise a jour document impossible.')
      return
    }
    setNotice(`Document ${document.name}: ${toStatus}.`)
    await loadSelectedInterviewDetails(selectedInterview.id)
  }

  async function handleUploadSignedDocument(document: InterviewDocumentRow, file: File | null) {
    if (!selectedInterview || !file) return
    setDocumentActionId(document.id)
    setError(null)
    setNotice(null)
    const result = await uploadInterviewSignedScan(document, file)
    setDocumentActionId(null)
    if (!result.ok) {
      setError(result.error ?? 'Upload du scan signe impossible.')
      return
    }
    setNotice(`Scan signe ajoute sur ${document.name}.`)
    await loadSelectedInterviewDetails(selectedInterview.id)
  }

  return (
    <div className="space-y-4">
      <header className="rounded-xl border border-line bg-surface p-4">
        <h2 className="text-xl font-semibold text-heading">Entretiens salaries</h2>
        <p className="mt-1 text-sm text-secondary">
          Vue globale RH, dossier individuel et suivi documentaire relies a une source unique.
        </p>
      </header>

      {(notice || error) && (
        <div className={`rounded-lg border px-3 py-2 text-sm ${error ? 'border-red-200 bg-red-50 text-red-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700'}`}>
          {error ?? notice}
        </div>
      )}

      <section className="grid gap-3 md:grid-cols-4">
        <KpiCard label="Planifies" value={kpis.planned} />
        <KpiCard label="Realises" value={kpis.completed} />
        <KpiCard label="En retard" value={kpis.overdue} />
        <KpiCard label="Comptes rendus en attente" value={kpis.pendingReport} />
      </section>

      <section className="rounded-xl border border-line bg-surface p-4">
        <h3 className="text-sm font-semibold text-heading">Nouveau entretien</h3>
        <div className="mt-3 grid gap-3 md:grid-cols-5">
          <select className={inputClass} value={createTypeId} onChange={event => setCreateTypeId(event.target.value)}>
            <option value="">Type</option>
            {types.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select>
          <select className={inputClass} value={createEmployeeId} onChange={event => setCreateEmployeeId(event.target.value)}>
            <option value="">Salarie</option>
            {employees.map(item => <option key={item.id} value={item.id}>{profileLabel(item)}</option>)}
          </select>
          <input className={inputClass} type="date" value={createPlannedDate} onChange={event => setCreatePlannedDate(event.target.value)} />
          <select className={inputClass} value={createPriority} onChange={event => setCreatePriority(event.target.value as InterviewPriority)}>
            {Object.entries(INTERVIEW_PRIORITY_LABELS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
          </select>
          <button className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50" disabled={saving} onClick={() => void handleCreateInterview()}>
            {saving ? 'Creation...' : 'Creer'}
          </button>
        </div>
        <input
          className={`${inputClass} mt-3`}
          value={createReason}
          onChange={event => setCreateReason(event.target.value)}
          placeholder="Motif"
        />
      </section>

      <section className="rounded-xl border border-line bg-surface p-4">
        <h3 className="text-sm font-semibold text-heading">Filtres globaux</h3>
        <div className="mt-3 grid gap-3 md:grid-cols-6">
          <select className={inputClass} value={filters.category ?? ''} onChange={event => setFilters(current => ({ ...current, category: (event.target.value || undefined) as InterviewCategory | undefined }))}>
            <option value="">Categorie</option>
            <option value="rh">RH</option>
            <option value="management">Management</option>
            <option value="objectifs">Objectifs</option>
            <option value="disciplinaire">Disciplinaire</option>
            <option value="securite">Securite</option>
            <option value="formation">Formation</option>
            <option value="carriere">Carriere</option>
            <option value="obligatoire">Obligatoire</option>
          </select>
          <select className={inputClass} value={filters.typeId ?? ''} onChange={event => setFilters(current => ({ ...current, typeId: event.target.value || undefined }))}>
            <option value="">Type</option>
            {types.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select>
          <select className={inputClass} value={filters.employeeProfileId ?? ''} onChange={event => setFilters(current => ({ ...current, employeeProfileId: event.target.value || undefined }))}>
            <option value="">Salarie</option>
            {employees.map(item => <option key={item.id} value={item.id}>{profileLabel(item)}</option>)}
          </select>
          <select className={inputClass} value={filters.status ?? ''} onChange={event => setFilters(current => ({ ...current, status: event.target.value ? event.target.value as InterviewRow['status'] : undefined }))}>
            <option value="">Statut</option>
            {Object.entries(INTERVIEW_STATUS_LABELS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
          </select>
          <input className={inputClass} type="date" value={filters.fromDate ?? ''} onChange={event => setFilters(current => ({ ...current, fromDate: event.target.value || undefined }))} />
          <input className={inputClass} type="date" value={filters.toDate ?? ''} onChange={event => setFilters(current => ({ ...current, toDate: event.target.value || undefined }))} />
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.3fr_1fr]">
        <div className="rounded-xl border border-line bg-surface p-4">
          <h3 className="text-sm font-semibold text-heading">Liste globale</h3>
          <div className="mt-3 max-h-[420px] overflow-auto">
            {loading ? (
              <p className="text-sm text-discreet">Chargement...</p>
            ) : interviews.length === 0 ? (
              <p className="text-sm text-discreet">Aucun entretien.</p>
            ) : (
              <table className="w-full min-w-[760px] text-sm">
                <thead className="text-left text-xs text-discreet">
                  <tr>
                    <th className="pb-2">Salarie</th>
                    <th className="pb-2">Type</th>
                    <th className="pb-2">Date</th>
                    <th className="pb-2">Statut</th>
                    <th className="pb-2">Priorite</th>
                  </tr>
                </thead>
                <tbody>
                  {interviews.map(item => (
                    <tr
                      key={item.id}
                      onClick={() => {
                        setSelectedInterviewId(item.id)
                        setSelectedEmployeeId(item.employee_profile_id)
                      }}
                      className={`cursor-pointer border-t border-slate-100 ${item.id === selectedInterviewId ? 'bg-surface-soft' : ''}`}
                    >
                      <td className="py-2">{profileLabel(item.employee ?? null)}</td>
                      <td className="py-2">{item.interview_type?.name ?? 'Type non charge'}</td>
                      <td className="py-2">{item.planned_at ? new Date(item.planned_at).toLocaleDateString('fr-FR') : '-'}</td>
                      <td className="py-2">
                        <span className={`rounded-full px-2 py-1 text-xs font-medium ${statusClass(item.status)}`}>
                          {INTERVIEW_STATUS_LABELS[item.status]}
                        </span>
                      </td>
                      <td className="py-2">
                        <span className={`rounded-full px-2 py-1 text-xs font-medium ${priorityClass(item.priority)}`}>
                          {INTERVIEW_PRIORITY_LABELS[item.priority]}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-xl border border-line bg-surface p-4">
            <h3 className="text-sm font-semibold text-heading">Fiche entretien</h3>
            {!selectedInterview ? (
              <p className="mt-2 text-sm text-discreet">Selectionne un entretien.</p>
            ) : (
              <div className="mt-3 space-y-2 text-sm">
                <p><span className="font-medium">Salarie:</span> {profileLabel(selectedInterview.employee ?? null)}</p>
                <p><span className="font-medium">Manager:</span> {profileLabel(selectedInterview.manager ?? null)}</p>
                <p><span className="font-medium">Type:</span> {selectedInterview.interview_type?.name ?? '-'}</p>
                <p><span className="font-medium">Date prevue:</span> {selectedInterview.planned_at ? new Date(selectedInterview.planned_at).toLocaleString('fr-FR') : '-'}</p>
                <p><span className="font-medium">Confidentialite:</span> {selectedInterview.confidentiality_level}</p>
                <p><span className="font-medium">Motif:</span> {selectedInterview.reason || '-'}</p>
                <p><span className="font-medium">Resume:</span> {selectedInterview.summary || '-'}</p>
                <div className="pt-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-discreet">Transitions possibles</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {(INTERVIEW_STATUS_TRANSITIONS[selectedInterview.status] ?? []).map(target => (
                      <button
                        key={target}
                        type="button"
                        disabled={statusSaving}
                        onClick={() => void handleTransitionInterview(target)}
                        className="rounded-lg border border-line px-2.5 py-1 text-xs text-foreground hover:bg-surface-soft disabled:opacity-50"
                      >
                        {INTERVIEW_STATUS_LABELS[target]}
                      </button>
                    ))}
                    {(INTERVIEW_STATUS_TRANSITIONS[selectedInterview.status] ?? []).length === 0 && (
                      <span className="text-xs text-muted">Aucune transition disponible</span>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="rounded-xl border border-line bg-surface p-4">
            <h3 className="text-sm font-semibold text-heading">Actions</h3>
            <ul className="mt-2 space-y-2 text-sm">
              {actions.length === 0 && <li className="text-discreet">Aucune action.</li>}
              {actions.map(item => (
                <li key={item.id} className="rounded-md border border-line p-2">
                  <p className="font-medium text-foreground">{item.title}</p>
                  <p className="text-xs text-secondary">{item.status} {item.due_date ? `- echeance ${new Date(item.due_date).toLocaleDateString('fr-FR')}` : ''}</p>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-xl border border-line bg-surface p-4">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-semibold text-heading">Documents</h3>
              <button
                type="button"
                onClick={() => void handleCreateDocument()}
                disabled={!selectedInterview || documentActionId === 'create'}
                className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
              >
                {documentActionId === 'create' ? 'Generation...' : '+ Generer'}
              </button>
            </div>
            <ul className="mt-2 space-y-2 text-sm">
              {documents.length === 0 && <li className="text-discreet">Aucun document.</li>}
              {documents.map(item => (
                <li key={item.id} className="rounded-md border border-line p-2">
                  <p className="font-medium text-foreground">{item.name}</p>
                  <p className="text-xs text-secondary">{item.document_type} - {item.status} - v{item.current_version}</p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {(INTERVIEW_DOCUMENT_STATUS_TRANSITIONS[item.status] ?? []).map(target => (
                      <button
                        key={`${item.id}-${target}`}
                        type="button"
                        disabled={documentActionId === item.id}
                        onClick={() => void handleDocumentStatus(item, target)}
                        className="rounded border border-line px-2 py-1 text-[11px] text-secondary hover:bg-surface-soft disabled:opacity-50"
                      >
                        {target}
                      </button>
                    ))}
                  </div>
                  <div className="mt-2">
                    <label className="inline-flex cursor-pointer items-center gap-2 rounded border border-line px-2 py-1 text-[11px] text-secondary hover:bg-surface-soft">
                      Upload scan signe
                      <input
                        type="file"
                        accept="application/pdf,image/png,image/jpeg"
                        className="hidden"
                        onChange={event => {
                          const file = event.target.files?.[0] ?? null
                          void handleUploadSignedDocument(item, file)
                          event.currentTarget.value = ''
                        }}
                      />
                    </label>
                  </div>
                  {(documentVersions[item.id] ?? []).length > 0 && (
                    <div className="mt-2 rounded border border-slate-100 bg-surface-soft p-2">
                      <p className="text-[11px] font-medium text-secondary">Versions</p>
                      <ul className="mt-1 space-y-1">
                        {(documentVersions[item.id] ?? []).map(version => (
                          <li key={version.id} className="text-[11px] text-discreet">
                            v{version.version} · {version.file_name ?? 'fichier'}{version.is_signed_scan ? ' · scan signe' : ''}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-xl border border-line bg-surface p-4">
            <h3 className="text-sm font-semibold text-heading">Objectifs lies</h3>
            <ul className="mt-2 space-y-2 text-sm">
              {objectives.length === 0 && <li className="text-discreet">Aucun objectif lie.</li>}
              {objectives.map(item => (
                <li key={item.id} className="rounded-md border border-line p-2">
                  <p className="font-medium text-foreground">{item.objective_label_snapshot}</p>
                  <p className="text-xs text-secondary">
                    Realise: {item.achieved_value_snapshot ?? '-'} / Cible: {item.target_value_snapshot ?? '-'} {item.unit_snapshot ?? ''}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-line bg-surface p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-sm font-semibold text-heading">Dossier salarie - onglet Entretiens</h3>
          <select className="rounded-lg border border-line-strong bg-surface px-3 py-2 text-sm" value={selectedEmployeeId} onChange={event => setSelectedEmployeeId(event.target.value)}>
            <option value="">Selectionner un salarie</option>
            {employees.map(item => <option key={item.id} value={item.id}>{profileLabel(item)}</option>)}
          </select>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          {[
            { key: 'all', label: 'Tous' },
            { key: 'rh', label: 'RH' },
            { key: 'management', label: 'Management' },
            { key: 'objectifs', label: 'Objectifs' },
            { key: 'disciplinaire', label: 'Disciplinaire' },
            { key: 'securite', label: 'Securite' },
            { key: 'formation', label: 'Formation' },
            { key: 'obligatoire', label: 'Professionnel / legal' },
          ].map(item => (
            <button
              key={item.key}
              type="button"
              onClick={() => setEmployeeCategory(item.key as 'all' | InterviewCategory)}
              className={`rounded-full px-3 py-1 text-xs font-medium ${employeeCategory === item.key ? 'bg-slate-900 text-white' : 'bg-surface-2 text-foreground'}`}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div className="rounded-lg border border-line p-3">
            <p className="text-xs font-medium uppercase text-discreet">Prochain entretien</p>
            <p className="mt-1 text-sm text-foreground">{employeeNextInterview ? `${employeeNextInterview.interview_type?.name ?? 'Type'} - ${employeeNextInterview.planned_at ? new Date(employeeNextInterview.planned_at).toLocaleDateString('fr-FR') : '-'}` : 'Aucun'}</p>
          </div>
          <div className="rounded-lg border border-line p-3">
            <p className="text-xs font-medium uppercase text-discreet">Dernier entretien</p>
            <p className="mt-1 text-sm text-foreground">{employeeLastInterview ? `${employeeLastInterview.interview_type?.name ?? 'Type'} - ${employeeLastInterview.planned_at ? new Date(employeeLastInterview.planned_at).toLocaleDateString('fr-FR') : '-'}` : 'Aucun'}</p>
          </div>
        </div>

        <div className="mt-4 max-h-72 overflow-auto">
          <ul className="space-y-2">
            {employeeInterviews.length === 0 && <li className="text-sm text-discreet">Aucun entretien pour ce salarie.</li>}
            {employeeInterviews.map(item => (
              <li key={item.id} className="rounded-lg border border-line p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-medium text-foreground">{item.interview_type?.name ?? 'Type non charge'}</p>
                  <span className={`rounded-full px-2 py-1 text-xs font-medium ${statusClass(item.status)}`}>{INTERVIEW_STATUS_LABELS[item.status]}</span>
                </div>
                <p className="mt-1 text-xs text-secondary">{item.planned_at ? new Date(item.planned_at).toLocaleString('fr-FR') : 'Date non planifiee'}</p>
                <p className="mt-1 text-xs text-secondary">{item.summary || item.reason || 'Sans resume'}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  )
}

function KpiCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-line bg-surface px-4 py-3">
      <p className="text-xs font-medium uppercase tracking-wide text-discreet">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-heading">{value}</p>
    </div>
  )
}
