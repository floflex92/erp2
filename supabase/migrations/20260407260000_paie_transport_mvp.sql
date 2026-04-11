-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: Module Paie Transport MVP
-- Phase 1 : bulletins Supabase + barèmes indemnités + vue heures mensuelles
-- Date: 2026-04-07
-- ─────────────────────────────────────────────────────────────────────────────

BEGIN;

-- ─── 1. Table des taux de cotisations annuels ─────────────────────────────────
-- Permet la mise à jour annuelle des taux sans redéploiement
CREATE TABLE IF NOT EXISTS public.payroll_config_annuel (
  annee integer PRIMARY KEY,
  pmss numeric(10,2) NOT NULL DEFAULT 3925.00,         -- Plafond Mensuel SS 2026
  smic_horaire numeric(8,4) NOT NULL DEFAULT 11.88,    -- SMIC horaire 2026
  -- Cotisations salariales
  taux_maladie_sal numeric(6,4) NOT NULL DEFAULT 0.0095,
  taux_vieillesse_plaf_sal numeric(6,4) NOT NULL DEFAULT 0.0690,
  taux_vieillesse_deplaf_sal numeric(6,4) NOT NULL DEFAULT 0.0040,
  taux_retraite_comp_t1_sal numeric(6,4) NOT NULL DEFAULT 0.0315,
  taux_ceg_sal numeric(6,4) NOT NULL DEFAULT 0.0086,
  taux_csg_deductible numeric(6,4) NOT NULL DEFAULT 0.0680,
  taux_csg_crds_nd numeric(6,4) NOT NULL DEFAULT 0.0290,
  mutuelle_sal_mensuelle numeric(8,2) NOT NULL DEFAULT 18.50,
  -- Cotisations patronales
  taux_maladie_pat numeric(6,4) NOT NULL DEFAULT 0.1300,
  taux_vieillesse_plaf_pat numeric(6,4) NOT NULL DEFAULT 0.0855,
  taux_vieillesse_deplaf_pat numeric(6,4) NOT NULL DEFAULT 0.0190,
  taux_retraite_comp_t1_pat numeric(6,4) NOT NULL DEFAULT 0.0472,
  taux_ceg_pat numeric(6,4) NOT NULL DEFAULT 0.0129,
  taux_fnal numeric(6,4) NOT NULL DEFAULT 0.0010,
  taux_alloc_fam numeric(6,4) NOT NULL DEFAULT 0.0345,
  taux_at_mp numeric(6,4) NOT NULL DEFAULT 0.0210,    -- Taux moyen transport routier
  taux_chomage_pat numeric(6,4) NOT NULL DEFAULT 0.0405,
  mutuelle_pat_mensuelle numeric(8,2) NOT NULL DEFAULT 18.50,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Seed 2026
INSERT INTO public.payroll_config_annuel (annee) VALUES (2026)
ON CONFLICT (annee) DO NOTHING;

-- ─── 2. Barèmes indemnités transport exonérées ─────────────────────────────────
-- Barèmes ACOSS/URSSAF par type de régime conducteur
CREATE TABLE IF NOT EXISTS public.bareme_indemnites_transport (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  annee integer NOT NULL,
  type_regime text NOT NULL CHECK (type_regime IN ('gr_petit_deplacement', 'gr_grand_routier', 'tp_repas_midi', 'tp_repas_soir', 'nuitee', 'repas_chantier')),
  -- type TP = Territoire Propre (retour domicile chaque soir)
  -- type GR = Grand Routier (nuitée hors domicile)
  libelle text NOT NULL,
  montant_max_exonere numeric(8,2) NOT NULL,   -- plafond exonération cotisations
  montant_max_fiscal numeric(8,2) NOT NULL,    -- plafond exonération IR (souvent identique)
  source text NOT NULL DEFAULT 'URSSAF',
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (annee, type_regime)
);

-- Seed barèmes 2026 ACOSS/URSSAF (valeurs indicatives à vérifier sur circulaire)
INSERT INTO public.bareme_indemnites_transport (annee, type_regime, libelle, montant_max_exonere, montant_max_fiscal)
VALUES
  (2026, 'gr_petit_deplacement', 'Indemnité repas petit déplacement', 21.10, 21.10),
  (2026, 'gr_grand_routier', 'Indemnité journalière grand routier (repas midi+soir+nuitée)', 98.27, 98.27),
  (2026, 'tp_repas_midi', 'Repas midi territoire propre', 10.10, 10.10),
  (2026, 'tp_repas_soir', 'Repas soir territoire propre', 10.10, 10.10),
  (2026, 'nuitee', 'Nuitée grand routier (hébergement seul)', 37.00, 37.00),
  (2026, 'repas_chantier', 'Repas hors agglomération (chantier, déplacement)', 21.10, 21.10)
ON CONFLICT (annee, type_regime) DO NOTHING;

-- ─── 3. Table bulletins_paie (Supabase — remplace localStorage) ───────────────
CREATE TABLE IF NOT EXISTS public.bulletins_paie (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id integer REFERENCES public.companies(id) ON DELETE CASCADE,
  conducteur_id uuid REFERENCES public.conducteurs(id) ON DELETE SET NULL,
  employe_profil_id uuid REFERENCES public.profils(id) ON DELETE SET NULL,
  -- Identification période
  periode_label text NOT NULL,                  -- ex: "Mars 2026"
  periode_debut date NOT NULL,                  -- 01/03/2026
  periode_fin date NOT NULL,                    -- 31/03/2026
  -- Config contractuelle snapshot
  taux_horaire numeric(8,4) NOT NULL,
  base_mensuelle_heures numeric(8,2) NOT NULL DEFAULT 151.67,
  coefficient_convention text,
  intitule_poste text,
  type_contrat text,
  -- Variables de la période
  heures_travaillees numeric(8,2) NOT NULL DEFAULT 0,
  heures_absence numeric(8,2) NOT NULL DEFAULT 0,
  heures_sup_25 numeric(8,2) NOT NULL DEFAULT 0,
  heures_sup_50 numeric(8,2) NOT NULL DEFAULT 0,
  heures_nuit numeric(8,2) NOT NULL DEFAULT 0,
  jours_travailles integer NOT NULL DEFAULT 0,
  -- Rémunération brute
  salaire_base_brut numeric(10,2) NOT NULL DEFAULT 0,
  brut_heures_sup_25 numeric(10,2) NOT NULL DEFAULT 0,
  brut_heures_sup_50 numeric(10,2) NOT NULL DEFAULT 0,
  deduction_absence numeric(10,2) NOT NULL DEFAULT 0,
  -- Primes imposables (soumis cotisations)
  prime_performance numeric(10,2) NOT NULL DEFAULT 0,
  prime_exceptionnelle numeric(10,2) NOT NULL DEFAULT 0,
  -- Indemnités exonérées (HORS assiette cotisations + IR si ≤ barème)
  indemnite_repas_exo numeric(10,2) NOT NULL DEFAULT 0,      -- ≤ 21,10€/repas
  indemnite_grand_routier_exo numeric(10,2) NOT NULL DEFAULT 0, -- ≤ 98,27€/j
  indemnite_tp_exo numeric(10,2) NOT NULL DEFAULT 0,         -- territoire propre
  -- Dépassement barème (devient imposable et soumis cotisations)
  depassement_bareme_cotisable numeric(10,2) NOT NULL DEFAULT 0,
  -- Frais professionnels remboursés
  frais_auto_valides numeric(10,2) NOT NULL DEFAULT 0,
  frais_ajustement_manuel numeric(10,2) NOT NULL DEFAULT 0,
  -- Brut soumis cotisations (calculé)
  brut_soumis_cotisations numeric(10,2) NOT NULL DEFAULT 0,
  -- Cotisations
  cotisations_salariales numeric(10,2) NOT NULL DEFAULT 0,
  cotisations_patronales numeric(10,2) NOT NULL DEFAULT 0,
  -- Net
  net_avant_pas numeric(10,2) NOT NULL DEFAULT 0,
  prelevement_source numeric(10,2) NOT NULL DEFAULT 0,
  net_imposable numeric(10,2) NOT NULL DEFAULT 0,
  acompte_deduction numeric(10,2) NOT NULL DEFAULT 0,
  autres_retenues numeric(10,2) NOT NULL DEFAULT 0,
  net_a_payer numeric(10,2) NOT NULL DEFAULT 0,
  cout_employeur_total numeric(10,2) NOT NULL DEFAULT 0,
  -- Alertes conformité détectées à la génération
  alertes_conformite jsonb NOT NULL DEFAULT '[]',     -- [{type, niveau, message}]
  -- Source des données heures
  source_heures text NOT NULL DEFAULT 'manuel' CHECK (source_heures IN ('manuel', 'tachygraphe', 'mixte')),
  -- Statut du bulletin
  statut text NOT NULL DEFAULT 'brouillon' CHECK (statut IN ('brouillon', 'valide', 'envoye', 'archive')),
  -- Document PDF
  document_url text,
  document_nom text,
  -- Audit
  genere_par uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  valide_par uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  valide_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS bulletins_paie_company_idx ON public.bulletins_paie(company_id);
CREATE INDEX IF NOT EXISTS bulletins_paie_conducteur_idx ON public.bulletins_paie(conducteur_id);
CREATE INDEX IF NOT EXISTS bulletins_paie_employe_idx ON public.bulletins_paie(employe_profil_id);
CREATE INDEX IF NOT EXISTS bulletins_paie_periode_idx ON public.bulletins_paie(periode_debut DESC);
CREATE INDEX IF NOT EXISTS bulletins_paie_statut_idx ON public.bulletins_paie(statut);

-- ─── 4. Vue agrégation mensuelle heures conducteur ────────────────────────────
-- Alimente le formulaire paie depuis journee_travail (tachygraphe)
CREATE OR REPLACE VIEW public.v_heures_paie_mois AS
SELECT
  jt.conducteur_id,
  date_trunc('month', jt.jour)::date                         AS mois_debut,
  to_char(date_trunc('month', jt.jour), 'YYYY-MM')           AS mois_label,
  -- Heures brutes
  round(sum(jt.minutes_travail)::numeric / 60.0, 2)          AS heures_travail_total,
  round(sum(jt.minutes_conduite)::numeric / 60.0, 2)         AS heures_conduite_total,
  round(sum(jt.minutes_repos)::numeric / 60.0, 2)            AS heures_repos_total,
  -- Jours
  count(DISTINCT jt.jour)                                    AS jours_travailles,
  -- Heures supplémentaires brutes (au-delà 151.67h/mois)
  greatest(0, round(sum(jt.minutes_travail)::numeric / 60.0 - 151.67, 2)) AS heures_sup_brutes,
  -- HS 25% : entre 151.67h et 163.67h (plage de 12h selon accord branche IDCC 16)
  greatest(0, least(
    round(sum(jt.minutes_travail)::numeric / 60.0 - 151.67, 2),
    12.00
  ))                                                         AS heures_sup_25,
  -- HS 50% : au-delà de 163.67h
  greatest(0, round(sum(jt.minutes_travail)::numeric / 60.0 - 163.67, 2)) AS heures_sup_50,
  -- Nombre de missions
  sum(jt.nb_missions)                                        AS nb_missions_total,
  -- Source majoritaire
  (SELECT jt2.source FROM public.journee_travail jt2
   WHERE jt2.conducteur_id = jt.conducteur_id
     AND date_trunc('month', jt2.jour) = date_trunc('month', jt.jour)
   GROUP BY jt2.source ORDER BY count(*) DESC LIMIT 1)       AS source_principale
FROM public.journee_travail jt
GROUP BY jt.conducteur_id, date_trunc('month', jt.jour);

-- ─── 5. Vue coût salarial par OT (pilotage exploitation-paie) ─────────────────
-- Répartit le coût mensuel sur les OTs exécutés pendant la période
CREATE OR REPLACE VIEW public.v_cout_salarial_ot AS
SELECT
  ot.id                                                      AS ot_id,
  ot.reference                                               AS ot_reference,
  ot.conducteur_id,
  ot.date_chargement_prevue,
  ot.date_livraison_prevue,
  ot.prix_ht                                                 AS ca_ot,
  bp.periode_label,
  bp.cout_employeur_total                                    AS cout_mensuel_conducteur,
  bp.jours_travailles                                        AS jours_paie,
  -- Coût journalier approché (coût mensuel / jours travaillés)
  CASE WHEN bp.jours_travailles > 0
    THEN round(bp.cout_employeur_total / bp.jours_travailles, 2)
    ELSE NULL
  END                                                        AS cout_journalier_estime,
  -- Nombre de jours OT (approximation linéaire)
  (ot.date_livraison_prevue - ot.date_chargement_prevue + 1) AS duree_ot_jours,
  -- Coût salarial attribuable à cet OT
  CASE WHEN bp.jours_travailles > 0 AND ot.date_livraison_prevue IS NOT NULL AND ot.date_chargement_prevue IS NOT NULL
    THEN round(
      bp.cout_employeur_total / bp.jours_travailles
      * (ot.date_livraison_prevue - ot.date_chargement_prevue + 1), 2)
    ELSE NULL
  END                                                        AS cout_salarial_ot_estime
FROM public.ordres_transport ot
JOIN public.bulletins_paie bp ON bp.conducteur_id = ot.conducteur_id
  AND ot.date_chargement_prevue >= bp.periode_debut
  AND ot.date_chargement_prevue <= bp.periode_fin
WHERE ot.conducteur_id IS NOT NULL
  AND bp.statut IN ('valide', 'envoye', 'archive');

-- ─── 6. RLS bulletins_paie ────────────────────────────────────────────────────
ALTER TABLE public.bulletins_paie ENABLE ROW LEVEL SECURITY;

-- RH, admin, dirigeant : accès complet
DROP POLICY IF EXISTS "rh_admin_manage_bulletins_paie" ON public.bulletins_paie;
CREATE POLICY "rh_admin_manage_bulletins_paie"
  ON public.bulletins_paie
  FOR ALL
  USING (
    COALESCE(public.current_app_role() IN ('rh', 'admin', 'dirigeant'), false)
  )
  WITH CHECK (
    COALESCE(public.current_app_role() IN ('rh', 'admin', 'dirigeant'), false)
  );

-- Conducteur : lecture de ses propres bulletins validés
DROP POLICY IF EXISTS "conducteur_see_own_bulletins" ON public.bulletins_paie;
CREATE POLICY "conducteur_see_own_bulletins"
  ON public.bulletins_paie
  FOR SELECT
  USING (
    statut IN ('valide', 'envoye', 'archive')
    AND employe_profil_id IN (
      SELECT id FROM public.profils WHERE user_id = auth.uid()
    )
  );

-- RLS barème (lecture publique pour les rôles connectés)
ALTER TABLE public.bareme_indemnites_transport ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "read_bareme_indemnites" ON public.bareme_indemnites_transport;
CREATE POLICY "read_bareme_indemnites"
  ON public.bareme_indemnites_transport
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- RLS payroll_config_annuel
ALTER TABLE public.payroll_config_annuel ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "read_payroll_config" ON public.payroll_config_annuel;
CREATE POLICY "read_payroll_config"
  ON public.payroll_config_annuel
  FOR SELECT
  USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "rh_admin_manage_payroll_config" ON public.payroll_config_annuel;
CREATE POLICY "rh_admin_manage_payroll_config"
  ON public.payroll_config_annuel
  FOR ALL
  USING (COALESCE(public.current_app_role() IN ('rh', 'admin', 'dirigeant'), false))
  WITH CHECK (COALESCE(public.current_app_role() IN ('rh', 'admin', 'dirigeant'), false));

-- ─── 7. Fonction de contrôle conformité sociale ───────────────────────────────
-- Retourne les alertes pour un bulletin en préparation
CREATE OR REPLACE FUNCTION public.fn_controle_conformite_paie(
  p_taux_horaire numeric,
  p_brut_mensuel numeric,
  p_coefficient text,
  p_indemnite_repas numeric,
  p_nb_repas integer,
  p_indemnite_gr_journalier numeric,
  p_nb_jours_gr integer,
  p_annee integer DEFAULT date_part('year', now())
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_config public.payroll_config_annuel%ROWTYPE;
  v_bareme_repas numeric;
  v_bareme_gr numeric;
  v_alertes jsonb := '[]';
BEGIN
  -- Charger config année
  SELECT * INTO v_config FROM public.payroll_config_annuel WHERE annee = p_annee;
  IF NOT FOUND THEN
    SELECT * INTO v_config FROM public.payroll_config_annuel ORDER BY annee DESC LIMIT 1;
  END IF;

  -- Charger barèmes
  SELECT montant_max_exonere INTO v_bareme_repas
  FROM public.bareme_indemnites_transport
  WHERE annee = p_annee AND type_regime = 'gr_petit_deplacement';

  SELECT montant_max_exonere INTO v_bareme_gr
  FROM public.bareme_indemnites_transport
  WHERE annee = p_annee AND type_regime = 'gr_grand_routier';

  -- Contrôle 1 : SMIC horaire
  IF v_config.smic_horaire IS NOT NULL AND p_taux_horaire < v_config.smic_horaire THEN
    v_alertes := v_alertes || jsonb_build_object(
      'type', 'smic_horaire',
      'niveau', 'bloquant',
      'message', format('Taux horaire %.4f€ inférieur au SMIC %.4f€ — bulletin bloqué', p_taux_horaire, v_config.smic_horaire)
    );
  END IF;

  -- Contrôle 2 : Dépassement barème repas
  IF v_bareme_repas IS NOT NULL AND p_nb_repas > 0 THEN
    DECLARE
      v_repas_unitaire numeric := CASE WHEN p_nb_repas > 0 THEN p_indemnite_repas / p_nb_repas ELSE 0 END;
    BEGIN
      IF v_repas_unitaire > v_bareme_repas THEN
        v_alertes := v_alertes || jsonb_build_object(
          'type', 'plafond_repas_urssaf',
          'niveau', 'avertissement',
          'message', format('Indemnité repas unitaire %.2f€ dépasse le barème URSSAF %.2f€ — excédent soumis cotisations', v_repas_unitaire, v_bareme_repas)
        );
      END IF;
    END;
  END IF;

  -- Contrôle 3 : Dépassement barème GR
  IF v_bareme_gr IS NOT NULL AND p_nb_jours_gr > 0 THEN
    DECLARE
      v_gr_journalier numeric := CASE WHEN p_nb_jours_gr > 0 THEN p_indemnite_gr_journalier / p_nb_jours_gr ELSE 0 END;
    BEGIN
      IF v_gr_journalier > v_bareme_gr THEN
        v_alertes := v_alertes || jsonb_build_object(
          'type', 'plafond_grand_routier_urssaf',
          'niveau', 'avertissement',
          'message', format('Indemnité GR journalière %.2f€ dépasse le barème URSSAF %.2f€ — excédent cotisable', v_gr_journalier, v_bareme_gr)
        );
      END IF;
    END;
  END IF;

  RETURN v_alertes;
END;
$$;

-- ─── 8. Trigger updated_at sur les nouvelles tables ──────────────────────────
DO $$
BEGIN
  PERFORM public.add_updated_at_trigger('public.bulletins_paie');
EXCEPTION WHEN others THEN NULL;
END $$;

DO $$
BEGIN
  PERFORM public.add_updated_at_trigger('public.payroll_config_annuel');
EXCEPTION WHEN others THEN NULL;
END $$;

COMMIT;
