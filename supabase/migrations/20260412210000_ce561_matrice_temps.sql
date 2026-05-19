-- Matrice de temps O/D pour régulation CE 561/2006
-- Table de calcul distance/durée par origine-destination (planification chauffeur)

BEGIN;

CREATE TABLE IF NOT EXISTS public.matrice_temps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  site_origine_id uuid NOT NULL REFERENCES public.sites_logistiques(id) ON DELETE CASCADE,
  site_destination_id uuid NOT NULL REFERENCES public.sites_logistiques(id) ON DELETE CASCADE,
  distance_km numeric(10,2) NOT NULL,
  duree_minutes integer NOT NULL,
  source_calcul text NOT NULL DEFAULT 'osm_route',
  validee boolean NOT NULL DEFAULT false,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT matrice_temps_unique UNIQUE (site_origine_id, site_destination_id),
  CONSTRAINT matrice_temps_distance_check CHECK (distance_km >= 0),
  CONSTRAINT matrice_temps_duree_check CHECK (duree_minutes >= 0),
  CONSTRAINT matrice_temps_source_check CHECK (source_calcul IN ('osm_route', 'gmaps', 'manuel', 'historique'))
);

CREATE INDEX IF NOT EXISTS matrice_temps_origine_idx
  ON public.matrice_temps(site_origine_id);

CREATE INDEX IF NOT EXISTS matrice_temps_destination_idx
  ON public.matrice_temps(site_destination_id);

CREATE INDEX IF NOT EXISTS matrice_temps_validee_idx
  ON public.matrice_temps(validee) WHERE validee = true;

-- Trigger pour updated_at
DO $$
BEGIN
  PERFORM public.add_updated_at_trigger('public.matrice_temps');
EXCEPTION
  WHEN OTHERS THEN
    NULL;
END $$;

-- RLS (lecture pour tous, écriture pour admin/logisticien)
ALTER TABLE public.matrice_temps ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  DROP POLICY IF EXISTS matrice_temps_read ON public.matrice_temps;
  CREATE POLICY matrice_temps_read ON public.matrice_temps
    FOR SELECT TO authenticated
    USING (true);

  DROP POLICY IF EXISTS matrice_temps_write ON public.matrice_temps;
  CREATE POLICY matrice_temps_write ON public.matrice_temps
    FOR ALL TO authenticated
    USING (public.get_user_role() IN ('admin', 'logisticien', 'exploitant'))
    WITH CHECK (public.get_user_role() IN ('admin', 'logisticien', 'exploitant'));
EXCEPTION
  WHEN OTHERS THEN
    NULL;
END $$;

-- Vue de lectureMatrice pour planning (distances/durées validées)
CREATE OR REPLACE VIEW vue_matrice_temps_validee AS
SELECT
  id, site_origine_id, site_destination_id,
  distance_km, duree_minutes, notes, created_at
FROM public.matrice_temps
WHERE validee = true;

COMMIT;
