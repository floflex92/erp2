-- ============================================================
-- TRANSFERS, GOALS, BONUSES & KPI FOUNDATION
-- Date : 2026-04-12
-- Strategie : additive only, company_id integer, policies via helpers existants
-- ============================================================

create extension if not exists pgcrypto;

-- ============================================================
-- 1. COURSE TRANSFERS
-- ============================================================

create table if not exists public.course_transfers (
  id uuid primary key default gen_random_uuid(),
  company_id integer not null references public.companies(id) on delete restrict,
  ot_id uuid not null references public.ordres_transport(id) on delete cascade,
  from_exploitant_id uuid not null references public.exploitants(id) on delete restrict,
  to_exploitant_id uuid not null references public.exploitants(id) on delete restrict,
  requested_by uuid null references public.profils(id) on delete set null,
  validated_by uuid null references public.profils(id) on delete set null,
  motif text not null,
  notes text null,
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'executed', 'rejected')),
  needs_approval boolean not null default false,
  approval_reason text null,
  approval_deadline timestamptz null,
  conductor_transfer boolean not null default true,
  equipment_transfer boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  approved_at timestamptz null,
  executed_at timestamptz null,
  constraint course_transfers_different_exploitants check (from_exploitant_id <> to_exploitant_id)
);

create index if not exists course_transfers_company_id_idx on public.course_transfers(company_id);
create index if not exists course_transfers_ot_id_idx on public.course_transfers(ot_id);
create index if not exists course_transfers_status_idx on public.course_transfers(status);
create index if not exists course_transfers_from_idx on public.course_transfers(from_exploitant_id);
create index if not exists course_transfers_to_idx on public.course_transfers(to_exploitant_id);

alter table if exists public.ordres_transport
  add column if not exists transfer_id uuid null references public.course_transfers(id) on delete set null;

create index if not exists ordres_transport_transfer_id_idx on public.ordres_transport(transfer_id);

-- ============================================================
-- 2. OBJECTIVES
-- ============================================================

