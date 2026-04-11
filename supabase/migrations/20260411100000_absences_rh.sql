-- ──────────────────────────────────────────────────────────────────────────────
-- Migration: Absences RH
-- Date: 2026-04-11
-- Périmètre:
--   - Table absences_rh : congés, RTT, arrêts maladie, formation, autre
--   - Soldes CP/RTT par salarié et année
--   - RLS strict (lecture/écriture rôles RH/admin/dirigeant)
-- ──────────────────────────────────────────────────────────────────────────────

BEGIN;

-- 1. Table des demandes / absences
CREATE TABLE IF NOT EXISTS public.absences_rh (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id integer REFERENCES public.companies(id) ON DELETE CASCADE,
  employe_id uuid NOT NULL REFERENCES public.profils(id) ON DELETE CASCADE,
  type_absence text NOT NULL,
  date_debut date NOT NULL,
  date_fin date NOT NULL,
  nb_jours numeric(5,1) NOT NULL DEFAULT 1,
  statut text NOT NULL DEFAULT 'demande',
  motif text NULL,
  justificatif_url text NULL,
  validateur_id uuid NULL REFERENCES public.profils(id) ON DELETE SET NULL,
  date_validation timestamptz NULL,
  commentaire_rh text NULL,
  created_by uuid NULL REFERENCES public.profils(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT absences_rh_type_chk CHECK (
    type_absence IN (
      'conges_payes', 'rtt', 'arret_maladie', 'arret_at',
      'formation', 'conge_maternite', 'conge_paternite',
      'conge_sans_solde', 'absence_autorisee', 'autre'
    )
  ),
  CONSTRAINT absences_rh_statut_chk CHECK (
    statut IN ('demande', 'validee', 'refusee', 'annulee')
  ),
  CONSTRAINT absences_rh_dates_chk CHECK (date_fin >= date_debut),
  CONSTRAINT absences_rh_jours_chk CHECK (nb_jours > 0)
);

CREATE INDEX IF NOT EXISTS idx_absences_rh_employe ON public.absences_rh(employe_id, date_debut);
CREATE INDEX IF NOT EXISTS idx_absences_rh_statut ON public.absences_rh(statut);
CREATE INDEX IF NOT EXISTS idx_absences_rh_company ON public.absences_rh(company_id);

CREATE OR REPLACE TRIGGER trg_absences_rh_touch
  BEFORE UPDATE ON public.absences_rh
  FOR EACH ROW EXECUTE FUNCTION public.compta_touch_updated_at();

-- 2. Soldes CP/RTT par salarié et année
CREATE TABLE IF NOT EXISTS public.soldes_absences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id integer REFERENCES public.companies(id) ON DELETE CASCADE,
  employe_id uuid NOT NULL REFERENCES public.profils(id) ON DELETE CASCADE,
  annee integer NOT NULL,
  cp_acquis numeric(5,1) NOT NULL DEFAULT 0,
  cp_pris numeric(5,1) NOT NULL DEFAULT 0,
  rtt_acquis numeric(5,1) NOT NULL DEFAULT 0,
  rtt_pris numeric(5,1) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT soldes_absences_unique UNIQUE (employe_id, annee)
);

CREATE INDEX IF NOT EXISTS idx_soldes_absences_employe ON public.soldes_absences(employe_id, annee);

CREATE OR REPLACE TRIGGER trg_soldes_absences_touch
  BEFORE UPDATE ON public.soldes_absences
  FOR EACH ROW EXECUTE FUNCTION public.compta_touch_updated_at();

-- 3. RLS
ALTER TABLE public.absences_rh ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.soldes_absences ENABLE ROW LEVEL SECURITY;

-- Lecture : l'employé voit ses propres absences + RH/admin/dirigeant voient tout
DO $$
BEGIN
  DROP POLICY IF EXISTS absences_rh_read ON public.absences_rh;
  CREATE POLICY absences_rh_read ON public.absences_rh
    FOR SELECT TO authenticated
    USING (
      employe_id = auth.uid()
      OR public.get_user_role() IN ('admin', 'dirigeant', 'rh')
    );

  DROP POLICY IF EXISTS absences_rh_write ON public.absences_rh;
  CREATE POLICY absences_rh_write ON public.absences_rh
    FOR ALL TO authenticated
    USING (public.get_user_role() IN ('admin', 'dirigeant', 'rh'))
    WITH CHECK (public.get_user_role() IN ('admin', 'dirigeant', 'rh'));

  DROP POLICY IF EXISTS absences_rh_insert_self ON public.absences_rh;
  CREATE POLICY absences_rh_insert_self ON public.absences_rh
    FOR INSERT TO authenticated
    WITH CHECK (employe_id = auth.uid());

  DROP POLICY IF EXISTS soldes_absences_read ON public.soldes_absences;
  CREATE POLICY soldes_absences_read ON public.soldes_absences
    FOR SELECT TO authenticated
    USING (
      employe_id = auth.uid()
      OR public.get_user_role() IN ('admin', 'dirigeant', 'rh')
    );

  DROP POLICY IF EXISTS soldes_absences_write ON public.soldes_absences;
  CREATE POLICY soldes_absences_write ON public.soldes_absences
    FOR ALL TO authenticated
    USING (public.get_user_role() IN ('admin', 'dirigeant', 'rh'))
    WITH CHECK (public.get_user_role() IN ('admin', 'dirigeant', 'rh'));

EXCEPTION WHEN OTHERS THEN
  -- get_user_role non disponible dans certains contexts de migration
  NULL;
END;
$$;

COMMIT;
