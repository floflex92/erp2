create or replace function public.compta_log_event(
  p_event_type text,
  p_entity text,
  p_entity_id uuid,
  p_payload jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_prev text;
  v_current text;
  v_actor uuid := auth.uid();
begin
  select hash_current into v_prev
  from public.compta_audit_evenements
  order by created_at desc, id desc
  limit 1;

  v_current := encode(
    extensions.digest(
      coalesce(v_prev, '') || coalesce(p_payload::text, '{}') || coalesce(v_actor::text, '') || clock_timestamp()::text,
      'sha256'
    ),
    'hex'
  );

  insert into public.compta_audit_evenements(
    event_type, entity, entity_id, payload_json, actor_user_id, hash_prev, hash_current
  )
  values (
    p_event_type, p_entity, p_entity_id, coalesce(p_payload, '{}'::jsonb), v_actor, v_prev, v_current
  );
end;
$$;

create or replace function public.compta_export_fec_v1(p_exercice integer)
returns table (
  journal_code_exercice text,
  journal_code text,
  journal_lib text,
  ecriture_date text,
  ecriture_num text,
  piece_ref text,
  piece_date text,
  compte_num text,
  compte_lib text,
  comp_aux_lib text,
  ecriture_lib text,
  debit numeric,
  credit numeric,
  devise text,
  i_piece text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_checksum text;
  v_payload text;
begin
  select string_agg(
           concat_ws('|',
             v.journal_code_exercice,
             v.journal_code,
             v.journal_lib,
             v.ecriture_date,
             v.ecriture_num,
             v.piece_ref,
             v.piece_date,
             v.compte_num,
             v.compte_lib,
             v.comp_aux_lib,
             v.ecriture_lib,
             v.debit::text,
             v.credit::text,
             v.devise,
             v.i_piece
           ),
           E'\n' order by v.ecriture_date, v.ecriture_num, v.compte_num
         )
  into v_payload
  from public.vue_compta_fec_v1 v
  where split_part(v.journal_code_exercice, '-', 1)::integer = p_exercice;

  v_checksum := encode(extensions.digest(coalesce(v_payload, ''), 'sha256'), 'hex');

  insert into public.compta_fec_exports(exercice, checksum_sha256, chemin_fichier, genere_par)
  values (p_exercice, v_checksum, null, auth.uid());

  return query
  select
    v.journal_code_exercice,
    v.journal_code,
    v.journal_lib,
    v.ecriture_date,
    v.ecriture_num,
    v.piece_ref,
    v.piece_date,
    v.compte_num,
    v.compte_lib,
    v.comp_aux_lib,
    v.ecriture_lib,
    v.debit,
    v.credit,
    v.devise,
    v.i_piece
  from public.vue_compta_fec_v1 v
  where split_part(v.journal_code_exercice, '-', 1)::integer = p_exercice
  order by v.ecriture_date, v.ecriture_num, v.compte_num;
end;
$$;

create or replace function public.compta_import_mouvements_bancaires_json(
  p_items jsonb,
  p_compte_bancaire text default 'principal'
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_item jsonb;
  v_inserted integer := 0;
  v_hash text;
begin
  if p_items is null or jsonb_typeof(p_items) <> 'array' then
    raise exception 'Payload mouvements invalide (array JSON attendu).';
  end if;

  for v_item in
    select value from jsonb_array_elements(p_items)
  loop
    v_hash := encode(
      extensions.digest(
        coalesce(v_item->>'date_operation','') || '|' ||
        coalesce(v_item->>'libelle','') || '|' ||
        coalesce(v_item->>'montant','') || '|' ||
        coalesce(v_item->>'reference_banque','') || '|' ||
        coalesce(p_compte_bancaire,''),
        'sha256'
      ),
      'hex'
    );

    insert into public.mouvements_bancaires(
      date_operation,
      date_valeur,
      libelle,
      montant,
      solde_apres,
      reference_banque,
      compte_bancaire,
      statut,
      import_hash
    )
    values (
      (v_item->>'date_operation')::date,
      nullif(v_item->>'date_valeur','')::date,
      coalesce(nullif(v_item->>'libelle',''),'Mouvement bancaire'),
      coalesce((v_item->>'montant')::numeric, 0),
      nullif(v_item->>'solde_apres','')::numeric,
      nullif(v_item->>'reference_banque',''),
      p_compte_bancaire,
      'a_rapprocher',
      v_hash
    )
    on conflict (import_hash) do nothing;

    if found then
      v_inserted := v_inserted + 1;
    end if;
  end loop;

  return v_inserted;
end;
$$;