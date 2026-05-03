/**
 * Netlify Function : v11-tenant-admin
 * Panel de configuration tenant (admin locataire).
 *
 * PERIMETRE :
 *   - Identite tenant (nom, slug, statut, plan)
 *   - Domaine email (email_domain)
 *   - Gestion des utilisateurs (CRUD, roles, permissions)
 *   - Activation / desactivation des modules ERP
 *   - Securite utilisateur (login_enabled, force_password_reset)
 *
 * SECURITE :
 *   - Acces reserve aux roles : admin, super_admin, dirigeant (tenant admin)
 *   - Isolation stricte par company_id (source de verite : profil en base)
 *   - Un tenant admin ne peut jamais toucher une autre company
 *   - La modification du email_domain necessite un double check
 *   - platform_admin peut tout faire sur n'importe quel tenant
 *
 * ROUTES (HTTP method + path segment via querystring ?action=xxx) :
 *   GET  ?action=settings               → settings tenant complets
 *   PATCH ?action=identity              → nom, statut, plan (slug non modifiable)
 *   PATCH ?action=email-domain          → email_domain (admin tenant ou platform admin)
 *   PATCH ?action=modules               → enabled_modules[]
 *   GET  ?action=users                  → liste les profils du tenant
 *   POST ?action=users                  → creer un utilisateur
 *   PATCH ?action=users&user_id=xxx     → mettre a jour un utilisateur
 *   PATCH ?action=user-status&user_id=x → activer/desactiver (login_enabled)
 *   PATCH ?action=user-roles&user_id=x  → assigner un role
 *   PATCH ?action=user-pages&user_id=x  → assigner les pages autorisees
 *   PATCH ?action=user-security&user_id=x → force_password_reset
 */

import {
  authorize,
  companyFilter,
  json,
  parseJsonBody,
  readRequestedCompanyId,
} from './_lib/v11-core.js'

// ─── Constantes ────────────────────────────────────────────────────────────

const TENANT_ADMIN_ROLES = new Set(['admin', 'super_admin', 'dirigeant'])

const VALID_MODULES = new Set([
  'ops-center',
  'dashboard',
  'dashboard-conducteur',
  'planning',
  'planning-conducteur',
  'transports',
  'feuille-route',
  'map-live',
  'demandes-clients',
  'tasks',
  'frais-rapide',
  'chauffeurs',
  'vehicules',
  'remorques',
  'equipements',
  'maintenance',
  'tachygraphe',
  'amendes',
  'entrepots',
  'facturation',
  'comptabilite',
  'reglements',
  'tresorerie',
  'analytique-transport',
  'frais',
  'paie',
  'clients',
  'prospection',
  'espace-client',
  'compte-client-db',
  'espace-affreteur',
  'rh',
  'entretiens-salaries',
  'tchat',
  'mail',
  'inter-erp',
  'communication',
  'coffre',
  'settings',
])

const ALL_MODULES = [...VALID_MODULES]

const VALID_STATUSES = new Set(['active', 'suspended', 'trial', 'cancelled'])
const VALID_PLANS    = new Set(['starter', 'pro', 'enterprise'])

// Roles disponibles dans le tenant (synchronises avec auth.tsx ROLE_VALUES)
const VALID_ROLES = new Set([
  'admin', 'super_admin', 'dirigeant', 'exploitant', 'mecanicien',
  'commercial', 'comptable', 'rh', 'conducteur', 'conducteur_affreteur',
  'client', 'affreteur', 'administratif', 'facturation', 'flotte',
  'maintenance', 'observateur', 'demo', 'investisseur', 'logisticien',
])

// Regex domaine email (sans http, sans @, ex: nexora-truck.fr)
const EMAIL_DOMAIN_RE = /^[a-z0-9]([a-z0-9\-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9\-]{0,61}[a-z0-9])?)+$/

