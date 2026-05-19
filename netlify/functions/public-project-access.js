import { createClient } from '@supabase/supabase-js'

const DEFAULT_ROLE = 'dirigeant'

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
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || null

  if (!url || !serviceRoleKey) return null
  return { url, serviceRoleKey }
}

function createAdminClient(url, serviceRoleKey) {
  return createClient(url, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })
}

function normalizeToken(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[\s-]+/g, '_')
}

function normalizeNeedType(value) {
  const allowed = new Set([
    'transport_public_routier',
    'affretement',
    'logistique',
    'location_flotte',
    'projet_erp_modernisation',
    'investisseur',
    'autre',
  ])
  const token = normalizeToken(value)
  return allowed.has(token) ? token : 'autre'
}

function generatePassword() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%&*'
  let out = 'Nx!'
  for (let i = 0; i < 12; i += 1) {
    out += alphabet[Math.floor(Math.random() * alphabet.length)]
  }
  return out
}

function validateInput(payload) {
  const fullName = typeof payload.full_name === 'string' ? payload.full_name.trim() : ''
  const companyName = typeof payload.company_name === 'string' ? payload.company_name.trim() : ''
  const email = typeof payload.email === 'string' ? payload.email.trim().toLowerCase() : ''
  const phone = typeof payload.phone === 'string' ? payload.phone.trim() : ''
  const message = typeof payload.message === 'string' ? payload.message.trim() : ''
  const acceptedPolicy = payload.accepted_policy === true

  if (!fullName || fullName.length < 3) return { error: 'Nom / prenom invalide.' }
  if (!companyName || companyName.length < 2) return { error: 'Societe invalide.' }
  if (!email || !email.includes('@')) return { error: 'Email professionnel invalide.' }
  if (!phone || phone.length < 6) return { error: 'Telephone invalide.' }
  if (!acceptedPolicy) return { error: 'La validation de la politique de confidentialite est obligatoire.' }

  return {
    data: {
      full_name: fullName,
      company_name: companyName,
      email,
      phone,
      need_type: normalizeNeedType(payload.need_type),
      company_size: typeof payload.company_size === 'string' ? payload.company_size.trim() : null,
      fleet_size: Number.isFinite(payload.fleet_size) ? Math.max(0, Number(payload.fleet_size)) : null,
      employee_count: Number.isFinite(payload.employee_count) ? Math.max(0, Number(payload.employee_count)) : null,
      message: message || null,
      accepted_policy: true,
      source: 'demande_page_connexion',
      request_status: 'nouveau',
      lead_status: 'nouveau',
      requested_account_type: payload.requested_account_type === 'investisseur' ? 'investisseur' : 'test',
      requested_role: DEFAULT_ROLE,
    },
  }
}

export async function handler(event) {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204 }
  }

  if (event.httpMethod !== 'POST') {
    return json(405, { error: 'Method not allowed.' })
  }

  const env = getSupabaseEnv()
  if (!env) return json(500, { error: 'Missing Supabase service role environment variables.' })

  let body = {}
  try {
    body = typeof event.body === 'string' && event.body.length > 0 ? JSON.parse(event.body) : {}
  } catch {
    return json(400, { error: 'Invalid JSON payload.' })
  }

  const validation = validateInput(body)
  if (validation.error) {
    return json(400, { error: validation.error })
  }

  const supabase = createAdminClient(env.url, env.serviceRoleKey)
  const createAccount = body.create_account !== false
  const provisionalPassword = createAccount ? generatePassword() : null

  const { data: requestRow, error: requestError } = await supabase
    .from('project_access_requests')
    .insert(validation.data)
    .select('*')
    .single()

  if (requestError || !requestRow) {
    return json(400, { error: requestError?.message ?? 'Impossible de creer la demande.' })
  }

  if (!createAccount) {
    return json(201, {
      ok: true,
      request: requestRow,
      account_created: false,
    })
  }

  const [firstName, ...rest] = validation.data.full_name.split(' ')
  const lastName = rest.join(' ').trim() || null

  const { data: createdUser, error: createUserError } = await supabase.auth.admin.createUser({
    email: validation.data.email,
    password: provisionalPassword,
    email_confirm: true,
    app_metadata: {
      role: DEFAULT_ROLE,
    },
    user_metadata: {
      prenom: firstName || null,
      nom: lastName,
      source: 'demande_page_connexion',
      account_type: validation.data.requested_account_type,
    },
  })

  if (createUserError || !createdUser.user) {
    return json(400, {
      error: createUserError?.message ?? 'Impossible de creer le compte test.',
      request_id: requestRow.id,
    })
  }

  const { data: profileRow, error: profileError } = await supabase
    .from('profils')
    .upsert({
      user_id: createdUser.user.id,
      role: DEFAULT_ROLE,
      prenom: firstName || null,
      nom: lastName,
      account_type: validation.data.requested_account_type === 'investisseur' ? 'investisseur' : 'test',
      account_status: 'actif',
      is_demo_account: validation.data.requested_account_type !== 'investisseur',
      is_investor_account: validation.data.requested_account_type === 'investisseur',
      account_origin: 'demande_page_connexion',
      requested_from_public_form: true,
      notes_admin: validation.data.message,
    }, { onConflict: 'user_id' })
    .select('id, role')
    .single()

  if (profileError || !profileRow) {
    return json(500, {
      error: profileError?.message ?? 'Compte cree sans profil applicatif.',
      request_id: requestRow.id,
    })
  }

  const { error: requestLinkError } = await supabase
    .from('project_access_requests')
    .update({
      linked_user_id: createdUser.user.id,
      linked_profile_id: profileRow.id,
      linked_role: DEFAULT_ROLE,
      created_account_email: createdUser.user.email ?? validation.data.email,
      account_created: true,
      request_status: 'compte_cree',
      lead_status: 'compte_cree',
    })
    .eq('id', requestRow.id)

  if (requestLinkError) {
    return json(500, { error: requestLinkError.message, request_id: requestRow.id })
  }

  return json(201, {
    ok: true,
    request_id: requestRow.id,
    account_created: true,
    account: {
      user_id: createdUser.user.id,
      email: createdUser.user.email ?? validation.data.email,
      role: DEFAULT_ROLE,
      provisional_password: provisionalPassword,
    },
  })
}
