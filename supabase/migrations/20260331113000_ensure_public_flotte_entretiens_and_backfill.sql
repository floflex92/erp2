-- Garantit la presence de la table publique d'entretiens flotte pour l'ERP.
-- Puis backfill depuis core.maintenance_history pour afficher l'historique atelier.

create table if not exists public.flotte_entretiens (
  id uuid primary key default gen_random_uuid(),
  vehicule_id uuid null references public.vehicules(id) on delete cascade,
  remorque_id uuid null references public.remorques(id) on delete cascade,
  maintenance_type text not null,
  service_date date not null,
  km_compteur integer null,
  cout_ht numeric(12,2) not null default 0,
  cout_ttc numeric(12,2) null,
  covered_by_contract boolean not null default false,
  prestataire text null,
  garage text null,
  next_due_date date null,
  next_due_km integer null,
  notes text null,
  invoice_document_id uuid null,
  created_by uuid null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint flotte_entretiens_asset_check
    check (
      (vehicule_id is not null and remorque_id is null)
      or (vehicule_id is null and remorque_id is not null)
    )
);

create index if not exists flotte_entretiens_vehicule_idx on public.flotte_entretiens(vehicule_id);
create index if not exists flotte_entretiens_remorque_idx on public.flotte_entretiens(remorque_id);
create index if not exists flotte_entretiens_service_date_idx on public.flotte_entretiens(service_date);

alter table public.flotte_entretiens
  add column if not exists km_compteur integer null,
  add column if not exists cout_ttc numeric(12,2) null,
  add column if not exists covered_by_contract boolean not null default false,
  add column if not exists prestataire text null,
  add column if not exists garage text null,
  add column if not exists next_due_date date null,
  add column if not exists next_due_km integer null,
  add column if not exists notes text null,
  add column if not exists invoice_document_id uuid null,
  add column if not exists created_by uuid null,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

do $$
begin
  if to_regclass('core.maintenance_history') is null then
    raise notice 'backfill skipped: core.maintenance_history is missing';
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
