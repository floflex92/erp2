-- ============================================================
-- ETA / SCORING / DECISION COCKPIT FOUNDATION
-- Date : 2026-04-12
-- Strategie : additive only, multi-tenant, explicable by design
-- ============================================================

begin;

create extension if not exists pgcrypto;

create table if not exists public.eta_predictions (
  id uuid primary key default gen_random_uuid(),
  company_id integer not null references public.companies(id) on delete restrict,
  ot_id uuid null references public.ordres_transport(id) on delete cascade,
  affectation_id uuid null references public.affectations(id) on delete set null,
  prediction_scope text not null default 'course'
    check (prediction_scope in ('course', 'etape', 'demande')),
  source_event text not null default 'manual'
    check (source_event in ('manual', 'affectation', 'traffic_refresh', 'driver_delay', 'planning_change', 'cron')),
  distance_km numeric(10,2) null,
  baseline_duration_minutes integer not null default 0,
  predicted_duration_minutes integer not null default 0,
  optimistic_eta timestamptz null,
  predicted_eta timestamptz null,
  pessimistic_eta timestamptz null,
  confidence_pct numeric(5,2) not null default 0,
  risk_level text not null default 'ok'
    check (risk_level in ('ok', 'a_surveiller', 'critique')),
  status_label text not null default 'OK'
    check (status_label in ('OK', 'A surveiller', 'Critique')),
  trace_json jsonb not null default '[]'::jsonb,
  explanation_json jsonb not null default '[]'::jsonb,
  missing_data_json jsonb not null default '[]'::jsonb,
  metadata_json jsonb not null default '{}'::jsonb,
  computed_at timestamptz not null default now(),
  expires_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint eta_predictions_duration_check check (predicted_duration_minutes >= 0),
  constraint eta_predictions_confidence_check check (confidence_pct >= 0 and confidence_pct <= 100)
);

create index if not exists eta_predictions_company_idx
  on public.eta_predictions(company_id, computed_at desc);

create index if not exists eta_predictions_ot_idx
  on public.eta_predictions(ot_id, computed_at desc);

create index if not exists eta_predictions_scope_idx
  on public.eta_predictions(prediction_scope, risk_level);

