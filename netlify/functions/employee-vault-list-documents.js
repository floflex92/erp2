import { createClient } from '@supabase/supabase-js'
import { DOCUMENT_TYPES } from './_lib/employee-vault-validation'

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

function createJsonResponse(payload, status, methods = 'GET, OPTIONS') {
  return new Response(JSON.stringify(payload), {
    status,
    headers: getBaseHeaders(methods),
  })
}

function parsePagination(rawLimit, rawOffset) {
  const parsedLimit = Number.parseInt(rawLimit || '100', 10)
  const parsedOffset = Number.parseInt(rawOffset || '0', 10)

  const limit = Number.isFinite(parsedLimit) ? Math.max(1, Math.min(parsedLimit, 100)) : 100
  const offset = Number.isFinite(parsedOffset) ? Math.max(0, parsedOffset) : 0

  return { limit, offset }
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
    return new Response(null, { status: 204, headers: getBaseHeaders('GET, OPTIONS') })
  }

  if (req.method !== 'GET') {
    return createJsonResponse({ error: 'Méthode non supportée' }, 405)
  }

  try {
    const userId = await resolveUserId(req, context)
    if (!userId) {
      return createJsonResponse({ error: 'Non authentifié' }, 401)
    }

    const url = new URL(req.url)
    const filterDocumentType = url.searchParams.get('document_type') || null
    if (filterDocumentType && !DOCUMENT_TYPES.has(filterDocumentType)) {
      return createJsonResponse({ error: 'document_type invalide.' }, 400)
    }

    const { limit, offset } = parsePagination(url.searchParams.get('limit'), url.searchParams.get('offset'))

    // Vérifier les droits: peut lire tous les docs seulement pour rôles RH/admin.
    let canViewAll = false
    const { data: profileData, error: profileError } = await supabase
      .from('profils')
      .select('role')
      .eq('user_id', userId)
      .limit(1)
      .maybeSingle()

    if (profileError) throw profileError
    if (profileData?.role && ['admin', 'super_admin', 'dirigeant', 'rh'].includes(profileData.role)) {
      canViewAll = true
    }

    // Récupérer le compte coffre
    const { data: vaultAccount, error: accountError } = await supabase
      .from('employee_vault_accounts')
      .select('id, employee_id')
      .eq('auth_user_id', userId)
      .eq('status', 'active')
      .limit(1)
      .maybeSingle()

    if (accountError) throw accountError
    if (!canViewAll && !vaultAccount?.id) {
      return createJsonResponse({ error: 'Compte coffre introuvable ou inactif' }, 403)
    }

    // Requête documents
    let query = supabase
      .from('v_employee_vault_documents')
      .select(
        'id, employee_id, first_name, last_name, employment_status, document_type, title, file_name, published_at, policy_label',
        { count: 'exact' }
      )
      .order('published_at', { ascending: false })

    if (!canViewAll) {
      query = query.eq('employee_id', vaultAccount.employee_id)
    }

    if (filterDocumentType) {
      query = query.eq('document_type', filterDocumentType)
    }

    const { data: documents, count, error: documentsError } = await query
      .range(offset, offset + limit - 1)

    if (documentsError) throw documentsError

    // Récupérer les consentements pour étiqueter les documents signés
    const documentIds = (documents || []).map(d => d.id)
    let consentMap = new Map()

    if (documentIds.length > 0) {
      const { data: consents } = await supabase
        .from('employee_document_consents')
        .select('document_id, signed_at, status')
        .eq('consent_type', 'signature')
        .in('document_id', documentIds)

      for (const consent of (consents || [])) {
        if (!consentMap.has(consent.document_id) || (consent.signed_at && !consentMap.get(consent.document_id).signed_at)) {
          consentMap.set(consent.document_id, consent)
        }
      }
    }

    const results = (documents || []).map(doc => ({
      id: doc.id,
      employeeId: doc.employee_id,
      employeeName: [doc.first_name, doc.last_name].filter(Boolean).join(' ') || 'Salarié',
      documentType: doc.document_type,
      title: doc.title,
      fileName: doc.file_name,
      publishedAt: doc.published_at,
      policyLabel: doc.policy_label,
      signedAt: consentMap.get(doc.id)?.signed_at || null,
      consentStatus: consentMap.get(doc.id)?.status || 'pending',
    }))

    return createJsonResponse({
      ok: true,
      documents: results,
      count: count || 0,
      offset,
      limit,
    }, 200)
  } catch (error) {
    console.error('[employee-vault-list-documents]', error)
    return createJsonResponse({
      error: error instanceof Error ? error.message : 'Erreur interne',
    }, 500)
  }
}
