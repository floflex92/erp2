import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
)

const RESPONSE_HEADERS = {
  'Content-Type': 'application/json',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
}

const IP_RATE_LIMIT = 5  // max par IP par heure
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export default async (req, _context) => {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Méthode non autorisée' }), {
      status: 405,
      headers: RESPONSE_HEADERS,
    })
  }

  // ── 1. Lecture et validation du corps ──────────────────────────────────────
  let email
  try {
    const body = await req.json()
    email = body.email?.trim().toLowerCase()
  } catch {
    return new Response(JSON.stringify({ error: 'Corps de la requête invalide' }), {
      status: 400,
      headers: RESPONSE_HEADERS,
    })
  }

  if (!email || !EMAIL_REGEX.test(email) || email.length > 254) {
    return new Response(JSON.stringify({ error: 'Adresse email invalide' }), {
      status: 400,
      headers: RESPONSE_HEADERS,
    })
  }

  // ── 2. Rate limiting par IP ────────────────────────────────────────────────
  const rawIp = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
  const clientIp = rawIp && rawIp.length <= 45 ? rawIp : null

  if (clientIp) {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()
    const { count: ipCount } = await supabase
      .from('demo_access_requests')
      .select('id', { count: 'exact', head: true })
      .eq('ip_address', clientIp)
      .gte('created_at', oneHourAgo)

    if ((ipCount ?? 0) >= IP_RATE_LIMIT) {
      return new Response(
        JSON.stringify({ error: 'Trop de demandes depuis votre réseau. Réessayez dans une heure.' }),
        { status: 429, headers: RESPONSE_HEADERS },
      )
    }
  }

  // ── 3. Vérifier si un profil démo existe déjà pour cet email ──────────────
  const { data: existingProfil } = await supabase
    .from('profils')
    .select('user_id')
    .eq('email', email)
    .maybeSingle()

  if (!existingProfil) {
    // ── 4a. Nouvel utilisateur : créer le compte auth ────────────────────────
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      email_confirm: true,
    })

    const alreadyExists = authError?.message?.includes('already registered')
      || authError?.message?.includes('already been registered')

    if (authError && !alreadyExists) {
      console.error('[demo-magic-link] createUser error:', authError.message)
      return new Response(
        JSON.stringify({ error: 'Erreur lors de la création du compte.' }),
        { status: 500, headers: RESPONSE_HEADERS },
      )
    }

    const userId = authData?.user?.id

    if (userId) {
      // ── 4b. Créer ou mettre à jour le profil démo ──────────────────────────
      const { error: profilError } = await supabase.from('profils').upsert(
        {
          user_id: userId,
          email,
          role: 'dirigeant',
          is_demo_account: true,
          account_type: 'demo',
          account_status: 'actif',
          account_origin: 'public_demo_form',
          requested_from_public_form: true,
        },
        { onConflict: 'user_id' },
      )

      if (profilError) {
        // Non bloquant : on logue mais on continue
        console.error('[demo-magic-link] profil upsert error:', profilError.message)
      }

      // ── 4c. Synchroniser tenant_users + tenant_user_roles (best-effort) ──────
      try {
        const demoCompanyId = Number.parseInt(process.env.DEMO_COMPANY_ID ?? '1', 10)
        const demoRole = 'dirigeant'
        const { data: roleRow } = await supabase
          .from('roles')
          .select('id')
          .eq('company_id', demoCompanyId)
          .eq('name', demoRole)
          .maybeSingle()
        let demoRoleId = roleRow?.id ?? null
        if (!demoRoleId) {
          const { data: newRole } = await supabase
            .from('roles')
            .upsert({ company_id: demoCompanyId, name: demoRole, label: 'Dirigeant', is_system: true }, { onConflict: 'company_id,name' })
            .select('id')
            .single()
          demoRoleId = newRole?.id ?? null
        }
        const { data: tenantUser } = await supabase
          .from('tenant_users')
          .upsert({ tenant_id: demoCompanyId, user_id: userId, default_role_id: demoRoleId, is_active: true }, { onConflict: 'tenant_id,user_id' })
          .select('id')
          .single()
        if (tenantUser?.id && demoRoleId) {
          await supabase
            .from('tenant_user_roles')
            .upsert({ tenant_user_id: tenantUser.id, role_id: demoRoleId, granted_by: null }, { onConflict: 'tenant_user_id,role_id' })
        }
      } catch (membershipErr) {
        console.error('[demo-magic-link] tenant membership sync error (non-bloquant):', membershipErr)
      }

      // ── 4d. Enregistrer la demande (best-effort, unique par email) ──────────
      await supabase
        .from('demo_access_requests')
        .insert({
          user_id: userId,
          prenom: 'Demo',
          nom: 'Visiteur',
          email,
          objectif: 'Découverte ERP',
          ip_address: clientIp,
          user_agent: req.headers.get('user-agent')?.slice(0, 512) ?? null,
          statut: 'compte_cree',
        })
        .then(({ error }) => {
          if (error && !error.message?.includes('unique')) {
            console.error('[demo-magic-link] request insert error:', error.message)
          }
        })
    }
    // Si alreadyExists sans userId connu → on passe directement à generateLink
  }

  // ── 5. Générer le magic link (accès instantané) ────────────────────────────
  const siteUrl = process.env.URL ?? 'https://nexora-truck.fr'
  const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
    type: 'magiclink',
    email,
    options: {
      redirectTo: `${siteUrl}/dashboard`,
    },
  })

  if (linkError || !linkData?.properties?.hashed_token) {
    console.error('[demo-magic-link] generateLink error:', linkError?.message)
    return new Response(
      JSON.stringify({ error: "Impossible de générer le lien d'accès. Réessayez." }),
      { status: 500, headers: RESPONSE_HEADERS },
    )
  }

  return new Response(
    JSON.stringify({ hashed_token: linkData.properties.hashed_token }),
    { status: 200, headers: RESPONSE_HEADERS },
  )
}
