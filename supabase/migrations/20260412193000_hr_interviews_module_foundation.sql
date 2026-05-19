-- ============================================================
-- HR INTERVIEWS MODULE FOUNDATION
-- Date : 2026-04-12
-- Strategie : additive only, zero regression sur l'existant
-- ============================================================

create extension if not exists pgcrypto;

-- ============================================================
-- 0. Helpers
-- ============================================================

create or replace function public.current_profile_id()
returns uuid
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select p.id
  from public.profils p
  where p.user_id = auth.uid()
  limit 1;
$$;

revoke all on function public.current_profile_id() from public;
grant execute on function public.current_profile_id() to authenticated;

-- ============================================================
-- 1. Referential: interview types & templates
-- ============================================================

create table if not exists public.interview_types (
  id uuid primary key default gen_random_uuid(),
  company_id integer not null default public.my_company_id() references public.companies(id) on delete restrict,
  code text not null,
  name text not null,
  category text not null
    check (category in ('rh', 'management', 'objectifs', 'disciplinaire', 'securite', 'formation', 'carriere', 'obligatoire', 'autre')),
  description text null,
  color_token text null,
  is_mandatory boolean not null default false,
  frequency_months integer null,
  default_outline jsonb not null default '{}'::jsonb,
  access_roles text[] not null default array['rh','admin','dirigeant']::text[],
  business_rules jsonb not null default '{}'::jsonb,
  is_active boolean not null default true,
  created_by uuid null references public.profils(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz null,
  constraint interview_types_code_company_unique unique (company_id, code)
);

create index if not exists interview_types_company_idx on public.interview_types(company_id);
create index if not exists interview_types_category_idx on public.interview_types(company_id, category);
create index if not exists interview_types_active_idx on public.interview_types(company_id, is_active);

create table if not exists public.interview_document_templates (
  id uuid primary key default gen_random_uuid(),
  company_id integer not null default public.my_company_id() references public.companies(id) on delete restrict,
  interview_type_id uuid null references public.interview_types(id) on delete set null,
  document_type text not null
    check (document_type in ('convocation', 'trame_entretien', 'grille_evaluation', 'fiche_objectifs', 'compte_rendu', 'plan_action', 'document_disciplinaire', 'document_decision', 'autre')),
  name text not null,
  version integer not null default 1,
  template_format text not null default 'html'
    check (template_format in ('html', 'markdown', 'text', 'docx')),
  body_template text not null,
  variables_schema jsonb not null default '{}'::jsonb,
  is_active boolean not null default true,
  created_by uuid null references public.profils(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz null,
  constraint interview_document_templates_version_unique unique (company_id, name, version)
);

create index if not exists interview_document_templates_company_idx on public.interview_document_templates(company_id);
create index if not exists interview_document_templates_type_idx on public.interview_document_templates(company_id, document_type);

alter table public.interview_types
  add column if not exists default_document_template_id uuid null references public.interview_document_templates(id) on delete set null;

-- ============================================================
-- 2. Core interviews
-- ============================================================

create table if not exists public.interviews (
  id uuid primary key default gen_random_uuid(),
  company_id integer not null default public.my_company_id() references public.companies(id) on delete restrict,
  interview_type_id uuid not null references public.interview_types(id) on delete restrict,
  employee_profile_id uuid not null references public.profils(id) on delete restrict,
  manager_profile_id uuid null references public.profils(id) on delete set null,
  hr_profile_id uuid null references public.profils(id) on delete set null,
  creator_profile_id uuid null references public.profils(id) on delete set null,
  service_id uuid null,
  site_id uuid null,
  team_label text null,
  planned_at timestamptz null,
  actual_start_at timestamptz null,
  actual_end_at timestamptz null,
  status text not null default 'a_planifier'
    check (status in (
      'a_planifier', 'planifie', 'convocation_a_preparer', 'convocation_envoyee',
      'en_attente_realisation', 'realise', 'compte_rendu_a_completer',
      'compte_rendu_a_valider', 'signe', 'cloture', 'reporte', 'annule', 'archive'
    )),
  priority text not null default 'normale'
    check (priority in ('basse', 'normale', 'haute', 'critique')),
  reason text null,
  context text null,
  summary text null,
  preparatory_notes text null,
  decisions text null,
  confidentiality_level text not null default 'interne'
    check (confidentiality_level in ('public_interne', 'interne', 'restreint', 'disciplinaire', 'strictement_confidentiel')),
  report_status text not null default 'brouillon'
    check (report_status in ('brouillon', 'valide', 'signe', 'archive')),
  action_required boolean not null default false,
  objective_follow_up_required boolean not null default false,
  mandatory_due_date date null,
  archived_at timestamptz null,
  deleted_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists interviews_company_idx on public.interviews(company_id);
create index if not exists interviews_employee_idx on public.interviews(company_id, employee_profile_id);
create index if not exists interviews_manager_idx on public.interviews(company_id, manager_profile_id);
create index if not exists interviews_type_idx on public.interviews(company_id, interview_type_id);
create index if not exists interviews_status_idx on public.interviews(company_id, status);
create index if not exists interviews_priority_idx on public.interviews(company_id, priority);
create index if not exists interviews_planned_idx on public.interviews(company_id, planned_at);
create index if not exists interviews_mandatory_due_idx on public.interviews(company_id, mandatory_due_date);
create index if not exists interviews_confidentiality_idx on public.interviews(company_id, confidentiality_level);

create table if not exists public.interview_participants (
  id uuid primary key default gen_random_uuid(),
  company_id integer not null default public.my_company_id() references public.companies(id) on delete restrict,
  interview_id uuid not null references public.interviews(id) on delete cascade,
  profile_id uuid not null references public.profils(id) on delete restrict,
  participant_role text not null
    check (participant_role in ('salarie', 'manager', 'rh', 'direction', 'responsable_service', 'temoin', 'autre')),
  required boolean not null default true,
  present boolean null,
  signature_required boolean not null default false,
  signature_date timestamptz null,
  notes text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint interview_participants_unique unique (interview_id, profile_id)
);

create index if not exists interview_participants_company_idx on public.interview_participants(company_id);
create index if not exists interview_participants_interview_idx on public.interview_participants(interview_id);
create index if not exists interview_participants_profile_idx on public.interview_participants(company_id, profile_id);

create table if not exists public.interview_status_history (
  id uuid primary key default gen_random_uuid(),
  company_id integer not null default public.my_company_id() references public.companies(id) on delete restrict,
  interview_id uuid not null references public.interviews(id) on delete cascade,
  previous_status text null,
  new_status text not null,
  changed_by uuid null references public.profils(id) on delete set null,
  change_reason text null,
  changed_at timestamptz not null default now()
);

create index if not exists interview_status_history_company_idx on public.interview_status_history(company_id);
create index if not exists interview_status_history_interview_idx on public.interview_status_history(interview_id, changed_at desc);

create table if not exists public.interview_notes (
  id uuid primary key default gen_random_uuid(),
  company_id integer not null default public.my_company_id() references public.companies(id) on delete restrict,
  interview_id uuid not null references public.interviews(id) on delete cascade,
  note_type text not null default 'preparation'
    check (note_type in ('preparation', 'observation', 'decision', 'suivi', 'confidentielle', 'autre')),
  content text not null,
  visibility text not null default 'interne'
    check (visibility in ('interne', 'manager_rh', 'rh_uniquement', 'direction_rh')),
  created_by uuid null references public.profils(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz null
);

create index if not exists interview_notes_company_idx on public.interview_notes(company_id);
create index if not exists interview_notes_interview_idx on public.interview_notes(interview_id, created_at desc);

create table if not exists public.interview_reports (
  id uuid primary key default gen_random_uuid(),
  company_id integer not null default public.my_company_id() references public.companies(id) on delete restrict,
  interview_id uuid not null references public.interviews(id) on delete cascade,
  structured_content jsonb not null default '{}'::jsonb,
  summary text null,
  decisions text null,
  validation_requested_at timestamptz null,
  validated_at timestamptz null,
  validated_by uuid null references public.profils(id) on delete set null,
  signed_at timestamptz null,
  archived_at timestamptz null,
  status text not null default 'brouillon'
    check (status in ('brouillon', 'valide', 'signe', 'archive')),
  version integer not null default 1,
  created_by uuid null references public.profils(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint interview_reports_interview_version_unique unique (interview_id, version)
);

create index if not exists interview_reports_company_idx on public.interview_reports(company_id);
create index if not exists interview_reports_interview_idx on public.interview_reports(interview_id);

-- ============================================================
-- 3. Actions, objectifs, alertes
-- ============================================================

create table if not exists public.interview_actions (
  id uuid primary key default gen_random_uuid(),
  company_id integer not null default public.my_company_id() references public.companies(id) on delete restrict,
  interview_id uuid not null references public.interviews(id) on delete cascade,
  employee_profile_id uuid not null references public.profils(id) on delete restrict,
  title text not null,
  description text null,
  responsible_profile_id uuid null references public.profils(id) on delete set null,
  due_date date null,
  status text not null default 'a_faire'
    check (status in ('a_faire', 'en_cours', 'bloquee', 'terminee', 'annulee')),
  priority text not null default 'normale'
    check (priority in ('basse', 'normale', 'haute', 'critique')),
  follow_up_comment text null,
  closed_at timestamptz null,
  closed_by uuid null references public.profils(id) on delete set null,
  created_by uuid null references public.profils(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz null
);

create index if not exists interview_actions_company_idx on public.interview_actions(company_id);
create index if not exists interview_actions_interview_idx on public.interview_actions(interview_id);
create index if not exists interview_actions_employee_idx on public.interview_actions(company_id, employee_profile_id);
create index if not exists interview_actions_status_due_idx on public.interview_actions(company_id, status, due_date);

create table if not exists public.interview_objectives (
  id uuid primary key default gen_random_uuid(),
  company_id integer not null default public.my_company_id() references public.companies(id) on delete restrict,
  interview_id uuid not null references public.interviews(id) on delete cascade,
  objective_id uuid not null references public.objectives(id) on delete restrict,
  objective_label_snapshot text not null,
  objective_type_snapshot text null,
  level_snapshot text null,
  period_snapshot text null,
  target_value_snapshot numeric null,
  achieved_value_snapshot numeric null,
  unit_snapshot text null,
  threshold_min_snapshot numeric null,
  threshold_hit_snapshot numeric null,
  threshold_exceeded_snapshot numeric null,
  bonus_impact_snapshot jsonb not null default '{}'::jsonb,
  manager_comment text null,
  employee_comment text null,
  freeze_on_closure boolean not null default true,
  frozen_at timestamptz null,
  created_by uuid null references public.profils(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint interview_objectives_unique unique (interview_id, objective_id)
);

create index if not exists interview_objectives_company_idx on public.interview_objectives(company_id);
create index if not exists interview_objectives_interview_idx on public.interview_objectives(interview_id);
create index if not exists interview_objectives_objective_idx on public.interview_objectives(objective_id);

create table if not exists public.interview_alerts (
  id uuid primary key default gen_random_uuid(),
  company_id integer not null default public.my_company_id() references public.companies(id) on delete restrict,
  interview_id uuid null references public.interviews(id) on delete cascade,
  employee_profile_id uuid null references public.profils(id) on delete set null,
  alert_type text not null
    check (alert_type in (
      'entretien_a_venir',
      'entretien_en_retard',
      'document_manquant',
      'document_non_signe',
      'compte_rendu_manquant',
      'action_non_cloturee',
      'objectif_sans_suivi',
      'echeance_obligatoire_proche'
    )),
  severity text not null default 'warning'
    check (severity in ('info', 'warning', 'critical')),
  payload jsonb not null default '{}'::jsonb,
  due_at timestamptz null,
  resolved_at timestamptz null,
  resolved_by uuid null references public.profils(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists interview_alerts_company_idx on public.interview_alerts(company_id);
create index if not exists interview_alerts_type_idx on public.interview_alerts(company_id, alert_type);
create index if not exists interview_alerts_due_idx on public.interview_alerts(company_id, due_at);

-- ============================================================
-- 4. Documents, versions, signatures
-- ============================================================

create table if not exists public.interview_documents (
  id uuid primary key default gen_random_uuid(),
  company_id integer not null default public.my_company_id() references public.companies(id) on delete restrict,
  interview_id uuid not null references public.interviews(id) on delete cascade,
  employee_profile_id uuid not null references public.profils(id) on delete restrict,
  template_id uuid null references public.interview_document_templates(id) on delete set null,
  document_type text not null
    check (document_type in ('convocation', 'trame_entretien', 'grille_evaluation', 'fiche_objectifs', 'compte_rendu', 'plan_action', 'document_disciplinaire', 'document_decision', 'autre')),
  name text not null,
  current_version integer not null default 1,
  format text not null default 'pdf'
    check (format in ('pdf', 'docx', 'odt', 'txt', 'scan_pdf', 'image')),
  status text not null default 'brouillon'
    check (status in ('brouillon', 'genere', 'imprime', 'envoye', 'en_attente_signature', 'signe', 'scanne', 'valide', 'archive')),
  generated_at timestamptz null,
  generated_by uuid null references public.profils(id) on delete set null,
  sent_by uuid null references public.profils(id) on delete set null,
  sent_at timestamptz null,
  signed boolean not null default false,
  signature_type text null
    check (signature_type in ('manuscrite_papier', 'electronique_simple', 'electronique_avancee', 'autre')),
  signed_at timestamptz null,
  source_file_bucket text null,
  source_file_path text null,
  signed_file_bucket text null,
  signed_file_path text null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz null
);

create index if not exists interview_documents_company_idx on public.interview_documents(company_id);
create index if not exists interview_documents_interview_idx on public.interview_documents(interview_id);
create index if not exists interview_documents_employee_idx on public.interview_documents(company_id, employee_profile_id);
create index if not exists interview_documents_status_idx on public.interview_documents(company_id, status);

create table if not exists public.interview_document_versions (
  id uuid primary key default gen_random_uuid(),
  company_id integer not null default public.my_company_id() references public.companies(id) on delete restrict,
  document_id uuid not null references public.interview_documents(id) on delete cascade,
  version integer not null,
  file_bucket text null,
  file_path text null,
  file_name text null,
  file_size_bytes bigint null,
  mime_type text null,
  checksum text null,
  is_signed_scan boolean not null default false,
  uploaded_by uuid null references public.profils(id) on delete set null,
  uploaded_at timestamptz not null default now(),
  notes text null,
  constraint interview_document_versions_unique unique (document_id, version)
);

create index if not exists interview_document_versions_company_idx on public.interview_document_versions(company_id);
create index if not exists interview_document_versions_document_idx on public.interview_document_versions(document_id, version desc);

create table if not exists public.interview_document_signatures (
  id uuid primary key default gen_random_uuid(),
  company_id integer not null default public.my_company_id() references public.companies(id) on delete restrict,
  document_id uuid not null references public.interview_documents(id) on delete cascade,
  version_id uuid null references public.interview_document_versions(id) on delete set null,
  signatory_profile_id uuid null references public.profils(id) on delete set null,
  signatory_name text not null,
  signatory_role text null,
  signature_type text not null
    check (signature_type in ('manuscrite_papier', 'electronique_simple', 'electronique_avancee', 'autre')),
  signed_at timestamptz not null default now(),
  signature_metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists interview_document_signatures_company_idx on public.interview_document_signatures(company_id);
create index if not exists interview_document_signatures_document_idx on public.interview_document_signatures(document_id);

-- ============================================================
-- 5. Audit trail
-- ============================================================

create table if not exists public.interview_audit_logs (
  id uuid primary key default gen_random_uuid(),
  company_id integer not null default public.my_company_id() references public.companies(id) on delete restrict,
  occurred_at timestamptz not null default now(),
  actor_profile_id uuid null references public.profils(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id uuid null,
  interview_id uuid null references public.interviews(id) on delete set null,
  employee_profile_id uuid null references public.profils(id) on delete set null,
  detail jsonb not null default '{}'::jsonb
);

create index if not exists interview_audit_logs_company_idx on public.interview_audit_logs(company_id, occurred_at desc);
create index if not exists interview_audit_logs_interview_idx on public.interview_audit_logs(interview_id, occurred_at desc);
create index if not exists interview_audit_logs_entity_idx on public.interview_audit_logs(entity_type, entity_id);

-- ============================================================
-- 6. Triggers business
-- ============================================================

create or replace function public.log_interview_status_change()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_actor uuid;
begin
  v_actor := public.current_profile_id();

  if tg_op = 'INSERT' then
    insert into public.interview_status_history (company_id, interview_id, previous_status, new_status, changed_by, change_reason)
    values (new.company_id, new.id, null, new.status, v_actor, 'creation');

    insert into public.interview_audit_logs (company_id, actor_profile_id, action, entity_type, entity_id, interview_id, employee_profile_id, detail)
    values (new.company_id, v_actor, 'create', 'interview', new.id, new.id, new.employee_profile_id, jsonb_build_object('status', new.status));

    return new;
  end if;

  if tg_op = 'UPDATE' then
    if new.status is distinct from old.status then
      insert into public.interview_status_history (company_id, interview_id, previous_status, new_status, changed_by, change_reason)
      values (new.company_id, new.id, old.status, new.status, v_actor, 'update');
    end if;

    insert into public.interview_audit_logs (company_id, actor_profile_id, action, entity_type, entity_id, interview_id, employee_profile_id, detail)
    values (
      new.company_id,
      v_actor,
      case when new.deleted_at is not null and old.deleted_at is null then 'soft_delete' else 'update' end,
      'interview',
      new.id,
      new.id,
      new.employee_profile_id,
      jsonb_build_object('old_status', old.status, 'new_status', new.status)
    );

    return new;
  end if;

  return null;
end;
$$;

create or replace function public.log_interview_document_change()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_actor uuid;
begin
  v_actor := public.current_profile_id();

  if tg_op = 'INSERT' then
    insert into public.interview_audit_logs (company_id, actor_profile_id, action, entity_type, entity_id, interview_id, employee_profile_id, detail)
    values (
      new.company_id,
      v_actor,
      'document_create',
      'interview_document',
      new.id,
      new.interview_id,
      new.employee_profile_id,
      jsonb_build_object('status', new.status, 'document_type', new.document_type)
    );
    return new;
  end if;

  if tg_op = 'UPDATE' then
    insert into public.interview_audit_logs (company_id, actor_profile_id, action, entity_type, entity_id, interview_id, employee_profile_id, detail)
    values (
      new.company_id,
      v_actor,
      'document_update',
      'interview_document',
      new.id,
      new.interview_id,
      new.employee_profile_id,
      jsonb_build_object('old_status', old.status, 'new_status', new.status, 'signed', new.signed)
    );
    return new;
  end if;

  return null;
end;
$$;

drop trigger if exists trg_interviews_audit on public.interviews;
create trigger trg_interviews_audit
after insert or update on public.interviews
for each row execute function public.log_interview_status_change();

drop trigger if exists trg_interview_documents_audit on public.interview_documents;
create trigger trg_interview_documents_audit
after insert or update on public.interview_documents
for each row execute function public.log_interview_document_change();

-- Updated-at triggers si helper disponible

do $$
begin
  if exists (
    select 1
    from pg_proc
    where proname = 'add_updated_at_trigger'
      and pg_function_is_visible(oid)
  ) then
    perform public.add_updated_at_trigger('interview_types');
    perform public.add_updated_at_trigger('interview_document_templates');
    perform public.add_updated_at_trigger('interviews');
    perform public.add_updated_at_trigger('interview_participants');
    perform public.add_updated_at_trigger('interview_notes');
    perform public.add_updated_at_trigger('interview_reports');
    perform public.add_updated_at_trigger('interview_actions');
    perform public.add_updated_at_trigger('interview_objectives');
    perform public.add_updated_at_trigger('interview_documents');
  end if;
exception when others then
  raise notice 'updated_at trigger interviews module non applique: %', sqlerrm;
end $$;

-- ============================================================
-- 7. RLS
-- ============================================================

alter table public.interview_types enable row level security;
alter table public.interview_document_templates enable row level security;
alter table public.interviews enable row level security;
alter table public.interview_participants enable row level security;
alter table public.interview_status_history enable row level security;
alter table public.interview_notes enable row level security;
alter table public.interview_reports enable row level security;
alter table public.interview_actions enable row level security;
alter table public.interview_objectives enable row level security;
alter table public.interview_alerts enable row level security;
alter table public.interview_documents enable row level security;
alter table public.interview_document_versions enable row level security;
alter table public.interview_document_signatures enable row level security;
alter table public.interview_audit_logs enable row level security;

-- Reference tables read

drop policy if exists interview_types_staff_read on public.interview_types;
create policy interview_types_staff_read on public.interview_types
  for select to authenticated
  using (
    company_id = public.my_company_id()
    and public.get_user_role() in ('admin', 'super_admin', 'dirigeant', 'rh', 'exploitant', 'comptable', 'administratif')
  );

drop policy if exists interview_types_rh_write on public.interview_types;
create policy interview_types_rh_write on public.interview_types
  for all to authenticated
  using (
    company_id = public.my_company_id()
    and public.get_user_role() in ('admin', 'super_admin', 'dirigeant', 'rh')
  )
  with check (
    company_id = public.my_company_id()
    and public.get_user_role() in ('admin', 'super_admin', 'dirigeant', 'rh')
  );

drop policy if exists interview_templates_staff_read on public.interview_document_templates;
create policy interview_templates_staff_read on public.interview_document_templates
  for select to authenticated
  using (
    company_id = public.my_company_id()
    and public.get_user_role() in ('admin', 'super_admin', 'dirigeant', 'rh', 'exploitant', 'comptable', 'administratif')
  );

drop policy if exists interview_templates_rh_write on public.interview_document_templates;
create policy interview_templates_rh_write on public.interview_document_templates
  for all to authenticated
  using (
    company_id = public.my_company_id()
    and public.get_user_role() in ('admin', 'super_admin', 'dirigeant', 'rh')
  )
  with check (
    company_id = public.my_company_id()
    and public.get_user_role() in ('admin', 'super_admin', 'dirigeant', 'rh')
  );

-- Core interviews + children

drop policy if exists interviews_read_policy on public.interviews;
create policy interviews_read_policy on public.interviews
  for select to authenticated
  using (
    company_id = public.my_company_id()
    and (
      public.get_user_role() in ('admin', 'super_admin', 'dirigeant', 'rh')
      or employee_profile_id = public.current_profile_id()
      or manager_profile_id = public.current_profile_id()
      or hr_profile_id = public.current_profile_id()
      or creator_profile_id = public.current_profile_id()
      or exists (
        select 1
        from public.interview_participants ip
        where ip.interview_id = interviews.id
          and ip.profile_id = public.current_profile_id()
      )
    )
    and (
      confidentiality_level <> 'disciplinaire'
      or public.get_user_role() in ('admin', 'super_admin', 'dirigeant', 'rh')
      or employee_profile_id = public.current_profile_id()
      or manager_profile_id = public.current_profile_id()
    )
  );

drop policy if exists interviews_write_policy on public.interviews;
create policy interviews_write_policy on public.interviews
  for all to authenticated
  using (
    company_id = public.my_company_id()
    and public.get_user_role() in ('admin', 'super_admin', 'dirigeant', 'rh', 'exploitant')
  )
  with check (
    company_id = public.my_company_id()
    and public.get_user_role() in ('admin', 'super_admin', 'dirigeant', 'rh', 'exploitant')
  );

-- Generic child policy helpers by parent interview visibility

drop policy if exists interview_participants_select on public.interview_participants;
create policy interview_participants_select on public.interview_participants
  for select to authenticated
  using (
    company_id = public.my_company_id()
    and exists (
      select 1
      from public.interviews i
      where i.id = interview_participants.interview_id
    )
  );

drop policy if exists interview_participants_write on public.interview_participants;
create policy interview_participants_write on public.interview_participants
  for all to authenticated
  using (
    company_id = public.my_company_id()
    and public.get_user_role() in ('admin', 'super_admin', 'dirigeant', 'rh', 'exploitant')
  )
  with check (
    company_id = public.my_company_id()
    and public.get_user_role() in ('admin', 'super_admin', 'dirigeant', 'rh', 'exploitant')
  );

drop policy if exists interview_history_select on public.interview_status_history;
create policy interview_history_select on public.interview_status_history
  for select to authenticated
  using (
    company_id = public.my_company_id()
    and exists (
      select 1
      from public.interviews i
      where i.id = interview_status_history.interview_id
    )
  );

drop policy if exists interview_history_write on public.interview_status_history;
create policy interview_history_write on public.interview_status_history
  for all to authenticated
  using (
    company_id = public.my_company_id()
    and public.get_user_role() in ('admin', 'super_admin', 'dirigeant', 'rh', 'exploitant')
  )
  with check (
    company_id = public.my_company_id()
    and public.get_user_role() in ('admin', 'super_admin', 'dirigeant', 'rh', 'exploitant')
  );

drop policy if exists interview_notes_select on public.interview_notes;
create policy interview_notes_select on public.interview_notes
  for select to authenticated
  using (
    company_id = public.my_company_id()
    and exists (
      select 1
      from public.interviews i
      where i.id = interview_notes.interview_id
    )
  );

drop policy if exists interview_notes_write on public.interview_notes;
create policy interview_notes_write on public.interview_notes
  for all to authenticated
  using (
    company_id = public.my_company_id()
    and public.get_user_role() in ('admin', 'super_admin', 'dirigeant', 'rh', 'exploitant')
  )
  with check (
    company_id = public.my_company_id()
    and public.get_user_role() in ('admin', 'super_admin', 'dirigeant', 'rh', 'exploitant')
  );

drop policy if exists interview_reports_select on public.interview_reports;
create policy interview_reports_select on public.interview_reports
  for select to authenticated
  using (
    company_id = public.my_company_id()
    and exists (
      select 1
      from public.interviews i
      where i.id = interview_reports.interview_id
    )
  );

drop policy if exists interview_reports_write on public.interview_reports;
create policy interview_reports_write on public.interview_reports
  for all to authenticated
  using (
    company_id = public.my_company_id()
    and public.get_user_role() in ('admin', 'super_admin', 'dirigeant', 'rh', 'exploitant')
  )
  with check (
    company_id = public.my_company_id()
    and public.get_user_role() in ('admin', 'super_admin', 'dirigeant', 'rh', 'exploitant')
  );

drop policy if exists interview_actions_select on public.interview_actions;
create policy interview_actions_select on public.interview_actions
  for select to authenticated
  using (
    company_id = public.my_company_id()
    and (
      public.get_user_role() in ('admin', 'super_admin', 'dirigeant', 'rh', 'exploitant')
      or employee_profile_id = public.current_profile_id()
      or responsible_profile_id = public.current_profile_id()
    )
  );

drop policy if exists interview_actions_write on public.interview_actions;
create policy interview_actions_write on public.interview_actions
  for all to authenticated
  using (
    company_id = public.my_company_id()
    and public.get_user_role() in ('admin', 'super_admin', 'dirigeant', 'rh', 'exploitant')
  )
  with check (
    company_id = public.my_company_id()
    and public.get_user_role() in ('admin', 'super_admin', 'dirigeant', 'rh', 'exploitant')
  );

drop policy if exists interview_objectives_select on public.interview_objectives;
create policy interview_objectives_select on public.interview_objectives
  for select to authenticated
  using (
    company_id = public.my_company_id()
    and exists (
      select 1
      from public.interviews i
      where i.id = interview_objectives.interview_id
    )
  );

drop policy if exists interview_objectives_write on public.interview_objectives;
create policy interview_objectives_write on public.interview_objectives
  for all to authenticated
  using (
    company_id = public.my_company_id()
    and public.get_user_role() in ('admin', 'super_admin', 'dirigeant', 'rh', 'exploitant')
  )
  with check (
    company_id = public.my_company_id()
    and public.get_user_role() in ('admin', 'super_admin', 'dirigeant', 'rh', 'exploitant')
  );

drop policy if exists interview_alerts_select on public.interview_alerts;
create policy interview_alerts_select on public.interview_alerts
  for select to authenticated
  using (
    company_id = public.my_company_id()
    and public.get_user_role() in ('admin', 'super_admin', 'dirigeant', 'rh', 'exploitant', 'comptable', 'administratif')
  );

drop policy if exists interview_alerts_write on public.interview_alerts;
create policy interview_alerts_write on public.interview_alerts
  for all to authenticated
  using (
    company_id = public.my_company_id()
    and public.get_user_role() in ('admin', 'super_admin', 'dirigeant', 'rh', 'exploitant')
  )
  with check (
    company_id = public.my_company_id()
    and public.get_user_role() in ('admin', 'super_admin', 'dirigeant', 'rh', 'exploitant')
  );

drop policy if exists interview_documents_select on public.interview_documents;
create policy interview_documents_select on public.interview_documents
  for select to authenticated
  using (
    company_id = public.my_company_id()
    and exists (
      select 1
      from public.interviews i
      where i.id = interview_documents.interview_id
    )
  );

drop policy if exists interview_documents_write on public.interview_documents;
create policy interview_documents_write on public.interview_documents
  for all to authenticated
  using (
    company_id = public.my_company_id()
    and public.get_user_role() in ('admin', 'super_admin', 'dirigeant', 'rh', 'exploitant')
  )
  with check (
    company_id = public.my_company_id()
    and public.get_user_role() in ('admin', 'super_admin', 'dirigeant', 'rh', 'exploitant')
  );

drop policy if exists interview_document_versions_select on public.interview_document_versions;
create policy interview_document_versions_select on public.interview_document_versions
  for select to authenticated
  using (
    company_id = public.my_company_id()
    and exists (
      select 1
      from public.interview_documents d
      where d.id = interview_document_versions.document_id
    )
  );

drop policy if exists interview_document_versions_write on public.interview_document_versions;
create policy interview_document_versions_write on public.interview_document_versions
  for all to authenticated
  using (
    company_id = public.my_company_id()
    and public.get_user_role() in ('admin', 'super_admin', 'dirigeant', 'rh', 'exploitant')
  )
  with check (
    company_id = public.my_company_id()
    and public.get_user_role() in ('admin', 'super_admin', 'dirigeant', 'rh', 'exploitant')
  );

drop policy if exists interview_document_signatures_select on public.interview_document_signatures;
create policy interview_document_signatures_select on public.interview_document_signatures
  for select to authenticated
  using (
    company_id = public.my_company_id()
    and exists (
      select 1
      from public.interview_documents d
      where d.id = interview_document_signatures.document_id
    )
  );

drop policy if exists interview_document_signatures_write on public.interview_document_signatures;
create policy interview_document_signatures_write on public.interview_document_signatures
  for all to authenticated
  using (
    company_id = public.my_company_id()
    and public.get_user_role() in ('admin', 'super_admin', 'dirigeant', 'rh', 'exploitant')
  )
  with check (
    company_id = public.my_company_id()
    and public.get_user_role() in ('admin', 'super_admin', 'dirigeant', 'rh', 'exploitant')
  );

drop policy if exists interview_audit_logs_select on public.interview_audit_logs;
create policy interview_audit_logs_select on public.interview_audit_logs
  for select to authenticated
  using (
    company_id = public.my_company_id()
    and public.get_user_role() in ('admin', 'super_admin', 'dirigeant', 'rh')
  );

-- insert/update d'audit reserve aux fonctions/triggers internes.

-- ============================================================
-- 8. Default interview types seed
-- ============================================================

insert into public.interview_types (company_id, code, name, category, description, color_token, is_mandatory, frequency_months)
values
  (coalesce(public.my_company_id(), 1), 'entretien_annuel', 'Entretien annuel', 'management', 'Evaluation annuelle globale.', '#2563EB', false, 12),
  (coalesce(public.my_company_id(), 1), 'entretien_professionnel', 'Entretien professionnel', 'obligatoire', 'Entretien legal periodique.', '#0EA5E9', true, 24),
  (coalesce(public.my_company_id(), 1), 'suivi_individuel', 'Entretien de suivi individuel', 'management', 'Point de suivi regulier.', '#14B8A6', false, 3),
  (coalesce(public.my_company_id(), 1), 'fixation_objectifs', 'Entretien de fixation d objectifs', 'objectifs', 'Definition des objectifs de periode.', '#3B82F6', false, null),
  (coalesce(public.my_company_id(), 1), 'suivi_objectifs', 'Entretien de suivi d objectifs', 'objectifs', 'Mesure intermediaire des objectifs.', '#22C55E', false, null),
  (coalesce(public.my_company_id(), 1), 'reajustement_objectifs', 'Entretien de reajustement d objectifs', 'objectifs', 'Ajustement des objectifs suite contexte.', '#F59E0B', false, null),
  (coalesce(public.my_company_id(), 1), 'cloture_objectifs', 'Entretien de cloture des objectifs', 'objectifs', 'Evaluation finale des objectifs.', '#0F766E', false, null),
  (coalesce(public.my_company_id(), 1), 'recadrage', 'Entretien de recadrage', 'disciplinaire', 'Recadrage comportemental ou organisationnel.', '#DC2626', false, null),
  (coalesce(public.my_company_id(), 1), 'disciplinaire_prealable', 'Entretien disciplinaire / prealable', 'disciplinaire', 'Procedure disciplinaire prealable.', '#991B1B', false, null),
  (coalesce(public.my_company_id(), 1), 'retour_absence', 'Entretien retour d absence', 'rh', 'Reprise apres absence longue.', '#7C3AED', false, null),
  (coalesce(public.my_company_id(), 1), 'fin_periode_essai', 'Entretien fin de periode d essai', 'obligatoire', 'Validation de la periode d essai.', '#1D4ED8', true, null),
  (coalesce(public.my_company_id(), 1), 'mobilite_evolution', 'Entretien mobilite / evolution', 'carriere', 'Projection evolution de poste.', '#0891B2', false, null),
  (coalesce(public.my_company_id(), 1), 'securite_incident', 'Entretien securite / incident', 'securite', 'Debriefing securite suite incident.', '#EA580C', false, null),
  (coalesce(public.my_company_id(), 1), 'developpement_competences', 'Entretien de developpement des competences', 'formation', 'Plan de progression competences.', '#0D9488', false, null)
on conflict (company_id, code) do nothing;
