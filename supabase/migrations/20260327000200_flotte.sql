alter table public.vehicules
  add column if not exists numero_carte_grise text,
  add column if not exists vin text,
  add column if not exists date_mise_en_circulation date,
  add column if not exists date_achat date,
  add column if not exists cout_achat_ht numeric(12,2),
  add column if not exists type_propriete text,
  add column if not exists garantie_expiration date,
  add column if not exists contrat_entretien boolean not null default false,
  add column if not exists prestataire_entretien text,
  add column if not exists garage_entretien text;

alter table public.remorques
  add column if not exists numero_carte_grise text,
  add column if not exists vin text,
  add column if not exists date_mise_en_circulation date,
  add column if not exists date_achat date,
  add column if not exists cout_achat_ht numeric(12,2),
  add column if not exists type_propriete text,
  add column if not exists garantie_expiration date,
  add column if not exists contrat_entretien boolean not null default false,
  add column if not exists prestataire_entretien text,
  add column if not exists garage_entretien text;

create index if not exists vehicules_ct_expiration_idx on public.vehicules(ct_expiration);
create index if not exists vehicules_assurance_expiration_idx on public.vehicules(assurance_expiration);
create index if not exists remorques_ct_expiration_idx on public.remorques(ct_expiration);
create index if not exists remorques_assurance_expiration_idx on public.remorques(assurance_expiration);

create table if not exists public.flotte_documents (
  id uuid primary key default gen_random_uuid(),
  vehicule_id uuid null references public.vehicules(id) on delete cascade,
  remorque_id uuid null references public.remorques(id) on delete cascade,
  category text not null,
  title text not null,
  file_name text not null,
  mime_type text not null default 'application/pdf',
  storage_bucket text not null default 'flotte-documents',
  storage_path text not null unique,
  issued_at date null,
  expires_at date null,
  notes text null,
  uploaded_by uuid null references auth.users(id) on delete set null,
  archived_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint flotte_documents_asset_check
    check (
      (vehicule_id is not null and remorque_id is null)
      or (vehicule_id is null and remorque_id is not null)
    )
);

create index if not exists flotte_documents_vehicule_idx on public.flotte_documents(vehicule_id);
create index if not exists flotte_documents_remorque_idx on public.flotte_documents(remorque_id);
create index if not exists flotte_documents_expires_at_idx on public.flotte_documents(expires_at);

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
  invoice_document_id uuid null references public.flotte_documents(id) on delete set null,
  created_by uuid null references auth.users(id) on delete set null,
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
create index if not exists flotte_entretiens_next_due_date_idx on public.flotte_entretiens(next_due_date);

create table if not exists public.vehicule_releves_km (
  id uuid primary key default gen_random_uuid(),
  vehicule_id uuid not null references public.vehicules(id) on delete cascade,
  reading_date date not null,
  km_compteur integer not null,
  source text null,
  notes text null,
  created_by uuid null references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint vehicule_releves_km_unique unique (vehicule_id, reading_date)
);

create index if not exists vehicule_releves_km_vehicule_idx on public.vehicule_releves_km(vehicule_id, reading_date);

create or replace view public.vue_couts_flotte_mensuels as
select
  'vehicule'::text as asset_type,
  fe.vehicule_id as asset_id,
  date_trunc('month', fe.service_date)::date as month,
  sum(fe.cout_ht)::numeric(12,2) as total_cout_ht
from public.flotte_entretiens fe
where fe.vehicule_id is not null
group by fe.vehicule_id, date_trunc('month', fe.service_date)

union all

select
  'remorque'::text as asset_type,
  fe.remorque_id as asset_id,
  date_trunc('month', fe.service_date)::date as month,
  sum(fe.cout_ht)::numeric(12,2) as total_cout_ht
from public.flotte_entretiens fe
where fe.remorque_id is not null
group by fe.remorque_id, date_trunc('month', fe.service_date);

create or replace view public.vue_cout_kilometrique_vehicules as
with km_by_month as (
  select
    vr.vehicule_id,
    date_trunc('month', vr.reading_date)::date as month,
    max(vr.km_compteur) - min(vr.km_compteur) as km_parcourus
  from public.vehicule_releves_km vr
  group by vr.vehicule_id, date_trunc('month', vr.reading_date)
),
cost_by_month as (
  select
    fe.vehicule_id,
    date_trunc('month', fe.service_date)::date as month,
    sum(fe.cout_ht)::numeric(12,2) as cout_ht
  from public.flotte_entretiens fe
  where fe.vehicule_id is not null
  group by fe.vehicule_id, date_trunc('month', fe.service_date)
)
select
  coalesce(km.vehicule_id, cost.vehicule_id) as vehicule_id,
  coalesce(km.month, cost.month) as month,
  km.km_parcourus,
  cost.cout_ht,
  case
    when km.km_parcourus is null or km.km_parcourus <= 0 or cost.cout_ht is null then null
    else round((cost.cout_ht / km.km_parcourus)::numeric, 4)
  end as cout_km_ht
from km_by_month km
full outer join cost_by_month cost
  on cost.vehicule_id = km.vehicule_id
 and cost.month = km.month;

