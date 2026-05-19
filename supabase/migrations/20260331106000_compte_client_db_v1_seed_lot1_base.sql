-- Seed lot 1: base corrlee (clients, adresses, conducteurs, camions, remorques)
-- Injection progressive pour faciliter le debug

do $$
declare
  v_compte_erp_id uuid;
  i integer;
begin
  select id into v_compte_erp_id
  from core.comptes_erp
  where code = 'channel_fret'
  limit 1;

  if v_compte_erp_id is null then
    raise exception 'compte channel_fret introuvable';
  end if;

  -- 10 clients
  for i in 1..10 loop
    insert into core.partenaires (compte_erp_id, code, nom, siret, email, telephone)
    values (
      v_compte_erp_id,
      'CLIENT-' || lpad(i::text, 3, '0'),
      'Client ' || i,
      '552' || lpad(i::text, 8, '0') || '00001',
      'contact' || i || '@client.fr',
      '0320' || lpad((1000 + i)::text, 6, '0')
    )
    on conflict (id) do nothing;
  end loop;

  -- 20 adresses (2 par client) avec horaires + jours
  for i in 1..20 loop
    insert into core.adresses (
      compte_erp_id,
      partenaire_id,
      code,
      nom_entreprise,
      adresse_ligne1,
      adresse_ligne2,
      code_postal,
      ville,
      pays,
      telephone,
      email,
      horaire_ouverture,
      horaire_fermeture,
      jours_ouverture,
      notes
    )
    select
      v_compte_erp_id,
      p.id,
      'ADDR-' || lpad(i::text, 3, '0'),
      p.nom || ' - Site ' || case when (i % 2) = 0 then 'B' else 'A' end,
      (10 + i)::text || ' rue de la Logistique',
      'Zone ' || ((i - 1) % 5 + 1)::text,
      '62' || lpad((100 + i)::text, 3, '0'),
      (array['Lille','Lens','Arras','Douai','Dunkerque'])[((i - 1) % 5) + 1],
      'France',
      '0320' || lpad((3000 + i)::text, 6, '0'),
      'site' || i || '@' || replace(lower(p.nom), ' ', '-') || '.fr',
      '08:00'::time,
      '18:00'::time,
      case when (i % 4) = 0 then 'lun,mar,mer,jeu,ven,sam' else 'lun,mar,mer,jeu,ven' end,
      'Adresse operationnelle seed lot 1'
    from core.partenaires p
    where p.compte_erp_id = v_compte_erp_id
      and p.code = 'CLIENT-' || lpad((((i - 1) / 2) + 1)::text, 3, '0')
    on conflict (compte_erp_id, code) do nothing;
  end loop;

  -- 20 conducteurs
  for i in 1..20 loop
    insert into core.conducteurs (compte_erp_id, nom, prenom, telephone)
    values (
      v_compte_erp_id,
      (array['Martin','Bernard','Dubois','Laurent','Simon','Thomas','Michel','Andre','Petit','Durand','Leroy','Moreau','Nicolas','Roux','Blanc','Girard','Noel','Bonnet','Fontaine','Rousseau'])[i],
      (array['Jean','Paul','Jacques','Pierre','Philippe','Roger','Alain','Christian','Olivier','Yves','Marc','Franck','David','Patrick','Luc','Robert','Noa','Leo','Hugo','Evan'])[i],
      '06' || lpad((70000000 + i * 777)::text, 8, '0')
    );
  end loop;

  -- 22 camions
  for i in 1..22 loop
    insert into core.vehicules (compte_erp_id, immatriculation, libelle)
    values (
      v_compte_erp_id,
      'CF-' || lpad(i::text, 3, '0') || '-TR',
      (array['Volvo FH','MAN TGX','Scania R450','Actros','Renault T'])[((i - 1) % 5) + 1] || ' #' || i
    )
    on conflict (compte_erp_id, immatriculation) do nothing;
  end loop;

  -- 22 remorques de types varies
  for i in 1..22 loop
    insert into core.remorques (
      compte_erp_id,
      immatriculation,
      type_remorque,
      marque,
      modele,
      volume_m3,
      poids_vide_kg,
      charge_utile_kg,
      dernier_controle_date,
      prochain_controle_date,
      proprietaire
    )
    values (
      v_compte_erp_id,
      'CF-RM-' || lpad(i::text, 3, '0'),
      (array['benne','plateau','citerne','fourgon','reefer','basculante'])[((i - 1) % 6) + 1],
      (array['Schmitz','Kogel','Krone','Fruehauf','Lamberet','Chereau'])[((i - 1) % 6) + 1],
      'Modele ' || i,
      24 + (i % 12),
      6500 + (i * 120),
      22000 + (i * 150),
      (current_date - ((i % 180) || ' days')::interval)::date,
      (current_date + ((120 + i) || ' days')::interval)::date,
      true
    )
    on conflict (compte_erp_id, immatriculation) do nothing;
  end loop;

  raise notice 'Lot 1 seed termine';
end $$;
