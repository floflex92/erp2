-- Migration: Create entretiens_rh table for professional HR interviews
-- Purpose: Track scheduled professional interviews/evaluations for employees
-- Date: 2026-04-01 16:00:00

BEGIN;

CREATE TABLE IF NOT EXISTS public.entretiens_rh (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employe_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('evaluation_annuelle', 'entretien_professionnel', 'bilan_competences', 'reunion_management', 'autre')),
  titre text NOT NULL,
  description text,
  date_planifiee date NOT NULL,
  heure_debut time,
  duree_minutes integer DEFAULT 60,
  evaluateur_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  statut text NOT NULL DEFAULT 'planifie' CHECK (statut IN ('planifie', 'effectue', 'reporte', 'annule')),
  resultat text,
  notes_evaluation text,
  suivi_requis boolean DEFAULT false,
  date_suivi_prevu date,
  documents_id uuid[] DEFAULT ARRAY[]::uuid[],
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS entretiens_rh_employe_idx ON public.entretiens_rh(employe_id);
CREATE INDEX IF NOT EXISTS entretiens_rh_date_planifiee_idx ON public.entretiens_rh(date_planifiee);
CREATE INDEX IF NOT EXISTS entretiens_rh_statut_idx ON public.entretiens_rh(statut);
CREATE INDEX IF NOT EXISTS entretiens_rh_evaluateur_idx ON public.entretiens_rh(evaluateur_id);

-- Enable RLS
ALTER TABLE public.entretiens_rh ENABLE ROW LEVEL SECURITY;

-- Policies:
-- 1. HR and Directors can manage all entretiens_rh
DROP POLICY IF EXISTS "rh_admin_manage_entretiens_rh" ON public.entretiens_rh;
CREATE POLICY "rh_admin_manage_entretiens_rh"
  ON public.entretiens_rh
  FOR ALL
  USING (
    COALESCE(
      (auth.jwt() ->> 'app_metadata')::jsonb ->> 'role' IN ('rh', 'dirigeant', 'admin'),
      false
    )
  )
  WITH CHECK (
    COALESCE(
      (auth.jwt() ->> 'app_metadata')::jsonb ->> 'role' IN ('rh', 'dirigeant', 'admin'),
      false
    )
  );

-- 2. Employees can see their own entretiens_rh
DROP POLICY IF EXISTS "employe_see_own_entretiens_rh" ON public.entretiens_rh;
CREATE POLICY "employe_see_own_entretiens_rh"
  ON public.entretiens_rh
  FOR SELECT
  USING (
    employe_id = auth.uid()
    OR COALESCE(
      (auth.jwt() ->> 'app_metadata')::jsonb ->> 'role' IN ('rh', 'dirigeant', 'admin'),
      false
    )
  );

-- 3. Evaluators can see entretiens_rh they are assigned to
DROP POLICY IF EXISTS "evaluateur_see_assigned_entretiens_rh" ON public.entretiens_rh;
CREATE POLICY "evaluateur_see_assigned_entretiens_rh"
  ON public.entretiens_rh
  FOR SELECT
  USING (
    evaluateur_id = auth.uid()
    OR COALESCE(
      (auth.jwt() ->> 'app_metadata')::jsonb ->> 'role' IN ('rh', 'dirigeant', 'admin'),
      false
    )
  );

COMMIT;
