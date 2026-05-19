-- Reduce Security Definer surface for authenticated-facing RPCs.
--
-- This keeps RPC endpoints callable by authenticated users while removing
-- SECURITY DEFINER on the remaining linter-reported routines.

do $$
declare
  target_functions text[] := array[
    'compta_export_fec_v1',
    'compta_generer_ecriture_facture',
    'compta_valider_ecriture',
    'end_impersonation_session',
    'get_active_impersonation',
    'get_active_role',
    'get_user_tenants',
    'start_impersonation_session',
    'upsert_my_profile'
  ];
  rec record;
begin
  for rec in
    select
      n.nspname as schema_name,
      p.proname as routine_name,
      pg_get_function_identity_arguments(p.oid) as identity_args
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = any (target_functions)
      and p.prokind = 'f'
      and p.prosecdef = true
  loop
    execute format(
      'ALTER FUNCTION %I.%I(%s) SECURITY INVOKER',
      rec.schema_name,
      rec.routine_name,
      rec.identity_args
    );
  end loop;
end $$;
