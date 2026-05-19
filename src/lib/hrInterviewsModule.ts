import { supabase } from './supabase'

export type InterviewCategory =
  | 'rh'
  | 'management'
  | 'objectifs'
  | 'disciplinaire'
  | 'securite'
  | 'formation'
  | 'carriere'
  | 'obligatoire'
  | 'autre'

export type InterviewStatus =
  | 'a_planifier'
  | 'planifie'
  | 'convocation_a_preparer'
  | 'convocation_envoyee'
  | 'en_attente_realisation'
  | 'realise'
  | 'compte_rendu_a_completer'
  | 'compte_rendu_a_valider'
  | 'signe'
  | 'cloture'
  | 'reporte'
  | 'annule'
  | 'archive'

export type InterviewPriority = 'basse' | 'normale' | 'haute' | 'critique'

export interface InterviewType {
  id: string
  company_id: number
  code: string
  name: string
  category: InterviewCategory
  description: string | null
  color_token: string | null
  is_mandatory: boolean
  frequency_months: number | null
  is_active: boolean
}

export interface InterviewRow {
  id: string
  company_id: number
  interview_type_id: string
  employee_profile_id: string
  manager_profile_id: string | null
  hr_profile_id: string | null
  creator_profile_id: string | null
  planned_at: string | null
  actual_start_at: string | null
  actual_end_at: string | null
  status: InterviewStatus
  priority: InterviewPriority
  reason: string | null
  context: string | null
  summary: string | null
  preparatory_notes: string | null
  decisions: string | null
  confidentiality_level: string
  report_status: 'brouillon' | 'valide' | 'signe' | 'archive'
  action_required: boolean
  objective_follow_up_required: boolean
  mandatory_due_date: string | null
  created_at: string
  updated_at: string
  interview_type?: Pick<InterviewType, 'id' | 'name' | 'category' | 'color_token'> | null
  employee?: { id: string; nom: string | null; prenom: string | null; role: string } | null
  manager?: { id: string; nom: string | null; prenom: string | null; role: string } | null
}

export interface InterviewActionRow {
  id: string
  interview_id: string
  employee_profile_id: string
  title: string
  description: string | null
  responsible_profile_id: string | null
  due_date: string | null
  status: 'a_faire' | 'en_cours' | 'bloquee' | 'terminee' | 'annulee'
  priority: InterviewPriority
  follow_up_comment: string | null
  closed_at: string | null
}

export interface InterviewDocumentRow {
  id: string
  interview_id: string
  employee_profile_id: string
  document_type: string
  name: string
  status: 'brouillon' | 'genere' | 'imprime' | 'envoye' | 'en_attente_signature' | 'signe' | 'scanne' | 'valide' | 'archive'
  current_version: number
  signed: boolean
  signed_at: string | null
  generated_at: string | null
  sent_at: string | null
}

export interface InterviewDocumentVersionRow {
  id: string
  document_id: string
  version: number
  file_name: string | null
  file_bucket: string | null
  file_path: string | null
  mime_type: string | null
  uploaded_at: string
  is_signed_scan: boolean
}

export interface InterviewFilters {
  typeId?: string
  category?: InterviewCategory
  employeeProfileId?: string
  managerProfileId?: string
  fromDate?: string
  toDate?: string
  status?: InterviewStatus
  priority?: InterviewPriority
  confidentiality?: string
  hasPendingActions?: boolean
  hasObjectives?: boolean
}

export const INTERVIEW_STATUS_LABELS: Record<InterviewStatus, string> = {
  a_planifier: 'A planifier',
  planifie: 'Planifie',
  convocation_a_preparer: 'Convocation a preparer',
  convocation_envoyee: 'Convocation envoyee',
  en_attente_realisation: 'En attente de realisation',
  realise: 'Realise',
  compte_rendu_a_completer: 'Compte rendu a completer',
  compte_rendu_a_valider: 'Compte rendu a valider',
  signe: 'Signe',
  cloture: 'Cloture',
  reporte: 'Reporte',
  annule: 'Annule',
  archive: 'Archive',
}

