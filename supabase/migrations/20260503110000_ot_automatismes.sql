-- =============================================================================
-- MIGRATION : Automatismes OT
--   1. mode_livraison   : type de livraison sur ordres_transport
--   2. retard_valide    : flag quand l'exploitant valide un retard
--   3. ot_historique    : table d'audit / historique par OT
-- Date : 2026-05-03
-- =============================================================================

-- ─── 1. Colonnes sur ordres_transport ────────────────────────────────────────

-- Type de livraison : comment la livraison a été confirmée
ALTER TABLE public.ordres_transport
  ADD COLUMN IF NOT EXISTS mode_livraison text
    DEFAULT 'manuel'
    CHECK (mode_livraison IN ('manuel', 'conducteur', 'gps', 'api'));

COMMENT ON COLUMN public.ordres_transport.mode_livraison IS
  'manuel = saisie exploitant | conducteur = app conducteur | gps = détection position | api = webhook externe';

-- Retard explicitement validé par l'exploitant
ALTER TABLE public.ordres_transport
  ADD COLUMN IF NOT EXISTS retard_valide boolean DEFAULT false;

ALTER TABLE public.ordres_transport
  ADD COLUMN IF NOT EXISTS retard_valide_at timestamptz;

ALTER TABLE public.ordres_transport
  ADD COLUMN IF NOT EXISTS retard_commentaire text;

-- ─── 2. Table ot_historique ───────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.ot_historique (
  id            uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  ot_id         uuid        NOT NULL REFERENCES public.ordres_transport(id) ON DELETE CASCADE,
  company_id    bigint      NOT NULL,
  action        text        NOT NULL,
  -- action values: creation | statut_change | affectation | desaffectation
  --                deplacement | livraison | retard_valide | modification | note
  ancien_statut text,
  nouveau_statut text,
  auteur_id     uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  auteur_nom    text,
  details       jsonb       NOT NULL DEFAULT '{}'::jsonb,
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- Index pour chargement rapide par OT
CREATE INDEX IF NOT EXISTS ot_historique_ot_id_idx
  ON public.ot_historique(ot_id, created_at DESC);

-- Index pour requêtes par société
CREATE INDEX IF NOT EXISTS ot_historique_company_idx
  ON public.ot_historique(company_id, created_at DESC);

COMMENT ON TABLE public.ot_historique IS
  'Journal d audit de chaque OT : qui a fait quoi, quand. Affiché dans le panneau historique de la fiche OT.';

-- ─── 3. RLS sur ot_historique ────────────────────────────────────────────────

ALTER TABLE public.ot_historique ENABLE ROW LEVEL SECURITY;

-- Lecture : utilisateurs du même tenant
CREATE POLICY ot_historique_read
  ON public.ot_historique FOR SELECT
  USING (
    company_id IN (
      SELECT company_id FROM public.profils WHERE user_id = auth.uid()
    )
    AND public.my_login_enabled()
  );

-- Insertion : utilisateurs actifs du même tenant
CREATE POLICY ot_historique_insert
  ON public.ot_historique FOR INSERT
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM public.profils WHERE user_id = auth.uid()
    )
    AND public.my_login_enabled()
  );

-- Pas d'UPDATE ni DELETE : l'historique est immuable
