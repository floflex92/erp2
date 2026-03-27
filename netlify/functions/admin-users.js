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

  return { env, admin, sessionClient, publicClient, currentUser: data.user }
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
  const role = typeof body.role === 'string' ? body.role : ''
  const nom = typeof body.nom === 'string' ? body.nom.trim() : ''
  const prenom = typeof body.prenom === 'string' ? body.prenom.trim() : ''

  if (!email) return json(400, { error: 'Email is required.' })
  if (!password || password.length < 8) return json(400, { error: 'Password must be at least 8 characters.' })
  if (!ROLE_VALUES.includes(role)) return json(400, { error: 'Invalid role.' })

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
  const { error: profileError } = await dbClient.from('profils').upsert({
    user_id: createdUser.id,
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
      id: createdUser.id,
      email: createdUser.email ?? email,
      role,
      nom: nom || null,
      prenom: prenom || null,
      requires_email_confirmation: !clients.admin,
    },
  })
}

async function updateAdminUser({ admin, sessionClient }, rawBody) {
  const body = typeof rawBody === 'string' && rawBody.length > 0 ? JSON.parse(rawBody) : {}
  const id = typeof body.id === 'string' ? body.id : ''
  const role = typeof body.role === 'string' ? body.role : ''
  const nom = typeof body.nom === 'string' ? body.nom.trim() : null
  const prenom = typeof body.prenom === 'string' ? body.prenom.trim() : null

  if (!id) return json(400, { error: 'Profile id is required.' })
  if (!ROLE_VALUES.includes(role)) return json(400, { error: 'Invalid role.' })

  const dbClient = admin ?? sessionClient
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