export const INTERVIEW_PRIORITY_LABELS: Record<InterviewPriority, string> = {
  basse: 'Basse',
  normale: 'Normale',
  haute: 'Haute',
  critique: 'Critique',
}

export const INTERVIEW_STATUS_TRANSITIONS: Record<InterviewStatus, InterviewStatus[]> = {
  a_planifier: ['planifie', 'annule'],
  planifie: ['convocation_a_preparer', 'en_attente_realisation', 'reporte', 'annule'],
  convocation_a_preparer: ['convocation_envoyee', 'reporte', 'annule'],
  convocation_envoyee: ['en_attente_realisation', 'reporte', 'annule'],
  en_attente_realisation: ['realise', 'reporte', 'annule'],
  realise: ['compte_rendu_a_completer', 'cloture'],
  compte_rendu_a_completer: ['compte_rendu_a_valider', 'realise'],
  compte_rendu_a_valider: ['signe', 'compte_rendu_a_completer'],
  signe: ['cloture'],
  cloture: ['archive'],
  reporte: ['planifie', 'annule'],
  annule: [],
  archive: [],
}

export const INTERVIEW_DOCUMENT_STATUS_TRANSITIONS: Record<InterviewDocumentRow['status'], InterviewDocumentRow['status'][]> = {
  brouillon: ['genere', 'archive'],
  genere: ['imprime', 'envoye', 'en_attente_signature', 'archive'],
  imprime: ['envoye', 'en_attente_signature', 'archive'],
  envoye: ['en_attente_signature', 'archive'],
  en_attente_signature: ['signe', 'scanne', 'valide', 'archive'],
  signe: ['scanne', 'valide', 'archive'],
  scanne: ['valide', 'archive'],
  valide: ['archive'],
  archive: [],
}

function withDateOnly(date: Date) {
  return date.toISOString().slice(0, 10)
}

export async function listInterviewTypes(): Promise<InterviewType[]> {
  try {
    const { data, error } = await (supabase as any)
      .from('interview_types')
      .select('id, company_id, code, name, category, description, color_token, is_mandatory, frequency_months, is_active')
      .eq('is_active', true)
      .order('category', { ascending: true })
      .order('name', { ascending: true })

    if (error) return []
    return (data as InterviewType[]) ?? []
  } catch {
    return []
  }
}

export async function listInterviews(filters: InterviewFilters = {}): Promise<InterviewRow[]> {
  try {
    let query = (supabase as any)
      .from('interviews')
      .select(`
        id, company_id, interview_type_id, employee_profile_id, manager_profile_id, hr_profile_id, creator_profile_id,
        planned_at, actual_start_at, actual_end_at, status, priority, reason, context, summary, preparatory_notes,
        decisions, confidentiality_level, report_status, action_required, objective_follow_up_required, mandatory_due_date,
        created_at, updated_at,
        interview_type:interview_types(id, name, category, color_token),
        employee:profils!interviews_employee_profile_id_fkey(id, nom, prenom, role),
        manager:profils!interviews_manager_profile_id_fkey(id, nom, prenom, role)
      `)
      .is('deleted_at', null)
      .order('planned_at', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false })

    if (filters.typeId) query = query.eq('interview_type_id', filters.typeId)
    if (filters.category) query = query.eq('interview_type.category', filters.category)
    if (filters.employeeProfileId) query = query.eq('employee_profile_id', filters.employeeProfileId)
    if (filters.managerProfileId) query = query.eq('manager_profile_id', filters.managerProfileId)
    if (filters.status) query = query.eq('status', filters.status)
    if (filters.priority) query = query.eq('priority', filters.priority)
    if (filters.confidentiality) query = query.eq('confidentiality_level', filters.confidentiality)
    if (filters.fromDate) query = query.gte('planned_at', `${filters.fromDate}T00:00:00Z`)
    if (filters.toDate) query = query.lte('planned_at', `${filters.toDate}T23:59:59Z`)

    const { data, error } = await query
    if (error) return []

    const base = ((data as InterviewRow[]) ?? [])

    if (!filters.hasPendingActions && !filters.hasObjectives) return base

    const interviewIds = base.map(row => row.id)
    if (interviewIds.length === 0) return []

    const [actionsRes, objectivesRes] = await Promise.all([
      filters.hasPendingActions
        ? (supabase as any)
          .from('interview_actions')
          .select('interview_id, status')
          .in('interview_id', interviewIds)
          .not('status', 'in', '(terminee,annulee)')
        : Promise.resolve({ data: [] as Array<{ interview_id: string }>, error: null }),
      filters.hasObjectives
        ? (supabase as any)
          .from('interview_objectives')
          .select('interview_id')
          .in('interview_id', interviewIds)
        : Promise.resolve({ data: [] as Array<{ interview_id: string }>, error: null }),
    ])

    const actionsSet = new Set((actionsRes.data ?? []).map((item: { interview_id: string }) => item.interview_id))
    const objectivesSet = new Set((objectivesRes.data ?? []).map((item: { interview_id: string }) => item.interview_id))

    return base.filter(row => {
      if (filters.hasPendingActions && !actionsSet.has(row.id)) return false
      if (filters.hasObjectives && !objectivesSet.has(row.id)) return false
      return true
    })
  } catch {
    return []
  }
}