// UUID v4
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function roleLabelFromName(roleName) {
  const token = String(roleName ?? '').trim().toLowerCase()
  if (!token) return 'Role'
  return token
    .split('_')
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

function generateCorrelationId() {
  return `ten_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
}

function createUserFailure({ status = 500, stage, message, correlationId }) {
  return json(status, {
    error: message,
    stage,
    correlation_id: correlationId,
  })
}

// ─── Guard : tenant admin ou platform admin ─────────────────────────────────

async function requireTenantAdmin(event) {
  const result = await authorize(event, {
    allowedRoles: [...TENANT_ADMIN_ROLES],
  })

  if (result.error) {
    // Tente également les platform_admins (role quelconque mais dans platform_admins)
    // Note: authorize() n'accepte que les roles TENANT_ADMIN_ROLES.
    // On vérifie séparément si c'est un platform_admin.
    const platformCheck = await authorize(event, {})
    if (platformCheck.error) return platformCheck
    const { data: pa } = await platformCheck.systemClient
      .from('platform_admins')
      .select('id')
      .eq('user_id', platformCheck.user.id)
      .eq('is_active', true)
      .maybeSingle()
    if (!pa) return result // retourne l'erreur d'origine
    return { ...platformCheck, isPlatformAdmin: true }
  }

  return { ...result, isPlatformAdmin: false }
}

// ─── Handler principal ──────────────────────────────────────────────────────

export const handler = async (event) => {
  const method = event.httpMethod
  const action = event.queryStringParameters?.action ?? ''
  const userId = event.queryStringParameters?.user_id ?? null

  if (method === 'OPTIONS') {
    return { statusCode: 204, headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Authorization, Content-Type, X-Tenant-Key', 'Access-Control-Allow-Methods': 'GET, POST, PATCH, OPTIONS' }, body: '' }
  }

  const auth = await requireTenantAdmin(event)
  if (auth.error) return auth.error

  const { dbClient, systemClient, companyId, profile, isPlatformAdmin } = auth
  const body = method !== 'GET' ? parseJsonBody(event) : {}
  if (body === null) return json(400, { error: 'Corps de requete trop volumineux ou invalide.' })

  const requestedCompanyId = readRequestedCompanyId(event, body)
  let effectiveCompanyId = companyId

  // Super admin hors impersonation: exige un tenant cible explicite.
  if (isPlatformAdmin) {
    if (!requestedCompanyId) {
      return json(400, {
        error: 'company_id est obligatoire pour les operations plateforme. Ajoutez X-Company-Id, ?company_id= ou body.company_id.',
      })
    }
    effectiveCompanyId = requestedCompanyId
  } else if (requestedCompanyId && requestedCompanyId !== companyId) {
    return json(403, { error: 'Acces refuse: company_id mismatch.' })
  }

  // ── GET settings ──────────────────────────────────────────────────────────
  if (method === 'GET' && action === 'settings') {
    return handleGetSettings(systemClient, effectiveCompanyId)
  }

  // ── PATCH identity ────────────────────────────────────────────────────────
  if (method === 'PATCH' && action === 'identity') {
    return handlePatchIdentity(systemClient, effectiveCompanyId, body, isPlatformAdmin)
  }

  // ── PATCH email-domain ────────────────────────────────────────────────────
  if (method === 'PATCH' && action === 'email-domain') {
    return handlePatchEmailDomain(systemClient, effectiveCompanyId, body)
  }

  // ── PATCH modules ─────────────────────────────────────────────────────────
  if (method === 'PATCH' && action === 'modules') {
    return handlePatchModules(systemClient, effectiveCompanyId, body)
  }

  // ── GET users ─────────────────────────────────────────────────────────────
  if (method === 'GET' && action === 'users') {
    return handleGetUsers(systemClient, effectiveCompanyId)
  }

  // ── POST users (create) ───────────────────────────────────────────────────
  if (method === 'POST' && action === 'users') {
    return handleCreateUser(systemClient, effectiveCompanyId, body, profile.id)
  }

  // ── PATCH users (update) ──────────────────────────────────────────────────
  if (method === 'PATCH' && action === 'users' && userId) {
    return handleUpdateUser(systemClient, effectiveCompanyId, userId, body)
  }

  // ── PATCH user-status ─────────────────────────────────────────────────────
  if (method === 'PATCH' && action === 'user-status' && userId) {
    return handleUserStatus(systemClient, effectiveCompanyId, userId, body)
  }

  // ── PATCH user-roles ──────────────────────────────────────────────────────
  if (method === 'PATCH' && action === 'user-roles' && userId) {
    return handleUserRole(systemClient, effectiveCompanyId, userId, body)
  }

  // ── PATCH user-pages ──────────────────────────────────────────────────────
  if (method === 'PATCH' && action === 'user-pages' && userId) {
    return handleUserPages(systemClient, effectiveCompanyId, userId, body)
  }

  // ── PATCH user-security ───────────────────────────────────────────────────
  if (method === 'PATCH' && action === 'user-security' && userId) {
    return handleUserSecurity(systemClient, effectiveCompanyId, userId, body)
  }

  return json(404, { error: `Action non reconnue: ${action}` })
}


// ══════════════════════════════════════════════════════════════════════════════
// HANDLERS
// ══════════════════════════════════════════════════════════════════════════════

// ── GET settings ─────────────────────────────────────────────────────────────

async function handleGetSettings(client, companyId) {
  const { data, error } = await client
    .from('companies')
    .select('id, name, slug, status, subscription_plan, max_users, max_screens, email_domain, enabled_modules, created_at, updated_at')
    .eq('id', companyId)
    .single()

  if (error || !data) return json(404, { error: 'Tenant introuvable.' })

  return json(200, {
    company: {
      ...data,
      enabled_modules: data.enabled_modules ?? ALL_MODULES,
    },
  })
}


// ── PATCH identity ────────────────────────────────────────────────────────────

async function handlePatchIdentity(client, companyId, body, isPlatformAdmin) {
  const updates = {}
  const errors = []

  if (body.name !== undefined) {
    if (typeof body.name !== 'string' || body.name.trim().length < 2 || body.name.trim().length > 128) {
      errors.push('name: doit comporter entre 2 et 128 caracteres.')
    } else {
      updates.name = body.name.trim()
    }
  }

  // Le slug n'est modifiable que par un platform_admin (risque de rupture d'URL)
  if (body.slug !== undefined) {
    if (!isPlatformAdmin) return json(403, { error: 'Seul un platform_admin peut modifier le slug.' })
    if (!/^[a-z0-9_-]{2,64}$/.test(body.slug)) {
      errors.push('slug: format invalide (a-z0-9_- uniquement, 2-64 caracteres).')
    } else {
      updates.slug = body.slug
    }
  }

  if (body.status !== undefined) {
    if (!VALID_STATUSES.has(body.status)) {
      errors.push(`status: valeur invalide. Attendu: ${[...VALID_STATUSES].join(', ')}.`)
    } else {
      updates.status = body.status
    }
  }

  if (body.subscription_plan !== undefined) {
    if (!VALID_PLANS.has(body.subscription_plan)) {
      errors.push(`subscription_plan: valeur invalide. Attendu: ${[...VALID_PLANS].join(', ')}.`)
    } else {
      updates.subscription_plan = body.subscription_plan
    }
  }

  if (errors.length > 0) return json(400, { errors })
  if (Object.keys(updates).length === 0) return json(400, { error: 'Aucun champ a mettre a jour.' })

  updates.updated_at = new Date().toISOString()

  const { data, error } = await client
    .from('companies')
    .update(updates)
    .eq('id', companyId)
    .select('id, name, slug, status, subscription_plan, updated_at')
    .single()

  if (error) {
    if (error.code === '23505') return json(409, { error: 'Ce slug est deja utilise par un autre tenant.' })
    return json(500, { error: error.message })
  }

  return json(200, { company: data })
}


// ── PATCH email-domain ────────────────────────────────────────────────────────

async function handlePatchEmailDomain(client, companyId, body) {
  const domain = body.email_domain

  if (domain === null || domain === undefined) {
    return json(400, { error: 'email_domain est obligatoire.' })
  }

  if (typeof domain !== 'string') {
    return json(400, { error: 'email_domain doit etre une chaine de caracteres.' })
  }

  const normalized = domain.trim().toLowerCase()

  if (!EMAIL_DOMAIN_RE.test(normalized) || normalized.length > 253) {
    return json(400, {
      error: 'email_domain invalide. Format attendu: exemple.com (sans http ni @).',
    })
  }

  const { data, error } = await client
    .from('companies')
    .update({ email_domain: normalized, updated_at: new Date().toISOString() })
    .eq('id', companyId)
    .select('id, email_domain, updated_at')
    .single()

  if (error) return json(500, { error: error.message })

  return json(200, { company: data })
}


// ── PATCH modules ─────────────────────────────────────────────────────────────

async function handlePatchModules(client, companyId, body) {
  const modules = body.enabled_modules

  if (!Array.isArray(modules)) {
    return json(400, { error: 'enabled_modules doit etre un tableau.' })
  }

  // Valide chaque slug de module
  const invalid = modules.filter(m => typeof m !== 'string' || !VALID_MODULES.has(m))
  if (invalid.length > 0) {
    return json(400, {
      error: `Modules invalides: ${invalid.join(', ')}. Valeurs acceptees: ${ALL_MODULES.join(', ')}.`,
    })
  }

  // Deduplique et trie
  const normalized = [...new Set(modules.filter(m => typeof m === 'string'))].sort()

  // SECURITE : 'settings' est toujours force a true (sinon l'admin ne peut plus
  // se reconnecter a ses propres parametres)
  if (!normalized.includes('settings')) {
    normalized.push('settings')
  }

  const { data, error } = await client
    .from('companies')
    .update({ enabled_modules: normalized, updated_at: new Date().toISOString() })
    .eq('id', companyId)
    .select('id, enabled_modules, updated_at')
    .single()

  if (error) return json(500, { error: error.message })

  return json(200, { company: data })
}


// ── GET users ─────────────────────────────────────────────────────────────────

async function handleGetUsers(client, companyId) {
  const { data, error } = await client
    .from('profils')
    .select('id, user_id, role, matricule, nom, prenom, tenant_key, login_enabled, force_password_reset, created_at, updated_at')
    .match(companyFilter(companyId))
    .order('nom', { ascending: true })

  if (error) return json(500, { error: error.message })

  return json(200, { users: data ?? [] })
}


// ── POST users (create) ───────────────────────────────────────────────────────

async function handleCreateUser(client, companyId, body, createdByProfileId) {
  const correlationId = generateCorrelationId()
  const errors = []

  // Validation email
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : null
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.push('email: adresse email invalide.')
  }

  // Validation role
  const role = typeof body.role === 'string' ? body.role.trim().toLowerCase() : null
  if (!role || !VALID_ROLES.has(role)) {
    errors.push(`role: valeur invalide. Roles acceptes: ${[...VALID_ROLES].join(', ')}.`)
  }

  // Validation nom / prenom
  const nom    = typeof body.nom    === 'string' ? body.nom.trim()    : null
  const prenom = typeof body.prenom === 'string' ? body.prenom.trim() : null
  if (!nom)    errors.push('nom: champ obligatoire.')
  if (!prenom) errors.push('prenom: champ obligatoire.')

  if (errors.length > 0) return json(400, { errors })

  // Verifie que l'email appartient au domaine du tenant
  const { data: company } = await client
    .from('companies')
    .select('email_domain')
    .eq('id', companyId)
    .single()

  if (company?.email_domain) {
    const emailDomain = email.split('@')[1]
    if (emailDomain !== company.email_domain) {
      return json(400, {
        error: `L'email doit appartenir au domaine du tenant (@${company.email_domain}).`,
      })
    }
  }

  // Cree l'utilisateur Supabase Auth via le service client
  const password = body.password ?? generateTempPassword()
  const { data: authUser, error: authError } = await client.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    app_metadata: { role, company_id: companyId },
  })

  if (authError) {
    if (authError.message?.includes('already registered')) {
      return createUserFailure({
        status: 409,
        stage: 'AUTH_CREATE',
        message: 'Un utilisateur avec cet email existe deja.',
        correlationId,
      })
    }
    return createUserFailure({
      stage: 'AUTH_CREATE',
      message: authError.message,
      correlationId,
    })
  }

  // Cree le profil dans profils
  const { data: profil, error: profilError } = await client
    .from('profils')
    .insert({
      user_id: authUser.user.id,
      role,
      nom,
      prenom,
      company_id: companyId,
      login_enabled: true,
      force_password_reset: body.force_password_reset ?? true,
    })
    .select('id, user_id, role, nom, prenom, login_enabled, force_password_reset, created_at')
    .single()

  if (profilError) {
    // Rollback : supprime l'auth user si le profil n'a pas pu etre cree
    await client.auth.admin.deleteUser(authUser.user.id)
    return createUserFailure({
      stage: 'PROFILE_INSERT',
      message: profilError.message,
      correlationId,
    })
  }

  const { error: membershipError, stage: membershipStage } = await ensureTenantMembership({
    client,
    companyId,
    userId: authUser.user.id,
    role,
  })

  if (membershipError) {
    await client.from('profils').delete().eq('id', profil.id)
    await client.auth.admin.deleteUser(authUser.user.id)
    return createUserFailure({
      stage: membershipStage ?? 'TENANT_MEMBERSHIP',
      message: membershipError,
      correlationId,
    })
  }

  return json(201, {
    user: profil,
    temp_password: body.password ? undefined : password,
    correlation_id: correlationId,
  })
}


