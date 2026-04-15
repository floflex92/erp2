-- Refonte V2 - Completion phases 3 -> 7 (additif)
-- Objectif: completer les pivots manquants, backfill progressif, transition hybride et RLS.
-- Regles: aucun drop, aucun rename brutal, aucune suppression legacy.

create extension if not exists pgcrypto;
create schema if not exists refonte_v2;

-- ============================================================
-- PHASE 3 - Pivots manquants + referentiels
-- ============================================================

alter table if exists public.persons
  add column if not exists business_key text null;

create unique index if not exists persons_company_business_key_uidx
  on public.persons(company_id, business_key)
  where business_key is not null;

create table if not exists public.person_profiles (
  id uuid primary key default gen_random_uuid(),
  company_id integer not null references public.companies(id) on delete restrict,
  person_id uuid not null references public.persons(id) on delete cascade,
  profil_id uuid null references public.profils(id) on delete set null,
  role_code text not null,
  display_name text null,
  is_primary boolean not null default true,
  is_active boolean not null default true,
  business_key text null,
  source_table text null,
  source_id uuid null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint person_profiles_source_pair_chk
    check ((source_table is null and source_id is null) or (source_table is not null and source_id is not null))
);

create unique index if not exists person_profiles_company_business_key_uidx
  on public.person_profiles(company_id, business_key)
  where business_key is not null;

create unique index if not exists person_profiles_company_profil_uidx
  on public.person_profiles(company_id, profil_id)
  where profil_id is not null;

create index if not exists person_profiles_person_idx
  on public.person_profiles(person_id, is_active, updated_at desc);

alter table if exists public.person_employment
  add column if not exists business_key text null,
  add column if not exists source_table text null,
  add column if not exists source_id uuid null;

create unique index if not exists person_employment_company_business_key_uidx
  on public.person_employment(company_id, business_key)
  where business_key is not null;

alter table if exists public.person_driver_details
  add column if not exists business_key text null,
  add column if not exists source_table text null,
  add column if not exists source_id uuid null;

create unique index if not exists person_driver_details_company_business_key_uidx
  on public.person_driver_details(company_id, business_key)
  where business_key is not null;

alter table if exists public.assets
  add column if not exists business_key text null;

create unique index if not exists assets_company_business_key_uidx
  on public.assets(company_id, business_key)
  where business_key is not null;

alter table if exists public.asset_vehicle_details
  add column if not exists business_key text null;

create unique index if not exists asset_vehicle_details_company_business_key_uidx
  on public.asset_vehicle_details(company_id, business_key)
  where business_key is not null;

alter table if exists public.asset_trailer_details
  add column if not exists business_key text null;

create unique index if not exists asset_trailer_details_company_business_key_uidx
  on public.asset_trailer_details(company_id, business_key)
  where business_key is not null;

alter table if exists public.documents
  add column if not exists business_key text null;

create unique index if not exists documents_company_business_key_uidx
  on public.documents(company_id, business_key)
  where business_key is not null;

alter table if exists public.document_links
  add column if not exists company_id integer null references public.companies(id) on delete cascade,
  add column if not exists link_status text not null default 'active' check (link_status in ('active','archived')),
  add column if not exists business_key text null,
  add column if not exists created_by uuid null references auth.users(id) on delete set null;

do $$
begin
  if exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_name = 'document_links'
  ) then
    execute 'create unique index if not exists document_links_company_business_key_uidx on public.document_links(company_id, business_key) where business_key is not null';
    execute 'create index if not exists document_links_company_entity_idx on public.document_links(company_id, entity_type, entity_id)';

    execute '
      update public.document_links dl
      set company_id = d.company_id
      from public.documents d
      where dl.document_id = d.id
        and dl.company_id is null
    ';
  end if;
end
$$;

create table if not exists public.document_versions (
  id uuid primary key default gen_random_uuid(),
  company_id integer not null references public.companies(id) on delete restrict,
  document_id uuid not null references public.documents(id) on delete cascade,
  version_no integer not null,
  storage_bucket text not null,
  storage_path text not null,
  checksum_sha256 text null,
  file_size_bytes bigint null,
  mime_type text null,
  change_note text null,
  uploaded_by uuid null references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  business_key text null,
  source_table text null,
  source_id uuid null,
  constraint document_versions_version_positive_chk check (version_no >= 1),
  constraint document_versions_unique_version unique (document_id, version_no)
);

