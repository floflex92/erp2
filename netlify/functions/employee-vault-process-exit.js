import { validateExitWorkflowPayload, validateVaultAdminAccess } from './_lib/employee-vault-validation'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
)

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

    // Vérifier que l'appelant est RH/admin
    const adminCheck = await validateVaultAdminAccess(userId, supabase)
    if (!adminCheck.ok) {
      return createJsonResponse({ error: adminCheck.error || 'Accès refusé' }, 403)
    }

    let payload = null
    try {
      payload = await req.json()
    } catch {
      return createJsonResponse({ error: 'JSON invalide.' }, 400)
    }

    const {
      employeeId,
      departureAt,
      departureReason,
      disableInternalAccount,
      keepVaultAccess,
      vaultAccessExpiresAt,
      vaultPersonalEmail,
    } = payload

    // Validation
    const validation = validateExitWorkflowPayload({
      employeeId,
      departureAt,
      departureReason,
      disableInternalAccount,
      keepVaultAccess,
      vaultAccessExpiresAt,
      vaultPersonalEmail,
    })

    if (!validation.ok) {
      return createJsonResponse({ error: validation.errors.join(' ') }, 400)
    }

    // Exécuter le workflow de sortie via fonction SQL
    const { data: result, error: execError } = await supabase.rpc('process_employee_exit', {
      p_employee_id: validation.value.employeeId,
      p_departure_at: departureAt,
      p_departure_reason: departureReason || null,
      p_disable_internal_account: disableInternalAccount !== false,
      p_keep_vault_access: keepVaultAccess !== false,
      p_vault_access_expires_at: vaultAccessExpiresAt || null,
      p_vault_personal_email: vaultPersonalEmail || null,
    })

    if (execError) {
      console.error('[employee-vault-process-exit]', execError)
      throw execError
    }

    return createJsonResponse({
      ok: true,
      workflow: result,
    }, 200)
  } catch (error) {
    console.error('[employee-vault-process-exit]', error)
    return createJsonResponse({
      error: error instanceof Error ? error.message : 'Erreur interne processus exit',
    }, 500)
  }
}
