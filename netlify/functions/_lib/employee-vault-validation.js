const DOCUMENT_TYPES = new Set([
  'bulletin_paie',
  'contrat',
  'avenant',
  'attestation',
  'document_rh_remis',
  'document_signe',
  'entretien',
  'convocation',
  'avertissement',
  'fin_contrat',
  'justificatif_personnel',
])

const EXPORT_SCOPES = new Set(['full', 'visible_only', 'by_type', 'by_period'])
const CONSENT_TYPES = new Set(['acknowledgement', 'signature', 'consent'])
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function isNonEmptyString(value, max = 500) {
  return typeof value === 'string' && value.trim().length > 0 && value.trim().length <= max
}

function isEmail(value) {
  return typeof value === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())
}

function isIsoDate(value) {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)
}

function isUuid(value) {
  return typeof value === 'string' && UUID_REGEX.test(value.trim())
}

function toSanitizedString(value, max = 500) {
  if (typeof value !== 'string') return null
  const normalized = value.trim()
  if (!normalized) return null
  return normalized.slice(0, max)
}

function validateVaultDocumentPayload(payload, { allowEmployeeUpload = false } = {}) {
  const errors = []
  const documentType = toSanitizedString(payload?.document_type, 100)
  const title = toSanitizedString(payload?.title, 255)
  const fileName = toSanitizedString(payload?.file_name, 255)
  const storagePath = toSanitizedString(payload?.storage_path, 1024)
  const storageBucket = toSanitizedString(payload?.storage_bucket, 120) || 'employee-vault-documents'
  const originSource = toSanitizedString(payload?.origin_source, 80) || 'hr_upload'

  if (!documentType || !DOCUMENT_TYPES.has(documentType)) {
    errors.push('document_type invalide.')
  }
  if (!title) errors.push('title requis.')
  if (!fileName) errors.push('file_name requis.')
  if (!storagePath) errors.push('storage_path requis.')

  if (!allowEmployeeUpload && originSource === 'employee_upload') {
    errors.push('origin_source employee_upload non autorise dans ce contexte.')
  }

  if (payload?.issued_at && !isIsoDate(payload.issued_at)) {
    errors.push('issued_at doit etre au format YYYY-MM-DD.')
  }
  if (payload?.expires_at && !isIsoDate(payload.expires_at)) {
    errors.push('expires_at doit etre au format YYYY-MM-DD.')
  }

  return {
    ok: errors.length === 0,
    errors,
    value: {
      document_type: documentType,
      title,
      file_name: fileName,
      mime_type: toSanitizedString(payload?.mime_type, 120) || 'application/pdf',
      storage_bucket: storageBucket,
      storage_path: storagePath,
      origin_source: originSource,
      issued_at: payload?.issued_at || null,
      expires_at: payload?.expires_at || null,
      visibility_override_after_departure:
        typeof payload?.visibility_override_after_departure === 'boolean'
          ? payload.visibility_override_after_departure
          : null,
    },
  }
}

function validateVaultAccountPayload(payload) {
  const errors = []
  const personalEmail = toSanitizedString(payload?.personal_email, 320)

  if (!personalEmail || !isEmail(personalEmail)) {
    errors.push('personal_email invalide.')
  }

  if (payload?.professional_email_snapshot && !isEmail(payload.professional_email_snapshot)) {
    errors.push('professional_email_snapshot invalide.')
  }

  if (
    payload?.access_expires_at != null
    && Number.isNaN(new Date(payload.access_expires_at).getTime())
  ) {
    errors.push('access_expires_at invalide.')
  }

  return {
    ok: errors.length === 0,
    errors,
    value: {
      personal_email: personalEmail ? personalEmail.toLowerCase() : null,
      professional_email_snapshot: payload?.professional_email_snapshot
        ? payload.professional_email_snapshot.toLowerCase().trim()
        : null,
      keep_access_after_departure: payload?.keep_access_after_departure !== false,
      access_expires_at: payload?.access_expires_at || null,
    },
  }
}

