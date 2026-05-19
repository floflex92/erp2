-- Expand transport_missions RLS writer roles for planning groupage operations.

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
      'flotte',
      'logisticien',
      'commercial',
      'comptable',
      'affreteur',
      'conducteur_affreteur',
      'administratif'
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
      'flotte',
      'logisticien',
      'commercial',
      'comptable',
      'affreteur',
      'conducteur_affreteur',
      'administratif'
    )$policy$;
  else
    role_predicate := $policy$auth.role() = 'authenticated'$policy$;
  end if;

  if exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'transport_missions'
      and policyname = 'transport_missions_rw_ops'
  ) then
    execute 'drop policy transport_missions_rw_ops on public.transport_missions';
  end if;

  execute format(
    'create policy transport_missions_rw_ops on public.transport_missions for all to authenticated using (%1$s) with check (%1$s)',
    role_predicate
  );
end $$;