create unique index if not exists document_versions_company_business_key_uidx
  on public.document_versions(company_id, business_key)
  where business_key is not null;

create unique index if not exists document_versions_storage_uidx
  on public.document_versions(storage_bucket, storage_path);

create index if not exists document_versions_company_document_idx
  on public.document_versions(company_id, document_id, version_no desc);

create table if not exists public.entity_history (
  id uuid primary key default gen_random_uuid(),
  company_id integer not null references public.companies(id) on delete cascade,
  entity_type text not null,
  entity_id uuid not null,
  event_type text not null,
  changed_by uuid null references auth.users(id) on delete set null,
  source_table text null,
  source_id uuid null,
  before_payload jsonb null,
  after_payload jsonb null,
  correlation_id uuid null,
  event_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  business_key text null,
  constraint entity_history_source_pair_chk
    check ((source_table is null and source_id is null) or (source_table is not null and source_id is not null))
);

create unique index if not exists entity_history_company_business_key_uidx
  on public.entity_history(company_id, business_key)
  where business_key is not null;

create index if not exists entity_history_company_entity_idx
  on public.entity_history(company_id, entity_type, entity_id, event_at desc);

create index if not exists entity_history_company_event_idx
  on public.entity_history(company_id, event_type, event_at desc);

create table if not exists public.ref_roles (
  id uuid primary key default gen_random_uuid(),
  company_id integer null references public.companies(id) on delete cascade,
  code text not null,
  label text not null,
  sort_order integer not null default 100,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ref_roles_company_code_unique unique (company_id, code)
);

insert into public.ref_roles(company_id, code, label, sort_order)
values
  (null, 'admin', 'Administrateur', 10),
  (null, 'dirigeant', 'Dirigeant', 20),
  (null, 'exploitant', 'Exploitant', 30),
  (null, 'rh', 'Ressources humaines', 40),
  (null, 'conducteur', 'Conducteur', 50),
  (null, 'affreteur', 'Affreteur', 60)
on conflict (company_id, code) do nothing;

-- ============================================================
-- PHASE 4 - Backfill progressif avec trace
-- ============================================================

-- Profils -> persons + person_profiles
insert into public.persons (
  company_id, first_name, last_name, person_type, matricule, email, status, business_key
)
select
  coalesce(p.company_id, 1),
  p.prenom,
  p.nom,
  case when p.role = 'conducteur' then 'driver' else 'employee' end,
  case
    when nullif(trim(p.matricule), '') is null then null
    when exists (
      select 1
      from public.persons px
      where px.company_id = coalesce(p.company_id, 1)
        and px.matricule = nullif(trim(p.matricule), '')
    ) then null
    when exists (
      select 1
      from public.profils p2
      where p2.id <> p.id
        and coalesce(p2.company_id, 1) = coalesce(p.company_id, 1)
        and nullif(trim(p2.matricule), '') = nullif(trim(p.matricule), '')
    ) then null
    else nullif(trim(p.matricule), '')
  end,
  null,
  case when coalesce(p.is_active, true) then 'active' else 'inactive' end,
  'profils:' || p.id::text
from public.profils p
where not exists (
  select 1
  from public.persons x
  where x.company_id = coalesce(p.company_id, 1)
    and x.business_key = 'profils:' || p.id::text
);

update public.profils p
set person_id = x.id
from public.persons x
where x.company_id = coalesce(p.company_id, 1)
  and x.business_key = 'profils:' || p.id::text
  and p.person_id is distinct from x.id;

insert into public.person_profiles (
  company_id, person_id, profil_id, role_code, display_name, is_primary, is_active,
  business_key, source_table, source_id
)
select
  coalesce(p.company_id, 1),
  p.person_id,
  p.id,
  p.role,
  trim(concat_ws(' ', p.prenom, p.nom)),
  true,
  coalesce(p.is_active, true),
  'person_profiles:profils:' || p.id::text,
  'profils',
  p.id
