-- ============================================================
-- GRANT EXECUTE on my_company_id / my_login_enabled
-- Date : 2026-05-08
--
-- Problème : ces deux fonctions SECURITY DEFINER ont été créées
-- dans 20260404150000_fix_rls_recursion_profils.sql sans GRANT,
-- ce qui provoque "permission denied for function my_company_id"
-- dès que les policies RLS les invoquent pour un user authentifié.
-- ============================================================

GRANT EXECUTE ON FUNCTION public.my_company_id()    TO authenticated;
GRANT EXECUTE ON FUNCTION public.my_login_enabled() TO authenticated;
