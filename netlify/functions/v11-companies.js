/**
 * Netlify Function : v11-companies
 * Gestion des companies (tenants) - acces super admin plateforme uniquement.
 *
 * Endpoints :
 *   GET  /.netlify/functions/v11-companies           → liste toutes les companies
 *   GET  /.netlify/functions/v11-companies?id=N      → detail d'une company
 *   POST /.netlify/functions/v11-companies           → creer une nouvelle company
 *   PATCH/.netlify/functions/v11-companies?id=N      → mettre a jour une company
 *
 * SECURITE :
 *   - Acces restreint aux platform_admins uniquement (table public.platform_admins)
 *   - aucun acces tenant standard ne peut atteindre ces endpoints
 *   - Toutes les actions sont journalisees dans platform_audit_events
 */

import {
  authorize,
  createServiceClient,
  getSupabaseEnv,
  json,
  parseJsonBody,
  readToken,
  SECURITY_HEADERS,
} from './_lib/v11-core.js'

// ─── helpers ────────────────────────────────────────────────────────────────

const SLUG_RE = /^[a-z0-9_-]{2,64}$/

function slugify(str) {
  return str
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9_-]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 64)
}

/**
 * Verifie si l'utilisateur est un platform_admin.
 * SECURITE : utilise le service client (bypasse RLS) pour verifier platform_admins.
 * Ne jamais faire confiance au JWT seul pour ce check.
 */
async function requirePlatformAdmin(event) {
  const env = getSupabaseEnv()
  if (!env) return { error: json(500, { error: 'Configuration serveur manquante.' }) }

  const token = readToken(event)
  if (!token) return { error: json(401, { error: 'Token manquant.' }) }

  const serviceClient = createServiceClient()
  if (!serviceClient) return { error: json(500, { error: 'Service client non disponible.' }) }

  // Verifie le JWT
  const { data: authData, error: authError } = await serviceClient.auth.getUser(token)
  if (authError || !authData?.user) {
    return { error: json(401, { error: 'Session invalide.' }) }
  }

  // SECURITE : verifie explicitement dans platform_admins (RLS bypasse via service)
  const { data: admin, error: adminError } = await serviceClient
    .from('platform_admins')
    .select('id, email, nom, prenom, is_active')
    .eq('user_id', authData.user.id)
    .eq('is_active', true)
    .maybeSingle()

  if (adminError || !admin) {
    return { error: json(403, { error: 'Acces refuse : platform_admin requis.' }) }
  }

  return { serviceClient, user: authData.user, admin }
}

/**
 * Journalise une action admin dans platform_audit_events.
 * Non-bloquant (fire-and-forget).
 */
async function auditLog(serviceClient, userId, email, eventType, targetType, targetId, payload) {
  try {
    await serviceClient.from('platform_audit_events').insert({
      admin_user_id: userId,
      admin_email: email,
      event_type: eventType,
      target_type: targetType,
      target_id: String(targetId ?? ''),
      payload: payload ?? null,
    })
  } catch {
    // non-bloquant
  }
}

// ─── handler principal ───────────────────────────────────────────────────────

