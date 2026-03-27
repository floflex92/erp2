import { createClient } from '@supabase/supabase-js'

const ROLE_VALUES = ['admin', 'dirigeant', 'exploitant', 'mecanicien', 'commercial', 'comptable']

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
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !serviceRoleKey) {
    return null
  }

  return { url, serviceRoleKey }
}

async function authorize(event) {
  const authHeader = event.headers.authorization || event.headers.Authorization
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null
  const env = getSupabaseEnv()

  if (!env) {
    return { error: json(500, { error: 'Missing Supabase server environment variables.' }) }
  }

  if (!token) {
    return { error: json(401, { error: 'Missing bearer token.' }) }
  }

  const admin = createClient(env.url, env.serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })

  const { data, error } = await admin.auth.getUser(token)
  if (error || !data.user) {
    return { error: json(401, { error: 'Invalid session token.' }) }
  }

  return { admin, currentUser: data.user }
}

async function listAdminUsers(admin) {
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
      email: authUser?.email ?? null,
      email_confirmed_at: authUser?.email_confirmed_at ?? null,
      last_sign_in_at: authUser?.last_sign_in_at ?? null,
    }
  })

  return { users }
}

async function createAdminUser(admin, rawBody) {
  const body = typeof rawBody === 'string' && rawBody.length > 0 ? JSON.parse(rawBody) : {}
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
  const password = typeof body.password === 'string' ? body.password : ''
  const role = typeof body.role === 'string' ? body.role : ''
  const nom = typeof body.nom === 'string' ? body.nom.trim() : ''
  const prenom = typeof body.prenom === 'string' ? body.prenom.trim() : ''

  if (!email) return json(400, { error: 'Email is required.' })
  if (!password || password.length < 8) return json(400, { error: 'Password must be at least 8 characters.' })
  if (!ROLE_VALUES.includes(role)) return json(400, { error: 'Invalid role.' })

  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      nom: nom || null,
      prenom: prenom || null,
    },
  })

  if (createError || !created.user) {
    return json(400, { error: createError?.message ?? 'Unable to create user.' })
  }

  const { error: profileError } = await admin.from('profils').upsert({
    user_id: created.user.id,
    role,
    nom: nom || null,
    prenom: prenom || null,
  }, {
    onConflict: 'user_id',
  })

  if (profileError) {
    return json(500, { error: profileError.message })
  }

  return json(201, {
    user: {
      id: created.user.id,
      email: created.user.email ?? email,
      role,
      nom: nom || null,
      prenom: prenom || null,
    },
  })
}

async function updateAdminUser(admin, rawBody) {
  const body = typeof rawBody === 'string' && rawBody.length > 0 ? JSON.parse(rawBody) : {}
  const id = typeof body.id === 'string' ? body.id : ''
  const role = typeof body.role === 'string' ? body.role : ''
  const nom = typeof body.nom === 'string' ? body.nom.trim() : null
  const prenom = typeof body.prenom === 'string' ? body.prenom.trim() : null

  if (!id) return json(400, { error: 'Profile id is required.' })
  if (!ROLE_VALUES.includes(role)) return json(400, { error: 'Invalid role.' })

  const { error } = await admin.from('profils').update({
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
    const result = await listAdminUsers(auth.admin)
    if (result.error) return json(500, { error: result.error })
    return json(200, result)
  }

  if (event.httpMethod === 'POST') {
    try {
      return await createAdminUser(auth.admin, event.body)
    } catch {
      return json(400, { error: 'Invalid JSON payload.' })
    }
  }

  if (event.httpMethod === 'PATCH') {
    try {
      return await updateAdminUser(auth.admin, event.body)
    } catch {
      return json(400, { error: 'Invalid JSON payload.' })
    }
  }

  return json(405, { error: 'Method not allowed.' })
}
