-- Supabase lints RPC compatibility pass
--
-- Purpose:
-- - Keep the strict security posture from the zero-pass migration.
-- - Restore only required RPC execute permissions for authenticated users.
-- - Keep anon/public blocked.
--
-- This migration is additive and idempotent.

do $$
declare
  allowlist text[] := array[
    'upsert_my_profile',
    'get_user_tenants',
    'start_impersonation_session',
    'end_impersonation_session',
    'get_active_impersonation',
    'get_active_role',
    'rpc_set_transport_mission_freeze',
    'compta_list_ecritures_recentes',
    'compta_valider_ecriture',
    'compta_calcul_tva_collectee',
    'compta_calcul_tva_deductible',
    'compta_export_fec_v1',
    'compta_generer_ecriture_facture',
    'calc_consommation_vehicule'
  ];
  rec record;
  ddl_kind text;
begin
  for rec in
    select
      n.nspname as schema_name,
      p.proname as routine_name,
      p.prokind,
      pg_get_function_identity_arguments(p.oid) as identity_args
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = any (allowlist)
      and p.prokind in ('f', 'p')
  loop
    ddl_kind := case when rec.prokind = 'p' then 'PROCEDURE' else 'FUNCTION' end;

    execute format(
      'REVOKE EXECUTE ON %s %I.%I(%s) FROM PUBLIC, anon',
      ddl_kind,
      rec.schema_name,
      rec.routine_name,
      rec.identity_args
    );

    execute format(
      'GRANT EXECUTE ON %s %I.%I(%s) TO authenticated',
      ddl_kind,
      rec.schema_name,
      rec.routine_name,
      rec.identity_args
    );
  end loop;
end $$;
