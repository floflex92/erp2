create table if not exists public.transport_missions (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('groupage', 'complet', 'partiel')) default 'complet',
  conducteur_id uuid null references public.conducteurs(id) on delete set null,
  vehicule_id uuid null references public.vehicules(id) on delete set null,
  remorque_id uuid null references public.remorques(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.transport_missions enable row level security;

do $$
declare
  role_predicate text;
begin
  if exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'current_app_role'
  ) then
    role_predicate := $policy$public.current_app_role() in (
      'admin',
      'dirigeant',
      'exploitant',
      'commercial',
      'comptable',
      'affreteur',
      'conducteur_affreteur'
    )$policy$;
  elsif exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'current_internal_role'
  ) then
    role_predicate := $policy$public.current_internal_role() in (
      'admin',
      'dirigeant',
      'exploitant',
      'commercial',
      'comptable',
      'affreteur',
      'conducteur_affreteur'
    )$policy$;
  else
    role_predicate := $policy$auth.role() = 'authenticated'$policy$;
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'transport_missions'
      and policyname = 'transport_missions_rw_ops'
  ) then
    execute format(
      'create policy transport_missions_rw_ops on public.transport_missions for all to authenticated using (%1$s) with check (%1$s)',
      role_predicate
    );
  end if;
end $$;

create index if not exists transport_missions_type_idx
  on public.transport_missions(type, updated_at desc);

do $$
begin
  if exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'set_updated_at'
  ) then
    if not exists (
      select 1
      from pg_trigger
      where tgname = 'transport_missions_set_updated_at'
    ) then
      create trigger transport_missions_set_updated_at
      before update on public.transport_missions
      for each row execute function public.set_updated_at();
    end if;
  end if;
end $$;

alter table public.ordres_transport
  add column if not exists mission_id uuid null references public.transport_missions(id) on delete set null;

create index if not exists ordres_transport_mission_idx
  on public.ordres_transport(mission_id, date_chargement_prevue)
  where mission_id is not null;

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
    select merged_keys.merged_key
    from (
      select jsonb_object_keys(source_old) as merged_key
      union
      select jsonb_object_keys(source_new) as merged_key
    ) as merged_keys
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

with distinct_groupages as (
  select
    ot.groupage_id as mission_id,
    case
      when count(*) > 1 then 'groupage'
      when bool_or(ot.type_transport = 'partiel') then 'partiel'
      else 'complet'
    end as mission_type,
    case when count(distinct ot.conducteur_id) filter (where ot.conducteur_id is not null) = 1 then min(ot.conducteur_id::text)::uuid else null end as conducteur_id,
    case when count(distinct ot.vehicule_id) filter (where ot.vehicule_id is not null) = 1 then min(ot.vehicule_id::text)::uuid else null end as vehicule_id,
    case when count(distinct ot.remorque_id) filter (where ot.remorque_id is not null) = 1 then min(ot.remorque_id::text)::uuid else null end as remorque_id
  from public.ordres_transport ot
  where ot.groupage_id is not null
  group by ot.groupage_id
)
insert into public.transport_missions(id, type, conducteur_id, vehicule_id, remorque_id)
select mission_id, mission_type, conducteur_id, vehicule_id, remorque_id
from distinct_groupages
on conflict (id) do update
set type = excluded.type,
    conducteur_id = excluded.conducteur_id,
    vehicule_id = excluded.vehicule_id,
    remorque_id = excluded.remorque_id;

update public.ordres_transport
set mission_id = groupage_id
where mission_id is null
  and groupage_id is not null;