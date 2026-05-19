-- ============================================================
-- Audit ERP leger : auteur, date, action et champs modifies
-- Objectif : tracer les creations / modifications / suppressions
-- sans stocker un historique verbeux accessible a tout le monde.
-- ============================================================

create table if not exists public.erp_audit_logs (
  id uuid primary key default gen_random_uuid(),
  company_id integer not null references public.companies(id) on delete cascade,
  module_code text not null,
  schema_name text not null default 'public',
  table_name text not null,
  record_id uuid null,
  record_label text null,
  action text not null check (action in ('insert', 'update', 'delete')),
  actor_user_id uuid null references auth.users(id) on delete set null,
  actor_role text null,
  audit_origin text not null default 'app',
  changed_fields text[] not null default '{}',
  change_summary jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now()
);

alter table public.erp_audit_logs enable row level security;

create index if not exists erp_audit_logs_company_occurred_idx
  on public.erp_audit_logs(company_id, occurred_at desc);

create index if not exists erp_audit_logs_record_idx
  on public.erp_audit_logs(table_name, record_id, occurred_at desc);

create index if not exists erp_audit_logs_actor_idx
  on public.erp_audit_logs(actor_user_id, occurred_at desc);

create or replace function public.current_audit_origin()
returns text
language sql
stable
as $$
  select coalesce(nullif(current_setting('app.audit_origin', true), ''), 'app');
$$;

create or replace function public.audit_pick_label(payload jsonb)
returns text
language sql
immutable
as $$
  select coalesce(
    payload ->> 'reference',
    payload ->> 'numero',
    payload ->> 'nom',
    payload ->> 'immatriculation',
    payload ->> 'email',
    payload ->> 'id'
  );
$$;

create or replace function public.audit_strip_technical_fields(payload jsonb)
returns jsonb
language sql
immutable
as $$
  select coalesce(payload, '{}'::jsonb)
    - 'created_at'
    - 'updated_at'
    - 'created_by'
    - 'updated_by'
    - 'archived_at';
$$;

create or replace function public.audit_jsonb_diff(old_payload jsonb, new_payload jsonb)
returns jsonb
language plpgsql
immutable
as $$
declare
  result jsonb := '{}'::jsonb;
  key_name text;
  old_value jsonb;
  new_value jsonb;
  source_old jsonb := public.audit_strip_technical_fields(old_payload);
  source_new jsonb := public.audit_strip_technical_fields(new_payload);
begin
  for key_name in
    select key_name
    from (
      select jsonb_object_keys(source_old) as key_name
      union
      select jsonb_object_keys(source_new) as key_name
    ) merged_keys
  loop
    old_value := source_old -> key_name;
    new_value := source_new -> key_name;

    if old_value is distinct from new_value then
      result := result || jsonb_build_object(
        key_name,
        jsonb_build_object('before', old_value, 'after', new_value)
      );
    end if;
  end loop;

  return result;
end;
$$;

create or replace function public.audit_changed_fields(diff_payload jsonb)
returns text[]
language sql
immutable
as $$
  select coalesce(array_agg(key_name order by key_name), '{}'::text[])
  from jsonb_object_keys(coalesce(diff_payload, '{}'::jsonb)) as key_name;
$$;

create or replace function public.erp_audit_stamp_actor_columns()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'INSERT' then
    if new.created_by is null then
      new.created_by := auth.uid();
    end if;
    if new.updated_by is null then
      new.updated_by := coalesce(new.created_by, auth.uid());
    end if;
    return new;
  end if;

  new.updated_by := auth.uid();
  return new;
end;
$$;

create or replace function public.erp_audit_log_row_change()
returns trigger
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  module_name text := coalesce(tg_argv[0], 'erp');
  row_company_id integer;
  row_id uuid;
  row_payload jsonb := '{}'::jsonb;
  diff_payload jsonb := '{}'::jsonb;
  changed_keys text[] := '{}'::text[];
begin
  if tg_op = 'INSERT' then
    row_company_id := new.company_id;
    row_id := new.id;
    row_payload := to_jsonb(new);
  elsif tg_op = 'UPDATE' then
    row_company_id := coalesce(new.company_id, old.company_id);
    row_id := coalesce(new.id, old.id);
    row_payload := to_jsonb(new);
  else
    row_company_id := old.company_id;
    row_id := old.id;
    row_payload := to_jsonb(old);
  end if;

  if row_company_id is null then
    return coalesce(new, old);
  end if;

  if tg_op = 'INSERT' then
    diff_payload := public.audit_jsonb_diff('{}'::jsonb, to_jsonb(new));
  elsif tg_op = 'UPDATE' then
    diff_payload := public.audit_jsonb_diff(to_jsonb(old), to_jsonb(new));
    if diff_payload = '{}'::jsonb then
      return new;
    end if;
  elsif tg_op = 'DELETE' then
    diff_payload := public.audit_jsonb_diff(to_jsonb(old), '{}'::jsonb);
  end if;

  changed_keys := public.audit_changed_fields(diff_payload);

  insert into public.erp_audit_logs (
    company_id,
    module_code,
    schema_name,
    table_name,
    record_id,
    record_label,
    action,
    actor_user_id,
    actor_role,
    audit_origin,
    changed_fields,
    change_summary
  )
  values (
    row_company_id,
    module_name,
    tg_table_schema,
    tg_table_name,
    row_id,
    public.audit_pick_label(row_payload),
    lower(tg_op),
    auth.uid(),
    public.get_user_role(),
    public.current_audit_origin(),
    changed_keys,
    diff_payload
  );

  return coalesce(new, old);