export async function listInterviewsForEmployee(employeeProfileId: string): Promise<InterviewRow[]> {
  return listInterviews({ employeeProfileId })
}

export async function listInterviewActions(interviewId: string): Promise<InterviewActionRow[]> {
  try {
    const { data, error } = await (supabase as any)
      .from('interview_actions')
      .select('id, interview_id, employee_profile_id, title, description, responsible_profile_id, due_date, status, priority, follow_up_comment, closed_at')
      .eq('interview_id', interviewId)
      .is('archived_at', null)
      .order('due_date', { ascending: true, nullsFirst: false })
      .order('created_at', { ascending: false })

    if (error) return []
    return (data as InterviewActionRow[]) ?? []
  } catch {
    return []
  }
}

export async function listInterviewDocuments(interviewId: string): Promise<InterviewDocumentRow[]> {
  try {
    const { data, error } = await (supabase as any)
      .from('interview_documents')
      .select('id, interview_id, employee_profile_id, document_type, name, status, current_version, signed, signed_at, generated_at, sent_at')
      .eq('interview_id', interviewId)
      .is('archived_at', null)
      .order('created_at', { ascending: false })

    if (error) return []
    return (data as InterviewDocumentRow[]) ?? []
  } catch {
    return []
  }
}

export async function listInterviewObjectives(interviewId: string): Promise<Array<{ id: string; objective_id: string; objective_label_snapshot: string; achieved_value_snapshot: number | null; target_value_snapshot: number | null; unit_snapshot: string | null }>> {
  try {
    const { data, error } = await (supabase as any)
      .from('interview_objectives')
      .select('id, objective_id, objective_label_snapshot, achieved_value_snapshot, target_value_snapshot, unit_snapshot')
      .eq('interview_id', interviewId)
      .order('created_at', { ascending: true })

    if (error) return []
    return (data as Array<{ id: string; objective_id: string; objective_label_snapshot: string; achieved_value_snapshot: number | null; target_value_snapshot: number | null; unit_snapshot: string | null }>) ?? []
  } catch {
    return []
  }
}