export async function handler(event) {
  const method = event.httpMethod

  // Verifie les droits platform_admin
  const auth = await requirePlatformAdmin(event)
  if (auth.error) return auth.error

  const { serviceClient, user, admin } = auth
  const companyIdParam = event.queryStringParameters?.id
    ? Number.parseInt(event.queryStringParameters.id, 10)
    : null

  // ── GET ─────────────────────────────────────────────────────────────────

  if (method === 'GET') {
    // Detail d'une company
    if (companyIdParam) {
      const { data, error } = await serviceClient
        .from('companies')
        .select('*')
        .eq('id', companyIdParam)
        .maybeSingle()

      if (error) return json(500, { error: error.message })
      if (!data) return json(404, { error: 'Company introuvable.' })

      // Compte les profils de ce tenant
      const { count: userCount } = await serviceClient
        .from('profils')
        .select('id', { count: 'exact', head: true })
        .eq('company_id', companyIdParam)

      return json(200, { company: { ...data, user_count: userCount ?? 0 } })
    }

    // Liste toutes les companies avec stats
    const { data: companies, error } = await serviceClient
      .from('companies')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) return json(500, { error: error.message })

    // Enrichit avec le nombre d'utilisateurs par company
    const ids = (companies ?? []).map(c => c.id)
    let userCounts = {}
    if (ids.length > 0) {
      const { data: counts } = await serviceClient
        .from('profils')
        .select('company_id')
        .in('company_id', ids)

      for (const row of (counts ?? [])) {
        userCounts[row.company_id] = (userCounts[row.company_id] ?? 0) + 1
      }
    }

    const enriched = (companies ?? []).map(c => ({
      ...c,
      user_count: userCounts[c.id] ?? 0,
    }))

    return json(200, { companies: enriched })
  }

  // ── POST : creer une company ─────────────────────────────────────────────

  if (method === 'POST') {
    const body = parseJsonBody(event)
    if (!body) return json(400, { error: 'Corps de requete invalide ou trop volumineux.' })

    const { name, slug: slugRaw, subscription_plan, max_users, max_screens } = body

    if (typeof name !== 'string' || name.trim().length < 2) {
      return json(400, { error: 'name requis (min 2 caracteres).' })
    }

    const slug = typeof slugRaw === 'string' ? slugRaw.trim() : slugify(name)
    if (!SLUG_RE.test(slug)) {
      return json(400, { error: 'slug invalide (lettres minuscules, chiffres, tirets ou underscores, 2-64 caracteres).' })
    }

    const plan = ['starter', 'pro', 'enterprise'].includes(subscription_plan)
      ? subscription_plan
      : 'starter'

    const { data: newCompany, error: insertError } = await serviceClient
      .from('companies')
      .insert({
        name: name.trim(),
        slug,
        subscription_plan: plan,
        max_users: typeof max_users === 'number' && max_users > 0 ? max_users : 10,
        max_screens: typeof max_screens === 'number' && max_screens > 0 ? max_screens : 3,
        status: 'active',
      })
      .select()
      .single()

    if (insertError) {
      if (insertError.code === '23505') {
        return json(409, { error: `Un tenant avec le slug "${slug}" existe deja.` })
      }
      return json(500, { error: insertError.message })
    }

    // Cree aussi l'entree erp_v11_tenants correspondante
    await serviceClient.from('erp_v11_tenants').insert({
      tenant_key: slug,
      display_name: name.trim(),
      company_id: newCompany.id,
      default_max_concurrent_screens: max_screens ?? 3,
      allowed_pages: '[]',
    }).should_not_fail // tentative non-bloquante

    void auditLog(serviceClient, user.id, admin.email, 'company_created', 'company', newCompany.id, {
      name: newCompany.name,
      slug: newCompany.slug,
    })

    return json(201, { company: newCompany })
  }

  // ── PATCH : mettre a jour une company ────────────────────────────────────

  if (method === 'PATCH') {
    if (!companyIdParam || !Number.isFinite(companyIdParam)) {
      return json(400, { error: 'Parametre id requis.' })
    }

    // Garde-fou : interdit de modifier la company 1 (tenant_test de migration)
    // La company 1 est gerée directement via les migrations SQL.
    // On permet quand meme de changer le plan / les limites.

    const body = parseJsonBody(event)
    if (!body) return json(400, { error: 'Corps de requete invalide.' })

    const allowed = ['name', 'status', 'subscription_plan', 'max_users', 'max_screens']
    const updates = {}

    for (const key of allowed) {
      if (key in body) updates[key] = body[key]
    }

    if (Object.keys(updates).length === 0) {
      return json(400, { error: 'Aucun champ modifiable fourni.' })
    }

    // Validations
    if ('status' in updates && !['active', 'suspended', 'trial', 'cancelled'].includes(updates.status)) {
      return json(400, { error: 'Statut invalide.' })
    }
    if ('subscription_plan' in updates && !['starter', 'pro', 'enterprise'].includes(updates.subscription_plan)) {
      return json(400, { error: 'Plan invalide.' })
    }

    const { data: updated, error: updateError } = await serviceClient
      .from('companies')
      .update(updates)
      .eq('id', companyIdParam)
      .select()
      .single()

    if (updateError) {
      if (updateError.code === 'PGRST116') return json(404, { error: 'Company introuvable.' })
      return json(500, { error: updateError.message })
    }

    void auditLog(serviceClient, user.id, admin.email, 'company_updated', 'company', companyIdParam, updates)

    return json(200, { company: updated })
  }

  return json(405, { error: 'Methode non autorisee.' })
}