from public.profils p
where p.person_id is not null
  and not exists (
    select 1
    from public.person_profiles pp
    where pp.company_id = coalesce(p.company_id, 1)
      and pp.business_key = 'person_profiles:profils:' || p.id::text
  );

-- Conducteurs -> persons + person_driver_details
insert into public.persons (
  company_id, first_name, last_name, person_type, matricule, email, phone, status, business_key
)
select
  coalesce(c.company_id, 1),
  c.prenom,
  c.nom,
  'driver',
  case
    when nullif(trim(c.matricule), '') is null then null
    when exists (
      select 1
      from public.persons px
      where px.company_id = coalesce(c.company_id, 1)
        and px.matricule = nullif(trim(c.matricule), '')
    ) then null
    when exists (
      select 1
      from public.conducteurs c2
      where c2.id <> c.id
        and coalesce(c2.company_id, 1) = coalesce(c.company_id, 1)
        and nullif(trim(c2.matricule), '') = nullif(trim(c.matricule), '')
    ) then null
    else nullif(trim(c.matricule), '')
  end,
  nullif(trim(c.email), ''),
  nullif(trim(c.telephone), ''),
  case when coalesce(c.statut, 'actif') = 'actif' then 'active' else 'inactive' end,
  'conducteurs:' || c.id::text
from public.conducteurs c
where not exists (
  select 1
  from public.persons x
  where x.company_id = coalesce(c.company_id, 1)
    and x.business_key = 'conducteurs:' || c.id::text
);

update public.conducteurs c
set person_id = x.id
from public.persons x
where x.company_id = coalesce(c.company_id, 1)
  and x.business_key = 'conducteurs:' || c.id::text
  and c.person_id is distinct from x.id;

insert into public.person_driver_details (
  person_id,
  company_id,
  license_number,
  license_categories,
  license_expires_at,
  tachy_card_number,
  tachy_card_expires_at,
  fimo_date,
  fco_date,
  fco_expires_at,
  medical_visit_expires_at,
  is_active,
  business_key,
  source_table,
  source_id
)
select
  c.person_id,
  coalesce(c.company_id, 1),
  c.numero_permis,
  c.permis_categories,
  c.permis_expiration,
  c.carte_tachy_numero,
  c.carte_tachy_expiration,
  c.fimo_date,
  c.fco_date,
  c.fco_expiration,
  c.visite_medicale_expiration,
  coalesce(c.statut, 'actif') = 'actif',
  'person_driver_details:conducteurs:' || c.id::text,
  'conducteurs',
  c.id
from public.conducteurs c
where c.person_id is not null
  and not exists (
    select 1
    from public.person_driver_details d
    where d.company_id = coalesce(c.company_id, 1)
      and d.business_key = 'person_driver_details:conducteurs:' || c.id::text
  );

-- Employee directory -> person_employment
insert into public.persons (
  company_id, first_name, last_name, person_type, matricule, email, status, business_key
)
select
  coalesce(e.company_id, 1),
  e.first_name,
  e.last_name,
  'employee',
  case
    when nullif(trim(e.matricule), '') is null then null
    when exists (
      select 1
      from public.persons px
      where px.company_id = coalesce(e.company_id, 1)
        and px.matricule = nullif(trim(e.matricule), '')
    ) then null
    when exists (
      select 1
      from public.employee_directory e2
      where e2.id <> e.id
        and coalesce(e2.company_id, 1) = coalesce(e.company_id, 1)
        and nullif(trim(e2.matricule), '') = nullif(trim(e.matricule), '')
    ) then null
    else nullif(trim(e.matricule), '')
  end,
  nullif(trim(coalesce(e.professional_email, e.personal_email)), ''),
  case when coalesce(e.departure_at, null) is null then 'active' else 'inactive' end,
  'employee_directory:' || e.id::text
from public.employee_directory e
where not exists (
  select 1
  from public.persons x
  where x.company_id = coalesce(e.company_id, 1)
    and x.business_key = 'employee_directory:' || e.id::text
);

update public.employee_directory e
set person_id = x.id
from public.persons x
where x.company_id = coalesce(e.company_id, 1)
  and x.business_key = 'employee_directory:' || e.id::text
  and e.person_id is distinct from x.id;

