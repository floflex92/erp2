-- Migration: workflow multi-étapes pour absences RH
-- demande → validee_exploitation → validee_direction → integree_paie → validee (final)

-- 1. Ajouter les colonnes de suivi par étape
ALTER TABLE absences_rh
  ADD COLUMN IF NOT EXISTS validateur_exploitation_id uuid REFERENCES public.profils(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS date_validation_exploitation timestamptz,
  ADD COLUMN IF NOT EXISTS validateur_direction_id uuid REFERENCES public.profils(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS date_validation_direction timestamptz,
  ADD COLUMN IF NOT EXISTS integre_paie_par_id uuid REFERENCES public.profils(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS date_integration_paie timestamptz;

-- 2. Mettre à jour la contrainte CHECK sur le statut
ALTER TABLE absences_rh DROP CONSTRAINT IF EXISTS absences_rh_statut_check;
ALTER TABLE absences_rh ADD CONSTRAINT absences_rh_statut_check
  CHECK (statut IN ('demande', 'validee_exploitation', 'validee_direction', 'integree_paie', 'validee', 'refusee', 'annulee'));

-- 3. Policy : l'exploitation peut valider les demandes
DROP POLICY IF EXISTS exploitation_validate ON absences_rh;
CREATE POLICY exploitation_validate ON absences_rh
  FOR UPDATE TO authenticated
  USING (
    public.get_user_role() IN ('exploitant', 'admin', 'super_admin', 'dirigeant', 'rh')
  )
  WITH CHECK (
    public.get_user_role() IN ('exploitant', 'admin', 'super_admin', 'dirigeant', 'rh')
  );