create or replace view public.vue_alertes_flotte as
select
  concat(v.id::text, ':ct') as id,
  'vehicule'::text as asset_type,
  v.id as asset_id,
  v.immatriculation as asset_label,
  'ct_expiration'::text as alert_type,
  'Controle technique a renouveler'::text as label,
  v.ct_expiration as due_on,
  (v.ct_expiration - current_date) as days_remaining
from public.vehicules v
where v.ct_expiration is not null

union all

select
  concat(v.id::text, ':assurance') as id,
  'vehicule'::text as asset_type,
  v.id as asset_id,
  v.immatriculation as asset_label,
  'assurance_expiration'::text as alert_type,
  'Assurance a renouveler'::text as label,
  v.assurance_expiration as due_on,
  (v.assurance_expiration - current_date) as days_remaining
from public.vehicules v
where v.assurance_expiration is not null

union all

select
  concat(r.id::text, ':ct') as id,
  'remorque'::text as asset_type,
  r.id as asset_id,
  r.immatriculation as asset_label,
  'ct_expiration'::text as alert_type,
  'Controle technique a renouveler'::text as label,
  r.ct_expiration as due_on,
  (r.ct_expiration - current_date) as days_remaining
from public.remorques r
where r.ct_expiration is not null

union all

select
  concat(r.id::text, ':assurance') as id,
  'remorque'::text as asset_type,
  r.id as asset_id,
  r.immatriculation as asset_label,
  'assurance_expiration'::text as alert_type,
  'Assurance a renouveler'::text as label,
  r.assurance_expiration as due_on,
  (r.assurance_expiration - current_date) as days_remaining
from public.remorques r
where r.assurance_expiration is not null

union all

select
  concat(fd.id::text, ':doc') as id,
  case when fd.vehicule_id is not null then 'vehicule' else 'remorque' end as asset_type,
  coalesce(fd.vehicule_id, fd.remorque_id) as asset_id,
  fd.title as asset_label,
  'document_expiration'::text as alert_type,
  'Document flotte a renouveler'::text as label,
  fd.expires_at as due_on,
  (fd.expires_at - current_date) as days_remaining
from public.flotte_documents fd
where fd.expires_at is not null
  and fd.archived_at is null;

alter table public.flotte_documents enable row level security;
alter table public.flotte_entretiens enable row level security;
alter table public.vehicule_releves_km enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'flotte_documents' and policyname = 'flotte_documents_rw_flotte'
  ) then
    create policy flotte_documents_rw_flotte
      on public.flotte_documents
      for all
      to authenticated
      using (public.current_app_role() in ('admin', 'dirigeant', 'exploitant', 'mecanicien'))
      with check (public.current_app_role() in ('admin', 'dirigeant', 'exploitant', 'mecanicien'));
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'flotte_entretiens' and policyname = 'flotte_entretiens_rw_flotte'
  ) then
    create policy flotte_entretiens_rw_flotte
      on public.flotte_entretiens
      for all
      to authenticated
      using (public.current_app_role() in ('admin', 'dirigeant', 'exploitant', 'mecanicien'))
      with check (public.current_app_role() in ('admin', 'dirigeant', 'exploitant', 'mecanicien'));
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'vehicule_releves_km' and policyname = 'vehicule_releves_km_rw_flotte'
  ) then
    create policy vehicule_releves_km_rw_flotte
      on public.vehicule_releves_km
      for all
      to authenticated
      using (public.current_app_role() in ('admin', 'dirigeant', 'exploitant', 'mecanicien'))
      with check (public.current_app_role() in ('admin', 'dirigeant', 'exploitant', 'mecanicien'));
  end if;
end $$;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('flotte-documents', 'flotte-documents', false, 20971520, array['application/pdf'])
on conflict (id) do nothing;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects' and policyname = 'flotte_documents_storage_select'
  ) then
    create policy flotte_documents_storage_select
      on storage.objects
      for select
      to authenticated
      using (
        bucket_id = 'flotte-documents'
        and public.current_app_role() in ('admin', 'dirigeant', 'exploitant', 'mecanicien')
      );
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects' and policyname = 'flotte_documents_storage_insert'
  ) then
    create policy flotte_documents_storage_insert
      on storage.objects
      for insert
      to authenticated
      with check (
        bucket_id = 'flotte-documents'
        and public.current_app_role() in ('admin', 'dirigeant', 'exploitant', 'mecanicien')
      );
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects' and policyname = 'flotte_documents_storage_update'
  ) then
    create policy flotte_documents_storage_update
      on storage.objects
      for update
      to authenticated
      using (
        bucket_id = 'flotte-documents'
        and public.current_app_role() in ('admin', 'dirigeant', 'exploitant', 'mecanicien')
      )
      with check (
        bucket_id = 'flotte-documents'
        and public.current_app_role() in ('admin', 'dirigeant', 'exploitant', 'mecanicien')
      );
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects' and policyname = 'flotte_documents_storage_delete'
  ) then
    create policy flotte_documents_storage_delete
      on storage.objects
      for delete
      to authenticated
      using (
        bucket_id = 'flotte-documents'
        and public.current_app_role() in ('admin', 'dirigeant', 'exploitant', 'mecanicien')
      );
  end if;
end $$;