insert into public.person_employment (
  person_id,
  company_id,
  employment_status_code,
  hire_date,
  departure_at,
  departure_reason,
  business_key,
  source_table,
  source_id
)
select
  e.person_id,
  coalesce(e.company_id, 1),
  e.employment_status,
  e.hire_date,
  e.departure_at,
  e.departure_reason,
  'person_employment:employee_directory:' || e.id::text,
  'employee_directory',
  e.id
from public.employee_directory e
where e.person_id is not null
  and not exists (
    select 1
    from public.person_employment pe
    where pe.company_id = coalesce(e.company_id, 1)
      and pe.business_key = 'person_employment:employee_directory:' || e.id::text
  );

-- Vehicules -> assets + details
insert into public.assets (
  company_id, type, ownership_type, owner_kind, registration, fleet_number, status, business_key
)
select
  coalesce(v.company_id, 1),
  'vehicle',
  case when coalesce(v.type_propriete, 'owned') in ('leasing', 'leased') then 'leased' else 'owned' end,
  'company',
  case
    when nullif(trim(v.immatriculation), '') is null then null
    when exists (
      select 1
      from public.assets ax
      where ax.company_id = coalesce(v.company_id, 1)
        and ax.registration = nullif(trim(v.immatriculation), '')
    ) then null
    when exists (
      select 1
      from public.vehicules v2
      where v2.id <> v.id
        and coalesce(v2.company_id, 1) = coalesce(v.company_id, 1)
        and nullif(trim(v2.immatriculation), '') = nullif(trim(v.immatriculation), '')
    ) then null
    else nullif(trim(v.immatriculation), '')
  end,
  case
    when nullif(trim(v.numero_parc), '') is null then null
    when exists (
      select 1
      from public.assets ax
      where ax.company_id = coalesce(v.company_id, 1)
        and ax.fleet_number = nullif(trim(v.numero_parc), '')
    ) then null
    when exists (
      select 1
      from public.vehicules v2
      where v2.id <> v.id
        and coalesce(v2.company_id, 1) = coalesce(v.company_id, 1)
        and nullif(trim(v2.numero_parc), '') = nullif(trim(v.numero_parc), '')
    ) then null
    else nullif(trim(v.numero_parc), '')
  end,
  case when coalesce(v.statut, 'actif') in ('hors_service', 'inactif') then 'inactive' when coalesce(v.statut, '') = 'maintenance' then 'maintenance' else 'active' end,
  'vehicules:' || v.id::text
from public.vehicules v
where not exists (
  select 1
  from public.assets a
  where a.company_id = coalesce(v.company_id, 1)
    and a.business_key = 'vehicules:' || v.id::text
);

update public.vehicules v
set asset_id = a.id
from public.assets a
where a.company_id = coalesce(v.company_id, 1)
  and a.business_key = 'vehicules:' || v.id::text
  and v.asset_id is distinct from a.id;

insert into public.asset_vehicle_details (
  asset_id, company_id, brand, model, year, ptac_kg, capacity_charge_kg, capacity_volume_m3,
  vin, registration_card_number, ct_expires_at, insurance_expires_at, business_key
)
select
  v.asset_id,
  coalesce(v.company_id, 1),
  v.marque,
  v.modele,
  v.annee,
  v.ptac_kg,
  v.capacite_charge_kg,
  v.capacite_volume_m3,
  v.vin,
  v.numero_carte_grise,
  v.ct_expiration,
  v.assurance_expiration,
  'asset_vehicle_details:vehicules:' || v.id::text
from public.vehicules v
where v.asset_id is not null
  and not exists (
    select 1
    from public.asset_vehicle_details d
    where d.company_id = coalesce(v.company_id, 1)
      and d.business_key = 'asset_vehicle_details:vehicules:' || v.id::text
  );

