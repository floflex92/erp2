import { supabase } from './supabase'
import type { Role } from './auth'
import type { HrDocumentCategory, HrDocumentRecord } from './hrDocuments'
import type { TchatAttachment } from './tchatMessage'

const PRIVILEGED_ROLES = new Set<Role>(['admin', 'super_admin', 'dirigeant', 'rh'])

const DOCUMENT_TYPE_TO_CATEGORY: Record<string, HrDocumentCategory> = {
  bulletin_paie: 'fiche_paie',
  contrat: 'contrat_travail',
  avenant: 'contrat_travail',
  attestation: 'fiche_information_embauche',
  document_rh_remis: 'livret_integration',
  document_signe: 'scan_complementaire',
  entretien: 'fiche_poste',
  convocation: 'fiche_information_embauche',
  avertissement: 'scan_complementaire',
  fin_contrat: 'contrat_travail',
  justificatif_personnel: 'scan_complementaire',
}

type VaultDocumentRow = {
  id: string
  employee_id: string
  first_name: string | null
  last_name: string | null
  employment_status: string | null
  document_type: string
  title: string
  file_name: string
  mime_type: string
  storage_bucket: string
  storage_path: string
  published_at: string
  require_signature: boolean | null
  policy_label: string | null
}

type VaultConsentRow = {
  document_id: string
  signed_at: string | null
  status: string
}

type VaultAccountRow = {
  id: string
  employee_id: string
}

type EmployeeVaultExportScope = 'visible_only' | 'by_type' | 'by_period' | 'full'

export type EmployeeVaultExportRecord = {
  id: string
  scope: EmployeeVaultExportScope
  status: 'requested' | 'processing' | 'ready' | 'expired' | 'failed'
  fileName: string | null
  createdAt: string
  expiresAt: string | null
}

function employeeLabel(firstName: string | null, lastName: string | null) {
  const label = [firstName, lastName].filter(Boolean).join(' ').trim()
  return label || 'Salarie'
}

function mapCategory(documentType: string): HrDocumentCategory {
  return DOCUMENT_TYPE_TO_CATEGORY[documentType] ?? 'scan_complementaire'
}

function sanitizeFileName(name: string) {
  return name
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 120) || 'piece-jointe'
}

async function resolveActiveVaultAccount() {
  const { data: authData } = await supabase.auth.getUser()
  const authUserId = authData.user?.id
  if (!authUserId) return null

  const { data, error } = await (supabase as any)
    .from('employee_vault_accounts')
    .select('id, employee_id')
    .eq('auth_user_id', authUserId)
    .eq('status', 'active')
    .limit(1)
    .maybeSingle()

  if (error) throw new Error(error.message)
  if (!data?.id || !data?.employee_id) return null
  return data as VaultAccountRow
}

async function resolveEmployeeIds(viewerProfileId: string, role: Role, effectiveEmployeeProfileId: string | null) {
  const isPrivileged = PRIVILEGED_ROLES.has(role)

  if (!isPrivileged) {
    const { data } = await (supabase as any)
      .from('employee_directory')
      .select('id')
      .eq('profil_id', viewerProfileId)
      .limit(1)
      .maybeSingle()
    return data?.id ? [data.id as string] : []
  }

  if (!effectiveEmployeeProfileId) return null

  const { data } = await (supabase as any)
    .from('employee_directory')
    .select('id')
    .eq('profil_id', effectiveEmployeeProfileId)
    .limit(1)
    .maybeSingle()

  return data?.id ? [data.id as string] : []
}

async function buildSignedUrl(storageBucket: string, storagePath: string) {
  const { data } = await supabase.storage.from(storageBucket).createSignedUrl(storagePath, 60 * 60)
  return data?.signedUrl ?? ''
}

export async function getEmployeeVaultDocumentSignedUrl(documentId: string) {
  const { data, error } = await (supabase as any)
    .from('employee_vault_documents')
    .select('storage_bucket, storage_path')
    .eq('id', documentId)
    .limit(1)
    .maybeSingle()

  if (error) throw new Error(error.message)
  if (!data?.storage_bucket || !data?.storage_path) {
    throw new Error('Document coffre introuvable ou incomplet.')
  }

  const signedUrl = await buildSignedUrl(data.storage_bucket, data.storage_path)
  if (!signedUrl) {
    throw new Error('Impossible de regenerer un lien de lecture pour ce document.')
  }
  return signedUrl
}