end;
$$;

revoke all on public.erp_audit_logs from anon;
revoke insert, update, delete on public.erp_audit_logs from authenticated;
grant select on public.erp_audit_logs to authenticated;

drop policy if exists erp_audit_logs_admin_read on public.erp_audit_logs;
create policy erp_audit_logs_admin_read
  on public.erp_audit_logs
  for select
  to authenticated
  using (
    company_id = public.get_user_company_id()
    and public.get_user_role() in ('admin', 'super_admin', 'dirigeant')
  );

alter table public.clients
  add column if not exists created_by uuid null references auth.users(id) on delete set null,
  add column if not exists updated_by uuid null references auth.users(id) on delete set null;

alter table public.vehicules
  add column if not exists created_by uuid null references auth.users(id) on delete set null,
  add column if not exists updated_by uuid null references auth.users(id) on delete set null;

alter table public.ordres_transport
  add column if not exists created_by uuid null references auth.users(id) on delete set null,
  add column if not exists updated_by uuid null references auth.users(id) on delete set null;

alter table public.factures
  add column if not exists created_by uuid null references auth.users(id) on delete set null,
  add column if not exists updated_by uuid null references auth.users(id) on delete set null;

alter table public.conducteurs
  add column if not exists created_by uuid null references auth.users(id) on delete set null,
  add column if not exists updated_by uuid null references auth.users(id) on delete set null;

alter table public.sites_logistiques
  add column if not exists created_by uuid null references auth.users(id) on delete set null,
  add column if not exists updated_by uuid null references auth.users(id) on delete set null;

alter table public.absences_rh
  add column if not exists updated_by uuid null references public.profils(id) on delete set null;

drop trigger if exists clients_audit_stamp_actor_columns on public.clients;
create trigger clients_audit_stamp_actor_columns
before insert or update on public.clients
for each row execute function public.erp_audit_stamp_actor_columns();

drop trigger if exists vehicules_audit_stamp_actor_columns on public.vehicules;
create trigger vehicules_audit_stamp_actor_columns
before insert or update on public.vehicules
for each row execute function public.erp_audit_stamp_actor_columns();

drop trigger if exists ordres_transport_audit_stamp_actor_columns on public.ordres_transport;
create trigger ordres_transport_audit_stamp_actor_columns
before insert or update on public.ordres_transport
for each row execute function public.erp_audit_stamp_actor_columns();

drop trigger if exists factures_audit_stamp_actor_columns on public.factures;
create trigger factures_audit_stamp_actor_columns
before insert or update on public.factures
for each row execute function public.erp_audit_stamp_actor_columns();

drop trigger if exists conducteurs_audit_stamp_actor_columns on public.conducteurs;
create trigger conducteurs_audit_stamp_actor_columns
before insert or update on public.conducteurs
for each row execute function public.erp_audit_stamp_actor_columns();

drop trigger if exists sites_logistiques_audit_stamp_actor_columns on public.sites_logistiques;
create trigger sites_logistiques_audit_stamp_actor_columns
before insert or update on public.sites_logistiques
for each row execute function public.erp_audit_stamp_actor_columns();

drop trigger if exists clients_audit_log_row_change on public.clients;
create trigger clients_audit_log_row_change
after insert or update or delete on public.clients
for each row execute function public.erp_audit_log_row_change('crm');

drop trigger if exists vehicules_audit_log_row_change on public.vehicules;
create trigger vehicules_audit_log_row_change
after insert or update or delete on public.vehicules
for each row execute function public.erp_audit_log_row_change('flotte');

drop trigger if exists ordres_transport_audit_log_row_change on public.ordres_transport;
create trigger ordres_transport_audit_log_row_change
after insert or update or delete on public.ordres_transport
for each row execute function public.erp_audit_log_row_change('transport');

drop trigger if exists factures_audit_log_row_change on public.factures;
create trigger factures_audit_log_row_change
after insert or update or delete on public.factures
for each row execute function public.erp_audit_log_row_change('facturation');

drop trigger if exists conducteurs_audit_log_row_change on public.conducteurs;
create trigger conducteurs_audit_log_row_change
after insert or update or delete on public.conducteurs
for each row execute function public.erp_audit_log_row_change('rh');

drop trigger if exists sites_logistiques_audit_log_row_change on public.sites_logistiques;
create trigger sites_logistiques_audit_log_row_change
after insert or update or delete on public.sites_logistiques
for each row execute function public.erp_audit_log_row_change('exploitation');

drop trigger if exists absences_rh_audit_log_row_change on public.absences_rh;
create trigger absences_rh_audit_log_row_change
after insert or update or delete on public.absences_rh
for each row execute function public.erp_audit_log_row_change('rh');