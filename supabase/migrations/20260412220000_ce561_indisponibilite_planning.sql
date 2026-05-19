-- Indisponibilités conducteur/véhicule/remorque pour planning
-- Recouvre maintenance, absences non-RH, indisponibilités ponctuelles

BEGIN;

CREATE TABLE IF NOT EXISTS public.indisponibilite_planning (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type_ressource text NOT NULL,
  ressource_id uuid NOT NULL,
  date_debut timestamptz NOT NULL,
  date_fin timestamptz NOT NULL,
  type_indisponibilite text NOT NULL,
  motif text,
  createur_id uuid REFERENCES public.profils(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT indisponibilite_planning_type_ressource_check CHECK (
    type_ressource IN ('conducteur', 'vehicule', 'remorque')
  ),
  CONSTRAINT indisponibilite_planning_type_indisponibilite_check CHECK (
    type_indisponibilite IN (
      'maintenance', 'inspection', 'revision_fco', 'visite_controle',
      'absence_non_rh', 'conge_temporaire', 'formation', 'autres'
    )
  ),
  CONSTRAINT indisponibilite_planning_dates_check CHECK (date_fin >= date_debut)
);

CREATE INDEX IF NOT EXISTS indisponibilite_planning_ressource_idx
  ON public.indisponibilite_planning(type_ressource, ressource_id);

CREATE INDEX IF NOT EXISTS indisponibilite_planning_dates_idx
  ON public.indisponibilite_planning(date_debut, date_fin);

CREATE INDEX IF NOT EXISTS indisponibilite_planning_type_idx
  ON public.indisponibilite_planning(type_indisponibilite);

-- Trigger updated_at
DO $$
BEGIN
  PERFORM public.add_updated_at_trigger('public.indisponibilite_planning');
EXCEPTION
  WHEN OTHERS THEN
    NULL;
END $$;

-- RLS
ALTER TABLE public.indisponibilite_planning ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  -- Lecture : tous les rôles transport/exploitation
  DROP POLICY IF EXISTS indisponibilite_planning_read ON public.indisponibilite_planning;
  CREATE POLICY indisponibilite_planning_read ON public.indisponibilite_planning
    FOR SELECT TO authenticated
    USING (public.get_user_role() IN ('admin', 'logisticien', 'exploitant', 'mecanicien', 'rh'));

  -- Écriture : admin/logisticien/exploitant/mecanicien (pour maintenance)
  DROP POLICY IF EXISTS indisponibilite_planning_write ON public.indisponibilite_planning;
  CREATE POLICY indisponibilite_planning_write ON public.indisponibilite_planning
    FOR ALL TO authenticated
    USING (public.get_user_role() IN ('admin', 'logisticien', 'exploitant', 'mecanicien'))
    WITH CHECK (public.get_user_role() IN ('admin', 'logisticien', 'exploitant', 'mecanicien'));

EXCEPTION
  WHEN OTHERS THEN
    NULL;
END $$;

-- Vue : indisponibilités actives (chevauchement avec date actuelle)
CREATE OR REPLACE VIEW vue_indisponibilite_active AS
SELECT
  id, type_ressource, ressource_id, type_indisponibilite,
  motif, date_debut, date_fin
FROM public.indisponibilite_planning
WHERE date_debut <= now()
  AND date_fin >= now();

COMMIT;