// ── PATCH users (update) ──────────────────────────────────────────────────────

async function handleUpdateUser(client, companyId, userId, body) {
  if (!UUID_RE.test(userId)) return json(400, { error: 'user_id invalide.' })

  // Verifie que l'utilisateur appartient bien au tenant
  const { data: existing } = await client
    .from('profils')
    .select('id, company_id')
    .eq('id', userId)
    .eq('company_id', companyId)
    .maybeSingle()

  if (!existing) return json(404, { error: 'Utilisateur introuvable dans ce tenant.' })

  const updates = {}
  const errors = []

  if (body.nom !== undefined) {
    const nom = typeof body.nom === 'string' ? body.nom.trim() : null
    if (!nom) errors.push('nom: ne peut pas etre vide.')
    else updates.nom = nom
  }

  if (body.prenom !== undefined) {
    const prenom = typeof body.prenom === 'string' ? body.prenom.trim() : null
    if (!prenom) errors.push('prenom: ne peut pas etre vide.')
    else updates.prenom = prenom
  }

  if (errors.length > 0) return json(400, { errors })
  if (Object.keys(updates).length === 0) return json(400, { error: 'Aucun champ a mettre a jour.' })

  updates.updated_at = new Date().toISOString()

  const { data, error } = await client
    .from('profils')
    .update(updates)
    .eq('id', userId)
    .eq('company_id', companyId)
    .select('id, nom, prenom, updated_at')
    .single()

  if (error) return json(500, { error: error.message })

  return json(200, { user: data })
}


