-- =============================================================================
-- MIGRATION : Ajout is_active sur profils + nettoyage colonne login_enabled
-- Date : 2026-04-10
-- Objectif : Blocage de compte propre côté DB (is_active = false → accès refusé)
-- =============================================================================

-- 1. Ajouter is_active sur profils (true par défaut = tous les comptes actifs)
ALTER TABLE public.profils
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;

-- 2. Index pour filtrage rapide sur les comptes inactifs
CREATE INDEX IF NOT EXISTS profils_is_active_idx
  ON public.profils(is_active)
  WHERE is_active = false;

-- 3. Commentaire descriptif
COMMENT ON COLUMN public.profils.is_active IS
  'false = compte désactivé, accès refusé. Géré par le super_admin ou tenant_admin.';

-- 4. Vérifier l'existence de la colonne login_enabled si elle existe
--    (certaines migrations antérieures l'ont parfois créée sous ce nom)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'profils'
      AND column_name  = 'login_enabled'
  ) THEN
    -- Migrer les données : login_enabled = false → is_active = false
    UPDATE public.profils SET is_active = false WHERE login_enabled = false;
    -- Supprimer l'ancienne colonne
    ALTER TABLE public.profils DROP COLUMN login_enabled;
  END IF;
END;
$$;
