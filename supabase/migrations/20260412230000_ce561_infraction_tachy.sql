-- Infractions tachygraphe tracées pour validation CE 561/2006
-- Source: tachygraphe_entrees, enregistrées lors du drop in planning

BEGIN;

CREATE TABLE IF NOT EXISTS public.infraction_tachy (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conducteur_id uuid NOT NULL REFERENCES public.conducteurs(id) ON DELETE CASCADE,
  ot_id uuid NOT NULL REFERENCES public.ordres_transport(id) ON DELETE CASCADE,
  date_infraction date NOT NULL,
  code_infraction text NOT NULL,
  libelle_infraction text NOT NULL,
  type_infraction text NOT NULL,
  valeur_mesuree numeric(10,2) NOT NULL,
  seuil_reglementaire numeric(10,2) NOT NULL,
  unite text NOT NULL DEFAULT 'minutes',
  severite text NOT NULL DEFAULT 'normale',
  etat text NOT NULL DEFAULT 'detectee',
  date_detection timestamptz NOT NULL DEFAULT now(),
  date_resolution timestamptz NULL,
  actions_correctrices text NULL,
  validateur_id uuid REFERENCES public.profils(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT infraction_tachy_type_check CHECK (
    type_infraction IN (
      'conduite_continue', 'pause_insuffisante', 'conduite_journaliere',
      'repos_journalier', 'repos_hebdo', 'jours_consecutifs',
      'permis_invalide', 'fco_invalide', 'carte_invalide', 'adr_non_habilite',
      'autres'
    )
  ),
  CONSTRAINT infraction_tachy_severite_check CHECK (
    severite IN ('legere', 'normale', 'grave', 'critique')
  ),
  CONSTRAINT infraction_tachy_etat_check CHECK (
    etat IN ('detectee', 'avertissable', 'force', 'resolue', 'abandonnee')
  ),
  CONSTRAINT infraction_tachy_valeur_check CHECK (valeur_mesuree >= 0),
  CONSTRAINT infraction_tachy_seuil_check CHECK (seuil_reglementaire > 0)
);

CREATE INDEX IF NOT EXISTS infraction_tachy_conducteur_idx
  ON public.infraction_tachy(conducteur_id, date_infraction DESC);

CREATE INDEX IF NOT EXISTS infraction_tachy_ot_idx
  ON public.infraction_tachy(ot_id);

CREATE INDEX IF NOT EXISTS infraction_tachy_code_idx
  ON public.infraction_tachy(code_infraction);

CREATE INDEX IF NOT EXISTS infraction_tachy_etat_idx
  ON public.infraction_tachy(etat, date_detection DESC);

-- Trigger updated_at
DO $$
BEGIN
  PERFORM public.add_updated_at_trigger('public.infraction_tachy');
EXCEPTION
  WHEN OTHERS THEN
    NULL;
END $$;

-- RLS
ALTER TABLE public.infraction_tachy ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  -- Lecture : admin/exploitant/logisticien voient tout ; conducteur voit les siennes
  DROP POLICY IF EXISTS infraction_tachy_read ON public.infraction_tachy;
  CREATE POLICY infraction_tachy_read ON public.infraction_tachy
    FOR SELECT TO authenticated
    USING (
      public.get_user_role() IN ('admin', 'exploitant', 'logisticien', 'rh')
      OR conducteur_id = (
        SELECT id FROM public.profils WHERE user_id = auth.uid() LIMIT 1
      )
    );

  -- Écriture : admin/exploitant/logisticien uniquement
  DROP POLICY IF EXISTS infraction_tachy_write ON public.infraction_tachy;
  CREATE POLICY infraction_tachy_write ON public.infraction_tachy
    FOR ALL TO authenticated
    USING (public.get_user_role() IN ('admin', 'exploitant', 'logisticien'))
    WITH CHECK (public.get_user_role() IN ('admin', 'exploitant', 'logisticien'));

EXCEPTION
  WHEN OTHERS THEN
    NULL;
END $$;

-- Vue : infractions non résolues (alertes actives)
CREATE OR REPLACE VIEW vue_infraction_alerte_active AS
SELECT
  id, conducteur_id, ot_id, date_infraction,
  code_infraction, libelle_infraction, type_infraction,
  valeur_mesuree, seuil_reglementaire, severite,
  etat, date_detection
FROM public.infraction_tachy
WHERE etat IN ('detectee', 'avertissable', 'force');

COMMIT;
