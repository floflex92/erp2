-- Seed lot 3: equipements, amendes, fiches de paie, atelier, RH

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

  -- Equipements
  for i in 1..45 loop
    insert into core.equipements (
      compte_erp_id,
      nom,
      type_equipement,
      quantite,
      valeur_euro,
      date_acquisition,
      etat
    )
    values (
      v_compte_erp_id,
      (array['GPS','Dashcam','Rampe','Hayon','Bache','Extincteur','Kit ADR','Sangles','Chariot','Balise'])[((i - 1) % 10) + 1] || ' #' || i,
      (array['gps','dashcam','rampe','hayon','bache','autre','autre','autre','autre','autre'])[((i - 1) % 10) + 1],
      1 + (i % 4),
      120 + (i * 35),
      (current_date - ((i * 9) || ' days')::interval)::date,
      (array['bon','use','defectueux'])[((i - 1) % 3) + 1]
    );
  end loop;

  -- Amendes
  for i in 1..28 loop
    insert into core.amendes (
      compte_erp_id,
      conducteur_id,
      ordre_transport_id,
      numero_pv,
      type_infraction,
      montant_euro,
      date_infraction,
      date_notification,
      statut_paiement,
      created_by
    )
    select
      v_compte_erp_id,
      c.id,
      ot.id,
      'PV-CF-' || lpad(i::text, 5, '0'),
      (array['exces_vitesse','doc_manquant','stationnement','chargement','autres'])[((i - 1) % 5) + 1],
      (array[135,90,60,750,250])[((i - 1) % 5) + 1],
      (current_date - ((i * 3) || ' days')::interval)::date,
      (current_date - ((i * 3 - 2) || ' days')::interval)::date,
      (array['non_paye','en_attente','paye'])[((i - 1) % 3) + 1],
      v_user_id
    from (
      select id, row_number() over (order by created_at, id) as rn
      from core.conducteurs
      where compte_erp_id = v_compte_erp_id
    ) c
    left join (
      select id, row_number() over (order by created_at, id) as rn
      from core.ordres_transport
      where compte_erp_id = v_compte_erp_id
    ) ot on ot.rn = ((i - 1) % 60) + 1
    where c.rn = ((i - 1) % 20) + 1
    on conflict (numero_pv) do nothing;
  end loop;

  -- Fiches de paie (12 mois x 20 conducteurs = 240)
  insert into core.fiches_paie (
    compte_erp_id,
    conducteur_id,
    mois,
    salaire_base_euro,
    primes_euro,
    heures_supplementaires,
    deductions_euro,
    montant_net_euro,
    statut_paiement,
    date_paiement,
    notes,
    created_by
  )
  select
    v_compte_erp_id,
    c.id,
    m.mois,
    2300 + ((c.rn % 5) * 120),
    120 + ((m.rn % 4) * 80),
    (c.rn % 9) * 6,
    280 + ((c.rn % 3) * 70),
    (2300 + ((c.rn % 5) * 120)) + (120 + ((m.rn % 4) * 80)) + ((c.rn % 9) * 6) - (280 + ((c.rn % 3) * 70)),
    case when m.rn <= 3 then 'paye' else 'en_attente' end,
    case when m.rn <= 3 then (m.mois + interval '28 days')::date else null end,
    'Paie seed lot 3',
    v_user_id
  from (
    select id, row_number() over (order by created_at, id) as rn
    from core.conducteurs
    where compte_erp_id = v_compte_erp_id
  ) c
  cross join (
    select (date_trunc('month', current_date) - (n || ' months')::interval)::date as mois,
           row_number() over (order by n) as rn
    from generate_series(0, 11) as n
  ) m
  on conflict (compte_erp_id, conducteur_id, mois) do nothing;

  -- Vie atelier (maintenance)
  for i in 1..36 loop
    insert into core.maintenance_history (
      compte_erp_id,
      vehicule_id,
      remorque_id,
      type_maintenance,
      description,
      date_debut,
      date_fin,
      cout_euro,
      statut,
      technicien_nom,
      notes,
      created_by
    )
    select
      v_compte_erp_id,
      v.id,
      r.id,
      (array['controle_technique','revision','reparation','entretien','vidange'])[((i - 1) % 5) + 1],
      'Operation atelier #' || i,
      (current_date - ((i * 4) || ' days')::interval)::date,
      (current_date - ((i * 4 - 1) || ' days')::interval)::date,
      180 + (i * 25),
      case when i <= 28 then 'termine' else 'en_cours' end,
      (array['Garage Nord','Atelier Lens','Service Poids Lourd','Meca Truck'])[((i - 1) % 4) + 1],
      'Historique atelier seed lot 3',
      v_user_id
    from (
      select id, row_number() over (order by immatriculation, id) as rn
      from core.vehicules
      where compte_erp_id = v_compte_erp_id
    ) v
    left join (
      select id, row_number() over (order by immatriculation, id) as rn
      from core.remorques
      where compte_erp_id = v_compte_erp_id
    ) r on r.rn = ((i - 1) % 22) + 1
    where v.rn = ((i - 1) % 22) + 1;
  end loop;

  -- Vie RH: documents
  for i in 1..42 loop
    insert into core.documents_rh (
      compte_erp_id,
      conducteur_id,
      utilisateur_id,
      type_document,
      nom_fichier,
      storage_path,
      date_document,
      date_expiration,
      notes,
      created_by
    )
    select
      v_compte_erp_id,
      c.id,
      v_user_id,
      (array['cv','contrat','permis','visite_medicale','attestation'])[((i - 1) % 5) + 1],
      'rh_doc_' || lpad(i::text, 3, '0') || '.pdf',
      'rh/channel_fret/' || lpad(i::text, 3, '0') || '.pdf',
      (current_date - ((i * 11) || ' days')::interval)::date,
      case when (i % 3) = 0 then (current_date + ((i * 17) || ' days')::interval)::date else null end,
      'Document RH seed lot 3',
      v_user_id
    from (
      select id, row_number() over (order by created_at, id) as rn
      from core.conducteurs
      where compte_erp_id = v_compte_erp_id
    ) c
    where c.rn = ((i - 1) % 20) + 1;
  end loop;

  raise notice 'Lot 3 seed termine';
end $$;
