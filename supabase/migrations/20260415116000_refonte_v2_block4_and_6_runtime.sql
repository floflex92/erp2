-- Refonte V2 - Blocs 4 et 6
-- Runtime de migration: journal de derive et KPIs de pilotage.

create schema if not exists refonte_v2;

create table if not exists refonte_v2.sync_drift_log (
  id uuid primary key default gen_random_uuid(),
  company_id integer null references public.companies(id) on delete set null,
  domain_code text not null,
  entity_code text not null,
  source_pk text not null,
  drift_type text not null check (drift_type in ('missing_target','value_mismatch','orphan_target','constraint_error')),
  details jsonb null,
  severity text not null default 'warning' check (severity in ('info','warning','critical')),
  detected_at timestamptz not null default now(),
  resolved_at timestamptz null
);

create index if not exists sync_drift_log_company_detected_idx
  on refonte_v2.sync_drift_log(company_id, detected_at desc);

create index if not exists sync_drift_log_open_idx
  on refonte_v2.sync_drift_log(severity, detected_at desc)
  where resolved_at is null;

create table if not exists refonte_v2.migration_kpis_daily (
  day date not null,
  company_id integer not null references public.companies(id) on delete cascade,
  kpi_code text not null,
  kpi_value numeric not null,
  created_at timestamptz not null default now(),
  primary key (day, company_id, kpi_code)
);

create or replace function refonte_v2.push_kpi(
  p_company_id integer,
  p_kpi_code text,
  p_kpi_value numeric,
  p_day date default current_date
)
returns void
language plpgsql
security definer
set search_path = public, refonte_v2
as $$
begin
  insert into refonte_v2.migration_kpis_daily(day, company_id, kpi_code, kpi_value)
  values (p_day, p_company_id, p_kpi_code, p_kpi_value)
  on conflict (day, company_id, kpi_code) do update
  set kpi_value = excluded.kpi_value,
      created_at = now();
end;
$$;
