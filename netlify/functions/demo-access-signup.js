import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

function generatePassword() {
  const bytes = new Uint8Array(12)
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = Math.floor(Math.random() * 256)
  }
  const encoded = Buffer.from(bytes).toString('base64')
  return ('Nx!' + encoded).replace(/\+/g, 'A').replace(/\//g, 'B').replace(/=/g, 'C')
}

export default async (req, context) => {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Méthode non autorisée' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  try {
    const {
      prenom,
      nom,
      email,
      telephone,
      objectif,
      description,
      nom_entreprise,
      secteur_activite,
      nombre_salaries,
    } = await req.json()

    if (!prenom?.trim() || !nom?.trim() || !email?.trim() || !objectif) {
      return new Response(
        JSON.stringify({ error: 'Données manquantes ou invalides' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    const password = generatePassword()

    // 1. Créer le compte utilisateur Supabase
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: email.toLowerCase().trim(),
      password,
      email_confirm: true,
      user_metadata: {
        prenom: prenom.trim(),
        nom: nom.trim(),
      },
    })

    if (authError) {
      console.error('Auth error:', authError)
      // Si l'email existe déjà, on le considère comme succès (pas d'erreur)
      if (authError.message?.includes('already registered')) {
        // Récupérer l'utilisateur existant
        const { data: existingUser } = await supabase
          .from('profils')
          .select('*')
          .eq('email', email.toLowerCase().trim())
          .single()

        if (existingUser?.user_id) {
          return new Response(
            JSON.stringify({
              account_created: false,
              message: 'Compte existant détecté. Accès accordé.',
            }),
            { status: 200, headers: { 'Content-Type': 'application/json' } }
          )
        }
      }
      throw authError
    }

    // 2. Créer le profil avec rôle "demo"
    const { error: profilError } = await supabase.from('profils').insert([
      {
        user_id: authData.user.id,
        email: email.toLowerCase().trim(),
        prenom: prenom.trim(),
        nom: nom.trim(),
        role: 'demo',
        matricule: null,
      },
    ])

    if (profilError) {
      console.error('Profil error:', profilError)
      throw profilError
    }

    // 3. Synchroniser tenant_users + tenant_user_roles (best-effort, non-bloquant)
    try {
      const demoCompanyId = Number.parseInt(process.env.DEMO_COMPANY_ID ?? '1', 10)
      const { data: roleRow } = await supabase
        .from('roles')
        .select('id')
        .eq('company_id', demoCompanyId)
        .eq('name', 'demo')
        .maybeSingle()
      let demoRoleId = roleRow?.id ?? null
      if (!demoRoleId) {
        const { data: newRole } = await supabase
          .from('roles')
          .upsert({ company_id: demoCompanyId, name: 'demo', label: 'Démo', is_system: true }, { onConflict: 'company_id,name' })
          .select('id')
          .single()
        demoRoleId = newRole?.id ?? null
      }
      const { data: tenantUser } = await supabase
        .from('tenant_users')
        .upsert({ tenant_id: demoCompanyId, user_id: authData.user.id, default_role_id: demoRoleId, is_active: true }, { onConflict: 'tenant_id,user_id' })
        .select('id')
        .single()
      if (tenantUser?.id && demoRoleId) {
        await supabase
          .from('tenant_user_roles')
          .upsert({ tenant_user_id: tenantUser.id, role_id: demoRoleId, granted_by: null }, { onConflict: 'tenant_user_id,role_id' })
      }
    } catch (membershipErr) {
      console.error('[demo-access-signup] tenant membership sync error (non-bloquant):', membershipErr)
    }

    // 5. Enregistrer dans demo_access_requests
    await supabase.from('demo_access_requests').insert([
      {
        user_id: authData.user.id,
        prenom: prenom.trim(),
        nom: nom.trim(),
        email: email.toLowerCase().trim(),
        telephone: telephone?.trim() || null,
        objectif,
        description: description?.trim() || null,
        nom_entreprise: nom_entreprise?.trim() || null,
        secteur_activite: secteur_activite || null,
        nombre_salaries: nombre_salaries || null,
        user_agent: req.headers.get('user-agent'),
        statut: 'compte_cree',
      },
    ])

    return new Response(
      JSON.stringify({
        success: true,
        account_created: true,
        credentials: {
          email: email.toLowerCase().trim(),
          password,
        },
        message: 'Compte créé avec succès. Vous pouvez maintenant vous connecter.',
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Demo access signup error:', error)
    return new Response(
      JSON.stringify({
        error: `Erreur lors de la création du compte: ${error.message || error}`,
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}