create table if not exists public.objectives (
  id uuid primary key default gen_random_uuid(),
  company_id integer not null references public.companies(id) on delete restrict,
  name text not null,
  description text null,
  category text not null
    check (category in ('revenue', 'margin', 'performance', 'safety', 'efficiency', 'sustainability')),
  metric_code text not null,
  scope_type text not null
    check (scope_type in ('company', 'service', 'team', 'exploitant', 'client_portfolio', 'fleet', 'affretement')),
  scope_ref_id uuid null,
  period_type text not null
    check (period_type in ('daily', 'weekly', 'monthly', 'quarterly', 'annual', 'custom')),
  period_start date null,
  period_end date null,
  target_value numeric not null,
  target_unit text null,
  weight numeric not null default 1,
  formula jsonb not null default '{}'::jsonb,
  active_from date not null default current_date,
  active_to date null,
  is_active boolean not null default true,
  usable_in_bonus boolean not null default true,
  created_by uuid null references public.profils(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists objectives_company_id_idx on public.objectives(company_id);
create index if not exists objectives_metric_code_idx on public.objectives(metric_code);
create index if not exists objectives_scope_idx on public.objectives(scope_type, scope_ref_id);
create index if not exists objectives_active_idx on public.objectives(company_id, is_active, active_from, active_to);

-- ============================================================
-- 3. BONUS SCHEMES
-- ============================================================

create table if not exists public.bonus_schemes (
  id uuid primary key default gen_random_uuid(),
  company_id integer not null references public.companies(id) on delete restrict,
  name text not null,
  description text null,
  scheme_type text not null
    check (scheme_type in ('individual', 'team', 'service', 'mixed')),
  period_start date not null,
  period_end date not null,
  applies_to_scope_type text null,
  applies_to_scope_ref_id uuid null,
  simulation_mode boolean not null default false,
  is_locked boolean not null default false,
  created_by uuid null references public.profils(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  published_at timestamptz null
);

create index if not exists bonus_schemes_company_id_idx on public.bonus_schemes(company_id);
create index if not exists bonus_schemes_period_idx on public.bonus_schemes(period_start, period_end);

create table if not exists public.bonus_scheme_rules (
  id uuid primary key default gen_random_uuid(),
  company_id integer not null references public.companies(id) on delete restrict,
  scheme_id uuid not null references public.bonus_schemes(id) on delete cascade,
  objective_id uuid not null references public.objectives(id) on delete cascade,
  weight numeric not null default 1,
  minimum_threshold_pct numeric not null default 0,
  paliers jsonb not null default '[]'::jsonb,
  formula_type text null check (formula_type in ('paliers', 'percentage', 'linear')),
  formula_params jsonb not null default '{}'::jsonb,
  calculation_order integer null,
  created_at timestamptz not null default now()
);

create index if not exists bonus_scheme_rules_company_id_idx on public.bonus_scheme_rules(company_id);
create index if not exists bonus_scheme_rules_scheme_id_idx on public.bonus_scheme_rules(scheme_id);
create index if not exists bonus_scheme_rules_objective_id_idx on public.bonus_scheme_rules(objective_id);

create table if not exists public.bonus_calculations (
  id uuid primary key default gen_random_uuid(),
  company_id integer not null references public.companies(id) on delete restrict,
  scheme_id uuid not null references public.bonus_schemes(id) on delete cascade,
  profil_id uuid null references public.profils(id) on delete set null,
  exploitant_id uuid null references public.exploitants(id) on delete set null,
  period_key text not null,
  objectives_count integer not null default 0,
  objectives_met integer not null default 0,
  calculation_detail jsonb not null default '{}'::jsonb,
  total_calculated_bonus numeric not null default 0,
  total_before_taxes numeric null,
  total_after_taxes numeric null,
  is_validated boolean not null default false,
  validated_by uuid null references public.profils(id) on delete set null,
  validated_at timestamptz null,
  is_paid boolean not null default false,
  paid_at timestamptz null,
  payment_reference text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists bonus_calculations_company_id_idx on public.bonus_calculations(company_id);
create index if not exists bonus_calculations_scheme_id_idx on public.bonus_calculations(scheme_id);
create index if not exists bonus_calculations_exploitant_id_idx on public.bonus_calculations(exploitant_id);
create index if not exists bonus_calculations_period_key_idx on public.bonus_calculations(period_key);

-- ============================================================
-- 4. KPI ENGINE
-- ============================================================

create table if not exists public.kpi_definitions (
  id uuid primary key default gen_random_uuid(),
  company_id integer not null references public.companies(id) on delete restrict,
  code text not null,
  name text not null,
  description text null,
  category text not null
    check (category in ('financial', 'operational', 'commercial', 'safety', 'rh')),
  subcategory text null,
  scope_type text not null
    check (scope_type in ('company', 'service', 'exploitant', 'client', 'vehicle', 'driver')),
  multi_scope boolean not null default true,
  applicable_periods text[] not null default array['month']::text[],
  formula_type text not null
    check (formula_type in ('sum', 'avg', 'ratio', 'custom', 'sql_query')),
  formula_definition jsonb not null default '{}'::jsonb,
  unit text null,
  decimals integer not null default 2,
  data_source text null,
  query_template text null,
  version integer not null default 1,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint kpi_definitions_company_code_unique unique (company_id, code, version)
);

create index if not exists kpi_definitions_company_id_idx on public.kpi_definitions(company_id);
create index if not exists kpi_definitions_scope_idx on public.kpi_definitions(scope_type);
create index if not exists kpi_definitions_active_idx on public.kpi_definitions(company_id, is_active);

create table if not exists public.kpi_snapshots (
  id uuid primary key default gen_random_uuid(),
  company_id integer not null references public.companies(id) on delete restrict,
  kpi_id uuid not null references public.kpi_definitions(id) on delete cascade,
  scope_type text not null,
  scope_ref_id uuid null,
  period_key text not null,
  period_type text not null check (period_type in ('day', 'week', 'month', 'quarter', 'year')),
  metric_value numeric null,
  unit text null,
  data_count integer null,
  is_complete boolean not null default true,
  calculated_at timestamptz null,
  formula_version integer not null default 1,
  created_at timestamptz not null default now(),
  constraint kpi_snapshots_company_key_unique unique (company_id, kpi_id, scope_type, scope_ref_id, period_key, formula_version)
);

create index if not exists kpi_snapshots_company_id_idx on public.kpi_snapshots(company_id);
create index if not exists kpi_snapshots_period_key_idx on public.kpi_snapshots(period_key);
create index if not exists kpi_snapshots_scope_idx on public.kpi_snapshots(scope_type, scope_ref_id);

create table if not exists public.kpi_alerts (
  id uuid primary key default gen_random_uuid(),
  company_id integer not null references public.companies(id) on delete restrict,
  kpi_id uuid not null references public.kpi_definitions(id) on delete cascade,
  scope_type text null,
  scope_ref_id uuid null,
  alert_type text not null
    check (alert_type in ('threshold_exceeded', 'threshold_below', 'trend_down', 'trend_up')),
  alert_threshold numeric null,
  actual_value numeric null,
  severity text not null default 'warning'
    check (severity in ('info', 'warning', 'critical')),
  is_acknowledged boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists kpi_alerts_company_id_idx on public.kpi_alerts(company_id);
create index if not exists kpi_alerts_kpi_id_idx on public.kpi_alerts(kpi_id);

-- ============================================================
-- 5. Triggers updated_at
-- ============================================================

do $$
begin
  if exists (
    select 1
    from pg_proc
    where proname = 'add_updated_at_trigger'
      and pg_function_is_visible(oid)
  ) then
    perform public.add_updated_at_trigger('course_transfers');
    perform public.add_updated_at_trigger('objectives');
    perform public.add_updated_at_trigger('bonus_schemes');
    perform public.add_updated_at_trigger('bonus_calculations');
    perform public.add_updated_at_trigger('kpi_definitions');
  end if;
exception when others then
  raise notice 'updated_at trigger transfers/goals/bonuses/kpi non applique: %', sqlerrm;
end $$;

-- ============================================================
-- 6. RLS
-- ============================================================

alter table public.course_transfers enable row level security;
alter table public.objectives enable row level security;
alter table public.bonus_schemes enable row level security;
alter table public.bonus_scheme_rules enable row level security;
alter table public.bonus_calculations enable row level security;
alter table public.kpi_definitions enable row level security;
alter table public.kpi_snapshots enable row level security;
alter table public.kpi_alerts enable row level security;

drop policy if exists course_transfers_staff_read on public.course_transfers;
create policy course_transfers_staff_read on public.course_transfers
  for select to authenticated
  using (
    company_id = public.my_company_id()
    and public.get_user_role() in ('admin', 'dirigeant', 'exploitant', 'comptable', 'rh', 'logisticien')
  );

drop policy if exists course_transfers_ops_write on public.course_transfers;
create policy course_transfers_ops_write on public.course_transfers
  for all to authenticated
  using (
    company_id = public.my_company_id()
    and public.get_user_role() in ('admin', 'dirigeant', 'exploitant', 'super_admin')
  )
  with check (
    company_id = public.my_company_id()
    and public.get_user_role() in ('admin', 'dirigeant', 'exploitant', 'super_admin')
  );

drop policy if exists objectives_staff_read on public.objectives;
create policy objectives_staff_read on public.objectives
  for select to authenticated
  using (
    company_id = public.my_company_id()
    and public.get_user_role() in ('admin', 'dirigeant', 'exploitant', 'comptable', 'rh', 'commercial', 'logisticien')
  );

drop policy if exists objectives_management_write on public.objectives;
create policy objectives_management_write on public.objectives
  for all to authenticated
  using (
    company_id = public.my_company_id()
    and public.get_user_role() in ('admin', 'dirigeant', 'super_admin')
  )
  with check (
    company_id = public.my_company_id()
    and public.get_user_role() in ('admin', 'dirigeant', 'super_admin')
  );

drop policy if exists bonus_schemes_staff_read on public.bonus_schemes;
create policy bonus_schemes_staff_read on public.bonus_schemes
  for select to authenticated
  using (
    company_id = public.my_company_id()
    and public.get_user_role() in ('admin', 'dirigeant', 'exploitant', 'comptable', 'rh')
  );

drop policy if exists bonus_schemes_management_write on public.bonus_schemes;
create policy bonus_schemes_management_write on public.bonus_schemes
  for all to authenticated
  using (
    company_id = public.my_company_id()
    and public.get_user_role() in ('admin', 'dirigeant', 'super_admin')
  )
  with check (
    company_id = public.my_company_id()
    and public.get_user_role() in ('admin', 'dirigeant', 'super_admin')
  );

drop policy if exists bonus_scheme_rules_staff_read on public.bonus_scheme_rules;
create policy bonus_scheme_rules_staff_read on public.bonus_scheme_rules
  for select to authenticated
  using (
    company_id = public.my_company_id()
    and public.get_user_role() in ('admin', 'dirigeant', 'exploitant', 'comptable', 'rh')
  );

drop policy if exists bonus_scheme_rules_management_write on public.bonus_scheme_rules;
create policy bonus_scheme_rules_management_write on public.bonus_scheme_rules
  for all to authenticated
  using (
    company_id = public.my_company_id()
    and public.get_user_role() in ('admin', 'dirigeant', 'super_admin')
  )
  with check (
    company_id = public.my_company_id()
    and public.get_user_role() in ('admin', 'dirigeant', 'super_admin')
  );

drop policy if exists bonus_calculations_staff_read on public.bonus_calculations;
create policy bonus_calculations_staff_read on public.bonus_calculations
  for select to authenticated
  using (
    company_id = public.my_company_id()
    and public.get_user_role() in ('admin', 'dirigeant', 'exploitant', 'comptable', 'rh')
  );

drop policy if exists bonus_calculations_finance_write on public.bonus_calculations;
create policy bonus_calculations_finance_write on public.bonus_calculations
  for all to authenticated
  using (
    company_id = public.my_company_id()
    and public.get_user_role() in ('admin', 'dirigeant', 'comptable', 'super_admin')
  )
  with check (
    company_id = public.my_company_id()
    and public.get_user_role() in ('admin', 'dirigeant', 'comptable', 'super_admin')
  );

drop policy if exists kpi_definitions_staff_read on public.kpi_definitions;
create policy kpi_definitions_staff_read on public.kpi_definitions
  for select to authenticated
  using (
    company_id = public.my_company_id()
    and public.get_user_role() in ('admin', 'dirigeant', 'exploitant', 'comptable', 'rh', 'commercial', 'logisticien')
  );

drop policy if exists kpi_definitions_management_write on public.kpi_definitions;
create policy kpi_definitions_management_write on public.kpi_definitions
  for all to authenticated
  using (
    company_id = public.my_company_id()
    and public.get_user_role() in ('admin', 'dirigeant', 'super_admin')
  )
  with check (
    company_id = public.my_company_id()
    and public.get_user_role() in ('admin', 'dirigeant', 'super_admin')
  );

drop policy if exists kpi_snapshots_staff_read on public.kpi_snapshots;
create policy kpi_snapshots_staff_read on public.kpi_snapshots
  for select to authenticated
  using (
    company_id = public.my_company_id()
    and public.get_user_role() in ('admin', 'dirigeant', 'exploitant', 'comptable', 'rh', 'commercial', 'logisticien')
  );

drop policy if exists kpi_snapshots_management_write on public.kpi_snapshots;
create policy kpi_snapshots_management_write on public.kpi_snapshots
  for all to authenticated
  using (
    company_id = public.my_company_id()
    and public.get_user_role() in ('admin', 'dirigeant', 'super_admin')
  )
  with check (
    company_id = public.my_company_id()
    and public.get_user_role() in ('admin', 'dirigeant', 'super_admin')
  );

drop policy if exists kpi_alerts_staff_read on public.kpi_alerts;
create policy kpi_alerts_staff_read on public.kpi_alerts
  for select to authenticated
  using (
    company_id = public.my_company_id()
    and public.get_user_role() in ('admin', 'dirigeant', 'exploitant', 'comptable', 'rh', 'commercial', 'logisticien')
  );

drop policy if exists kpi_alerts_management_write on public.kpi_alerts;
create policy kpi_alerts_management_write on public.kpi_alerts
  for all to authenticated
  using (
    company_id = public.my_company_id()
    and public.get_user_role() in ('admin', 'dirigeant', 'super_admin')
  )
  with check (
    company_id = public.my_company_id()
    and public.get_user_role() in ('admin', 'dirigeant', 'super_admin')
  );