export async function createInterview(input: {
  interviewTypeId: string
  employeeProfileId: string
  managerProfileId?: string | null
  hrProfileId?: string | null
  plannedAt?: string | null
  status?: InterviewStatus
  priority?: InterviewPriority
  reason?: string | null
  context?: string | null
  confidentialityLevel?: string
}): Promise<InterviewRow | null> {
  try {
    const payload = {
      interview_type_id: input.interviewTypeId,
      employee_profile_id: input.employeeProfileId,
      manager_profile_id: input.managerProfileId ?? null,
      hr_profile_id: input.hrProfileId ?? null,
      creator_profile_id: null,
      planned_at: input.plannedAt ?? null,
      status: input.status ?? 'a_planifier',
      priority: input.priority ?? 'normale',
      reason: input.reason ?? null,
      context: input.context ?? null,
      confidentiality_level: input.confidentialityLevel ?? 'interne',
    }

    const { data, error } = await (supabase as any)
      .from('interviews')
      .insert(payload)
      .select('*')
      .single()

    if (error) return null
    return (data as InterviewRow) ?? null
  } catch {
    return null
  }
}

export async function updateInterviewStatus(interviewId: string, status: InterviewStatus): Promise<boolean> {
  try {
    const { error } = await (supabase as any)
      .from('interviews')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', interviewId)

    return !error
  } catch {
    return false
  }
}

export function canTransitionInterviewStatus(from: InterviewStatus, to: InterviewStatus) {
  if (from === to) return true
  return INTERVIEW_STATUS_TRANSITIONS[from]?.includes(to) ?? false
}

export async function transitionInterviewStatus(interviewId: string, toStatus: InterviewStatus): Promise<{ ok: boolean; error: string | null }> {
  try {
    const { data: row, error: fetchError } = await (supabase as any)
      .from('interviews')
      .select('id, status')
      .eq('id', interviewId)
      .single()

    if (fetchError || !row) {
      return { ok: false, error: 'Entretien introuvable.' }
    }

    const fromStatus = row.status as InterviewStatus
    if (!canTransitionInterviewStatus(fromStatus, toStatus)) {
      return { ok: false, error: `Transition non autorisee: ${fromStatus} -> ${toStatus}.` }
    }

    const ok = await updateInterviewStatus(interviewId, toStatus)
    return { ok, error: ok ? null : 'Mise a jour du statut impossible.' }
  } catch {
    return { ok: false, error: 'Mise a jour du statut impossible.' }
  }
}

export function canTransitionInterviewDocumentStatus(
  from: InterviewDocumentRow['status'],
  to: InterviewDocumentRow['status'],
) {
  if (from === to) return true
  return INTERVIEW_DOCUMENT_STATUS_TRANSITIONS[from]?.includes(to) ?? false
}

export async function updateInterviewDocumentStatus(
  documentId: string,
  toStatus: InterviewDocumentRow['status'],
): Promise<{ ok: boolean; error: string | null }> {
  try {
    const { data: doc, error: fetchError } = await (supabase as any)
      .from('interview_documents')
      .select('id, status')
      .eq('id', documentId)
      .single()

    if (fetchError || !doc) return { ok: false, error: 'Document introuvable.' }

    const fromStatus = doc.status as InterviewDocumentRow['status']
    if (!canTransitionInterviewDocumentStatus(fromStatus, toStatus)) {
      return { ok: false, error: `Transition document non autorisee: ${fromStatus} -> ${toStatus}.` }
    }

    const patch: Record<string, unknown> = { status: toStatus, updated_at: new Date().toISOString() }
    if (toStatus === 'genere') patch.generated_at = new Date().toISOString()
    if (toStatus === 'envoye') patch.sent_at = new Date().toISOString()
    if (toStatus === 'signe' || toStatus === 'valide') {
      patch.signed = true
      patch.signed_at = new Date().toISOString()
    }

    const { error } = await (supabase as any)
      .from('interview_documents')
      .update(patch)
      .eq('id', documentId)

    return { ok: !error, error: error ? 'Mise a jour du document impossible.' : null }
  } catch {
    return { ok: false, error: 'Mise a jour du document impossible.' }
  }
}

