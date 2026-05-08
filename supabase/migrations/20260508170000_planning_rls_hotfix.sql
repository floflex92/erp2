-- Hotfix planning loading blocked by RLS/permission drift.
--
-- Goals:
-- 1) Ensure helper functions used by RLS are executable by authenticated users.
-- 2) Remove unexpected RESTRICTIVE policies on planning read tables.
-- 3) Re-assert explicit SELECT policies aligned with frontend planning roles.
-- 4) Re-assert table SELECT grants for authenticated role.

-- ---------------------------------------------------------------------------
-- 1) Helper functions: explicit EXECUTE grants
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF to_regprocedure('public.get_user_role()') IS NOT NULL THEN
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.get_user_role() TO authenticated';
  END IF;

  IF to_regprocedure('public.current_app_role()') IS NOT NULL THEN
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.current_app_role() TO authenticated';
  END IF;

  IF to_regprocedure('public.my_company_id()') IS NOT NULL THEN
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.my_company_id() TO authenticated';
  END IF;

  IF to_regprocedure('public.my_login_enabled()') IS NOT NULL THEN
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.my_login_enabled() TO authenticated';
  END IF;

  IF to_regprocedure('public.get_active_role()') IS NOT NULL THEN
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.get_active_role() TO authenticated';
  END IF;
END
$$;

-- ---------------------------------------------------------------------------
-- 2) Remove RESTRICTIVE policies that can hard-block reads unexpectedly
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  rec RECORD;
BEGIN
  FOR rec IN
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN (
        'ordres_transport',
        'conducteurs',
        'vehicules',
        'remorques',
        'affectations',
        'sites_logistiques',
        'clients'
      )
      AND permissive = 'RESTRICTIVE'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', rec.policyname, rec.schemaname, rec.tablename);
  END LOOP;
END
$$;

-- ---------------------------------------------------------------------------
-- 3) Ensure read policies exist for planning tables
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF to_regclass('public.ordres_transport') IS NOT NULL THEN
    ALTER TABLE public.ordres_transport ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS planning_read_roles_ordres_transport ON public.ordres_transport;
    CREATE POLICY planning_read_roles_ordres_transport
      ON public.ordres_transport
      FOR SELECT
      TO authenticated
      USING (
        COALESCE(public.get_user_role(), '') IN (
          'admin','super_admin','dirigeant','exploitant','mecanicien','commercial','comptable','rh',
          'conducteur','affreteur','conducteur_affreteur','logisticien','flotte','observateur','demo'
        )
      );
  END IF;

  IF to_regclass('public.conducteurs') IS NOT NULL THEN
    ALTER TABLE public.conducteurs ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS planning_read_roles_conducteurs ON public.conducteurs;
    CREATE POLICY planning_read_roles_conducteurs
      ON public.conducteurs
      FOR SELECT
      TO authenticated
      USING (
        COALESCE(public.get_user_role(), '') IN (
          'admin','super_admin','dirigeant','exploitant','mecanicien','commercial','comptable','rh',
          'conducteur','affreteur','conducteur_affreteur','logisticien','flotte','observateur','demo'
        )
      );
  END IF;

  IF to_regclass('public.vehicules') IS NOT NULL THEN
    ALTER TABLE public.vehicules ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS planning_read_roles_vehicules ON public.vehicules;
    CREATE POLICY planning_read_roles_vehicules
      ON public.vehicules
      FOR SELECT
      TO authenticated
      USING (
        COALESCE(public.get_user_role(), '') IN (
          'admin','super_admin','dirigeant','exploitant','mecanicien','commercial','comptable','rh',
          'conducteur','affreteur','conducteur_affreteur','logisticien','flotte','observateur','demo'
        )
      );
  END IF;

  IF to_regclass('public.remorques') IS NOT NULL THEN
    ALTER TABLE public.remorques ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS planning_read_roles_remorques ON public.remorques;
    CREATE POLICY planning_read_roles_remorques
      ON public.remorques
      FOR SELECT
      TO authenticated
      USING (
        COALESCE(public.get_user_role(), '') IN (
          'admin','super_admin','dirigeant','exploitant','mecanicien','commercial','comptable','rh',
          'conducteur','affreteur','conducteur_affreteur','logisticien','flotte','observateur','demo'
        )
      );
  END IF;

  IF to_regclass('public.affectations') IS NOT NULL THEN
    ALTER TABLE public.affectations ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS planning_read_roles_affectations ON public.affectations;
    CREATE POLICY planning_read_roles_affectations
      ON public.affectations
      FOR SELECT
      TO authenticated
      USING (
        COALESCE(public.get_user_role(), '') IN (
          'admin','super_admin','dirigeant','exploitant','mecanicien','commercial','comptable','rh',
          'conducteur','affreteur','conducteur_affreteur','logisticien','flotte','observateur','demo'
        )
      );
  END IF;

  IF to_regclass('public.sites_logistiques') IS NOT NULL THEN
    ALTER TABLE public.sites_logistiques ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS planning_read_roles_sites_logistiques ON public.sites_logistiques;
    CREATE POLICY planning_read_roles_sites_logistiques
      ON public.sites_logistiques
      FOR SELECT
      TO authenticated
      USING (
        COALESCE(public.get_user_role(), '') IN (
          'admin','super_admin','dirigeant','exploitant','mecanicien','commercial','comptable','rh',
          'conducteur','affreteur','conducteur_affreteur','logisticien','flotte','observateur','demo'
        )
      );
  END IF;

  IF to_regclass('public.clients') IS NOT NULL THEN
    ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS clients_staff_read ON public.clients;
    DROP POLICY IF EXISTS "clients_staff_read" ON public.clients;
    CREATE POLICY clients_staff_read
      ON public.clients
      FOR SELECT
      TO authenticated
      USING (
        COALESCE(public.get_user_role(), '') IN (
          'admin','super_admin','dirigeant','exploitant','mecanicien','commercial','comptable','rh',
          'conducteur','affreteur','conducteur_affreteur','logisticien','flotte','observateur','demo'
        )
      );
  END IF;
END
$$;

-- ---------------------------------------------------------------------------
-- 4) Re-assert basic table grants for PostgREST role
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  tbl text;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'ordres_transport',
    'conducteurs',
    'vehicules',
    'remorques',
    'affectations',
    'sites_logistiques',
    'clients'
  ]
  LOOP
    IF to_regclass('public.' || tbl) IS NOT NULL THEN
      EXECUTE format('GRANT SELECT ON TABLE public.%I TO authenticated', tbl);
    END IF;
  END LOOP;
END
$$;
