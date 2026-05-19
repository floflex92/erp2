-- Refonte V2 - Foundation persons
-- Additif uniquement: aucun drop legacy.

create extension if not exists pgcrypto;

create table if not exists public.persons (
  id uuid primary key default gen_random_uuid(),
  company_id integer not null references public.companies(id) on delete restrict,
  first_name text null,
  last_name text null,
  person_type text not null check (person_type in ('employee','driver','admin','external')),
  matricule text null,
  email text null,
  phone text null,
  status text not null default 'active' check (status in ('active','inactive','archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists persons_company_matricule_uidx
  on public.persons(company_id, matricule)
  where matricule is not null;

create index if not exists persons_company_status_idx
  on public.persons(company_id, status, updated_at desc);

create index if not exists persons_company_email_idx
  on public.persons(company_id, lower(email))
  where email is not null;

create table if not exists public.person_employment (
  id uuid primary key default gen_random_uuid(),
  person_id uuid not null references public.persons(id) on delete cascade,
  company_id integer not null references public.companies(id) on delete restrict,
  employment_status_code text null,
  hire_date date null,
  departure_at date null,
  departure_reason text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint person_employment_dates_chk
    check (departure_at is null or hire_date is null or departure_at >= hire_date)
);

create index if not exists person_employment_person_idx
  on public.person_employment(person_id);

create index if not exists person_employment_company_status_idx
  on public.person_employment(company_id, employment_status_code, updated_at desc);

create table if not exists public.person_driver_details (
  id uuid primary key default gen_random_uuid(),
  person_id uuid not null references public.persons(id) on delete cascade,
  company_id integer not null references public.companies(id) on delete restrict,
  license_number text null,
  license_categories text[] null,
  license_expires_at date null,
  tachy_card_number text null,
  tachy_card_expires_at date null,
  fimo_date date null,
  fco_date date null,
  fco_expires_at date null,
  medical_visit_expires_at date null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists person_driver_details_person_idx
  on public.person_driver_details(person_id);

create index if not exists person_driver_details_company_active_idx
  on public.person_driver_details(company_id, is_active, updated_at desc);

-- Colonnes de transition legacy
alter table public.profils
  add column if not exists person_id uuid null references public.persons(id) on delete set null;

alter table public.conducteurs
  add column if not exists person_id uuid null references public.persons(id) on delete set null;

alter table public.employee_directory
  add column if not exists person_id uuid null references public.persons(id) on delete set null;

create index if not exists profils_person_id_idx on public.profils(person_id);
create index if not exists conducteurs_person_id_idx on public.conducteurs(person_id);
create index if not exists employee_directory_person_id_idx on public.employee_directory(person_id);

-- Optional seed from existing profiles (idempotent best-effort)
insert into public.persons (company_id, first_name, last_name, person_type, matricule, email, phone, status)
select
  coalesce(p.company_id, 1),
  p.prenom,
  p.nom,
  case when p.role = 'conducteur' then 'driver' else 'employee' end,
  nullif(p.matricule, ''),
  null,
  null,
  case when coalesce(p.is_active, true) then 'active' else 'inactive' end
from public.profils p
where not exists (
  select 1
  from public.persons x
  where x.company_id = coalesce(p.company_id, 1)
    and x.first_name is not distinct from p.prenom
    and x.last_name is not distinct from p.nom
    and x.matricule is not distinct from nullif(p.matricule, '')
);
