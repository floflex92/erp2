import { createClient } from '@supabase/supabase-js'

const ROLE_VALUES = ['admin', 'dirigeant', 'exploitant', 'mecanicien', 'commercial', 'comptable', 'rh', 'conducteur', 'conducteur_affreteur', 'client', 'affreteur']
const ROLE_SET = new Set(ROLE_VALUES)
const ADMIN_ROLES = new Set(['admin', 'dirigeant'])
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
  return ROLE_ALIASES[token] ?? null
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
  if (admin) {
    const [{ data: profileData, error: profileError }, { data: authData, error: authError }] = await Promise.all([
      admin.from('profils').select('*').order('created_at'),
      admin.auth.admin.listUsers({ page: 1, perPage: 1000 }),
    ])

    if (profileError) return { error: profileError.message }
    if (authError) return { error: authError.message }

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

    return { users }
  }

  const { data, error } = await sessionClient.from('profils').select('*').order('created_at')
  if (error) return { error: error.message }

  const users = (data ?? []).map(profile => ({
    ...profile,
    role: normalizeRole(profile.role) ?? profile.role,
    email: null,
    email_confirmed_at: null,
    last_sign_in_at: null,
  }))

  return { users }
}

async function createAdminUser(clients, rawBody) {
  const body = typeof rawBody === 'string' && rawBody.length > 0 ? JSON.parse(rawBody) : {}
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
  const password = typeof body.password === 'string' ? body.password : ''
  const role = normalizeRole(body.role)
  const nom = typeof body.nom === 'string' ? body.nom.trim() : ''
  const prenom = typeof body.prenom === 'string' ? body.prenom.trim() : ''

  if (!email) return json(400, { error: 'Email is required.' })
  if (!password || password.length < 8) return json(400, { error: 'Password must be at least 8 characters.' })
  if (!role) return json(400, { error: 'Invalid role.' })

  let createdUser = null

  if (clients.admin) {
    const { data, error } = await clients.admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        nom: nom || null,
        prenom: prenom || null,
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

  return json(201, {
    user: {
      id: createdUser.id,
      profile_id: profileRow?.id ?? null,
      email: createdUser.email ?? email,
      role,
      matricule: ensuredMatricule,
      nom: nom || null,
      prenom: prenom || null,
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

  if (!id) return json(400, { error: 'Profile id is required.' })
  if (!role) return json(400, { error: 'Invalid role.' })

  const dbClient = admin ?? sessionClient
  const { data: targetProfile, error: targetProfileError } = await dbClient
    .from('profils')
    .select('id, user_id, role')
    .eq('id', id)
    .maybeSingle()

  if (targetProfileError) return json(400, { error: targetProfileError.message })
  if (!targetProfile) return json(404, { error: 'Profile not found.' })

  const targetRole = normalizeRole(targetProfile.role)

  if (targetProfile.user_id === currentUser.id && !ADMIN_ROLES.has(role)) {
    return json(400, { error: 'You cannot remove your own admin/dirigeant access.' })
  }

  if (targetRole && ADMIN_ROLES.has(targetRole) && !ADMIN_ROLES.has(role)) {
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

  const { error } = await dbClient.from('profils').update({
    role,
    nom: nom || null,
    prenom: prenom || null,
  }).eq('id', id)

  if (error) return json(400, { error: error.message })

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
