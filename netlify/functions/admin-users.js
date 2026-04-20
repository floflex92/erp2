import { createClient } from '@supabase/supabase-js'
import { createHash, randomBytes } from 'node:crypto'

const ROLE_VALUES = ['admin', 'dirigeant', 'exploitant', 'mecanicien', 'commercial', 'comptable', 'rh', 'conducteur', 'conducteur_affreteur', 'client', 'affreteur', 'administratif', 'facturation', 'flotte', 'maintenance', 'observateur', 'demo', 'investisseur', 'super_admin', 'logisticien']
const ROLE_SET = new Set(ROLE_VALUES)
const ADMIN_ROLES = new Set(['admin', 'super_admin', 'dirigeant'])
const DRIVER_ROLES = new Set(['conducteur', 'conducteur_affreteur'])
const DEFAULT_ROLE = 'dirigeant'
const ACCOUNT_TYPES = new Set(['standard', 'test', 'prospect', 'investisseur', 'demo'])
const ACCOUNT_STATUSES = new Set(['actif', 'suspendu', 'archive', 'desactive'])
const REQUEST_STATUSES = new Set(['nouveau', 'contacte', 'qualifie', 'compte_cree', 'refuse', 'archive'])
const LEAD_STATUSES = new Set(['nouveau', 'contacte', 'qualifie', 'compte_cree', 'refuse'])
const ROLE_ALIASES = {
  administrateur: 'admin',
  administrator: 'admin',
  direction: 'dirigeant',
  exploitation: 'exploitant',
  atelier: 'mecanicien',
  mecanicienne: 'mecanicien',
  mecaniciene: 'mecanicien',
  resources_humaines: 'rh',
  ressources_humaines: 'rh',
  chauffeur: 'conducteur',
  driver: 'conducteur',
  conducteuraffreteur: 'conducteur_affreteur',
  driver_affreteur: 'conducteur_affreteur',
  subcontractor_driver: 'conducteur_affreteur',
  customer: 'client',
  subcontractor: 'affreteur',
  affretement: 'affreteur',
}
const RESERVED_ADMIN_EMAIL_ROLE = {
  'admin@erp-demo.fr': 'admin',
  'contact@nexora-truck.fr': 'admin',
  'direction@erp-demo.fr': 'dirigeant',
}

function isEmailRoleFallbackEnabled() {
  const envFlag = String(process.env.ALLOW_EMAIL_ROLE_FALLBACK ?? '').trim().toLowerCase()
  return envFlag === 'true' && process.env.NODE_ENV !== 'production'
}

function json(statusCode, body) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  }
}

function getSupabaseEnv() {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
  const anonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || null

  if (!url || !anonKey) {
    return null
  }

  return { url, anonKey, serviceRoleKey }
}

function createServerClient(url, key, accessToken) {
  return createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
    global: accessToken ? {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    } : undefined,
  })
}

function normalizeRoleToken(value) {
  return String(value)
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[\s-]+/g, '_')
}

function normalizeRole(value) {
  if (typeof value !== 'string') return null
  const token = normalizeRoleToken(value)
  if (ROLE_SET.has(token)) return token
  const aliased = ROLE_ALIASES[token]
  if (aliased) return aliased
  return /^[a-z0-9_]{2,64}$/.test(token) ? token : null
}

function sanitizeAccountType(value, fallback = 'standard') {
  const token = normalizeRoleToken(value ?? '')
  return ACCOUNT_TYPES.has(token) ? token : fallback
}

function sanitizeAccountStatus(value, fallback = 'actif') {
  const token = normalizeRoleToken(value ?? '')
  return ACCOUNT_STATUSES.has(token) ? token : fallback
}

function sanitizeRequestStatus(value, fallback = 'nouveau') {
  const token = normalizeRoleToken(value ?? '')
  return REQUEST_STATUSES.has(token) ? token : fallback
}

function sanitizeLeadStatus(value, fallback = 'nouveau') {
  const token = normalizeRoleToken(value ?? '')
  return LEAD_STATUSES.has(token) ? token : fallback
}

function sanitizePermissions(value) {
  if (!Array.isArray(value)) return []
  return value
    .filter(item => typeof item === 'string')
    .map(item => normalizeRoleToken(item))
    .filter(item => item.length >= 2 && item.length <= 64)
}

function buildStrongTemporaryPassword() {
  const token = randomBytes(18).toString('base64url')
  return `Nx!${token}A9`
}

function sanitizeQueryPage(value, fallback = 1) {
  const n = Number(value)
  if (!Number.isFinite(n)) return fallback
  const asInt = Math.trunc(n)
  if (asInt < 1) return 1
  return asInt
}

function sanitizeQueryPageSize(value, fallback = 20) {
  const n = Number(value)
  if (!Number.isFinite(n)) return fallback
  const asInt = Math.trunc(n)
  if (asInt < 5) return 5
  if (asInt > 100) return 100
  return asInt
}

function sanitizeSortBy(value) {
  const token = normalizeRoleToken(value ?? 'created_at')
  if (token === 'nom') return 'nom'
  if (token === 'role') return 'role'
  if (token === 'account_status') return 'account_status'
  if (token === 'last_sign_in_at') return 'last_sign_in_at'
  return 'created_at'
}

function sanitizeSortOrder(value) {
  const token = normalizeRoleToken(value ?? 'desc')
  return token === 'asc' ? 'asc' : 'desc'
}

function sanitizeAuditDays(value, fallback = 90) {
  const n = Number(value)
  if (!Number.isFinite(n)) return fallback
  const asInt = Math.trunc(n)
  if (asInt < 1) return 1
  if (asInt > 365) return 365
  return asInt
}

function sanitizeAuditPageSize(value, fallback = 25) {
  const n = Number(value)
  if (!Number.isFinite(n)) return fallback
  const asInt = Math.trunc(n)
  if (asInt < 5) return 5
  if (asInt > 100) return 100
  return asInt
}

function computeAuditCutoffIso(days) {
  const windowDays = sanitizeAuditDays(days, 90)
  return new Date(Date.now() - (windowDays * 24 * 60 * 60 * 1000)).toISOString()
}

function sortUsersByLastSignIn(users, orderAsc) {
  return users
    .slice()
    .sort((left, right) => {
      const leftTs = left.last_sign_in_at ? Date.parse(left.last_sign_in_at) : -1
      const rightTs = right.last_sign_in_at ? Date.parse(right.last_sign_in_at) : -1
      return orderAsc ? leftTs - rightTs : rightTs - leftTs
    })
}

function paginateCollection(items, page, pageSize) {
  const from = (page - 1) * pageSize
  const to = from + pageSize
  return items.slice(from, to)
}

