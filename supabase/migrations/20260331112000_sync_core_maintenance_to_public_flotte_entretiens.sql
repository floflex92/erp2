-- Synchronise l'historique atelier du schema core vers la table exploitee par l'ERP public.
-- Objectif: rendre visibles les entretiens du parc dans l'interface Atelier/Vehicules/Remorques.

do $$
begin
  if to_regclass('public.flotte_entretiens') is null then
    raise notice 'sync skipped: public.flotte_entretiens is missing';
    return;
  end if;

  if to_regclass('core.maintenance_history') is null then
    raise notice 'sync skipped: core.maintenance_history is missing';
    return;
  end if;

  insert into public.flotte_entretiens (
    id,
    vehicule_id,
    remorque_id,
    maintenance_type,
    service_date,
    km_compteur,
    cout_ht,
    cout_ttc,
    covered_by_contract,
    prestataire,
    garage,
    next_due_date,
    next_due_km,
    notes,
    invoice_document_id,
    created_by,
    created_at,
    updated_at
  )
  select
    mh.id,
    case when mh.vehicule_id is not null then mh.vehicule_id else null end,
    case when mh.vehicule_id is null and mh.remorque_id is not null then mh.remorque_id else null end,
    mh.type_maintenance,
    mh.date_debut,
    null,
    coalesce(mh.cout_euro, 0)::numeric(12,2),
    null,
    false,
    mh.technicien_nom,
    null,
    null,
    null,
    trim(both ' ' from concat_ws(' · ', mh.description, mh.notes)),
    null,
    null,
    mh.created_at,
    coalesce(mh.updated_at, mh.created_at)
  from core.maintenance_history mh
  where (
    mh.vehicule_id is not null and mh.remorque_id is null
  )
  or (
    mh.vehicule_id is null and mh.remorque_id is not null
  )
  on conflict (id) do nothing;
end $$;
