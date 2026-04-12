-- Employee vault foundation: decoupled employee vault account, post-departure access,
-- document visibility policies, audit logs, and migration bridge from conducteur_documents.

BEGIN;

create extension if not exists pgcrypto;

create or replace function public.employee_vault_touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.current_internal_profile_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select p.id
  from public.profils p
  where p.user_id = auth.uid()
  limit 1
$$;

create or replace function public.current_internal_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select p.role
  from public.profils p
  where p.user_id = auth.uid()
  limit 1
$$;

create or replace function public.is_vault_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.current_internal_role() in ('admin', 'super_admin', 'dirigeant', 'rh'), false)
$$;

create table if not exists public.employee_directory (
  id uuid primary key default gen_random_uuid(),
  company_id integer not null default 1 references public.companies(id) on delete restrict,
  profil_id uuid null unique references public.profils(id) on delete set null,
  conducteur_id uuid null unique references public.conducteurs(id) on delete set null,
  matricule text null,
  first_name text null,
  last_name text null,
  professional_email text null,
  personal_email text null,
  employment_status text not null default 'active' check (employment_status in ('active', 'on_leave', 'departed', 'archived')),
  hire_date date null,
  departure_at date null,
  departure_reason text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint employee_directory_source_check check (profil_id is not null or conducteur_id is not null)
);

create index if not exists idx_employee_directory_company on public.employee_directory(company_id);
create index if not exists idx_employee_directory_status on public.employee_directory(employment_status);
create index if not exists idx_employee_directory_pro_email on public.employee_directory((lower(professional_email)));
create index if not exists idx_employee_directory_personal_email on public.employee_directory((lower(personal_email)));

