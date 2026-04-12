import { validateSignRequestPayload } from './_lib/employee-vault-validation'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
)

const SIGN_RATE_LIMIT_WINDOW_MS = 60 * 1000
const SIGN_RATE_LIMIT_MAX_REQUESTS = 20

function getBaseHeaders(methods) {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': methods,
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Content-Type': 'application/json',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
  }
}

function createJsonResponse(payload, status, methods = 'POST, OPTIONS') {
  return new Response(JSON.stringify(payload), {
    status,
    headers: getBaseHeaders(methods),
  })
}

function isRateLimited(userId) {
  const now = Date.now()
  const limiter = (globalThis.__employeeVaultSignLimiter ||= new Map())
  const userWindow = limiter.get(userId)

  if (!userWindow || now - userWindow.startedAt > SIGN_RATE_LIMIT_WINDOW_MS) {
    limiter.set(userId, { startedAt: now, count: 1 })
    return false
  }

  userWindow.count += 1
  if (userWindow.count > SIGN_RATE_LIMIT_MAX_REQUESTS) {
    return true
  }

  return false
}

async function resolveUserId(req, context) {
  const contextUserId = context?.clientContext?.user?.sub ?? context?.authlify?.user?.sub ?? null
  if (contextUserId) return contextUserId

  const authHeader = req?.headers?.get?.('authorization') || req?.headers?.get?.('Authorization')
  if (!authHeader?.startsWith('Bearer ')) return null

  const token = authHeader.slice(7).trim()
  if (!token) return null

  const { data, error } = await supabase.auth.getUser(token)
  if (error || !data?.user?.id) return null
  return data.user.id
}

export default async (req, context) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: getBaseHeaders('POST, OPTIONS') })
  }

  if (req.method !== 'POST') {
    return createJsonResponse({ error: 'Méthode non supportée' }, 405)
  }

  try {
    const userId = await resolveUserId(req, context)
    if (!userId) {
      return createJsonResponse({ error: 'Non authentifié' }, 401)
    }

    if (isRateLimited(userId)) {
      return createJsonResponse({ error: 'Trop de requêtes, réessayez plus tard.' }, 429)
    }

    let payload = null
    try {
      payload = await req.json()
    } catch {
      return createJsonResponse({ error: 'JSON invalide.' }, 400)
    }

    const validationResult = validateSignRequestPayload(payload)
    if (!validationResult.ok) {
      return createJsonResponse({ error: validationResult.errors.join(' ') }, 400)
    }

    const { documentId, signerName } = validationResult.value

    if (!documentId || !signerName) {
      return createJsonResponse({ error: 'Payload signature invalide' }, 400)
    }

    // Récupérer compte coffre du signataire
    const { data: vaultAccount, error: accountError } = await supabase
      .from('employee_vault_accounts')
      .select('id, employee_id')
      .eq('auth_user_id', userId)
      .eq('status', 'active')
      .limit(1)
      .maybeSingle()

    if (accountError) throw accountError
    if (!vaultAccount?.id) {
      return createJsonResponse({ error: 'Compte coffre introuvable ou inactif' }, 403)
    }

    // Vérifier que le document appartien à cet employé
    const { data: document, error: docError } = await supabase
      .from('employee_vault_documents')
      .select('id, employee_id, current_version_no')
      .eq('id', documentId)
      .limit(1)
      .maybeSingle()

    if (docError) throw docError
    if (!document?.id) {
      return createJsonResponse({ error: 'Document introuvable' }, 404)
    }

    if (document.employee_id !== vaultAccount.employee_id) {
      return createJsonResponse({ error: 'Accès refusé: document non appartenant à ce salarié' }, 403)
    }

    // Récupérer la version actuelle
    const { data: version, error: versionError } = await supabase
      .from('employee_vault_document_versions')
      .select('id')
      .eq('document_id', document.id)
      .eq('version_no', document.current_version_no)
      .limit(1)
      .maybeSingle()

    if (versionError) throw versionError
    if (!version?.id) {
      return createJsonResponse({ error: 'Version documentaire introuvable' }, 404)
    }

    const signedAt = new Date().toISOString()

    // Upsert consentement signature
    const { error: consentError } = await supabase
      .from('employee_document_consents')
      .upsert(
        {
          employee_id: vaultAccount.employee_id,
          document_id: document.id,
          document_version_id: version.id,
          vault_account_id: vaultAccount.id,
          consent_type: 'signature',
          status: 'accepted',
          signed_label: signerName,
          signed_at: signedAt,
        },
        { onConflict: 'document_version_id,vault_account_id,consent_type' }
      )

    if (consentError) throw consentError

    // Logger l'action
    await supabase.from('employee_vault_access_logs').insert({
      document_id: document.id,
      document_version_id: version.id,
      employee_id: vaultAccount.employee_id,
      vault_account_id: vaultAccount.id,
      action: 'sign',
      channel: 'api',
      metadata: { endpoint: '/employee-vault-sign-document', source: 'api' },
    })

    return createJsonResponse({
      ok: true,
      documentId: document.id,
      signedAt,
      signerName,
    }, 200)
  } catch (error) {
    console.error('[employee-vault-sign-document]', error)
    return createJsonResponse({
      error: error instanceof Error ? error.message : 'Erreur interne',
    }, 500)
  }
}
