-- Alignement RLS lecture planning avec les roles autorises cote frontend.
-- Objectif: retablir le chargement du module planning apres durcissements RLS,
-- sans etendre les droits d'ecriture.

DO $$
BEGIN
  IF to_regclass('public.ordres_transport') IS NOT NULL THEN
    DROP POLICY IF EXISTS planning_read_roles_ordres_transport ON public.ordres_transport;
    CREATE POLICY planning_read_roles_ordres_transport
      ON public.ordres_transport
      FOR SELECT
      TO authenticated
      USING (
        COALESCE(public.get_user_role(), '') IN (
          'admin',
          'super_admin',
          'dirigeant',
          'exploitant',
          'mecanicien',
          'commercial',
          'comptable',
          'rh',
          'conducteur',
          'affreteur',
          'conducteur_affreteur',
          'logisticien',
          'flotte',
          'observateur',
          'demo'
        )
      );
  END IF;

  IF to_regclass('public.conducteurs') IS NOT NULL THEN
    DROP POLICY IF EXISTS planning_read_roles_conducteurs ON public.conducteurs;
    CREATE POLICY planning_read_roles_conducteurs
      ON public.conducteurs
      FOR SELECT
      TO authenticated
      USING (
        COALESCE(public.get_user_role(), '') IN (
          'admin',
          'super_admin',
          'dirigeant',
          'exploitant',
          'mecanicien',
          'commercial',
          'comptable',
          'rh',
          'conducteur',
          'affreteur',
          'conducteur_affreteur',
          'logisticien',
          'flotte',
          'observateur',
          'demo'
        )
      );
  END IF;

  IF to_regclass('public.vehicules') IS NOT NULL THEN
    DROP POLICY IF EXISTS planning_read_roles_vehicules ON public.vehicules;
    CREATE POLICY planning_read_roles_vehicules
      ON public.vehicules
      FOR SELECT
      TO authenticated
      USING (
        COALESCE(public.get_user_role(), '') IN (
          'admin',
          'super_admin',
          'dirigeant',
          'exploitant',
          'mecanicien',
          'commercial',
          'comptable',
          'rh',
          'conducteur',
          'affreteur',
          'conducteur_affreteur',
          'logisticien',
          'flotte',
          'observateur',
          'demo'
        )
      );
  END IF;

  IF to_regclass('public.remorques') IS NOT NULL THEN
    DROP POLICY IF EXISTS planning_read_roles_remorques ON public.remorques;
    CREATE POLICY planning_read_roles_remorques
      ON public.remorques
      FOR SELECT
      TO authenticated
      USING (
        COALESCE(public.get_user_role(), '') IN (
          'admin',
          'super_admin',
          'dirigeant',
          'exploitant',
          'mecanicien',
          'commercial',
          'comptable',
          'rh',
          'conducteur',
          'affreteur',
          'conducteur_affreteur',
          'logisticien',
          'flotte',
          'observateur',
          'demo'
        )
      );
  END IF;

  IF to_regclass('public.affectations') IS NOT NULL THEN
    DROP POLICY IF EXISTS planning_read_roles_affectations ON public.affectations;
    CREATE POLICY planning_read_roles_affectations
      ON public.affectations
      FOR SELECT
      TO authenticated
      USING (
        COALESCE(public.get_user_role(), '') IN (
          'admin',
          'super_admin',
          'dirigeant',
          'exploitant',
          'mecanicien',
          'commercial',
          'comptable',
          'rh',
          'conducteur',
          'affreteur',
          'conducteur_affreteur',
          'logisticien',
          'flotte',
          'observateur',
          'demo'
        )
      );
  END IF;

  IF to_regclass('public.sites_logistiques') IS NOT NULL THEN
    DROP POLICY IF EXISTS planning_read_roles_sites_logistiques ON public.sites_logistiques;
    CREATE POLICY planning_read_roles_sites_logistiques
      ON public.sites_logistiques
      FOR SELECT
      TO authenticated
      USING (
        COALESCE(public.get_user_role(), '') IN (
          'admin',
          'super_admin',
          'dirigeant',
          'exploitant',
          'mecanicien',
          'commercial',
          'comptable',
          'rh',
          'conducteur',
          'affreteur',
          'conducteur_affreteur',
          'logisticien',
          'flotte',
          'observateur',
          'demo'
        )
      );
  END IF;
END
$$;