create table if not exists public.internal_user_accounts (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employee_directory(id) on delete cascade,
  profil_id uuid not null unique references public.profils(id) on delete cascade,
  auth_user_id uuid null unique references auth.users(id) on delete set null,
  role text not null,
  is_active boolean not null default true,
  deactivated_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_internal_user_accounts_employee on public.internal_user_accounts(employee_id);
create index if not exists idx_internal_user_accounts_active on public.internal_user_accounts(is_active);

create table if not exists public.employee_vault_accounts (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employee_directory(id) on delete cascade,
  company_id integer not null default 1 references public.companies(id) on delete restrict,
  auth_user_id uuid null unique references auth.users(id) on delete set null,
  internal_account_id uuid null references public.internal_user_accounts(id) on delete set null,
  personal_email text not null,
  professional_email_snapshot text null,
  status text not null default 'invited' check (status in ('invited', 'active', 'locked', 'archived')),
  keep_access_after_departure boolean not null default true,
  must_reset_password boolean not null default false,
  last_login_at timestamptz null,
  access_expires_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint employee_vault_accounts_email_check check (position('@' in personal_email) > 1),
  constraint employee_vault_accounts_employee_unique unique (employee_id)
);

create unique index if not exists idx_employee_vault_accounts_company_email_unique
  on public.employee_vault_accounts(company_id, lower(personal_email));
create index if not exists idx_employee_vault_accounts_status on public.employee_vault_accounts(status);

create table if not exists public.document_visibility_policies (
  id uuid primary key default gen_random_uuid(),
  company_id integer not null default 1 references public.companies(id) on delete restrict,
  policy_key text not null,
  document_type text not null,
  label text not null,
  visible_during_contract boolean not null default true,
  visible_after_departure boolean not null default false,
  available_days_after_departure integer null check (available_days_after_departure is null or available_days_after_departure >= 0),
  allow_download boolean not null default true,
  allow_export boolean not null default false,
  retention_days integer null check (retention_days is null or retention_days > 0),
  require_acknowledgement boolean not null default false,
  require_signature boolean not null default false,
  is_sensitive boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint document_visibility_policies_key_unique unique (company_id, policy_key),
  constraint document_visibility_policies_type_unique unique (company_id, document_type)
);

create table if not exists public.employee_vault_documents (
  id uuid primary key default gen_random_uuid(),
  company_id integer not null default 1 references public.companies(id) on delete restrict,
  employee_id uuid not null references public.employee_directory(id) on delete cascade,
  policy_id uuid not null references public.document_visibility_policies(id) on delete restrict,
  legacy_conducteur_document_id uuid null unique references public.conducteur_documents(id) on delete set null,
  document_type text not null,
  title text not null,
  file_name text not null,
  mime_type text not null default 'application/pdf',
  storage_bucket text not null default 'employee-vault-documents',
  storage_path text not null,
  origin_source text not null default 'hr_upload' check (origin_source in ('hr_upload', 'hr_generated', 'employee_upload', 'migration_conducteur', 'system')),
  visibility_override_after_departure boolean null,
  issued_at date null,
  expires_at date null,
  published_at timestamptz not null default now(),
  current_version_no integer not null default 1 check (current_version_no >= 1),
  archived_at timestamptz null,
  created_by_internal_profile_id uuid null references public.profils(id) on delete set null,
  created_by_vault_account_id uuid null references public.employee_vault_accounts(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint employee_vault_documents_storage_unique unique (storage_bucket, storage_path)
);

create index if not exists idx_employee_vault_documents_employee on public.employee_vault_documents(employee_id);
create index if not exists idx_employee_vault_documents_type on public.employee_vault_documents(document_type);
create index if not exists idx_employee_vault_documents_published on public.employee_vault_documents(published_at desc);
create index if not exists idx_employee_vault_documents_archived on public.employee_vault_documents(archived_at);

create table if not exists public.employee_vault_document_versions (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.employee_vault_documents(id) on delete cascade,
  version_no integer not null check (version_no >= 1),
  file_name text not null,
  mime_type text not null,
  size_bytes bigint null check (size_bytes is null or size_bytes >= 0),
  hash_sha256 text null,
  storage_bucket text not null default 'employee-vault-documents',
  storage_path text not null,
  change_reason text null,
  uploaded_by_internal_profile_id uuid null references public.profils(id) on delete set null,
  uploaded_by_vault_account_id uuid null references public.employee_vault_accounts(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint employee_vault_document_versions_unique unique (document_id, version_no),
  constraint employee_vault_document_versions_storage_unique unique (storage_bucket, storage_path)
);

create index if not exists idx_employee_vault_document_versions_document on public.employee_vault_document_versions(document_id);

create table if not exists public.employee_vault_access_logs (
  id bigserial primary key,
  company_id integer not null default 1 references public.companies(id) on delete restrict,
  document_id uuid null references public.employee_vault_documents(id) on delete set null,
  document_version_id uuid null references public.employee_vault_document_versions(id) on delete set null,
  employee_id uuid null references public.employee_directory(id) on delete set null,
  vault_account_id uuid null references public.employee_vault_accounts(id) on delete set null,
  internal_profile_id uuid null references public.profils(id) on delete set null,
  action text not null check (action in ('view', 'preview', 'download', 'export', 'ack', 'sign', 'upload', 'failed_access')),
  channel text not null default 'web',
  ip_hash text null,
  user_agent text null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_employee_vault_access_logs_document on public.employee_vault_access_logs(document_id, created_at desc);
create index if not exists idx_employee_vault_access_logs_employee on public.employee_vault_access_logs(employee_id, created_at desc);

create table if not exists public.employee_vault_exit_workflows (
  id uuid primary key default gen_random_uuid(),
  company_id integer not null default 1 references public.companies(id) on delete restrict,
  employee_id uuid not null unique references public.employee_directory(id) on delete cascade,
  status text not null default 'draft' check (status in ('draft', 'scheduled', 'executed', 'cancelled')),
  planned_exit_at timestamptz null,
  executed_at timestamptz null,
  disable_internal_account boolean not null default true,
  keep_vault_access boolean not null default true,
  vault_access_expires_at timestamptz null,
  vault_personal_email text null,
  checklist jsonb not null default '{}'::jsonb,
  notes text null,
  executed_by_profile_id uuid null references public.profils(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_employee_vault_exit_workflows_status on public.employee_vault_exit_workflows(status);

create table if not exists public.employee_document_exports (
  id uuid primary key default gen_random_uuid(),
  company_id integer not null default 1 references public.companies(id) on delete restrict,
  employee_id uuid not null references public.employee_directory(id) on delete cascade,
  requested_by_vault_account_id uuid null references public.employee_vault_accounts(id) on delete set null,
  requested_by_internal_profile_id uuid null references public.profils(id) on delete set null,
  scope text not null default 'visible_only' check (scope in ('full', 'visible_only', 'by_type', 'by_period')),
  status text not null default 'requested' check (status in ('requested', 'processing', 'ready', 'expired', 'failed')),
  filters jsonb not null default '{}'::jsonb,
  file_name text null,
  mime_type text null,
  storage_bucket text null,
  storage_path text null,
  expires_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_employee_document_exports_employee on public.employee_document_exports(employee_id, created_at desc);

create table if not exists public.employee_document_consents (
  id uuid primary key default gen_random_uuid(),
  company_id integer not null default 1 references public.companies(id) on delete restrict,
  employee_id uuid not null references public.employee_directory(id) on delete cascade,
  document_id uuid not null references public.employee_vault_documents(id) on delete cascade,
  document_version_id uuid not null references public.employee_vault_document_versions(id) on delete cascade,
  vault_account_id uuid not null references public.employee_vault_accounts(id) on delete cascade,
  consent_type text not null check (consent_type in ('acknowledgement', 'signature', 'consent')),
  status text not null default 'pending' check (status in ('pending', 'accepted', 'rejected', 'revoked')),
  signed_label text null,
  signed_at timestamptz null,
  ip_hash text null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint employee_document_consents_unique unique (document_version_id, vault_account_id, consent_type)
);

create index if not exists idx_employee_document_consents_document on public.employee_document_consents(document_id, created_at desc);

create or replace function public.current_vault_account_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select a.id
  from public.employee_vault_accounts a
  where a.auth_user_id = auth.uid()
    and a.status = 'active'
    and (a.access_expires_at is null or a.access_expires_at > now())
  limit 1
$$;

create or replace function public.current_vault_employee_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select a.employee_id
  from public.employee_vault_accounts a
  where a.auth_user_id = auth.uid()
    and a.status = 'active'
    and (a.access_expires_at is null or a.access_expires_at > now())
  limit 1
$$;

create or replace function public.can_current_vault_user_read_document(p_document_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_account public.employee_vault_accounts;
  v_document public.employee_vault_documents;
  v_policy public.document_visibility_policies;
  v_employee public.employee_directory;
  v_departed boolean;
  v_visible_after_departure boolean;
begin
  select * into v_account
  from public.employee_vault_accounts
  where auth_user_id = auth.uid()
    and status = 'active'
    and (access_expires_at is null or access_expires_at > now())
  limit 1;

  if v_account.id is null then
    return false;
  end if;

  select * into v_document
  from public.employee_vault_documents
  where id = p_document_id
    and archived_at is null;

  if v_document.id is null then
    return false;
  end if;

  if v_document.employee_id <> v_account.employee_id then
    return false;
  end if;

  select * into v_policy
  from public.document_visibility_policies
  where id = v_document.policy_id
    and is_active = true;

  if v_policy.id is null then
    return false;
  end if;

  select * into v_employee
  from public.employee_directory
  where id = v_document.employee_id;

  if v_employee.id is null then
    return false;
  end if;

  v_departed := (
    v_employee.employment_status = 'departed'
    or (v_employee.departure_at is not null and v_employee.departure_at <= current_date)
  );

  if not v_departed then
    return v_policy.visible_during_contract;
  end if;

  v_visible_after_departure := coalesce(v_document.visibility_override_after_departure, v_policy.visible_after_departure);
  if not v_visible_after_departure then
    return false;
  end if;

  if v_policy.available_days_after_departure is null then
    return true;
  end if;

  if v_employee.departure_at is null then
    return true;
  end if;

  return current_date <= (v_employee.departure_at + v_policy.available_days_after_departure);
end;
$$;

create or replace function public.can_current_vault_user_download_document(p_document_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_policy public.document_visibility_policies;
  v_document public.employee_vault_documents;
begin
  if not public.can_current_vault_user_read_document(p_document_id) then
    return false;
  end if;

  select * into v_document
  from public.employee_vault_documents
  where id = p_document_id;

  if v_document.id is null then
    return false;
  end if;

  select * into v_policy
  from public.document_visibility_policies
  where id = v_document.policy_id;

  return coalesce(v_policy.allow_download, false);
end;
$$;

create or replace function public.process_employee_exit(
  p_employee_id uuid,
  p_departure_at date,
  p_departure_reason text default null,
  p_disable_internal_account boolean default true,
  p_keep_vault_access boolean default true,
  p_vault_access_expires_at timestamptz default null,
  p_vault_personal_email text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor_profile uuid := public.current_internal_profile_id();
  v_actor_role text := public.current_internal_role();
begin
  if v_actor_role is distinct from null and v_actor_role not in ('admin', 'super_admin', 'dirigeant', 'rh') then
    raise exception 'Acces refuse: role % non autorise pour workflow de sortie', v_actor_role;
  end if;

  update public.employee_directory
  set
    employment_status = 'departed',
    departure_at = coalesce(p_departure_at, departure_at, current_date),
    departure_reason = coalesce(p_departure_reason, departure_reason),
    updated_at = now()
  where id = p_employee_id;

  if p_disable_internal_account then
    update public.internal_user_accounts
    set is_active = false,
        deactivated_at = coalesce(deactivated_at, now()),
        updated_at = now()
    where employee_id = p_employee_id;

    update public.profils p
    set is_active = false,
        account_status = 'inactive',
        updated_at = now()
    where p.id in (
      select i.profil_id
      from public.internal_user_accounts i
      where i.employee_id = p_employee_id
    );
  end if;

  update public.employee_vault_accounts
  set
    keep_access_after_departure = p_keep_vault_access,
    status = case when p_keep_vault_access then 'active' else 'locked' end,
    access_expires_at = p_vault_access_expires_at,
    personal_email = coalesce(p_vault_personal_email, personal_email),
    updated_at = now()
  where employee_id = p_employee_id;

  insert into public.employee_vault_exit_workflows (
    company_id,
    employee_id,
    status,
    planned_exit_at,
    executed_at,
    disable_internal_account,
    keep_vault_access,
    vault_access_expires_at,
    vault_personal_email,
    executed_by_profile_id,
    checklist,
    notes
  )
  values (
    coalesce((select company_id from public.employee_directory where id = p_employee_id), 1),
    p_employee_id,
    'executed',
    now(),
    now(),
    p_disable_internal_account,
    p_keep_vault_access,
    p_vault_access_expires_at,
    p_vault_personal_email,
    v_actor_profile,
    jsonb_build_object(
      'internal_access_disabled', p_disable_internal_account,
      'vault_access_kept', p_keep_vault_access
    ),
    coalesce(p_departure_reason, 'Sortie salarie executee')
  )
  on conflict (employee_id)
  do update set
    status = excluded.status,
    planned_exit_at = excluded.planned_exit_at,
    executed_at = excluded.executed_at,
    disable_internal_account = excluded.disable_internal_account,
    keep_vault_access = excluded.keep_vault_access,
    vault_access_expires_at = excluded.vault_access_expires_at,
    vault_personal_email = coalesce(excluded.vault_personal_email, public.employee_vault_exit_workflows.vault_personal_email),
    executed_by_profile_id = excluded.executed_by_profile_id,
    checklist = excluded.checklist,
    notes = excluded.notes,
    updated_at = now();

  return jsonb_build_object(
    'employee_id', p_employee_id,
    'status', 'executed',
    'internal_access_disabled', p_disable_internal_account,
    'vault_access_kept', p_keep_vault_access,
    'vault_access_expires_at', p_vault_access_expires_at
  );
end;
$$;

create or replace trigger trg_employee_directory_touch
before update on public.employee_directory
for each row execute function public.employee_vault_touch_updated_at();

create or replace trigger trg_internal_user_accounts_touch
before update on public.internal_user_accounts
for each row execute function public.employee_vault_touch_updated_at();

create or replace trigger trg_employee_vault_accounts_touch
before update on public.employee_vault_accounts
for each row execute function public.employee_vault_touch_updated_at();

create or replace trigger trg_document_visibility_policies_touch
before update on public.document_visibility_policies
for each row execute function public.employee_vault_touch_updated_at();

create or replace trigger trg_employee_vault_documents_touch
before update on public.employee_vault_documents
for each row execute function public.employee_vault_touch_updated_at();

create or replace trigger trg_employee_vault_exit_workflows_touch
before update on public.employee_vault_exit_workflows
for each row execute function public.employee_vault_touch_updated_at();

create or replace trigger trg_employee_document_exports_touch
before update on public.employee_document_exports
for each row execute function public.employee_vault_touch_updated_at();

create or replace trigger trg_employee_document_consents_touch
before update on public.employee_document_consents
for each row execute function public.employee_vault_touch_updated_at();

insert into public.document_visibility_policies (
  company_id,
  policy_key,
  document_type,
  label,
  visible_during_contract,
  visible_after_departure,
  available_days_after_departure,
  allow_download,
  allow_export,
  retention_days,
  require_acknowledgement,
  require_signature,
  is_sensitive
)
values
  (1, 'bulletin_paie_default', 'bulletin_paie', 'Bulletins de paie', true, true, null, true, true, 3650, false, false, true),
  (1, 'contrat_default', 'contrat', 'Contrats de travail', true, true, null, true, true, 3650, true, true, true),
  (1, 'avenant_default', 'avenant', 'Avenants', true, true, null, true, true, 3650, true, true, true),
  (1, 'attestation_default', 'attestation', 'Attestations RH', true, true, 3650, true, true, 3650, false, false, false),
  (1, 'document_rh_remis_default', 'document_rh_remis', 'Documents RH remis au salarie', true, true, 1095, true, false, 1825, true, false, false),
  (1, 'document_signe_default', 'document_signe', 'Documents signes', true, true, null, true, true, 3650, true, true, true),
  (1, 'entretien_default', 'entretien', 'Entretiens salaries', true, false, 0, true, false, 1095, false, false, true),
  (1, 'convocation_default', 'convocation', 'Convocations', true, false, 0, false, false, 365, true, false, true),
  (1, 'avertissement_default', 'avertissement', 'Avertissements', true, false, 0, false, false, 1825, true, true, true),
  (1, 'fin_contrat_default', 'fin_contrat', 'Documents de fin de contrat', true, true, null, true, true, 3650, true, true, true),
  (1, 'justificatif_personnel_default', 'justificatif_personnel', 'Justificatifs personnels du salarie', true, true, 3650, true, true, 3650, false, false, true)
on conflict (company_id, policy_key) do update set
  label = excluded.label,
  visible_during_contract = excluded.visible_during_contract,
  visible_after_departure = excluded.visible_after_departure,
  available_days_after_departure = excluded.available_days_after_departure,
  allow_download = excluded.allow_download,
  allow_export = excluded.allow_export,
  retention_days = excluded.retention_days,
  require_acknowledgement = excluded.require_acknowledgement,
  require_signature = excluded.require_signature,
  is_sensitive = excluded.is_sensitive,
  is_active = true,
  updated_at = now();

insert into public.employee_directory (
  company_id,
  profil_id,
  matricule,
  first_name,
  last_name,
  professional_email,
  employment_status,
  created_at,
  updated_at
)
select
  coalesce(p.company_id, 1),
  p.id,
  nullif(trim(p.matricule), ''),
  p.prenom,
  p.nom,
  lower(trim(u.email)),
  case when coalesce(p.is_active, true) then 'active' else 'departed' end,
  coalesce(p.created_at, now()),
  now()
from public.profils p
left join auth.users u on u.id = p.user_id
where p.role not in ('client', 'affreteur')
on conflict (profil_id)
do update set
  matricule = coalesce(excluded.matricule, public.employee_directory.matricule),
  first_name = coalesce(excluded.first_name, public.employee_directory.first_name),
  last_name = coalesce(excluded.last_name, public.employee_directory.last_name),
  professional_email = coalesce(excluded.professional_email, public.employee_directory.professional_email),
  employment_status = case
    when public.employee_directory.employment_status = 'departed' then 'departed'
    else excluded.employment_status
  end,
  updated_at = now();

insert into public.employee_directory (
  company_id,
  conducteur_id,
  matricule,
  first_name,
  last_name,
  professional_email,
  hire_date,
  departure_at,
  departure_reason,
  employment_status,
  created_at,
  updated_at
)
select
  coalesce(c.company_id, 1),
  c.id,
  c.matricule,
  c.prenom,
  c.nom,
  lower(trim(c.email)),
  c.date_entree,
  c.date_sortie,
  c.motif_sortie,
  case
    when c.date_sortie is not null and c.date_sortie <= current_date then 'departed'
    else 'active'
  end,
  now(),
  now()
from public.conducteurs c
on conflict (conducteur_id)
do update set
  matricule = coalesce(excluded.matricule, public.employee_directory.matricule),
  first_name = coalesce(excluded.first_name, public.employee_directory.first_name),
  last_name = coalesce(excluded.last_name, public.employee_directory.last_name),
  professional_email = coalesce(excluded.professional_email, public.employee_directory.professional_email),
  hire_date = coalesce(excluded.hire_date, public.employee_directory.hire_date),
  departure_at = coalesce(excluded.departure_at, public.employee_directory.departure_at),
  departure_reason = coalesce(excluded.departure_reason, public.employee_directory.departure_reason),
  employment_status = case
    when excluded.employment_status = 'departed' then 'departed'
    else public.employee_directory.employment_status
  end,
  updated_at = now();

update public.employee_directory e
set conducteur_id = c.id,
    updated_at = now()
from public.conducteurs c
where e.conducteur_id is null
  and e.profil_id is not null
  and e.professional_email is not null
  and c.email is not null
  and lower(e.professional_email) = lower(c.email)
  and not exists (
    select 1
    from public.employee_directory e2
    where e2.conducteur_id = c.id
      and e2.id <> e.id
  );

insert into public.internal_user_accounts (
  employee_id,
  profil_id,
  auth_user_id,
  role,
  is_active,
  deactivated_at,
  created_at,
  updated_at
)
select
  e.id,
  p.id,
  p.user_id,
  p.role,
  coalesce(p.is_active, true),
  case when coalesce(p.is_active, true) then null else now() end,
  now(),
  now()
from public.profils p
join public.employee_directory e on e.profil_id = p.id
on conflict (profil_id)
do update set
  employee_id = excluded.employee_id,
  auth_user_id = excluded.auth_user_id,
  role = excluded.role,
  is_active = excluded.is_active,
  deactivated_at = excluded.deactivated_at,
  updated_at = now();

insert into public.employee_vault_accounts (
  employee_id,
  company_id,
  auth_user_id,
  internal_account_id,
  personal_email,
  professional_email_snapshot,
  status,
  keep_access_after_departure,
  created_at,
  updated_at
)
select
  e.id,
  e.company_id,
  i.auth_user_id,
  i.id,
  coalesce(nullif(lower(trim(e.personal_email)), ''), nullif(lower(trim(e.professional_email)), ''), lower(trim('employee+' || e.id::text || '@vault.local'))),
  nullif(lower(trim(e.professional_email)), ''),
  case when i.auth_user_id is null then 'invited' else 'active' end,
  true,
  now(),
  now()
from public.employee_directory e
left join public.internal_user_accounts i on i.employee_id = e.id
on conflict (employee_id)
do update set
  company_id = excluded.company_id,
  internal_account_id = coalesce(excluded.internal_account_id, public.employee_vault_accounts.internal_account_id),
  professional_email_snapshot = coalesce(excluded.professional_email_snapshot, public.employee_vault_accounts.professional_email_snapshot),
  personal_email = coalesce(public.employee_vault_accounts.personal_email, excluded.personal_email),
  updated_at = now();

insert into public.employee_vault_documents (
  company_id,
  employee_id,
  policy_id,
  legacy_conducteur_document_id,
  document_type,
  title,
  file_name,
  mime_type,
  storage_bucket,
  storage_path,
  origin_source,
  issued_at,
  expires_at,
  published_at,
  archived_at,
  created_at,
  updated_at
)
select
  coalesce(cd.company_id, 1),
  e.id,
  p.id,
  cd.id,
  p.document_type,
  coalesce(nullif(trim(cd.title), ''), nullif(trim(cd.file_name), ''), 'Document RH'),
  coalesce(nullif(trim(cd.file_name), ''), 'document.pdf'),
  coalesce(nullif(trim(cd.mime_type), ''), 'application/pdf'),
  coalesce(nullif(trim(cd.storage_bucket), ''), 'conducteur-documents'),
  coalesce(nullif(trim(cd.storage_path), ''), nullif(trim(cd.file_path), ''), 'legacy/' || cd.id::text),
  'migration_conducteur',
  cd.issued_at,
  cd.expires_at,
  coalesce(cd.created_at, now()),
  cd.archived_at,
  coalesce(cd.created_at, now()),
  now()
from public.conducteur_documents cd
join public.employee_directory e on e.conducteur_id = cd.conducteur_id
join lateral (
  select
    d.id,
    d.document_type
  from public.document_visibility_policies d
  where d.company_id = coalesce(cd.company_id, 1)
    and d.document_type = case
      when cd.category in ('fiche_paie', 'paie') then 'bulletin_paie'
      when cd.category in ('contrat_travail', 'contrat') then 'contrat'
      when cd.category in ('avenant') then 'avenant'
      when cd.category in ('attestation') then 'attestation'
      when cd.category in ('convocation') then 'convocation'
      when cd.category in ('avertissement') then 'avertissement'
      when cd.category in ('fin_contrat') then 'fin_contrat'
      else 'document_rh_remis'
    end
  limit 1
) p on true
on conflict (legacy_conducteur_document_id)
do update set
  title = excluded.title,
  file_name = excluded.file_name,
  mime_type = excluded.mime_type,
  storage_bucket = excluded.storage_bucket,
  storage_path = excluded.storage_path,
  issued_at = excluded.issued_at,
  expires_at = excluded.expires_at,
  archived_at = excluded.archived_at,
  updated_at = now();

insert into public.employee_vault_document_versions (
  document_id,
  version_no,
  file_name,
  mime_type,
  size_bytes,
  storage_bucket,
  storage_path,
  change_reason,
  created_at
)
select
  d.id,
  1,
  d.file_name,
  d.mime_type,
  null,
  d.storage_bucket,
  d.storage_path,
  'Initial import from conducteur_documents',
  d.created_at
from public.employee_vault_documents d
left join public.employee_vault_document_versions v
  on v.document_id = d.id
 and v.version_no = 1
where v.id is null;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('employee-vault-documents', 'employee-vault-documents', false, 26214400, array['application/pdf', 'image/png', 'image/jpeg'])
on conflict (id) do nothing;

alter table public.employee_directory enable row level security;
alter table public.internal_user_accounts enable row level security;
alter table public.employee_vault_accounts enable row level security;
alter table public.document_visibility_policies enable row level security;
alter table public.employee_vault_documents enable row level security;
alter table public.employee_vault_document_versions enable row level security;
alter table public.employee_vault_access_logs enable row level security;
alter table public.employee_vault_exit_workflows enable row level security;
alter table public.employee_document_exports enable row level security;
alter table public.employee_document_consents enable row level security;

drop policy if exists employee_directory_read on public.employee_directory;
create policy employee_directory_read
  on public.employee_directory
  for select
  to authenticated
  using (
    public.is_vault_admin()
    or id = public.current_vault_employee_id()
    or id in (
      select i.employee_id
      from public.internal_user_accounts i
      where i.auth_user_id = auth.uid()
        and i.is_active = true
    )
  );

drop policy if exists employee_directory_admin_write on public.employee_directory;
create policy employee_directory_admin_write
  on public.employee_directory
  for all
  to authenticated
  using (public.is_vault_admin())
  with check (public.is_vault_admin());

drop policy if exists internal_user_accounts_admin_all on public.internal_user_accounts;
create policy internal_user_accounts_admin_all
  on public.internal_user_accounts
  for all
  to authenticated
  using (public.is_vault_admin())
  with check (public.is_vault_admin());

drop policy if exists employee_vault_accounts_read on public.employee_vault_accounts;
create policy employee_vault_accounts_read
  on public.employee_vault_accounts
  for select
  to authenticated
  using (public.is_vault_admin() or auth_user_id = auth.uid());

drop policy if exists employee_vault_accounts_admin_write on public.employee_vault_accounts;
create policy employee_vault_accounts_admin_write
  on public.employee_vault_accounts
  for all
  to authenticated
  using (public.is_vault_admin())
  with check (public.is_vault_admin());

drop policy if exists document_visibility_policies_read on public.document_visibility_policies;
create policy document_visibility_policies_read
  on public.document_visibility_policies
  for select
  to authenticated
  using (public.is_vault_admin() or is_active = true);

drop policy if exists document_visibility_policies_admin_write on public.document_visibility_policies;
create policy document_visibility_policies_admin_write
  on public.document_visibility_policies
  for all
  to authenticated
  using (public.is_vault_admin())
  with check (public.is_vault_admin());

drop policy if exists employee_vault_documents_read on public.employee_vault_documents;
create policy employee_vault_documents_read
  on public.employee_vault_documents
  for select
  to authenticated
  using (public.is_vault_admin() or public.can_current_vault_user_read_document(id));

drop policy if exists employee_vault_documents_admin_write on public.employee_vault_documents;
create policy employee_vault_documents_admin_write
  on public.employee_vault_documents
  for all
  to authenticated
  using (public.is_vault_admin())
  with check (public.is_vault_admin());

drop policy if exists employee_vault_documents_employee_upload on public.employee_vault_documents;
create policy employee_vault_documents_employee_upload
  on public.employee_vault_documents
  for insert
  to authenticated
  with check (
    public.current_vault_employee_id() = employee_id
    and public.current_vault_account_id() is not null
    and created_by_vault_account_id = public.current_vault_account_id()
    and origin_source = 'employee_upload'
    and document_type = 'justificatif_personnel'
  );

drop policy if exists employee_vault_document_versions_read on public.employee_vault_document_versions;
create policy employee_vault_document_versions_read
  on public.employee_vault_document_versions
  for select
  to authenticated
  using (public.is_vault_admin() or public.can_current_vault_user_read_document(document_id));

drop policy if exists employee_vault_document_versions_admin_write on public.employee_vault_document_versions;
create policy employee_vault_document_versions_admin_write
  on public.employee_vault_document_versions
  for all
  to authenticated
  using (public.is_vault_admin())
  with check (public.is_vault_admin());

drop policy if exists employee_vault_access_logs_insert on public.employee_vault_access_logs;
create policy employee_vault_access_logs_insert
  on public.employee_vault_access_logs
  for insert
  to authenticated
  with check (
    public.is_vault_admin()
    or vault_account_id = public.current_vault_account_id()
    or (
      employee_id is not null
      and employee_id = public.current_vault_employee_id()
    )
  );

drop policy if exists employee_vault_access_logs_read on public.employee_vault_access_logs;
create policy employee_vault_access_logs_read
  on public.employee_vault_access_logs
  for select
  to authenticated
  using (public.is_vault_admin());

drop policy if exists employee_vault_exit_workflows_admin_all on public.employee_vault_exit_workflows;
create policy employee_vault_exit_workflows_admin_all
  on public.employee_vault_exit_workflows
  for all
  to authenticated
  using (public.is_vault_admin())
  with check (public.is_vault_admin());

drop policy if exists employee_document_exports_read on public.employee_document_exports;
create policy employee_document_exports_read
  on public.employee_document_exports
  for select
  to authenticated
  using (
    public.is_vault_admin()
    or requested_by_vault_account_id = public.current_vault_account_id()
    or employee_id = public.current_vault_employee_id()
  );

drop policy if exists employee_document_exports_request on public.employee_document_exports;
create policy employee_document_exports_request
  on public.employee_document_exports
  for insert
  to authenticated
  with check (
    public.is_vault_admin()
    or (
      employee_id = public.current_vault_employee_id()
      and requested_by_vault_account_id = public.current_vault_account_id()
      and scope in ('visible_only', 'by_type', 'by_period')
    )
  );

drop policy if exists employee_document_exports_admin_update on public.employee_document_exports;
create policy employee_document_exports_admin_update
  on public.employee_document_exports
  for update
  to authenticated
  using (public.is_vault_admin())
  with check (public.is_vault_admin());

drop policy if exists employee_document_consents_read on public.employee_document_consents;
create policy employee_document_consents_read
  on public.employee_document_consents
  for select
  to authenticated
  using (
    public.is_vault_admin()
    or vault_account_id = public.current_vault_account_id()
  );

drop policy if exists employee_document_consents_write on public.employee_document_consents;
create policy employee_document_consents_write
  on public.employee_document_consents
  for insert
  to authenticated
  with check (
    vault_account_id = public.current_vault_account_id()
    and employee_id = public.current_vault_employee_id()
    and public.can_current_vault_user_read_document(document_id)
  );

drop policy if exists employee_document_consents_update on public.employee_document_consents;
create policy employee_document_consents_update
  on public.employee_document_consents
  for update
  to authenticated
  using (
    public.is_vault_admin()
    or vault_account_id = public.current_vault_account_id()
  )
  with check (
    public.is_vault_admin()
    or vault_account_id = public.current_vault_account_id()
  );

drop policy if exists employee_vault_storage_select on storage.objects;
create policy employee_vault_storage_select
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'employee-vault-documents'
    and (
      public.is_vault_admin()
      or split_part(name, '/', 1) = coalesce(public.current_vault_account_id()::text, '')
    )
  );

drop policy if exists employee_vault_storage_insert on storage.objects;
create policy employee_vault_storage_insert
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'employee-vault-documents'
    and (
      public.is_vault_admin()
      or split_part(name, '/', 1) = coalesce(public.current_vault_account_id()::text, '')
    )
  );

drop policy if exists employee_vault_storage_update on storage.objects;
create policy employee_vault_storage_update
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'employee-vault-documents'
    and (
      public.is_vault_admin()
      or split_part(name, '/', 1) = coalesce(public.current_vault_account_id()::text, '')
    )
  )
  with check (
    bucket_id = 'employee-vault-documents'
    and (
      public.is_vault_admin()
      or split_part(name, '/', 1) = coalesce(public.current_vault_account_id()::text, '')
    )
  );

drop policy if exists employee_vault_storage_delete on storage.objects;
create policy employee_vault_storage_delete
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'employee-vault-documents'
    and (
      public.is_vault_admin()
      or split_part(name, '/', 1) = coalesce(public.current_vault_account_id()::text, '')
    )
  );

create or replace view public.v_employee_vault_documents as
select
  d.id,
  d.company_id,
  d.employee_id,
  e.first_name,
  e.last_name,
  e.employment_status,
  e.departure_at,
  d.document_type,
  d.title,
  d.file_name,
  d.mime_type,
  d.storage_bucket,
  d.storage_path,
  d.origin_source,
  d.published_at,
  d.expires_at,
  d.current_version_no,
  p.label as policy_label,
  p.visible_during_contract,
  p.visible_after_departure,
  p.available_days_after_departure,
  p.allow_download,
  p.allow_export,
  p.require_acknowledgement,
  p.require_signature
from public.employee_vault_documents d
join public.employee_directory e on e.id = d.employee_id
join public.document_visibility_policies p on p.id = d.policy_id
where d.archived_at is null;

COMMIT;