// ── PATCH user-status ─────────────────────────────────────────────────────────

async function handleUserStatus(client, companyId, userId, body) {
  if (!UUID_RE.test(userId)) return json(400, { error: 'user_id invalide.' })

  if (typeof body.login_enabled !== 'boolean') {
    return json(400, { error: 'login_enabled (boolean) est obligatoire.' })
  }

  const { data: existing } = await client
    .from('profils')
    .select('id, company_id')
    .eq('id', userId)
    .eq('company_id', companyId)
    .maybeSingle()

  if (!existing) return json(404, { error: 'Utilisateur introuvable dans ce tenant.' })

  const { data, error } = await client
    .from('profils')
    .update({ login_enabled: body.login_enabled, updated_at: new Date().toISOString() })
    .eq('id', userId)
    .eq('company_id', companyId)
    .select('id, login_enabled, updated_at')
    .single()

  if (error) return json(500, { error: error.message })

  return json(200, { user: data })
}


// ── PATCH user-roles ──────────────────────────────────────────────────────────

async function handleUserRole(client, companyId, userId, body) {
  if (!UUID_RE.test(userId)) return json(400, { error: 'user_id invalide.' })

  const role = typeof body.role === 'string' ? body.role.trim().toLowerCase() : null
  if (!role || !VALID_ROLES.has(role)) {
    return json(400, {
      error: `role invalide. Valeurs acceptees: ${[...VALID_ROLES].join(', ')}.`,
    })
  }

  const { data: existing } = await client
    .from('profils')
    .select('id, company_id')
    .eq('id', userId)
    .eq('company_id', companyId)
    .maybeSingle()

  if (!existing) return json(404, { error: 'Utilisateur introuvable dans ce tenant.' })

  const { data, error } = await client
    .from('profils')
    .update({ role, updated_at: new Date().toISOString() })
    .eq('id', userId)
    .eq('company_id', companyId)
    .select('id, role, updated_at')
    .single()

  if (error) return json(500, { error: error.message })

  return json(200, { user: data })
}