function validateExitWorkflowPayload(payload) {
  const errors = []

  if (!isUuid(payload?.employeeId)) {
    errors.push('employeeId invalide (UUID requis).')
  }

  if (payload?.departure_at && !isIsoDate(payload.departure_at)) {
    errors.push('departure_at doit etre au format YYYY-MM-DD.')
  }

  if (payload?.vault_personal_email && !isEmail(payload.vault_personal_email)) {
    errors.push('vault_personal_email invalide.')
  }

  if (
    payload?.vault_access_expires_at != null
    && Number.isNaN(new Date(payload.vault_access_expires_at).getTime())
  ) {
    errors.push('vault_access_expires_at invalide.')
  }

  return {
    ok: errors.length === 0,
    errors,
    value: {
      employeeId: payload?.employeeId ? payload.employeeId.trim() : null,
      departure_at: payload?.departure_at || null,
      departure_reason: toSanitizedString(payload?.departure_reason, 1000),
      disable_internal_account: payload?.disable_internal_account !== false,
      keep_vault_access: payload?.keep_vault_access !== false,
      vault_access_expires_at: payload?.vault_access_expires_at || null,
      vault_personal_email: payload?.vault_personal_email
        ? payload.vault_personal_email.trim().toLowerCase()
        : null,
    },
  }
}

function validateExportRequestPayload(payload) {
  const errors = []
  const scope = toSanitizedString(payload?.scope, 30) || 'visible_only'

  if (!EXPORT_SCOPES.has(scope)) {
    errors.push('scope export invalide.')
  }

  if (scope === 'by_type') {
    const types = Array.isArray(payload?.filters?.document_types) ? payload.filters.document_types : []
    const invalidTypes = types.filter(type => !DOCUMENT_TYPES.has(type))
    if (types.length === 0 || invalidTypes.length > 0) {
      errors.push('filters.document_types invalide pour scope by_type.')
    }
  }

  if (scope === 'by_period') {
    const fromDate = payload?.filters?.from
    const toDate = payload?.filters?.to
    if (!isIsoDate(fromDate) || !isIsoDate(toDate)) {
      errors.push('filters.from et filters.to requis au format YYYY-MM-DD pour scope by_period.')
    }
  }

  return {
    ok: errors.length === 0,
    errors,
    value: {
      scope,
      filters: payload?.filters && typeof payload.filters === 'object' ? payload.filters : {},
    },
  }
}

function validateConsentPayload(payload) {
  const errors = []
  const consentType = toSanitizedString(payload?.consent_type, 40)

  if (!consentType || !CONSENT_TYPES.has(consentType)) {
    errors.push('consent_type invalide.')
  }

  if (!isNonEmptyString(payload?.document_id, 80)) {
    errors.push('document_id requis.')
  }

  if (!isNonEmptyString(payload?.document_version_id, 80)) {
    errors.push('document_version_id requis.')
  }

  return {
    ok: errors.length === 0,
    errors,
    value: {
      consent_type: consentType,
      document_id: toSanitizedString(payload?.document_id, 80),
      document_version_id: toSanitizedString(payload?.document_version_id, 80),
      signed_label: toSanitizedString(payload?.signed_label, 320),
      status: toSanitizedString(payload?.status, 30) || 'accepted',
      metadata: payload?.metadata && typeof payload.metadata === 'object' ? payload.metadata : {},
    },
  }
}

function validateSignRequestPayload(payload) {
  const errors = []
  const documentId = toSanitizedString(payload?.documentId ?? payload?.document_id, 80)
  const signerName = toSanitizedString(payload?.signerName ?? payload?.signed_label, 320)

  if (!documentId) errors.push('documentId requis.')
  if (!signerName) errors.push('signerName requis.')

  return {
    ok: errors.length === 0,
    errors,
    value: {
      documentId,
      signerName,
    },
  }
}

async function validateVaultAdminAccess(userId, supabase) {
  if (!userId) {
    return { ok: false, error: 'Utilisateur non authentifie' }
  }

  const { data, error } = await supabase
    .from('profils')
    .select('role')
    .eq('user_id', userId)
    .limit(1)
    .maybeSingle()

  if (error) {
    return { ok: false, error: error.message }
  }

  const role = typeof data?.role === 'string' ? data.role : null
  if (!role || !['admin', 'super_admin', 'dirigeant', 'rh'].includes(role)) {
    return { ok: false, error: 'Droits administrateur coffre insuffisants' }
  }

  return { ok: true, role }
}

export {
  DOCUMENT_TYPES,
  validateVaultDocumentPayload,
  validateVaultAccountPayload,
  validateExitWorkflowPayload,
  validateExportRequestPayload,
  validateConsentPayload,
  validateSignRequestPayload,
  validateVaultAdminAccess,
}
