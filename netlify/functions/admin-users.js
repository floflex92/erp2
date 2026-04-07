import { createClient } from '@supabase/supabase-js'

const ROLE_VALUES = ['admin', 'dirigeant', 'exploitant', 'mecanicien', 'commercial', 'comptable', 'rh', 'conducteur', 'conducteur_affreteur', 'client', 'affreteur', 'administratif', 'facturation', 'flotte', 'maintenance', 'observateur', 'demo', 'investisseur', 'super_admin', 'logisticien']
const ROLE_SET = new Set(ROLE_VALUES)
const ADMIN_ROLES = new Set(['admin', 'dirigeant'])
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
    .select('id, user_id, role, matricule')
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

async function listAdminUsers({ admin, sessionClient }) {
  const dbClient = admin ?? sessionClient

  if (admin) {
    const [{ data: profileData, error: profileError }, { data: authData, error: authError }, { data: requestData, error: requestError }, { data: roleLogData, error: roleLogError }] = await Promise.all([
      dbClient.from('profils').select('*').order('created_at', { ascending: false }),
      admin.auth.admin.listUsers({ page: 1, perPage: 1000 }),
      dbClient.from('project_access_requests').select('*').order('created_at', { ascending: false }).limit(500),
      dbClient.from('user_role_change_log').select('*').order('changed_at', { ascending: false }).limit(500),
    ])

    if (profileError) return { error: profileError.message }
    if (authError) return { error: authError.message }
    if (requestError) return { error: requestError.message }
    if (roleLogError) return { error: roleLogError.message }

    const authById = new Map((authData?.users ?? []).map(user => [user.id, user]))
    const users = (profileData ?? []).map(profile => {
      const authUser = authById.get(profile.user_id)

      return {
        ...profile,
        role: normalizeRole(profile.role) ?? profile.role,
        email: authUser?.email ?? null,
        email_confirmed_at: authUser?.email_confirmed_at ?? null,
        last_sign_in_at: authUser?.last_sign_in_at ?? null,
      }
    })

    return {
      users,
      requests: requestData ?? [],
      role_changes: roleLogData ?? [],
    }
  }

  const [{ data, error }, { data: requestData, error: requestError }, { data: roleLogData, error: roleLogError }] = await Promise.all([
    dbClient.from('profils').select('*').order('created_at', { ascending: false }),
    dbClient.from('project_access_requests').select('*').order('created_at', { ascending: false }).limit(500),
    dbClient.from('user_role_change_log').select('*').order('changed_at', { ascending: false }).limit(500),
  ])

  if (error) return { error: error.message }
  if (requestError) return { error: requestError.message }
  if (roleLogError) return { error: roleLogError.message }

  const users = (data ?? []).map(profile => ({
    ...profile,
    role: normalizeRole(profile.role) ?? profile.role,
    email: null,
    email_confirmed_at: null,
    last_sign_in_at: null,
  }))

  return {
    users,
    requests: requestData ?? [],
    role_changes: roleLogData ?? [],
  }
}