create table if not exists public.eta_history (
  id uuid primary key default gen_random_uuid(),
  company_id integer not null references public.companies(id) on delete restrict,
  eta_prediction_id uuid not null references public.eta_predictions(id) on delete cascade,
  ot_id uuid null references public.ordres_transport(id) on delete cascade,
  recorded_at timestamptz not null default now(),
  previous_predicted_eta timestamptz null,
  next_predicted_eta timestamptz null,
  delta_minutes integer not null default 0,
  drift_reason text null,
  snapshot_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists eta_history_company_idx
  on public.eta_history(company_id, recorded_at desc);

create index if not exists eta_history_prediction_idx
  on public.eta_history(eta_prediction_id, recorded_at desc);

create table if not exists public.job_scores (
  id uuid primary key default gen_random_uuid(),
  company_id integer not null references public.companies(id) on delete restrict,
  ot_id uuid null references public.ordres_transport(id) on delete cascade,
  request_reference text null,
  request_payload jsonb not null default '{}'::jsonb,
  global_score numeric(5,2) not null default 0,
  recommendation text not null default 'a_optimiser'
    check (recommendation in ('accepter', 'a_optimiser', 'risque', 'a_refuser')),
  color text not null default 'orange'
    check (color in ('vert', 'orange', 'rouge')),
  difficulty_label text not null default 'moyenne'
    check (difficulty_label in ('faible', 'moyenne', 'elevee')),
  impact_label text not null default 'moyen'
    check (impact_label in ('faible', 'moyen', 'fort')),
  estimated_revenue numeric(12,2) not null default 0,
  estimated_cost numeric(12,2) not null default 0,
  estimated_margin numeric(12,2) not null default 0,
  distance_km numeric(10,2) null,
  weights_json jsonb not null default '{}'::jsonb,
  explanation_json jsonb not null default '[]'::jsonb,
  metadata_json jsonb not null default '{}'::jsonb,
  computed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint job_scores_score_check check (global_score >= 0 and global_score <= 100)
);

create index if not exists job_scores_company_idx
  on public.job_scores(company_id, computed_at desc);

create index if not exists job_scores_ot_idx
  on public.job_scores(ot_id, computed_at desc);

create index if not exists job_scores_recommendation_idx
  on public.job_scores(recommendation, color);

create table if not exists public.scoring_details (
  id uuid primary key default gen_random_uuid(),
  job_score_id uuid not null references public.job_scores(id) on delete cascade,
  axis text not null
    check (axis in ('rentabilite', 'faisabilite', 'impact_operationnel', 'qualite_client', 'complexite')),
  axis_score numeric(5,2) not null default 0,
  axis_weight numeric(6,4) not null default 0,
  detail_text text null,
  detail_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint scoring_details_axis_score_check check (axis_score >= 0 and axis_score <= 100)
);

create index if not exists scoring_details_job_score_idx
  on public.scoring_details(job_score_id, axis);

create table if not exists public.constraint_logs (
  id uuid primary key default gen_random_uuid(),
  company_id integer not null references public.companies(id) on delete restrict,
  ot_id uuid null references public.ordres_transport(id) on delete cascade,
  request_reference text null,
  engine_name text not null default 'transport_decision_engine'
    check (engine_name in ('transport_decision_engine', 'eta_engine', 'scoring_engine', 'constraints_engine')),
  constraint_type text not null
    check (constraint_type in ('temps_reel', 'operationnel', 'reglementaire', 'ressource', 'historique', 'buffer')),
  constraint_code text not null,
  severity text not null default 'normale'
    check (severity in ('legere', 'normale', 'grave', 'critique')),
  source text not null default 'heuristique'
    check (source in ('api', 'historique', 'heuristique', 'fallback')),
  impact_minutes integer null,
  impact_score numeric(7,2) null,
  detail_json jsonb not null default '{}'::jsonb,
  logged_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists constraint_logs_company_idx
  on public.constraint_logs(company_id, logged_at desc);

create index if not exists constraint_logs_ot_idx
  on public.constraint_logs(ot_id, logged_at desc);

create index if not exists constraint_logs_type_idx
  on public.constraint_logs(constraint_type, severity);

create or replace view public.vue_latest_eta_predictions as
select distinct on (company_id, coalesce(ot_id, '00000000-0000-0000-0000-000000000000'::uuid), prediction_scope)
  id,
  company_id,
  ot_id,
  affectation_id,
  prediction_scope,
  source_event,
  distance_km,
  baseline_duration_minutes,
  predicted_duration_minutes,
  optimistic_eta,
  predicted_eta,
  pessimistic_eta,
  confidence_pct,
  risk_level,
  status_label,
  trace_json,
  explanation_json,
  missing_data_json,
  metadata_json,
  computed_at,
  expires_at
from public.eta_predictions
order by company_id, coalesce(ot_id, '00000000-0000-0000-0000-000000000000'::uuid), prediction_scope, computed_at desc;

create or replace view public.vue_latest_job_scores as
select distinct on (company_id, coalesce(ot_id, '00000000-0000-0000-0000-000000000000'::uuid), coalesce(request_reference, ''))
  id,
  company_id,
  ot_id,
  request_reference,
  global_score,
  recommendation,
  color,
  difficulty_label,
  impact_label,
  estimated_revenue,
  estimated_cost,
  estimated_margin,
  distance_km,
  explanation_json,
  computed_at
from public.job_scores
order by company_id, coalesce(ot_id, '00000000-0000-0000-0000-000000000000'::uuid), coalesce(request_reference, ''), computed_at desc;

do $$
begin
  if exists (
    select 1
    from pg_proc
    where proname = 'add_updated_at_trigger'
      and pg_function_is_visible(oid)
  ) then
    perform public.add_updated_at_trigger('eta_predictions');
    perform public.add_updated_at_trigger('job_scores');
  end if;
exception when others then
  raise notice 'updated_at trigger eta/scoring non applique: %', sqlerrm;
end $$;

alter table public.eta_predictions enable row level security;
alter table public.eta_history enable row level security;
alter table public.job_scores enable row level security;
alter table public.scoring_details enable row level security;
alter table public.constraint_logs enable row level security;

drop policy if exists eta_predictions_staff_read on public.eta_predictions;
create policy eta_predictions_staff_read on public.eta_predictions
  for select to authenticated
  using (
    company_id = public.my_company_id()
    and public.get_user_role() in (
      'admin','dirigeant','exploitant','logisticien','commercial','comptable','flotte','observateur','super_admin'
    )
  );

drop policy if exists eta_predictions_ops_write on public.eta_predictions;
create policy eta_predictions_ops_write on public.eta_predictions
  for all to authenticated
  using (
    company_id = public.my_company_id()
    and public.get_user_role() in ('admin','dirigeant','exploitant','logisticien','super_admin')
  )
  with check (
    company_id = public.my_company_id()
    and public.get_user_role() in ('admin','dirigeant','exploitant','logisticien','super_admin')
  );

drop policy if exists eta_history_staff_read on public.eta_history;
create policy eta_history_staff_read on public.eta_history
  for select to authenticated
  using (
    company_id = public.my_company_id()
    and public.get_user_role() in ('admin','dirigeant','exploitant','logisticien','observateur','super_admin')
  );

drop policy if exists eta_history_ops_write on public.eta_history;
create policy eta_history_ops_write on public.eta_history
  for all to authenticated
  using (
    company_id = public.my_company_id()
    and public.get_user_role() in ('admin','dirigeant','exploitant','logisticien','super_admin')
  )
  with check (
    company_id = public.my_company_id()
    and public.get_user_role() in ('admin','dirigeant','exploitant','logisticien','super_admin')
  );

drop policy if exists job_scores_staff_read on public.job_scores;
create policy job_scores_staff_read on public.job_scores
  for select to authenticated
  using (
    company_id = public.my_company_id()
    and public.get_user_role() in (
      'admin','dirigeant','exploitant','logisticien','commercial','comptable','observateur','super_admin'
    )
  );

drop policy if exists job_scores_ops_write on public.job_scores;
create policy job_scores_ops_write on public.job_scores
  for all to authenticated
  using (
    company_id = public.my_company_id()
    and public.get_user_role() in ('admin','dirigeant','exploitant','logisticien','commercial','super_admin')
  )
  with check (
    company_id = public.my_company_id()
    and public.get_user_role() in ('admin','dirigeant','exploitant','logisticien','commercial','super_admin')
  );

drop policy if exists scoring_details_staff_read on public.scoring_details;
create policy scoring_details_staff_read on public.scoring_details
  for select to authenticated
  using (
    exists (
      select 1
      from public.job_scores js
      where js.id = scoring_details.job_score_id
        and js.company_id = public.my_company_id()
        and public.get_user_role() in (
          'admin','dirigeant','exploitant','logisticien','commercial','comptable','observateur','super_admin'
        )
    )
  );

drop policy if exists scoring_details_ops_write on public.scoring_details;
create policy scoring_details_ops_write on public.scoring_details
  for all to authenticated
  using (
    exists (
      select 1
      from public.job_scores js
      where js.id = scoring_details.job_score_id
        and js.company_id = public.my_company_id()
        and public.get_user_role() in ('admin','dirigeant','exploitant','logisticien','commercial','super_admin')
    )
  )
  with check (
    exists (
      select 1
      from public.job_scores js
      where js.id = scoring_details.job_score_id
        and js.company_id = public.my_company_id()
        and public.get_user_role() in ('admin','dirigeant','exploitant','logisticien','commercial','super_admin')
    )
  );

drop policy if exists constraint_logs_staff_read on public.constraint_logs;
create policy constraint_logs_staff_read on public.constraint_logs
  for select to authenticated
  using (
    company_id = public.my_company_id()
    and public.get_user_role() in ('admin','dirigeant','exploitant','logisticien','flotte','observateur','super_admin')
  );

drop policy if exists constraint_logs_ops_write on public.constraint_logs;
create policy constraint_logs_ops_write on public.constraint_logs
  for all to authenticated
  using (
    company_id = public.my_company_id()
    and public.get_user_role() in ('admin','dirigeant','exploitant','logisticien','flotte','super_admin')
  )
  with check (
    company_id = public.my_company_id()
    and public.get_user_role() in ('admin','dirigeant','exploitant','logisticien','flotte','super_admin')
  );

commit;