-- Remorques -> assets + details
insert into public.assets (
  company_id, type, ownership_type, owner_kind, registration, fleet_number, status, business_key
)
select
  coalesce(r.company_id, 1),
  'trailer',
  case when coalesce(r.type_propriete, 'owned') in ('leasing', 'leased') then 'leased' else 'owned' end,
  'company',
  case
    when nullif(trim(r.immatriculation), '') is null then null
    when exists (
      select 1
      from public.assets ax
      where ax.company_id = coalesce(r.company_id, 1)
        and ax.registration = nullif(trim(r.immatriculation), '')
    ) then null
    when exists (
      select 1
      from public.remorques r2
      where r2.id <> r.id
        and coalesce(r2.company_id, 1) = coalesce(r.company_id, 1)
        and nullif(trim(r2.immatriculation), '') = nullif(trim(r.immatriculation), '')
    ) then null
    else nullif(trim(r.immatriculation), '')
  end,
  null,
  case when coalesce(r.statut, 'actif') in ('hors_service', 'inactif') then 'inactive' when coalesce(r.statut, '') = 'maintenance' then 'maintenance' else 'active' end,
  'remorques:' || r.id::text
from public.remorques r
where not exists (
  select 1
  from public.assets a
  where a.company_id = coalesce(r.company_id, 1)
    and a.business_key = 'remorques:' || r.id::text
);

update public.remorques r
set asset_id = a.id
from public.assets a
where a.company_id = coalesce(r.company_id, 1)
  and a.business_key = 'remorques:' || r.id::text
  and r.asset_id is distinct from a.id;

insert into public.asset_trailer_details (
  asset_id, company_id, trailer_type, useful_load_kg, length_m, vin,
  registration_card_number, ct_expires_at, insurance_expires_at, business_key
)
select
  r.asset_id,
  coalesce(r.company_id, 1),
  r.type_remorque,
  r.charge_utile_kg,
  r.longueur_m,
  r.vin,
  r.numero_carte_grise,
  r.ct_expiration,
  r.assurance_expiration,
  'asset_trailer_details:remorques:' || r.id::text
from public.remorques r
where r.asset_id is not null
  and not exists (
    select 1
    from public.asset_trailer_details d
    where d.company_id = coalesce(r.company_id, 1)
      and d.business_key = 'asset_trailer_details:remorques:' || r.id::text
  );

-- Trace mapping explicite
insert into refonte_v2.map_person_legacy (company_id, source_table, source_id, person_id, mapping_status, mapped_at)
select coalesce(p.company_id, 1), 'profils', p.id, p.person_id, 'mapped', now()
from public.profils p
where p.person_id is not null
on conflict (source_table, source_id) do update
set person_id = excluded.person_id,
    mapping_status = 'mapped',
    conflict_reason = null,
    mapped_at = now();

insert into refonte_v2.map_person_legacy (company_id, source_table, source_id, person_id, mapping_status, mapped_at)
select coalesce(c.company_id, 1), 'conducteurs', c.id, c.person_id, 'mapped', now()
from public.conducteurs c
where c.person_id is not null
on conflict (source_table, source_id) do update
set person_id = excluded.person_id,
    mapping_status = 'mapped',
    conflict_reason = null,
    mapped_at = now();

insert into refonte_v2.map_person_legacy (company_id, source_table, source_id, person_id, mapping_status, mapped_at)
select coalesce(e.company_id, 1), 'employee_directory', e.id, e.person_id, 'mapped', now()
from public.employee_directory e
where e.person_id is not null
on conflict (source_table, source_id) do update
set person_id = excluded.person_id,
    mapping_status = 'mapped',
    conflict_reason = null,
    mapped_at = now();

insert into refonte_v2.map_asset_legacy (company_id, source_table, source_id, asset_id, mapping_status, mapped_at)
select coalesce(v.company_id, 1), 'vehicules', v.id, v.asset_id, 'mapped', now()
from public.vehicules v
where v.asset_id is not null
on conflict (source_table, source_id) do update
set asset_id = excluded.asset_id,
    mapping_status = 'mapped',
    conflict_reason = null,
    mapped_at = now();

insert into refonte_v2.map_asset_legacy (company_id, source_table, source_id, asset_id, mapping_status, mapped_at)
select coalesce(r.company_id, 1), 'remorques', r.id, r.asset_id, 'mapped', now()
from public.remorques r
where r.asset_id is not null
on conflict (source_table, source_id) do update
set asset_id = excluded.asset_id,
    mapping_status = 'mapped',
    conflict_reason = null,
    mapped_at = now();

