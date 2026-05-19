-- Refonte V2 - Foundation assets
-- Additif uniquement: aucun drop legacy.

create extension if not exists pgcrypto;

create table if not exists public.assets (
  id uuid primary key default gen_random_uuid(),
  company_id integer not null references public.companies(id) on delete restrict,
  type text not null check (type in ('vehicle','trailer','equipment')),
  ownership_type text not null check (ownership_type in ('owned','leased','subcontracted')),
  owner_kind text not null check (owner_kind in ('company','affreteur','third_party')),
  owner_ref_id uuid null,
  registration text null,
  fleet_number text null,
  status text not null default 'active' check (status in ('active','inactive','archived','maintenance')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists assets_company_registration_uidx
  on public.assets(company_id, registration)
  where registration is not null;

create unique index if not exists assets_company_fleet_number_uidx
  on public.assets(company_id, fleet_number)
  where fleet_number is not null;

create index if not exists assets_company_type_status_idx
  on public.assets(company_id, type, status, updated_at desc);

create table if not exists public.asset_vehicle_details (
  asset_id uuid primary key references public.assets(id) on delete cascade,
  company_id integer not null references public.companies(id) on delete restrict,
  brand text null,
  model text null,
  year integer null,
  ptac_kg numeric(12,2) null,
  capacity_charge_kg numeric(12,2) null,
  capacity_volume_m3 numeric(12,2) null,
  vin text null,
  registration_card_number text null,
  ct_expires_at date null,
  insurance_expires_at date null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.asset_trailer_details (
  asset_id uuid primary key references public.assets(id) on delete cascade,
  company_id integer not null references public.companies(id) on delete restrict,
  trailer_type text null,
  useful_load_kg numeric(12,2) null,
  length_m numeric(6,2) null,
  vin text null,
  registration_card_number text null,
  ct_expires_at date null,
  insurance_expires_at date null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.asset_assignments (
  id uuid primary key default gen_random_uuid(),
  company_id integer not null references public.companies(id) on delete restrict,
  asset_id uuid not null references public.assets(id) on delete cascade,
  person_id uuid not null references public.persons(id) on delete cascade,
  assignment_type text not null check (assignment_type in ('exclusive','shared','temporary')),
  starts_at timestamptz not null,
  ends_at timestamptz null,
  status text not null default 'active' check (status in ('active','ended','cancelled')),
  notes text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint asset_assignments_dates_chk
    check (ends_at is null or ends_at >= starts_at)
);

create index if not exists asset_assignments_company_asset_idx
  on public.asset_assignments(company_id, asset_id, status, starts_at desc);

create index if not exists asset_assignments_company_person_idx
  on public.asset_assignments(company_id, person_id, status, starts_at desc);

create table if not exists public.asset_km_readings (
  id uuid primary key default gen_random_uuid(),
  company_id integer not null references public.companies(id) on delete restrict,
  asset_id uuid not null references public.assets(id) on delete cascade,
  reading_date date not null,
  km_counter integer not null,
  source text null,
  notes text null,
  created_by uuid null references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint asset_km_readings_unique unique(asset_id, reading_date)
);

create index if not exists asset_km_readings_company_asset_idx
  on public.asset_km_readings(company_id, asset_id, reading_date desc);

-- Colonnes de transition legacy
alter table public.vehicules
  add column if not exists asset_id uuid null references public.assets(id) on delete set null;

alter table public.remorques
  add column if not exists asset_id uuid null references public.assets(id) on delete set null;

alter table public.flotte_documents
  add column if not exists asset_id uuid null references public.assets(id) on delete set null;

alter table public.vehicule_releves_km
  add column if not exists asset_id uuid null references public.assets(id) on delete set null;

alter table public.remorque_releves_km
  add column if not exists asset_id uuid null references public.assets(id) on delete set null;

create index if not exists vehicules_asset_id_idx on public.vehicules(asset_id);
create index if not exists remorques_asset_id_idx on public.remorques(asset_id);