async function createAdminUser(clients, rawBody) {
  const body = typeof rawBody === 'string' && rawBody.length > 0 ? JSON.parse(rawBody) : {}
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
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
  const notesAdmin = typeof body.notes_admin === 'string' ? body.notes_admin.trim() : null
  const requestId = typeof body.request_id === 'string' ? body.request_id : null
  const permissions = sanitizePermissions(body.permissions)
  const maxConcurrentScreens = sanitizeMaxConcurrentScreens(body.max_concurrent_screens ?? body.maxConcurrentScreens, 1)

  if (!email) return json(400, { error: 'Email is required.' })
  if (!password || password.length < 8) return json(400, { error: 'Password must be at least 8 characters.' })
  if (!role) return json(400, { error: 'Invalid role.' })

  let createdUser = null

  if (clients.admin) {
    const { data, error } = await clients.admin.auth.admin.createUser({
      email,
      password,
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
      password,
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
  const { data: profileRow, error: profileError } = await dbClient.from('profils').upsert({
    user_id: createdUser.id,
    role,
    nom: nom || null,
    prenom: prenom || null,
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
  }, {
    onConflict: 'user_id',
  }).select('id,user_id,matricule').single()

  if (profileError) {
    return json(500, { error: profileError.message })
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

  return json(201, {
    user: {
      id: createdUser.id,
      profile_id: profileRow?.id ?? null,
      email: createdUser.email ?? email,
      role,
      matricule: ensuredMatricule,
      nom: nom || null,
      prenom: prenom || null,
      account_type: accountType,
      account_status: accountStatus,
      is_demo_account: isDemoAccount,
      is_investor_account: isInvestorAccount,
      max_concurrent_screens: maxConcurrentScreens,
      requires_email_confirmation: !clients.admin,
    },
  })
}

async function updateAdminUser({ admin, sessionClient, currentUser }, rawBody) {
  const body = typeof rawBody === 'string' && rawBody.length > 0 ? JSON.parse(rawBody) : {}
  const id = typeof body.id === 'string' ? body.id : ''
  const role = normalizeRole(body.role)
  const nom = typeof body.nom === 'string' ? body.nom.trim() : null
  const prenom = typeof body.prenom === 'string' ? body.prenom.trim() : null
  const requestId = typeof body.request_id === 'string' ? body.request_id : null
  const action = typeof body.action === 'string' ? normalizeRoleToken(body.action) : null
  const permissions = Array.isArray(body.permissions) ? sanitizePermissions(body.permissions) : null
  const accountType = typeof body.account_type === 'string' ? sanitizeAccountType(body.account_type, 'standard') : null
  const accountStatus = typeof body.account_status === 'string' ? sanitizeAccountStatus(body.account_status, 'actif') : null
  const notesAdmin = typeof body.notes_admin === 'string' ? body.notes_admin.trim() : null
  const demoExpiresAt = typeof body.demo_expires_at === 'string' ? body.demo_expires_at : null
  const updateRequestStatus = typeof body.request_status === 'string' ? sanitizeRequestStatus(body.request_status) : null
  const updateLeadStatus = typeof body.lead_status === 'string' ? sanitizeLeadStatus(body.lead_status) : null
  const requestNotes = typeof body.request_notes_admin === 'string' ? body.request_notes_admin.trim() : null
  const maxConcurrentScreens = body.max_concurrent_screens !== undefined || body.maxConcurrentScreens !== undefined
    ? sanitizeMaxConcurrentScreens(body.max_concurrent_screens ?? body.maxConcurrentScreens, 1)
    : null

  if (!id) return json(400, { error: 'Profile id is required.' })

  const dbClient = admin ?? sessionClient
  const { data: targetProfile, error: targetProfileError } = await dbClient
    .from('profils')
    .select('id, user_id, role, account_status')
    .eq('id', id)
    .maybeSingle()

  if (targetProfileError) return json(400, { error: targetProfileError.message })
  if (!targetProfile) return json(404, { error: 'Profile not found.' })

  if (action === 'delete') {
    if (!admin) return json(400, { error: 'Service role required to delete auth users.' })
    if (targetProfile.user_id === currentUser.id) return json(400, { error: 'You cannot delete your own account.' })

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

    return json(200, { ok: true, deleted: true })
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

  const patch = {
    role: effectiveRole,
    nom: nom || null,
    prenom: prenom || null,
    account_type: accountType ?? undefined,
    account_status: accountStatus ?? undefined,
    notes_admin: notesAdmin,
    demo_expires_at: demoExpiresAt,
    permissions: permissions ?? undefined,
    is_demo_account: body.is_demo_account === true || body.isDemoAccount === true ? true : undefined,
    is_investor_account: body.is_investor_account === true || body.isInvestorAccount === true ? true : undefined,
    last_role_change_at: targetRole !== effectiveRole ? new Date().toISOString() : undefined,
    max_concurrent_screens: maxConcurrentScreens ?? undefined,
  }

  if (action === 'archive') {
    patch.account_status = 'archive'
    patch.archived_at = new Date().toISOString()
  } else if (action === 'disable') {
    patch.account_status = 'desactive'
  } else if (action === 'enable') {
    patch.account_status = 'actif'
  }

  const { error } = await dbClient.from('profils').update(patch).eq('id', id)

  if (error) return json(400, { error: error.message })

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

  return json(200, { ok: true })
}

export async function handler(event) {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204 }
  }

  const auth = await authorize(event)
  if (auth.error) return auth.error

  if (event.httpMethod === 'GET') {
    const result = await listAdminUsers(auth)
    if (result.error) return json(500, { error: result.error })
    return json(200, result)
  }

  if (event.httpMethod === 'POST') {
    try {
      return await createAdminUser(auth, event.body)
    } catch {
      return json(400, { error: 'Invalid JSON payload.' })
    }
  }

  if (event.httpMethod === 'PATCH') {
    try {
      return await updateAdminUser(auth, event.body)
    } catch {
      return json(400, { error: 'Invalid JSON payload.' })
    }
  }

  return json(405, { error: 'Method not allowed.' })
}