function validateBulkSafety({ targets, allProfiles, currentUserId, bulkAction }) {
  if (targets.some(target => target.user_id === currentUserId) && bulkAction !== 'enable') {
    return 'Bulk action refused: cannot disable/suspend/archive your own account.'
  }

  if (bulkAction === 'disable' || bulkAction === 'suspend' || bulkAction === 'archive') {
    const targetedSet = new Set(targets.map(target => target.id))
    const remainingActivePrivileged = (allProfiles ?? []).reduce((count, profile) => {
      const profileRole = normalizeRole(profile.role)
      const isPrivileged = Boolean(profileRole && ADMIN_ROLES.has(profileRole))
      if (!isPrivileged) return count
      if (targetedSet.has(profile.id)) return count
      return profile.account_status === 'actif' ? count + 1 : count
    }, 0)

    if (remainingActivePrivileged <= 0) {
      return 'Au moins un compte admin/dirigeant actif doit rester disponible.'
    }
  }

  return null
}

function parseIds(value) {
  if (!Array.isArray(value)) return []
  return Array.from(new Set(
    value
      .filter(item => typeof item === 'string')
      .map(item => item.trim())
      .filter(Boolean),
  ))
}

function hashIp(value) {
  if (!value) return null
  return createHash('sha256').update(value).digest('hex')
}

function extractClientIp(event) {
  const raw = event.headers['x-forwarded-for'] || event.headers['X-Forwarded-For'] || null
  if (typeof raw !== 'string' || raw.trim().length === 0) return null
  const firstIp = raw.split(',')[0]?.trim() || null
  return firstIp || null
}

async function logPlatformAuditEvent(dbClient, {
  currentUser,
  eventType,
  targetType,
  targetId,
  payload,
  ipHash,
}) {
  if (!currentUser?.id || !eventType) return
  try {
    await dbClient.from('platform_audit_events').insert({
      admin_user_id: currentUser.id,
      admin_email: currentUser.email ?? 'unknown',
      event_type: eventType,
      target_type: targetType ?? null,
      target_id: targetId ?? null,
      payload: payload ?? null,
      ip_hash: ipHash ?? null,
    })
  } catch {
    // Non bloquant: l'audit ne doit pas casser le flux metier.
  }
}

function normalizeEmail(value) {
  if (typeof value !== 'string') return null
  const normalized = value.trim().toLowerCase()
  if (!normalized) return null
  if (!/^\S+@\S+\.\S+$/.test(normalized)) return null
  return normalized
}

function splitNotesAdmin(rawValue) {
  if (typeof rawValue !== 'string' || rawValue.trim().length === 0) {
    return { externalEmail: null, noteText: null }
  }

  const raw = rawValue.trim()
  const markerMatch = raw.match(/^\[external_email\]\s+([^\n\r]+)(?:[\r\n]+([\s\S]*))?$/i)
  if (markerMatch) {
    const externalEmail = normalizeEmail(markerMatch[1])
    const noteText = markerMatch[2]?.trim() || null
    return { externalEmail, noteText }
  }

  return { externalEmail: null, noteText: raw }
}

function composeNotesAdmin({
  previousRaw,
  nextNoteText,
  nextExternalEmail,
}) {
  const parsed = splitNotesAdmin(previousRaw)
  const noteText = nextNoteText === undefined ? parsed.noteText : (nextNoteText?.trim() || null)
  const externalEmail = nextExternalEmail === undefined ? parsed.externalEmail : normalizeEmail(nextExternalEmail)

  if (externalEmail && noteText) return `[external_email] ${externalEmail}\n${noteText}`
  if (externalEmail) return `[external_email] ${externalEmail}`
  return noteText
}

function sanitizeMaxConcurrentScreens(value, fallback = 1) {
  if (value === null || value === undefined || value === '') return fallback
  const n = Number(value)
  if (!Number.isFinite(n)) return fallback
  const asInt = Math.trunc(n)
  if (asInt < 1) return 1
  if (asInt > 12) return 12
  return asInt
}

function generateUserMatricule(profileId) {
  const token = String(profileId ?? '').replace(/[^a-z0-9]/gi, '').slice(0, 8).toUpperCase()
  return `USR-${token || 'UNKNOWN'}`
}

