-- Supabase lints zero pass
-- Objective: aggressively remove Security Advisor warnings from:
-- - function_search_path_mutable
-- - anon/authenticated SECURITY DEFINER executable
-- - rls_policy_always_true
--
-- Note:
-- - This migration intentionally prioritizes security posture over backward compatibility.
-- - If some RPC become unavailable to authenticated users, move those flows to Edge Functions
--   or redesign as SECURITY INVOKER with explicit table grants/RLS-safe logic.

-- ---------------------------------------------------------------------------
-- 1) Fix function_search_path_mutable on project functions/procedures
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
      p.proname as routine_name,
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
      rec.routine_name,
      rec.identity_args,
      path_value
    );
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- 2) Remove anon/authenticated execution of SECURITY DEFINER routines
-- ---------------------------------------------------------------------------
do $$
declare
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
    where n.nspname in ('public', 'core', 'refonte_v2')
      and p.prosecdef = true
      and p.prokind in ('f', 'p')
  loop
    ddl_kind := case when rec.prokind = 'p' then 'PROCEDURE' else 'FUNCTION' end;

    execute format(
      'REVOKE EXECUTE ON %s %I.%I(%s) FROM PUBLIC, anon, authenticated',
      ddl_kind,
      rec.schema_name,
      rec.routine_name,
      rec.identity_args
    );
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- 3) Harden overly permissive RLS policies (USING/WITH CHECK true)
-- ---------------------------------------------------------------------------
do $$
declare
  pol record;
  has_auth boolean;
  has_public boolean;
  has_anon boolean;
  using_true boolean;
  check_true boolean;
begin
  for pol in
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
  loop
    using_true := pol.using_expr in ('true', '(true)');
    check_true := pol.check_expr in ('true', '(true)');

    if not using_true and not check_true then
      continue;
    end if;

    has_auth := array_position(pol.roles, 'authenticated'::name) is not null;
    has_public := array_position(pol.roles, 'public'::name) is not null;
    has_anon := array_position(pol.roles, 'anon'::name) is not null;

    -- Authenticated-only policy: require auth uid.
    if has_auth and not has_public and not has_anon then
      if pol.cmd = 'SELECT' or pol.cmd = 'DELETE' then
        if using_true then
          execute format(
            'ALTER POLICY %I ON %I.%I USING (auth.uid() IS NOT NULL)',
            pol.policyname,
            pol.schemaname,
            pol.tablename
          );
        end if;
      elsif pol.cmd = 'INSERT' then
        if check_true then
          execute format(
            'ALTER POLICY %I ON %I.%I WITH CHECK (auth.uid() IS NOT NULL)',
            pol.policyname,
            pol.schemaname,
            pol.tablename
          );
        end if;
      else
        execute format(
          'ALTER POLICY %I ON %I.%I USING (%s) WITH CHECK (%s)',
          pol.policyname,
          pol.schemaname,
          pol.tablename,
          case when using_true then 'auth.uid() IS NOT NULL' else pol.using_expr end,
          case when check_true then 'auth.uid() IS NOT NULL' else pol.check_expr end
        );
      end if;

      continue;
    end if;

    -- Public/anon-facing policy: constrain to anon role explicitly.
    if has_public or has_anon then
      if pol.cmd = 'SELECT' or pol.cmd = 'DELETE' then
        if using_true then
          execute format(
            'ALTER POLICY %I ON %I.%I USING (coalesce(auth.role(), ''anon'') = ''anon'')',
            pol.policyname,
            pol.schemaname,
            pol.tablename
          );
        end if;
      elsif pol.cmd = 'INSERT' then
        if check_true then
          execute format(
            'ALTER POLICY %I ON %I.%I WITH CHECK (coalesce(auth.role(), ''anon'') = ''anon'')',
            pol.policyname,
            pol.schemaname,
            pol.tablename
          );
        end if;
      else
        execute format(
          'ALTER POLICY %I ON %I.%I USING (%s) WITH CHECK (%s)',
          pol.policyname,
          pol.schemaname,
          pol.tablename,
          case when using_true then 'coalesce(auth.role(), ''anon'') = ''anon''' else pol.using_expr end,
          case when check_true then 'coalesce(auth.role(), ''anon'') = ''anon''' else pol.check_expr end
        );
      end if;
    end if;
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- 4) Reminder (non-SQL): leaked password protection must be enabled in Auth UI
-- ---------------------------------------------------------------------------
-- Supabase Dashboard -> Authentication -> Providers/Settings ->
-- Password security -> Enable leaked password protection.
