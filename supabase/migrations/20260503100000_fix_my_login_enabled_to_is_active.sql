-- =============================================================================
-- MIGRATION : Corriger la fonction my_login_enabled() après renommage
--             de la colonne login_enabled → is_active (migration 20260410)
-- Date     : 2026-05-03
-- Problème : UPDATE sur ordres_transport échoue avec
--            "column login_enabled does not exist" car la fonction
--            my_login_enabled() référençait encore l'ancienne colonne.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.my_login_enabled()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT is_active FROM public.profils WHERE user_id = auth.uid() LIMIT 1),
    false
  );
$$;

COMMENT ON FUNCTION public.my_login_enabled() IS
  'Retourne true si le compte de l''utilisateur courant est actif (is_active = true).
   Utilisé dans les policies RLS. Après migration 20260410 : login_enabled → is_active.';