export async function createInterviewDocument(input: {
  interviewId: string
  employeeProfileId: string
  documentType: string
  name: string
  templateId?: string | null
}): Promise<InterviewDocumentRow | null> {
  try {
    const now = new Date().toISOString()
    const { data, error } = await (supabase as any)
      .from('interview_documents')
      .insert({
        interview_id: input.interviewId,
        employee_profile_id: input.employeeProfileId,
        template_id: input.templateId ?? null,
        document_type: input.documentType,
        name: input.name,
        status: 'genere',
        current_version: 1,
        generated_at: now,
      })
      .select('id, interview_id, employee_profile_id, document_type, name, status, current_version, signed, signed_at, generated_at, sent_at')
      .single()

    if (error) return null

    const created = data as InterviewDocumentRow

    await (supabase as any)
      .from('interview_document_versions')
      .insert({
        document_id: created.id,
        version: 1,
        file_name: `${input.name}.pdf`,
        mime_type: 'application/pdf',
        is_signed_scan: false,
      })

    return created
  } catch {
    return null
  }
}

export async function listInterviewDocumentVersions(documentId: string): Promise<InterviewDocumentVersionRow[]> {
  try {
    const { data, error } = await (supabase as any)
      .from('interview_document_versions')
      .select('id, document_id, version, file_name, file_bucket, file_path, mime_type, uploaded_at, is_signed_scan')
      .eq('document_id', documentId)
      .order('version', { ascending: false })

    if (error) return []
    return (data as InterviewDocumentVersionRow[]) ?? []
  } catch {
    return []
  }
}

export async function uploadInterviewSignedScan(
  document: InterviewDocumentRow,
  file: File,
): Promise<{ ok: boolean; error: string | null }> {
  try {
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
    const nextVersion = (document.current_version ?? 0) + 1
    const path = `${document.interview_id}/${document.id}/v${nextVersion}-${Date.now()}-${safeName}`

    const { error: uploadError } = await supabase.storage
      .from('interview-documents')
      .upload(path, file, {
        contentType: file.type || 'application/pdf',
        upsert: false,
      })

    if (uploadError) return { ok: false, error: uploadError.message }

    const now = new Date().toISOString()

    const { error: versionError } = await (supabase as any)
      .from('interview_document_versions')
      .insert({
        document_id: document.id,
        version: nextVersion,
        file_bucket: 'interview-documents',
        file_path: path,
        file_name: file.name,
        mime_type: file.type || 'application/pdf',
        is_signed_scan: true,
        uploaded_at: now,
      })

    if (versionError) return { ok: false, error: 'Version documentaire impossible a enregistrer.' }

    const { error: updateError } = await (supabase as any)
      .from('interview_documents')
      .update({
        current_version: nextVersion,
        status: 'scanne',
        signed: true,
        signed_at: now,
        signed_file_bucket: 'interview-documents',
        signed_file_path: path,
        updated_at: now,
      })
      .eq('id', document.id)

    if (updateError) return { ok: false, error: 'Document impossible a mettre a jour.' }

    return { ok: true, error: null }
  } catch {
    return { ok: false, error: 'Upload du scan signe impossible.' }
  }
}

export function computeInterviewKpis(interviews: InterviewRow[]) {
  const today = withDateOnly(new Date())
  const now = Date.now()

  const planned = interviews.filter(item => item.status === 'planifie').length
  const completed = interviews.filter(item => item.status === 'realise').length
  const closed = interviews.filter(item => item.status === 'cloture').length
  const cancelled = interviews.filter(item => item.status === 'annule').length
  const pendingReport = interviews.filter(item => item.status === 'compte_rendu_a_completer' || item.status === 'compte_rendu_a_valider').length
  const overdue = interviews.filter(item => {
    if (!item.planned_at) return false
    const plannedTs = new Date(item.planned_at).getTime()
    return plannedTs < now && ['realise', 'cloture', 'annule', 'archive'].includes(item.status) === false
  }).length
  const upcoming = interviews.filter(item => {
    if (!item.planned_at) return false
    const d = withDateOnly(new Date(item.planned_at))
    return d >= today && ['planifie', 'convocation_envoyee', 'en_attente_realisation'].includes(item.status)
  }).length

  return {
    total: interviews.length,
    planned,
    completed,
    overdue,
    upcoming,
    closed,
    cancelled,
    pendingReport,
  }
}