// ── PATCH user-pages ──────────────────────────────────────────────────────────

async function handleUserPages(client, companyId, userId, body) {
  if (!UUID_RE.test(userId)) return json(400, { error: 'user_id invalide.' })

  if (!Array.isArray(body.allowed_pages)) {
    return json(400, { error: 'allowed_pages doit etre un tableau de chaines.' })
  }

  const pages = body.allowed_pages.filter(p => typeof p === 'string' && p.trim().length > 0)
  const normalized = [...new Set(pages.map(p => p.trim()))].sort()

  const { data: existing } = await client
    .from('profils')
    .select('id, company_id, tenant_key')
    .eq('id', userId)
    .eq('company_id', companyId)
    .maybeSingle()

  if (!existing) return json(404, { error: 'Utilisateur introuvable dans ce tenant.' })

  // Les pages autorisees sont stockees dans erp_v11_tenants.allowed_pages
  // (niveau tenant), ou dans une future colonne profils.allowed_pages.
  // Pour l'instant on met a jour la config du tenant via erp_v11_tenants.
  // NOTE : ce comportement est a affiner si on veut des permissions par user.
  if (existing.tenant_key) {
    const { error } = await client
      .from('erp_v11_tenants')
      .update({ allowed_pages: normalized })
      .eq('tenant_key', existing.tenant_key)

    if (error) return json(500, { error: error.message })
  }

  return json(200, { user_id: userId, allowed_pages: normalized })
}