function roleLabelFromName(roleName) {
  const token = String(roleName ?? '').trim().toLowerCase()
  if (!token) return 'Role'
  return token
    .split('_')
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

async function isPlatformAdminUser(dbClient, userId) {
  if (!userId) return false
  const { data, error } = await dbClient
    .from('platform_admins')
    .select('id')
    .eq('user_id', userId)
    .eq('is_active', true)
    .maybeSingle()
  if (error) return false
  return Boolean(data)
}

async function resolveTenantContext(dbClient, companyId) {
  const { data: companyRow, error: companyError } = await dbClient
    .from('companies')
    .select('id, slug')
    .eq('id', companyId)
    .maybeSingle()

  if (companyError || !companyRow) {
    return { error: 'Tenant cible introuvable.' }
  }

  const { data: tenantRow } = await dbClient
    .from('erp_v11_tenants')
    .select('tenant_key')
    .eq('company_id', companyId)
    .maybeSingle()

  const tenantKey = tenantRow?.tenant_key ?? companyRow.slug ?? `tenant_${companyId}`
  return { error: null, tenantKey }
}

function buildDisplayName(prenom, nom, fallback = 'Utilisateur') {
  const full = `${String(prenom ?? '').trim()} ${String(nom ?? '').trim()}`.trim()
  return full || fallback
}

async function ensureDefaultServiceId(dbClient, companyId) {
  const { data: existingService, error: existingServiceError } = await dbClient
    .from('services')
    .select('id')
    .eq('company_id', companyId)
    .is('archived_at', null)
    .order('is_active', { ascending: false })
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle()

  if (existingServiceError) return { id: null, error: existingServiceError.message }
  if (existingService?.id) return { id: existingService.id, error: null }

  const { data: createdService, error: createdServiceError } = await dbClient
    .from('services')
    .insert({
      company_id: companyId,
      name: 'Service principal',
      code: 'principal',
      color: '#2563EB',
      visual_marker: 'A',
      is_active: true,
      archived_at: null,
    })
    .select('id')
    .single()

  if (!createdServiceError && createdService?.id) {
    return { id: createdService.id, error: null }
  }

  const { data: fallbackService, error: fallbackServiceError } = await dbClient
    .from('services')
    .select('id, archived_at, is_active')
    .eq('company_id', companyId)
    .eq('code', 'principal')
    .maybeSingle()

  if (fallbackServiceError || !fallbackService?.id) {
    return { id: null, error: createdServiceError?.message ?? fallbackServiceError?.message ?? 'Service principal introuvable.' }
  }

  if (fallbackService.archived_at || !fallbackService.is_active) {
    const { error: reviveError } = await dbClient
      .from('services')
      .update({
        archived_at: null,
        is_active: true,
      })
      .eq('id', fallbackService.id)
    if (reviveError) return { id: null, error: reviveError.message }
  }

  return { id: fallbackService.id, error: null }
}

async function syncLegacyRoleRecords({
  dbClient,
  companyId,
  profilId,
  role,
  nom,
  prenom,
  email,
  matricule,
}) {
  const warnings = []
  const normalizedRole = normalizeRole(role)
  if (!normalizedRole) return { warnings }

  const safeNom = String(nom ?? '').trim() || 'Utilisateur'
  const safePrenom = String(prenom ?? '').trim() || safeNom

  if (DRIVER_ROLES.has(normalizedRole)) {
    let conducteurId = null

    if (email) {
      const { data: byEmail, error: byEmailError } = await dbClient
        .from('conducteurs')
        .select('id')
        .eq('company_id', companyId)
        .eq('email', email)
        .maybeSingle()
      if (byEmailError) warnings.push(`conducteurs(email): ${byEmailError.message}`)
      conducteurId = byEmail?.id ?? conducteurId
    }

    if (!conducteurId && matricule) {
      const { data: byMatricule, error: byMatriculeError } = await dbClient
        .from('conducteurs')
        .select('id')
        .eq('company_id', companyId)
        .eq('matricule', matricule)
        .maybeSingle()
      if (byMatriculeError) warnings.push(`conducteurs(matricule): ${byMatriculeError.message}`)
      conducteurId = byMatricule?.id ?? conducteurId
    }

    if (!conducteurId) {
      const { data: byName, error: byNameError } = await dbClient
        .from('conducteurs')
        .select('id')
        .eq('company_id', companyId)
        .eq('nom', safeNom)
        .eq('prenom', safePrenom)
        .limit(1)
        .maybeSingle()
      if (byNameError) warnings.push(`conducteurs(nom/prenom): ${byNameError.message}`)
      conducteurId = byName?.id ?? conducteurId
    }

    const conducteurPayload = {
      company_id: companyId,
      nom: safeNom,
      prenom: safePrenom,
      email: email ?? null,
      matricule: matricule ?? null,
      statut: 'actif',
    }

    if (conducteurId) {
      const { error: updateConducteurError } = await dbClient
        .from('conducteurs')
        .update(conducteurPayload)
        .eq('id', conducteurId)
      if (updateConducteurError) warnings.push(`conducteurs(update): ${updateConducteurError.message}`)
    } else {
      const { error: insertConducteurError } = await dbClient
        .from('conducteurs')
        .insert(conducteurPayload)
      if (insertConducteurError) warnings.push(`conducteurs(insert): ${insertConducteurError.message}`)
    }
  }

  if (normalizedRole === 'exploitant') {
    const serviceContext = await ensureDefaultServiceId(dbClient, companyId)
    if (serviceContext.error || !serviceContext.id) {
      warnings.push(`services(default): ${serviceContext.error ?? 'indisponible'}`)
      return { warnings }
    }

    const displayName = buildDisplayName(safePrenom, safeNom, `Exploitant ${String(profilId).slice(0, 8)}`)
    const { data: existingExploitant, error: existingExploitantError } = await dbClient
      .from('exploitants')
      .select('id')
      .eq('company_id', companyId)
      .eq('profil_id', profilId)
      .maybeSingle()

    if (existingExploitantError) {
      warnings.push(`exploitants(select): ${existingExploitantError.message}`)
      return { warnings }
    }

    let exploitantId = existingExploitant?.id ?? null
    const exploitantPayload = {
      company_id: companyId,
      service_id: serviceContext.id,
      profil_id: profilId,
      name: displayName,
      type_exploitant: 'individual',
      is_active: true,
      archived_at: null,
    }

    if (exploitantId) {
      const { error: updateExploitantError } = await dbClient
        .from('exploitants')
        .update(exploitantPayload)
        .eq('id', exploitantId)
      if (updateExploitantError) warnings.push(`exploitants(update): ${updateExploitantError.message}`)
    } else {
      const { data: insertedExploitant, error: insertExploitantError } = await dbClient
        .from('exploitants')
        .insert(exploitantPayload)
        .select('id')
        .single()

      if (insertExploitantError) {
        const fallbackName = `${displayName} (${String(profilId).slice(0, 8)})`
        const { data: insertedWithFallback, error: fallbackExploitantError } = await dbClient
          .from('exploitants')
          .insert({
            ...exploitantPayload,
            name: fallbackName,
          })
          .select('id')
          .single()

        if (fallbackExploitantError) {
          warnings.push(`exploitants(insert): ${fallbackExploitantError.message}`)
        } else {
          exploitantId = insertedWithFallback?.id ?? null
        }
      } else {
        exploitantId = insertedExploitant?.id ?? null
      }
    }

    if (exploitantId) {
      const { error: profileLinkError } = await dbClient
        .from('profils')
        .update({
          exploitant_id: exploitantId,
          service_id: serviceContext.id,
        })
        .eq('id', profilId)
      if (profileLinkError) warnings.push(`profils(exploitant_link): ${profileLinkError.message}`)
    }
  }

  return { warnings }
}

function fallbackRoleFromEmail(email) {
  if (!isEmailRoleFallbackEnabled()) return null
  if (typeof email !== 'string') return null
  const normalized = email.trim().toLowerCase()
  const role = (
    RESERVED_ADMIN_EMAIL_ROLE[normalized]
    ?? ((normalized.split('@')[0] ?? '') === 'admin' ? 'admin' : null)
    ?? (((normalized.split('@')[0] ?? '') === 'direction' || (normalized.split('@')[0] ?? '') === 'dirigeant') ? 'dirigeant' : null)
  )
  return role && ADMIN_ROLES.has(role) ? role : null
}

async function authorize(event) {
  const authHeader = event.headers.authorization || event.headers.Authorization
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null
  const env = getSupabaseEnv()

  if (!env) {
    return { error: json(500, { error: 'Missing Supabase environment variables.' }) }
  }

  if (!token) {
    return { error: json(401, { error: 'Missing bearer token.' }) }
  }

  const sessionClient = createServerClient(env.url, env.anonKey, token)
  const publicClient = createServerClient(env.url, env.anonKey)
  const admin = env.serviceRoleKey ? createServerClient(env.url, env.serviceRoleKey) : null
  const authClient = admin ?? sessionClient

  const { data, error } = await authClient.auth.getUser(token)
  if (error || !data.user) {
    return { error: json(401, { error: 'Invalid session token.' }) }
  }

  const profileClient = admin ?? sessionClient
  const { data: profile, error: profileError } = await profileClient
    .from('profils')
    .select('id, user_id, role, matricule, company_id, tenant_key')
    .eq('user_id', data.user.id)
    .maybeSingle()

  if (profileError) {
    return { error: json(500, { error: profileError.message }) }
  }

  const normalizedRole = normalizeRole(profile?.role)
  const metadataRole = normalizeRole(data.user?.app_metadata?.role ?? data.user?.user_metadata?.role ?? null)
  const metadataPrivilegedRole = metadataRole && ADMIN_ROLES.has(metadataRole) ? metadataRole : null
  const emailPrivilegedRole = fallbackRoleFromEmail(data.user?.email)
  const effectiveRole = (
    normalizedRole && ADMIN_ROLES.has(normalizedRole)
      ? normalizedRole
      : (emailPrivilegedRole ?? metadataPrivilegedRole)
  )

  if (!profile || !effectiveRole) {
    return { error: json(403, { error: 'Forbidden: insufficient role.' }) }
  }

  if (profile.role !== effectiveRole) {
    const writer = admin ?? sessionClient
    await writer.from('profils').update({ role: effectiveRole }).eq('id', profile.id)
  }

  return {
    env,
    admin,
    sessionClient,
    publicClient,
    currentUser: data.user,
    currentProfile: { ...profile, role: effectiveRole },
  }
}

async function listAdminUsers({ admin, sessionClient }, options = {}) {
  const dbClient = admin ?? sessionClient
  const search = typeof options.search === 'string' ? options.search.trim() : ''
  const filterRole = typeof options.filterRole === 'string' ? normalizeRole(options.filterRole) : null
  const filterStatus = typeof options.filterStatus === 'string' ? sanitizeAccountStatus(options.filterStatus, 'all') : 'all'
  const page = sanitizeQueryPage(options.page, 1)
  const pageSize = sanitizeQueryPageSize(options.pageSize, 20)
  const sortBy = sanitizeSortBy(options.sortBy)
  const sortOrder = sanitizeSortOrder(options.sortOrder)
  const auditSearch = typeof options.auditSearch === 'string' ? options.auditSearch.trim() : ''
  const auditDays = sanitizeAuditDays(options.auditDays, 90)
  const auditPage = sanitizeQueryPage(options.auditPage, 1)
  const auditPageSize = sanitizeAuditPageSize(options.auditPageSize, 25)
  const auditFrom = (auditPage - 1) * auditPageSize
  const auditTo = auditFrom + auditPageSize - 1
  const auditCutoffIso = computeAuditCutoffIso(auditDays)

  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  const baseSelect = 'id, user_id, role, matricule, company_id, tenant_key, account_status, account_type, account_origin, is_demo_account, is_investor_account, requested_from_public_form, demo_expires_at, notes_admin, permissions, max_concurrent_screens, nom, prenom, created_at, updated_at'

  const applyProfileFilters = (query) => {
    let next = query
    if (filterRole && filterRole !== 'all') next = next.eq('role', filterRole)
    if (filterStatus && filterStatus !== 'all') next = next.eq('account_status', filterStatus)
    if (search) {
      const escaped = search.replace(/,/g, ' ')
      next = next.or(`nom.ilike.%${escaped}%,prenom.ilike.%${escaped}%`)
    }
    return next
  }

  const orderAsc = sortOrder === 'asc'
  const orderColumn = sortBy === 'nom' ? 'nom' : sortBy
  const buildProfileQuery = () => {
    if (sortBy === 'last_sign_in_at') {
      return applyProfileFilters(
        dbClient
          .from('profils')
          .select(baseSelect, { count: 'exact' })
      )
    }

    return applyProfileFilters(
      dbClient
        .from('profils')
        .select(baseSelect, { count: 'exact' })
        .order(orderColumn, { ascending: orderAsc, nullsFirst: false })
        .range(from, to)
    )
  }

  if (admin) {
    const buildAuditQuery = () => {
      let query = dbClient
        .from('platform_audit_events')
        .select('id, created_at, admin_email, event_type, target_type, target_id, ip_hash, payload', { count: 'exact' })
        .gte('created_at', auditCutoffIso)
        .order('created_at', { ascending: false })
        .range(auditFrom, auditTo)

      if (auditSearch) {
        const escaped = auditSearch.replace(/,/g, ' ')
        query = query.or(`admin_email.ilike.%${escaped}%,event_type.ilike.%${escaped}%,target_id.ilike.%${escaped}%`)
      }

      return query
    }

    const [{ data: profileData, error: profileError, count: profileCount }, { data: authData, error: authError }, { data: requestData, error: requestError }, { data: roleLogData, error: roleLogError }, { data: permissionsCatalog, error: permissionsError }, { data: auditData, error: auditError, count: auditCount }] = await Promise.all([
      buildProfileQuery(),
      admin.auth.admin.listUsers({ page: 1, perPage: 1000 }),
      dbClient.from('project_access_requests').select('*').order('created_at', { ascending: false }).limit(500),
      dbClient.from('user_role_change_log').select('*').order('changed_at', { ascending: false }).limit(500),
      dbClient.from('permissions').select('name,label,resource,action').order('resource', { ascending: true }).order('action', { ascending: true }),
      buildAuditQuery(),
    ])

    if (profileError) return { error: profileError.message }
    if (authError) return { error: authError.message }
    if (requestError) return { error: requestError.message }
    if (roleLogError) return { error: roleLogError.message }
    if (permissionsError) return { error: permissionsError.message }
    if (auditError) return { error: auditError.message }

    const authById = new Map((authData?.users ?? []).map(user => [user.id, user]))
    const requestByProfileId = new Map((requestData ?? []).filter(row => typeof row.linked_profile_id === 'string').map(row => [row.linked_profile_id, row]))
    const companyIds = Array.from(new Set((profileData ?? []).map(profile => Number(profile.company_id)).filter(companyId => Number.isFinite(companyId) && companyId > 0)))
    let companyNameById = new Map()
    if (companyIds.length > 0) {
      const { data: companiesData } = await dbClient
        .from('companies')
        .select('id,name')
        .in('id', companyIds)
      companyNameById = new Map((companiesData ?? []).map(row => [row.id, row.name]))
    }

    const users = (profileData ?? []).map(profile => {
      const authUser = authById.get(profile.user_id)
      const parsedNotes = splitNotesAdmin(profile.notes_admin)
      const linkedRequest = requestByProfileId.get(profile.id)

      return {
        ...profile,
        role: normalizeRole(profile.role) ?? profile.role,
        notes_admin: parsedNotes.noteText,
        external_email: parsedNotes.externalEmail,
        email: authUser?.email ?? null,
        email_confirmed_at: authUser?.email_confirmed_at ?? null,
        last_sign_in_at: authUser?.last_sign_in_at ?? null,
        company_name: companyNameById.get(profile.company_id) ?? null,
        phone: linkedRequest?.phone ?? null,
      }
    })

    const sortedUsers = sortBy === 'last_sign_in_at'
      ? sortUsersByLastSignIn(users, orderAsc)
      : users

    const paginatedUsers = sortBy === 'last_sign_in_at'
      ? paginateCollection(sortedUsers, page, pageSize)
      : sortedUsers

    const totalCount = profileCount ?? users.length

    return {
      users: paginatedUsers,
      requests: requestData ?? [],
      role_changes: roleLogData ?? [],
      audit_events: auditData ?? [],
      audit_pagination: {
        page: auditPage,
        page_size: auditPageSize,
        total: auditCount ?? (auditData ?? []).length,
        days: auditDays,
        search: auditSearch,
      },
      permissions_catalog: permissionsCatalog ?? [],
      pagination: {
        page,
        page_size: pageSize,
        total: totalCount,
      },
    }
  }

  const [{ data, error, count: profileCount }, { data: requestData, error: requestError }, { data: roleLogData, error: roleLogError }, { data: permissionsCatalog, error: permissionsError }] = await Promise.all([
    buildProfileQuery(),
    dbClient.from('project_access_requests').select('*').order('created_at', { ascending: false }).limit(500),
    dbClient.from('user_role_change_log').select('*').order('changed_at', { ascending: false }).limit(500),
    dbClient.from('permissions').select('name,label,resource,action').order('resource', { ascending: true }).order('action', { ascending: true }),
  ])

  if (error) return { error: error.message }
  if (requestError) return { error: requestError.message }
  if (roleLogError) return { error: roleLogError.message }
  if (permissionsError) return { error: permissionsError.message }

  const requestByProfileId = new Map((requestData ?? []).filter(row => typeof row.linked_profile_id === 'string').map(row => [row.linked_profile_id, row]))
  const companyIds = Array.from(new Set((data ?? []).map(profile => Number(profile.company_id)).filter(companyId => Number.isFinite(companyId) && companyId > 0)))
  let companyNameById = new Map()
  if (companyIds.length > 0) {
    const { data: companiesData } = await dbClient
      .from('companies')
      .select('id,name')
      .in('id', companyIds)
    companyNameById = new Map((companiesData ?? []).map(row => [row.id, row.name]))
  }

  const users = (data ?? []).map(profile => {
    const parsedNotes = splitNotesAdmin(profile.notes_admin)
    const linkedRequest = requestByProfileId.get(profile.id)
    return {
      ...profile,
      role: normalizeRole(profile.role) ?? profile.role,
      notes_admin: parsedNotes.noteText,
      external_email: parsedNotes.externalEmail,
      email: null,
      email_confirmed_at: null,
      last_sign_in_at: null,
      company_name: companyNameById.get(profile.company_id) ?? null,
      phone: linkedRequest?.phone ?? null,
    }
  })

  return {
    users,
    requests: requestData ?? [],
    role_changes: roleLogData ?? [],
    audit_events: [],
    audit_pagination: {
      page: 1,
      page_size: 25,
      total: 0,
      days: 90,
      search: '',
    },
    permissions_catalog: permissionsCatalog ?? [],
    pagination: {
      page,
      page_size: pageSize,
      total: profileCount ?? users.length,
    },
  }
}

async function createAdminUser(clients, rawBody) {
  const body = typeof rawBody === 'string' && rawBody.length > 0 ? JSON.parse(rawBody) : {}
  const requestedExternalEmail = normalizeEmail(body.external_email)
  const email = normalizeEmail(body.email) ?? requestedExternalEmail ?? ''
  const generatedPassword = buildStrongTemporaryPassword()
  const password = typeof body.password === 'string' ? body.password : ''
  const role = normalizeRole(body.role) ?? DEFAULT_ROLE
  const nom = typeof body.nom === 'string' ? body.nom.trim() : ''
  const prenom = typeof body.prenom === 'string' ? body.prenom.trim() : ''
  const accountType = sanitizeAccountType(body.account_type ?? body.accountType, 'test')
  const accountStatus = sanitizeAccountStatus(body.account_status ?? body.accountStatus, 'actif')
  const isDemoAccount = body.is_demo_account === true || body.isDemoAccount === true || accountType === 'demo' || accountType === 'test'
  const isInvestorAccount = body.is_investor_account === true || body.isInvestorAccount === true || accountType === 'investisseur'
  const accountOrigin = typeof body.account_origin === 'string' ? normalizeRoleToken(body.account_origin) : 'manuel_admin'
  const requestedFromPublicForm = body.requested_from_public_form === true || body.requestedFromPublicForm === true
  const demoExpiresAt = typeof body.demo_expires_at === 'string' && body.demo_expires_at ? body.demo_expires_at : null
  const rawNotesAdmin = typeof body.notes_admin === 'string' ? body.notes_admin.trim() : null
  const notesAdmin = composeNotesAdmin({
    previousRaw: null,
    nextNoteText: rawNotesAdmin,
    nextExternalEmail: requestedExternalEmail,
  })
  const requestId = typeof body.request_id === 'string' ? body.request_id : null
  const permissions = sanitizePermissions(body.permissions)
  const maxConcurrentScreens = sanitizeMaxConcurrentScreens(body.max_concurrent_screens ?? body.maxConcurrentScreens, 1)

  if (!email) return json(400, { error: 'Email is required.' })
  const mustGeneratePassword = requestedFromPublicForm || Boolean(requestId)
  const effectivePassword = mustGeneratePassword ? generatedPassword : password
  if (!effectivePassword || effectivePassword.length < 8) return json(400, { error: 'Password must be at least 8 characters.' })
  if (!role) return json(400, { error: 'Invalid role.' })

  let createdUser = null

  if (clients.admin) {
    const { data, error } = await clients.admin.auth.admin.createUser({
      email,
      password: effectivePassword,
      email_confirm: true,
      app_metadata: {
        role,
      },
      user_metadata: {
        nom: nom || null,
        prenom: prenom || null,
        account_type: accountType,
        account_origin: accountOrigin,
      },
    })

    if (error || !data.user) {
      return json(400, { error: error?.message ?? 'Unable to create user.' })
    }

    createdUser = data.user
  } else {
    const { data, error } = await clients.publicClient.auth.signUp({
      email,
      password: effectivePassword,
      options: {
        data: {
          nom: nom || null,
          prenom: prenom || null,
          role,
          account_type: accountType,
          account_origin: accountOrigin,
        },
      },
    })

    if (error || !data.user) {
      return json(400, { error: error?.message ?? 'Unable to create user.' })
    }

    createdUser = data.user
  }

  const dbClient = clients.admin ?? clients.sessionClient
  const currentCompanyId = Number(clients.currentProfile?.company_id ?? 1)
  const requestedCompanyId = Number(body.company_id ?? body.target_company_id)
  const hasRequestedCompany = Number.isFinite(requestedCompanyId) && requestedCompanyId > 0
  const isPlatformAdmin = await isPlatformAdminUser(dbClient, clients.currentUser?.id)

  let companyId = currentCompanyId
  if (hasRequestedCompany) {
    if (!isPlatformAdmin && requestedCompanyId !== currentCompanyId) {
      return json(403, { error: 'Acces refuse: vous ne pouvez pas creer un compte hors de votre tenant.' })
    }
    companyId = requestedCompanyId
  }

  const tenantContext = await resolveTenantContext(dbClient, companyId)
  if (tenantContext.error) {
    return json(400, { error: tenantContext.error })
  }
  const tenantKey = tenantContext.tenantKey

  const { data: profileRow, error: profileError } = await dbClient.from('profils').upsert({
    user_id: createdUser.id,
    role,
    nom: nom || null,
    prenom: prenom || null,
    company_id: companyId,
    tenant_key: tenantKey,
    account_type: accountType,
    account_status: accountStatus,
    is_demo_account: isDemoAccount,
    is_investor_account: isInvestorAccount,
    account_origin: accountOrigin,
    requested_from_public_form: requestedFromPublicForm,
    demo_expires_at: demoExpiresAt,
    notes_admin: notesAdmin,
    permissions,
    max_concurrent_screens: maxConcurrentScreens,
    assigned_by_admin: clients.currentProfile?.id ?? null,
    force_password_reset: mustGeneratePassword,
  }, {
    onConflict: 'user_id',
  }).select('id,user_id,matricule').single()

  if (profileError) {
    return json(500, { error: profileError.message })
  }

  // Synchronise le nouveau modele multi-tenant (tenant_users + tenant_user_roles).
  const { data: roleRow, error: roleError } = await dbClient
    .from('roles')
    .select('id')
    .eq('company_id', companyId)
    .eq('name', role)
    .maybeSingle()

  if (roleError) {
    return json(500, { error: roleError.message })
  }

  let defaultRoleId = roleRow?.id ?? null
  if (!defaultRoleId) {
    const { data: createdRole, error: createRoleError } = await dbClient
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

    if (createRoleError) {
      return json(500, { error: createRoleError.message })
    }

    defaultRoleId = createdRole?.id ?? null
  }

  const { data: tenantUser, error: tenantUserError } = await dbClient
    .from('tenant_users')
    .upsert({
      tenant_id: companyId,
      user_id: createdUser.id,
      default_role_id: defaultRoleId,
      is_active: true,
    }, {
      onConflict: 'tenant_id,user_id',
    })
    .select('id')
    .single()

  if (tenantUserError || !tenantUser) {
    return json(500, { error: tenantUserError?.message ?? 'Impossible de lier le compte au tenant.' })
  }

  if (defaultRoleId) {
    const { error: tenantRoleError } = await dbClient
      .from('tenant_user_roles')
      .upsert({
        tenant_user_id: tenantUser.id,
        role_id: defaultRoleId,
        granted_by: clients.currentUser?.id ?? null,
      }, {
        onConflict: 'tenant_user_id,role_id',
      })

    if (tenantRoleError) {
      return json(500, { error: tenantRoleError.message })
    }
  }

  const ensuredMatricule = profileRow?.matricule || generateUserMatricule(profileRow?.id)
  if (profileRow && !profileRow.matricule) {
    const { error: matriculeError } = await dbClient
      .from('profils')
      .update({ matricule: ensuredMatricule })
      .eq('id', profileRow.id)
    if (matriculeError) {
      return json(500, { error: matriculeError.message })
    }
  }

  if (requestId) {
    const { error: requestUpdateError } = await dbClient
      .from('project_access_requests')
      .update({
        request_status: 'compte_cree',
        lead_status: 'compte_cree',
        linked_user_id: createdUser.id,
        linked_profile_id: profileRow?.id ?? null,
        linked_role: role,
        created_account_email: createdUser.email ?? email,
        account_created: true,
        requested_role: role,
        assigned_by_admin: clients.currentProfile?.id ?? null,
      })
      .eq('id', requestId)

    if (requestUpdateError) {
      return json(500, { error: requestUpdateError.message })
    }
  }

  const { warnings: legacySyncWarnings } = await syncLegacyRoleRecords({
    dbClient,
    companyId,
    profilId: profileRow?.id ?? null,
    role,
    nom,
    prenom,
    email: requestedExternalEmail ?? createdUser.email ?? email,
    matricule: ensuredMatricule,
  })

  await logPlatformAuditEvent(dbClient, {
    currentUser: clients.currentUser,
    eventType: 'admin_user_created',
    targetType: 'profile',
    targetId: profileRow?.id ?? null,
    payload: {
      email: createdUser.email ?? email,
      role,
      company_id: companyId,
      account_type: accountType,
      requested_from_public_form: requestedFromPublicForm,
    },
    ipHash: clients.requestIpHash ?? null,
  })

  return json(201, {
    user: {
      id: createdUser.id,
      profile_id: profileRow?.id ?? null,
      email: createdUser.email ?? email,
      external_email: requestedExternalEmail ?? createdUser.email ?? email,
      role,
      matricule: ensuredMatricule,
      nom: nom || null,
      prenom: prenom || null,
      account_type: accountType,
      account_status: accountStatus,
      is_demo_account: isDemoAccount,
      is_investor_account: isInvestorAccount,
      max_concurrent_screens: maxConcurrentScreens,
      company_id: companyId,
      tenant_key: tenantKey,
      requires_email_confirmation: !clients.admin,
    },
    warnings: legacySyncWarnings,
  })
}

async function updateAdminUser({ admin, sessionClient, currentUser, requestIpHash }, rawBody) {
  const body = typeof rawBody === 'string' && rawBody.length > 0 ? JSON.parse(rawBody) : {}
  const id = typeof body.id === 'string' ? body.id : ''
  const ids = parseIds(body.ids)
  const role = normalizeRole(body.role)
  const nom = typeof body.nom === 'string' ? body.nom.trim() : null
  const prenom = typeof body.prenom === 'string' ? body.prenom.trim() : null
  const requestId = typeof body.request_id === 'string' ? body.request_id : null
  const action = typeof body.action === 'string' ? normalizeRoleToken(body.action) : null
  const bulkAction = typeof body.bulk_action === 'string' ? normalizeRoleToken(body.bulk_action) : action
  const permissions = Array.isArray(body.permissions) ? sanitizePermissions(body.permissions) : null
  const accountType = typeof body.account_type === 'string' ? sanitizeAccountType(body.account_type, 'standard') : null
  const accountStatus = typeof body.account_status === 'string' ? sanitizeAccountStatus(body.account_status, 'actif') : null
  const notesAdminProvided = Object.prototype.hasOwnProperty.call(body, 'notes_admin')
  const notesAdmin = notesAdminProvided
    ? (typeof body.notes_admin === 'string' ? body.notes_admin.trim() : null)
    : undefined
  const externalEmailProvided = Object.prototype.hasOwnProperty.call(body, 'external_email')
  const externalEmail = externalEmailProvided ? normalizeEmail(body.external_email) : undefined
  const demoExpiresAt = typeof body.demo_expires_at === 'string' ? body.demo_expires_at : null
  const updateRequestStatus = typeof body.request_status === 'string' ? sanitizeRequestStatus(body.request_status) : null
  const updateLeadStatus = typeof body.lead_status === 'string' ? sanitizeLeadStatus(body.lead_status) : null
  const requestNotes = typeof body.request_notes_admin === 'string' ? body.request_notes_admin.trim() : null
  const maxConcurrentScreens = body.max_concurrent_screens !== undefined || body.maxConcurrentScreens !== undefined
    ? sanitizeMaxConcurrentScreens(body.max_concurrent_screens ?? body.maxConcurrentScreens, 1)
    : null

  const runBulk = ids.length > 0 && bulkAction && ['enable', 'disable', 'suspend', 'archive'].includes(bulkAction)
  if (!runBulk && !id) return json(400, { error: 'Profile id is required.' })

  const dbClient = admin ?? sessionClient
  if (runBulk) {
    const { data: targets, error: targetsError } = await dbClient
      .from('profils')
      .select('id, user_id, role, account_status')
      .in('id', ids)

    if (targetsError) return json(400, { error: targetsError.message })
    if (!targets || targets.length === 0) return json(404, { error: 'No profiles found for bulk action.' })

    const { data: allProfiles, error: allProfilesError } = await dbClient
      .from('profils')
      .select('id, role, account_status')

    if (allProfilesError) return json(400, { error: allProfilesError.message })

    const bulkSafetyError = validateBulkSafety({
      targets,
      allProfiles,
      currentUserId: currentUser.id,
      bulkAction,
    })
    if (bulkSafetyError) return json(400, { error: bulkSafetyError })

    const patch = {}
    if (bulkAction === 'archive') {
      patch.account_status = 'archive'
      patch.archived_at = new Date().toISOString()
    } else if (bulkAction === 'disable') {
      patch.account_status = 'desactive'
    } else if (bulkAction === 'enable') {
      patch.account_status = 'actif'
      patch.archived_at = null
    } else if (bulkAction === 'suspend') {
      patch.account_status = 'suspendu'
    }

    const { error: bulkUpdateError } = await dbClient
      .from('profils')
      .update(patch)
      .in('id', ids)

    if (bulkUpdateError) return json(400, { error: bulkUpdateError.message })

    await logPlatformAuditEvent(dbClient, {
      currentUser,
      eventType: 'admin_users_bulk_action',
      targetType: 'profile',
      targetId: null,
      payload: {
        action: bulkAction,
        count: ids.length,
        next_status: patch.account_status ?? null,
        sample_before: targets.slice(0, 10).map(target => ({
          id: target.id,
          role: normalizeRole(target.role) ?? target.role,
          account_status: target.account_status ?? null,
        })),
        profile_ids: ids.slice(0, 50),
      },
      ipHash: requestIpHash ?? null,
    })

    return json(200, { ok: true, bulk: true, updated: ids.length })
  }

  const { data: targetProfile, error: targetProfileError } = await dbClient
    .from('profils')
    .select('id, user_id, role, account_status, notes_admin')
    .eq('id', id)
    .maybeSingle()

  if (targetProfileError) return json(400, { error: targetProfileError.message })
  if (!targetProfile) return json(404, { error: 'Profile not found.' })

  if (action === 'delete') {
    if (!admin) return json(400, { error: 'Service role required to delete auth users.' })
    if (targetProfile.user_id === currentUser.id) return json(400, { error: 'You cannot delete your own account.' })
    if ((normalizeRole(targetProfile.role) ?? '') === 'super_admin') {
      return json(400, { error: 'Suppression interdite pour un compte super_admin.' })
    }

    const confirmationText = typeof body.confirmation_text === 'string' ? body.confirmation_text.trim().toUpperCase() : ''
    if (confirmationText !== 'SUPPRIMER') {
      return json(400, { error: 'Confirmation requise: saisissez SUPPRIMER.' })
    }

    const targetRole = normalizeRole(targetProfile.role)
    if (targetRole && ADMIN_ROLES.has(targetRole)) {
      const { data: privilegedProfiles, error: privilegedProfilesError } = await dbClient
        .from('profils')
        .select('id, role')

      if (privilegedProfilesError) return json(400, { error: privilegedProfilesError.message })

      const privilegedCount = (privilegedProfiles ?? []).reduce((count, profile) => {
        const profileRole = normalizeRole(profile.role)
        return profileRole && ADMIN_ROLES.has(profileRole) ? count + 1 : count
      }, 0)

      if (privilegedCount <= 1) {
        return json(400, { error: 'Au moins un compte admin/dirigeant doit rester actif.' })
      }
    }

    if (targetProfile.user_id) {
      const { error: deleteAuthError } = await admin.auth.admin.deleteUser(targetProfile.user_id)
      if (deleteAuthError) return json(400, { error: deleteAuthError.message })
    }

    const { error: archiveAfterDeleteError } = await dbClient
      .from('profils')
      .update({
        account_status: 'archive',
        archived_at: new Date().toISOString(),
        notes_admin: notesAdmin || 'Compte supprime via administration',
      })
      .eq('id', id)

    if (archiveAfterDeleteError) return json(400, { error: archiveAfterDeleteError.message })

    await logPlatformAuditEvent(dbClient, {
      currentUser,
      eventType: 'admin_user_deleted',
      targetType: 'profile',
      targetId: id,
      payload: {
        action: 'delete',
        previous_role: targetProfile.role,
      },
      ipHash: requestIpHash ?? null,
    })

    return json(200, { ok: true, deleted: true })
  }

  if (action === 'reset_password') {
    if (!admin) return json(400, { error: 'Service role required.' })
    if (!targetProfile.user_id) return json(400, { error: 'No auth account linked to this profile.' })
    const { data: authUser, error: authErr } = await admin.auth.admin.getUserById(targetProfile.user_id)
    if (authErr) return json(400, { error: authErr.message })
    const { data: linkData, error: linkErr } = await admin.auth.admin.generateLink({
      type: 'recovery',
      email: authUser.user.email,
    })
    if (linkErr) return json(400, { error: linkErr.message })
    await logPlatformAuditEvent(dbClient, {
      currentUser,
      eventType: 'admin_user_reset_password_link_generated',
      targetType: 'profile',
      targetId: id,
      payload: { action: 'reset_password' },
      ipHash: requestIpHash ?? null,
    })
    return json(200, { ok: true, recovery_link: linkData.properties.action_link })
  }

  if (action === 'magic_link') {
    if (!admin) return json(400, { error: 'Service role required.' })
    if (!targetProfile.user_id) return json(400, { error: 'No auth account linked to this profile.' })
    const { data: authUser, error: authErr } = await admin.auth.admin.getUserById(targetProfile.user_id)
    if (authErr) return json(400, { error: authErr.message })
    const { data: linkData, error: linkErr } = await admin.auth.admin.generateLink({
      type: 'magiclink',
      email: authUser.user.email,
    })
    if (linkErr) return json(400, { error: linkErr.message })
    await logPlatformAuditEvent(dbClient, {
      currentUser,
      eventType: 'admin_user_magic_link_generated',
      targetType: 'profile',
      targetId: id,
      payload: { action: 'magic_link' },
      ipHash: requestIpHash ?? null,
    })
    return json(200, { ok: true, magic_link: linkData.properties.action_link })
  }

  const effectiveRole = role ?? normalizeRole(targetProfile.role)
  if (!effectiveRole) return json(400, { error: 'Invalid role.' })

  const targetRole = normalizeRole(targetProfile.role)

  if (targetProfile.user_id === currentUser.id && !ADMIN_ROLES.has(effectiveRole)) {
    return json(400, { error: 'You cannot remove your own admin/dirigeant access.' })
  }

  if (targetRole && ADMIN_ROLES.has(targetRole) && !ADMIN_ROLES.has(effectiveRole)) {
    const { data: privilegedProfiles, error: privilegedProfilesError } = await dbClient
      .from('profils')
      .select('id, role')

    if (privilegedProfilesError) return json(400, { error: privilegedProfilesError.message })

    const privilegedCount = (privilegedProfiles ?? []).reduce((count, profile) => {
      const profileRole = normalizeRole(profile.role)
      return profileRole && ADMIN_ROLES.has(profileRole) ? count + 1 : count
    }, 0)

    if (privilegedCount <= 1) {
      return json(400, { error: 'At least one admin or dirigeant account is required.' })
    }
  }

  const mergedNotesAdmin = composeNotesAdmin({
    previousRaw: targetProfile.notes_admin,
    nextNoteText: notesAdmin,
    nextExternalEmail: externalEmail,
  })

  const patch = {
    role: effectiveRole,
    nom: nom || null,
    prenom: prenom || null,
    account_type: accountType ?? undefined,
    account_status: accountStatus ?? undefined,
    notes_admin: mergedNotesAdmin,
    demo_expires_at: demoExpiresAt,
    permissions: permissions ?? undefined,
    is_demo_account: body.is_demo_account === true || body.isDemoAccount === true ? true : undefined,
    is_investor_account: body.is_investor_account === true || body.isInvestorAccount === true ? true : undefined,
    last_role_change_at: targetRole !== effectiveRole ? new Date().toISOString() : undefined,
    max_concurrent_screens: maxConcurrentScreens ?? undefined,
  }

  const previousSnapshot = {
    role: targetRole ?? null,
    account_status: targetProfile.account_status ?? null,
    notes_admin: splitNotesAdmin(targetProfile.notes_admin).noteText,
    external_email: splitNotesAdmin(targetProfile.notes_admin).externalEmail,
  }

  if (action === 'archive') {
    patch.account_status = 'archive'
    patch.archived_at = new Date().toISOString()
  } else if (action === 'disable') {
    patch.account_status = 'desactive'
  } else if (action === 'enable') {
    patch.account_status = 'actif'
  } else if (action === 'suspend') {
    patch.account_status = 'suspendu'
  }

  const { data: updatedProfile, error } = await dbClient
    .from('profils')
    .update(patch)
    .eq('id', id)
    .select('id, company_id, role, nom, prenom, matricule')
    .single()

  if (error) return json(400, { error: error.message })

  const shouldSyncLegacyRole = targetRole !== effectiveRole
    || effectiveRole === 'exploitant'
    || DRIVER_ROLES.has(effectiveRole)

  let legacySyncWarnings = []
  if (shouldSyncLegacyRole && updatedProfile?.id) {
    const { warnings } = await syncLegacyRoleRecords({
      dbClient,
      companyId: updatedProfile.company_id,
      profilId: updatedProfile.id,
      role: effectiveRole,
      nom: updatedProfile.nom,
      prenom: updatedProfile.prenom,
      email: undefined,
      matricule: updatedProfile.matricule,
    })
    legacySyncWarnings = warnings
  }

  if (targetRole !== effectiveRole) {
    await dbClient.from('user_role_change_log').insert({
      actor_profile_id: null,
      target_profile_id: id,
      previous_role: targetRole ?? 'inconnu',
      new_role: effectiveRole,
      source: 'admin_users_function',
      change_reason: typeof body.change_reason === 'string' ? body.change_reason : null,
    })

    if (admin && targetProfile.user_id) {
      await admin.auth.admin.updateUserById(targetProfile.user_id, {
        app_metadata: { role: effectiveRole },
      })
    }
  }

  if (requestId && (updateRequestStatus || updateLeadStatus || requestNotes !== null)) {
    const { error: requestUpdateError } = await dbClient
      .from('project_access_requests')
      .update({
        request_status: updateRequestStatus ?? undefined,
        lead_status: updateLeadStatus ?? undefined,
        notes_admin: requestNotes,
      })
      .eq('id', requestId)

    if (requestUpdateError) return json(400, { error: requestUpdateError.message })
  }

  await logPlatformAuditEvent(dbClient, {
    currentUser,
    eventType: 'admin_user_updated',
    targetType: 'profile',
    targetId: id,
    payload: {
      action: action ?? 'update',
      before: previousSnapshot,
      after: {
        role: effectiveRole,
        account_status: patch.account_status ?? targetProfile.account_status ?? null,
        notes_admin: notesAdmin === undefined ? previousSnapshot.notes_admin : notesAdmin,
        external_email: externalEmail === undefined ? previousSnapshot.external_email : externalEmail,
      },
      updated_request_id: requestId,
      updated_permissions: Array.isArray(permissions) ? permissions.length : null,
    },
    ipHash: requestIpHash ?? null,
  })

  return json(200, { ok: true, warnings: legacySyncWarnings })
}

export async function handler(event) {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204 }
  }

  const auth = await authorize(event)
  if (auth.error) return auth.error
  const requestIpHash = hashIp(extractClientIp(event))
  const authWithRequest = { ...auth, requestIpHash }

  if (event.httpMethod === 'GET') {
    const query = event.queryStringParameters ?? {}
    const result = await listAdminUsers(authWithRequest, {
      search: query.search,
      filterRole: query.filter_role,
      filterStatus: query.filter_status,
      sortBy: query.sort_by,
      sortOrder: query.sort_order,
      page: query.page,
      pageSize: query.page_size,
      auditSearch: query.audit_search,
      auditDays: query.audit_days,
      auditPage: query.audit_page,
      auditPageSize: query.audit_page_size,
    })
    if (result.error) return json(500, { error: result.error })
    return json(200, result)
  }

  if (event.httpMethod === 'POST') {
    try {
      return await createAdminUser(authWithRequest, event.body)
    } catch {
      return json(400, { error: 'Invalid JSON payload.' })
    }
  }

  if (event.httpMethod === 'PATCH') {
    try {
      return await updateAdminUser(authWithRequest, event.body)
    } catch {
      return json(400, { error: 'Invalid JSON payload.' })
    }
  }

  return json(405, { error: 'Method not allowed.' })
}

export const __testables = {
  parseIds,
  sanitizeSortBy,
  sanitizeSortOrder,
  sanitizeAuditDays,
  sanitizeAuditPageSize,
  computeAuditCutoffIso,
  sortUsersByLastSignIn,
  paginateCollection,
  validateBulkSafety,
  hashIp,
  extractClientIp,
  logPlatformAuditEvent,
}