-- ============================================================
-- PHASE 5 - Strategie transition safe (lecture hybride + traces)
-- ============================================================

create or replace view public.v_persons_legacy_bridge
with (security_invoker = true) as
select
  p.id as legacy_profil_id,
  p.user_id,
  p.role,
  p.nom,
  p.prenom,
  p.company_id,
  p.person_id,
  pp.id as person_profile_id,
  ps.status as person_status,
  ps.email as person_email,
  ps.phone as person_phone,
  ps.matricule as person_matricule
from public.profils p
left join public.person_profiles pp on pp.profil_id = p.id
left join public.persons ps on ps.id = p.person_id;

create or replace view public.v_assets_legacy_bridge
with (security_invoker = true) as
select
  v.id as vehicule_id,
  v.asset_id,
  v.company_id,
  v.immatriculation,
  a.status as asset_status,
  a.ownership_type,
  a.owner_kind
from public.vehicules v
left join public.assets a on a.id = v.asset_id
union all
select
  r.id as vehicule_id,
  r.asset_id,
  r.company_id,
  r.immatriculation,
  a.status as asset_status,
  a.ownership_type,
  a.owner_kind
from public.remorques r
left join public.assets a on a.id = r.asset_id;

-- Double ecriture minimale: conducteurs -> person_driver_details
create or replace function refonte_v2.sync_conducteur_to_person_driver_details()
returns trigger
language plpgsql
security definer
set search_path = public, refonte_v2
as $$
begin
  if new.person_id is null then
    return new;
  end if;

  insert into public.person_driver_details (
    person_id,
    company_id,
    license_number,
    license_categories,
    license_expires_at,
    tachy_card_number,
    tachy_card_expires_at,
    fimo_date,
    fco_date,
    fco_expires_at,
    medical_visit_expires_at,
    is_active,
    business_key,
    source_table,
    source_id,
    updated_at
  )
  values (
    new.person_id,
    coalesce(new.company_id, 1),
    new.numero_permis,
    new.permis_categories,
    new.permis_expiration,
    new.carte_tachy_numero,
    new.carte_tachy_expiration,
    new.fimo_date,
    new.fco_date,
    new.fco_expiration,
    new.visite_medicale_expiration,
    coalesce(new.statut, 'actif') = 'actif',
    'person_driver_details:conducteurs:' || new.id::text,
    'conducteurs',
    new.id,
    now()
  )
  on conflict (company_id, business_key)
  do update set
    license_number = excluded.license_number,
    license_categories = excluded.license_categories,
    license_expires_at = excluded.license_expires_at,
    tachy_card_number = excluded.tachy_card_number,
    tachy_card_expires_at = excluded.tachy_card_expires_at,
    fimo_date = excluded.fimo_date,
    fco_date = excluded.fco_date,
    fco_expires_at = excluded.fco_expires_at,
    medical_visit_expires_at = excluded.medical_visit_expires_at,
    is_active = excluded.is_active,
    updated_at = now();

  return new;
end;
$$;

drop trigger if exists trg_sync_conducteur_to_person_driver_details on public.conducteurs;
create trigger trg_sync_conducteur_to_person_driver_details
after insert or update on public.conducteurs
for each row
execute function refonte_v2.sync_conducteur_to_person_driver_details();

-- ============================================================
-- PHASE 7 - RLS sur pivots V2
-- ============================================================

alter table public.person_profiles enable row level security;
alter table public.document_versions enable row level security;
alter table public.entity_history enable row level security;
alter table public.ref_roles enable row level security;

create or replace function refonte_v2.safe_current_role()
returns text
language plpgsql
stable
security definer
set search_path = public, refonte_v2
as $$
declare
  v_role text;
begin
  begin
    execute 'select public.current_app_role()' into v_role;
  exception when undefined_function then
    v_role := null;
  end;

  if v_role is null then
    begin
      execute 'select public.get_user_role()' into v_role;
    exception when undefined_function then
      v_role := null;
    end;
  end if;

  if v_role is null then
    select p.role
    into v_role
    from public.profils p
    where p.user_id = auth.uid()
    limit 1;
  end if;

  return coalesce(v_role, 'observateur');