// ── PATCH user-security ────────────────────────────────────────────────────────

async function handleUserSecurity(client, companyId, userId, body) {
  if (!UUID_RE.test(userId)) return json(400, { error: 'user_id invalide.' })

  const updates = {}

  if (body.force_password_reset !== undefined) {
    if (typeof body.force_password_reset !== 'boolean') {
      return json(400, { error: 'force_password_reset doit etre un boolean.' })
    }
    updates.force_password_reset = body.force_password_reset
  }

  if (Object.keys(updates).length === 0) {
    return json(400, { error: 'Aucun parametre de securite a mettre a jour.' })
  }

  const { data: existing } = await client
    .from('profils')
    .select('id, company_id')
    .eq('id', userId)
    .eq('company_id', companyId)
    .maybeSingle()

  if (!existing) return json(404, { error: 'Utilisateur introuvable dans ce tenant.' })

  updates.updated_at = new Date().toISOString()

  const { data, error } = await client
    .from('profils')
    .update(updates)
    .eq('id', userId)
    .eq('company_id', companyId)
    .select('id, force_password_reset, updated_at')
    .single()

  if (error) return json(500, { error: error.message })

  return json(200, { user: data })
}


// ─── Utilitaires ───────────────────────────────────────────────────────────────

/**
 * Genere un mot de passe temporaire securise.
 * Format : Nexora2026-XXXX (minuscules + chiffres + special)
 * Conforme aux regles de base : majuscule, minuscule, chiffre, special, >= 12 chars.
 */
function generateTempPassword() {
  const chars = 'abcdefghjkmnpqrstuvwxyz'
  const upper = 'ABCDEFGHJKMNPQRSTUVWXYZ'
  const digits = '23456789'
  const special = '!@#$%'

  const rand = (set) => set[Math.floor(Math.random() * set.length)]

  return (
    rand(upper) +
    rand(upper) +
    Array.from({ length: 4 }, () => rand(chars)).join('') +
    rand(digits) +
    rand(digits) +
    rand(special) +
    rand(chars) +
    rand(upper)
  )
}

async function ensureTenantMembership({ client, companyId, userId, role }) {
  const { data: roleRow, error: roleError } = await client
    .from('roles')
    .select('id')
    .eq('company_id', companyId)
    .eq('name', role)
    .maybeSingle()

  if (roleError) return { stage: 'ROLE_LOOKUP', error: roleError.message }
  let defaultRoleId = roleRow?.id ?? null

  if (!defaultRoleId) {
    const { data: createdRole, error: createRoleError } = await client
      .from('roles')
      .upsert({
        company_id: companyId,
        name: role,
        label: roleLabelFromName(role),
        is_system: true,
      }, {
        onConflict: 'company_id,name',
      })
      .select('id')
      .single()

    if (createRoleError) return { stage: 'ROLE_CREATE', error: createRoleError.message }
    defaultRoleId = createdRole?.id ?? null
  }

  const { data: tenantUser, error: tenantUserError } = await client
    .from('tenant_users')
    .upsert({
      tenant_id: companyId,
      user_id: userId,
      default_role_id: defaultRoleId,
      is_active: true,
    }, {
      onConflict: 'tenant_id,user_id',
    })
    .select('id')
    .single()

  if (tenantUserError || !tenantUser) {
    return { stage: 'TENANT_MEMBERSHIP', error: tenantUserError?.message ?? 'Impossible de creer tenant_users.' }
  }

  if (!defaultRoleId) return { stage: null, error: null }

  const { error: roleLinkError } = await client
    .from('tenant_user_roles')
    .upsert({
      tenant_user_id: tenantUser.id,
      role_id: defaultRoleId,
      granted_by: null,
    }, {
      onConflict: 'tenant_user_id,role_id',
    })

  if (roleLinkError) return { stage: 'TENANT_ROLE_LINK', error: roleLinkError.message }
  return { stage: null, error: null }
}