export async function listEmployeeVaultDocumentsForViewer(
  viewerProfileId: string,
  role: Role,
  effectiveEmployeeProfileId: string | null,
): Promise<HrDocumentRecord[]> {
  const employeeIds = await resolveEmployeeIds(viewerProfileId, role, effectiveEmployeeProfileId)
  if (Array.isArray(employeeIds) && employeeIds.length === 0) return []

  let query = (supabase as any)
    .from('v_employee_vault_documents')
    .select('id, employee_id, first_name, last_name, employment_status, document_type, title, file_name, mime_type, storage_bucket, storage_path, published_at, require_signature, policy_label')
    .order('published_at', { ascending: false })

  if (Array.isArray(employeeIds)) {
    query = query.in('employee_id', employeeIds)
  }

  const { data, error } = await query
  if (error) throw new Error(error.message)

  const rows = ((data as VaultDocumentRow[] | null) ?? []).filter(item => !!item.id)
  if (rows.length === 0) return []

  const documentIds = rows.map(item => item.id)
  const { data: consentRows } = await (supabase as any)
    .from('employee_document_consents')
    .select('document_id, signed_at, status')
    .eq('consent_type', 'signature')
    .eq('status', 'accepted')
    .in('document_id', documentIds)

  const latestConsentByDocument = new Map<string, VaultConsentRow>()
  for (const consent of ((consentRows as VaultConsentRow[] | null) ?? [])) {
    const previous = latestConsentByDocument.get(consent.document_id)
    if (!previous) {
      latestConsentByDocument.set(consent.document_id, consent)
      continue
    }
    const prevTs = previous.signed_at ? new Date(previous.signed_at).getTime() : 0
    const nextTs = consent.signed_at ? new Date(consent.signed_at).getTime() : 0
    if (nextTs >= prevTs) latestConsentByDocument.set(consent.document_id, consent)
  }

  const urls = await Promise.all(rows.map(item => buildSignedUrl(item.storage_bucket, item.storage_path)))

  return rows.map((item, index) => {
    const consent = latestConsentByDocument.get(item.id)
    const employeeName = employeeLabel(item.first_name, item.last_name)
    const requiresSignature = Boolean(item.require_signature)

    return {
      id: item.id,
      employeeId: item.employee_id,
      employeeName,
      employeeEmail: null,
      employeeRole: 'conducteur',
      category: mapCategory(item.document_type),
      title: item.title,
      mimeType: item.mime_type,
      fileName: item.file_name,
      size: 0,
      url: urls[index],
      createdAt: item.published_at,
      createdById: 'employee-vault',
      createdByName: item.policy_label || 'Coffre salarie',
      source: 'generated',
      requiresSignature,
      signedAt: consent?.signed_at ?? null,
      signatureLabel: consent?.signed_at ? 'Signature coffre salarie' : null,
      tags: [item.document_type, item.employment_status || 'active'],
      archived: false,
      availableAt: null,
      paymentScheduledAt: null,
    } satisfies HrDocumentRecord
  })
}

export async function signEmployeeVaultDocument(documentId: string, signerName: string) {
  const { data: authData } = await supabase.auth.getUser()
  const authUserId = authData.user?.id
  if (!authUserId) throw new Error('Utilisateur non authentifie pour la signature.')

  const { data: account, error: accountError } = await (supabase as any)
    .from('employee_vault_accounts')
    .select('id, employee_id')
    .eq('auth_user_id', authUserId)
    .eq('status', 'active')
    .limit(1)
    .maybeSingle()

  if (accountError) throw new Error(accountError.message)
  if (!account?.id || !account?.employee_id) throw new Error('Compte coffre salarie introuvable.')

  const { data: document, error: docError } = await (supabase as any)
    .from('employee_vault_documents')
    .select('id, employee_id, current_version_no')
    .eq('id', documentId)
    .limit(1)
    .maybeSingle()

  if (docError) throw new Error(docError.message)
  if (!document?.id) throw new Error('Document introuvable.')
  if (document.employee_id !== account.employee_id) {
    throw new Error('Seul le salarie concerne peut signer ce document.')
  }

  const { data: version, error: versionError } = await (supabase as any)
    .from('employee_vault_document_versions')
    .select('id')
    .eq('document_id', document.id)
    .eq('version_no', document.current_version_no)
    .limit(1)
    .maybeSingle()

  if (versionError) throw new Error(versionError.message)
  if (!version?.id) throw new Error('Version documentaire introuvable.')

  const signedAt = new Date().toISOString()

  const { error: consentError } = await (supabase as any)
    .from('employee_document_consents')
    .upsert(
      {
        employee_id: account.employee_id,
        document_id: document.id,
        document_version_id: version.id,
        vault_account_id: account.id,
        consent_type: 'signature',
        status: 'accepted',
        signed_label: signerName,
        signed_at: signedAt,
      },
      { onConflict: 'document_version_id,vault_account_id,consent_type' },
    )

  if (consentError) throw new Error(consentError.message)

  await (supabase as any)
    .from('employee_vault_access_logs')
    .insert({
      document_id: document.id,
      document_version_id: version.id,
      employee_id: account.employee_id,
      vault_account_id: account.id,
      action: 'sign',
      channel: 'web',
      metadata: { source: 'coffre-ui' },
    })
}

export async function logEmployeeVaultDocumentAction(documentId: string, action: 'view' | 'preview' | 'download') {
  const { data: authData } = await supabase.auth.getUser()
  const authUserId = authData.user?.id
  if (!authUserId) return

  const { data: account } = await (supabase as any)
    .from('employee_vault_accounts')
    .select('id, employee_id')
    .eq('auth_user_id', authUserId)
    .limit(1)
    .maybeSingle()

  if (!account?.id) return

  await (supabase as any).from('employee_vault_access_logs').insert({
    document_id: documentId,
    employee_id: account.employee_id,
    vault_account_id: account.id,
    action,
    channel: 'web',
    metadata: { source: 'coffre-ui' },
  })
}