end;
$$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'person_profiles' and policyname = 'person_profiles_select_own_company'
  ) then
    create policy person_profiles_select_own_company
      on public.person_profiles
      for select
      to authenticated
      using (company_id = public.my_company_id());
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'person_profiles' and policyname = 'person_profiles_write_admin_rh'
  ) then
    create policy person_profiles_write_admin_rh
      on public.person_profiles
      for all
      to authenticated
      using (
        company_id = public.my_company_id()
        and refonte_v2.safe_current_role() in ('admin', 'dirigeant', 'rh')
      )
      with check (
        company_id = public.my_company_id()
        and refonte_v2.safe_current_role() in ('admin', 'dirigeant', 'rh')
      );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'document_versions' and policyname = 'document_versions_select_own_company'
  ) then
    create policy document_versions_select_own_company
      on public.document_versions
      for select
      to authenticated
      using (company_id = public.my_company_id());
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'document_versions' and policyname = 'document_versions_write_allowed_roles'
  ) then
    create policy document_versions_write_allowed_roles
      on public.document_versions
      for all
      to authenticated
      using (
        company_id = public.my_company_id()
        and refonte_v2.safe_current_role() in ('admin', 'dirigeant', 'rh', 'exploitant')
      )
      with check (
        company_id = public.my_company_id()
        and refonte_v2.safe_current_role() in ('admin', 'dirigeant', 'rh', 'exploitant')
      );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'entity_history' and policyname = 'entity_history_select_own_company'
  ) then
    create policy entity_history_select_own_company
      on public.entity_history
      for select
      to authenticated
      using (company_id = public.my_company_id());
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'entity_history' and policyname = 'entity_history_insert_allowed_roles'
  ) then
    create policy entity_history_insert_allowed_roles
      on public.entity_history
      for insert
      to authenticated
      with check (
        company_id = public.my_company_id()
        and refonte_v2.safe_current_role() in ('admin', 'dirigeant', 'rh', 'exploitant', 'conducteur', 'affreteur')
      );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'entity_history' and policyname = 'entity_history_update_admin_only'
  ) then
    create policy entity_history_update_admin_only
      on public.entity_history
      for update
      to authenticated
      using (
        company_id = public.my_company_id()
        and refonte_v2.safe_current_role() in ('admin', 'dirigeant')
      )
      with check (
        company_id = public.my_company_id()
        and refonte_v2.safe_current_role() in ('admin', 'dirigeant')
      );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'ref_roles' and policyname = 'ref_roles_select_own_or_global'
  ) then
    create policy ref_roles_select_own_or_global
      on public.ref_roles
      for select
      to authenticated
      using (company_id is null or company_id = public.my_company_id());
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'ref_roles' and policyname = 'ref_roles_write_admin_only'
  ) then
    create policy ref_roles_write_admin_only
      on public.ref_roles
      for all
      to authenticated
      using (
        company_id is null
        or (
          company_id = public.my_company_id()
          and refonte_v2.safe_current_role() in ('admin', 'dirigeant')
        )
      )
      with check (
        company_id is null
        or (
          company_id = public.my_company_id()
          and refonte_v2.safe_current_role() in ('admin', 'dirigeant')
        )
      );
  end if;
end
$$;

-- KPI de suivi post-migration
insert into refonte_v2.migration_kpis_daily(day, company_id, kpi_code, kpi_value)
select current_date, c.id, 'person_profiles_count', count(pp.id)::numeric
from public.companies c
left join public.person_profiles pp on pp.company_id = c.id
group by c.id
on conflict (day, company_id, kpi_code) do update
set kpi_value = excluded.kpi_value,
    created_at = now();

insert into refonte_v2.migration_kpis_daily(day, company_id, kpi_code, kpi_value)
select current_date, c.id, 'document_versions_count', count(dv.id)::numeric
from public.companies c
left join public.document_versions dv on dv.company_id = c.id
group by c.id
on conflict (day, company_id, kpi_code) do update
set kpi_value = excluded.kpi_value,
    created_at = now();
