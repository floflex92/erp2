-- Seed lot 2: OT + planning + chat (historique passe/actuel/futur)

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

  -- 60 OT (20 passees, 20 actuelles, 20 futures)
  for i in 1..60 loop
    insert into core.ordres_transport (
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
    select
      v_compte_erp_id,
      p1.id,
      p2.id,
      'OT-CF-' || to_char(current_date, 'YYYYMM') || '-' || lpad(i::text, 4, '0'),
      case
        when i <= 20 then 'livre'
        when i <= 40 then 'en_cours'
        else 'en_attente'
      end,
      case
        when i <= 20 then now() - ((80 - i) || ' hours')::interval
        when i <= 40 then now() - ((40 - i) || ' hours')::interval
        else now() + ((i - 40) || ' hours')::interval
      end,
      case
        when i <= 20 then now() - ((60 - i) || ' hours')::interval
        when i <= 40 then now() + ((i - 35) || ' hours')::interval
        else now() + ((i + 20) || ' hours')::interval
      end,
      v_user_id,
      v_user_id
    from core.partenaires p1
    join core.partenaires p2 on p2.compte_erp_id = p1.compte_erp_id
    where p1.compte_erp_id = v_compte_erp_id
      and p1.code = 'CLIENT-' || lpad((((i - 1) % 10) + 1)::text, 3, '0')
      and p2.code = 'CLIENT-' || lpad((((i + 4) % 10) + 1)::text, 3, '0')
    on conflict (compte_erp_id, reference) do nothing;
  end loop;

  -- Planning correle a chaque OT
  with ot as (
    select id, row_number() over (order by created_at, id) as rn
    from core.ordres_transport
    where compte_erp_id = v_compte_erp_id
  ),
  veh as (
    select id, row_number() over (order by immatriculation, id) as rn
    from core.vehicules
    where compte_erp_id = v_compte_erp_id
  ),
  rem as (
    select id, row_number() over (order by immatriculation, id) as rn
    from core.remorques
    where compte_erp_id = v_compte_erp_id
  ),
  cond as (
    select id, row_number() over (order by created_at, id) as rn
    from core.conducteurs
    where compte_erp_id = v_compte_erp_id
  )
  insert into core.planning_ot (
    compte_erp_id,
    ordre_transport_id,
    vehicule_id,
    remorque_id,
    conducteur_id,
    conducteur_2_id,
    date_planning,
    heure_depart,
    heure_arrivee_estimée,
    km_planifiés,
    notes
  )
  select
    v_compte_erp_id,
    ot.id,
    v.id,
    r.id,
    c1.id,
    case when (ot.rn % 4) = 0 then c2.id else null end,
    (current_date + ((ot.rn - 30) || ' days')::interval)::date,
    ('05:30'::time + (((ot.rn % 7) * 30) || ' minutes')::interval),
    ('16:30'::time + (((ot.rn % 7) * 20) || ' minutes')::interval),
    180 + (ot.rn * 7),
    'Planning auto seed lot 2'
  from ot
  join veh v on v.rn = ((ot.rn - 1) % (select count(*) from veh)) + 1
  join rem r on r.rn = ((ot.rn - 1) % (select count(*) from rem)) + 1
  join cond c1 on c1.rn = ((ot.rn - 1) % (select count(*) from cond)) + 1
  left join cond c2 on c2.rn = ((ot.rn + 8 - 1) % (select count(*) from cond)) + 1
  on conflict (compte_erp_id, ordre_transport_id) do nothing;

  -- 120 messages chat relies OT/user
  for i in 1..120 loop
    insert into core.messages (compte_erp_id, ordre_transport_id, auteur_user_id, contenu)
    select
      v_compte_erp_id,
      ot.id,
      v_user_id,
      (array[
        'Chargement confirme.',
        'Depart effectue.',
        'Retard de 20 minutes.',
        'Arrivee sur site.',
        'Livraison terminee.',
        'Document CMR transmis.'
      ])[((i - 1) % 6) + 1]
    from (
      select id, row_number() over (order by created_at, id) as rn
      from core.ordres_transport
      where compte_erp_id = v_compte_erp_id
    ) ot
    where ot.rn = ((i - 1) % 60) + 1;
  end loop;

  raise notice 'Lot 2 seed termine';
end $$;