export async function saveAttachmentToEmployeeVault(
  ownerProfileId: string,
  attachment: TchatAttachment,
  source: 'mail' | 'tchat' | 'signature',
  sourceLabel: string,
) {
  const account = await resolveActiveVaultAccount()
  if (!account?.id || !account.employee_id) return false

  const { data: ownerEmployee } = await (supabase as any)
    .from('employee_directory')
    .select('id')
    .eq('profil_id', ownerProfileId)
    .limit(1)
    .maybeSingle()

  if (!ownerEmployee?.id || ownerEmployee.id !== account.employee_id) {
    return false
  }

  const { data: policyData, error: policyError } = await (supabase as any)
    .from('document_visibility_policies')
    .select('id')
    .eq('document_type', 'justificatif_personnel')
    .eq('is_active', true)
    .limit(1)
    .maybeSingle()

  if (policyError) throw new Error(policyError.message)
  if (!policyData?.id) throw new Error('Politique justificatif_personnel introuvable.')

  const response = await fetch(attachment.url)
  if (!response.ok) throw new Error('Impossible de recuperer la piece jointe locale.')

  const fileBlob = await response.blob()
  const safeName = sanitizeFileName(attachment.name)
  const storagePath = `${account.id}/${Date.now()}-${safeName}`

  const { error: uploadError } = await supabase.storage
    .from('employee-vault-documents')
    .upload(storagePath, fileBlob, {
      contentType: attachment.mimeType || 'application/octet-stream',
      upsert: false,
    })

  if (uploadError) throw new Error(uploadError.message)

  const title = sourceLabel?.trim()
    ? `Piece jointe ${source.toUpperCase()} - ${sourceLabel.trim()}`
    : `Piece jointe ${source.toUpperCase()}`

  const { data: createdDoc, error: docError } = await (supabase as any)
    .from('employee_vault_documents')
    .insert({
      employee_id: account.employee_id,
      policy_id: policyData.id,
      document_type: 'justificatif_personnel',
      title,
      file_name: attachment.name,
      mime_type: attachment.mimeType || 'application/octet-stream',
      storage_bucket: 'employee-vault-documents',
      storage_path: storagePath,
      origin_source: 'employee_upload',
      created_by_vault_account_id: account.id,
    })
    .select('id')
    .limit(1)
    .maybeSingle()

  if (docError) throw new Error(docError.message)

  if (createdDoc?.id) {
    await (supabase as any).from('employee_vault_access_logs').insert({
      document_id: createdDoc.id,
      employee_id: account.employee_id,
      vault_account_id: account.id,
      action: 'upload',
      channel: 'web',
      metadata: { source: 'attachment-sync', attachmentSource: source },
    })
  }

  return true
}

export async function listEmployeeVaultExportsForViewer(
  viewerProfileId: string,
  role: Role,
  effectiveEmployeeProfileId: string | null,
): Promise<EmployeeVaultExportRecord[]> {
  const employeeIds = await resolveEmployeeIds(viewerProfileId, role, effectiveEmployeeProfileId)
  if (Array.isArray(employeeIds) && employeeIds.length === 0) return []

  let query = (supabase as any)
    .from('employee_document_exports')
    .select('id, scope, status, file_name, created_at, expires_at')
    .order('created_at', { ascending: false })
    .limit(20)

  if (Array.isArray(employeeIds)) {
    query = query.in('employee_id', employeeIds)
  }

  const { data, error } = await query
  if (error) throw new Error(error.message)

  return ((data as any[] | null) ?? []).map(item => ({
    id: item.id,
    scope: item.scope,
    status: item.status,
    fileName: item.file_name ?? null,
    createdAt: item.created_at,
    expiresAt: item.expires_at ?? null,
  }))
}

export async function requestEmployeeVaultExport(
  viewerProfileId: string,
  role: Role,
  effectiveEmployeeProfileId: string | null,
  scope: EmployeeVaultExportScope = 'visible_only',
) {
  const employeeIds = await resolveEmployeeIds(viewerProfileId, role, effectiveEmployeeProfileId)
  const targetEmployeeId = Array.isArray(employeeIds) ? employeeIds[0] : null
  if (!targetEmployeeId) throw new Error('Employe cible introuvable pour export.')

  const account = await resolveActiveVaultAccount()
  const isPrivileged = PRIVILEGED_ROLES.has(role)

  const insertPayload: Record<string, unknown> = {
    employee_id: targetEmployeeId,
    scope,
    filters: {},
  }

  if (!isPrivileged) {
    if (!account?.id) throw new Error('Compte coffre actif requis pour demander un export.')
    insertPayload.requested_by_vault_account_id = account.id
  }

  const { error } = await (supabase as any)
    .from('employee_document_exports')
    .insert(insertPayload)

  if (error) throw new Error(error.message)
}
