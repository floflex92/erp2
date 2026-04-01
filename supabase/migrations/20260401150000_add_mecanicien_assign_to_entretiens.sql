-- Migration: Add mecanicien assignment to flotte_entretiens
-- Purpose: Allow assignment of maintenance tasks to specific mechanics
-- Date: 2026-04-01 15:00:00

BEGIN;

-- Add mecanicien_assign column to flotte_entretiens
ALTER TABLE public.flotte_entretiens
ADD COLUMN IF NOT EXISTS mecanicien_assign text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS priority text DEFAULT 'normale' CHECK (priority IN ('urgente', 'haute', 'normale', 'planifiee'));

-- Add index for performance
CREATE INDEX IF NOT EXISTS flotte_entretiens_mecanicien_idx ON public.flotte_entretiens(mecanicien_assign);
CREATE INDEX IF NOT EXISTS flotte_entretiens_priority_idx ON public.flotte_entretiens(priority);

-- Update RLS policy for flotte_entretiens (if not already set)
-- Allow fleet managers (fleet role) to manage all entretiens
DROP POLICY IF EXISTS "fleet_can_manage_entretiens" ON public.flotte_entretiens;
CREATE POLICY "fleet_can_manage_entretiens"
  ON public.flotte_entretiens
  FOR ALL
  USING (
    COALESCE(
      (auth.jwt() ->> 'app_metadata')::jsonb ->> 'role' IN ('fleet', 'dirigeant', 'admin'),
      false
    )
  )
  WITH CHECK (
    COALESCE(
      (auth.jwt() ->> 'app_metadata')::jsonb ->> 'role' IN ('fleet', 'dirigeant', 'admin'),
      false
    )
  );

-- Allow mechanics to see their assigned tasks
DROP POLICY IF EXISTS "mecanicien_see_assigned_entretiens" ON public.flotte_entretiens;
CREATE POLICY "mecanicien_see_assigned_entretiens"
  ON public.flotte_entretiens
  FOR SELECT
  USING (
    COALESCE(mecanicien_assign, '') = COALESCE(
      (SELECT nom FROM public.profils WHERE user_id = auth.uid() LIMIT 1),
      ''
    )
    OR COALESCE(
      (auth.jwt() ->> 'app_metadata')::jsonb ->> 'role' IN ('fleet', 'dirigeant', 'admin'),
      false
    )
  );

COMMIT;
