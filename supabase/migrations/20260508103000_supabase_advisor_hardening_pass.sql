-- Supabase advisor hardening pass
-- Targets:
-- 1) function_search_path_mutable
-- 2) auth_users_exposed (SECURITY DEFINER callable by anon via PUBLIC grant)
-- 3) rls_policy_always_true for authenticated-only policies
--
-- Notes:
-- - This migration is additive and idempotent.
-- - Leaked password protection is configured in Supabase Auth settings,
--   not via SQL migration.

-- ---------------------------------------------------------------------------
-- 1) Enforce deterministic search_path on user-defined functions/procedures
-- ---------------------------------------------------------------------------
do $$
declare
  rec record;
  ddl_kind text;
  path_value text;
begin
  for rec in
    select
      n.nspname as schema_name,
      p.proname as function_name,
      p.prokind,
      pg_get_function_identity_arguments(p.oid) as identity_args
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname in ('public', 'core', 'refonte_v2')
      and p.prokind in ('f', 'p')
  loop
    ddl_kind := case when rec.prokind = 'p' then 'PROCEDURE' else 'FUNCTION' end;

    if rec.schema_name = 'public' then
      path_value := 'pg_catalog, public, extensions';
    else
      path_value := format('pg_catalog, %I, public, extensions', rec.schema_name);
    end if;

    execute format(
      'ALTER %s %I.%I(%s) SET search_path = %s',
      ddl_kind,
      rec.schema_name,
      rec.function_name,
      rec.identity_args,
      path_value
    );
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- 2) Remove anon execution path on SECURITY DEFINER routines
-- ---------------------------------------------------------------------------
do $$
declare
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
    where n.nspname in ('public', 'core', 'refonte_v2')
      and p.prosecdef = true
      and p.prokind in ('f', 'p')
  loop
    ddl_kind := case when rec.prokind = 'p' then 'PROCEDURE' else 'FUNCTION' end;

    execute format(
      'REVOKE EXECUTE ON %s %I.%I(%s) FROM PUBLIC, anon',
      ddl_kind,
      rec.schema_name,
      rec.function_name,
      rec.identity_args
    );

    execute format(
      'GRANT EXECUTE ON %s %I.%I(%s) TO authenticated',
      ddl_kind,
      rec.schema_name,
      rec.function_name,
      rec.identity_args
    );
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- 3) Replace always-true authenticated-only RLS policies with auth guard
-- ---------------------------------------------------------------------------
do $$
declare
  rec record;
  true_expr constant text[] := array['true', '(true)'];
begin
  for rec in
    select
      schemaname,
      tablename,
      policyname,
      cmd,
      roles,
      coalesce(trim(qual), '') as using_expr,
      coalesce(trim(with_check), '') as check_expr
    from pg_policies
    where schemaname = 'public'
      and array_position(roles, 'authenticated'::name) is not null
      and array_position(roles, 'anon'::name) is null
      and array_position(roles, 'public'::name) is null
      and (
        coalesce(trim(qual), '') = any (true_expr)
        or coalesce(trim(with_check), '') = any (true_expr)
      )
  loop
    if rec.cmd = 'SELECT' or rec.cmd = 'DELETE' then
      execute format(
        'ALTER POLICY %I ON %I.%I USING (auth.uid() IS NOT NULL)',
        rec.policyname,
        rec.schemaname,
        rec.tablename
      );
    elsif rec.cmd = 'INSERT' then
      execute format(
        'ALTER POLICY %I ON %I.%I WITH CHECK (auth.uid() IS NOT NULL)',
        rec.policyname,
        rec.schemaname,
        rec.tablename
      );
    else
      execute format(
        'ALTER POLICY %I ON %I.%I USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL)',
        rec.policyname,
        rec.schemaname,
        rec.tablename
      );
    end if;
  end loop;
end $$;
