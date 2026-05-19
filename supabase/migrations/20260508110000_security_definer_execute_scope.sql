-- SECURITY DEFINER execute-scope tightening
--
-- Goal:
-- - Keep authenticated execution only where the frontend uses RPC directly.
-- - Remove execute on trigger-backed SECURITY DEFINER functions
--   (they do not need client-callable EXECUTE privilege).
--
-- This migration is additive and idempotent.

-- ---------------------------------------------------------------------------
-- 1) Remove EXECUTE from trigger-backed SECURITY DEFINER routines
-- ---------------------------------------------------------------------------
do $$
declare
  rec record;
  ddl_kind text;
begin
  for rec in
    select distinct
      n.nspname as schema_name,
      p.proname as function_name,
      p.prokind,
      pg_get_function_identity_arguments(p.oid) as identity_args
    from pg_trigger t
    join pg_proc p on p.oid = t.tgfoid
    join pg_namespace n on n.oid = p.pronamespace
    where not t.tgisinternal
      and p.prosecdef = true
      and p.prokind in ('f', 'p')
      and n.nspname in ('public', 'core', 'refonte_v2')
  loop
    ddl_kind := case when rec.prokind = 'p' then 'PROCEDURE' else 'FUNCTION' end;

    execute format(
      'REVOKE EXECUTE ON %s %I.%I(%s) FROM PUBLIC, anon, authenticated',
      ddl_kind,
      rec.schema_name,
      rec.function_name,
      rec.identity_args
    );
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- 2) Explicit allowlist for RPC used by frontend
-- ---------------------------------------------------------------------------
do $$
declare
  allowed_names text[] := array[
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
      p.proname as function_name,
      p.prokind,
      pg_get_function_identity_arguments(p.oid) as identity_args
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = any (allowed_names)
      and p.prokind in ('f', 'p')
  loop
    ddl_kind := case when rec.prokind = 'p' then 'PROCEDURE' else 'FUNCTION' end;

    execute format(
      'GRANT EXECUTE ON %s %I.%I(%s) TO authenticated',
      ddl_kind,
      rec.schema_name,
      rec.function_name,
      rec.identity_args
    );
  end loop;
end $$;
