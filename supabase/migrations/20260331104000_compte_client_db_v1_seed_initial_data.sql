-- Seed initial data - compte_client_db V1
-- Objectif: injecter un jeu de donnees de demarrage pour le compte Channel Fret
-- Script idempotent avec resolution dynamique de compte_erp_id

do $$
declare
  v_compte_erp_id uuid;
  v_role_operationnel_id uuid;
  v_user_operationnel_id uuid;
begin
  -- 1) Compte principal (assurance)
  insert into core.comptes_erp (code, nom)
  values ('channel_fret', 'Channel Fret')
  on conflict (code) do update
    set nom = excluded.nom,
        updated_at = now()
  returning id into v_compte_erp_id;

  if v_compte_erp_id is null then
    select id into v_compte_erp_id
    from core.comptes_erp
    where code = 'channel_fret'
    limit 1;
  end if;

  -- 2) Role operationnel (assurance)
  insert into core.roles_compte (compte_erp_id, code, libelle)
  values (v_compte_erp_id, 'operationnel', 'Operationnel')
  on conflict (compte_erp_id, code) do update
    set libelle = excluded.libelle,
        updated_at = now()
  returning id into v_role_operationnel_id;

  if v_role_operationnel_id is null then
    select id into v_role_operationnel_id
    from core.roles_compte
    where compte_erp_id = v_compte_erp_id
      and code = 'operationnel'
    limit 1;
  end if;

  -- 3) Utilisateur operationnel exemple
  insert into core.utilisateurs_compte (id, compte_erp_id, role_compte_id, user_auth_id, email, nom, prenom)
  values (
    '11111111-3333-1111-3333-111111111111',
    v_compte_erp_id,
    v_role_operationnel_id,
    null,
    'operationnel@channel-fret.fr',
    'Equipe',
    'Operationnelle'
  )
  on conflict (compte_erp_id, email) do update
    set role_compte_id = excluded.role_compte_id,
        nom = excluded.nom,
        prenom = excluded.prenom,
        updated_at = now()
  returning id into v_user_operationnel_id;

  if v_user_operationnel_id is null then
    select id into v_user_operationnel_id
    from core.utilisateurs_compte
    where compte_erp_id = v_compte_erp_id
      and email = 'operationnel@channel-fret.fr'
    limit 1;
  end if;

  -- 4) Partenaires
  insert into core.partenaires (id, compte_erp_id, code, nom, siret, email, telephone)
  values
    (
      '11111111-4444-1111-4444-111111111111',
      v_compte_erp_id,
      'PART-AGRO',
      'Agro Distribution Nord',
      '55210000000001',
      'transport@agro-nord.fr',
      '0320102030'
    ),
    (
      '11111111-5555-1111-5555-111111111111',
      v_compte_erp_id,
      'PART-RETAIL',
      'Retail Hub France',
      '55210000000002',
      'ops@retail-hub.fr',
      '0140506070'
    )
  on conflict (id) do nothing;

  -- 5) Conducteurs
  insert into core.conducteurs (id, compte_erp_id, nom, prenom, telephone)
  values
    (
      '11111111-6666-1111-6666-111111111111',
      v_compte_erp_id,
      'Martin',
      'Lucas',
      '0670101010'
    ),
    (
      '11111111-7777-1111-7777-111111111111',
      v_compte_erp_id,
      'Bernard',
      'Noa',
      '0670202020'
    )
  on conflict (id) do nothing;

  -- 6) Vehicules
  insert into core.vehicules (id, compte_erp_id, immatriculation, libelle)
  values
    (
      '11111111-8888-1111-8888-111111111111',
      v_compte_erp_id,
      'AA-123-BB',
      'Tracteur Volvo'
    ),
    (
      '11111111-9999-1111-9999-111111111111',
      v_compte_erp_id,
      'CC-456-DD',
      'Porteur Renault'
    )
  on conflict (id) do nothing;

  -- 7) Ordres de transport
  insert into core.ordres_transport (
    id,
    compte_erp_id,
    partenaire_id,
    destinataire_final_id,
    reference,
    statut_transport,
    date_chargement_prevue,
    date_livraison_prevue,
    created_by,
    updated_by
  )
  values
    (
      '11111111-aaaa-1111-aaaa-111111111111',
      v_compte_erp_id,
      '11111111-4444-1111-4444-111111111111',
      '11111111-4444-1111-4444-111111111111',
      'OT-CF-2026-001',
      'en_attente',
      now() + interval '1 day',
      now() + interval '1 day 6 hours',
      v_user_operationnel_id,
      v_user_operationnel_id
    ),
    (
      '11111111-bbbb-1111-bbbb-111111111111',
      v_compte_erp_id,
      '11111111-5555-1111-5555-111111111111',
      '11111111-5555-1111-5555-111111111111',
      'OT-CF-2026-002',
      'en_cours',
      now() - interval '2 hours',
      now() + interval '3 hours',
      v_user_operationnel_id,
      v_user_operationnel_id
    )
  on conflict (id) do nothing;

  -- 8) Messages
  insert into core.messages (id, compte_erp_id, ordre_transport_id, auteur_user_id, contenu)
  values
    (
      '11111111-cccc-1111-cccc-111111111111',
      v_compte_erp_id,
      '11111111-aaaa-1111-aaaa-111111111111',
      v_user_operationnel_id,
      'Chargement confirme pour demain 06h30.'
    ),
    (
      '11111111-dddd-1111-dddd-111111111111',
      v_compte_erp_id,
      '11111111-bbbb-1111-bbbb-111111111111',
      v_user_operationnel_id,
      'Le vehicule est en approche du site de livraison.'
    )
  on conflict (id) do nothing;

  -- 9) Documents + versions
  insert into docs.documents (
    id,
    compte_erp_id,
    ordre_transport_id,
    type_document,
    nom_fichier,
    storage_path,
    created_by,
    updated_by
  )
  values
    (
      '11111111-eeee-1111-eeee-111111111111',
      v_compte_erp_id,
      '11111111-aaaa-1111-aaaa-111111111111',
      'cmr',
      'cmr-ot-cf-2026-001.pdf',
      'docs/channel_fret/ot-001/cmr-v1.pdf',
      v_user_operationnel_id,
      v_user_operationnel_id
    )
  on conflict (id) do nothing;

  insert into docs.documents_versions (
    id,
    compte_erp_id,
    document_id,
    version_num,
    storage_path,
    checksum,
    created_by
  )
  values
    (
      '11111111-ffff-1111-ffff-111111111111',
      v_compte_erp_id,
      '11111111-eeee-1111-eeee-111111111111',
      1,
      'docs/channel_fret/ot-001/cmr-v1.pdf',
      'sha256:seed-v1-cmr-001',
      v_user_operationnel_id
    )
  on conflict (id) do nothing;

  -- 10) Evenements temps reel
  insert into rt.evenements_transport (id, compte_erp_id, ordre_transport_id, type_evenement, payload)
  values
    (
      '22222222-1111-2222-1111-222222222222',
      v_compte_erp_id,
      '11111111-bbbb-1111-bbbb-111111111111',
      'statut_transport',
      '{"statut":"en_cours","source":"seed_initial"}'::jsonb
    ),
    (
      '22222222-2222-2222-2222-222222222222',
      v_compte_erp_id,
      '11111111-bbbb-1111-bbbb-111111111111',
      'position_vehicule',
      '{"lat":50.6292,"lng":3.0573,"source":"seed_initial"}'::jsonb
    )
  on conflict (id) do nothing;

  -- 11) Notifications
  insert into rt.notifications (id, compte_erp_id, user_id, type_notification, payload)
  values
    (
      '33333333-1111-3333-1111-333333333333',
      v_compte_erp_id,
      v_user_operationnel_id,
      'document_disponible',
      '{"document_id":"11111111-eeee-1111-eeee-111111111111","reference":"OT-CF-2026-001"}'::jsonb
    )
  on conflict (id) do nothing;

  -- 12) Journal audit
  insert into audit.journal_actions (
    id,
    compte_erp_id,
    acteur_user_id,
    action,
    table_cible,
    cible_id,
    payload_after
  )
  values
    (
      '44444444-1111-4444-1111-444444444444',
      v_compte_erp_id,
      v_user_operationnel_id,
      'seed_initial_insert',
      'core.ordres_transport',
      '11111111-aaaa-1111-aaaa-111111111111',
      '{"reference":"OT-CF-2026-001"}'::jsonb
    )
  on conflict (id) do nothing;

  -- 13) Trace backup metadonnees
  insert into backup.snapshots (id, compte_erp_id, type_snapshot, reference_externe, metadata)
  values
    (
      '55555555-1111-5555-1111-555555555555',
      v_compte_erp_id,
      'fonctionnel_annuel',
      'seed-initial-2026',
      '{"source":"migration_seed","version":"v1"}'::jsonb
    )
  on conflict (id) do nothing;
end $$;
