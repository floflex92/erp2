-- Refonte V2 - Bloc 2
-- Tables de mapping legacy -> pivots pour piloter merge/split sans rupture.

create schema if not exists refonte_v2;

create table if not exists refonte_v2.map_person_legacy (
  id uuid primary key default gen_random_uuid(),
  company_id integer not null references public.companies(id) on delete cascade,
  source_table text not null check (source_table in ('profils','conducteurs','employee_directory')),
  source_id uuid not null,
  person_id uuid null,
  mapping_status text not null default 'pending' check (mapping_status in ('pending','mapped','conflict','ignored')),
  conflict_reason text null,
  mapped_at timestamptz null,
  created_at timestamptz not null default now(),
  unique (source_table, source_id)
);

create table if not exists refonte_v2.map_asset_legacy (
  id uuid primary key default gen_random_uuid(),
  company_id integer not null references public.companies(id) on delete cascade,
  source_table text not null check (source_table in ('vehicules','remorques')),
  source_id uuid not null,
  asset_id uuid null,
  mapping_status text not null default 'pending' check (mapping_status in ('pending','mapped','conflict','ignored')),
  conflict_reason text null,
  mapped_at timestamptz null,
  created_at timestamptz not null default now(),
  unique (source_table, source_id)
);

create table if not exists refonte_v2.map_document_legacy (
  id uuid primary key default gen_random_uuid(),
  company_id integer not null references public.companies(id) on delete cascade,
  source_table text not null,
  source_id uuid not null,
  target_document_id uuid null,
  mapping_status text not null default 'pending' check (mapping_status in ('pending','mapped','conflict','ignored')),
  conflict_reason text null,
  mapped_at timestamptz null,
  created_at timestamptz not null default now(),
  unique (source_table, source_id)
);

create index if not exists map_person_legacy_company_status_idx
  on refonte_v2.map_person_legacy(company_id, mapping_status, created_at desc);

create index if not exists map_asset_legacy_company_status_idx
  on refonte_v2.map_asset_legacy(company_id, mapping_status, created_at desc);

create index if not exists map_document_legacy_company_status_idx
  on refonte_v2.map_document_legacy(company_id, mapping_status, created_at desc);
