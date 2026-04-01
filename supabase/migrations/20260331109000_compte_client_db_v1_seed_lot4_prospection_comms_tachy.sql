-- Seed lot 4: prospection, fichiers prospection, mail/chat, tachygraphe

do $$
declare
  v_compte_erp_id uuid;
  v_user_id uuid;
  i integer;
begin
  select id into v_compte_erp_id
  from core.comptes_erp
  where code = 'channel_fret'
  limit 1;

  select id into v_user_id
  from core.utilisateurs_compte
  where compte_erp_id = v_compte_erp_id
    and email = 'operationnel@channel-fret.fr'
  limit 1;

  if v_compte_erp_id is null then
    raise exception 'compte channel_fret introuvable';
  end if;

  -- Prospects
  for i in 1..20 loop
    insert into core.prospects (
      compte_erp_id,
      nom_entreprise,
      email,
      telephone,
      contact_nom,
      contact_prenom,
      secteur,
      budget_estimé_euro,
      volume_annuel_tonnes,
      statut,
      date_premier_contact,
      date_qualif,
      notes,
      created_by
    )
    values (
      v_compte_erp_id,
      'Prospect ' || i,
      'prospect' || i || '@business.fr',
      '0321' || lpad((7000 + i)::text, 6, '0'),
      (array['Dupont','Durand','Renaud','Brun','Martin'])[((i - 1) % 5) + 1],
      (array['Luc','Paul','Marc','Lea','Nina'])[((i - 1) % 5) + 1],
      (array['agro','retail','pharma','construction','autres'])[((i - 1) % 5) + 1],
      90000 + (i * 18000),
      300 + (i * 40),
      (array['nouveau','en_cours','qualifie','gagne','perdu'])[((i - 1) % 5) + 1],
      (current_date - ((i * 6) || ' days')::interval)::date,
      case when i % 3 = 0 then (current_date - ((i * 3) || ' days')::interval)::date else null end,
      'Prospection seed lot 4',
      v_user_id
    );
  end loop;

  -- Interactions prospects
  for i in 1..80 loop
    insert into core.prospect_interactions (
      compte_erp_id,
      prospect_id,
      type_interaction,
      date_interaction,
      notes,
      created_by
    )
    select
      v_compte_erp_id,
      p.id,
      (array['email','appel','rencontre','devis','autre'])[((i - 1) % 5) + 1],
      (current_date - ((i * 2) || ' days')::interval)::date,
      'Interaction prospect #' || i,
      v_user_id
    from (
      select id, row_number() over (order by created_at, id) as rn
      from core.prospects
      where compte_erp_id = v_compte_erp_id
    ) p
    where p.rn = ((i - 1) % 20) + 1;
  end loop;

  -- Fichiers de prospection dans docs
  for i in 1..24 loop
    insert into docs.documents (
      compte_erp_id,
      ordre_transport_id,
      type_document,
      nom_fichier,
      storage_path,
      created_by,
      updated_by
    )
    values (
      v_compte_erp_id,
      null,
      'prospection',
      'dossier_prospect_' || lpad(i::text, 3, '0') || '.pdf',
      'prospection/channel_fret/dossier_' || lpad(i::text, 3, '0') || '.pdf',
      v_user_id,
      v_user_id
    );
  end loop;

  -- Versions pour les fichiers de prospection
  insert into docs.documents_versions (
    compte_erp_id,
    document_id,
    version_num,
    storage_path,
    checksum,
    created_by
  )
  select
    v_compte_erp_id,
    d.id,
    1,
    d.storage_path,
    'sha256:prospection-v1-' || d.id::text,
    v_user_id
  from docs.documents d
  where d.compte_erp_id = v_compte_erp_id
    and d.type_document = 'prospection'
  on conflict (document_id, version_num) do nothing;

  -- Communications (mail/chat/sms/appel)
  for i in 1..140 loop
    insert into core.communications (
      compte_erp_id,
      ordre_transport_id,
      prospect_id,
      type_communication,
      expediteur_user_id,
      expediteur_externe,
      contenu,
      date_communication,
      statut
    )
    select
      v_compte_erp_id,
      case when i % 2 = 0 then (
        select x.id
        from (
          select id, row_number() over (order by created_at, id) as rn
          from core.ordres_transport
          where compte_erp_id = v_compte_erp_id
        ) x
        where x.rn = ((i - 1) % 60) + 1
      ) else null end,
      case when i % 2 = 1 then (
        select y.id
        from (
          select id, row_number() over (order by created_at, id) as rn
          from core.prospects
          where compte_erp_id = v_compte_erp_id
        ) y
        where y.rn = ((i - 1) % 20) + 1
      ) else null end,
      (array['email','chat','sms','appel'])[((i - 1) % 4) + 1],
      v_user_id,
      case when i % 2 = 1 then 'contact@prospect.fr' else null end,
      (array[
        'Confirmation envoi',
        'Point avancement',
        'Demande information',
        'Rappel planning',
        'Validation client',
        'Suivi dossier'
      ])[((i - 1) % 6) + 1],
      now() - ((i * 5) || ' hours')::interval,
      case when i % 7 = 0 then 'lu' else 'envoye' end
    ;
  end loop;

  -- Chrono tachygraphe (240 entrees)
  for i in 1..240 loop
    insert into core.tachygraphe_entries (
      compte_erp_id,
      conducteur_id,
      vehicule_id,
      ordre_transport_id,
      date_entree,
      heure_debut,
      heure_fin,
      type_activite,
      km_debut,
      km_fin,
      notes
    )
    select
      v_compte_erp_id,
      c.id,
      v.id,
      case when i % 3 = 0 then ot.id else null end,
      (current_date - ((i / 6) || ' days')::interval)::date,
      ('04:00'::time + (((i % 10) * 45) || ' minutes')::interval),
      ('04:00'::time + (((i % 10) * 45 + 90) || ' minutes')::interval),
      (array['conduite','autre_travail','pause','repos'])[((i - 1) % 4) + 1],
      120000 + (i * 12),
      120000 + (i * 12) + case when (i % 4) = 1 then 55 else 0 end,
      'Tachy seed lot 4'
    from (
      select id, row_number() over (order by created_at, id) as rn
      from core.conducteurs
      where compte_erp_id = v_compte_erp_id
    ) c
    join (
      select id, row_number() over (order by immatriculation, id) as rn
      from core.vehicules
      where compte_erp_id = v_compte_erp_id
    ) v on v.rn = ((i - 1) % 22) + 1
    left join (
      select id, row_number() over (order by created_at, id) as rn
      from core.ordres_transport
      where compte_erp_id = v_compte_erp_id
    ) ot on ot.rn = ((i - 1) % 60) + 1
    where c.rn = ((i - 1) % 20) + 1;
  end loop;

  raise notice 'Lot 4 seed termine';
end $$;
