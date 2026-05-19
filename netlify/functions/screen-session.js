import { createClient } from '@supabase/supabase-js'

const SCREEN_ID_MAX = 128
const SESSION_LABEL_MAX = 120
const STALE_SECONDS = 90

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

  if (!url || !anonKey) return null
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

function normalizeString(input, maxLen) {
  if (typeof input !== 'string') return null
  const trimmed = input.trim()
  if (!trimmed) return null
  return trimmed.slice(0, maxLen)
}

function sanitizeMaxConcurrentScreens(value) {
  const n = Number(value)
  if (!Number.isFinite(n)) return 1
  const asInt = Math.trunc(n)
  if (asInt < 1) return 1
  if (asInt > 12) return 12
  return asInt
}

async function authorize(event) {
  const authHeader = event.headers.authorization || event.headers.Authorization
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null
  const env = getSupabaseEnv()

  if (!env) return { error: json(500, { error: 'Missing Supabase environment variables.' }) }
  if (!token) return { error: json(401, { error: 'Missing bearer token.' }) }

  const sessionClient = createServerClient(env.url, env.anonKey, token)
  const admin = env.serviceRoleKey ? createServerClient(env.url, env.serviceRoleKey) : null
  const authClient = admin ?? sessionClient

  const { data, error } = await authClient.auth.getUser(token)
  if (error || !data.user) {
    return { error: json(401, { error: 'Invalid session token.' }) }
  }

  return {
    user: data.user,
    dbClient: admin ?? sessionClient,
  }
}

async function cleanupStaleSessions(dbClient, userId) {
  const staleThreshold = new Date(Date.now() - STALE_SECONDS * 1000).toISOString()
  await dbClient
    .from('user_screen_sessions')
    .update({ closed_at: new Date().toISOString() })
    .eq('user_id', userId)
    .is('closed_at', null)
    .lt('last_seen_at', staleThreshold)
}

async function loadProfileAndLimit(dbClient, userId) {
  const { data, error } = await dbClient
    .from('profils')
    .select('id, max_concurrent_screens')
    .eq('user_id', userId)
    .maybeSingle()

  if (error) return { error: error.message }
  if (!data) return { error: 'Profil utilisateur introuvable.' }

  return {
    profilId: data.id,
    limit: sanitizeMaxConcurrentScreens(data.max_concurrent_screens),
  }
}

async function countActiveScreens(dbClient, userId) {
  const threshold = new Date(Date.now() - STALE_SECONDS * 1000).toISOString()
  const { count, error } = await dbClient
    .from('user_screen_sessions')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .is('closed_at', null)
    .gte('last_seen_at', threshold)

  if (error) return { error: error.message }
  return { count: count ?? 0 }
}

async function claimScreenSession(dbClient, userId, body) {
  const screenId = normalizeString(body?.screen_id, SCREEN_ID_MAX)
  const label = normalizeString(body?.label, SESSION_LABEL_MAX)

  if (!screenId) {
    return json(400, { error: 'screen_id is required.' })
  }

  const profile = await loadProfileAndLimit(dbClient, userId)
  if (profile.error) return json(400, { error: profile.error })

  await cleanupStaleSessions(dbClient, userId)

  const { error: upsertError } = await dbClient
    .from('user_screen_sessions')
    .upsert(
      {
        user_id: userId,
        profil_id: profile.profilId,
        screen_id: screenId,
        label,
        closed_at: null,
        last_seen_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,screen_id' },
    )

  if (upsertError) return json(400, { error: upsertError.message })

  const active = await countActiveScreens(dbClient, userId)
  if (active.error) return json(400, { error: active.error })

  if (active.count > profile.limit) {
    await dbClient
      .from('user_screen_sessions')
      .update({ closed_at: new Date().toISOString() })
      .eq('user_id', userId)
      .eq('screen_id', screenId)
      .is('closed_at', null)

    return json(429, {
      error: `Trop d'ecrans ouverts (${active.count}/${profile.limit}). Limite atteinte pour ce compte.`,
      code: 'SCREEN_LIMIT_EXCEEDED',
      activeScreens: active.count,
      limit: profile.limit,
    })
  }

  return json(200, {
    ok: true,
    activeScreens: active.count,
    limit: profile.limit,
  })
}

async function heartbeatScreenSession(dbClient, userId, body) {
  const screenId = normalizeString(body?.screen_id, SCREEN_ID_MAX)
  if (!screenId) return json(400, { error: 'screen_id is required.' })

  const profile = await loadProfileAndLimit(dbClient, userId)
  if (profile.error) return json(400, { error: profile.error })

  await cleanupStaleSessions(dbClient, userId)

  const { error: updateError } = await dbClient
    .from('user_screen_sessions')
    .update({ last_seen_at: new Date().toISOString(), closed_at: null })
    .eq('user_id', userId)
    .eq('screen_id', screenId)

  if (updateError) return json(400, { error: updateError.message })

  const active = await countActiveScreens(dbClient, userId)
  if (active.error) return json(400, { error: active.error })

  if (active.count > profile.limit) {
    return json(429, {
      error: `Trop d'ecrans ouverts (${active.count}/${profile.limit}). Limite atteinte pour ce compte.`,
      code: 'SCREEN_LIMIT_EXCEEDED',
      activeScreens: active.count,
      limit: profile.limit,
    })
  }

  return json(200, { ok: true, activeScreens: active.count, limit: profile.limit })
}

async function releaseScreenSession(dbClient, userId, body) {
  const screenId = normalizeString(body?.screen_id, SCREEN_ID_MAX)
  if (!screenId) return json(400, { error: 'screen_id is required.' })

  const { error } = await dbClient
    .from('user_screen_sessions')
    .update({ closed_at: new Date().toISOString() })
    .eq('user_id', userId)
    .eq('screen_id', screenId)
    .is('closed_at', null)

  if (error) return json(400, { error: error.message })

  return json(200, { ok: true })
}

export async function handler(event) {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204 }
  }

  const auth = await authorize(event)
  if (auth.error) return auth.error

  let body = {}
  try {
    body = typeof event.body === 'string' && event.body.length > 0 ? JSON.parse(event.body) : {}
  } catch {
    return json(400, { error: 'Invalid JSON payload.' })
  }

  if (event.httpMethod === 'POST') {
    return claimScreenSession(auth.dbClient, auth.user.id, body)
  }

  if (event.httpMethod === 'PUT') {
    return heartbeatScreenSession(auth.dbClient, auth.user.id, body)
  }

  if (event.httpMethod === 'DELETE') {
    return releaseScreenSession(auth.dbClient, auth.user.id, body)
  }

  return json(405, { error: 'Method not allowed.' })
}
