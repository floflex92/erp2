-- ============================================================
-- TENANT ADMIN SETTINGS
-- Date : 2026-04-04
-- Perimetre :
--   - companies : email_domain, enabled_modules
--   - profils   : login_enabled, force_password_reset
--   - Fonctions SQL securisees pour la gestion des modules et utilisateurs
--   - RLS policies mises a jour
-- ============================================================


-- ============================================================
-- 1. COMPANIES : colonnes de configuration tenant
-- ============================================================

-- Domaine email obligatoire pour la generation des adresses utilisateurs.
-- Ex: 'nexora-truck.fr' → les users auront nom.prenom@nexora-truck.fr
ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS email_domain text NULL;

-- Validation : format domaine simple (sans http, sans @)
ALTER TABLE public.companies
  DROP CONSTRAINT IF EXISTS companies_email_domain_format;
ALTER TABLE public.companies
  ADD CONSTRAINT companies_email_domain_format
    CHECK (
      email_domain IS NULL
      OR (
        email_domain ~ '^[a-z0-9]([a-z0-9\-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9\-]{0,61}[a-z0-9])?)+$'
        AND length(email_domain) <= 253
      )
    );

-- Liste des modules ERP actives au niveau tenant.
-- Tableau JSON de slugs : ["dashboard","planning","fleet","workshop","hr","accounting","documents","settings"]
-- NULL = non configure (tous les modules actifs par defaut dans ce cas)
ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS enabled_modules jsonb NULL;

ALTER TABLE public.companies
  DROP CONSTRAINT IF EXISTS companies_enabled_modules_is_array;
ALTER TABLE public.companies
  ADD CONSTRAINT companies_enabled_modules_is_array
    CHECK (enabled_modules IS NULL OR jsonb_typeof(enabled_modules) = 'array');

-- Mettre a jour le tenant_test avec les valeurs par defaut
UPDATE public.companies
SET
  email_domain = 'erp-demo.fr',
  enabled_modules = '["dashboard","planning","fleet","workshop","hr","accounting","documents","settings"]'::jsonb
WHERE id = 1 AND email_domain IS NULL;


-- ============================================================
-- 2. PROFILS : colonnes de securite utilisateur
-- ============================================================

-- Permet a un admin tenant de bloquer la connexion d'un utilisateur
-- sans le supprimer (soft-disable).
ALTER TABLE public.profils
  ADD COLUMN IF NOT EXISTS login_enabled boolean NOT NULL DEFAULT true;

-- Force le changement de mot de passe au prochain login.
-- IMPORTANT : le controle effectif est cote application (frontend + backend),
-- pas cote Supabase Auth directement.
ALTER TABLE public.profils
  ADD COLUMN IF NOT EXISTS force_password_reset boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS profils_login_enabled_idx
  ON public.profils(login_enabled) WHERE login_enabled = false;

CREATE INDEX IF NOT EXISTS profils_force_pwd_reset_idx
  ON public.profils(force_password_reset) WHERE force_password_reset = true;


-- ============================================================
-- 3. FONCTION : list_tenant_modules(company_id)
--    Retourne les modules actifs pour un tenant.
--    NULL dans enabled_modules → tous actifs.
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_tenant_modules(p_company_id integer)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    enabled_modules,
    '["dashboard","planning","fleet","workshop","hr","accounting","documents","settings"]'::jsonb
  )
  FROM public.companies
  WHERE id = p_company_id;
$$;


-- ============================================================
-- 4. FONCTION : is_tenant_admin(user_id)
--    Retourne true si l'utilisateur est admin/super_admin/dirigeant
--    de son tenant.
--    SECURITY DEFINER : pas de recursion RLS.
-- ============================================================

CREATE OR REPLACE FUNCTION public.is_tenant_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profils
    WHERE user_id = auth.uid()
      AND role IN ('admin', 'super_admin', 'dirigeant')
      AND login_enabled = true
  );
$$;


-- ============================================================
-- 5. RLS : companies (lecture tenant, ecriture admin/platform)
-- ============================================================

ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  -- Lecture : tout utilisateur authentifie peut lire SA company
  DROP POLICY IF EXISTS companies_read_own ON public.companies;
  CREATE POLICY companies_read_own
    ON public.companies FOR SELECT
    USING (
      id IN (
        SELECT company_id FROM public.profils
        WHERE user_id = auth.uid() AND login_enabled = true
      )
      OR public.is_platform_admin()
    );

  -- Ecriture : seulement tenant admin ou platform admin
  DROP POLICY IF EXISTS companies_update_tenant_admin ON public.companies;
  CREATE POLICY companies_update_tenant_admin
    ON public.companies FOR UPDATE
    USING (
      (
        id IN (
          SELECT company_id FROM public.profils
          WHERE user_id = auth.uid() AND login_enabled = true
        )
        AND public.is_tenant_admin()
      )
      OR public.is_platform_admin()
    );

  -- INSERT / DELETE : platform admin uniquement
  DROP POLICY IF EXISTS companies_insert_platform_admin ON public.companies;
  CREATE POLICY companies_insert_platform_admin
    ON public.companies FOR INSERT
    WITH CHECK (public.is_platform_admin());

  DROP POLICY IF EXISTS companies_delete_platform_admin ON public.companies;
  CREATE POLICY companies_delete_platform_admin
    ON public.companies FOR DELETE
    USING (public.is_platform_admin());

EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Erreur RLS companies: %', SQLERRM;
END $$;


-- ============================================================
-- 6. RLS : profils
--    - lecture : utilisateur lit son propre profil OU admin tenant lit les profils de sa company
--    - ecriture : admin tenant peut modifier les profils de sa company (hors champs sensibles)
-- ============================================================

DO $$
BEGIN
  -- Un utilisateur peut toujours lire son propre profil
  DROP POLICY IF EXISTS profils_read_own ON public.profils;
  CREATE POLICY profils_read_own
    ON public.profils FOR SELECT
    USING (
      user_id = auth.uid()
      OR (
        company_id IN (
          SELECT company_id FROM public.profils p2
          WHERE p2.user_id = auth.uid() AND p2.login_enabled = true
        )
        AND public.is_tenant_admin()
      )
      OR public.is_platform_admin()
    );

  -- Un utilisateur peut mettre a jour son propre profil (champs limites)
  -- Un admin tenant peut mettre a jour les profils de sa company
  DROP POLICY IF EXISTS profils_update_own_or_admin ON public.profils;
  CREATE POLICY profils_update_own_or_admin
    ON public.profils FOR UPDATE
    USING (
      user_id = auth.uid()
      OR (
        company_id IN (
          SELECT company_id FROM public.profils p2
          WHERE p2.user_id = auth.uid() AND p2.login_enabled = true
        )
        AND public.is_tenant_admin()
      )
      OR public.is_platform_admin()
    );

EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Erreur RLS profils: %', SQLERRM;
END $$;


-- ============================================================
-- 7. MISE A JOUR database.types : export des nouvelles colonnes
--    (commentaire de reference pour la generation des types TS)
-- ============================================================

-- companies.email_domain text NULL
-- companies.enabled_modules jsonb NULL
-- profils.login_enabled boolean NOT NULL DEFAULT true
-- profils.force_password_reset boolean NOT NULL DEFAULT false


-- ============================================================
-- FIN DE LA MIGRATION TENANT ADMIN SETTINGS
-- ============================================================
