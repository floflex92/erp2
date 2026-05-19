-- Refonte V2 - Foundation refs + uniqueness
-- Additif uniquement.

create extension if not exists pgcrypto;

create table if not exists public.ref_transport_status (
  id uuid primary key default gen_random_uuid(),
  company_id integer null references public.companies(id) on delete cascade,
  code text not null,
  label text not null,
  sort_order integer not null default 100,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ref_transport_status_company_code_unique unique (company_id, code)
);

create table if not exists public.ref_transport_types (
  id uuid primary key default gen_random_uuid(),
  company_id integer null references public.companies(id) on delete cascade,
  code text not null,
  label text not null,
  sort_order integer not null default 100,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ref_transport_types_company_code_unique unique (company_id, code)
);

create table if not exists public.ref_absence_types (
  id uuid primary key default gen_random_uuid(),
  company_id integer null references public.companies(id) on delete cascade,
  code text not null,
  label text not null,
  sort_order integer not null default 100,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ref_absence_types_company_code_unique unique (company_id, code)
);

create table if not exists public.ref_asset_types (
  id uuid primary key default gen_random_uuid(),
  company_id integer null references public.companies(id) on delete cascade,
  code text not null,
  label text not null,
  sort_order integer not null default 100,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ref_asset_types_company_code_unique unique (company_id, code)
);

create table if not exists public.ref_document_types (
  id uuid primary key default gen_random_uuid(),
  company_id integer null references public.companies(id) on delete cascade,
  code text not null,
  label text not null,
  sort_order integer not null default 100,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ref_document_types_company_code_unique unique (company_id, code)
);

create table if not exists public.ref_priority_levels (
  id uuid primary key default gen_random_uuid(),
  company_id integer null references public.companies(id) on delete cascade,
  code text not null,
  label text not null,
  sort_order integer not null default 100,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ref_priority_levels_company_code_unique unique (company_id, code)
);

create table if not exists public.ref_employment_status (
  id uuid primary key default gen_random_uuid(),
  company_id integer null references public.companies(id) on delete cascade,
  code text not null,
  label text not null,
  sort_order integer not null default 100,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ref_employment_status_company_code_unique unique (company_id, code)
);

-- Uniqueness metier tenant-level
create unique index if not exists ordres_transport_company_reference_uidx
  on public.ordres_transport(company_id, reference);

create unique index if not exists factures_company_numero_uidx
  on public.factures(company_id, numero);

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'devis_transport'
      and column_name = 'company_id'
  ) then
    execute 'create unique index if not exists devis_transport_company_numero_uidx on public.devis_transport(company_id, numero)';
  elsif exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'devis_transport'
      and column_name = 'client_id'
  ) then
    -- Fallback legacy: unicite par client tant que company_id n existe pas.
    execute 'create unique index if not exists devis_transport_client_numero_uidx on public.devis_transport(client_id, numero)';
  end if;
end
$$;

-- Profils legacy: aligner matricule a l unicite tenant-level
-- Note: supprimer l index global existant apres verification collisions.
create unique index if not exists profils_company_matricule_uidx
  on public.profils(company_id, matricule)
  where matricule is not null;

-- Assets (si foundation assets deja applique)
create unique index if not exists assets_company_registration_uidx
  on public.assets(company_id, registration)
  where registration is not null;
