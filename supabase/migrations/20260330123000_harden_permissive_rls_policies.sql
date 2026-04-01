-- Harden historical permissive RLS policies without rewriting existing role-based policies.
-- Strategy:
-- 1) Drop known permissive policy patterns left by early MVP migrations.
-- 2) If a table ends up without any policy, add a guarded fallback policy based on current_app_role().

DO $$
DECLARE
  tbl RECORD;
  pol RECORD;
  policy_count integer;
BEGIN
  FOR tbl IN
    SELECT schemaname, tablename
    FROM pg_tables
    WHERE schemaname = 'public'
  LOOP
    FOR pol IN
      SELECT policyname
      FROM pg_policies
      WHERE schemaname = tbl.schemaname
        AND tablename = tbl.tablename
        AND (
          policyname LIKE 'allow_all_%'
          OR policyname LIKE 'admin_all_%'
          OR policyname = 'Authenticated read rapports'
          OR policyname = 'Authenticated read config'
        )
    LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', pol.policyname, tbl.schemaname, tbl.tablename);
    END LOOP;

    SELECT COUNT(*)
    INTO policy_count
    FROM pg_policies
    WHERE schemaname = tbl.schemaname
      AND tablename = tbl.tablename;

    IF policy_count = 0 THEN
      EXECUTE format(
        'CREATE POLICY %I ON %I.%I
          FOR ALL TO authenticated
          USING (
            auth.uid() IS NOT NULL
            AND EXISTS (
              SELECT 1
              FROM public.profils p
              WHERE p.user_id = auth.uid()
                AND p.role IN (''admin'',''dirigeant'',''exploitant'',''mecanicien'',''commercial'',''comptable'',''rh'',''conducteur'',''conducteur_affreteur'',''client'',''affreteur'')
            )
          )
          WITH CHECK (
            auth.uid() IS NOT NULL
            AND EXISTS (
              SELECT 1
              FROM public.profils p
              WHERE p.user_id = auth.uid()
                AND p.role IN (''admin'',''dirigeant'',''exploitant'',''mecanicien'',''commercial'',''comptable'',''rh'',''conducteur'',''conducteur_affreteur'',''client'',''affreteur'')
            )
          )',
        'role_guard_' || tbl.tablename,
        tbl.schemaname,
        tbl.tablename
      );
    END IF;
  END LOOP;
END $$;
