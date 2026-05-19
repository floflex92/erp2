-- ============================================================
-- FIX RECURSION RLS PROFILS
-- Date : 2026-04-04
-- Probleme :
--   La policy profils_read_own (migration 20260404130000) contient :
--     company_id IN (SELECT company_id FROM public.profils p2 WHERE p2.user_id = auth.uid()...)
--   Cette sous-requete vers profils depuis une policy sur profils
--   provoque une recursion infinie (erreur Postgres 42P17).
--
-- Solution :
--   1. Creer my_company_id() SECURITY DEFINER → lit profils sans RLS
--   2. Creer my_login_enabled() SECURITY DEFINER → idem pour login_enabled
--   3. Réécrire profils_read_own sans sous-requete auto-referentielle
--   4. Réécrire profils_update_own_or_admin de meme
--   5. Réécrire companies_read_own / companies_update_tenant_admin de meme
-- ============================================================

-- ============================================================
-- 1. FONCTIONS SECURITY DEFINER (bypass RLS complet)
-- ============================================================

-- Retourne le company_id du user courant (NULL si pas de profil)
CREATE OR REPLACE FUNCTION public.my_company_id()
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT company_id
  FROM public.profils
  WHERE user_id = auth.uid()
  LIMIT 1;
$$;

-- Retourne true si le user courant est actif (login_enabled = true)
CREATE OR REPLACE FUNCTION public.my_login_enabled()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT login_enabled FROM public.profils WHERE user_id = auth.uid() LIMIT 1),
    false
  );
$$;

-- ============================================================
-- 2. POLICIES PROFILS — sans recursion
-- ============================================================

DO $$
BEGIN
  -- Lecture : utilisateur lit son propre profil
  -- OU admin-tenant lit les profils de sa company (via my_company_id SECURITY DEFINER)
  -- OU platform admin
  DROP POLICY IF EXISTS profils_read_own ON public.profils;
  CREATE POLICY profils_read_own
    ON public.profils FOR SELECT
    USING (
      user_id = auth.uid()
      OR (
        company_id = public.my_company_id()
        AND public.my_login_enabled()
        AND public.is_tenant_admin()
      )
      OR public.is_platform_admin()
    );

  -- Mise a jour : idem
  DROP POLICY IF EXISTS profils_update_own_or_admin ON public.profils;
  CREATE POLICY profils_update_own_or_admin
    ON public.profils FOR UPDATE
    USING (
      user_id = auth.uid()
      OR (
        company_id = public.my_company_id()
        AND public.my_login_enabled()
        AND public.is_tenant_admin()
      )
      OR public.is_platform_admin()
    );

EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Erreur RLS profils: %', SQLERRM;
END $$;

-- ============================================================
-- 3. POLICIES COMPANIES — sans recursion
-- ============================================================

DO $$
BEGIN
  DROP POLICY IF EXISTS companies_read_own ON public.companies;
  CREATE POLICY companies_read_own
    ON public.companies FOR SELECT
    USING (
      id = public.my_company_id()
      OR public.is_platform_admin()
    );

  DROP POLICY IF EXISTS companies_update_tenant_admin ON public.companies;
  CREATE POLICY companies_update_tenant_admin
    ON public.companies FOR UPDATE
    USING (
      (
        id = public.my_company_id()
        AND public.my_login_enabled()
        AND public.is_tenant_admin()
      )
      OR public.is_platform_admin()
    );

EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Erreur RLS companies: %', SQLERRM;
END $$;
